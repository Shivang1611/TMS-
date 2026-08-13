const express = require('express');
const router = express.Router();
const multer = require('multer');
const config = require('../config');
const documentController = require('../controllers/documentController');
const validate = require('../middleware/validate');
const validators = require('../validators');

// Multer config for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (config.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  },
});

// POST /api/documents/upload — Upload a file
router.post(
  '/upload',
  upload.single('file'),
  validate(validators.createDocument),
  documentController.uploadDocument
);

// GET /api/documents — List documents (filterable by project/task)
router.get('/', documentController.listDocuments);

// GET /api/documents/:id — Get document metadata
router.get('/:id', documentController.getDocument);

// GET /api/documents/:id/download — Download file
router.get('/:id/download', documentController.downloadDocument);

// DELETE /api/documents/:id — Delete document
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
