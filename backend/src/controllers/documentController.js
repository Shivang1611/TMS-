const { Document } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const s3 = require('../utils/s3');

/**
 * POST /api/documents/upload
 * Upload a file to a project or task
 */
exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const { projectId, taskId } = req.body;

  // Upload to Vultr S3
  const { key, url } = await s3.uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'documents');

  const document = await Document.create({
    name: req.file.originalname,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: url, // Store full S3 URL instead of key
    project: projectId || undefined,
    task: taskId || undefined,
    uploader: req.user._id,
    scanStatus: 'Pending',
  });

  // TODO: Trigger async virus scanning (queue job)

  res.status(201).json({
    success: true,
    data: document,
    message: 'File uploaded. Virus scan pending.',
  });
});

/**
 * GET /api/documents
 * List documents (filterable by project/task)
 */
exports.listDocuments = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  const { projectId, taskId } = req.query;

  if (projectId) filter.project = projectId;
  if (taskId) filter.task = taskId;

  const documents = await Document.find(filter)
    .populate('uploader', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: documents,
  });
});

/**
 * GET /api/documents/:id
 * Get document metadata
 */
exports.getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate('uploader', 'name email');

  if (!document) {
    throw ApiError.notFound('Document');
  }

  res.json({
    success: true,
    data: document,
  });
});

/**
 * GET /api/documents/:id/download
 * Download a file
 */
exports.downloadDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    throw ApiError.notFound('Document');
  }

  // Generate a pre-signed URL for secure downloading
  const signedUrl = await s3.getS3SignedUrl(document.url);

  res.json({
    success: true,
    data: {
      url: signedUrl,
      name: document.originalName,
      mimeType: document.mimeType,
    },
  });
});

/**
 * DELETE /api/documents/:id
 * Delete a document (role-scoped)
 */
exports.deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    throw ApiError.notFound('Document');
  }

  // Permission check
  const isOwner = document.uploader.toString() === req.user._id.toString();
  const isAdminOrFounder = ['Founder', 'Admin'].includes(req.user.role);

  if (!isOwner && !isAdminOrFounder) {
    throw ApiError.forbidden('Insufficient permissions to delete this document');
  }

  document.isDeleted = true;
  document.deletedAt = new Date();
  await document.save();

  // Remove file from S3 storage
  try {
    await s3.deleteFromS3(document.url);
  } catch (err) {
    console.error('Failed to delete file from S3', err);
  }

  res.json({
    success: true,
    message: 'Document deleted successfully',
  });
});
