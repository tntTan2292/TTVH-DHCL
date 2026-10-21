const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');

const importController = require('../controllers/ImportController');
const dashboardController = require('../controllers/DashboardController');
const recommendationController = require('../controllers/RecommendationController');
const kpiController = require('../controllers/kpiController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];
const allowAdminOnly = [requireAuth, requireRole(['admin'])];

// PERF-LOAD-01: cache read-only viewer GETs only; admin-only reads (rca, messages) stay uncached.
const CACHEABLE_PATH = /^\/(dashboard\/(kpi|daily-trend|quality-timeline|top|meta)|ranking\/|recommendations|evidence)/;
router.use(requireAuth, requireRole(['admin', 'viewer']), cachedRead({ shouldCache: (req) => CACHEABLE_PATH.test(req.path) }));

router.post('/import/preview', ...allowAdminOnly, importController.preview);
router.post('/import/confirm', ...allowAdminOnly, importController.confirm);

router.get('/dashboard/kpi', ...allowViewerRead, dashboardController.getKpi);
router.get('/dashboard/daily-trend', ...allowViewerRead, dashboardController.getDailyTrend);
router.get('/dashboard/quality-timeline', ...allowViewerRead, dashboardController.getQualityTimeline);
router.get('/dashboard/top', ...allowViewerRead, kpiController.getDashboardTop);
router.get('/dashboard/meta', ...allowViewerRead, kpiController.getDashboardMeta);
router.get('/ranking/bcvh/overview', ...allowViewerRead, dashboardController.getBcvhOverview);
router.get('/ranking/bcvh/weeks', ...allowViewerRead, dashboardController.getBcvhWeeks);
router.get('/ranking/bcvh/weekly-comparison', ...allowViewerRead, dashboardController.getBcvhWeeklyComparison);
router.get('/ranking/bcvh/window-comparison', ...allowViewerRead, dashboardController.getBcvhWindowComparison);
router.get('/ranking/bcvh/weekly-trend', ...allowViewerRead, dashboardController.getBcvhWeeklyTrend);
router.get('/ranking/bcvh/months', ...allowViewerRead, dashboardController.getBcvhMonths);
router.get('/ranking/bcvh/monthly-comparison', ...allowViewerRead, dashboardController.getBcvhMonthlyComparison);
router.get('/ranking/bcvh', ...allowViewerRead, dashboardController.getBcvh);
router.get('/ranking/route', ...allowViewerRead, dashboardController.getRoute);
router.get('/ranking/route/periods', ...allowViewerRead, dashboardController.getRoutePeriods);
router.get('/recommendations', ...allowViewerRead, kpiController.getRecommendations);

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
