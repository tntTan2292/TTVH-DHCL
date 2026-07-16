'use strict';

const fs = require('fs');
const path = require('path');
const { get } = require('../config/db');
const { extractDateFromFilename, parseF13Excel } = require('./excelParser');
const { parseF13NationalExcel } = require('./nationalExcelParser');
const { importParsedData, importNationalParsedData } = require('./importProcessor');

const BASE_INCOMING = path.resolve(process.cwd(), '../Data DKCL/F1.3/Incoming');
const BASE_PROCESSED = path.resolve(process.cwd(), '../Data DKCL/F1.3/Processed');
const BASE_ERROR = path.resolve(process.cwd(), '../Data DKCL/F1.3/Error');

/**
 * Unified Import Pipeline
 * 
 * @param {string} filePath - Path to the file in Incoming directory
 * @param {boolean} forceReimport - Whether to overwrite existing data
 * @param {string} source - 'AUTO' or 'MANUAL'
 */
async function executeImport({ filePath, forceReimport = false, source = 'AUTO' }) {
    // If the file was already processed by another process (e.g. race condition), skip
    if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File already processed or does not exist.' };
    }

    const filename = path.basename(filePath);
    let ngay_do_kiem = null;

    // Relative path for sub-directory (e.g. 'HUE' or 'TCT')
    const relativePath = path.relative(BASE_INCOMING, path.dirname(filePath));

    const moveFile = (destDir) => {
        try {
            const subDir = path.join(destDir, relativePath);
            if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
            
            if (fs.existsSync(filePath)) {
                fs.renameSync(filePath, path.join(subDir, filename));
            }
        } catch (e) {
            console.error(`[importPipeline] Cannot move file '${filename}': ${e.message}`);
        }
    };

    try {
        // 1. Validate & Extract Date
        ngay_do_kiem = extractDateFromFilename(filename);

        // 2. Check Reimport (only if not forced)
        if (!forceReimport) {
            const existing = await get(
                `SELECT id FROM import_log WHERE ngay_do_kiem = ? AND status = 'SUCCESS' LIMIT 1`,
                [ngay_do_kiem]
            );
            if (existing) {
                return {
                    requiresConfirmation: true,
                    ngay_do_kiem
                };
            }
        }

        let parsedData, totalParsed, result;

        if (relativePath.startsWith('TCT') || relativePath === 'TCT') {
            const buffer = fs.readFileSync(filePath);
            const parsed = parseF13NationalExcel(buffer);
            parsedData = parsed.parsedData;
            totalParsed = parsed.totalParsed;

            result = await importNationalParsedData({
                parsedData,
                ngay_do_kiem,
                filename,
                forceReimport
            });
        } else {
            const buffer = fs.readFileSync(filePath);
            const parsed = parseF13Excel(buffer);
            parsedData = parsed.parsedData;
            totalParsed = parsed.totalParsed;

            result = await importParsedData({
                parsedData,
                ngay_do_kiem,
                filename,
                forceReimport
            });
        }

        console.log(`[importPipeline][${source}] SUCCESS | ${filename} | total=${result.total}, inserted=${result.inserted}, duplicates=${result.errors}`);

        // 5. Move File
        moveFile(BASE_PROCESSED);

        return {
            success: result.success,
            total: result.total,
            inserted: result.inserted,
            skipped: result.skipped,
            errors: result.errors,
            ngay_do_kiem
        };

    } catch (error) {
        console.error(`[importPipeline][${source}] FAILED | ${filename} | ${error.message}`);
        moveFile(BASE_ERROR);
        throw error; // Re-throw to caller (Watcher or API)
    }
}

module.exports = {
    executeImport,
    processImport: executeImport,
    BASE_INCOMING,
    BASE_PROCESSED,
    BASE_ERROR
};
