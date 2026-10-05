/**
 * @file cron.routes.js
 * @description Dedicated endpoints for scheduled cron jobs (e.g. Vercel Cron).
 */

const express = require('express');
const router = express.Router();
const { checkAndSendReminders } = require('../services/reminder.service');

/**
 * @route   GET /api/v1/cron/reminders
 * @desc    Trigger automated session reminder checks
 * @access  Public / Cron secret protected
 */
router.get('/reminders', async (req, res) => {
  // Optional security check for Vercel Cron Secret or Authorization header
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized cron request' });
  }

  try {
    await checkAndSendReminders();
    return res.status(200).json({
      success: true,
      message: 'Session reminders checked and dispatched',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Error /reminders]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
