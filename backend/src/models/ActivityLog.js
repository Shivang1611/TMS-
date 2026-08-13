const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['Task', 'Project', 'Milestone', 'Comment', 'Department', 'Team'],
      required: [true, 'Entity type is required'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      // Examples: 'created', 'status_changed', 'field_updated',
      //           'comment_added', 'file_uploaded', 'assigned'
    },
    field: {
      type: String,
      // Which field changed, e.g., 'status', 'assignee', 'priority', 'title'
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor is required'],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      // Additional context: related entity IDs, change reason, etc.
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for timeline queries
activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ organization: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, organization: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
