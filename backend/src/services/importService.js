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

const { get }                                            = require('../config/db');
const { extractDateFromFilename, parseF13Excel }         = require('./excelParser');
const { importParsedData }                               = require('./importProcessor');

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
async function processImport(filename, fileBuffer, forceReimport = false) {
    // Step 1: Validate filename and extract ngay_do_kiem (SSOT: from filename only)
    const ngay_do_kiem = extractDateFromFilename(filename);

    // Step 2: Parse Excel → 41-column static mapping
    const { parsedData, totalParsed } = parseF13Excel(fileBuffer);

    // Step 3: SSOT Reimport check — if date already has data and user hasn't confirmed
    if (!forceReimport) {
        const existing = await get(
            `SELECT id FROM import_log WHERE ngay_do_kiem = ? AND status = 'SUCCESS' LIMIT 1`,
            [ngay_do_kiem]
        );
        if (existing) {
            // Signal to the API layer to prompt the user for confirmation
            return {
                requiresConfirmation: true,
                ngay_do_kiem
            };
        }
    }

    // Step 4: Import to DB — delegate entirely to importParsedData (Task 2.2)
    // TD § 2.1: INSERT OR IGNORE, error_records = total_parsed - total_inserted
    const result = await importParsedData({
        parsedData,
        ngay_do_kiem,
        filename,
        forceReimport
    });

    // Step 5: Return TD § 2.2 API 1 response shape
    return {
        success : result.success,
        total   : result.total,
        inserted: result.inserted,
        errors  : result.errors      // error_records = duplicates skipped by IGNORE
    };
}

module.exports = { processImport };
