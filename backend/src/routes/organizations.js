const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// All routes require authentication (applied in server.js)
// GET /api/organizations/:id — Get organization details
router.get('/:id', orgController.getOrganization);

// PATCH /api/organizations/:id — Update organization (Founder/Admin)
router.patch('/:id', authorize('Founder', 'Admin'), validate(validators.updateOrganization), orgController.updateOrganization);

// DELETE /api/organizations/:id — Delete organization (Founder only)
router.delete('/:id', authorize('Founder'), orgController.deleteOrganization);

module.exports = router;
