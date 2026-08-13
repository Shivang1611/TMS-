const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// POST /api/users/invite — Invite a new employee (Admin+)
router.post('/invite', authorize('Founder', 'Admin'), validate(validators.inviteUser), userController.inviteUser);

// POST /api/users/bulk-invite — Bulk invite employees (Admin+)
router.post('/bulk-invite', authorize('Founder', 'Admin'), validate(validators.bulkInvite), userController.bulkInvite);

// GET /api/users — List users in organization (filterable)
router.get('/', userController.listUsers);

// GET /api/users/:id/score — Get user score and tier
router.get('/:id/score', userController.getUserScore);

// GET /api/users/:id — Get user details
router.get('/:id', userController.getUser);

// PATCH /api/users/:id — Update user details (Admin+)
router.patch('/:id', authorize('Founder', 'Admin'), validate(validators.updateUser), userController.updateUser);

// PATCH /api/users/:id/reset-password — Reset user password (Admin+)
router.patch('/:id/reset-password', authorize('Founder', 'Admin'), validate(validators.resetPasswordAdmin), userController.resetPassword);

// PATCH /api/users/:id/deactivate — Deactivate user (Admin+)
router.patch('/:id/deactivate', authorize('Founder', 'Admin'), userController.deactivateUser);

// PATCH /api/users/:id/reactivate — Reactivate user (Admin+)
router.patch('/:id/reactivate', authorize('Founder', 'Admin'), userController.reactivateUser);

// DELETE /api/users/:id — Soft-delete user (Admin+)
router.delete('/:id', authorize('Founder', 'Admin'), userController.deleteUser);

module.exports = router;
