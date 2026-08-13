const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadController = require('../controllers/uploadController');

// Multer memory storage — files are streamed directly to S3
const storage = multer.memoryStorage();

// Allowed image MIME types
const imageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (imageMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Image type ${file.mimetype} is not allowed. Accepted: JPEG, PNG, GIF, WebP, SVG`), false);
    }
  },
});

// POST /api/upload/image — Upload an image
router.post('/image', upload.single('image'), uploadController.uploadImage);

// DELETE /api/upload/image — Delete an image from disk (only uploaded images, not external URLs)
router.delete('/image', uploadController.deleteImage);

module.exports = router;
