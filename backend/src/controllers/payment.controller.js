/**
 * @file payment.controller.js
 * @description Controller for payment initiation, verification, refunds, and revenue reports.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const paymentService = require('../services/payment.service');

/**
 * @route   POST /api/v1/payments/create-order
 * @desc    Create a Razorpay payment order for session or package
 * @access  Private
 */
const createOrder = asyncHandler(async (req, res) => {
  const { amount, paymentFor } = req.body;
  if (!amount || !paymentFor) {
    throw new ApiError(400, 'amount and paymentFor are required');
  }

  const therapistId = req.userRole === 'therapist' ? req.user._id : req.body.therapistId;
  if (!therapistId) throw new ApiError(400, 'therapistId is required');

  const result = await paymentService.createRazorpayOrder(therapistId, req.body);
  res.status(201).json(new ApiResponse(201, result, 'Razorpay order created'));
});

/**
 * @route   POST /api/v1/payments/verify
 * @desc    Verify Razorpay payment signature and confirm payment
 * @access  Private
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required');
  }

  const payment = await paymentService.verifyAndConfirmPayment(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  res.status(200).json(new ApiResponse(200, payment, 'Payment verified and confirmed successfully'));
});

/**
 * @route   POST /api/v1/payments/manual
 * @desc    Record a manual / offline payment (cash or bank transfer)
 * @access  Private (Therapist)
 */
const markManualPayment = asyncHandler(async (req, res) => {
  const { amount, paymentFor } = req.body;
  if (!amount || !paymentFor) {
    throw new ApiError(400, 'amount and paymentFor are required');
  }

  const payment = await paymentService.markManualPayment(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, payment, 'Manual payment recorded successfully'));
});

/**
 * @route   GET /api/v1/payments
 * @desc    Get payment history with filters
 * @access  Private (Therapist)
 */
const getPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getPayments(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Payments fetched'));
});

/**
 * @route   GET /api/v1/payments/revenue-summary
 * @desc    Get revenue summary (total, by type, by month)
 * @access  Private (Therapist)
 */
const getRevenueSummary = asyncHandler(async (req, res) => {
  const summary = await paymentService.getRevenueSummary(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, summary, 'Revenue summary fetched'));
});

/**
 * @route   POST /api/v1/payments/:id/refund
 * @desc    Record a refund for a payment
 * @access  Private (Therapist)
 */
const recordRefund = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount) throw new ApiError(400, 'Refund amount is required');

  const payment = await paymentService.recordRefund(req.params.id, req.user._id, req.body);
  res.status(200).json(new ApiResponse(200, payment, 'Refund recorded successfully'));
});

module.exports = {
  createOrder,
  verifyPayment,
  markManualPayment,
  getPayments,
  getRevenueSummary,
  recordRefund,
};
