'use strict';

// F41-DASHBOARD-MINIMUM-01 - Phase B1 Backend
// Mounted at /api/f41 (server.js). Read-only: admin and viewer both allowed.
// Import, Evidence and portal sync stay out of scope; Operation Dashboard / BCVH Ranking reads are F41-DASHBOARD-RANKING-01.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const f41DashboardController = require('../controllers/F41DashboardController');
const f41RankingController = require('../controllers/F41RankingController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];

router.get('/dashboard/kpi', ...allowViewerRead, f41DashboardController.getKpi);
router.get('/dashboard/meta', ...allowViewerRead, f41DashboardController.getMeta);
router.get('/dashboard/bcvh-reconciliation', ...allowViewerRead, f41DashboardController.getBcvhReconciliation);

// F41-DASHBOARD-RANKING-01 (T1/T2): Operation Dashboard + BCVH Ranking read endpoints.
// Same paths/shapes as the /api/f13 twins (Design of Record 4.3). Read-only, admin + viewer.
router.get('/dashboard/summary', ...allowViewerRead, f41RankingController.getSummary);
router.get('/dashboard/daily-trend', ...allowViewerRead, f41RankingController.getDailyTrend);
router.get('/ranking/bcvh/overview', ...allowViewerRead, f41RankingController.getOverview);
router.get('/ranking/bcvh/weeks', ...allowViewerRead, f41RankingController.getWeeks);
router.get('/ranking/bcvh/weekly-comparison', ...allowViewerRead, f41RankingController.getWeeklyComparison);
router.get('/ranking/bcvh/weekly-trend', ...allowViewerRead, f41RankingController.getWeeklyTrend);
router.get('/ranking/bcvh/months', ...allowViewerRead, f41RankingController.getMonths);
router.get('/ranking/bcvh/monthly-comparison', ...allowViewerRead, f41RankingController.getMonthlyComparison);
router.get('/ranking/bcvh', ...allowViewerRead, f41RankingController.getBcvhRanking);

module.exports = router;
