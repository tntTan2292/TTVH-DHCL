const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const importController = require('../controllers/ImportController');
const dashboardController = require('../controllers/DashboardController');
const recommendationController = require('../controllers/RecommendationController');
const kpiController = require('../controllers/kpiController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];
const allowAdminOnly = [requireAuth, requireRole(['admin'])];

router.post('/import/preview', ...allowAdminOnly, importController.preview);
router.post('/import/confirm', ...allowAdminOnly, importController.confirm);

router.get('/dashboard/kpi', ...allowViewerRead, dashboardController.getKpi);
router.get('/dashboard/daily-trend', ...allowViewerRead, dashboardController.getDailyTrend);
router.get('/dashboard/quality-timeline', ...allowViewerRead, dashboardController.getQualityTimeline);
router.get('/dashboard/top', ...allowViewerRead, kpiController.getDashboardTop);
router.get('/dashboard/meta', ...allowViewerRead, kpiController.getDashboardMeta);
router.get('/ranking/bcvh/overview', ...allowViewerRead, dashboardController.getBcvhOverview);
router.get('/ranking/bcvh', ...allowViewerRead, dashboardController.getBcvh);
router.get('/ranking/route', ...allowViewerRead, dashboardController.getRoute);
router.get('/ranking/route/periods', ...allowViewerRead, dashboardController.getRoutePeriods);
router.get('/recommendations', ...allowViewerRead, kpiController.getRecommendations);

router.get('/rca/pareto', ...allowAdminOnly, dashboardController.getPareto);
router.get('/evidence-list', ...allowViewerRead, dashboardController.getEvidence);
router.get('/dashboard/message', ...allowAdminOnly, kpiController.getDashboardMessage);
router.get('/messages', ...allowAdminOnly, recommendationController.getMsgs);

module.exports = router;
