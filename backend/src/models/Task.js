const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [300, 'Task title cannot exceed 300 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'],
      default: 'To Do',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      index: true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      index: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    dueDate: {
      type: Date,
    },
    estimatedEffort: {
      type: Number, // in hours
      min: [0, 'Estimated effort cannot be negative'],
    },
    actualEffort: {
      type: Number, // in hours
      min: [0, 'Actual effort cannot be negative'],
    },
    parentTask: {
      // For subtasks: references the parent task
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    allowAssigneeToEdit: {
      type: Boolean,
      default: false,
    },
    blockedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Blocked reason cannot exceed 500 characters'],
      validate: {
        validator: function (v) {
          // Required when status is Blocked
          return this.status !== 'Blocked' || (v && v.length > 0);
        },
        message: 'Blocked reason is required when status is Blocked',
      },
    },
    // Status tracking timestamps
    statusChangedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    reworkNeeded: {
      type: Boolean,
      default: false,
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

// Indexes for filtering, sorting, and search
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, milestone: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ assignee: 1, dueDate: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ parentTask: 1 }); // for retrieving subtasks
taskSchema.index({ title: 'text', description: 'text' }); // full-text search

// Virtual: subtasks of this task
taskSchema.virtual('subtasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'parentTask',
  match: { isDeleted: false },
});

// Virtual: comments on this task
taskSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'task',
  match: { isDeleted: false },
});

// Pre-save hook: enforce status workflow rules (BR-02) and subtask validation (BR-03)
taskSchema.pre('save', async function (next) {
  if (this.isModified('status')) {
    // BR-03: Task cannot be set to Done if it has open (non-Done) subtasks
    if (this.status === 'Done' && !this.isNew) {
      const openSubtasksCount = await mongoose.model('Task').countDocuments({
        parentTask: this._id,
        status: { $ne: 'Done' },
        isDeleted: false,
      });

      if (openSubtasksCount > 0) {
        return next(
          new Error(
            `Cannot set task to Done: ${openSubtasksCount} open subtask(s) remain. Complete or reassign all subtasks first.`
          )
        );
      }
    }

    // Track when status changes
    this.statusChangedAt = new Date();

    if (this.status === 'Done') {
      this.completedAt = new Date();
    } else {
      // Clear completedAt if status changes away from Done
      this.completedAt = undefined;
    }
  }
  next();
});

// Static method: valid status transitions per BR-02
taskSchema.statics.VALID_TRANSITIONS = {
  'To Do': ['In Progress', 'Blocked'],
  'In Progress': ['In Review', 'Blocked', 'To Do'],
  'In Review': ['Done', 'Blocked', 'In Progress'],
  'Done': [], // Terminal state
  'Blocked': ['To Do', 'In Progress'], // Cannot go directly to In Review or Done
};

// Instance method: check if a status transition is valid
taskSchema.methods.canTransitionTo = function (newStatus) {
  const transitions = this.constructor.VALID_TRANSITIONS[this.status];
  return transitions ? transitions.includes(newStatus) : false;
};

module.exports = mongoose.model('Task', taskSchema);
