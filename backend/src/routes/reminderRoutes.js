const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

// All reminder routes require authentication (already applied in server.js)

router
  .route('/')
  .get(reminderController.getReminders)
  .post(reminderController.createReminder);

router
  .route('/:id')
  .patch(reminderController.updateReminder)
  .delete(reminderController.deleteReminder);

module.exports = router;
