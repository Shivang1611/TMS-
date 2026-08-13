const { Department, Team } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditLogService = require('../services/auditLogService');

/**
 * POST /api/departments
 * Create a new department (Admin+)
 */
exports.createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create({
    ...req.body,
    organization: req.user.organization,
  });

  await auditLogService.logAction({
    actionType: 'department_created',
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'Department',
    targetId: department._id,
    details: { name: department.name },
    req,
  });

  res.status(201).json({
    success: true,
    data: department,
  });
});

/**
 * GET /api/departments
 * List departments in the user's organization
 */
exports.listDepartments = asyncHandler(async (req, res) => {
  const filter = {
    organization: req.user.organization,
    isDeleted: false,
  };

  const departments = await Department.find(filter)
    .populate('head', 'name email role')
    .populate({
      path: 'teams',
      match: { isDeleted: false },
      populate: [
        { path: 'teamLeads', select: 'name email role profile.jobTitle' },
        { path: 'members', select: 'name email role profile.jobTitle' },
      ],
    })
    .sort({ name: 1 });

  res.json({
    success: true,
    data: departments,
  });
});

/**
 * GET /api/departments/:id
 * Get department details
 */
exports.getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  }).populate('head', 'name email');

  if (!department) {
    throw ApiError.notFound('Department');
  }

  res.json({
    success: true,
    data: department,
  });
});

/**
 * PATCH /api/departments/:id
 * Update department (Admin+)
 */
exports.updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findOneAndUpdate(
    {
      _id: req.params.id,
      organization: req.user.organization,
      isDeleted: false,
    },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!department) {
    throw ApiError.notFound('Department');
  }

  res.json({
    success: true,
    data: department,
  });
});

/**
 * DELETE /api/departments/:id
 * Delete department (Admin+, BR-11 enforced)
 */
exports.deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!department) {
    throw ApiError.notFound('Department');
  }

  // BR-11: Cannot delete department with active teams
  const teamCount = await Team.countDocuments({
    department: department._id,
    isDeleted: false,
  });

  if (teamCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete department: it still contains ${teamCount} team(s). Remove or reassign all teams first.`
    );
  }

  // 4) Soft-delete the department
  department.isDeleted = true;
  department.deletedAt = new Date();
  await department.save();

  await auditLogService.logAction({
    actionType: 'department_deleted',
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'Department',
    targetId: department._id,
    details: { name: department.name },
    req,
  });

  res.json({
    success: true,
    message: 'Department deleted successfully',
  });
});
