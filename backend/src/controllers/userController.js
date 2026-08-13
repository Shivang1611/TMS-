const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const scoreService = require('../services/scoreService');
const auditLogService = require('../services/auditLogService');

/**
 * POST /api/users/invite
 * Invite a new employee to the organization (Admin+)
 */
exports.inviteUser = asyncHandler(async (req, res) => {
  const { email, name, role, password, departmentId, teamIds } = req.body;

  const normalizedEmail = email?.trim().toLowerCase();
  const trimmedPassword = password?.trim();

  if (!normalizedEmail || !trimmedPassword) {
    throw ApiError.badRequest('Email and password are required');
  }

  // Check if user already exists in this org
  const existingUser = await User.findOne({
    email: normalizedEmail,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (existingUser) {
    throw ApiError.conflict('A user with this email already exists in the organization');
  }

  const user = await User.create({
    email: normalizedEmail,
    password: trimmedPassword,
    name: name?.trim(),
    role,
    organization: req.user.organization,
    department: departmentId || undefined,
    teams: teamIds || [],
  });

  await auditLogService.logAction({
    actionType: 'user_invited',
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'User',
    targetId: user._id,
    details: { email: user.email, role: user.role },
    req,
  });

  // TODO: Send invitation email

  res.status(201).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.organization,
      department: user.department,
      teams: user.teams,
    },
    message: 'User created successfully.',
  });
});

/**
 * POST /api/users/bulk-invite
 * Invite multiple employees at once (Admin+)
 */
exports.bulkInvite = asyncHandler(async (req, res) => {
  const { emails, role, password, departmentId, teamIds } = req.body;

  const results = {
    created: 0,
    failed: 0,
    errors: [],
    users: [],
  };

  for (const email of emails) {
    const normalizedEmail = email.toLowerCase().trim();

    // Derive a display name from the email prefix
    const derivedName = normalizedEmail
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    try {
      // Check if user already exists in this org
      const existingUser = await User.findOne({
        email: normalizedEmail,
        organization: req.user.organization,
        isDeleted: false,
      });

      if (existingUser) {
        results.failed++;
        results.errors.push({ email, reason: 'Already exists in the organization' });
        continue;
      }

      const user = await User.create({
        email: normalizedEmail,
        password: password?.trim(),
        name: derivedName,
        role,
        organization: req.user.organization,
        department: departmentId || undefined,
        teams: teamIds || [],
      });

      results.created++;
      results.users.push({
        id: user._id,
        email: user.email,
        name: user.name,
      });

      await auditLogService.logAction({
        actionType: 'user_invited',
        actorId: req.user._id,
        organizationId: req.user.organization,
        targetType: 'User',
        targetId: user._id,
        details: { email: user.email, role: user.role },
        req,
      });
    } catch (err) {
      results.failed++;
      results.errors.push({ email, reason: err.message || 'Unexpected error' });
    }
  }

  res.status(results.created > 0 ? 201 : 200).json({
    success: true,
    data: results,
    message: `${results.created} user(s) created, ${results.failed} failed.`,
  });
});

/**
 * GET /api/users
 * List users in the organization (filterable)
 */
exports.listUsers = asyncHandler(async (req, res) => {
  const filter = {
    organization: req.user.organization,
    isDeleted: false,
  };

  // Apply optional filters
  const { role, departmentId, isActive, search } = req.query;
  if (role) filter.role = role;
  if (departmentId) filter.department = departmentId;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .select('-password')
    .populate('department', 'name')
    .populate('teams', 'name')
    .sort({ name: 1 });

  res.json({
    success: true,
    data: users,
  });
});

/**
 * GET /api/users/:id
 * Get user details
 */
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  })
    .select('-password')
    .populate('department', 'name')
    .populate('teams', 'name');

  if (!user) {
    throw ApiError.notFound('User');
  }

  res.json({
    success: true,
    data: user,
  });
});

/**
 * GET /api/users/:id/score
 * Get user score and tier details
 */
exports.getUserScore = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  }).select('score tier');

  if (!user) {
    throw ApiError.notFound('User');
  }

  const currentTierConfig = scoreService.getTier(user.score);
  
  // Find next tier if one exists
  const sortedTiers = [...scoreService.tierConfig].sort((a, b) => a.min - b.min);
  const nextTierIndex = sortedTiers.findIndex(t => t.name === currentTierConfig.name) + 1;
  const nextTier = nextTierIndex < sortedTiers.length ? {
    name: sortedTiers[nextTierIndex].name,
    pointsNeeded: sortedTiers[nextTierIndex].min - user.score
  } : null;

  res.json({
    success: true,
    data: {
      score: user.score,
      tier: user.tier,
      color: currentTierConfig.color,
      nextTier,
    }
  });
});

/**
 * PATCH /api/users/:id
 * Update user details (Admin+)
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const { role, departmentId } = req.body;
  const targetUser = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!targetUser) {
    throw ApiError.notFound('User');
  }

  if (role) {
    // Cannot change the Founder's role
    if (targetUser.role === 'Founder' && role !== 'Founder') {
      throw ApiError.badRequest('Cannot change the role of the organization Founder');
    }
    targetUser.role = role;
  }
  
  if (departmentId !== undefined) {
    targetUser.department = departmentId || undefined;
  }

  await targetUser.save();

  await auditLogService.logAction({
    actionType: 'role_changed',
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'User',
    targetId: targetUser._id,
    details: { newRole: targetUser.role, newDepartment: targetUser.department },
    req,
  });

  res.json({
    success: true,
    data: targetUser,
  });
});

/**
 * PATCH /api/users/:id/deactivate
 * Deactivate user (Admin+, BR-07)
 */
exports.deactivateUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!targetUser) {
    throw ApiError.notFound('User');
  }

  if (targetUser.role === 'Founder') {
    throw ApiError.badRequest('Cannot deactivate the organization Founder');
  }

  if (!targetUser.isActive) {
    throw ApiError.badRequest('User is already deactivated');
  }

  targetUser.isActive = false;
  await targetUser.save();

  await auditLogService.logAction({
    actionType: 'user_deactivated',
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'User',
    targetId: targetUser._id,
    details: { email: targetUser.email },
    req,
  });

  res.json({
    success: true,
    message: 'User deactivated. They will lose access immediately.',
  });
});

/**
 * PATCH /api/users/:id/reset-password
 * Reset a user's password (Admin+)
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const targetUser = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  }).select('+password');

  if (!targetUser) {
    throw ApiError.notFound('User');
  }

  if (targetUser.role === 'Founder') {
    throw ApiError.badRequest('Cannot reset the password of the organization Founder');
  }

  targetUser.password = newPassword;
  targetUser.passwordChangedAt = new Date();
  await targetUser.save();

  await auditLogService.logAction({
    actionType: 'permission_changed', // Closest match to password reset for now, or just leave details out
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'User',
    targetId: targetUser._id,
    details: { action: 'password_reset' },
    req,
  });

  res.json({
    success: true,
    message: 'Password reset successfully. The user can log in with the new password.',
  });
});

/**
 * DELETE /api/users/:id
 * Soft-delete a user (Admin+). Sets isDeleted and deactivates immediately.
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!targetUser) {
    throw ApiError.notFound('User');
  }

  if (targetUser.role === 'Founder') {
    throw ApiError.badRequest('Cannot delete the organization Founder');
  }

  targetUser.isDeleted = true;
  targetUser.deletedAt = new Date();
  targetUser.isActive = false;
  targetUser.email = `${targetUser.email}.deleted.${Date.now()}`; // Free up the email for re-use
  await targetUser.save();

  res.json({
    success: true,
    message: 'User deleted successfully.',
  });
});

/**
 * PATCH /api/users/:id/reactivate
 * Reactivate user (Admin+)
 */
exports.reactivateUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!targetUser) {
    throw ApiError.notFound('User');
  }

  if (targetUser.isActive) {
    throw ApiError.badRequest('User is already active');
  }

  targetUser.isActive = true;
  await targetUser.save();

  await auditLogService.logAction({
    actionType: 'user_reactivated',
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'User',
    targetId: targetUser._id,
    details: { email: targetUser.email },
    req,
  });

  res.json({
    success: true,
    message: 'User reactivated successfully.',
  });
});
