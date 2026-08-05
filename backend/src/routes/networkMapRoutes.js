const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const networkMapController = require('../controllers/NetworkMapController');

const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];
const allowAdminOnly = [requireAuth, requireRole(['admin'])];

router.get('/service-points', ...allowViewerRead, networkMapController.listServicePoints);
router.post('/service-points/import', ...allowAdminOnly, networkMapController.importServicePoints);

router.get('/level2-routes', ...allowViewerRead, networkMapController.listLevel2Routes);
router.post('/level2-routes/import', ...allowAdminOnly, networkMapController.importLevel2Routes);

router.get('/delivery-routes/meta', ...allowViewerRead, networkMapController.getDeliveryRoutesMeta);
router.get('/delivery-routes/points', ...allowViewerRead, networkMapController.listDeliveryPoints);
router.post('/delivery-routes/import', ...allowAdminOnly, networkMapController.importDeliveryRoutes);

module.exports = router;
