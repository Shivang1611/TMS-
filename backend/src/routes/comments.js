const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const validate = require('../middleware/validate');
const validators = require('../validators');

// POST /api/comments — Create comment on a task
router.post('/', validate(validators.createComment), commentController.createComment);

// GET /api/comments — List comments (filterable by task)
router.get('/', commentController.listComments);

// PATCH /api/comments/:id — Update own comment
router.patch('/:id', validate(validators.updateComment), commentController.updateComment);

// DELETE /api/comments/:id — Delete comment (own or Admin)
router.delete('/:id', commentController.deleteComment);

module.exports = router;
