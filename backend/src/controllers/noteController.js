const Note = require('../models/Note');
const Task = require('../models/Task');
const { canAccessTask } = require('./taskController');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the permission entry for `userId` in note.sharedWith,
 * or null if the user is not explicitly shared.
 */
function getShareEntry(note, userId) {
  return note.sharedWith.find(
    (s) => s.userId.toString() === userId.toString()
  ) || null;
}

/**
 * Returns true if the requesting user may READ the note.
 * Owner always can. Shared users can too.
 */
function canRead(note, userId) {
  if (note.ownerId.toString() === userId.toString()) return true;
  return !!getShareEntry(note, userId);
}

/**
 * Returns true if the requesting user may WRITE to the note.
 * Owner always can. Editor-permission shared users can too.
 */
function canWrite(note, userId) {
  if (note.ownerId.toString() === userId.toString()) return true;
  const entry = getShareEntry(note, userId);
  return entry?.permission === 'editor';
}

// ─── GET /api/notes ──────────────────────────────────────────────────────────
exports.getMyNotes = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { ownerId: req.user._id };

  if (search) {
    filter.$text = { $search: search };
  }

  const notes = await Note.find(filter).sort({ updatedAt: -1 });
  res.json({ success: true, data: notes });
});

// ─── GET /api/notes/shared-with-me ───────────────────────────────────────────
exports.getSharedNotes = asyncHandler(async (req, res) => {
  // 1. Explicitly shared notes (new mechanism)
  const explicitNotes = await Note.find({ 'sharedWith.userId': req.user._id })
    .populate('ownerId', 'name email avatar')
    .sort({ updatedAt: -1 });

  // 2. Legacy: notes linked to tasks the user can access (old mechanism)
  const taskLinkedNotes = await Note.find({
    ownerId: { $ne: req.user._id },
    linkedTaskId: { $ne: null }
  }).populate('ownerId', 'name email avatar').sort({ updatedAt: -1 });

  const accessibleTaskNotes = [];
  for (const note of taskLinkedNotes) {
    // skip if already in explicit list
    if (explicitNotes.some(n => n._id.toString() === note._id.toString())) continue;
    const task = await Task.findById(note.linkedTaskId);
    if (task && (await canAccessTask(req.user, task))) {
      accessibleTaskNotes.push(note);
    }
  }

  // Merge and annotate with myPermission
  const result = [
    ...explicitNotes.map((note) => {
      const obj = note.toObject();
      const entry = getShareEntry(note, req.user._id);
      obj.myPermission = entry?.permission || 'viewer';
      return obj;
    }),
    ...accessibleTaskNotes.map((note) => {
      const obj = note.toObject();
      obj.myPermission = 'viewer'; // task-linked notes are always viewer
      return obj;
    }),
  ];

  res.json({ success: true, data: result });
});

// ─── GET /api/notes/:id ───────────────────────────────────────────────────────
exports.getNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id).populate('ownerId', 'name email avatar');
  if (!note) throw ApiError.notFound('Note');

  if (!canRead(note, req.user._id)) {
    throw ApiError.forbidden('You do not have access to this note');
  }

  const obj = note.toObject();
  const entry = getShareEntry(note, req.user._id);
  obj.myPermission = note.ownerId._id
    ? note.ownerId._id.toString() === req.user._id.toString()
      ? 'owner'
      : entry?.permission || 'viewer'
    : 'owner';

  res.json({ success: true, data: obj });
});

// ─── POST /api/notes ──────────────────────────────────────────────────────────
exports.createNote = asyncHandler(async (req, res) => {
  const { title, content, contentText, linkedTaskId, pinned } = req.body;

  const note = new Note({
    ownerId: req.user._id,
    title,
    content,
    contentText: contentText || '',
    linkedTaskId: linkedTaskId || null,
    pinned: !!pinned
  });

  await note.save();
  res.status(201).json({ success: true, data: note });
});

// ─── PATCH /api/notes/:id ─────────────────────────────────────────────────────
exports.updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');

  if (!canWrite(note, req.user._id)) {
    throw ApiError.forbidden('You do not have edit permission for this note');
  }

  const { title, content, contentText, pinned } = req.body;
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  if (contentText !== undefined) note.contentText = contentText;
  // Only the owner can change pin state
  if (pinned !== undefined && note.ownerId.toString() === req.user._id.toString()) {
    note.pinned = pinned;
  }

  await note.save();
  res.json({ success: true, data: note });
});

// ─── PATCH /api/notes/:id/link ────────────────────────────────────────────────
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

// ─── POST /api/notes/:id/share ────────────────────────────────────────────────
// Body: { shares: [{ userId, permission }] }
exports.shareNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');

  if (note.ownerId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the owner can share this note');
  }

  const { shares } = req.body; // array of { userId, permission }
  if (!Array.isArray(shares) || shares.length === 0) {
    throw ApiError.badRequest('shares array is required');
  }

  for (const { userId, permission } of shares) {
    if (!userId) continue;
    if (userId.toString() === req.user._id.toString()) continue; // can't share with self

    const existing = note.sharedWith.find(
      (s) => s.userId.toString() === userId.toString()
    );
    if (existing) {
      // Update permission if already shared
      existing.permission = permission || 'viewer';
    } else {
      note.sharedWith.push({ userId, permission: permission || 'viewer' });
    }
  }

  await note.save();
  await note.populate('sharedWith.userId', 'name email avatar');
  res.json({ success: true, data: note });
});

// ─── PATCH /api/notes/:id/share/:userId ──────────────────────────────────────
// Body: { permission: 'viewer' | 'editor' }
exports.updateSharePermission = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');

  if (note.ownerId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the owner can update share permissions');
  }

  const entry = note.sharedWith.find(
    (s) => s.userId.toString() === req.params.userId
  );
  if (!entry) throw ApiError.notFound('Share entry');

  const { permission } = req.body;
  if (!['viewer', 'editor'].includes(permission)) {
    throw ApiError.badRequest('permission must be "viewer" or "editor"');
  }

  entry.permission = permission;
  await note.save();
  await note.populate('sharedWith.userId', 'name email avatar');
  res.json({ success: true, data: note });
});

// ─── DELETE /api/notes/:id/share/:userId ─────────────────────────────────────
exports.unshareNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');

  if (note.ownerId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the owner can remove shared users');
  }

  note.sharedWith = note.sharedWith.filter(
    (s) => s.userId.toString() !== req.params.userId
  );

  await note.save();
  res.json({ success: true, data: note });
});

// ─── POST /api/notes/:id/copy ─────────────────────────────────────────────────
exports.copyNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');

  // Allow copy if: owner, explicitly shared, OR accessible via linked task
  const hasExplicitAccess = canRead(note, req.user._id);
  let hasTaskAccess = false;
  if (!hasExplicitAccess && note.linkedTaskId) {
    const task = await Task.findById(note.linkedTaskId);
    if (task && (await canAccessTask(req.user, task))) {
      hasTaskAccess = true;
    }
  }

  if (!hasExplicitAccess && !hasTaskAccess) {
    throw ApiError.forbidden('You do not have access to this note');
  }

  const copy = new Note({
    ownerId: req.user._id,
    title: `Copy of ${note.title}`,
    content: note.content,
    contentText: note.contentText,
    linkedTaskId: null, // copies are not linked
    pinned: false,
    sharedWith: [] // copies are private by default
  });

  await copy.save();
  res.status(201).json({ success: true, data: copy });
});

// ─── DELETE /api/notes/:id ────────────────────────────────────────────────────
exports.deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw ApiError.notFound('Note');

  if (note.ownerId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Only the owner can delete this note');
  }

  await note.deleteOne();
  res.json({ success: true, data: {} });
});
