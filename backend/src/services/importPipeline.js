'use strict';

const fs = require('fs');
const path = require('path');
const { get, run } = require('../config/db');
const {
    getIndicatorConfig,
    resolveContextFromFilePath,
    operationalDataRoot,
    configuredTestDataRoot,
} = require('./importIndicatorRegistry');
const {
    importParsedData,
    importNationalParsedData,
    importF41ParsedData,
    importF41NationalParsedData,
} = require('./importProcessor');

const dataRoot = getIndicatorConfig('F1.3').root;
const BASE_INCOMING = path.join(dataRoot, 'Incoming');
const BASE_PROCESSING = path.join(dataRoot, 'Processing');
const BASE_PROCESSED = path.join(dataRoot, 'Processed');
const BASE_ERROR = path.join(dataRoot, 'Error');
const BASE_QUARANTINE = path.join(dataRoot, 'Quarantine');
const HUE_COMMITTED_STATUSES = new Set(['SUCCESS', 'FILE_MOVE_FAILED']);

function isMissingFileError(error) {
    return error?.code === 'ENOENT' || error?.code === 'EPERM';
}

function claimIncomingFile(filePath, indicatorConfig = getIndicatorConfig('F1.3'), relativePathOverride = null) {
    const filename = path.basename(filePath);
    const relativePath = relativePathOverride || path.relative(indicatorConfig.incomingDir, path.dirname(filePath));
    const processingDir = path.join(indicatorConfig.processingDir, relativePath);
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
    return getCommittedEvidence({ ngay_do_kiem, indicator: 'F1.3', factTable: 'fact_f13' });
}

async function getCommittedEvidence({ ngay_do_kiem, indicator, factTable }) {
    const row = await get(
        `SELECT log.id, log.status, COUNT(fact.id) AS fact_count
         FROM import_log log
         LEFT JOIN ${factTable} fact ON fact.import_log_id = log.id
         WHERE log.ngay_do_kiem = ?
           AND COALESCE(log.indicator, 'F1.3') = ?
           AND log.status IN ('SUCCESS', 'FILE_MOVE_FAILED')
         GROUP BY log.id, log.status
         HAVING COUNT(fact.id) > 0
         ORDER BY log.id DESC
         LIMIT 1`,
        [ngay_do_kiem, indicator]
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

function quarantineStaleProcessedEvidence({ indicatorConfig = getIndicatorConfig('F1.3'), relativePath, filename, clock = () => new Date() }) {
    const processedPath = path.join(indicatorConfig.processedDir, relativePath, filename);
    if (!fs.existsSync(processedPath)) return null;
    const quarantineDir = path.join(indicatorConfig.quarantineDir, relativePath);
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
async function executeImport({ filePath, forceReimport = false, source = 'AUTO', indicator = null, lane = null }) {
    const context = resolveContextFromFilePath(filePath, { indicator, lane });
    const { indicatorConfig, laneConfig } = context;
    const claim = claimIncomingFile(filePath, indicatorConfig, context.relativePath);
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
        ngay_do_kiem = indicatorConfig.extractDate(filename);

        // 2. Check Reimport (only if not forced)
        if (!forceReimport) {
            const existing = laneConfig.lane === 'TCT'
                ? await get(
                    `SELECT id, status FROM import_log
                     WHERE ngay_do_kiem = ?
                       AND COALESCE(indicator, 'F1.3') = ?
                       AND source_lane = 'TCT'
                       AND status = 'SUCCESS'
                     LIMIT 1`,
                    [ngay_do_kiem, laneConfig.indicator]
                )
                : await getCommittedEvidence({
                    ngay_do_kiem,
                    indicator: laneConfig.indicator,
                    factTable: laneConfig.targetTable,
                });
            if (existing) {
                try {
                    moveFile(indicatorConfig.incomingDir);
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

        if (laneConfig.lane === 'TCT') {
            const buffer = fs.readFileSync(processingPath);
            const parsed = laneConfig.parser(buffer, filename);
            parsedData = parsed.parsedData;
            totalParsed = parsed.totalParsed;

            importStarted = true;
            result = laneConfig.indicator === 'F4.1'
                ? await importF41NationalParsedData({ parsedData, ngay_do_kiem, filename, forceReimport, triggerSource: source })
                : await importNationalParsedData({ parsedData, ngay_do_kiem, filename, forceReimport, indicator: 'F1.3', sourceLane: 'TCT', triggerSource: source });
        } else {
            quarantineStaleProcessedEvidence({ indicatorConfig, relativePath, filename });
            const buffer = fs.readFileSync(processingPath);
            const parsed = laneConfig.parser(buffer, filename);
            parsedData = parsed.parsedData;
            totalParsed = parsed.totalParsed;

            importStarted = true;
            result = laneConfig.indicator === 'F4.1'
                ? await importF41ParsedData({ parsedData, ngay_do_kiem, filename, forceReimport, triggerSource: source })
                : await importParsedData({ parsedData, ngay_do_kiem, filename, forceReimport, indicator: 'F1.3', sourceLane: 'HUE', triggerSource: source });
        }

        let moveResult = null;
        try {
            moveResult = moveFile(indicatorConfig.processedDir);
        } catch (moveError) {
            if (laneConfig.lane !== 'TCT' && result?.import_log_id) {
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
            verified_count: result.verified_count,
            processedPath: moveResult?.destinationPath || null
        };

    } catch (error) {
        console.error(`[importPipeline][${source}] FAILED | ${filename} | ${error.message}`);
        if (ngay_do_kiem && !importStarted) {
            try {
                await run(
                    `INSERT INTO import_log
                        (file_name, ngay_do_kiem, indicator, source_lane, trigger_source, status, total_records, error_records, skipped_records)
                     VALUES (?, ?, ?, ?, ?, 'FAILED', ?, ?, 0)`,
                    [filename, ngay_do_kiem, laneConfig.indicator, laneConfig.lane, source, totalParsed, totalParsed || 1]
                );
            } catch (logErr) {
                console.error(`[importPipeline] Could not write FAILED log for '${filename}': ${logErr.message}`);
            }
        }
        try {
            moveFile(indicatorConfig.errorDir);
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
    getHueCommittedEvidence,
    getCommittedEvidence,
    quarantineStaleProcessedEvidence,
    dataRoot,
    operationalDataRoot
};
