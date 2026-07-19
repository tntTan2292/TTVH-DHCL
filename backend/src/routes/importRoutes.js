const express = require('express');
const multer = require('multer');
const router = express.Router();
const importController = require('../controllers/importController');
const dkclHueF13SyncController = require('../controllers/dkclHueF13SyncController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), importController.upload.bind(importController));
router.get('/f13/status', importController.status.bind(importController));
router.get('/status', importController.status.bind(importController));
router.post('/dkcl/hue/f13/sync', dkclHueF13SyncController.start.bind(dkclHueF13SyncController));
router.get('/dkcl/hue/f13/sync/:runId', dkclHueF13SyncController.getStatus.bind(dkclHueF13SyncController));

module.exports = router;
