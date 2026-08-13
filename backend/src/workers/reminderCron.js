const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const { sendTemplateEmail } = require('../services/emailService');
const User = require('../models/User');

const startWorker = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Calculate 5 minutes from now
      const fiveMinsFromNow = new Date(now.getTime() + 5 * 60000);
      
      // We want to find reminders that are due within the NEXT 5 minutes, 
      // or that were due exactly 5 mins away, and haven't had emails sent.
      // So, dateTime > now AND dateTime <= fiveMinsFromNow
      
      const remindersToNotify = await Reminder.find({
        emailSent: false,
        isCompleted: false,
        dateTime: {
          $gt: now,
          $lte: fiveMinsFromNow
        }
      }).populate('user', 'email name');

      if (remindersToNotify.length > 0) {
        console.log(`[ReminderCron] Found ${remindersToNotify.length} reminders to notify.`);
      }

      for (const reminder of remindersToNotify) {
        try {
          if (reminder.user && reminder.user.email) {
            await sendTemplateEmail({
              to: reminder.user.email,
              subject: `Reminder: ${reminder.title}`,
              template: 'reminderNotification',
              context: {
                name: reminder.user.name,
                title: reminder.title,
                time: reminder.dateTime.toLocaleString(),
              }
            });
            console.log(`[ReminderCron] Sent email for reminder ${reminder._id} to ${reminder.user.email}`);
          }
          
          reminder.emailSent = true;
          await reminder.save();
        } catch (err) {
          console.error(`[ReminderCron] Failed to process reminder ${reminder._id}:`, err);
        }
      }
    } catch (error) {
      console.error('[ReminderCron] Error running reminder cron job:', error);
    }
  });

  console.log('[ReminderCron] Worker started');
};

module.exports = { startWorker };
