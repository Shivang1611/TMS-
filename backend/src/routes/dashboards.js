const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authorize } = require('../middleware/auth');

// GET /api/dashboards/org — Org-wide dashboard (Founder/Admin)
router.get('/org', authorize('Founder', 'Admin'), dashboardController.orgDashboard);

// GET /api/dashboards/department — Department dashboard (Manager)
router.get('/department', authorize('Founder', 'Admin', 'Manager'), dashboardController.departmentDashboard);

// GET /api/dashboards/team — Team dashboard (Team Lead)
router.get('/team', authorize('Founder', 'Admin', 'Manager', 'Team Lead'), dashboardController.teamDashboard);

// GET /api/dashboards/workload — Team workload
router.get('/workload', authorize('Founder', 'Admin', 'Manager', 'Team Lead', 'Employee'), dashboardController.workloadDashboard);

// GET /api/dashboards/personal — Personal dashboard (all roles)
router.get('/personal', dashboardController.personalDashboard);

module.exports = router;
