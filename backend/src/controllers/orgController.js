const { Organization } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const auditLogService = require('../services/auditLogService');

/**
 * GET /api/organizations/:id
 * Get organization details
 */
exports.getOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Users can only view their own organization
  if (req.user.organization.toString() !== id) {
    throw ApiError.forbidden('Access denied to this resource');
  }

  const organization = await Organization.findById(id);
  if (!organization || organization.isDeleted) {
    throw ApiError.notFound('Organization');
  }

  res.json({
    success: true,
    data: organization,
  });
});

/**
 * PATCH /api/organizations/:id
 * Update organization settings (Founder/Admin)
 */
exports.updateOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.organization.toString() !== id) {
    throw ApiError.forbidden('Access denied to this resource');
  }

  const organization = await Organization.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!organization || organization.isDeleted) {
    throw ApiError.notFound('Organization');
  }

  res.json({
    success: true,
    data: organization,
  });
});

/**
 * DELETE /api/organizations/:id
 * Delete organization (Founder only)
 */
exports.deleteOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.organization.toString() !== id) {
    throw ApiError.forbidden('Access denied to this resource');
  }

  const organization = await Organization.findById(id);
  if (!organization || organization.isDeleted) {
    throw ApiError.notFound('Organization');
  }

  // Soft delete with timestamp
  organization.isDeleted = true;
  organization.deletedAt = new Date();
  await organization.save();

  res.json({
    success: true,
    message: 'Organization deleted successfully',
  });
});
