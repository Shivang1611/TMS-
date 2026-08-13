const { Team, User, Department } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditLogService = require('../services/auditLogService');

/**
 * POST /api/teams
 * Create a new team (Admin+)
 */
exports.createTeam = asyncHandler(async (req, res) => {
  const { departmentId, ...teamData } = req.body;

  // Verify department exists in the org
  const department = await Department.findOne({
    _id: departmentId,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!department) {
    throw ApiError.notFound('Department');
  }

  const team = await Team.create({
    ...teamData,
    department: departmentId,
  });

  if (teamData.teamLeads && Array.isArray(teamData.teamLeads) && teamData.teamLeads.length > 0) {
    await User.updateMany(
      { _id: { $in: teamData.teamLeads }, organization: req.user.organization },
      { $addToSet: { teams: team._id } }
    );
  }

  const populatedTeam = await Team.findById(team._id)
    .populate('department', 'name')
    .populate('teamLeads', 'name email role');

  await auditLogService.logAction({
    actionType: 'team_created',
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'Team',
    targetId: team._id,
    details: { name: team.name },
    req,
  });

  res.status(201).json({
    success: true,
    data: populatedTeam,
  });
});

/**
 * GET /api/teams
 * List teams (filterable by department)
 */
exports.listTeams = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  const { departmentId } = req.query;

  if (departmentId) {
    filter.department = departmentId;
  }

  const teams = await Team.find(filter)
    .populate('department', 'name')
    .populate('teamLeads', 'name email role')
    .populate('members', 'name email role profile')
    .sort({ name: 1 });

  res.json({
    success: true,
    data: teams,
  });
});

/**
 * GET /api/teams/:id
 * Get team details
 */
exports.getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('department', 'name')
    .populate('teamLeads', 'name email');

  if (!team) {
    throw ApiError.notFound('Team');
  }

  // Get team members
  const members = await User.find({
    teams: team._id,
    isDeleted: false,
    isActive: true,
  }).select('name email role profile.jobTitle');

  res.json({
    success: true,
    data: {
      ...team.toJSON(),
      members,
    },
  });
});

/**
 * PATCH /api/teams/:id
 * Update team (Admin+)
 */
exports.updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!team) {
    throw ApiError.notFound('Team');
  }

  res.json({
    success: true,
    data: team,
  });
});

/**
 * DELETE /api/teams/:id
 * Delete team (Admin+)
 */
exports.deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!team) {
    throw ApiError.notFound('Team');
  }

  team.isDeleted = true;
  team.deletedAt = new Date();
  await team.save();

  await auditLogService.logAction({
    actionType: 'team_deleted',
    actorId: req.user._id,
    organizationId: req.user.organization,
    targetType: 'Team',
    targetId: team._id,
    details: { name: team.name },
    req,
  });

  res.json({
    success: true,
    message: 'Team deleted successfully',
  });
});

/**
 * POST /api/teams/:id/members
 * Add members to team
 */
exports.addMembers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  const team = await Team.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!team) {
    throw ApiError.notFound('Team');
  }

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw ApiError.badRequest('Please provide userIds array');
  }

  // Verify users exist
  const users = await User.find({
    _id: { $in: userIds },
    isDeleted: false,
  });

  if (users.length === 0) {
    throw ApiError.badRequest('No valid active users found for specified IDs');
  }

  // Add team to each user's teams array (if not already present)
  for (const user of users) {
    if (!user.teams.some((t) => t.toString() === team._id.toString())) {
      user.teams.push(team._id);
      await user.save();
    }
  }

  res.json({
    success: true,
    message: `${users.length} member(s) added to team`,
    data: { teamId: team._id, addedCount: users.length },
  });
});

/**
 * DELETE /api/teams/:id/members/:userId
 * Remove member from team
 */
exports.removeMember = asyncHandler(async (req, res) => {
  const { id: teamId, userId } = req.params;

  const team = await Team.findOne({
    _id: teamId,
    isDeleted: false,
  });

  if (!team) {
    throw ApiError.notFound('Team');
  }

  const user = await User.findOne({
    _id: userId,
    organization: req.user.organization,
    isDeleted: false,
  });

  if (!user) {
    throw ApiError.notFound('User');
  }

  // Remove team from user's teams array
  user.teams = user.teams.filter((t) => t.toString() !== teamId);
  await user.save();

  res.json({
    success: true,
    message: 'Member removed from team',
  });
});
