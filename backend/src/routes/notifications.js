const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// GET /api/notifications — List user's notifications (paginated)
router.get('/', notificationController.listNotifications);

// PATCH /api/notifications/:id/read — Mark single notification as read
router.patch('/:id/read', notificationController.markAsRead);

// PATCH /api/notifications/read-all — Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// ─── Settings & Preferences ───────────────────────────────────────────────────

// GET /api/notifications/settings - Get global notification settings
router.get('/settings', notificationController.getSettings);

// PATCH /api/notifications/settings - Update global notification settings
router.patch('/settings', notificationController.updateSettings);

// GET /api/notifications/preferences - Get user notification preferences
router.get('/preferences', notificationController.getPreferences);

// PATCH /api/notifications/preferences - Update user notification preferences
router.patch('/preferences', notificationController.updatePreference);

module.exports = router;
