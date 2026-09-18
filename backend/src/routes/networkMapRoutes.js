const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const networkMapController = require('../controllers/NetworkMapController');
const networkImportController = require('../controllers/NetworkImportController');
const postmanCatalogController = require('../controllers/PostmanCatalogController');

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

// ---- Rà soát danh mục bưu tá (F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1) ----
router.get('/postman-catalog', ...allowViewerRead, postmanCatalogController.getDirectory);
router.get('/postman-catalog/unnamed', ...allowViewerRead, postmanCatalogController.getUnnamed);
router.get('/postman-catalog/conflicts', ...allowViewerRead, postmanCatalogController.getConflicts);
router.get('/postman-catalog/history', ...allowAdminOnly, postmanCatalogController.getHistory);
router.post('/postman-catalog/import/preview', ...allowAdminOnly, upload.single('file'), postmanCatalogController.previewImport);
router.post('/postman-catalog/import/confirm', ...allowAdminOnly, postmanCatalogController.confirmImport);
router.put('/postman-catalog/:ma_buu_ta', ...allowAdminOnly, postmanCatalogController.putManual);
router.post('/postman-catalog/conflicts/:id/resolve', ...allowAdminOnly, postmanCatalogController.postResolveConflict);
router.post('/postman-catalog/rollback/:batchId', ...allowAdminOnly, postmanCatalogController.postRollback);

module.exports = router;
