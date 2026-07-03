'use strict';

/**
 * importService.js
 *
 * API-facing import orchestrator.
 * Bridges HTTP upload request → excelParser → importParsedData → response.
 *
 * Technical Design § 2.2 API 1: POST /api/f13/upload
 * Response: { success: boolean, total: number, inserted: number, errors: number }
 *
 * SSOT data_blueprint.md § 4 (Reimport):
 *   If data already exists for ngay_do_kiem AND forceReimport = false:
 *   return { requiresConfirmation: true } so the UI can prompt the user.
 *   If forceReimport = true: proceed with DELETE + re-import.
 */

const fs = require('fs');
const path = require('path');
const { executeImport, BASE_INCOMING } = require('./importPipeline');

/**
 * Process an uploaded F1.3 Excel file.
 *
 * @param {string}  filename       Original filename (e.g. 'F1.3-2026.06.18.xlsx')
 * @param {Buffer}  fileBuffer     Raw file buffer from multer (memoryStorage)
 * @param {boolean} forceReimport  true = overwrite existing data for that date
 *
 * @returns {Promise<{
 *   requiresConfirmation?: boolean,   — if true, caller must re-submit with forceReimport=true
 *   ngay_do_kiem?        : string,
 *   success?             : boolean,
 *   total?               : number,
 *   inserted?            : number,
 *   errors?              : number
 * }>}
 */
async function processImport(filename, fileBuffer, forceReimport = false, sourceDir = 'HUE', kpi = 'F1.3') {
    // 1. Save file to Incoming/<KPI>/<SOURCE>
    const baseIncoming = path.resolve(process.cwd(), `../Data DKCL/${kpi}/Incoming`);
    const incomingDir = path.join(baseIncoming, sourceDir);
    if (!fs.existsSync(incomingDir)) fs.mkdirSync(incomingDir, { recursive: true });
    
    const filePath = path.join(incomingDir, filename);
    fs.writeFileSync(filePath, fileBuffer);

    // If KPI is not supported for DB import yet, stop here.
    if (kpi !== 'F1.3') {
        return {
            success: true,
            total: 0,
            inserted: 0,
            skipped: 0,
            errors: 0,
            message: 'Chỉ tiêu hiện chưa hỗ trợ Import vào Database.',
            isUnsupportedKpi: true
        };
    }

    // 2. Call Unified Import Pipeline (currently F1.3 only)
    const result = await executeImport({ filePath, forceReimport, source: 'MANUAL' });

    // 3. If requires confirmation, delete the temp file so the watcher doesn't process it
    if (result && result.requiresConfirmation) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return result;
    }

    return {
        success : result.success,
        total   : result.total,
        inserted: result.inserted,
        skipped : result.skipped,
        errors  : result.errors
    };
}

module.exports = { processImport };
