/**
 * @file notification.controller.js
 * @description Controller for fetching and managing therapist notifications and session reminders.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { Notification } = require('../models');

/**
 * @route   GET /api/v1/notifications
 * @desc    Get therapist notifications with unread count
 * @access  Private (Therapist)
 */
const getNotifications = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;
  const limit = parseInt(req.query.limit, 10) || 50;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ therapistId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sessionId', 'status scheduledAt medium meetingLink')
      .populate('clientId', 'name email phone avatarUrl'),
    Notification.countDocuments({ therapistId, isRead: false }),
  ]);

  res.status(200).json(
    new ApiResponse(200, { notifications, unreadCount }, 'Notifications retrieved successfully')
  );
});

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private (Therapist)
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, therapistId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
});

/**
 * @route   PATCH /api/v1/notifications/read-all
 * @desc    Mark all notifications as read for the logged-in therapist
 * @access  Private (Therapist)
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { therapistId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 * @access  Private (Therapist)
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const result = await Notification.findOneAndDelete({
    _id: req.params.id,
    therapistId: req.user._id,
  });

  if (!result) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json(new ApiResponse(200, null, 'Notification deleted'));
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
