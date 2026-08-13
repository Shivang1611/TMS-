const { AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/audit-logs
 * List audit log entries (Admin+, filterable)
 */
exports.listAuditLogs = asyncHandler(async (req, res) => {
  const filter = { organization: req.user.organization };
  const {
    actionType, actorId, targetType,
    dateFrom, dateTo,
    page = 1, pageSize = 50,
  } = req.query;

  if (actionType) filter.actionType = actionType;
  if (actorId) filter.actor = actorId;
  if (targetType) filter.targetType = targetType;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
  const limit = parseInt(pageSize, 10);

  const [logs, totalCount] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: parseInt(page, 10),
      pageSize: limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
});

/**
 * GET /api/audit-logs/export
 * Export audit logs as CSV
 */
exports.exportAuditLogs = asyncHandler(async (req, res) => {
  const filter = { organization: req.user.organization };
  const { actionType, actorId, targetType, dateFrom, dateTo } = req.query;

  if (actionType) filter.actionType = actionType;
  if (actorId) filter.actor = actorId;
  if (targetType) filter.targetType = targetType;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const logs = await AuditLog.find(filter)
    .populate('actor', 'name email')
    .sort({ createdAt: -1 });

  // Generate CSV
  const header = 'Date,Action Type,Actor Name,Actor Email,Target Type,Target ID,Details,IP Address\n';
  const rows = logs.map((log) => {
    const date = log.createdAt ? log.createdAt.toISOString() : '';
    const actorName = log.actor ? `"${log.actor.name}"` : '';
    const actorEmail = log.actor ? log.actor.email : '';
    const details = log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : '';
    return `${date},${log.actionType},${actorName},${actorEmail},${log.targetType},${log.targetId},${details},${log.ip || ''}`;
  }).join('\n');

  const csv = header + rows;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=audit-log-${Date.now()}.csv`);
  res.send(csv);
});
