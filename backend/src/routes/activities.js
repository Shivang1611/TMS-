const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const validate = require('../middleware/validate');
const validators = require('../validators');

// GET /api/activities — Get activity timeline (filterable by entity)
router.get('/', validate(validators.activityFilters, 'query'), activityController.getActivities);

module.exports = router;
