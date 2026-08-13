const { Comment, Task } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitCommentCreated } = require('../services/socket');
const { notifyMentions } = require('../services/notificationService');

/**
 * POST /api/comments
 * Create a comment on a task
 */
exports.createComment = asyncHandler(async (req, res) => {
  const { body, parentCommentId, mentions } = req.body;
  const { taskId } = req.query;

  if (!taskId) {
    throw ApiError.badRequest('taskId query parameter is required');
  }

  // Verify task exists
  const task = await Task.findOne({
    _id: taskId,
    isDeleted: false,
  });

  if (!task) {
    throw ApiError.notFound('Task');
  }

  // If reply, verify parent comment exists and belongs to same task
  if (parentCommentId) {
    const parentComment = await Comment.findOne({
      _id: parentCommentId,
      task: taskId,
      isDeleted: false,
    });
    if (!parentComment) {
      throw ApiError.notFound('Parent comment');
    }
  }

  const comment = await Comment.create({
    body,
    bodyText: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text search
    task: taskId,
    author: req.user._id,
    parentComment: parentCommentId || undefined,
    mentions: mentions || [],
  });

  const populated = await Comment.findById(comment._id)
    .populate('author', 'name email');

  // Emit real-time event so other users see the comment immediately
  emitCommentCreated(populated);

  // Notify mentioned users
  if (mentions && mentions.length > 0) {
    notifyMentions({
      comment,
      taskId,
      taskTitle: task.title,
      actorId: req.user._id,
      actorName: req.user.name,
      mentionedUserIds: mentions,
    });
  }

  res.status(201).json({
    success: true,
    data: populated,
  });
});

/**
 * GET /api/comments
 * List comments (filterable by task)
 */
exports.listComments = asyncHandler(async (req, res) => {
  const { taskId, parentCommentId } = req.query;

  if (!taskId) {
    throw ApiError.badRequest('taskId query parameter is required');
  }

  const filter = {
    task: taskId,
    isDeleted: false,
    parentComment: parentCommentId || null,
  };

  const comments = await Comment.find(filter)
    .populate('author', 'name email')
    .populate('mentions', 'name email')
    .sort({ createdAt: 1 });

  // For each top-level comment, get reply count
  const commentsWithReplies = await Promise.all(
    comments.map(async (comment) => {
      const replyCount = await Comment.countDocuments({
        parentComment: comment._id,
        isDeleted: false,
      });
      return {
        ...comment.toJSON(),
        replyCount,
      };
    })
  );

  res.json({
    success: true,
    data: commentsWithReplies,
  });
});

/**
 * PATCH /api/comments/:id
 * Update own comment
 */
exports.updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!comment) {
    throw ApiError.notFound('Comment');
  }

  // Only the author can edit their comment
  if (comment.author.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only edit your own comments');
  }

  comment.body = req.body.body;
  if (req.body.mentions) {
    comment.mentions = req.body.mentions;
  }
  await comment.save();

  const populated = await Comment.findById(comment._id)
    .populate('author', 'name email');

  res.json({
    success: true,
    data: populated,
  });
});

/**
 * DELETE /api/comments/:id
 * Delete comment (own or Admin)
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!comment) {
    throw ApiError.notFound('Comment');
  }

  // Author can delete own comment; Admin/Founder can delete any
  const isAuthor = comment.author.toString() === req.user._id.toString();
  const isAdminOrFounder = ['Founder', 'Admin'].includes(req.user.role);

  if (!isAuthor && !isAdminOrFounder) {
    throw ApiError.forbidden('Insufficient permissions to delete this comment');
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  // Also soft-delete all replies
  await Comment.updateMany(
    { parentComment: comment._id },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  res.json({
    success: true,
    message: 'Comment deleted successfully',
  });
});
