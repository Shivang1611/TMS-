const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationJob',
    required: true,
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true,
  },
  providerMessageId: {
    type: String,
  },
  error: {
    type: String,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
