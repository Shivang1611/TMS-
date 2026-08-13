const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: [
        'role_changed',
        'user_invited',
        'user_deactivated',
        'user_reactivated',
        'permission_changed',
        'org_settings_changed',
        'department_created',
        'department_deleted',
        'team_created',
        'team_deleted',
        'ownership_transferred',
      ],
      required: [true, 'Action type is required'],
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor is required'],
      index: true,
    },
    targetType: {
      type: String,
      enum: ['User', 'Department', 'Team', 'Organization'],
      required: [true, 'Target type is required'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      // JSON with action-specific details:
      // e.g., { fromRole: 'Manager', toRole: 'Admin' } for role_changed
      // e.g., { email: 'newuser@example.com', role: 'Employee' } for user_invited
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable — no updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for audit log queries
auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ actionType: 1, organization: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

// Ensure immutability: prevent updates to audit log entries
auditLogSchema.pre('findOneAndUpdate', function (next) {
  const error = new Error('Audit log entries cannot be modified');
  error.statusCode = 403;
  next(error);
});

auditLogSchema.pre('updateOne', function (next) {
  const error = new Error('Audit log entries cannot be modified');
  error.statusCode = 403;
  next(error);
});

auditLogSchema.pre('deleteOne', function (next) {
  const error = new Error('Audit log entries cannot be deleted');
  error.statusCode = 403;
  next(error);
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
