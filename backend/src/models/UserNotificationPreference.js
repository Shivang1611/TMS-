const mongoose = require('mongoose');

const userNotificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notificationType: {
    type: String,
    required: true,
    trim: true,
  },
  emailEnabled: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

userNotificationPreferenceSchema.index({ userId: 1, notificationType: 1 }, { unique: true });

module.exports = mongoose.model('UserNotificationPreference', userNotificationPreferenceSchema);
