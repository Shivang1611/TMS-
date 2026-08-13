const Reminder = require('../models/Reminder');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/reminders
 * Get all reminders for the authenticated user
 */
exports.getReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ user: req.user._id })
    .sort({ dateTime: 1 }); // Chronological order

  res.json({
    success: true,
    data: reminders,
  });
});

/**
 * POST /api/reminders
 * Create a new reminder
 */
exports.createReminder = asyncHandler(async (req, res) => {
  const { title, dateTime } = req.body;

  if (!title || !dateTime) {
    throw ApiError.badRequest('Title and dateTime are required');
  }

  const reminder = await Reminder.create({
    user: req.user._id,
    title,
    dateTime: new Date(dateTime),
  });

  res.status(201).json({
    success: true,
    data: reminder,
  });
});

/**
 * PATCH /api/reminders/:id
 * Update a reminder (e.g., mark as completed)
 */
exports.updateReminder = asyncHandler(async (req, res) => {
  const { title, dateTime, isCompleted } = req.body;

  let reminder = await Reminder.findOne({ _id: req.params.id, user: req.user._id });
  if (!reminder) throw ApiError.notFound('Reminder');

  if (title !== undefined) reminder.title = title;
  if (dateTime !== undefined) {
    reminder.dateTime = new Date(dateTime);
    // If time is updated, we might need to resend email if it's in the future
    if (reminder.dateTime > new Date()) {
      reminder.emailSent = false;
    }
  }
  if (isCompleted !== undefined) reminder.isCompleted = isCompleted;

  await reminder.save();

  res.json({
    success: true,
    data: reminder,
  });
});

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
exports.deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!reminder) throw ApiError.notFound('Reminder');

  res.json({
    success: true,
    message: 'Reminder deleted',
  });
});
