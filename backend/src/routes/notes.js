const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { authorize } = require('../middleware/auth'); // assuming authenticate happens in server.js

// Ensure all routes are authenticated
// The main `app.use('/api/notes', require('./routes/notes'))` usually applies auth, 
// but we'll assume it's covered globally or in server.js

router.get('/', noteController.getMyNotes);
router.get('/shared-with-me', noteController.getSharedNotes);
router.get('/:id', noteController.getNote);
router.post('/', noteController.createNote);
router.patch('/:id', noteController.updateNote);
router.patch('/:id/link', noteController.linkNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;
