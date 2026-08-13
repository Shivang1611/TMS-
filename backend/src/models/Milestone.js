const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Milestone name is required'],
      trim: true,
      maxlength: [200, 'Milestone name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      index: true,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Pending',
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
milestoneSchema.index({ project: 1, status: 1 });
milestoneSchema.index({ dueDate: 1 });

// Virtual: tasks in this milestone
milestoneSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'milestone',
  match: { isDeleted: false },
});

module.exports = mongoose.model('Milestone', milestoneSchema);
