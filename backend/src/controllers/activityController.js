const { ActivityLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/activities
 * Get activity timeline (filterable by entity type and ID)
 */
exports.getActivities = asyncHandler(async (req, res) => {
  const filter = {};
  const {
    entityType, entityId, action,
    page = 1, pageSize = 50,
  } = req.query;

  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (action) filter.action = action;

  // Scope to user's organization
  filter.organization = req.user.organization;

  // Role-based scoping (PRD: non-admin roles see only own scope)
  if (req.user.role === 'Manager' && req.user.department) {
    // Manager sees activities for their department's entities
    const deptProjects = await require('../models/Project').find({
      department: req.user.department,
      isDeleted: false,
    }).distinct('_id');
    if (entityType === 'Task' || entityType === 'Milestone') {
      filter.$or = [
        filter.$or,
        { entityId: { $in: deptProjects } },
      ];
    }
  } else if (req.user.role === 'Team Lead') {
    // Scope to user's own tasks and team activities
    // This is a simplified scope — full implementation needs actor matching
    filter.actor = req.user._id;
  } else if (req.user.role === 'Employee') {
    filter.actor = req.user._id;
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
  const limit = parseInt(pageSize, 10);

  const [activities, totalCount] = await Promise.all([
    ActivityLog.find(filter)
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: activities,
    pagination: {
      page: parseInt(page, 10),
      pageSize: limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
});
