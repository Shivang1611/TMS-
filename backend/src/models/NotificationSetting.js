const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema({
  notificationType: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  delayMode: {
    type: String,
    enum: ['instant', 'delayed'],
    default: 'instant',
  },
  delayMinutes: {
    type: Number,
    default: 0,
    min: 0,
    max: 1440,
  }
}, { timestamps: true });

module.exports = mongoose.model('NotificationSetting', notificationSettingSchema);
