'use strict';

const fs = require('fs');
const path = require('path');
const { get, run } = require('../config/db');
const { extractDateFromFilename, parseF13Excel } = require('./excelParser');
const { parseF13NationalExcel } = require('./nationalExcelParser');
const { importParsedData, importNationalParsedData } = require('./importProcessor');

const BASE_INCOMING = path.resolve(process.cwd(), '../Data DKCL/F1.3/Incoming');
const BASE_PROCESSING = path.resolve(process.cwd(), '../Data DKCL/F1.3/Processing');
const BASE_PROCESSED = path.resolve(process.cwd(), '../Data DKCL/F1.3/Processed');
const BASE_ERROR = path.resolve(process.cwd(), '../Data DKCL/F1.3/Error');

function isMissingFileError(error) {
    return error?.code === 'ENOENT' || error?.code === 'EPERM';
}

function claimIncomingFile(filePath) {
    const filename = path.basename(filePath);
    const relativePath = path.relative(BASE_INCOMING, path.dirname(filePath));
    const processingDir = path.join(BASE_PROCESSING, relativePath);
    const processingPath = path.join(processingDir, filename);

    if (!fs.existsSync(filePath)) {
        return {
            claimed: false,
            alreadyClaimed: true,
            filename,
            relativePath,
            originalPath: filePath,
            processingPath
        };
    }

    if (!fs.existsSync(processingDir)) fs.mkdirSync(processingDir, { recursive: true });

    try {
        fs.renameSync(filePath, processingPath);
        return {
            claimed: true,
            alreadyClaimed: false,
            filename,
            relativePath,
            originalPath: filePath,
            processingPath
        };
    } catch (error) {
        if (isMissingFileError(error) || fs.existsSync(processingPath)) {
            return {
                claimed: false,
                alreadyClaimed: true,
                filename,
                relativePath,
                originalPath: filePath,
                processingPath
            };
        }
        throw error;
    }
}

/**
 * Unified Import Pipeline
 * 
 * @param {string} filePath - Path to the file in Incoming directory
 * @param {boolean} forceReimport - Whether to overwrite existing data
 * @param {string} source - 'AUTO' or 'MANUAL'
 */
async function executeImport({ filePath, forceReimport = false, source = 'AUTO' }) {
    const claim = claimIncomingFile(filePath);
    if (!claim.claimed) {
        console.log(`[importPipeline][${source}] SKIP | ${claim.filename} | already claimed or processed`);
        return {
            success: false,
            skipped: true,
            alreadyClaimed: true,
            error: 'File already claimed or processed by another importer.'
        };
    }

    const filename = claim.filename;
    const processingPath = claim.processingPath;
    let ngay_do_kiem = null;
    let importStarted = false;
    let totalParsed = 0;

    // Relative path for sub-directory (e.g. 'HUE' or 'TCT')
    const relativePath = claim.relativePath;

    const moveFile = (destDir) => {
        try {
            const subDir = path.join(destDir, relativePath);
            if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
            
            if (fs.existsSync(processingPath)) {
                fs.renameSync(processingPath, path.join(subDir, filename));
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
                moveFile(BASE_INCOMING);
                return {
                    requiresConfirmation: true,
                    ngay_do_kiem
                };
            }
        }

        let parsedData, result;

        if (relativePath.startsWith('TCT') || relativePath === 'TCT') {
            const buffer = fs.readFileSync(processingPath);
            const parsed = parseF13NationalExcel(buffer);
            parsedData = parsed.parsedData;
            totalParsed = parsed.totalParsed;

            importStarted = true;
            result = await importNationalParsedData({
                parsedData,
                ngay_do_kiem,
                filename,
                forceReimport
            });
        } else {
            const buffer = fs.readFileSync(processingPath);
            const parsed = parseF13Excel(buffer);
            parsedData = parsed.parsedData;
            totalParsed = parsed.totalParsed;

            importStarted = true;
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
        if (ngay_do_kiem && !importStarted) {
            try {
                await run(
                    `INSERT INTO import_log
                        (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
                     VALUES (?, ?, 'FAILED', ?, ?, 0)`,
                    [filename, ngay_do_kiem, totalParsed, totalParsed || 1]
                );
            } catch (logErr) {
                console.error(`[importPipeline] Could not write FAILED log for '${filename}': ${logErr.message}`);
            }
        }
        moveFile(BASE_ERROR);
        throw error; // Re-throw to caller (Watcher or API)
    }
}

module.exports = {
    executeImport,
    processImport: executeImport,
    claimIncomingFile,
    BASE_INCOMING,
    BASE_PROCESSING,
    BASE_PROCESSED,
    BASE_ERROR
};
