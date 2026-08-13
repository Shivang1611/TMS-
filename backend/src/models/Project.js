const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
      // Optional — cross-department projects are allowed
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project manager is required'],
      index: true,
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          // If startDate exists, endDate must be after it
          return !this.startDate || !value || value >= this.startDate;
        },
        message: 'End date must be on or after start date',
      },
    },
    visibilitySettings: {
      hideMilestones: { type: Boolean, default: false },
      hideTaskStats: { type: Boolean, default: false },
      hideTeamMembers: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['Active', 'On Hold', 'Completed', 'Cancelled'],
      default: 'Active',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
projectSchema.index({ organization: 1, status: 1 });
projectSchema.index({ manager: 1, status: 1 });
projectSchema.index({ name: 'text', description: 'text' }); // full-text search

// Virtual: milestones in this project
projectSchema.virtual('milestones', {
  ref: 'Milestone',
  localField: '_id',
  foreignField: 'project',
  match: { isDeleted: false },
});

// Virtual: tasks in this project
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  match: { isDeleted: false },
});

module.exports = mongoose.model('Project', projectSchema);
