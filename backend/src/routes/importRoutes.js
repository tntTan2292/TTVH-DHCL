const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');

router.get('/f13/status', importController.getImportStatus);

module.exports = router;
