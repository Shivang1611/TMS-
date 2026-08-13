const { Task, Project } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitTaskUpdated } = require('../services/socket');
const { notifyTaskAssigned, notifyStatusChanged } = require('../services/notificationService');
const scoreService = require('../services/scoreService');
const { queueTaskNotification, cancelTaskNotifications } = require('../services/emailNotificationQueueService');

/**
 * POST /api/projects/:projectId/tasks
 * Create a task (Manager/Team Lead)
 */
exports.createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { milestoneId, assigneeId, parentTaskId, ...taskData } = req.body;

  const project = await Project.findOne({
    _id: projectId,
    organization: req.user.organization,
    isDeleted: false,
  });
  if (!project) throw ApiError.notFound('Project');

  if (parentTaskId) {
    const parentTask = await Task.findOne({ _id: parentTaskId, project: projectId, isDeleted: false });
    if (!parentTask) throw ApiError.notFound('Parent task');
  }

  const task = await Task.create({
    ...taskData,
    title: taskData.title,
    project: projectId,
    milestone: milestoneId || undefined,
    assignee: assigneeId || undefined,
    createdBy: req.user._id,
    parentTask: parentTaskId || undefined,
  });

  emitTaskUpdated(task);

  // Notify assignee about the new task
  if (assigneeId) {
    notifyTaskAssigned({
      task,
      assigneeId,
      actorId: req.user._id,
      actorName: req.user.name,
      taskTitle: task.title,
    });
    
    // Queue background email notification asynchronously
    queueTaskNotification(task._id, assigneeId, 'task_created').catch(err => console.error(err));
  }

  res.status(201).json({ success: true, data: task });
});

/**
 * GET /api/tasks
 * List tasks (filterable, sortable, paginated)
 */
exports.listTasks = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  const { projectId, milestoneId, assigneeId, createdBy, status, priority, dueDateFrom, dueDateTo,
    page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  if (projectId) filter.project = projectId;
  if (milestoneId) filter.milestone = milestoneId;
  if (assigneeId) filter.assignee = assigneeId;
  if (createdBy) filter.createdBy = createdBy;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (dueDateFrom || dueDateTo) {
    filter.dueDate = {};
    if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
    if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
  }

  if (req.user.role === 'Employee') {
    filter.assignee = req.user._id;
  } else if (req.user.role === 'Team Lead') {
    const teamMembers = await require('../models/User').find({ teams: { $in: req.user.teams }, isDeleted: false });
    const memberIds = teamMembers.map((m) => m._id);
    memberIds.push(req.user._id);
    filter.assignee = { $in: memberIds };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
  const limit = parseInt(pageSize, 10);
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [tasks, totalCount] = await Promise.all([
    Task.find(filter)
      .populate('assignee', 'name email role profile.jobTitle')
      .populate('createdBy', 'name email role profile.jobTitle')
      .populate('milestone', 'name')
      .populate('project', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  res.json({
    success: true, data: tasks,
    pagination: { page: parseInt(page, 10), pageSize: limit, totalCount, totalPages: Math.ceil(totalCount / limit) },
  });
});

exports.listTasksByProject = asyncHandler(async (req, res) => {
  req.query.projectId = req.params.projectId;
  return exports.listTasks(req, res);
});

/**
 * GET /api/tasks/:id
 * Get task details with subtasks, comments, and activity timeline
 */
exports.getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false })
    .populate('assignee', 'name email role profile.jobTitle')
    .populate('createdBy', 'name email role profile.jobTitle')
    .populate('milestone', 'name status')
    .populate('project', 'name')
    .populate('parentTask', 'title status');

  if (!task) throw ApiError.notFound('Task');

  const subtasks = await Task.find({ parentTask: task._id, isDeleted: false }).sort({ createdAt: 1 });
  const Comment = require('../models/Comment');
  const comments = await Comment.find({ task: task._id, isDeleted: false, parentComment: null })
    .populate('author', 'name email').sort({ createdAt: 1 });
  const ActivityLog = require('../models/ActivityLog');
  const activities = await ActivityLog.find({ entityType: 'Task', entityId: task._id })
    .populate('actor', 'name email').sort({ createdAt: -1 }).limit(50);

  res.json({ success: true, data: { ...task.toJSON(), subtasks, comments, activities } });
});

/**
 * PATCH /api/tasks/:id
 * Update task fields (role-scoped)
 */
exports.updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
  if (!task) throw ApiError.notFound('Task');
  if (!canEditTask(req.user, task)) throw ApiError.forbidden('Insufficient permissions to edit this task');

  for (const field of ['title', 'description', 'priority', 'milestone', 'dueDate', 'estimatedEffort', 'actualEffort', 'allowAssigneeToEdit']) {
    if (req.body[field] !== undefined) task[field] = req.body[field];
  }
  await task.save();
  emitTaskUpdated(task);
  res.json({ success: true, data: task });
});

/**
 * PATCH /api/tasks/bulk/status
 * Bulk update task statuses (Manager+)
 */
exports.bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { taskIds, status } = req.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw ApiError.badRequest('taskIds must be a non-empty array');
  }

  if (!status) {
    throw ApiError.badRequest('status is required');
  }

  const validStatuses = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const tasks = await Task.find({ _id: { $in: taskIds }, isDeleted: false });

  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const task of tasks) {
    try {
      const isManager = ['Founder', 'Admin', 'Manager', 'Team Leader'].includes(req.user.role);

      if (!isManager && !task.canTransitionTo(status)) {
        skipped++;
        continue;
      }

      const oldStatus = task.status;
      task.status = status;
      task.statusChangedAt = new Date();
      
      if (status === 'Done') {
        task.completedAt = new Date();
        await scoreService.processTaskCompletion(task);
      } else if (oldStatus === 'Done') {
        // Task reopened from Done
        await scoreService.processTaskReopen(task);
      }
      
      await task.save();
      emitTaskUpdated(task);
      updated++;
    } catch (err) {
      errors.push({ taskId: task._id, message: err.message });
    }
  }

  res.json({
    success: true,
    data: { updated, skipped, errors, total: taskIds.length },
    message: `${updated} task(s) updated, ${skipped} skipped, ${errors.length} error(s).`,
  });
});

/**
 * DELETE /api/tasks/:id
 * Delete task (role-scoped)
 */
exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
  if (!task) throw ApiError.notFound('Task');
  if (!canDeleteTask(req.user, task)) throw ApiError.forbidden('Insufficient permissions to delete this task');

  task.isDeleted = true;
  task.deletedAt = new Date();
  await task.save();

  // Cancel any pending notifications for this task
  cancelTaskNotifications(task._id, 'task_created').catch(err => console.error(err));

  emitTaskUpdated({ ...task.toObject(), isDeleted: true });

  res.json({ success: true, message: 'Task deleted successfully' });
});

/**
 * PATCH /api/tasks/:id/status
 * Update task status with BR-02 and BR-03 validation
 */
exports.updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, blockedReason } = req.body;
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
  if (!task) throw ApiError.notFound('Task');

  const oldStatus = task.status;

  const isManager = ['Founder', 'Admin', 'Manager', 'Team Leader'].includes(req.user.role);

  if (!isManager && !task.canTransitionTo(status)) {
    throw ApiError.badRequest(
      `Cannot transition task from '${task.status}' to '${status}'. Allowed: ${Task.VALID_TRANSITIONS[task.status].join(', ') || 'none'}`
    );
  }

  if (status === 'Done') {
    const allowedRoles = ['Founder', 'Admin', 'Manager', 'Team Leader'];
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden('Only Managers or Team Leaders can mark a task as Done.');
    }

    const openSubtasksCount = await Task.countDocuments({ parentTask: task._id, status: { $ne: 'Done' }, isDeleted: false });
    if (openSubtasksCount > 0) {
      throw ApiError.badRequest(`Cannot set task to Done: ${openSubtasksCount} open subtask(s) remain.`);
    }
  }

  task.status = status;
  task.statusChangedAt = new Date();
  if (status === 'Blocked') task.blockedReason = blockedReason || null;
  
  if (status === 'Done') {
    task.completedAt = new Date();
    await scoreService.processTaskCompletion(task);
  } else if (oldStatus === 'Done') {
    await scoreService.processTaskReopen(task);
  }
  
  await task.save();

  emitTaskUpdated(task);

  // Notify the task assignee about the status change
  if (oldStatus !== status) {
    notifyStatusChanged({
      task,
      oldStatus,
      newStatus: status,
      actorId: req.user._id,
      actorName: req.user.name,
      taskTitle: task.title,
    });
  }

  res.json({ success: true, data: task });
});

/**
 * PATCH /api/tasks/:id/assign
 * Assign or reassign a task
 */
exports.assignTask = asyncHandler(async (req, res) => {
  const { assigneeId } = req.body;
  const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
  if (!task) throw ApiError.notFound('Task');

  if (!assigneeId) {
    task.assignee = undefined;
    await task.save();
    emitTaskUpdated(task);
    
    // Cancel pending notifications if unassigned
    cancelTaskNotifications(task._id, 'task_created').catch(err => console.error(err));
    
    return res.json({ success: true, data: task, message: 'Task unassigned' });
  }

  const User = require('../models/User');
  const user = await User.findOne({ _id: assigneeId, organization: req.user.organization, isDeleted: false, isActive: true });
  if (!user) throw ApiError.badRequest('User is not a member of this organization or is inactive');

  task.assignee = assigneeId;
  await task.save();
  emitTaskUpdated(task);

  // Notify the new assignee
  notifyTaskAssigned({
    task,
    assigneeId,
    actorId: req.user._id,
    actorName: req.user.name,
    taskTitle: task.title,
  });

  // Re-queue background email notification
  cancelTaskNotifications(task._id, 'task_created')
    .then(() => queueTaskNotification(task._id, assigneeId, 'task_created'))
    .catch(err => console.error(err));

  res.json({ success: true, data: task, message: 'Task assigned successfully' });
});

/**
 * GET /api/tasks/:id/subtasks
 * Get subtasks of a task
 */
exports.getSubtasks = asyncHandler(async (req, res) => {
  const subtasks = await Task.find({ parentTask: req.params.id, isDeleted: false })
    .populate('assignee', 'name email').sort({ createdAt: 1 });
  res.json({ success: true, data: subtasks });
});

// ─── Helper Functions ────────────────────────────────────────────────────────

function canEditTask(user, task) {
  if (['Founder', 'Admin'].includes(user.role)) return true;
  if (user.role === 'Manager') return true;
  if (user.role === 'Team Lead') return user.teams && user.teams.length > 0;
  if (task.assignee && task.assignee.toString() === user._id.toString() && task.allowAssigneeToEdit) return true;
  return false;
}

function canDeleteTask(user, task) {
  if (['Founder', 'Admin'].includes(user.role)) return true;
  if (user.role === 'Manager') return true;
  if (user.role === 'Team Lead') return user.teams && user.teams.length > 0;
  return false;
}

exports.canAccessTask = async function(user, task) {
  if (['Founder', 'Admin', 'Manager'].includes(user.role)) return true;
  
  const isAssignee = task.assignee && task.assignee.toString() === user._id.toString();
  const isCreator = task.createdBy && task.createdBy.toString() === user._id.toString();
  
  if (isAssignee || isCreator) return true;

  if (user.role === 'Team Lead' && task.assignee) {
    const User = require('../models/User');
    const assignee = await User.findById(task.assignee);
    if (assignee && assignee.teams && user.teams) {
      const sharedTeams = assignee.teams.filter(t => user.teams.some(ut => ut.toString() === t.toString()));
      if (sharedTeams.length > 0) return true;
    }
  }

  return false;
};
