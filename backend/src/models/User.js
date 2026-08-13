const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: false, // uniqueness is per-organization via compound index
      trim: true,
      lowercase: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // don't include password in queries by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    score: {
      type: Number,
      default: 0,
    },
    tier: {
      type: String,
      default: 'Beginner',
    },
    role: {
      type: String,
      enum: {
        values: ['Founder', 'Admin', 'Manager', 'Team Lead', 'Employee'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
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
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    profile: {
      jobTitle: {
        type: String,
        trim: true,
        maxlength: [100, 'Job title cannot exceed 100 characters'],
      },
      phone: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String, // URL to uploaded avatar
      },
    },
    notificationPreferences: {
      email: {
        taskAssigned: { type: Boolean, default: true },
        mention: { type: Boolean, default: true },
        statusChanged: { type: Boolean, default: true },
        commentReply: { type: Boolean, default: true },
        milestoneApproaching: { type: Boolean, default: true },
        taskOverdue: { type: Boolean, default: true },
      },
      inApp: {
        taskAssigned: { type: Boolean, default: true },
        mention: { type: Boolean, default: true },
        statusChanged: { type: Boolean, default: true },
        commentReply: { type: Boolean, default: true },
        milestoneApproaching: { type: Boolean, default: true },
        taskOverdue: { type: Boolean, default: true },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
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

// Compound unique index: email must be unique within an organization
userSchema.index({ email: 1, organization: 1 }, { unique: true });
userSchema.index({ organization: 1, role: 1 });
userSchema.index({ organization: 1, department: 1 });
userSchema.index({ organization: 1, isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual: tasks assigned to this user
userSchema.virtual('assignedTasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'assignee',
  match: { isDeleted: false },
});

module.exports = mongoose.model('User', userSchema);
