const NotificationSetting = require('../models/NotificationSetting');
const NotificationJob = require('../models/NotificationJob');

const queueTaskNotification = async (taskId, recipientUserId, notificationType = 'task_created') => {
  try {
    const setting = await NotificationSetting.findOne({ notificationType });
    let scheduledAt = new Date();
    
    if (setting && setting.delayMode === 'delayed' && setting.delayMinutes > 0) {
      scheduledAt = new Date(Date.now() + setting.delayMinutes * 60000);
    }

    await NotificationJob.findOneAndUpdate(
      { taskId, recipientUserId, notificationType },
      {
        $set: {
          status: 'pending',
          scheduledAt,
          attempts: 0,
          lastError: null,
          lockedAt: null,
        }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('[NotificationQueue] Error queuing notification:', error);
  }
};

const cancelTaskNotifications = async (taskId, notificationType = 'task_created') => {
  try {
    await NotificationJob.updateMany(
      { taskId, notificationType, status: 'pending' },
      { $set: { status: 'cancelled', lastError: 'Task deleted or reassigned' } }
    );
  } catch (error) {
    console.error('[NotificationQueue] Error cancelling notification:', error);
  }
};

module.exports = {
  queueTaskNotification,
  cancelTaskNotifications
};
