'use strict';

// F13-V2-STRUCTURE-01: time-axis F1.3 (design Section 5.2). Mounted at /api/f13/v2, additive: no /api/f13 route changes.
// Same middleware order as f13Routes: auth, role, requireModule('f13') BEFORE the cache so cache entries are per scope.

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');
const { requireModule } = require('../middleware/accessScope');
const { scopeBcvhResponse } = require('../services/auth/access/scopeResponse');
const controller = require('../controllers/F13V2Controller');

const router = express.Router();

router.use(
    requireAuth,
    requireRole(['admin', 'viewer']),
    requireModule('f13'),
    cachedRead({ shouldCache: (req) => req.path === '/day/summary' }),
);
router.use(scopeBcvhResponse());

router.get('/layout', controller.getLayout);
router.get('/period/resolve', controller.resolvePeriod);
// A BCVH-mode account keeps its own row only: no city total, no rank, no rank-derived field.
router.get(
    '/day/summary',
    scopeBcvhResponse({ drop: ['data.meta.total_row', 'data.rows[].rank'] }),
    controller.getDaySummary,
);

module.exports = router;
