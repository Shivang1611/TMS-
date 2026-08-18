const { Task, Comment, Project } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/search
 * Full-text search across tasks, projects, comments, and documents
 */
exports.search = asyncHandler(async (req, res) => {
  const { q, type } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 20;
  const orgId = req.user.organization;

  if (!q || q.trim().length === 0) {
    throw ApiError.badRequest('Search query is required');
  }

  const searchTerm = q.trim();
  const results = {};
  let totalCount = 0;

  // Search tasks (full-text index on title + description)
  if (!type || type === 'tasks') {
    const taskFilter = { $text: { $search: searchTerm }, isDeleted: false };
    // Scope to org's projects
    const orgProjects = await Project.find({ organization: orgId }).distinct('_id');
    taskFilter.project = { $in: orgProjects };

    const tasks = await Task.find(taskFilter, { score: { $meta: 'textScore' } })
      .select('title description status priority project assignees dueDate')
      .populate('project', 'name')
      .populate('assignees', 'name email')
      .sort({ score: { $meta: 'textScore' } })
      .limit(pageSize)
      .skip((page - 1) * pageSize);

    results.tasks = tasks;
    totalCount += tasks.length;
  }

  // Search projects (full-text index on name + description)
  if (!type || type === 'projects') {
    const projects = await Project.find(
      { $text: { $search: searchTerm }, organization: orgId, isDeleted: false },
      { score: { $meta: 'textScore' } }
    )
      .select('name description status manager')
      .populate('manager', 'name email')
      .sort({ score: { $meta: 'textScore' } })
      .limit(pageSize);

    results.projects = projects;
    totalCount += projects.length;
  }

  // Search comments (regex on bodyText)
  if (!type || type === 'comments') {
    const comments = await Comment.find({
      bodyText: { $regex: searchTerm, $options: 'i' },
      isDeleted: false,
    })
      .select('bodyText task author')
      .populate('author', 'name email')
      .populate('task', 'title')
      .limit(pageSize);

    results.comments = comments;
    totalCount += comments.length;
  }

  // Search documents (regex on name)
  if (!type || type === 'documents') {
    const Document = require('../models/Document');
    // Scope to org's projects
    const orgProjects = await Project.find({ organization: orgId }).distinct('_id');

    const documents = await Document.find({
      name: { $regex: searchTerm, $options: 'i' },
      isDeleted: false,
      project: { $in: orgProjects },
    })
      .select('name originalName mimeType size project uploader')
      .populate('project', 'name')
      .populate('uploader', 'name')
      .limit(pageSize);

    results.documents = documents;
    totalCount += documents.length;
  }

  res.json({
    success: true,
    data: results,
    meta: {
      query: searchTerm,
      totalResults: totalCount,
      types: type ? [type] : ['tasks', 'projects', 'comments', 'documents'],
    },
  });
});
