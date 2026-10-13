'use strict';

// HOME-BI-01 (B1) - mounted at /api/home (server.js). Read-only, admin and viewer, cached like /api/f11.

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');
const homeExecutiveController = require('../controllers/HomeExecutiveController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];

router.use(requireAuth, cachedRead());

router.get('/executive', ...allowViewerRead, homeExecutiveController.getExecutive);
router.get('/national-ranking', ...allowViewerRead, homeExecutiveController.getNationalRanking);

module.exports = router;
