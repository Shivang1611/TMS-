const cron = require('node-cron');
const NotificationJob = require('../models/NotificationJob');
const NotificationLog = require('../models/NotificationLog');
const UserNotificationPreference = require('../models/UserNotificationPreference');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendTemplateEmail } = require('../services/emailService');

const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 30, 60]; // Retry delays

// Keep track of if the worker is currently polling to prevent overlapping concurrent loops
let isPolling = false;

const processJob = async (job) => {
  let logStatus = 'failure';
  let logError = null;
  let logProviderId = null;

  try {
    // 1. Validation: Does the task still exist and is it still assigned to this user?
    const task = await Task.findById(job.taskId)
      .populate('createdBy')
      .populate({
        path: 'project',
        populate: { path: 'department' }
      });
    if (!task || task.isDeleted) {
      job.status = 'cancelled';
      job.lastError = 'Task was deleted before sending';
      await job.save();
      return;
    }

    if (!task.assignees || !task.assignees.some(a => a.toString() === job.recipientUserId.toString())) {
      job.status = 'cancelled';
      job.lastError = 'Task was reassigned before sending';
      await job.save();
      return;
    }

    // 2. Validation: Does the user still have notifications enabled?
    const pref = await UserNotificationPreference.findOne({
      userId: job.recipientUserId,
      notificationType: job.notificationType,
    });
    
    // If pref exists and is false, cancel it. (Default is true if not found)
    if (pref && pref.emailEnabled === false) {
      job.status = 'cancelled';
      job.lastError = 'User opted out of this notification type';
      await job.save();
      return;
    }

    // 3. Validation: Does the recipient have an email?
    const recipient = await User.findById(job.recipientUserId);
    if (!recipient || !recipient.email) {
      job.status = 'failed';
      job.lastError = 'Recipient does not exist or has no email';
      await job.save();
      return;
    }

    // 4. Send Email
    if (job.notificationType === 'task_created') {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      const info = await sendTemplateEmail({
        to: recipient.email,
        subject: `New task assigned: ${task.title}`,
        template: 'task_created',
        context: {
          recipientName: recipient.name || 'there',
          assignerName: task.createdBy?.name || 'An admin',
          taskTitle: task.title,
          departmentName: task.project?.department?.name || 'General',
          taskUrl: `${baseUrl}/my-tasks`,
          preferencesUrl: `${baseUrl}/settings/notifications`,
        }
      });
      
      logProviderId = info.messageId;
      job.status = 'sent';
      logStatus = 'success';
    } else {
      throw new Error(`Unknown notificationType: ${job.notificationType}`);
    }

    await job.save();

  } catch (error) {
    console.error(`[NotificationWorker] Error processing job ${job._id}:`, error);
    job.attempts += 1;
    job.lastError = error.message || 'Unknown error';

    if (job.attempts >= MAX_ATTEMPTS) {
      job.status = 'failed';
    } else {
      job.status = 'pending';
      const delayMinutes = BACKOFF_MINUTES[job.attempts - 1] || 60;
      job.scheduledAt = new Date(Date.now() + delayMinutes * 60000);
    }
    
    logError = job.lastError;
    await job.save();
  } finally {
    // Write Audit Log
    if (job.status === 'sent' || job.status === 'failed' || logError) {
      await NotificationLog.create({
        jobId: job._id,
        status: logStatus,
        providerMessageId: logProviderId,
        error: logError,
      });
    }
  }
};

const pollJobs = async () => {
  if (isPolling) return;
  isPolling = true;

  try {
    let jobFound = true;
    
    // Process jobs sequentially as long as there are jobs due
    while (jobFound) {
      // Find one due job and lock it atomically
      const job = await NotificationJob.findOneAndUpdate(
        {
          status: 'pending',
          scheduledAt: { $lte: new Date() }
        },
        {
          $set: {
            status: 'processing',
            lockedAt: new Date()
          }
        },
        { new: true, sort: { scheduledAt: 1 } }
      );

      if (job) {
        await processJob(job);
      } else {
        jobFound = false;
      }
    }
  } catch (error) {
    console.error('[NotificationWorker] Polling error:', error);
  } finally {
    isPolling = false;
  }
};

const sweepStuckJobs = async () => {
  try {
    // If a job has been 'processing' for more than 5 minutes, assume worker crashed
    const stuckThreshold = new Date(Date.now() - 5 * 60000);
    
    const result = await NotificationJob.updateMany(
      {
        status: 'processing',
        lockedAt: { $lt: stuckThreshold }
      },
      {
        $set: {
          status: 'pending',
          lockedAt: null
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.warn(`[NotificationWorker] Swept ${result.modifiedCount} stuck jobs back to pending.`);
    }
  } catch (error) {
    console.error('[NotificationWorker] Sweep error:', error);
  }
};

// Start the worker
const startWorker = () => {
  console.log('[NotificationWorker] Starting background worker (node-cron)...');
  
  // Poll every 10 seconds
  cron.schedule('*/10 * * * * *', pollJobs);
  
  // Sweep stuck jobs every 2 minutes
  cron.schedule('*/2 * * * *', sweepStuckJobs);
};

module.exports = {
  startWorker,
  pollJobs,
  sweepStuckJobs
};
