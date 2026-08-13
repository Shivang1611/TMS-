const { Milestone, Project } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/projects/:projectId/milestones
 * Create a milestone (Manager+)
 */
exports.createMilestone = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findOne({
    _id: projectId,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!project) {
    throw ApiError.notFound('Project');
  }

  const milestone = await Milestone.create({
    ...req.body,
    project: projectId,
  });

  res.status(201).json({
    success: true,
    data: milestone,
  });
});

/**
 * GET /api/projects/:projectId/milestones
 * List milestones for a project
 */
exports.listMilestonesByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const milestones = await Milestone.find({
    project: projectId,
    isDeleted: false,
  }).sort({ dueDate: 1 });

  res.json({
    success: true,
    data: milestones,
  });
});

/**
 * GET /api/milestones/:id
 * Get milestone details with task summary
 */
exports.getMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate('project', 'name');

  if (!milestone) {
    throw ApiError.notFound('Milestone');
  }

  // Get task summary
  const Task = require('../models/Task');
  const tasks = await Task.find({
    milestone: milestone._id,
    isDeleted: false,
  }).sort({ status: 1, priority: -1 });

  const taskStats = {
    total: tasks.length,
    byStatus: tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {}),
    completionPercentage: tasks.length > 0
      ? Math.round((tasks.filter((t) => t.status === 'Done').length / tasks.length) * 100)
      : 0,
  };

  res.json({
    success: true,
    data: {
      ...milestone.toJSON(),
      tasks,
      taskStats,
    },
  });
});

/**
 * PATCH /api/milestones/:id
 * Update milestone (Manager+)
 */
exports.updateMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!milestone) {
    throw ApiError.notFound('Milestone');
  }

  res.json({
    success: true,
    data: milestone,
  });
});

/**
 * DELETE /api/milestones/:id
 * Delete milestone (Manager+)
 */
exports.deleteMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!milestone) {
    throw ApiError.notFound('Milestone');
  }

  milestone.isDeleted = true;
  milestone.deletedAt = new Date();
  await milestone.save();

  res.json({
    success: true,
    message: 'Milestone deleted successfully',
  });
});
