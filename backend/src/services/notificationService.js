const { Notification, Task } = require('../models');
const { emitNewNotification } = require('./socket');

/**
 * Create a notification document and emit it via Socket.IO to the recipient.
 *
 * @param {Object} params
 * @param {string}  params.type       - Notification type enum value
 * @param {string}  params.recipient  - User ID of the recipient
 * @param {string}  params.actor      - User ID who triggered the notification
 * @param {string}  params.entityType - 'Task' | 'Project' | 'Milestone' | 'Comment'
 * @param {string}  params.entityId   - MongoID of the entity
 * @param {string}  params.title      - Short title (≤200 chars)
 * @param {string}  params.message    - Longer message body (≤500 chars)
 */
async function createAndEmitNotification({ type, recipient, actor, entityType, entityId, title, message }) {
  if (!recipient) return; // No recipient to notify

  try {
    const notification = await Notification.create({
      type,
      recipient,
      actor,
      entityType,
      entityId,
      title: title?.slice(0, 200),
      message: message?.slice(0, 500),
    });

    emitNewNotification(notification);
  } catch (err) {
    console.error(`[NotificationService] Failed to create notification:`, err.message);
  }
}

/**
 * Create a task_assigned notification.
 */
async function notifyTaskAssigned({ task, assigneeId, actorId, actorName, taskTitle }) {
  if (!assigneeId) return;
  // Don't notify self-assignment — compare stringified IDs because types may differ (string vs ObjectId)
  if (actorId && assigneeId.toString() === actorId.toString()) return;

  await createAndEmitNotification({
    type: 'task_assigned',
    recipient: assigneeId,
    actor: actorId,
    entityType: 'Task',
    entityId: task._id,
    title: `Assigned to task: ${taskTitle}`,
    message: `${actorName} assigned you to "${taskTitle}"`,
  });
}

/**
 * Create a status_changed notification for the task's assignees.
 */
async function notifyStatusChanged({ task, oldStatus, newStatus, actorId, actorName, taskTitle }) {
  if (!task.assignees || task.assignees.length === 0) return;

  for (const assigneeId of task.assignees) {
    if (assigneeId.toString() === actorId?.toString()) continue;

    await createAndEmitNotification({
      type: 'status_changed',
      recipient: assigneeId,
      actor: actorId,
      entityType: 'Task',
      entityId: task._id,
      title: `Task status updated: ${taskTitle}`,
      message: `${actorName} changed "${taskTitle}" from ${oldStatus} to ${newStatus}`,
    });
  }
}

/**
 * Create mention notifications for each mentioned user in a comment.
 */
async function notifyMentions({ comment, taskId, taskTitle, actorId, actorName, mentionedUserIds }) {
  if (!mentionedUserIds || mentionedUserIds.length === 0) return;

  // Fetch the task title if not provided
  let title = taskTitle;
  if (!title && taskId) {
    try {
      const task = await Task.findById(taskId).select('title');
      title = task?.title || 'a task';
    } catch {
      title = 'a task';
    }
  }

  for (const userId of mentionedUserIds) {
    if (userId.toString() === actorId?.toString()) continue; // Don't notify self-mentions

    await createAndEmitNotification({
      type: 'mention',
      recipient: userId,
      actor: actorId,
      entityType: 'Task',
      entityId: taskId,
      title: `You were mentioned in a comment`,
      message: `${actorName} mentioned you in "${title}"`,
    });
  }
}

module.exports = {
  createAndEmitNotification,
  notifyTaskAssigned,
  notifyStatusChanged,
  notifyMentions,
};
