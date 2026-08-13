const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [200, 'Organization name cannot exceed 200 characters'],
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true, // allows multiple null values
      maxlength: [100, 'Domain cannot exceed 100 characters'],
    },
    logo: {
      type: String, // URL to uploaded logo
    },
    settings: {
      defaultRole: {
        type: String,
        enum: ['Employee', 'Team Lead', 'Manager'],
        default: 'Employee',
      },
      retentionDays: {
        type: Number,
        default: 90,
        min: [30, 'Retention period must be at least 30 days'],
        max: [365, 'Retention period cannot exceed 365 days'],
      },
      auditLogRetentionYears: {
        type: Number,
        default: 1,
        min: 1,
        max: 7,
      },
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

// Index for soft-delete queries
organizationSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
