const express = require('express');
const multer = require('multer');
const router = express.Router();
const importController = require('../controllers/importController');
const dkclHueF13SyncController = require('../controllers/dkclHueF13SyncController');
const dkclSharedOperationsController = require('../controllers/dkclSharedOperationsController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), importController.upload.bind(importController));
router.get('/f13/status', importController.status.bind(importController));
router.get('/status', importController.status.bind(importController));
router.post('/dkcl/session/preflight', dkclSharedOperationsController.preflight.bind(dkclSharedOperationsController));
router.post('/dkcl/session/interactive-auth', dkclSharedOperationsController.interactiveAuthenticate.bind(dkclSharedOperationsController));
router.get('/dkcl/hue/f13/coverage-summary', dkclHueF13SyncController.getCoverageSummary.bind(dkclHueF13SyncController));
router.get('/dkcl/hue/f13/missing-dates', dkclHueF13SyncController.scanMissingDates.bind(dkclHueF13SyncController));
router.get('/dkcl/tct/f13/coverage-summary', dkclSharedOperationsController.getTctCoverageSummary.bind(dkclSharedOperationsController));
router.get('/dkcl/tct/f13/missing-dates', dkclSharedOperationsController.scanTctMissingDates.bind(dkclSharedOperationsController));
router.post('/dkcl/tct/f13/backfill-queue', dkclSharedOperationsController.startTctBackfillQueue.bind(dkclSharedOperationsController));
router.get('/dkcl/tct/f13/backfill-queue/active', dkclSharedOperationsController.getTctBackfillQueue.bind(dkclSharedOperationsController));
router.get('/dkcl/tct/f13/backfill-queue/:queueId', dkclSharedOperationsController.getTctBackfillQueue.bind(dkclSharedOperationsController));
router.post('/dkcl/tct/f13/backfill-queue/:queueId/stop', dkclSharedOperationsController.stopTctBackfillQueue.bind(dkclSharedOperationsController));
router.post('/dkcl/tct/f13/backfill-queue/:queueId/retry', dkclSharedOperationsController.retryTctBackfillQueueItem.bind(dkclSharedOperationsController));
router.post('/dkcl/hue/f13/backfill-queue', dkclHueF13SyncController.startBackfillQueue.bind(dkclHueF13SyncController));
router.get('/dkcl/hue/f13/backfill-queue/active', dkclHueF13SyncController.getBackfillQueue.bind(dkclHueF13SyncController));
router.get('/dkcl/hue/f13/backfill-queue/:queueId', dkclHueF13SyncController.getBackfillQueue.bind(dkclHueF13SyncController));
router.post('/dkcl/hue/f13/backfill-queue/:queueId/stop', dkclHueF13SyncController.stopBackfillQueue.bind(dkclHueF13SyncController));
router.post('/dkcl/hue/f13/backfill-queue/:queueId/retry', dkclHueF13SyncController.retryBackfillQueueItem.bind(dkclHueF13SyncController));
router.post('/dkcl/hue/f13/sync', dkclHueF13SyncController.start.bind(dkclHueF13SyncController));
router.get('/dkcl/hue/f13/sync/:runId', dkclHueF13SyncController.getStatus.bind(dkclHueF13SyncController));

module.exports = router;
