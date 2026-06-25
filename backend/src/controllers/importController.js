'use strict';

/**
 * importController.js
 *
 * Handles HTTP requests for the Import Engine.
 *
 * Endpoints (registered in f13Routes.js / importRoutes.js):
 *   POST /api/f13/upload    — TD § 2.2 API 1: Upload & import F1.3 Excel
 *   GET  /api/import/f13/status — Import status dashboard
 *
 * Error Handling (TD § 2.3):
 *   - 400 Bad Request: Validation errors (filename format, missing columns)
 *   - 409 Conflict   : Date already exists, confirmation required
 *   - 500 Server     : DB errors
 */

const fs   = require('fs');
const path = require('path');

const { get, all }    = require('../config/db');
const { processImport } = require('../services/importService');

const INCOMING_DIR = path.resolve(process.cwd(), '../DataFKCL/F1.3/Incoming');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/f13/upload
// TD § 2.2 API 1 — Upload and import F1.3 Excel file.
// TD § 2.3 Error Handling — 400 for validation, 409 for reimport, 500 for DB.
// ─────────────────────────────────────────────────────────────────────────────
async function uploadF13File(req, res) {
    // Multer populates req.file when a file field named 'file' is submitted.
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error  : 'No file uploaded. Expected multipart/form-data with field: file'
        });
    }

    const filename    = req.file.originalname;
    const fileBuffer  = req.file.buffer;
    // forceReimport = true when frontend sends ?force=true after user confirmation
    const forceReimport = req.query.force === 'true';

    try {
        const result = await processImport(filename, fileBuffer, forceReimport);

        // SSOT § 4: Date already has data — ask frontend to prompt user
        if (result.requiresConfirmation) {
            return res.status(409).json({
                success             : false,
                requiresConfirmation: true,
                ngay_do_kiem        : result.ngay_do_kiem,
                message             : `Đã tồn tại dữ liệu ngày đo kiểm ${result.ngay_do_kiem}. Gửi lại với ?force=true để ghi đè.`
            });
        }

        // TD § 2.2 API 1 response: { success, total, inserted, errors }
        return res.status(200).json(result);

    } catch (error) {
        // TD § 2.3: Validation errors → 400, DB errors → 500
        const isValidationError =
            error.message.includes('Invalid filename') ||
            error.message.includes('Required column') ||
            error.message.includes('Invalid Excel format');

        const statusCode = isValidationError ? 400 : 500;
        return res.status(statusCode).json({
            success: false,
            error  : error.message
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/import/f13/status
// ─────────────────────────────────────────────────────────────────────────────
async function getImportStatus(req, res) {
    try {
        let pendingFiles = 0;
        if (fs.existsSync(INCOMING_DIR)) {
            pendingFiles = fs.readdirSync(INCOMING_DIR).filter(f => f.endsWith('.xlsx')).length;
        }

        const statsSql = `
            SELECT
                SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successCount,
                SUM(CASE WHEN status = 'FAILED'  THEN 1 ELSE 0 END) as failCount,
                MAX(created_at) as lastImportTime
            FROM import_log
        `;
        const stats = await get(statsSql);

        const logsSql = `
            SELECT id,
                   file_name    as ten_file,
                   ngay_do_kiem as ngay_so_lieu,
                   status       as trang_thai,
                   total_records  as so_luong_bg,
                   error_records  as so_loi,
                   skipped_records as so_bi_bo_qua,
                   created_at     as ngay_import
            FROM import_log
            ORDER BY id DESC
            LIMIT 20
        `;
        const logs = await all(logsSql);

        res.json({
            success: true,
            data: {
                pendingCount: pendingFiles,
                successCount: stats.successCount || 0,
                failCount   : stats.failCount    || 0,
                lastImport  : stats.lastImportTime || null,
                recentLogs  : logs
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    uploadF13File,
    getImportStatus
};
