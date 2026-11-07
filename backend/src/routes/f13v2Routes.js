'use strict';

// F13-V2-STRUCTURE-01: time-axis F1.3 (design Section 5.2). Mounted at /api/f13/v2, additive: no /api/f13 route changes.
// Same middleware order as f13Routes: auth, role, requireModule('f13') BEFORE the cache so cache entries are per scope.

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { cachedRead } = require('../middleware/responseCache');
const { requireModule } = require('../middleware/accessScope');
const { scopeBcvhResponse } = require('../services/auth/access/scopeResponse');
const { CAPABILITIES, can } = require('../services/auth/access/roles');
const controller = require('../controllers/F13V2Controller');

const router = express.Router();

router.use(
    requireAuth,
    requireRole(['admin', 'viewer']),
    requireModule('f13'),
    cachedRead({ shouldCache: (req) => req.path === '/day/summary' || req.path.startsWith('/journey/') }),
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
router.get('/journey/routes', controller.getJourneyRoutes);
router.get('/journey/parcels', controller.getJourneyParcels);
// F13-WHY-AGG-01 P2: cause aggregation over the derived table (not cached: the answer carries its own freshness).
// A BCVH-mode account gets its own unit only and no city total (the service leaves it out; `drop` is the second guard).
router.get('/why/summary', controller.getWhySummary);
router.get('/why/bcvh', scopeBcvhResponse({ drop: ['data.total'] }), controller.getWhyBcvh);
router.get('/why/routes', controller.getWhyRoutes);
router.get('/why/postmen', controller.getWhyPostmen);
router.get('/why/parcels', controller.getWhyParcels);

// F13-EVIDENCE-01 B1: evidence list / export, analyses of failed parcels. Same scope rules as /why; the capability decides who may read and write.
const needs = (capability) => (req, res, next) => (can(req.access, capability)
    ? next()
    : res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập chức năng này' } }));
router.get('/evidence/catalog', needs(CAPABILITIES.F13_ANALYSIS_VIEW), controller.getEvidenceCatalog);
router.get('/evidence/list', needs(CAPABILITIES.F13_ANALYSIS_VIEW), controller.getEvidenceList);
router.get('/evidence/export', needs(CAPABILITIES.F13_ANALYSIS_VIEW), controller.exportEvidence);
router.get('/evidence/history', needs(CAPABILITIES.F13_ANALYSIS_VIEW), controller.getEvidenceHistory);
router.post('/evidence/analyses', express.json({ limit: '32kb' }), needs(CAPABILITIES.F13_ANALYSIS_WRITE), controller.postEvidenceAnalysis);

// F13-GOLIVE-PLAN-01: G2 and G3 own one router file each, so two executors never edit this file at the same time.
router.use('/capacity', require('./f13v2CapacityRoutes'));
router.use('/rule-proposals', require('./f13v2RuleProposalRoutes'));

module.exports = router;
