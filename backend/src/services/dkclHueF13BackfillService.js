'use strict';

const {
    DkclHueF13SyncService,
    standardizedFilename
} = require('./dkclHueF13SyncService');
const { DkclSessionPreflightService } = require('./dkclSessionPreflightService');
const sessionPreflightService = new DkclSessionPreflightService();

const QUEUE_TERMINAL_STATUSES = new Set([
    'SUCCESS',
    'FAILED',
    'AUTHENTICATION_REQUIRED',
    'STOPPED',
    'SKIPPED'
]);
const SYNC_TERMINAL_STATUSES = new Set([
    'SUCCESS',
    'NO_DATA',
    'FAILED',
    'AUTHENTICATION_REQUIRED',
    'ALREADY_COMPLETED',
    'MANUAL_REVIEW_REQUIRED'
]);

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

class DkclHueF13BackfillService {
    constructor(options = {}) {
        this.syncService = options.syncService || new DkclHueF13SyncService(options.syncServiceOptions || {});
        this.sessionPreflightService = options.sessionPreflightService || sessionPreflightService;
        this.clock = options.clock || (() => new Date());
        this.pollIntervalMs = Number(options.pollIntervalMs || 500);
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
            const completion = await this.syncService.checkCompleted(date);
            const status = completion.complete
                ? 'COMPLETE'
                : (completion.inconsistent ? 'MANUAL_REVIEW_REQUIRED' : 'MISSING');

            results.push({
                measurement_date: date,
                status,
                selectable: status === 'MISSING' || status === 'COMPLETE',
                evidence: {
                    standardized_filename: standardizedFilename(date),
                    row_count: completion.rowCount || 0,
                    distinct_count: completion.distinctCount || 0,
                    processed_path_present: Boolean(completion.processedPath),
                    reason: completion.reason || null
                }
            });
        }

        return {
            source: 'HUE',
            report: 'F1.3',
            from_date: normalizedFrom,
            to_date: normalizedTo,
            total_days: results.length,
            missing_count: results.filter((item) => item.status === 'MISSING').length,
            complete_count: results.filter((item) => item.status === 'COMPLETE').length,
            manual_review_count: results.filter((item) => item.status === 'MANUAL_REVIEW_REQUIRED').length,
            existing_dates: results
                .filter((item) => item.status === 'COMPLETE' || item.status === 'MANUAL_REVIEW_REQUIRED')
                .map((item) => item.measurement_date),
            missing_dates: results
                .filter((item) => item.status === 'MISSING')
                .map((item) => item.measurement_date),
            completed_dates: results
                .filter((item) => item.status === 'COMPLETE')
                .map((item) => item.measurement_date),
            results
        };
    }

    async getCoverageSummary({ fromDate = null, toDate = null } = {}) {
        const db = this.syncService.db;
        if (!db?.get || !db?.all) {
            return this.emptyCoverageSummary({ fromDate, toDate });
        }

        const coverage = await db.get(
            `SELECT
                MIN(ngay_do_kiem) AS first_business_date,
                MAX(ngay_do_kiem) AS last_business_date,
                COUNT(DISTINCT ngay_do_kiem) AS imported_dates_count
             FROM fact_f13`
        );
        const years = await db.all(
            `SELECT DISTINCT substr(ngay_do_kiem, 1, 4) AS year
             FROM fact_f13
             WHERE ngay_do_kiem IS NOT NULL
             ORDER BY year ASC`
        );
        const months = await db.all(
            `SELECT DISTINCT substr(ngay_do_kiem, 1, 7) AS month
             FROM fact_f13
             WHERE ngay_do_kiem IS NOT NULL
             ORDER BY month ASC`
        );
        const latest = await db.get(
            `SELECT file_name, ngay_do_kiem, created_at, total_records
             FROM import_log
             WHERE status = 'SUCCESS'
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
                completed_dates: scan.completed_dates
            };
        }

        return {
            source: 'HUE',
            report: 'F1.3',
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

    emptyCoverageSummary({ fromDate = null, toDate = null } = {}) {
        return {
            source: 'HUE',
            report: 'F1.3',
            available_years: [],
            available_months: [],
            first_business_date: null,
            last_business_date: null,
            imported_dates_count: 0,
            latest_successful_import: null,
            selected_range: fromDate && toDate ? {
                from_date: fromDate,
                to_date: toDate,
                total_days: 0,
                imported_dates_count: 0,
                missing_dates_count: 0,
                existing_dates: [],
                missing_dates: [],
                completed_dates: []
            } : null
        };
    }

    async startQueue(dates = [], refreshDates = []) {
        if (this.hasActiveQueue()) {
            const error = new Error('A Hue F1.3 backfill queue is already active.');
            error.code = 'QUEUE_ALREADY_ACTIVE';
            throw error;
        }

        const normalizedDates = this.normalizeSelectedDates(dates);
        const normalizedRefreshDates = Array.isArray(refreshDates) ? refreshDates.map((date) => normalizeDate(date, 'refresh_date')) : [];
        const items = [];

        for (const date of normalizedDates) {
            const completion = await this.syncService.checkCompleted(date);
            const refreshRequested = normalizedRefreshDates.includes(date);
            if (completion.complete && !refreshRequested) {
                const error = new Error(`Date ${date} already has completed Hue F1.3 import evidence.`);
                error.code = 'DATE_ALREADY_COMPLETED';
                throw error;
            }
            if (completion.inconsistent) {
                const error = new Error(`Date ${date} requires manual review before backfill.`);
                error.code = 'DATE_REQUIRES_MANUAL_REVIEW';
                throw error;
            }
            if (this.dateExistsInActiveQueue(date)) {
                const error = new Error(`Date ${date} is already present in the active queue.`);
                error.code = 'DATE_ALREADY_IN_ACTIVE_QUEUE';
                throw error;
            }
            items.push(this.createQueueItem(date));
        }
        const portalClient = await this.validateAuthenticationBeforeQueue();

        const queue = {
            queueId: this.createQueueId(),
            source: 'HUE',
            report: 'F1.3',
            portalClient,
            status: 'QUEUED',
            stopRequested: false,
            createdAt: this.clock().toISOString(),
            startedAt: null,
            endedAt: null,
            restartNotice: 'Queue state is in memory for AUTO-IMPORT-003; application restart can clear the active queue.',
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
            const error = new Error('Hue F1.3 backfill queue was not found.');
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
            const error = new Error('Hue F1.3 backfill queue was not found.');
            error.code = 'QUEUE_NOT_FOUND';
            throw error;
        }
        if (this.hasActiveQueue()) {
            const error = new Error('Cannot retry while a Hue F1.3 backfill queue is active.');
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
        if (!['FAILED', 'AUTHENTICATION_REQUIRED'].includes(item.status)) {
            const error = new Error(`Date ${normalizedDate} cannot be retried from status ${item.status}.`);
            error.code = 'QUEUE_ITEM_NOT_RETRYABLE';
            throw error;
        }

        const completion = await this.syncService.checkCompleted(normalizedDate);
        if (completion.complete) {
            const error = new Error(`Date ${normalizedDate} already has completed Hue F1.3 import evidence.`);
            error.code = 'DATE_ALREADY_COMPLETED';
            throw error;
        }
        const portalClient = await this.validateAuthenticationBeforeQueue();

        const retryQueue = {
            queueId: this.createQueueId(),
            source: 'HUE',
            report: 'F1.3',
            portalClient,
            status: 'QUEUED',
            stopRequested: false,
            retryOf: { queueId, measurementDate: normalizedDate },
            createdAt: this.clock().toISOString(),
            startedAt: null,
            endedAt: null,
            restartNotice: 'Queue state is in memory for AUTO-IMPORT-003; application restart can clear the active queue.',
            items: [this.createQueueItem(normalizedDate)]
        };
        this.queues.set(retryQueue.queueId, retryQueue);
        this.activeQueueId = retryQueue.queueId;
        this.processQueue(retryQueue).finally(() => {
            if (this.activeQueueId === retryQueue.queueId) this.activeQueueId = null;
        });

        return this.publicQueue(retryQueue);
    }

    normalizeSelectedDates(dates) {
        if (!Array.isArray(dates) || dates.length === 0) {
            const error = new Error('dates must contain at least one measurement date.');
            error.code = 'MISSING_DATES';
            throw error;
        }
        const normalized = dates.map((date) => normalizeDate(date, 'measurement_date')).sort();
        const unique = new Set(normalized);
        if (unique.size !== normalized.length) {
            const error = new Error('Duplicate measurement dates are not allowed in one backfill queue.');
            error.code = 'DUPLICATE_DATES';
            throw error;
        }
        return normalized;
    }

    async validateAuthenticationBeforeQueue() {
        const preflight = await this.sessionPreflightService.preflight('HUE');
        if (preflight.status !== 'SESSION_VALID') {
            const authError = new Error('Không thể tạo hàng đợi Huế F1.3 vì phiên đăng nhập DKCL không hợp lệ. Vui lòng đăng nhập/cập nhật phiên DKCL trước khi chạy bù dữ liệu.');
            authError.code = 'AUTHENTICATION_REQUIRED';
            throw authError;
        }
        return this.sessionPreflightService.getInteractiveClient?.('HUE') || null;
    }

    createQueueId() {
        this.queueSequence += 1;
        return `hue-f13-backfill-${this.clock().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${String(this.queueSequence).padStart(4, '0')}`;
    }

    createQueueItem(measurementDate) {
        return {
            measurementDate,
            status: 'QUEUED',
            runId: null,
            startTime: null,
            endTime: null,
            attempts: 0,
            evidence: {
                business_date: measurementDate,
                queue_id: null,
                run_id: null,
                start_time: null,
                end_time: null,
                exported_filename: null,
                workbook_row_count: null,
                imported_database_row_count: null,
                distinct_shipment_count: null,
                success_log_count: 0,
                error_log_count: 0,
                error_code: null,
                error_message: null
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
            await this.processQueueItem(queue, item);
        }
        this.finishQueueIfTerminal(queue);
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

        const result = await this.syncService.start(item.measurementDate, {
            requireExistingSession: true,
            portalClient: queue.portalClient || this.sessionPreflightService.getInteractiveClient?.('HUE') || null
        });
        const run = result?.run || null;
        this.updateItem(item, {
            runId: run?.runId || null,
            evidence: {
                ...item.evidence,
                run_id: run?.runId || null
            }
        });

        const finalRun = await this.waitForSyncRun(run);
        const status = this.queueStatusFromSyncResult(result, finalRun);
        const endTime = this.clock().toISOString();
        this.updateItem(item, {
            status,
            endTime,
            evidence: await this.buildItemEvidence(queue, item, finalRun, {
                endTime,
                status,
                errorCode: result?.status || finalRun?.status || null,
                errorMessage: finalRun?.safeErrorMessage || null
            })
        });
    }

    async waitForSyncRun(run) {
        if (!run?.runId) return run;
        let current = this.syncService.getRun(run.runId) || run;
        while (current && !SYNC_TERMINAL_STATUSES.has(current.status)) {
            await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
            current = this.syncService.getRun(run.runId) || current;
        }
        return current;
    }

    queueStatusFromSyncResult(result, run) {
        const status = run?.status || result?.status;
        if (status === 'SUCCESS') return 'SUCCESS';
        if (status === 'AUTHENTICATION_REQUIRED') return 'AUTHENTICATION_REQUIRED';
        if (status === 'ALREADY_COMPLETED') return 'SKIPPED';
        return 'FAILED';
    }

    async buildItemEvidence(queue, item, run, context = {}) {
        const dbEvidence = await this.loadDatabaseEvidence(item.measurementDate);
        return {
            business_date: item.measurementDate,
            queue_id: queue.queueId,
            run_id: item.runId || run?.runId || null,
            start_time: item.startTime,
            end_time: context.endTime || item.endTime,
            exported_filename: run?.generatedPortalFilename || run?.downloadedFilename || null,
            workbook_row_count: run?.workbookRowCount || null,
            imported_database_row_count: run?.importedCount || dbEvidence.rowCount,
            distinct_shipment_count: dbEvidence.distinctCount,
            success_log_count: dbEvidence.successLogCount,
            error_log_count: dbEvidence.errorLogCount,
            error_code: ['FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(context.status) ? context.errorCode : null,
            error_message: ['FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(context.status) ? context.errorMessage : null
        };
    }

    async loadDatabaseEvidence(measurementDate) {
        const db = this.syncService.db;
        if (!db?.get || !db?.all) {
            return {
                rowCount: null,
                distinctCount: null,
                successLogCount: 0,
                errorLogCount: 0
            };
        }
        const filename = standardizedFilename(measurementDate);
        const row = await db.get(
            `SELECT COUNT(*) AS row_count, COUNT(DISTINCT ma_bg) AS distinct_count
             FROM fact_f13
             WHERE ngay_do_kiem = ?`,
            [measurementDate]
        );
        const logs = await db.all(
            `SELECT status
             FROM import_log
             WHERE ngay_do_kiem = ? OR file_name = ?`,
            [measurementDate, filename]
        );
        return {
            rowCount: Number(row?.row_count || 0),
            distinctCount: Number(row?.distinct_count || 0),
            successLogCount: logs.filter((log) => log.status === 'SUCCESS').length,
            errorLogCount: logs.filter((log) => log.status === 'FAILED').length
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
        return ['SUCCESS', 'FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(queue?.status);
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
                stopped: queue.items.filter((item) => item.status === 'STOPPED').length,
                success: queue.items.filter((item) => item.status === 'SUCCESS').length
            },
            items: queue.items.map((item) => ({ ...item, evidence: { ...item.evidence } }))
        };
    }
}

module.exports = {
    DkclHueF13BackfillService,
    enumerateDates,
    QUEUE_TERMINAL_STATUSES
};
