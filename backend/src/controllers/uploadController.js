const path = require('path');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const s3 = require('../utils/s3');

/**
 * POST /api/upload/image
 * Upload an image file to Vultr S3 and return its accessible URL.
 */
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No image file uploaded');
  }

  const { url } = await s3.uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'images');

  res.status(201).json({
    success: true,
    data: {
      url: url,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
});

/**
 * DELETE /api/upload/image
 * Delete an uploaded image file from Vultr S3 by its public URL path.
 * Expects { url: "https://del1.vultrobjects.com/bucket/images/filename.jpg" } in the request body.
 */
exports.deleteImage = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    throw ApiError.badRequest('Image URL is required');
  }

  // Extract key from the URL path
  try {
    const urlObj = new URL(url);
    // Vultr object path might be /caderainfotech-tms/images/filename.jpg
    // Let's strip the leading bucket name if present to get the correct S3 Key
    let key = urlObj.pathname.startsWith(`/${s3.BUCKET_NAME}/`) 
      ? urlObj.pathname.substring(`/${s3.BUCKET_NAME}/`.length) 
      : urlObj.pathname.substring(1);
    
    await s3.deleteFromS3(key);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (err) {
    throw ApiError.internal('Failed to delete image file');
  }
});
