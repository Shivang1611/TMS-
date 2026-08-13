const bcrypt = require('bcryptjs');
const { User, Organization } = require('../models');
const { generateToken } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/auth/register
 * Creates a new organization and assigns the creator as Founder
 */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, name, organizationName } = req.body;

  const normalizedEmail = email?.trim().toLowerCase();
  // Check if email already in use
  const existingUser = await User.findOne({ email: normalizedEmail, isDeleted: false });
  if (existingUser) {
    throw ApiError.conflict('An account with this email already exists');
  }

  // Create organization
  const organization = await Organization.create({
    name: organizationName,
  });

  // Create user as Founder (password hashed by User pre-save hook)
  const user = await User.create({
    email,
    password,
    name,
    role: 'Founder',
    organization: organization._id,
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: organization._id,
        organizationName: organization.name,
      },
    },
  });
});

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Normalize: trim whitespace and lowercase
  const normalizedEmail = email?.trim().toLowerCase();
  const trimmedPassword = password?.trim();

  const user = await User.findOne({ email: normalizedEmail, isDeleted: false }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password. Please use the full email address you registered with.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account is deactivated. Contact your administrator.');
  }

  const isMatch = await user.comparePassword(trimmedPassword);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password. Please check your credentials and try again.');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.organization,
      },
    },
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('organization', 'name')
    .populate('department', 'name')
    .populate('teams', 'name');

  res.json({
    success: true,
    data: user,
  });
});

/**
 * PATCH /api/auth/me
 * Updates the current user's profile, notification preferences
 */
exports.updateMe = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'profile', 'notificationPreferences'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: user,
  });
});

/**
 * POST /api/auth/change-password
 * Allows an authenticated user to change their password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch user with password field selected
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw ApiError.notFound('User');
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  // Update password (pre-save hook will hash it)
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * POST /api/auth/avatar
 * Upload a new avatar image for the current user
 */
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  // TODO: In production, upload to S3-compatible storage
  // Store a placeholder URL referencing the local upload
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { 'profile.avatar': avatarUrl } },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: user,
    message: 'Avatar updated',
  });
});
