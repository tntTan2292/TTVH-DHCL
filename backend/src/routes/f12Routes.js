'use strict';

// F12-DASHBOARD-RANKING-01 - mounted at /api/f12 (server.js). Read-only: admin and viewer
// both allowed (Q-8, same as /api/f11 and /api/f41). Import, Evidence and portal sync stay out of scope.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');

const f12RankingController = require('../controllers/F12RankingController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];

// PERF-LOAD-01: every route here is a viewer-level read, so all GETs are cacheable.
router.use(requireAuth, requireRole(['admin', 'viewer']), cachedRead());

router.get('/dashboard/summary', ...allowViewerRead, f12RankingController.getSummary);
router.get('/dashboard/daily-trend', ...allowViewerRead, f12RankingController.getDailyTrend);
router.get('/dashboard/office-table', ...allowViewerRead, f12RankingController.getOfficeTable);
router.get('/dashboard/cumulative-12', ...allowViewerRead, f12RankingController.getCumulative12);
router.get('/dashboard/meta', ...allowViewerRead, f12RankingController.getMeta);
router.get('/dashboard/national-ranking', ...allowViewerRead, f12RankingController.getNationalRanking);
router.get('/ranking/bcvh/overview', ...allowViewerRead, f12RankingController.getOverview);
router.get('/ranking/offices/overview', ...allowViewerRead, f12RankingController.getOfficeOverview);
router.get('/ranking/offices', ...allowViewerRead, f12RankingController.getOfficeRanking);
router.get('/ranking/bcvh/weeks', ...allowViewerRead, f12RankingController.getWeeks);
router.get('/ranking/bcvh/weekly-comparison', ...allowViewerRead, f12RankingController.getWeeklyComparison);
router.get('/ranking/bcvh/weekly-trend', ...allowViewerRead, f12RankingController.getWeeklyTrend);
router.get('/ranking/bcvh/months', ...allowViewerRead, f12RankingController.getMonths);
router.get('/ranking/bcvh/monthly-comparison', ...allowViewerRead, f12RankingController.getMonthlyComparison);
router.get('/ranking/bcvh', ...allowViewerRead, f12RankingController.getBcvhRanking);

module.exports = router;
