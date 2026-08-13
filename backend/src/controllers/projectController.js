const { Project, Department } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/projects
 * Create a new project (Manager+)
 */
exports.createProject = asyncHandler(async (req, res) => {
  const { departmentId, managerId, ...projectData } = req.body;

  // Verify department exists in org (if specified)
  if (departmentId) {
    const dept = await Department.findOne({
      _id: departmentId,
      organization: req.user.organization,
      isDeleted: false,
    });
    if (!dept) {
      throw ApiError.notFound('Department');
    }
  }

  const project = await Project.create({
    ...projectData,
    department: departmentId || undefined,
    manager: managerId,
    organization: req.user.organization,
  });

  res.status(201).json({
    success: true,
    data: project,
  });
});

/**
 * GET /api/projects
 * List projects (scoped to user's role and org)
 */
exports.listProjects = asyncHandler(async (req, res) => {
  const filter = {
    organization: req.user.organization,
    isDeleted: false,
  };

  // Role-based scoping
  if (req.user.role === 'Employee') {
    // Employee sees only projects they have tasks in
    filter._id = {
      $in: (await require('../models/Task').distinct('project', {
        assignee: req.user._id,
        isDeleted: false,
      })),
    };
  } else if (req.user.role === 'Team Lead') {
    // Team lead sees projects their team members work on
    const teamMembers = await require('../models/User').find({
      teams: { $in: req.user.teams },
      isDeleted: false,
    });
    const memberIds = teamMembers.map((m) => m._id);
    memberIds.push(req.user._id); // Include own tasks
    filter._id = {
      $in: (await require('../models/Task').distinct('project', {
        assignee: { $in: memberIds },
        isDeleted: false,
      })),
    };
  } else if (req.user.role === 'Manager') {
    // Manager sees projects they manage or in their department
    filter.$or = [
      { manager: req.user._id },
      { department: req.user.department },
    ];
  }
  // Founder/Admin see all projects in the org

  // Apply optional query filters
  const { status, departmentId, managerId } = req.query;
  if (status) filter.status = status;
  if (departmentId) filter.department = departmentId;
  if (managerId) filter.manager = managerId;

  const projects = await Project.find(filter)
    .populate('manager', 'name email role')
    .populate('department', 'name')
    .populate('teams', 'name department teamLeads')
    .populate('members', 'name email role')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: projects,
  });
});

/**
 * GET /api/projects/:id
 * Get project details with milestones and task summary
 */
exports.getProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  })
    .populate('manager', 'name email role')
    .populate('department', 'name')
    .populate('teams', 'name department teamLeads')
    .populate('members', 'name email role');

  if (!project) {
    throw ApiError.notFound('Project');
  }

  // Get milestones
  const Milestone = require('../models/Milestone');
  const milestones = await Milestone.find({
    project: project._id,
    isDeleted: false,
  }).sort({ dueDate: 1 });

  // Get task summary
  const Task = require('../models/Task');
  const taskStats = await Task.aggregate([
    { $match: { project: project._id, isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      ...project.toJSON(),
      milestones,
      taskStats,
      totalTasks: taskStats.reduce((sum, s) => sum + s.count, 0),
    },
  });
});

/**
 * PATCH /api/projects/:id
 * Update project (Manager+)
 */
exports.updateProject = asyncHandler(async (req, res) => {
  const { managerId, departmentId, ...updateData } = req.body;
  if (managerId) updateData.manager = managerId;
  if (departmentId !== undefined) updateData.department = departmentId || undefined;

  const project = await Project.findOneAndUpdate(
    {
      _id: req.params.id,
      organization: req.user.organization,
      isDeleted: false,
    },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!project) {
    throw ApiError.notFound('Project');
  }

  res.json({
    success: true,
    data: project,
  });
});

/**
 * DELETE /api/projects/:id
 * Delete project (Manager+)
 */
exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!project) {
    throw ApiError.notFound('Project');
  }

  // Check for tasks (VAL-12)
  const Task = require('../models/Task');
  const taskCount = await Task.countDocuments({
    project: project._id,
    isDeleted: false,
  });

  if (taskCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete project: it still contains ${taskCount} task(s)`
    );
  }

  project.isDeleted = true;
  project.deletedAt = new Date();
  await project.save();

  res.json({
    success: true,
    message: 'Project deleted successfully',
  });
});
