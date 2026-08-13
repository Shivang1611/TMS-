const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: [true, 'Comment body is required'],
      // Rich text (HTML) content
    },
    bodyText: {
      type: String, // Plain text version for search indexing
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task is required'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    parentComment: {
      // For threaded replies
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    editedAt: {
      type: Date,
    },
    editHistory: [
      {
        body: { type: String },
        bodyText: { type: String },
        editedAt: { type: Date, default: Date.now },
      },
    ],
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
commentSchema.index({ task: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ bodyText: 'text' }); // full-text search

// Virtual: replies to this comment (threaded)
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
  match: { isDeleted: false },
});

// Pre-save: extract @mentions from body
commentSchema.pre('save', function (next) {
  if (this.isModified('body') && !this.isNew) {
    // Track edit history
    this.editHistory.push({
      body: this.body,
      bodyText: this.bodyText,
      editedAt: new Date(),
    });
    this.editedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Comment', commentSchema);
