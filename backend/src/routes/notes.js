const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');

// All routes are authenticated globally in server.js

router.get('/', noteController.getMyNotes);
router.get('/shared-with-me', noteController.getSharedNotes);
router.get('/:id', noteController.getNote);
router.post('/', noteController.createNote);
router.patch('/:id', noteController.updateNote);
router.patch('/:id/link', noteController.linkNote);
router.delete('/:id', noteController.deleteNote);

// ─── Sharing routes ───────────────────────────────────────────────
// Share note with one or more users  (body: { shares: [{ userId, permission }] })
router.post('/:id/share', noteController.shareNote);
// Update a single user's permission  (body: { permission: 'viewer' | 'editor' })
router.patch('/:id/share/:userId', noteController.updateSharePermission);
// Remove a user from shared list
router.delete('/:id/share/:userId', noteController.unshareNote);
// Copy a shared note into the requester's own notes
router.post('/:id/copy', noteController.copyNote);

module.exports = router;
