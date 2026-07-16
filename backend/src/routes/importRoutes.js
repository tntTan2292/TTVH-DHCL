const express = require('express');
const multer = require('multer');
const router = express.Router();
const importController = require('../controllers/importController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), importController.upload.bind(importController));
router.get('/f13/status', importController.status.bind(importController));
router.get('/status', importController.status.bind(importController));

module.exports = router;
