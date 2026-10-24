const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');
const { requireModule } = require('../middleware/accessScope');
const { scopeBcvhResponse } = require('../services/auth/access/scopeResponse');

const importController = require('../controllers/ImportController');
const dashboardController = require('../controllers/DashboardController');
const recommendationController = require('../controllers/RecommendationController');
const kpiController = require('../controllers/kpiController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];
const allowAdminOnly = [requireAuth, requireRole(['admin'])];

// PERF-LOAD-01: cache read-only viewer GETs only; admin-only reads (rca, messages) stay uncached.
const CACHEABLE_PATH = /^\/(dashboard\/(kpi|daily-trend|quality-timeline|top|meta)|ranking\/|recommendations|evidence)/;
// RBAC-01 step 3: requireModule('f13') sets req.scope BEFORE cachedRead so cache entries are per scope.
router.use(requireAuth, requireRole(['admin', 'viewer']), requireModule('f13'), cachedRead({ shouldCache: (req) => CACHEABLE_PATH.test(req.path) }));
// Defence in depth for every F1.3 read: a BCVH-scope body never keeps rows of another BCVH, wherever they sit
// (e.g. the confirmed_non_postman_routes list inside the route ranking meta). Route-level drops add the city totals.
router.use(scopeBcvhResponse());

router.post('/import/preview', ...allowAdminOnly, importController.preview);
router.post('/import/confirm', ...allowAdminOnly, importController.confirm);

router.get('/dashboard/kpi', ...allowViewerRead, dashboardController.getKpi);
router.get('/dashboard/daily-trend', ...allowViewerRead, dashboardController.getDailyTrend);
router.get('/dashboard/quality-timeline', ...allowViewerRead, dashboardController.getQualityTimeline);
router.get('/dashboard/top', ...allowViewerRead, scopeBcvhResponse(), kpiController.getDashboardTop);
// bcvh_units is the BCVH selector source: a BCVH user gets only their own units.
router.get('/dashboard/meta', ...allowViewerRead, scopeBcvhResponse(), kpiController.getDashboardMeta);
router.get('/ranking/bcvh/overview', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.mtd[].rank', 'data.meta.national_rank'] }), dashboardController.getBcvhOverview);
router.get('/ranking/bcvh/weeks', ...allowViewerRead, dashboardController.getBcvhWeeks);
router.get('/ranking/bcvh/weekly-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.total_row'] }), dashboardController.getBcvhWeeklyComparison);
router.get('/ranking/bcvh/window-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.national_rank'] }), dashboardController.getBcvhWindowComparison);
router.get('/ranking/bcvh/weekly-trend', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.weeks[].total', 'data.weeks[].national_rank'] }), dashboardController.getBcvhWeeklyTrend);
router.get('/ranking/bcvh/months', ...allowViewerRead, dashboardController.getBcvhMonths);
router.get('/ranking/bcvh/monthly-comparison', ...allowViewerRead, scopeBcvhResponse({ drop: ['data.total_row'] }), dashboardController.getBcvhMonthlyComparison);
router.get('/ranking/bcvh', ...allowViewerRead, scopeBcvhResponse({ drop: ['meta.total_row', 'meta.national_rank', 'data[].rank'] }), dashboardController.getBcvh);
router.get('/ranking/route', ...allowViewerRead, dashboardController.getRoute);
router.get('/ranking/route/periods', ...allowViewerRead, dashboardController.getRoutePeriods);
router.get('/recommendations', ...allowViewerRead, scopeBcvhResponse(), kpiController.getRecommendations);

router.get('/rca/pareto', ...allowAdminOnly, dashboardController.getPareto);
router.get('/evidence-list', ...allowViewerRead, dashboardController.getEvidence);
router.get('/evidence', ...allowViewerRead, dashboardController.getEvidenceDrilldown);
router.get('/dashboard/message', ...allowAdminOnly, kpiController.getDashboardMessage);
// PERF-LOAD-01: aggregate read mode, fuse state and shadow counters (admin only, never cached).
router.get('/dashboard/agg-status', ...allowAdminOnly, (req, res) => {
    res.json({ success: true, data: require('../services/aggReadPolicy').status() });
});
router.get('/messages', ...allowAdminOnly, recommendationController.getMsgs);

module.exports = router;
