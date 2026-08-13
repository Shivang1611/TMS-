const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// POST /api/teams — Create team (Admin+)
router.post('/', authorize('Founder', 'Admin'), validate(validators.createTeam), teamController.createTeam);

// GET /api/teams — List teams (filterable by department)
router.get('/', teamController.listTeams);

// GET /api/teams/:id — Get team details
router.get('/:id', teamController.getTeam);

// PATCH /api/teams/:id — Update team (Admin+)
router.patch('/:id', authorize('Founder', 'Admin'), validate(validators.updateTeam), teamController.updateTeam);

// DELETE /api/teams/:id — Delete team (Admin+)
router.delete('/:id', authorize('Founder', 'Admin'), teamController.deleteTeam);

// POST /api/teams/:id/members — Add members to team (Admin/Manager)
router.post('/:id/members', authorize('Founder', 'Admin', 'Manager'), validate(validators.addTeamMembers), teamController.addMembers);

// DELETE /api/teams/:id/members/:userId — Remove member from team
router.delete('/:id/members/:userId', authorize('Founder', 'Admin', 'Manager'), teamController.removeMember);

module.exports = router;
