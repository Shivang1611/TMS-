const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// GET /api/milestones/:id — Get milestone details
router.get('/:id', milestoneController.getMilestone);

// PATCH /api/milestones/:id — Update milestone (Manager+)
router.patch('/:id', authorize('Founder', 'Admin', 'Manager'), validate(validators.updateMilestone), milestoneController.updateMilestone);

// DELETE /api/milestones/:id — Delete milestone (Manager+)
router.delete('/:id', authorize('Founder', 'Admin', 'Manager'), milestoneController.deleteMilestone);

module.exports = router;
