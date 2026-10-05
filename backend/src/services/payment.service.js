/**
 * @file payment.service.js
 * @description Service for payment initiation, webhook handling, and revenue reporting.
 *
 * Supports:
 *  - Razorpay order creation for session and package payments
 *  - Webhook signature verification & payment confirmation
 *  - Manual "mark paid" flow for offline / bank-transfer payments
 *  - Revenue queries
 */

const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { Payment, Session, Package, ClientPackage } = require('../models');

/**
 * Create a Razorpay order for a payment
 * @param {string} therapistId
 * @param {Object} orderData - { amount, currency, paymentFor, sessionId?, packageId?, clientId? }
 */
const createRazorpayOrder = async (therapistId, orderData) => {
  const Razorpay = require('razorpay');
  const { amount, currency = 'INR', paymentFor, sessionId, packageId, clientId, description } = orderData;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(503, 'Payment gateway is not configured. Please contact support.');
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount, // in smallest unit (paise)
    currency,
    receipt: `unfazed_${Date.now()}`,
    notes: {
      therapistId: therapistId.toString(),
      clientId: clientId?.toString() || '',
      paymentFor,
    },
  });

  // Persist a pending Payment document
  const payment = await Payment.create({
    therapistId,
    clientId: clientId || null,
    sessionId: sessionId || null,
    clientPackageId: null,
    paymentFor,
    amount,
    currency,
    status: 'pending',
    gateway: 'razorpay',
    gatewayOrderId: razorpayOrder.id,
    description: description || `Payment for ${paymentFor}`,
  });

  return {
    payment,
    razorpayOrder,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};

/**
 * Verify Razorpay webhook/payment signature and confirm the payment
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} razorpaySignature
 */
const verifyAndConfirmPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // HMAC-SHA256 signature verification
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new ApiError(400, 'Payment signature verification failed. Possible tampered request.');
  }

  // Find pending payment by gateway order ID
  const payment = await Payment.findOne({ gatewayOrderId: razorpayOrderId, status: 'pending' });
  if (!payment) {
    throw new ApiError(404, 'Payment record not found for this order.');
  }

  // Mark payment as succeeded
  payment.status = 'succeeded';
  payment.gatewayPaymentId = razorpayPaymentId;
  payment.gatewaySignature = razorpaySignature;
  payment.paidAt = new Date();
  await payment.save();

  // Post-payment fulfillment
  await _fulfillPayment(payment);

  return payment;
};

/**
 * Internal: Fulfill payment by activating ClientPackage or marking Session paid
 */
const _fulfillPayment = async (payment) => {
  if (payment.paymentFor === 'package' && payment.clientPackageId) {
    // Activate the ClientPackage if it was in pending state
    await ClientPackage.findByIdAndUpdate(payment.clientPackageId, { status: 'active' });
  }

  if (payment.paymentFor === 'session' && payment.sessionId) {
    // Mark session fee as collected
    await Session.findByIdAndUpdate(payment.sessionId, { feeAmount: payment.amount });
  }
};

/**
 * Manual "mark as paid" for offline / bank transfer / cash payments
 */
const markManualPayment = async (therapistId, manualData) => {
  const {
    clientId, sessionId, clientPackageId, paymentFor,
    amount, currency = 'INR', description, gatewayReceiptId,
  } = manualData;

  const payment = await Payment.create({
    therapistId,
    clientId: clientId || null,
    sessionId: sessionId || null,
    clientPackageId: clientPackageId || null,
    paymentFor,
    amount,
    currency,
    platformFee: 0,
    status: 'succeeded',
    gateway: 'manual',
    gatewayReceiptId: gatewayReceiptId || null,
    description: description || `Manual ${paymentFor} payment`,
    paidAt: new Date(),
  });

  // Fulfill if applicable
  await _fulfillPayment(payment);

  return payment;
};

/**
 * Issue a refund record (actual gateway refund is triggered externally via Razorpay dashboard)
 */
const recordRefund = async (paymentId, therapistId, refundData) => {
  const payment = await Payment.findOne({ _id: paymentId, therapistId });
  if (!payment) throw new ApiError(404, 'Payment not found.');
  if (payment.status !== 'succeeded') {
    throw new ApiError(400, 'Can only refund succeeded payments.');
  }

  const { amount, reason, notes, gatewayRefundId } = refundData;
  const isPartial = amount < payment.amount;

  payment.status = isPartial ? 'partially_refunded' : 'refunded';
  payment.refund = {
    amount,
    reason: reason || 'other',
    notes: notes || '',
    gatewayRefundId: gatewayRefundId || null,
    refundedAt: new Date(),
  };
  await payment.save();

  return payment;
};

/**
 * List payments for a therapist with date range and status filters
 */
const getPayments = async (therapistId, query = {}) => {
  const { clientId, status, paymentFor, startDate, endDate, page = 1, limit = 20 } = query;

  const filter = { therapistId };
  if (clientId) filter.clientId = clientId;
  if (status) filter.status = status;
  if (paymentFor) filter.paymentFor = paymentFor;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const limitNum = parseInt(limit, 10);

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('clientId', 'name email')
      .populate('sessionId', 'scheduledAt sessionNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Revenue summary for a therapist (total, by month, by payment type)
 */
const getRevenueSummary = async (therapistId, query = {}) => {
  const { year, month } = query;

  const matchStage = {
    therapistId: require('mongoose').Types.ObjectId.createFromHexString
      ? require('mongoose').Types.ObjectId.createFromHexString(therapistId.toString())
      : new (require('mongoose').Types.ObjectId)(therapistId.toString()),
    status: 'succeeded',
  };

  if (year) {
    const startYear = new Date(`${year}-01-01`);
    const endYear = new Date(`${parseInt(year) + 1}-01-01`);
    matchStage.createdAt = { $gte: startYear, $lt: endYear };
  }

  if (month && year) {
    const startMonth = new Date(`${year}-${month.toString().padStart(2, '0')}-01`);
    const nextMonth = new Date(startMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    matchStage.createdAt = { $gte: startMonth, $lt: nextMonth };
  }

  const summary = await Payment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$paymentFor',
        totalRevenue: { $sum: '$amount' },
        totalNetRevenue: { $sum: '$netAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = summary.reduce((acc, s) => acc + s.totalRevenue, 0);

  return {
    totalRevenue,
    byType: summary,
    currency: 'INR',
  };
};

module.exports = {
  createRazorpayOrder,
  verifyAndConfirmPayment,
  markManualPayment,
  recordRefund,
  getPayments,
  getRevenueSummary,
};
