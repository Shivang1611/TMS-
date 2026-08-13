const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: 'https://del1.vultrobjects.com',
  credentials: {
    accessKeyId: process.env.VULTR_ACCESS_KEY || 'QVN07YZVQ8686VAKDEZ2',
    secretAccessKey: process.env.VULTR_SECRET_KEY || 'eJJkPET86xzD0jQQ97GDfJBnUntKcS6R4JC0n84w',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.VULTR_BUCKET || 'caderainfotech-tms';

/**
 * Upload a file to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} mimetype - MIME type
 * @param {string} folder - Folder prefix (e.g., 'images' or 'documents')
 * @returns {Promise<{ key: string, url: string }>}
 */
const uploadToS3 = async (buffer, originalName, mimetype, folder = 'documents') => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName).toLowerCase();
  const key = `${folder}/${uniqueSuffix}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'public-read',
  });

  await s3Client.send(command);

  return {
    key,
    // Depending on ACL, the URL might be public or require a signed URL.
    // For documents, it's typically better to return a signed URL when viewing.
    // For images used in RichText, a public URL is often needed unless the frontend requests signed URLs.
    // Let's generate a public URL format, but we'll use signed URLs for secure docs.
    url: `https://del1.vultrobjects.com/${BUCKET_NAME}/${key}`,
  };
};

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 */
const deleteFromS3 = async (keyOrUrl) => {
  let key = keyOrUrl;
  
  // Extract key if a full URL was provided
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    try {
      const urlObj = new URL(keyOrUrl);
      key = urlObj.pathname.startsWith(`/${BUCKET_NAME}/`) 
        ? urlObj.pathname.substring(`/${BUCKET_NAME}/`.length) 
        : urlObj.pathname.substring(1);
    } catch (err) {
      // Ignore URL parsing errors and try using it as a raw key
    }
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
};

/**
 * Generate a pre-signed URL for viewing/downloading private files
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiry time in seconds (default 1 hour)
 */
const getS3SignedUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

module.exports = {
  s3Client,
  uploadToS3,
  deleteFromS3,
  getS3SignedUrl,
  BUCKET_NAME,
};
