const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');
const validators = require('../validators');

// GET /api/reports/tasks — Task completion report (filterable)
router.get('/tasks', authorize('Founder', 'Admin', 'Manager', 'Team Lead'), validate(validators.reportFilters), reportController.taskCompletionReport);

// GET /api/reports/workload — Workload report (tasks per assignee)
router.get('/workload', authorize('Founder', 'Admin', 'Manager', 'Team Lead'), validate(validators.reportFilters), reportController.workloadReport);

// GET /api/reports/projects — Project progress report
router.get('/projects', authorize('Founder', 'Admin', 'Manager'), validate(validators.reportFilters), reportController.projectProgressReport);

// GET /api/reports/department-throughput — Department throughput
router.get('/department-throughput', authorize('Founder', 'Admin', 'Manager'), validate(validators.reportFilters), reportController.departmentThroughput);

module.exports = router;
