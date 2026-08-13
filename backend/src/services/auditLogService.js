const { AuditLog } = require('../models');

/**
 * Creates an entry in the Audit Log.
 * 
 * @param {Object} params
 * @param {string} params.actionType - Type of action from AuditLog enum (e.g., 'user_invited', 'role_changed')
 * @param {string|mongoose.Types.ObjectId} params.actorId - ID of the user performing the action
 * @param {string|mongoose.Types.ObjectId} params.organizationId - ID of the organization
 * @param {string} params.targetType - 'User', 'Department', 'Team', 'Organization'
 * @param {string|mongoose.Types.ObjectId} [params.targetId] - ID of the entity being acted upon
 * @param {Object} [params.details] - Additional JSON metadata (e.g., { email: 'test@test.com' })
 * @param {Object} [req] - Express request object for IP and UserAgent (optional)
 * @returns {Promise<Object>} The created audit log document
 */
const logAction = async ({
  actionType,
  actorId,
  organizationId,
  targetType,
  targetId,
  details = {},
  req = null,
}) => {
  try {
    const logData = {
      actionType,
      actor: actorId,
      organization: organizationId,
      targetType,
      targetId,
      details,
    };

    if (req) {
      logData.ip = req.ip || req.connection?.remoteAddress;
      logData.userAgent = req.get ? req.get('user-agent') : undefined;
    }

    const auditLog = await AuditLog.create(logData);
    return auditLog;
  } catch (error) {
    // We typically don't want audit logging failures to crash the main request
    console.error('Failed to create audit log:', error);
  }
};

module.exports = {
  logAction,
};
