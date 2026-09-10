const express = require('express');
const router = express.Router();
const agentController = require('../agent/agentController');

// All routes require authentication (handled by server.js `authenticate` middleware)

// POST /api/agent/message — send a message to the AI agent
router.post('/message', agentController.sendMessage);

// POST /api/agent/confirm — confirm a pending write action
router.post('/confirm', agentController.confirmAction);

// POST /api/agent/cancel — cancel a pending write action
router.post('/cancel', agentController.cancelAction);

// DELETE /api/agent/history — clear conversation history
router.delete('/history', agentController.clearHistory);

module.exports = router;
