const express = require('express');
const router = express.Router();

const importController = require('../controllers/ImportController');
const dashboardController = require('../controllers/DashboardController');
const recommendationController = require('../controllers/RecommendationController');
const kpiController = require('../controllers/kpiController');

// 1. Import Routes
router.post('/import/preview', importController.preview);
router.post('/import/confirm', importController.confirm);

// 2. Dashboard Routes
router.get('/dashboard/kpi', dashboardController.getKpi);
router.get('/dashboard/daily-trend', dashboardController.getDailyTrend);
router.get('/dashboard/quality-timeline', dashboardController.getQualityTimeline);
router.get('/dashboard/top', kpiController.getDashboardTop);
router.get('/dashboard/meta', kpiController.getDashboardMeta);
router.get('/ranking/bcvh', dashboardController.getBcvh);
router.get('/ranking/route', dashboardController.getRoute);
router.get('/rca/pareto', dashboardController.getPareto);
router.get('/evidence-list', dashboardController.getEvidence);

// 3. Recommendation & Message Routes
router.get('/recommendations', kpiController.getRecommendations);
router.get('/dashboard/message', kpiController.getDashboardMessage);
router.get('/messages', recommendationController.getMsgs);

module.exports = router;
