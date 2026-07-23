'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { get, all } = require('../config/db');
const { parseF13Excel } = require('./excelParser');
const {
    executeImport,
    BASE_INCOMING,
    BASE_PROCESSED,
    BASE_ERROR
} = require('./importPipeline');

const STATUSES = Object.freeze({
    QUEUED: 'QUEUED',
    RUNNING: 'RUNNING',
    ALREADY_COMPLETED: 'ALREADY_COMPLETED',
    WAITING_FOR_EXPORT: 'WAITING_FOR_EXPORT',
    DOWNLOADING: 'DOWNLOADING',
    VALIDATING: 'VALIDATING',
    WAITING_FOR_IMPORT: 'WAITING_FOR_IMPORT',
    SUCCESS: 'SUCCESS',
    NO_DATA: 'NO_DATA',
    FAILED: 'FAILED',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED'
});

const DEFAULT_CONFIG = Object.freeze({
    enabled: process.env.DKCL_HUE_AUTOMATION_ENABLED === 'true',
    portalBaseUrl: process.env.PORTAL_BASE_URL || 'https://dkcl.vnpost.vn/',
    rawDownloadDir: process.env.DKCL_HUE_RAW_DOWNLOAD_DIR || path.resolve(process.cwd(), '../portal-downloads/dkcl/hue/f13/raw'),
    profileDir: process.env.DKCL_HUE_PROFILE_DIR || path.resolve(process.cwd(), '../Data DKCL/BrowserProfiles/HUE'),
    generationPollingIntervalMs: Number(process.env.DKCL_HUE_GENERATION_POLL_INTERVAL_MS || 30000),
    generationTimeoutMs: Number(process.env.DKCL_HUE_GENERATION_TIMEOUT_MS || 900000),
    importCompletionTimeoutMs: Number(process.env.DKCL_HUE_IMPORT_COMPLETION_TIMEOUT_MS || 120000)
});

function normalizeDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
        const error = new Error('measurement_date must use YYYY-MM-DD format.');
        error.code = 'INVALID_DATE';
        throw error;
    }
    return String(value);
}

function standardizedFilename(measurementDate) {
    return `F1.3-${measurementDate.replace(/-/g, '.')}.xlsx`;
}

function safeErrorMessage(error) {
    const message = String(error?.safeMessage || error?.message || 'DKCL Hue F1.3 sync failed.');
    return message
        .replace(/PORTAL_HUE_PASSWORD=[^\s]+/g, 'PORTAL_HUE_PASSWORD=[REDACTED]')
        .replace(/PORTAL_HUE_USERNAME=[^\s]+/g, 'PORTAL_HUE_USERNAME=[REDACTED]')
        .replace(/PORTAL_HUE_HRM_CODE=[^\s]+/g, 'PORTAL_HUE_HRM_CODE=[REDACTED]')
        .replace(/username["']?\s*[:=]\s*["']?[^"',\s]+/ig, 'username=[REDACTED]')
        .replace(/password["']?\s*[:=]\s*["']?[^"',\s]+/ig, 'password=[REDACTED]')
        .replace(/hrm(code)?["']?\s*[:=]\s*["']?[^"',\s]+/ig, 'hrm=[REDACTED]')
        .replace(/cookie["']?\s*[:=]\s*["']?[^"',\s]+/ig, 'cookie=[REDACTED]')
        .replace(/csrf["']?\s*[:=]\s*["']?[^"',\s]+/ig, 'csrf=[REDACTED]')
        .replace(/authorization["']?\s*[:=]\s*["']?[^"',\s]+/ig, 'authorization=[REDACTED]')
        .replace(/[A-Z]:\\[^\r\n]*BrowserProfiles[^\r\n]*/ig, '[PROFILE_PATH_REDACTED]')
        .replace(/Data DKCL[\\/]+BrowserProfiles[^\r\n]*/ig, '[PROFILE_PATH_REDACTED]');
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isLikelyXlsx(filePath) {
    const header = fs.readFileSync(filePath, { encoding: null, flag: 'r' }).subarray(0, 4);
    return header.length === 4 && header[0] === 0x50 && header[1] === 0x4b;
}

function createRunId(clock = () => new Date()) {
    const seed = `${clock().toISOString()}-${crypto.randomBytes(8).toString('hex')}`;
    return `hue-f13-${crypto.createHash('sha1').update(seed).digest('hex').slice(0, 12)}`;
}

function selectNewestGeneratedFile(files, { requestedAt, match }) {
    const requestedTime = requestedAt instanceof Date ? requestedAt.getTime() : new Date(requestedAt).getTime();
    const candidates = (files || [])
        .filter((file) => String(file.filename || '').includes(match))
        .filter((file) => new Date(file.createdAt).getTime() > requestedTime)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return candidates[0] || null;
}

function createTimeoutError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

class DkclPortalClientNotConfigured {
    async authenticate() {
        const error = new Error('DKCL Hue portal client is not configured for live acquisition.');
        error.code = 'PORTAL_CLIENT_NOT_CONFIGURED';
        error.safeMessage = 'DKCL Hue portal client is not configured for live acquisition.';
        throw error;
    }
}

class DkclHueF13SyncService {
    constructor(options = {}) {
        this.config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
        this.portalClient = options.portalClient || new DkclPortalClientNotConfigured();
        this.executeImport = options.executeImport || executeImport;
        this.db = options.db || { get, all };
        this.fs = options.fs || fs;
        this.path = options.path || path;
        this.clock = options.clock || (() => new Date());
        this.runs = new Map();
        this.activeRunId = null;
        this.logger = options.logger || console;
    }

    getRun(runId) {
        return this.runs.get(runId) || null;
    }

    hasActiveRun() {
        const run = this.activeRunId ? this.runs.get(this.activeRunId) : null;
        return !!run && ![
            STATUSES.SUCCESS,
            STATUSES.NO_DATA,
            STATUSES.FAILED,
            STATUSES.AUTHENTICATION_REQUIRED,
            STATUSES.ALREADY_COMPLETED,
            STATUSES.MANUAL_REVIEW_REQUIRED
        ].includes(run.status);
    }

    async start(measurementDate, options = {}) {
        const normalizedDate = normalizeDate(measurementDate);

        if (this.hasActiveRun()) {
            return {
                accepted: false,
                status: 'IN_PROGRESS',
                run: this.publicRun(this.runs.get(this.activeRunId))
            };
        }

        const completed = await this.checkCompleted(normalizedDate);
        if (completed.complete) {
            const run = this.createRun(normalizedDate);
            this.updateRun(run, {
                status: STATUSES.ALREADY_COMPLETED,
                endTime: this.clock().toISOString(),
                standardizedFilename: standardizedFilename(normalizedDate),
                importedCount: completed.rowCount,
                finalFileLocation: completed.processedPath
            });
            return { accepted: false, status: STATUSES.ALREADY_COMPLETED, run: this.publicRun(run) };
        }

        if (completed.inconsistent) {
            const run = this.createRun(normalizedDate);
            this.updateRun(run, {
                status: STATUSES.MANUAL_REVIEW_REQUIRED,
                endTime: this.clock().toISOString(),
                safeErrorMessage: completed.reason
            });
            return { accepted: false, status: STATUSES.MANUAL_REVIEW_REQUIRED, run: this.publicRun(run) };
        }

        if (!this.config.enabled) {
            const run = this.createRun(normalizedDate);
            this.updateRun(run, {
                status: STATUSES.FAILED,
                endTime: this.clock().toISOString(),
                safeErrorMessage: 'DKCL Hue automation is disabled by configuration.'
            });
            return { accepted: false, status: STATUSES.FAILED, run: this.publicRun(run) };
        }

        const run = this.createRun(normalizedDate);
        this.activeRunId = run.runId;
        this.runWorkflow(run, options).finally(() => {
            if (this.activeRunId === run.runId) this.activeRunId = null;
        });

        return { accepted: true, status: STATUSES.QUEUED, run: this.publicRun(run) };
    }

    createRun(measurementDate) {
        const run = {
            runId: createRunId(this.clock),
            measurementDate,
            status: STATUSES.QUEUED,
            startTime: this.clock().toISOString(),
            endTime: null,
            portalDetailTotal: null,
            generatedPortalFilename: null,
            downloadedFilename: null,
            selectedFilters: null,
            portalSummaryTotal: null,
            detailTableTotal: null,
            detailMetric: null,
            sha256: null,
            workbookRowCount: null,
            standardizedFilename: standardizedFilename(measurementDate),
            importedCount: null,
            finalFileLocation: null,
            safeErrorMessage: null,
            cleanupWarning: null
        };
        this.runs.set(run.runId, run);
        return run;
    }

    updateRun(run, patch) {
        Object.assign(run, patch);
        this.runs.set(run.runId, run);
    }

    publicRun(run) {
        if (!run) return null;
        return { ...run };
    }

    async checkCompleted(measurementDate) {
        const filename = standardizedFilename(measurementDate);
        const processedPath = this.path.join(BASE_PROCESSED, 'HUE', filename);
        const row = await this.db.get(
            `SELECT COUNT(*) AS row_count, COUNT(DISTINCT ma_bg) AS distinct_count
             FROM fact_f13
             WHERE ngay_do_kiem = ?`,
            [measurementDate]
        );
        const logs = await this.db.all(
            `SELECT status, total_records, error_records, skipped_records
             FROM import_log
             WHERE ngay_do_kiem = ? OR file_name = ?
             ORDER BY id ASC`,
            [measurementDate, filename]
        );

        const rowCount = Number(row?.row_count || 0);
        const distinctCount = Number(row?.distinct_count || 0);
        const successLogs = logs.filter((log) => log.status === 'SUCCESS');
        const hasProcessedFile = this.fs.existsSync(processedPath);

        if (rowCount > 0 && distinctCount === rowCount && successLogs.length > 0 && hasProcessedFile) {
            return { complete: true, rowCount, distinctCount, processedPath };
        }

        if (rowCount > 0 && distinctCount !== rowCount) {
            return {
                inconsistent: true,
                rowCount,
                distinctCount,
                reason: 'Existing Hue F1.3 database rows are not internally consistent.'
            };
        }

        if (rowCount > 0 || logs.length > 0 || hasProcessedFile) {
            return {
                complete: false,
                inconsistent: false,
                rowCount,
                distinctCount,
                staleEvidence: true,
                reason: 'No valid completed Hue F1.3 import evidence; stale logs/files do not block Update.'
            };
        }

        return { complete: false, inconsistent: false, rowCount, distinctCount };
    }

    async runWorkflow(run, options = {}) {
        const portalClient = options.portalClient || this.portalClient;
        const ownsPortalClient = !options.portalClient;
        try {
            this.updateRun(run, { status: STATUSES.RUNNING });
            if (!options.portalClient) {
                await portalClient.authenticate({
                    baseUrl: this.config.portalBaseUrl,
                    username: process.env.PORTAL_HUE_USERNAME,
                    password: process.env.PORTAL_HUE_PASSWORD,
                    hrmCode: process.env.PORTAL_HUE_HRM_CODE,
                    profileDir: this.config.profileDir,
                    requireExistingSession: options?.requireExistingSession
                });
            } else if (portalClient.isAuthenticated && !await portalClient.isAuthenticated().catch(() => false)) {
                const error = new Error('Existing Hue DKCL session is no longer authenticated.');
                error.code = 'AUTHENTICATION_REQUIRED';
                throw error;
            }

            await portalClient.openF13Report();
            await portalClient.submitFilters({
                groupBy: 'BC',
                provinceCode: '53',
                fromDate: run.measurementDate,
                toDate: run.measurementDate
            });
            if (portalClient.getSelectedFilters) {
                this.updateRun(run, {
                    selectedFilters: await portalClient.getSelectedFilters()
                });
            }

            const portalSummaryTotal = await portalClient.readDetailTotal();
            if (Number(portalSummaryTotal) === 0) {
                this.updateRun(run, {
                    portalDetailTotal: portalSummaryTotal,
                    portalSummaryTotal,
                    status: STATUSES.NO_DATA,
                    endTime: this.clock().toISOString()
                });
                return;
            }
            this.updateRun(run, {
                portalDetailTotal: portalSummaryTotal,
                portalSummaryTotal,
                status: STATUSES.WAITING_FOR_EXPORT
            });

            const exportRequestedAt = this.clock();
            const detailMetric = await portalClient.openDetailTable();
            const confirmedTotal = await portalClient.readDetailTableTotal();
            this.updateRun(run, {
                portalDetailTotal: Number(confirmedTotal),
                detailTableTotal: Number(confirmedTotal),
                detailMetric
            });
            if (
                Number(confirmedTotal) !== Number(detailMetric?.value || 0) &&
                Number(confirmedTotal) !== Number(portalSummaryTotal)
            ) {
                throw new Error('Portal detail table total differs from both selected visible metric total and summary total.');
            }
            await portalClient.requestDetailExport();

            const generatedFile = await portalClient.pollGeneratedFile({
                requestedAt: exportRequestedAt,
                timeoutMs: this.config.generationTimeoutMs,
                intervalMs: this.config.generationPollingIntervalMs,
                match: 'F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet'
            });
            if (!generatedFile) {
                throw createTimeoutError('Timed out waiting for generated DKCL F1.3 detail export.', 'EXPORT_TIMEOUT');
            }
            this.updateRun(run, {
                generatedPortalFilename: generatedFile.filename,
                status: STATUSES.DOWNLOADING
            });

            ensureDir(this.config.rawDownloadDir);
            const downloadedPath = await portalClient.downloadXlsx({
                file: generatedFile,
                targetDir: this.config.rawDownloadDir
            });
            const stablePath = await this.waitForStableFile(downloadedPath);
            if (!isLikelyXlsx(stablePath)) {
                const error = new Error('Downloaded file is not a valid XLSX workbook.');
                error.code = 'INVALID_XLSX';
                throw error;
            }
            this.updateRun(run, {
                downloadedFilename: this.path.basename(stablePath),
                sha256: sha256File(stablePath),
                status: STATUSES.VALIDATING
            });

            await this.cleanupPortalExport(run, generatedFile, portalClient);

            const validation = this.validateWorkbook(stablePath, Number(confirmedTotal));
            this.updateRun(run, { workbookRowCount: validation.rowCount });

            const incomingPath = this.handoffToIncoming(stablePath, run.standardizedFilename);
            this.updateRun(run, { status: STATUSES.WAITING_FOR_IMPORT });

            const importResult = await this.executeImport({
                filePath: incomingPath,
                forceReimport: false,
                source: 'DKCL_HUE_SYNC'
            });

            if (importResult?.requiresConfirmation) {
                this.updateRun(run, {
                    status: STATUSES.MANUAL_REVIEW_REQUIRED,
                    endTime: this.clock().toISOString(),
                    safeErrorMessage: 'Import confirmation required for existing date.'
                });
                return;
            }

            const final = await this.verifyImport(run.measurementDate, run.standardizedFilename, validation.rowCount);
            this.updateRun(run, {
                status: STATUSES.SUCCESS,
                endTime: this.clock().toISOString(),
                importedCount: final.rowCount,
                finalFileLocation: final.finalFileLocation
            });
        } catch (error) {
            const authCodes = new Set([
                'AUTHENTICATION_REQUIRED',
                'SECURITY_CHALLENGE_REQUIRED',
                'LOGIN_NOT_CONFIRMED',
                'LOGIN_FORM_NOT_FOUND',
                'LOGIN_SUBMIT_NOT_FOUND',
                'MISSING_CREDENTIALS',
                'PROFILE_LOCKED',
                'SESSION_EXPIRED'
            ]);
            this.updateRun(run, {
                status: error.code === 'MANUAL_REVIEW_REQUIRED'
                    ? STATUSES.MANUAL_REVIEW_REQUIRED
                    : (authCodes.has(error.code) ? STATUSES.AUTHENTICATION_REQUIRED : STATUSES.FAILED),
                endTime: this.clock().toISOString(),
                safeErrorMessage: safeErrorMessage(error)
            });
            this.logger.error?.(`[DKCL_HUE_F13_SYNC] ${run.runId} ${run.status}: ${run.safeErrorMessage}`);
        } finally {
            if (ownsPortalClient && portalClient.close) {
                await portalClient.close().catch((error) => {
                    this.logger.warn?.(`[DKCL_HUE_F13_SYNC] ${run.runId} portal close warning: ${safeErrorMessage(error)}`);
                });
            }
        }
    }

    validateWorkbook(filePath, expectedRows) {
        if (!filePath.toLowerCase().endsWith('.xlsx') || !isLikelyXlsx(filePath)) {
            const error = new Error('Downloaded file is not a valid XLSX workbook.');
            error.code = 'INVALID_XLSX';
            throw error;
        }

        const parsed = parseF13Excel(this.fs.readFileSync(filePath));
        if (parsed.totalParsed !== expectedRows) {
            const error = new Error('Workbook detail-row count differs from portal detail total.');
            error.code = 'ROW_COUNT_MISMATCH';
            throw error;
        }
        return { rowCount: parsed.totalParsed };
    }

    async cleanupPortalExport(run, generatedFile, portalClient = this.portalClient) {
        if (!portalClient.deleteGeneratedFile) return;

        try {
            await portalClient.deleteGeneratedFile(generatedFile);
        } catch (error) {
            this.updateRun(run, {
                cleanupWarning: safeErrorMessage(error) || 'Portal export cleanup failed.'
            });
            this.logger.warn?.(`[DKCL_HUE_F13_SYNC] ${run.runId} cleanup warning: ${run.cleanupWarning}`);
        }
    }

    handoffToIncoming(sourcePath, filename) {
        const incomingDir = this.path.join(BASE_INCOMING, 'HUE');
        ensureDir(incomingDir);
        const incomingPath = this.path.join(incomingDir, filename);

        if (this.fs.existsSync(incomingPath)) {
            const error = new Error('Standardized Incoming file already exists; manual review required.');
            error.code = 'MANUAL_REVIEW_REQUIRED';
            throw error;
        }

        this.fs.copyFileSync(sourcePath, incomingPath);
        return incomingPath;
    }

    async waitForStableFile(filePath) {
        const timeoutAt = Date.now() + this.config.importCompletionTimeoutMs;
        let previousSize = -1;

        while (Date.now() < timeoutAt) {
            if (this.fs.existsSync(filePath)) {
                const currentSize = this.fs.statSync(filePath).size;
                if (currentSize > 0 && currentSize === previousSize) return filePath;
                previousSize = currentSize;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const error = new Error('Downloaded XLSX file did not become stable before timeout.');
        error.code = 'DOWNLOAD_NOT_STABLE';
        throw error;
    }

    async verifyImport(measurementDate, filename, expectedRows) {
        const processedPath = this.path.join(BASE_PROCESSED, 'HUE', filename);
        const errorPath = this.path.join(BASE_ERROR, 'HUE', filename);
        const timeoutAt = Date.now() + this.config.importCompletionTimeoutMs;

        while (Date.now() < timeoutAt) {
            const row = await this.db.get(
                `SELECT COUNT(*) AS row_count, COUNT(DISTINCT ma_bg) AS distinct_count
                 FROM fact_f13
                 WHERE ngay_do_kiem = ?`,
                [measurementDate]
            );
            const logs = await this.db.all(
                `SELECT status, total_records, error_records, skipped_records
                 FROM import_log
                 WHERE ngay_do_kiem = ? OR file_name = ?
                 ORDER BY id ASC`,
                [measurementDate, filename]
            );
            const successLogs = logs.filter((log) => log.status === 'SUCCESS');
            const failedLogs = logs.filter((log) => log.status === 'FAILED');
            const rowCount = Number(row?.row_count || 0);
            const distinctCount = Number(row?.distinct_count || 0);

            if (this.fs.existsSync(errorPath) || failedLogs.length > 0) {
                const error = new Error('Atomic importer returned FAILED for standardized DKCL file.');
                error.code = 'IMPORT_FAILED';
                throw error;
            }

            if (
                this.fs.existsSync(processedPath) &&
                successLogs.length === 1 &&
                rowCount === expectedRows &&
                distinctCount === expectedRows
            ) {
                return { rowCount, distinctCount, finalFileLocation: processedPath };
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        const error = new Error('Timed out waiting for atomic importer completion.');
        error.code = 'IMPORT_TIMEOUT';
        throw error;
    }
}

module.exports = {
    DkclHueF13SyncService,
    DkclPortalClientNotConfigured,
    STATUSES,
    standardizedFilename,
    safeErrorMessage,
    selectNewestGeneratedFile
};
