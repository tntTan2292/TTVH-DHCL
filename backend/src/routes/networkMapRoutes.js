const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const networkMapController = require('../controllers/NetworkMapController');
const networkImportController = require('../controllers/NetworkImportController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];
const allowAdminOnly = [requireAuth, requireRole(['admin'])];
const upload = multer({ storage: multer.memoryStorage() });

// ---- Read (admin + viewer) ----
router.get('/service-points', ...allowViewerRead, networkMapController.listServicePoints);
router.get('/level2-routes', ...allowViewerRead, networkMapController.listLevel2Routes);
router.get('/delivery-routes/meta', ...allowViewerRead, networkMapController.getDeliveryRoutesMeta);
router.get('/delivery-routes/points', ...allowViewerRead, networkMapController.listDeliveryPoints);

// ---- Import / Export / History / Rollback (admin only, Phase 3) ----
router.post('/service-points/import/preview', ...allowAdminOnly, upload.single('file'), networkImportController.previewServicePoints);
router.post('/service-points/import/confirm', ...allowAdminOnly, networkImportController.confirmServicePoints);
router.get('/service-points/export', ...allowAdminOnly, networkImportController.exportServicePoints);

router.post('/level2-routes/import/preview', ...allowAdminOnly, upload.single('file'), networkImportController.previewLevel2Routes);
router.post('/level2-routes/import/confirm', ...allowAdminOnly, networkImportController.confirmLevel2Routes);
router.get('/level2-routes/export', ...allowAdminOnly, networkImportController.exportLevel2Routes);

router.post('/delivery-routes/import/preview', ...allowAdminOnly, upload.single('file'), networkImportController.previewDeliveryRoutes);
router.post('/delivery-routes/import/confirm', ...allowAdminOnly, networkImportController.confirmDeliveryRoutes);
router.get('/delivery-routes/export/preview-count', ...allowAdminOnly, networkImportController.exportDeliveryRoutesPreview);
router.get('/delivery-routes/export', ...allowAdminOnly, networkImportController.exportDeliveryRoutes);

router.get('/import/history/:module', ...allowAdminOnly, networkImportController.importHistory);
router.post('/import/:importLogId/rollback', ...allowAdminOnly, networkImportController.rollback);

module.exports = router;
