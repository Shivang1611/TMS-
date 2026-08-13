const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const milestoneController = require('../controllers/milestoneController');
const taskController = require('../controllers/taskController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// POST /api/projects — Create project (Manager+)
router.post('/', authorize('Founder', 'Admin', 'Manager'), validate(validators.createProject), projectController.createProject);

// GET /api/projects — List projects (scoped to user's org/role)
router.get('/', projectController.listProjects);

// GET /api/projects/:id — Get project details
router.get('/:id', projectController.getProject);

// PATCH /api/projects/:id — Update project (Manager+)
router.patch('/:id', authorize('Founder', 'Admin', 'Manager'), validate(validators.updateProject), projectController.updateProject);

// DELETE /api/projects/:id — Delete project (Manager+)
router.delete('/:id', authorize('Founder', 'Admin', 'Manager'), projectController.deleteProject);

// ─── Nested Milestones under Project ──────────────────────────────────────────

// POST /api/projects/:projectId/milestones — Create milestone (Manager+)
router.post('/:projectId/milestones', authorize('Founder', 'Admin', 'Manager'), validate(validators.createMilestone), milestoneController.createMilestone);

// GET /api/projects/:projectId/milestones — List milestones for a project
router.get('/:projectId/milestones', milestoneController.listMilestonesByProject);

// ─── Nested Tasks under Project ──────────────────────────────────────────────

// POST /api/projects/:projectId/tasks — Create task in project (Manager/Team Lead)
router.post('/:projectId/tasks', authorize('Founder', 'Admin', 'Manager', 'Team Lead'), validate(validators.createTask), taskController.createTask);

// GET /api/projects/:projectId/tasks — List tasks for a project
router.get('/:projectId/tasks', taskController.listTasksByProject);

module.exports = router;
