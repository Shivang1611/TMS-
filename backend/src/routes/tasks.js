const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// GET /api/tasks — List tasks (filterable, sortable, paginated)
router.get('/', taskController.listTasks);

// PATCH /api/tasks/bulk/status — Bulk update task statuses (Manager+)
router.patch('/bulk/status', authorize('Founder', 'Admin', 'Manager'), taskController.bulkUpdateStatus);

// GET /api/tasks/:id — Get task details with subtasks and comments
router.get('/:id', taskController.getTask);

// PATCH /api/tasks/:id — Update task fields
router.patch('/:id', taskController.updateTask);

// DELETE /api/tasks/:id — Delete task (role-scoped)
router.delete('/:id', taskController.deleteTask);

// PATCH /api/tasks/:id/status — Update task status (with BR-02/BR-03 validation)
router.patch('/:id/status', validate(validators.updateTaskStatus), taskController.updateTaskStatus);

// PATCH /api/tasks/:id/assign — Assign/reassign task
router.patch('/:id/assign', taskController.assignTask);

// GET /api/tasks/:id/subtasks — Get subtasks of a task
router.get('/:id/subtasks', taskController.getSubtasks);

module.exports = router;
