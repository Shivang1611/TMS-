const mongoose = require('mongoose');

const sharedWithSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permission: {
    type: String,
    enum: ['viewer', 'editor'],
    default: 'viewer'
  }
}, { _id: false });

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
  },
  // Explicit sharing: owner decides who can view or edit
  sharedWith: {
    type: [sharedWithSchema],
    default: []
  }
}, { timestamps: true });

// Indexes for querying
noteSchema.index({ ownerId: 1, updatedAt: -1 });
noteSchema.index({ linkedTaskId: 1 });
noteSchema.index({ 'sharedWith.userId': 1 }); // fast shared-with-me lookup

// Text index for search
noteSchema.index(
  { title: 'text', contentText: 'text' },
  { weights: { title: 5, contentText: 1 } }
);

module.exports = mongoose.model('Note', noteSchema);
