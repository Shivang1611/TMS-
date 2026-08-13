const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  contentText: {
    type: String,
    default: ''
  },
  linkedTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  pinned: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes for querying
noteSchema.index({ ownerId: 1, updatedAt: -1 });
noteSchema.index({ linkedTaskId: 1 });

// Text index for search
noteSchema.index(
  { title: 'text', contentText: 'text' },
  { weights: { title: 5, contentText: 1 } }
);

module.exports = mongoose.model('Note', noteSchema);
