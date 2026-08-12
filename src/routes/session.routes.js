/**
 * @file session.routes.js
 * @description Routes for therapy appointment booking and management.
 */

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// All session routes require authentication
router.use(protect);

router
  .route('/')
  .post(sessionController.bookSession)
  .get(sessionController.getSessions);

router.get('/:id', sessionController.getSessionById);
router.patch('/:id/status', restrictTo('therapist'), sessionController.updateSessionStatus);
router.post('/:id/cancel', sessionController.cancelSession);

module.exports = router;
