/**
 * @file payment.routes.js
 * @description Routes for payment collection, verification, refunds, and revenue reports.
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// All payment routes require authentication
router.use(protect);

// Razorpay payment flow (Therapist or Client can initiate)
router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);

// Therapist-only routes
router.post('/manual', restrictTo('therapist'), paymentController.markManualPayment);
router.get('/', restrictTo('therapist'), paymentController.getPayments);
router.get('/revenue-summary', restrictTo('therapist'), paymentController.getRevenueSummary);
router.post('/:id/refund', restrictTo('therapist'), paymentController.recordRefund);

module.exports = router;
