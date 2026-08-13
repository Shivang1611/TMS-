const mongoose = require('mongoose');
const { pollJobs } = require('../workers/notificationWorker');
const NotificationJob = require('../models/NotificationJob');
const NotificationSetting = require('../models/NotificationSetting');
const UserNotificationPreference = require('../models/UserNotificationPreference');
const Task = require('../models/Task');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { queueTaskNotification } = require('../services/emailNotificationQueueService');

const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock the email sending
jest.mock('../services/emailService', () => ({
  sendTemplateEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
}));

jest.setTimeout(60000);

describe('Delayed Notification System', () => {
  let user1, task1;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await NotificationJob.deleteMany({});
    await NotificationSetting.deleteMany({});
    await UserNotificationPreference.deleteMany({});
    await Task.deleteMany({});
    await User.deleteMany({});

    user1 = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      organization: new mongoose.Types.ObjectId(),
      role: 'Employee'
    });

    task1 = await Task.create({
      title: 'Test Task',
      description: 'Desc',
      assignee: user1._id,
      createdBy: user1._id,
      project: new mongoose.Types.ObjectId(), // dummy
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it('queues exactly one job with the correct scheduled_at based on admin settings', async () => {
    // Admin sets a 10 min delay
    await NotificationSetting.create({
      notificationType: 'task_created',
      delayMode: 'delayed',
      delayMinutes: 10,
    });

    await queueTaskNotification(task1._id, user1._id, 'task_created');

    const jobs = await NotificationJob.find({});
    expect(jobs.length).toBe(1);
    expect(jobs[0].status).toBe('pending');

    // Should be scheduled ~10 mins in the future
    const expectedTime = new Date(Date.now() + 10 * 60000);
    const diff = Math.abs(jobs[0].scheduledAt - expectedTime);
    expect(diff).toBeLessThan(5000); // within 5 seconds leeway
  });

  it('admin changing delay_minutes only affects jobs created after the change', async () => {
    await NotificationSetting.create({
      notificationType: 'task_created',
      delayMode: 'delayed',
      delayMinutes: 10,
    });

    await queueTaskNotification(task1._id, user1._id, 'task_created');
    const job1 = await NotificationJob.findOne({ taskId: task1._id });

    // Admin changes delay
    await NotificationSetting.updateOne(
      { notificationType: 'task_created' },
      { $set: { delayMinutes: 60 } }
    );

    const task2 = await Task.create({
      title: 'Task 2',
      assignee: user1._id,
      createdBy: user1._id,
      project: new mongoose.Types.ObjectId(),
    });
    
    await queueTaskNotification(task2._id, user1._id, 'task_created');
    const job2 = await NotificationJob.findOne({ taskId: task2._id });

    // Job 1 should still be ~10 mins
    const diff1 = Math.abs(job1.scheduledAt - new Date(Date.now() + 10 * 60000));
    expect(diff1).toBeLessThan(5000);

    // Job 2 should be ~60 mins
    const diff2 = Math.abs(job2.scheduledAt - new Date(Date.now() + 60 * 60000));
    expect(diff2).toBeLessThan(5000);
  });

  it('worker skips/cancels a job if user opted out before send time', async () => {
    await NotificationJob.create({
      taskId: task1._id,
      recipientUserId: user1._id,
      notificationType: 'task_created',
      scheduledAt: new Date(Date.now() - 1000), // due in the past
    });

    // User opts out
    await UserNotificationPreference.create({
      userId: user1._id,
      notificationType: 'task_created',
      emailEnabled: false,
    });

    await pollJobs();

    const job = await NotificationJob.findOne({ taskId: task1._id });
    expect(job.status).toBe('cancelled');
    expect(job.lastError).toMatch(/opted out/);
    expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
  });

  it('worker cancels a job if task was deleted before send time', async () => {
    await NotificationJob.create({
      taskId: task1._id,
      recipientUserId: user1._id,
      notificationType: 'task_created',
      scheduledAt: new Date(Date.now() - 1000),
    });

    task1.isDeleted = true;
    await task1.save();

    await pollJobs();

    const job = await NotificationJob.findOne({ taskId: task1._id });
    expect(job.status).toBe('cancelled');
    expect(job.lastError).toMatch(/deleted/);
    expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();
  });

  it('worker does not double-send if run twice concurrently', async () => {
    await NotificationJob.create({
      taskId: task1._id,
      recipientUserId: user1._id,
      notificationType: 'task_created',
      scheduledAt: new Date(Date.now() - 1000),
    });

    // Run pollJobs twice concurrently
    await Promise.all([pollJobs(), pollJobs()]);

    const jobs = await NotificationJob.find({ taskId: task1._id });
    expect(jobs.length).toBe(1);
    expect(jobs[0].status).toBe('sent');
    
    // Email should only be sent once
    expect(emailService.sendTemplateEmail).toHaveBeenCalledTimes(1);
  });

  it('retry/backoff logic increments attempts and eventually marks failed', async () => {
    // Force email service to fail
    emailService.sendTemplateEmail.mockRejectedValueOnce(new Error('SMTP Error'))
                                  .mockRejectedValueOnce(new Error('SMTP Error'))
                                  .mockRejectedValueOnce(new Error('SMTP Error'))
                                  .mockRejectedValueOnce(new Error('SMTP Error'))
                                  .mockRejectedValueOnce(new Error('SMTP Error'));

    await NotificationJob.create({
      taskId: task1._id,
      recipientUserId: user1._id,
      notificationType: 'task_created',
      scheduledAt: new Date(Date.now() - 1000),
    });

    // Attempt 1 -> fails -> attempts: 1, status: pending, scheduled in 1 min
    await pollJobs();
    let job = await NotificationJob.findOne({ taskId: task1._id });
    expect(job.attempts).toBe(1);
    expect(job.status).toBe('pending');
    
    // Fast forward scheduledAt so it polls again
    job.scheduledAt = new Date(Date.now() - 1000);
    await job.save();

    // Loop through attempts 2 to 5
    for (let i = 2; i <= 5; i++) {
      await pollJobs();
      job = await NotificationJob.findOne({ taskId: task1._id });
      
      if (i < 5) {
        expect(job.attempts).toBe(i);
        expect(job.status).toBe('pending');
        job.scheduledAt = new Date(Date.now() - 1000);
        await job.save();
      } else {
        // Attempt 5 -> status should be failed
        expect(job.attempts).toBe(5);
        expect(job.status).toBe('failed');
      }
    }
  });
});
