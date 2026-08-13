const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const validators = require('../validators');

const path = require('path');

// Multer config for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const avatarUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
    }
  },
});

// POST /api/auth/register — Create a new organization and Founder account
router.post('/register', validate(validators.register), authController.register);

// POST /api/auth/login — Login with email and password
router.post('/login', validate(validators.login), authController.login);

// GET /api/auth/me — Get current authenticated user's profile
router.get('/me', authenticate, authController.getMe);

// PATCH /api/auth/me — Update own profile
router.patch('/me', authenticate, validate(validators.updateProfile), authController.updateMe);

// POST /api/auth/change-password — Change own password
router.post('/change-password', authenticate, validate(validators.changePassword), authController.changePassword);

// POST /api/auth/avatar — Upload avatar image
router.post('/avatar', authenticate, avatarUpload.single('avatar'), authController.uploadAvatar);

module.exports = router;
