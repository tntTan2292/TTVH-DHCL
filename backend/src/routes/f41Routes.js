'use strict';

// F41-DASHBOARD-MINIMUM-01 - Phase B1 Backend
// Mounted at /api/f41 (server.js). Read-only: admin and viewer both allowed.
// Out of scope for this ticket: Import, BCVH Ranking, Evidence, portal sync.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const f41DashboardController = require('../controllers/F41DashboardController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];

router.get('/dashboard/kpi', ...allowViewerRead, f41DashboardController.getKpi);
router.get('/dashboard/meta', ...allowViewerRead, f41DashboardController.getMeta);
router.get('/dashboard/bcvh-reconciliation', ...allowViewerRead, f41DashboardController.getBcvhReconciliation);

module.exports = router;
