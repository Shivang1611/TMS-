const { Task, Project, Milestone, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

/**
 * GET /api/dashboards/org
 * Org-wide dashboard (Founder/Admin)
 */
exports.orgDashboard = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;

  const [
    totalProjects,
    activeProjects,
    totalTasks,
    tasksByStatus,
    overdueTasks,
    upcomingMilestones,
    recentActivity,
  ] = await Promise.all([
    Project.countDocuments({ organization: orgId, isDeleted: false }),
    Project.countDocuments({ organization: orgId, isDeleted: false, status: 'Active' }),
    Task.countDocuments({
      project: { $in: await Project.find({ organization: orgId }).distinct('_id') },
      isDeleted: false,
    }),
    Task.aggregate([
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectInfo',
        },
      },
      { $unwind: '$projectInfo' },
      { $match: { 'projectInfo.organization': orgId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $ne: 'Done' },
      isDeleted: false,
      project: { $in: await Project.find({ organization: orgId }).distinct('_id') },
    }),
    Milestone.find({
      dueDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) },
      status: { $ne: 'Completed' },
      isDeleted: false,
      project: { $in: await Project.find({ organization: orgId }).distinct('_id') },
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .limit(10),
    Task.find({
      project: { $in: await Project.find({ organization: orgId }).distinct('_id') },
      isDeleted: false,
    })
      .populate('createdBy', 'name email role profile.jobTitle')
      .populate('assignees', 'name email role profile.jobTitle')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(12),
  ]);

  res.json({
    success: true,
    data: {
      totalProjects,
      activeProjects,
      totalTasks,
      tasksByStatus,
      overdueTasks,
      upcomingMilestones,
      recentDailyTasks: recentDailyTasks.map((t) => {
        const obj = t.toObject();
        let durationHours = null;
        if (t.completedAt && t.createdAt) {
          durationHours = Math.round(((t.completedAt - t.createdAt) / (1000 * 60 * 60)) * 10) / 10;
        }
        return {
          ...obj,
          durationHours,
          assignedBy: t.createdBy ? t.createdBy.name : 'Admin',
          assignedTo: t.assignees && t.assignees.length > 0 ? t.assignees.map(a => a.name).join(', ') : 'Unassigned',
        };
      }),
    },
  });
});

/**
 * GET /api/dashboards/department
 * Department dashboard (Manager)
 */
exports.departmentDashboard = asyncHandler(async (req, res) => {
  if (!req.user.department) {
    return res.json({
      success: true,
      data: { message: 'No department assigned' },
    });
  }

  const deptId = req.user.department;
  const deptProjects = await Project.find({
    department: deptId,
    isDeleted: false,
  }).distinct('_id');

  const [projectCount, taskStats, teamMembers] = await Promise.all([
    deptProjects.length,
    Task.aggregate([
      { $match: { project: { $in: deptProjects }, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.countDocuments({
      department: deptId,
      isDeleted: false,
      isActive: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      projectCount,
      teamMembers,
      taskStats,
    },
  });
});

/**
 * GET /api/dashboards/team
 * Team dashboard (Team Lead)
 */
exports.teamDashboard = asyncHandler(async (req, res) => {
  const teamIds = req.user.teams;
  if (!teamIds || teamIds.length === 0) {
    return res.json({
      success: true,
      data: { message: 'No teams assigned' },
    });
  }

  const teamMembers = await User.find({
    teams: { $in: teamIds },
    isDeleted: false,
    isActive: true,
  }).distinct('_id');
  teamMembers.push(req.user._id);

  const tasks = await Task.find({
    assignees: { $in: teamMembers },
    isDeleted: false,
  })
    .populate('assignees', 'name email')
    .populate('project', 'name')
    .sort({ dueDate: 1 })
    .limit(20);

  const taskStats = {
    total: tasks.length,
    byStatus: tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {}),
  };

  res.json({
    success: true,
    data: {
      teamSize: teamMembers.length - 1, // Exclude self
      teamLeadId: req.user._id,
      ...taskStats,
      recentTasks: tasks,
    },
  });
});

/**
 * GET /api/dashboards/workload
 * Team workload — task counts per team member (Manager can see their department,
 * Founder/Admin see the full org). Returns a bar-chart-friendly array.
 */
exports.workloadDashboard = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;

  // Scope: Admins/Founders see the whole org, Managers see their department
  let userFilter = { organization: orgId, isDeleted: false, isActive: true };
  if (req.user.role === 'Manager' && req.user.department) {
    userFilter.department = req.user.department;
  }

  const users = await User.find(userFilter).select('name email').lean();
  const userIds = users.map((u) => u._id);

  if (userIds.length === 0) {
    return res.json({ success: true, data: [] });
  }

  // Aggregate tasks per assignee, grouped by status
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
    { $match: { 'projectInfo.organization': new mongoose.Types.ObjectId(orgId), isDeleted: false } },
    { $unwind: '$assignees' },
    { $match: { assignees: { $in: userIds } } },
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

  // Merge user details
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const enriched = workload.map((w) => ({
    user: userMap[w._id.toString()] || { name: 'Unknown', email: '' },
    tasksByStatus: w.tasksByStatus,
    totalTasks: w.totalTasks,
  }));

  // Include users with zero tasks so the chart shows everyone
  const zeroTaskUsers = users
    .filter((u) => !workload.some((w) => w._id.toString() === u._id.toString()))
    .map((u) => ({
      user: { name: u.name, email: u.email, _id: u._id },
      tasksByStatus: [],
      totalTasks: 0,
    }));

  res.json({
    success: true,
    data: [...enriched, ...zeroTaskUsers].sort((a, b) => b.totalTasks - a.totalTasks),
  });
});

/**
 * GET /api/dashboards/personal
 * Personal dashboard (all roles)
 */
exports.personalDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [assignedTasks, overdueTasks, completedThisWeek, recentNotifications] = await Promise.all([
    Task.find({ assignees: userId, isDeleted: false, status: { $ne: 'Done' } })
      .populate('project', 'name')
      .populate('milestone', 'name')
      .sort({ priority: -1, dueDate: 1 }),
    Task.countDocuments({
      assignees: userId,
      dueDate: { $lt: new Date() },
      status: { $ne: 'Done' },
      isDeleted: false,
    }),
    Task.countDocuments({
      assignees: userId,
      status: 'Done',
      completedAt: { $gte: new Date(Date.now() - 7 * 86400000) },
      isDeleted: false,
    }),
    [], // TODO: Fetch recent notifications
  ]);

  const taskStats = {
    total: assignedTasks.length + (await Task.countDocuments({
      assignees: userId,
      status: 'Done',
      isDeleted: false,
    })),
    byStatus: assignedTasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {}),
    overdue: overdueTasks,
    completedThisWeek,
  };

  res.json({
    success: true,
    data: {
      taskStats,
      upcomingTasks: assignedTasks.slice(0, 10),
    },
  });
});
