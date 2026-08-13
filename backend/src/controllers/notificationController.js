const { Notification } = require('../models');
const NotificationSetting = require('../models/NotificationSetting');
const UserNotificationPreference = require('../models/UserNotificationPreference');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/notifications
 * List the current user's notifications (paginated)
 */
exports.listNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 20;
  const filter = { recipient: req.user._id };

  // Optional: filter by read/unread
  if (req.query.isRead !== undefined) {
    filter.isRead = req.query.isRead === 'true';
  }

  const skip = (page - 1) * pageSize;

  const [notifications, totalCount, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipient: req.user._id,
    },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  res.json({
    success: true,
    data: notification,
  });
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.json({
    success: true,
    message: `${result.modifiedCount} notification(s) marked as read`,
  });
});

// ─── Email Notification Settings & Preferences ─────────────────────────────

exports.getSettings = asyncHandler(async (req, res) => {
  // Global admin settings (but we might let anyone view them, or restrict to Admin)
  const settings = await NotificationSetting.find({});
  res.json({ success: true, data: settings });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  // Restrict to Founder/Admin/Manager
  if (!['Founder', 'Admin', 'Manager'].includes(req.user.role)) {
    throw ApiError.forbidden('Insufficient permissions');
  }
  
  const { notificationType, delayMode, delayMinutes } = req.body;
  if (!notificationType) throw ApiError.badRequest('notificationType required');
  
  const updated = await NotificationSetting.findOneAndUpdate(
    { notificationType },
    { $set: { delayMode, delayMinutes } },
    { upsert: true, new: true, runValidators: true }
  );
  
  res.json({ success: true, data: updated });
});

exports.getPreferences = asyncHandler(async (req, res) => {
  const prefs = await UserNotificationPreference.find({ userId: req.user._id });
  res.json({ success: true, data: prefs });
});

exports.updatePreference = asyncHandler(async (req, res) => {
  const { notificationType, emailEnabled } = req.body;
  if (!notificationType) throw ApiError.badRequest('notificationType required');
  
  const pref = await UserNotificationPreference.findOneAndUpdate(
    { userId: req.user._id, notificationType },
    { $set: { emailEnabled } },
    { upsert: true, new: true }
  );
  
  res.json({ success: true, data: pref });
});
