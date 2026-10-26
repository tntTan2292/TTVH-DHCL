'use strict';

// F42-DASHBOARD-RANKING-01 - mounted at /api/f42 (server.js). Read-only: admin and viewer
// both allowed (Q-8, same as /api/f41). Import, Evidence and portal sync stay out of scope.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');
const { requireModule, requireCityWide } = require('../middleware/accessScope');
const { scopeBcvhResponse } = require('../services/auth/access/scopeResponse');

const f42RankingController = require('../controllers/F42RankingController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];

// PERF-LOAD-01: every route here is a viewer-level read, so all GETs are cacheable.
// RBAC-01 step 3: requireModule sets req.scope BEFORE cachedRead (per-scope cache keys); the router-level
// sanitiser removes rows of any BCVH outside the scope from every body, route-level drops add the city totals.
router.use(requireAuth, requireRole(['admin', 'viewer']), requireModule('f42'), cachedRead());
router.use(scopeBcvhResponse());

router.get('/dashboard/summary', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.national_rank'] }), f42RankingController.getSummary);
router.get('/dashboard/daily-trend', ...allowViewerRead, f42RankingController.getDailyTrend);
// Postman table: BCVH blocks -> postmen. A BCVH-mode user keeps only the blocks of the scope (the sanitiser drops the others by ma_bcvh); the city total row goes.
router.get('/dashboard/postman-table', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.total_row'] }), f42RankingController.getPostmanTable);
router.get('/dashboard/meta', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.kpi_scope_note', 'data.kpi_includes_non_canonical_bcvh'] }), f42RankingController.getMeta);
router.get('/dashboard/national-ranking', ...allowViewerRead, requireCityWide, f42RankingController.getNationalRanking);
router.get('/ranking/bcvh/overview', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.mtd[].rank', 'data.meta.national_rank'] }), f42RankingController.getOverview);
router.get('/ranking/bcvh/weeks', ...allowViewerRead, f42RankingController.getWeeks);
router.get('/ranking/bcvh/weekly-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.total_row', 'data.meta.national_rank'] }), f42RankingController.getWeeklyComparison);
router.get('/ranking/bcvh/window-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.national_rank'] }), f42RankingController.getWindowComparison);
router.get('/ranking/bcvh/weekly-trend', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.weeks[].total', 'data.weeks[].national_rank'] }), f42RankingController.getWeeklyTrend);
router.get('/ranking/bcvh/months', ...allowViewerRead, f42RankingController.getMonths);
router.get('/ranking/bcvh/monthly-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.total_row', 'data.meta.national_rank'] }), f42RankingController.getMonthlyComparison);
router.get('/ranking/bcvh', ...allowViewerRead, scopeBcvhResponse({ drop: ['meta.total_row', 'meta.national_rank', 'data[].rank', 'data[].comparisons.d1.comparison_rank', 'data[].comparisons.d1.rank_movement', 'data[].comparisons.d7.comparison_rank', 'data[].comparisons.d7.rank_movement'] }), f42RankingController.getBcvhRanking);

module.exports = router;
