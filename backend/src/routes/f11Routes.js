'use strict';

// F11-DASHBOARD-RANKING-01 (T1/T2) - mounted at /api/f11 (server.js). Read-only: admin and viewer
// both allowed (Q-8, same as /api/f41). Import, Evidence and portal sync stay out of scope.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');
const { requireModule, requireCityWide } = require('../middleware/accessScope');
const { scopeBcvhResponse, restrictPairTable } = require('../services/auth/access/scopeResponse');

const f11RankingController = require('../controllers/F11RankingController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];

// PERF-LOAD-01: every route here is a viewer-level read, so all GETs are cacheable.
// RBAC-01 step 3: requireModule sets req.scope BEFORE cachedRead (per-scope cache keys); the router-level
// sanitiser removes rows of any BCVH outside the scope from every body, route-level drops add the city totals.
router.use(requireAuth, requireRole(['admin', 'viewer']), requireModule('f11'), cachedRead());
router.use(scopeBcvhResponse());

router.get('/dashboard/summary', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.national_rank'] }), f11RankingController.getSummary);
router.get('/dashboard/daily-trend', ...allowViewerRead, f11RankingController.getDailyTrend);
router.get('/dashboard/pair-table', ...allowViewerRead, scopeBcvhResponse({ transform: (payload, codes) => ({ ...payload, data: restrictPairTable(payload.data, codes) }) }), f11RankingController.getPairTable);
router.get('/dashboard/meta', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.kpi_scope_note', 'data.kpi_includes_non_canonical_bcvh'] }), f11RankingController.getMeta);
router.get('/dashboard/national-ranking', ...allowViewerRead, requireCityWide, f11RankingController.getNationalRanking);
router.get('/ranking/bcvh/overview', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.mtd[].rank', 'data.meta.national_rank'] }), f11RankingController.getOverview);
router.get('/ranking/bcvh/weeks', ...allowViewerRead, f11RankingController.getWeeks);
router.get('/ranking/bcvh/weekly-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.total_row', 'data.meta.national_rank'] }), f11RankingController.getWeeklyComparison);
router.get('/ranking/bcvh/window-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.national_rank'] }), f11RankingController.getWindowComparison);
router.get('/ranking/bcvh/weekly-trend', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.weeks[].total', 'data.weeks[].national_rank'] }), f11RankingController.getWeeklyTrend);
router.get('/ranking/bcvh/months', ...allowViewerRead, f11RankingController.getMonths);
router.get('/ranking/bcvh/monthly-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.total_row', 'data.meta.national_rank'] }), f11RankingController.getMonthlyComparison);
router.get('/ranking/bcvh', ...allowViewerRead, scopeBcvhResponse({ drop: ['meta.total_row', 'meta.national_rank', 'data[].rank', 'data[].comparisons.d1.comparison_rank', 'data[].comparisons.d1.rank_movement', 'data[].comparisons.d7.comparison_rank', 'data[].comparisons.d7.rank_movement'] }), f11RankingController.getBcvhRanking);

module.exports = router;
