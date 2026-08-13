const Note = require('../models/Note');
const Task = require('../models/Task');
const { canAccessTask } = require('./taskController');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/notes
exports.getMyNotes = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { ownerId: req.user._id };
  
  if (search) {
    filter.$text = { $search: search };
  }

  const notes = await Note.find(filter).sort({ updatedAt: -1 });
  res.json({ success: true, data: notes });
});

// GET /api/notes/shared-with-me
exports.getSharedNotes = asyncHandler(async (req, res) => {
  // First get all notes not owned by user but with a linked task
  const notes = await Note.find({
    ownerId: { $ne: req.user._id },
    linkedTaskId: { $ne: null }
  }).populate('ownerId', 'name email').sort({ updatedAt: -1 });

  // Check access for each task (could be optimized with a complex aggregation, 
  // but this is fine for typical volumes as canAccessTask is mostly fast DB lookups)
  const accessibleNotes = [];
  for (const note of notes) {
    const task = await Task.findById(note.linkedTaskId);
    if (task && await canAccessTask(req.user, task)) {
      accessibleNotes.push(note);
    }
  }

  res.json({ success: true, data: accessibleNotes });
});

// GET /api/notes/:id
exports.getNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');

  // Owner always has access
  if (note.ownerId.toString() === req.user._id.toString()) {
    return res.json({ success: true, data: note });
  }

  // Others need linked task access
  if (!note.linkedTaskId) {
    throw ApiError.forbidden('You do not have access to this note');
  }

  const task = await Task.findById(note.linkedTaskId);
  if (!task || !(await canAccessTask(req.user, task))) {
    throw ApiError.forbidden('You do not have access to this note');
  }

  res.json({ success: true, data: note });
});

// POST /api/notes
exports.createNote = asyncHandler(async (req, res) => {
  const { title, content, contentText, linkedTaskId, pinned } = req.body;
  
  const note = new Note({
    ownerId: req.user._id,
    title,
    content,
    contentText: contentText || '', // should be passed or extracted
    linkedTaskId: linkedTaskId || null,
    pinned: !!pinned
  });

  await note.save();
  res.status(201).json({ success: true, data: note });
});

// PATCH /api/notes/:id
exports.updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');
  
  if (note.ownerId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the owner can update this note');
  }

  const { title, content, contentText, pinned } = req.body;
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  if (contentText !== undefined) note.contentText = contentText;
  if (pinned !== undefined) note.pinned = pinned;

  await note.save();
  res.json({ success: true, data: note });
});

// PATCH /api/notes/:id/link
exports.linkNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');
  
  if (note.ownerId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the owner can link this note');
  }

  const { taskId } = req.body;
  if (taskId) {
    const task = await Task.findById(taskId);
    if (!task) throw ApiError.notFound('Task');
    note.linkedTaskId = taskId;
  } else {
    note.linkedTaskId = null;
  }

  await note.save();
  res.json({ success: true, data: note });
});

// DELETE /api/notes/:id
exports.deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');
  
  if (note.ownerId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the owner can delete this note');
  }

  await note.deleteOne();
  res.json({ success: true, data: {} });
});
