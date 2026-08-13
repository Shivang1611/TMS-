const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      max: [25 * 1024 * 1024, 'File size exceeds the 25MB limit'], // 25MB
    },
    url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
      // Optional: document can be at project or task level
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
    },
    scanStatus: {
      type: String,
      enum: ['Pending', 'Scanning', 'Clean', 'Infected', 'Error'],
      default: 'Pending',
    },
    scanResult: {
      type: String, // Details from virus scanner
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

// Pre-validate: ensure document is attached to at least a project or a task (prevent orphan documents)
documentSchema.pre('validate', function (next) {
  if (!this.project && !this.task) {
    this.invalidate(
      'project',
      'Document must be attached to either a project or a task'
    );
  }
  next();
});

// Indexes
documentSchema.index({ project: 1, createdAt: -1 });
documentSchema.index({ task: 1, createdAt: -1 });
documentSchema.index({ uploader: 1 });
documentSchema.index({ scanStatus: 1 });

// Virtual: download URL (could add signed URL logic later)
documentSchema.virtual('downloadUrl').get(function () {
  return this.url;
});

module.exports = mongoose.model('Document', documentSchema);
