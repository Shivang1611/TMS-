const express = require('express');
const router = express.Router();
const deptController = require('../controllers/deptController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// POST /api/departments — Create department (Admin+)
router.post('/', authorize('Founder', 'Admin'), validate(validators.createDepartment), deptController.createDepartment);

// GET /api/departments — List departments (user's org, filtered by scope)
router.get('/', deptController.listDepartments);

// GET /api/departments/:id — Get department details
router.get('/:id', deptController.getDepartment);

// PATCH /api/departments/:id — Update department (Admin+)
router.patch('/:id', authorize('Founder', 'Admin'), validate(validators.updateDepartment), deptController.updateDepartment);

// DELETE /api/departments/:id — Delete department (Admin+, BR-11 enforced)
router.delete('/:id', authorize('Founder', 'Admin'), deptController.deleteDepartment);

module.exports = router;
