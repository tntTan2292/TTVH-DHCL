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
const BASE_QUARANTINE = path.resolve(process.cwd(), '../Data DKCL/F1.3/Quarantine');
const HUE_COMMITTED_STATUSES = new Set(['SUCCESS', 'FILE_MOVE_FAILED']);

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

function moveClaimedFile({ processingPath, filename, relativePath, destDir }) {
    const subDir = path.join(destDir, relativePath);
    const destinationPath = path.join(subDir, filename);
    if (!fs.existsSync(processingPath)) {
        return { moved: false, missing: true, destinationPath };
    }
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
    fs.renameSync(processingPath, destinationPath);
    return { moved: true, destinationPath };
}

async function getHueCommittedEvidence(ngay_do_kiem) {
    const row = await get(
        `SELECT log.id, log.status, COUNT(fact.id) AS fact_count
         FROM import_log log
         LEFT JOIN fact_f13 fact ON fact.import_log_id = log.id
         WHERE log.ngay_do_kiem = ?
           AND log.status IN ('SUCCESS', 'FILE_MOVE_FAILED')
         GROUP BY log.id, log.status
         HAVING COUNT(fact.id) > 0
         ORDER BY log.id DESC
         LIMIT 1`,
        [ngay_do_kiem]
    );
    if (!row || !HUE_COMMITTED_STATUSES.has(row.status) || Number(row.fact_count || 0) <= 0) {
        return null;
    }
    return {
        id: row.id,
        status: row.status,
        factCount: Number(row.fact_count || 0)
    };
}

async function verifyHueImportCommit({ ngay_do_kiem, importLogId, inserted, filename }) {
    const fact = await get(
        `SELECT COUNT(*) AS fact_count
         FROM fact_f13
         WHERE ngay_do_kiem = ? AND import_log_id = ?`,
        [ngay_do_kiem, importLogId]
    );
    const factCount = Number(fact?.fact_count || 0);
    if (factCount <= 0 || factCount !== Number(inserted || 0)) {
        await run(
            `UPDATE import_log
             SET status = 'FAILED',
                 error_records = total_records,
                 skipped_records = 0
             WHERE id = ?`,
            [importLogId]
        );
        const error = new Error(`HUE F1.3 import commit verification failed for ${filename}: expected ${inserted} rows, found ${factCount}.`);
        error.code = 'IMPORT_COMMIT_VERIFICATION_FAILED';
        error.factCount = factCount;
        error.expectedCount = Number(inserted || 0);
        throw error;
    }
    return factCount;
}

async function recordRecoverableFileMoveFailure({ importLogId, filename, ngay_do_kiem, moveError }) {
    await run(
        `UPDATE import_log
         SET status = 'FILE_MOVE_FAILED',
             error_records = 0
         WHERE id = ?`,
        [importLogId]
    );
    return {
        success: false,
        committed: true,
        recoverable: true,
        status: 'FILE_MOVE_FAILED',
        filename,
        ngay_do_kiem,
        error: moveError?.message || 'Processed file move failed after database commit.'
    };
}

function quarantineStaleProcessedEvidence({ relativePath, filename, clock = () => new Date() }) {
    const processedPath = path.join(BASE_PROCESSED, relativePath, filename);
    if (!fs.existsSync(processedPath)) return null;
    const quarantineDir = path.join(BASE_QUARANTINE, relativePath);
    if (!fs.existsSync(quarantineDir)) fs.mkdirSync(quarantineDir, { recursive: true });
    const parsed = path.parse(filename);
    const quarantinePath = path.join(
        quarantineDir,
        `${parsed.name}.stale-${clock().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}${parsed.ext}`
    );
    fs.renameSync(processedPath, quarantinePath);
    return quarantinePath;
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
    const moveFile = (destDir) => moveClaimedFile({ processingPath, filename, relativePath, destDir });

    try {
        // 1. Validate & Extract Date
        ngay_do_kiem = extractDateFromFilename(filename);

        // 2. Check Reimport (only if not forced)
        if (!forceReimport) {
            const existing = relativePath.startsWith('TCT') || relativePath === 'TCT'
                ? await get(
                    `SELECT id FROM import_log WHERE ngay_do_kiem = ? AND status = 'SUCCESS' LIMIT 1`,
                    [ngay_do_kiem]
                )
                : await getHueCommittedEvidence(ngay_do_kiem);
            if (existing) {
                try {
                    moveFile(BASE_INCOMING);
                } catch (moveBackError) {
                    console.error(`[importPipeline] Cannot return confirmed file '${filename}' to Incoming: ${moveBackError.message}`);
                }
                return {
                    requiresConfirmation: true,
                    ngay_do_kiem,
                    existingStatus: existing.status || 'SUCCESS',
                    existingFactCount: existing.factCount || null
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
            quarantineStaleProcessedEvidence({ relativePath, filename });
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
            await verifyHueImportCommit({
                ngay_do_kiem,
                importLogId: result.import_log_id,
                inserted: result.inserted,
                filename
            });
        }

        let moveResult = null;
        try {
            moveResult = moveFile(BASE_PROCESSED);
        } catch (moveError) {
            if (!(relativePath.startsWith('TCT') || relativePath === 'TCT') && result?.import_log_id) {
                console.error(`[importPipeline][${source}] FILE_MOVE_FAILED | ${filename} | ${moveError.message}`);
                return recordRecoverableFileMoveFailure({
                    importLogId: result.import_log_id,
                    filename,
                    ngay_do_kiem,
                    moveError
                });
            }
            throw moveError;
        }

        console.log(`[importPipeline][${source}] SUCCESS | ${filename} | total=${result.total}, inserted=${result.inserted}, duplicates=${result.errors}`);

        return {
            success: result.success,
            total: result.total,
            inserted: result.inserted,
            skipped: result.skipped,
            errors: result.errors,
            ngay_do_kiem,
            processedPath: moveResult?.destinationPath || null
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
        try {
            moveFile(BASE_ERROR);
        } catch (moveError) {
            console.error(`[importPipeline] Cannot move failed file '${filename}' to Error: ${moveError.message}`);
        }
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
    BASE_ERROR,
    BASE_QUARANTINE,
    verifyHueImportCommit,
    getHueCommittedEvidence,
    quarantineStaleProcessedEvidence
};
