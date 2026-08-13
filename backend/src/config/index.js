module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'tms-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tms',

  // Rate limiting
  rateLimitStandard: parseInt(process.env.RATE_LIMIT_STANDARD, 10) || 1000,
  rateLimitUpload: parseInt(process.env.RATE_LIMIT_UPLOAD, 10) || 100,

  // File uploads
  maxFileSize: 25 * 1024 * 1024, // 25MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/markdown',
  ],

  // Soft delete retention (in days)
  retentionDays: parseInt(process.env.RETENTION_DAYS, 10) || 90,
  auditLogRetentionYears: parseInt(process.env.AUDIT_LOG_RETENTION_YEARS, 10) || 1,
};
