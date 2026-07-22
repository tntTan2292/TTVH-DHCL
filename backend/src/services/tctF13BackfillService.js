'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');
const { DkclSessionPreflightService } = require('./dkclSessionPreflightService');
const {
    parseF13NationalExcel,
    NATIONAL_RANKED_PROVINCE_CODES
} = require('./nationalExcelParser');
const { importNationalParsedData } = require('./importProcessor');

function normalizeDate(value, fieldName) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
        const error = new Error(`${fieldName} must use YYYY-MM-DD format.`);
        error.code = 'INVALID_DATE';
        throw error;
    }
    return String(value);
}

function utcDay(dateString) {
    return new Date(`${dateString}T00:00:00.000Z`);
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function enumerateDates(fromDate, toDate) {
    const start = utcDay(fromDate);
    const end = utcDay(toDate);
    if (start > end) {
        const error = new Error('from_date must be earlier than or equal to to_date.');
        error.code = 'INVALID_DATE_RANGE';
        throw error;
    }

    const dates = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        dates.push(formatDate(cursor));
    }
    return dates;
}

const QUEUE_TERMINAL_STATUSES = new Set([
    'SUCCESS',
    'FAILED',
    'AUTHENTICATION_REQUIRED',
    'BLOCKED',
    'STOPPED',
    'SKIPPED'
]);

const SYSTEMIC_PORTAL_ERROR_CODES = new Set([
    'REPORT_PAGE_REQUIRED',
    'TCT_SCOPE_NOT_READY',
    'DATE_FILTER_NOT_APPLIED',
    'RESULT_TABLE_NOT_READY',
    'EXPORT_CONTROL_NOT_READY',
    'EXPORT_BUTTON_NOT_FOUND',
    'EXPORT_READINESS_TIMEOUT',
    'PORTAL_LAYOUT_INCOMPATIBLE',
    'REPORT_SUBMIT_NOT_FOUND',
    'RANKED_POPULATION_MISMATCH'
]);

function createRunId(clock = () => new Date()) {
    return `tct-f13-${clock().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 10)}`;
}

function standardizedFilename(measurementDate) {
    return `F1.3-${measurementDate.replace(/-/g, '.')}.xlsx`;
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function isLikelyXlsx(filePath) {
    const header = fs.readFileSync(filePath, { encoding: null, flag: 'r' }).subarray(0, 4);
    return header.length === 4 && header[0] === 0x50 && header[1] === 0x4b;
}

class TctF13BackfillService {
    constructor(options = {}) {
        this.db = options.db;
        this.rankedPopulationCount = Number(options.rankedPopulationCount || NATIONAL_RANKED_PROVINCE_CODES.length);
        this.clock = options.clock || (() => new Date());
        this.pollIntervalMs = Number(options.pollIntervalMs || 500);
        this.portalBaseUrl = options.portalBaseUrl || process.env.PORTAL_BASE_URL || 'https://dkcl.vnpost.vn/';
        this.profileDir = options.profileDir || process.env.DKCL_TCT_PROFILE_DIR || path.resolve(process.cwd(), '../Data DKCL/BrowserProfiles/TCT');
        this.rawDownloadDir = options.rawDownloadDir || process.env.DKCL_TCT_RAW_DOWNLOAD_DIR || path.resolve(process.cwd(), '../portal-downloads/dkcl/tct/f13/raw');
        this.portalClientFactory = options.portalClientFactory || (() => new DkclHueF13PortalClient({
            headless: process.env.DKCL_TCT_HEADLESS !== 'false',
            manualAuthWaitMs: Number(process.env.DKCL_TCT_MANUAL_AUTH_WAIT_MS || 120000)
        }));
        this.sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService({
            portalClientFactory: options.preflightPortalClientFactory
        });
        this.importNationalParsedData = options.importNationalParsedData || importNationalParsedData;
        this.queues = new Map();
        this.activeQueueId = null;
        this.queueSequence = 0;
    }

    async scanMissingDates({ fromDate, toDate }) {
        const normalizedFrom = normalizeDate(fromDate, 'from_date');
        const normalizedTo = normalizeDate(toDate, 'to_date');
        const dates = enumerateDates(normalizedFrom, normalizedTo);
        const results = [];

        for (const date of dates) {
            const completion = await this.checkCompleted(date);
            const status = completion.complete
                ? 'COMPLETE'
                : (completion.incomplete ? 'INCOMPLETE' : 'MISSING');

            results.push({
                measurement_date: date,
                status,
                selectable: status === 'MISSING' || status === 'INCOMPLETE' || status === 'COMPLETE',
                action: status === 'COMPLETE' ? 'Re-Update' : (status === 'INCOMPLETE' ? 'Xử lý lại' : 'Update'),
                evidence: {
                    row_count: completion.rowCount || 0,
                    distinct_ranked_unit_count: completion.distinctCount || 0,
                    success_log_count: completion.successLogCount || 0,
                    import_log_count: completion.importLogCount || 0,
                    failed_log_count: completion.failedLogCount || 0,
                    reason: completion.reason || null
                }
            });
        }

        return {
            source: 'TCT',
            report: 'F1.3',
            evidence_origin: 'LOCAL_IMPORT_EVIDENCE',
            from_date: normalizedFrom,
            to_date: normalizedTo,
            ranked_population_count: this.rankedPopulationCount,
            total_days: results.length,
            missing_count: results.filter((item) => item.status === 'MISSING').length,
            complete_count: results.filter((item) => item.status === 'COMPLETE').length,
            incomplete_count: results.filter((item) => item.status === 'INCOMPLETE').length,
            manual_review_count: results.filter((item) => item.status === 'INCOMPLETE').length,
            existing_dates: results
                .filter((item) => item.status === 'COMPLETE' || item.status === 'INCOMPLETE')
                .map((item) => item.measurement_date),
            missing_dates: results
                .filter((item) => item.status === 'MISSING')
                .map((item) => item.measurement_date),
            incomplete_dates: results
                .filter((item) => item.status === 'INCOMPLETE')
                .map((item) => item.measurement_date),
            retryable_dates: results
                .filter((item) => item.selectable)
                .map((item) => item.measurement_date),
            completed_dates: results
                .filter((item) => item.status === 'COMPLETE')
                .map((item) => item.measurement_date),
            results
        };
    }

    async getCoverageSummary({ fromDate = null, toDate = null } = {}) {
        const coverage = await this.db.get(
            `SELECT
                MIN(ngay_do_kiem) AS first_business_date,
                MAX(ngay_do_kiem) AS last_business_date,
                COUNT(DISTINCT ngay_do_kiem) AS imported_dates_count
             FROM fact_f13_national`
        );
        const years = await this.db.all(
            `SELECT DISTINCT substr(ngay_do_kiem, 1, 4) AS year
             FROM fact_f13_national
             WHERE ngay_do_kiem IS NOT NULL
             ORDER BY year ASC`
        );
        const months = await this.db.all(
            `SELECT DISTINCT substr(ngay_do_kiem, 1, 7) AS month
             FROM fact_f13_national
             WHERE ngay_do_kiem IS NOT NULL
             ORDER BY month ASC`
        );
        const latest = await this.db.get(
            `SELECT file_name, ngay_do_kiem, created_at, total_records
             FROM import_log
             WHERE status = 'SUCCESS'
               AND EXISTS (
                    SELECT 1
                    FROM fact_f13_national national
                    WHERE national.ngay_do_kiem = import_log.ngay_do_kiem
               )
             ORDER BY datetime(created_at) DESC, id DESC
             LIMIT 1`
        );

        const normalizedFrom = fromDate ? normalizeDate(fromDate, 'from_date') : null;
        const normalizedTo = toDate ? normalizeDate(toDate, 'to_date') : null;
        let selectedRange = null;
        if (normalizedFrom && normalizedTo) {
            const scan = await this.scanMissingDates({ fromDate: normalizedFrom, toDate: normalizedTo });
            selectedRange = {
                from_date: normalizedFrom,
                to_date: normalizedTo,
                total_days: scan.total_days,
                imported_dates_count: scan.existing_dates.length,
                missing_dates_count: scan.missing_count,
                existing_dates: scan.existing_dates,
                missing_dates: scan.missing_dates,
                incomplete_dates: scan.incomplete_dates,
                retryable_dates: scan.retryable_dates,
                completed_dates: scan.completed_dates
            };
        }

        return {
            source: 'TCT',
            report: 'F1.3',
            evidence_origin: 'LOCAL_IMPORT_EVIDENCE',
            ranked_population_count: this.rankedPopulationCount,
            available_years: years.map((row) => row.year).filter(Boolean),
            available_months: months.map((row) => row.month).filter(Boolean),
            first_business_date: coverage?.first_business_date || null,
            last_business_date: coverage?.last_business_date || null,
            imported_dates_count: Number(coverage?.imported_dates_count || 0),
            latest_successful_import: latest ? {
                file_name: latest.file_name,
                business_date: latest.ngay_do_kiem,
                imported_at: latest.created_at,
                total_records: Number(latest.total_records || 0)
            } : null,
            selected_range: selectedRange
        };
    }

    async checkCompleted(measurementDate) {
        const row = await this.db.get(
            `SELECT COUNT(*) AS row_count, COUNT(DISTINCT ma_tinh_phat) AS distinct_count
             FROM fact_f13_national
             WHERE ngay_do_kiem = ?`,
            [measurementDate]
        );
        const logs = await this.db.all(
            `SELECT status, total_records, error_records, skipped_records
             FROM import_log
             WHERE ngay_do_kiem = ?
             ORDER BY id ASC`,
            [measurementDate]
        );

        const rowCount = Number(row?.row_count || 0);
        const distinctCount = Number(row?.distinct_count || 0);
        const successLogCount = logs.filter((log) => log.status === 'SUCCESS').length;
        const failedLogCount = logs.filter((log) => log.status === 'FAILED').length;
        const complete = rowCount === this.rankedPopulationCount &&
            distinctCount === this.rankedPopulationCount &&
            successLogCount > 0;

        if (complete) {
            return { complete: true, incomplete: false, rowCount, distinctCount, successLogCount, failedLogCount, importLogCount: logs.length };
        }

        if (rowCount > 0 || successLogCount > 0 || logs.length > 0) {
            return {
                complete: false,
                incomplete: true,
                rowCount,
                distinctCount,
                successLogCount,
                failedLogCount,
                importLogCount: logs.length,
                reason: `TCT F1.3 evidence is incomplete: expected ${this.rankedPopulationCount} ranked units.`
            };
        }

        return { complete: false, incomplete: false, rowCount, distinctCount, successLogCount, failedLogCount, importLogCount: logs.length };
    }

    async preflight() {
        return this.sessionPreflightService.preflight('TCT');
    }

    async startQueue(dates = [], { refreshDates = [] } = {}) {
        if (this.hasActiveQueue()) {
            const error = new Error('A TCT F1.3 backfill queue is already active.');
            error.code = 'QUEUE_ALREADY_ACTIVE';
            throw error;
        }

        const normalizedDates = this.normalizeSelectedDates(dates);
        const normalizedRefreshDates = this.normalizeOptionalDates(refreshDates, 'refresh_dates');
        if (normalizedRefreshDates.some((date) => !normalizedDates.includes(date))) {
            const error = new Error('refresh_dates must be selected in dates.');
            error.code = 'INVALID_REFRESH_DATES';
            throw error;
        }
        const items = [];
        for (const date of normalizedDates) {
            const completion = await this.checkCompleted(date);
            const refreshRequested = normalizedRefreshDates.includes(date);
            if (completion.complete && !refreshRequested) {
                const error = new Error(`Date ${date} already has completed TCT F1.3 import evidence.`);
                error.code = 'DATE_ALREADY_COMPLETED';
                throw error;
            }
            if (this.dateExistsInActiveQueue(date)) {
                const error = new Error(`Date ${date} is already present in the active TCT queue.`);
                error.code = 'DATE_ALREADY_IN_ACTIVE_QUEUE';
                throw error;
            }
            items.push(this.createQueueItem(date, { refreshRequested }));
        }

        const preflight = await this.preflight();
        if (preflight.status !== 'SESSION_VALID') {
            const error = new Error(preflight.error?.message || 'TCT DKCL session is not valid.');
            error.code = preflight.status;
            error.preflight = preflight;
            throw error;
        }

        const queue = {
            queueId: this.createQueueId(),
            source: 'TCT',
            report: 'F1.3',
            status: 'QUEUED',
            stopRequested: false,
            createdAt: this.clock().toISOString(),
            startedAt: null,
            endedAt: null,
            restartNotice: 'Queue state is in memory for AUTO-IMPORT-005; backend restart can clear the active TCT queue.',
            items
        };
        this.queues.set(queue.queueId, queue);
        this.activeQueueId = queue.queueId;
        this.processQueue(queue).finally(() => {
            if (this.activeQueueId === queue.queueId) this.activeQueueId = null;
        });

        return this.publicQueue(queue);
    }

    getQueue(queueId) {
        return this.publicQueue(this.queues.get(queueId));
    }

    getActiveQueue() {
        return this.activeQueueId ? this.getQueue(this.activeQueueId) : null;
    }

    stopQueue(queueId) {
        const queue = this.queues.get(queueId);
        if (!queue) {
            const error = new Error('TCT F1.3 backfill queue was not found.');
            error.code = 'QUEUE_NOT_FOUND';
            throw error;
        }
        queue.stopRequested = true;
        for (const item of queue.items) {
            if (item.status === 'QUEUED') {
                this.updateItem(item, {
                    status: 'STOPPED',
                    endTime: this.clock().toISOString(),
                    evidence: {
                        ...item.evidence,
                        error_code: 'QUEUE_STOPPED',
                        error_message: 'Queue was stopped before this date started.'
                    }
                });
            }
        }
        if (!queue.items.some((item) => item.status === 'RUNNING')) {
            this.finishQueueIfTerminal(queue);
        } else {
            queue.status = 'STOPPING';
        }
        return this.publicQueue(queue);
    }

    async retryQueueItem(queueId, measurementDate) {
        const queue = this.queues.get(queueId);
        if (!queue) {
            const error = new Error('TCT F1.3 backfill queue was not found.');
            error.code = 'QUEUE_NOT_FOUND';
            throw error;
        }
        if (this.hasActiveQueue()) {
            const error = new Error('Cannot retry while a TCT F1.3 backfill queue is active.');
            error.code = 'QUEUE_ALREADY_ACTIVE';
            throw error;
        }

        const normalizedDate = normalizeDate(measurementDate, 'measurement_date');
        const item = queue.items.find((candidate) => candidate.measurementDate === normalizedDate);
        if (!item) {
            const error = new Error(`Date ${normalizedDate} is not present in queue ${queueId}.`);
            error.code = 'QUEUE_ITEM_NOT_FOUND';
            throw error;
        }
        const retryableBlockedItem = queue.status === 'BLOCKED' && item.status === 'QUEUED';
        if (!['FAILED', 'AUTHENTICATION_REQUIRED'].includes(item.status) && !retryableBlockedItem) {
            const error = new Error(`Date ${normalizedDate} cannot be retried from status ${item.status}.`);
            error.code = 'QUEUE_ITEM_NOT_RETRYABLE';
            throw error;
        }

        return this.startQueue([normalizedDate]);
    }

    normalizeSelectedDates(dates) {
        if (!Array.isArray(dates) || dates.length === 0) {
            const error = new Error('dates must contain at least one TCT business date.');
            error.code = 'MISSING_DATES';
            throw error;
        }
        const normalized = dates.map((date) => normalizeDate(date, 'measurement_date')).sort();
        const unique = new Set(normalized);
        if (unique.size !== normalized.length) {
            const error = new Error('Duplicate TCT business dates are not allowed in one backfill queue.');
            error.code = 'DUPLICATE_DATES';
            throw error;
        }
        return normalized;
    }

    normalizeOptionalDates(dates, fieldName) {
        if (dates === undefined || dates === null) return [];
        if (!Array.isArray(dates)) {
            const error = new Error(`${fieldName} must be an array.`);
            error.code = 'INVALID_REFRESH_DATES';
            throw error;
        }
        const normalized = dates.map((date) => normalizeDate(date, 'measurement_date')).sort();
        if (new Set(normalized).size !== normalized.length) {
            const error = new Error(`Duplicate ${fieldName} are not allowed.`);
            error.code = 'DUPLICATE_DATES';
            throw error;
        }
        return normalized;
    }

    createQueueId() {
        this.queueSequence += 1;
        return `tct-f13-backfill-${this.clock().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${String(this.queueSequence).padStart(4, '0')}`;
    }

    createQueueItem(measurementDate, { refreshRequested = false } = {}) {
        return {
            measurementDate,
            status: 'QUEUED',
            runId: null,
            startTime: null,
            endTime: null,
            attempts: 0,
            refreshRequested,
            evidence: {
                business_date: measurementDate,
                queue_id: null,
                run_id: null,
                start_time: null,
                end_time: null,
                downloaded_filename: null,
                workbook_row_count: null,
                parsed_ranked_unit_count: null,
                imported_database_row_count: null,
                hue_volume: null,
                hue_pass: null,
                hue_kpi: null,
                hue_rank: null,
                total_ranked_population: this.rankedPopulationCount,
                success_log_count: 0,
                error_log_count: 0,
                error_code: null,
                error_message: null,
                temp_file_deleted: null
            }
        };
    }

    hasActiveQueue() {
        const queue = this.activeQueueId ? this.queues.get(this.activeQueueId) : null;
        return !!queue && !this.isQueueTerminal(queue);
    }

    dateExistsInActiveQueue(date) {
        const queue = this.activeQueueId ? this.queues.get(this.activeQueueId) : null;
        if (!queue || this.isQueueTerminal(queue)) return false;
        return queue.items.some((item) => item.measurementDate === date && !QUEUE_TERMINAL_STATUSES.has(item.status));
    }

    async processQueue(queue) {
        queue.status = 'RUNNING';
        queue.startedAt = this.clock().toISOString();
        for (const item of queue.items) {
            if (queue.stopRequested) {
                this.updateItem(item, {
                    status: 'STOPPED',
                    endTime: this.clock().toISOString(),
                    evidence: {
                        ...item.evidence,
                        error_code: 'QUEUE_STOPPED',
                        error_message: 'Queue was stopped before this date started.'
                    }
                });
                continue;
            }
            if (item.status !== 'QUEUED') continue;
            const result = await this.processQueueItem(queue, item);
            if (result.systemicFailure) {
                queue.status = 'BLOCKED';
                queue.endedAt = this.clock().toISOString();
                break;
            }
        }
        if (queue.status !== 'BLOCKED') this.finishQueueIfTerminal(queue);
    }

    async processQueueItem(queue, item) {
        const startTime = this.clock().toISOString();
        item.attempts += 1;
        this.updateItem(item, {
            status: 'RUNNING',
            startTime,
            evidence: {
                ...item.evidence,
                queue_id: queue.queueId,
                start_time: startTime
            }
        });

        let runEvidence = null;
        let finalStatus = 'SUCCESS';
        let errorCode = null;
        let errorMessage = null;
        let systemicFailure = false;
        try {
            runEvidence = await this.runOneDateImport(item.measurementDate, queue.queueId, { refreshRequested: item.refreshRequested });
        } catch (error) {
            finalStatus = error?.code === 'AUTHENTICATION_REQUIRED' ? 'AUTHENTICATION_REQUIRED' : 'FAILED';
            errorCode = error?.code || 'TCT_IMPORT_FAILED';
            errorMessage = error?.message || 'TCT F1.3 import failed.';
            runEvidence = error?.evidence || null;
            systemicFailure = SYSTEMIC_PORTAL_ERROR_CODES.has(errorCode);
        }

        const endTime = this.clock().toISOString();
        this.updateItem(item, {
            status: finalStatus,
            runId: runEvidence?.run_id || item.runId,
            endTime,
            evidence: await this.buildItemEvidence(queue, item, runEvidence, {
                endTime,
                status: finalStatus,
                errorCode,
                errorMessage
            })
        });
        return { systemicFailure };
    }

    async runOneDateImport(measurementDate, queueId, { refreshRequested = false } = {}) {
        const runId = createRunId(this.clock);
        let client = null;
        let downloadedPath = null;
        let cleanupDeleted = null;
        let ownsClient = true;
        const evidence = {
            run_id: runId,
            downloaded_filename: null,
            workbook_row_count: null,
            parsed_ranked_unit_count: null,
            imported_database_row_count: null,
            replaced_incomplete_evidence: false,
            temp_file_deleted: null
        };

        try {
            client = this.sessionPreflightService.getInteractiveClient?.('TCT') || this.portalClientFactory();
            ownsClient = client !== this.sessionPreflightService.getInteractiveClient?.('TCT');
            if (ownsClient) {
                await client.authenticate({
                    baseUrl: this.portalBaseUrl,
                    profileDir: this.profileDir,
                    requireExistingSession: true
                });
            } else if (!await client.isF13ReportReady()) {
                const error = new Error('TCT DKCL source page is no longer ready.');
                error.code = 'AUTHENTICATION_REQUIRED';
                throw error;
            }
            await client.openF13Report();
            await client.submitFilters({
                groupBy: 'TINH',
                provinceCode: 'ALL',
                fromDate: measurementDate,
                toDate: measurementDate
            });
            const readiness = await client.waitForF13ExportReadiness({
                groupBy: 'TINH',
                provinceCode: 'ALL',
                fromDate: measurementDate,
                toDate: measurementDate
            });
            if (!readiness?.ready || readiness.status !== 'READY_TO_EXPORT') {
                await client.restoreWindow?.().catch(() => {});
                const error = new Error(readiness?.message || 'TCT F1.3 export is not ready.');
                error.code = readiness?.code || 'EXPORT_CONTROL_NOT_READY';
                error.readiness = readiness || null;
                throw error;
            }
            await client.minimizeWindow?.().catch(() => {});
            const exportRequestedAt = this.clock();
            try {
                await this.requestSummaryExport(client);
            } catch (error) {
                await client.restoreWindow?.().catch(() => {});
                throw error;
            }
            const generatedFile = await client.pollGeneratedFile({
                requestedAt: exportRequestedAt,
                timeoutMs: Number(process.env.DKCL_TCT_GENERATION_TIMEOUT_MS || 900000),
                intervalMs: Number(process.env.DKCL_TCT_GENERATION_POLL_INTERVAL_MS || 30000),
                match: 'F1.3_chat_luong_phat_buu_giay_lien_tinh'
            });
            if (!generatedFile) {
                const error = new Error('Timed out waiting for generated TCT F1.3 export.');
                error.code = 'EXPORT_TIMEOUT';
                throw error;
            }

            ensureDir(this.rawDownloadDir);
            downloadedPath = await client.downloadXlsx({ file: generatedFile, targetDir: this.rawDownloadDir });
            evidence.downloaded_filename = path.basename(downloadedPath);
            const validation = this.validateWorkbook(downloadedPath);
            evidence.workbook_row_count = validation.workbookRowCount;
            evidence.parsed_ranked_unit_count = validation.parsed.totalParsed;
            if (validation.parsed.totalParsed !== this.rankedPopulationCount) {
                const error = new Error(`TCT workbook parsed ${validation.parsed.totalParsed} ranked units; expected ${this.rankedPopulationCount}.`);
                error.code = 'RANKED_POPULATION_MISMATCH';
                throw error;
            }

            const existingBeforeImport = await this.checkCompleted(measurementDate);
            if (existingBeforeImport.complete && !refreshRequested) {
                const error = new Error(`Date ${measurementDate} already has completed TCT F1.3 import evidence.`);
                error.code = 'DATE_ALREADY_COMPLETED';
                throw error;
            }

            const importResult = await this.importNationalParsedData({
                parsedData: validation.parsed.parsedData,
                ngay_do_kiem: measurementDate,
                filename: standardizedFilename(measurementDate),
                forceReimport: Boolean(existingBeforeImport.incomplete || refreshRequested)
            });
            evidence.imported_database_row_count = importResult.inserted;
            evidence.replaced_incomplete_evidence = Boolean(existingBeforeImport.incomplete || refreshRequested);
            cleanupDeleted = this.cleanupDownloadedWorkbook(downloadedPath);
            downloadedPath = null;
            return {
                ...evidence,
                queue_id: queueId,
                temp_file_deleted: cleanupDeleted
            };
        } catch (error) {
            cleanupDeleted = this.cleanupDownloadedWorkbook(downloadedPath);
            downloadedPath = null;
            error.evidence = { ...evidence, temp_file_deleted: cleanupDeleted };
            throw error;
        } finally {
            if (downloadedPath) {
                cleanupDeleted = this.cleanupDownloadedWorkbook(downloadedPath);
            }
            evidence.temp_file_deleted = cleanupDeleted;
            if (client?.close && ownsClient) await client.close().catch(() => {});
        }
    }

    cleanupDownloadedWorkbook(filePath) {
        if (!filePath) return null;
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return !fs.existsSync(filePath);
        } catch {
            return false;
        }
    }

    async requestSummaryExport(client) {
        if (client.requestSummaryExport) return client.requestSummaryExport();
        const page = client.page;
        const exportButton = page.getByRole('button', { name: /Xuất toàn bộ|Xuat toan bo/i }).first();
        if (await exportButton.count() === 0) {
            const error = new Error('TCT F1.3 export-all button was not found.');
            error.code = 'EXPORT_BUTTON_NOT_FOUND';
            throw error;
        }
        await exportButton.click();
        await page.waitForTimeout(1000);
    }

    validateWorkbook(filePath) {
        if (!filePath.toLowerCase().endsWith('.xlsx') || !isLikelyXlsx(filePath)) {
            const error = new Error('Downloaded TCT file is not a valid XLSX workbook.');
            error.code = 'INVALID_XLSX';
            throw error;
        }
        const buffer = fs.readFileSync(filePath);
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
        const parsed = parseF13NationalExcel(buffer);
        return {
            workbookRowCount: rows.length,
            parsed
        };
    }

    async buildItemEvidence(queue, item, runEvidence, context = {}) {
        const dbEvidence = await this.loadDatabaseEvidence(item.measurementDate);
        const hue = await this.loadHueEvidence(item.measurementDate);
        return {
            business_date: item.measurementDate,
            queue_id: queue.queueId,
            run_id: runEvidence?.run_id || item.runId || null,
            start_time: item.startTime,
            end_time: context.endTime || item.endTime,
            downloaded_filename: runEvidence?.downloaded_filename || null,
            workbook_row_count: runEvidence?.workbook_row_count || null,
            parsed_ranked_unit_count: runEvidence?.parsed_ranked_unit_count || null,
            imported_database_row_count: runEvidence?.imported_database_row_count ?? dbEvidence.rowCount,
            replaced_incomplete_evidence: Boolean(runEvidence?.replaced_incomplete_evidence),
            hue_volume: hue.volume,
            hue_pass: hue.pass,
            hue_kpi: hue.kpi,
            hue_rank: hue.rank,
            total_ranked_population: this.rankedPopulationCount,
            success_log_count: dbEvidence.successLogCount,
            error_log_count: dbEvidence.errorLogCount,
            error_code: ['FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(context.status) ? context.errorCode : null,
            error_message: ['FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(context.status) ? context.errorMessage : null,
            temp_file_deleted: runEvidence?.temp_file_deleted ?? null
        };
    }

    async loadDatabaseEvidence(measurementDate) {
        const row = await this.db.get(
            `SELECT COUNT(*) AS row_count, COUNT(DISTINCT ma_tinh_phat) AS distinct_count
             FROM fact_f13_national
             WHERE ngay_do_kiem = ?`,
            [measurementDate]
        );
        const logs = await this.db.all(
            `SELECT status
             FROM import_log
             WHERE ngay_do_kiem = ?`,
            [measurementDate]
        );
        return {
            rowCount: Number(row?.row_count || 0),
            distinctCount: Number(row?.distinct_count || 0),
            successLogCount: logs.filter((log) => log.status === 'SUCCESS').length,
            errorLogCount: logs.filter((log) => log.status === 'FAILED').length
        };
    }

    async loadHueEvidence(measurementDate) {
        const rows = await this.db.all(
            `SELECT ma_tinh_phat, sl_bg_ptc, sl_ptc_dung_qd_ct, tl_ptc_dung_qd_ct
             FROM fact_f13_national
             WHERE ngay_do_kiem = ?
             ORDER BY tl_ptc_dung_qd_ct DESC, sl_bg_ptc DESC`,
            [measurementDate]
        );
        const index = rows.findIndex((row) => row.ma_tinh_phat === '53');
        const hue = index >= 0 ? rows[index] : null;
        return {
            volume: hue ? Number(hue.sl_bg_ptc || 0) : null,
            pass: hue ? Number(hue.sl_ptc_dung_qd_ct || 0) : null,
            kpi: hue ? Number(hue.tl_ptc_dung_qd_ct || 0) : null,
            rank: index >= 0 ? index + 1 : null
        };
    }

    updateItem(item, patch) {
        Object.assign(item, patch);
    }

    finishQueueIfTerminal(queue) {
        if (!queue.items.every((item) => QUEUE_TERMINAL_STATUSES.has(item.status))) return;
        queue.endedAt = queue.endedAt || this.clock().toISOString();
        if (queue.items.some((item) => item.status === 'FAILED')) {
            queue.status = 'FAILED';
        } else if (queue.items.some((item) => item.status === 'AUTHENTICATION_REQUIRED')) {
            queue.status = 'AUTHENTICATION_REQUIRED';
        } else if (queue.items.some((item) => item.status === 'STOPPED')) {
            queue.status = 'STOPPED';
        } else {
            queue.status = 'SUCCESS';
        }
    }

    isQueueTerminal(queue) {
        return ['SUCCESS', 'FAILED', 'AUTHENTICATION_REQUIRED', 'BLOCKED', 'STOPPED'].includes(queue?.status);
    }

    publicQueue(queue) {
        if (!queue) return null;
        const total = queue.items.length;
        const completed = queue.items.filter((item) => QUEUE_TERMINAL_STATUSES.has(item.status)).length;
        return {
            queueId: queue.queueId,
            source: queue.source,
            report: queue.report,
            status: queue.status,
            stopRequested: queue.stopRequested,
            retryOf: queue.retryOf || null,
            createdAt: queue.createdAt,
            startedAt: queue.startedAt,
            endedAt: queue.endedAt,
            restartNotice: queue.restartNotice,
            progress: {
                total,
                completed,
                running: queue.items.filter((item) => item.status === 'RUNNING').length,
                queued: queue.items.filter((item) => item.status === 'QUEUED').length,
                failed: queue.items.filter((item) => item.status === 'FAILED').length,
                authenticatedRequired: queue.items.filter((item) => item.status === 'AUTHENTICATION_REQUIRED').length,
                blocked: queue.status === 'BLOCKED' ? 1 : 0,
                stopped: queue.items.filter((item) => item.status === 'STOPPED').length,
                success: queue.items.filter((item) => item.status === 'SUCCESS').length
            },
            items: queue.items.map((item) => ({ ...item, evidence: { ...item.evidence } }))
        };
    }
}

module.exports = {
    TctF13BackfillService,
    enumerateDates,
    QUEUE_TERMINAL_STATUSES
};
