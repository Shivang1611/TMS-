const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// GET /api/audit-logs — List audit logs (Admin+)
router.get('/', authorize('Founder', 'Admin'), validate(validators.auditLogFilters, 'query'), auditLogController.listAuditLogs);

// GET /api/audit-logs/export — Export audit logs as CSV
router.get('/export', authorize('Founder', 'Admin'), validate(validators.auditLogFilters, 'query'), auditLogController.exportAuditLogs);

module.exports = router;
