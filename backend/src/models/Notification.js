const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'task_assigned',
        'status_changed',
        'mention',
        'comment_reply',
        'milestone_approaching',
        'task_overdue',
      ],
      required: [true, 'Notification type is required'],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true,
    },
    actor: {
      // Who triggered the notification
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    entityType: {
      type: String,
      enum: ['Task', 'Project', 'Milestone', 'Comment'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    title: {
      type: String,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
