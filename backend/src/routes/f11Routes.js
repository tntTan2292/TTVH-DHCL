'use strict';

// F11-DASHBOARD-RANKING-01 (T1/T2) - mounted at /api/f11 (server.js). Read-only: admin and viewer
// both allowed (Q-8, same as /api/f41). Import, Evidence and portal sync stay out of scope.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const f11RankingController = require('../controllers/F11RankingController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];

router.get('/dashboard/summary', ...allowViewerRead, f11RankingController.getSummary);
router.get('/dashboard/daily-trend', ...allowViewerRead, f11RankingController.getDailyTrend);
router.get('/dashboard/pair-table', ...allowViewerRead, f11RankingController.getPairTable);
router.get('/dashboard/meta', ...allowViewerRead, f11RankingController.getMeta);
router.get('/dashboard/national-ranking', ...allowViewerRead, f11RankingController.getNationalRanking);
router.get('/ranking/bcvh/overview', ...allowViewerRead, f11RankingController.getOverview);
router.get('/ranking/bcvh/weeks', ...allowViewerRead, f11RankingController.getWeeks);
router.get('/ranking/bcvh/weekly-comparison', ...allowViewerRead, f11RankingController.getWeeklyComparison);
router.get('/ranking/bcvh/weekly-trend', ...allowViewerRead, f11RankingController.getWeeklyTrend);
router.get('/ranking/bcvh/months', ...allowViewerRead, f11RankingController.getMonths);
router.get('/ranking/bcvh/monthly-comparison', ...allowViewerRead, f11RankingController.getMonthlyComparison);
router.get('/ranking/bcvh', ...allowViewerRead, f11RankingController.getBcvhRanking);

module.exports = router;
