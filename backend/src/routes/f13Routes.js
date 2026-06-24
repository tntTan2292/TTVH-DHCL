const express = require('express');
const router = express.Router();
const kpiController = require('../controllers/kpiController');

router.get('/dashboard/kpi', kpiController.getDashboardKpi);
router.get('/dashboard/trend', kpiController.getDashboardTrend);
router.get('/dashboard/top', kpiController.getDashboardTop);
router.get('/bcvh-ranking', kpiController.getBcvhRanking);

module.exports = router;
