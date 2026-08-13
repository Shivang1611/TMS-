const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const validate = require('../middleware/validate');
const validators = require('../validators');

// GET /api/search — Full-text search
router.get('/', validate(validators.searchQuery, 'query'), searchController.search);

module.exports = router;
