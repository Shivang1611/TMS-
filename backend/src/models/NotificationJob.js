const mongoose = require('mongoose');

const notificationJobSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  recipientUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notificationType: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'cancelled', 'failed'],
    default: 'pending',
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastError: {
    type: String,
  },
  lockedAt: {
    type: Date,
  }
}, { timestamps: true });

// Prevent duplicate jobs for the same task + recipient + type
notificationJobSchema.index({ taskId: 1, recipientUserId: 1, notificationType: 1 }, { unique: true });

// Optimize worker polling for ready jobs
notificationJobSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('NotificationJob', notificationJobSchema);
