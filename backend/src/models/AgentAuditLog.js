const mongoose = require('mongoose');

/**
 * AgentAuditLog — immutable audit trail for every tool call made through the AI agent.
 * Written on every call: success, denied, and error.
 * Never updated or deleted.
 */
const agentAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    toolName: {
      type: String,
      required: true,
      index: true,
    },
    // Raw arguments the LLM supplied (stored as-is for auditability)
    arguments: {
      type: mongoose.Schema.Types.Mixed,
    },
    // 'success' | 'denied' | 'error' | 'pending_confirm' | 'cancelled'
    resultStatus: {
      type: String,
      enum: ['success', 'denied', 'error', 'pending_confirm', 'cancelled'],
      required: true,
      index: true,
    },
    resultSummary: {
      type: String,
      maxlength: 1000,
    },
    // The raw user message that triggered this tool call
    originalMessage: {
      type: String,
      maxlength: 2000,
    },
    userRole: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // immutable
  }
);

agentAuditLogSchema.index({ organizationId: 1, createdAt: -1 });
agentAuditLogSchema.index({ userId: 1, createdAt: -1 });
agentAuditLogSchema.index({ resultStatus: 1, createdAt: -1 });

// Prevent modification of audit log entries
agentAuditLogSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('Agent audit log entries are immutable'));
});
agentAuditLogSchema.pre('updateOne', function (next) {
  next(new Error('Agent audit log entries are immutable'));
});

module.exports = mongoose.model('AgentAuditLog', agentAuditLogSchema);
