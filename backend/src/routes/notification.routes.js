/**
 * @file notification.routes.js
 * @description Routes for therapist notifications & session reminders.
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// All notification routes are protected and restricted to therapists
router.use(protect);
router.use(restrictTo('therapist'));

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
