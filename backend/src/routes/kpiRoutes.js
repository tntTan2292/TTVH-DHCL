const express = require('express');
const router = express.Router();
const kpiController = require('../controllers/kpiController');

router.get('/summary', kpiController.getSummary);
router.get('/bcvh-ranking', kpiController.getBcvhRanking);

module.exports = router;
