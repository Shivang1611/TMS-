const asyncHandler = require('../utils/asyncHandler');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

function getPeriodDateFilter(period) {
  const now = new Date();
  if (period === 'daily') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { createdAt: { $gte: startOfDay } };
  } else if (period === 'weekly') {
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return { createdAt: { $gte: startOfWeek } };
  } else if (period === 'monthly') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { createdAt: { $gte: startOfMonth } };
  }
  return {};
}

/**
 * GET /api/reports/tasks
 * Task completion report (filterable by period, department, project, assignee)
 */
exports.taskCompletionReport = asyncHandler(async (req, res) => {
  const { period = 'all', projectId, assigneeId } = req.query;
  const periodMatch = getPeriodDateFilter(period);

  const matchStage = {
    'projectInfo.organization': req.user.organization,
    isDeleted: false,
    ...periodMatch,
  };

  if (projectId) matchStage['project'] = new (require('mongoose').Types.ObjectId)(projectId);
  if (assigneeId) matchStage['assignees'] = new (require('mongoose').Types.ObjectId)(assigneeId);

  // Group by status for summary
  const statusSummary = await Task.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'projectInfo',
      },
    },
    { $unwind: '$projectInfo' },
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fetch detailed tasks list with populated createdBy (Assigner), assignee, and project
  const filterQuery = { isDeleted: false, ...periodMatch };
  if (projectId) filterQuery.project = projectId;
  if (assigneeId) filterQuery.assignees = assigneeId;

  // Filter tasks belonging to user's org
  const orgProjects = await Project.find({ organization: req.user.organization, isDeleted: false }).select('_id');
  const orgProjectIds = orgProjects.map((p) => p._id);
  filterQuery.project = { $in: orgProjectIds };

  const detailedTasks = await Task.find(filterQuery)
    .populate('createdBy', 'name email role score profile.jobTitle')
    .populate('assignees', 'name email role score profile.jobTitle')
    .populate('project', 'name')
    .sort({ createdAt: -1 })
    .limit(100);

  const enrichedTasks = detailedTasks.map((t) => {
    const taskObj = t.toObject();
    let durationHours = null;
    if (t.completedAt && t.createdAt) {
      durationHours = Math.round(((t.completedAt - t.createdAt) / (1000 * 60 * 60)) * 10) / 10;
    }
    return {
      ...taskObj,
      durationHours,
      assignedBy: t.createdBy ? t.createdBy.name : 'System/Unspecified',
      assignedTo: t.assignees && t.assignees.length > 0 ? t.assignees.map(a => a.name).join(', ') : 'Unassigned',
    };
  });

  const totalTasks = statusSummary.reduce((sum, t) => sum + t.count, 0);
  const completedTasks = statusSummary.find((t) => t._id === 'Done')?.count || 0;

  res.json({
    success: true,
    data: {
      period,
      tasksByStatus: statusSummary,
      detailedTasks: enrichedTasks,
      totalTasks,
      completedTasks,
      completionPercentage: totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0,
    },
  });
});

/**
 * GET /api/reports/workload
 * Workload report — tasks per assignee, grouped by status
 */
exports.workloadReport = asyncHandler(async (req, res) => {
  const workload = await Task.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'projectInfo',
      },
    },
    { $unwind: '$projectInfo' },
    { $match: { 'projectInfo.organization': req.user.organization, isDeleted: false } },
    { $unwind: '$assignees' },
    { $match: { assignees: { $ne: null } } },
    {
      $group: {
        _id: { assignee: '$assignees', status: '$status' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.assignee',
        tasksByStatus: {
          $push: { status: '$_id.status', count: '$count' },
        },
        totalTasks: { $sum: '$count' },
      },
    },
    { $sort: { totalTasks: -1 } },
  ]);

  // Populate assignee details
  const userMap = {};
  const userIds = workload.map((w) => w._id);
  const users = await User.find({ _id: { $in: userIds } }).select('name email score role');
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const enriched = workload.map((w) => ({
    assignee: userMap[w._id.toString()] || { name: 'Unknown', email: '' },
    tasksByStatus: w.tasksByStatus,
    totalTasks: w.totalTasks,
  }));

  res.json({
    success: true,
    data: enriched,
  });
});

/**
 * GET /api/reports/projects
 * Project progress report — milestone and task completion per project
 */
exports.projectProgressReport = asyncHandler(async (req, res) => {
  const projects = await Project.aggregate([
    { $match: { organization: req.user.organization, isDeleted: false } },
    {
      $lookup: {
        from: 'milestones',
        localField: '_id',
        foreignField: 'project',
        as: 'milestones',
      },
    },
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'project',
        as: 'tasks',
      },
    },
    {
      $project: {
        name: 1,
        status: 1,
        milestoneCount: { $size: '$milestones' },
        completedMilestones: {
          $size: {
            $filter: {
              input: '$milestones',
              as: 'm',
              cond: { $eq: ['$$m.status', 'Completed'] },
            },
          },
        },
        taskCount: { $size: '$tasks' },
        completedTasks: {
          $size: {
            $filter: {
              input: '$tasks',
              as: 't',
              cond: { $eq: ['$$t.status', 'Done'] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        milestoneCompletionPct: {
          $cond: [
            { $gt: ['$milestoneCount', 0] },
            { $multiply: [{ $divide: ['$completedMilestones', '$milestoneCount'] }, 100] },
            0,
          ],
        },
        taskCompletionPct: {
          $cond: [
            { $gt: ['$taskCount', 0] },
            { $multiply: [{ $divide: ['$completedTasks', '$taskCount'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { name: 1 } },
  ]);

  res.json({
    success: true,
    data: projects,
  });
});

/**
 * GET /api/reports/department-throughput
 * Department throughput — tasks completed per week, grouped by department
 */
exports.departmentThroughput = asyncHandler(async (req, res) => {
  const throughput = await Task.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'projectInfo',
      },
    },
    { $unwind: '$projectInfo' },
    { $match: { 'projectInfo.organization': req.user.organization, isDeleted: false } },
    { $match: { status: 'Done', completedAt: { $ne: null } } },
    {
      $group: {
        _id: {
          department: '$projectInfo.department',
          week: { $isoWeek: '$completedAt' },
          year: { $isoWeekYear: '$completedAt' },
        },
        completedCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.week': -1 } },
    { $limit: 52 }, // Last year of weekly data
  ]);

  res.json({
    success: true,
    data: throughput,
  });
});
