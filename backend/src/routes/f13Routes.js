const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const kpiController    = require('../controllers/kpiController');
const importController = require('../controllers/importController');

// Multer: store file in memory (Buffer) for direct parsing — no temp file on disk
// TD § 2.2 API 1: multipart/form-data, field: 'file'
const upload = multer({
    storage: multer.memoryStorage(),
    limits : { fileSize: 50 * 1024 * 1024 },   // 50 MB max
    fileFilter: (_req, file, cb) => {
        // Accept only .xlsx files
        if (file.originalname.endsWith('.xlsx')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only .xlsx files are accepted.'));
        }
    }
});

// ── KPI & Dashboard ──────────────────────────────────────────────────────────
router.get('/dashboard/kpi',    kpiController.getDashboardKpi);
router.get('/dashboard/trend',  kpiController.getDashboardTrend);
router.get('/dashboard/quality-timeline', kpiController.getQualityTimeline);
router.get('/dashboard/top',    kpiController.getDashboardTop);
router.get('/dashboard/recommendations', kpiController.getRecommendations);
router.get('/bcvh-ranking',     kpiController.getBcvhRanking);
router.get('/bcvh-list',        kpiController.getBcvhList);

// ── Import (TD § 2.2 API 1) ─────────────────────────────────────────────────
// POST /api/f13/upload?force=true   (force=true for reimport confirmation)
router.post('/upload', upload.single('file'), importController.uploadF13File);

module.exports = router;
