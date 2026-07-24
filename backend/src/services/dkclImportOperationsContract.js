'use strict';

const F13_REPORT = 'F1.3';

const DKCL_REPORT_EXTENSIONS = Object.freeze({
    F13: 'F1.3',
    F11: 'F1.1',
    F12: 'F1.2',
    F41: 'F4.1'
});

const QUEUE_ITEM_STATUSES = Object.freeze({
    QUEUED: 'QUEUED',
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    STOPPED: 'STOPPED',
    SKIPPED: 'SKIPPED',
    BLOCKED: 'BLOCKED'
});

const DEFAULT_TERMINAL_STATUSES = new Set([
    QUEUE_ITEM_STATUSES.SUCCESS,
    QUEUE_ITEM_STATUSES.FAILED,
    QUEUE_ITEM_STATUSES.AUTHENTICATION_REQUIRED,
    QUEUE_ITEM_STATUSES.STOPPED,
    QUEUE_ITEM_STATUSES.SKIPPED
]);

function normalizeSource(source) {
    const normalized = String(source || '').trim().toUpperCase();
    if (!['HUE', 'TCT'].includes(normalized)) {
        const error = new Error('source must be HUE or TCT.');
        error.code = 'INVALID_SOURCE';
        throw error;
    }
    return normalized;
}

function sourceIdentity(source, report = F13_REPORT) {
    const normalized = normalizeSource(source);
    return {
        source: normalized,
        report,
        source_report: `${normalized}_${report.replace(/\./g, '')}`,
        metadata_scope: 'DKCL_SOURCE_ISOLATED'
    };
}

function createQueueId({ source, report = F13_REPORT, purpose = 'backfill', clock = () => new Date(), sequence = 0 }) {
    const identity = sourceIdentity(source, report);
    const reportKey = report.toLowerCase().replace(/\./g, '');
    return `${identity.source.toLowerCase()}-${reportKey}-${purpose}-${clock().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${String(sequence).padStart(4, '0')}`;
}

function createBaseEvidence({ source, report = F13_REPORT, businessDate, queueId = null, runId = null }) {
    return {
        ...sourceIdentity(source, report),
        business_date: businessDate,
        queue_id: queueId,
        run_id: runId,
        source_original_filename: null,
        source_standardized_filename: null,
        source_processed_artifact: null
    };
}

function attachSourceEvidence(evidence, { source, report = F13_REPORT, originalFilename = null, standardizedFilename = null, processedPath = null }) {
    return {
        ...sourceIdentity(source, report),
        ...evidence,
        source: normalizeSource(source),
        report,
        source_report: sourceIdentity(source, report).source_report,
        metadata_scope: 'DKCL_SOURCE_ISOLATED',
        source_original_filename: originalFilename || evidence?.source_original_filename || null,
        source_standardized_filename: standardizedFilename || evidence?.source_standardized_filename || null,
        source_processed_artifact: processedPath || evidence?.source_processed_artifact || null
    };
}

function summarizeProgress(items, terminalStatuses = DEFAULT_TERMINAL_STATUSES, extra = {}) {
    const total = items.length;
    const completed = items.filter((item) => terminalStatuses.has(item.status)).length;
    return {
        total,
        completed,
        running: items.filter((item) => item.status === QUEUE_ITEM_STATUSES.RUNNING).length,
        queued: items.filter((item) => item.status === QUEUE_ITEM_STATUSES.QUEUED).length,
        failed: items.filter((item) => item.status === QUEUE_ITEM_STATUSES.FAILED).length,
        authenticatedRequired: items.filter((item) => item.status === QUEUE_ITEM_STATUSES.AUTHENTICATION_REQUIRED).length,
        stopped: items.filter((item) => item.status === QUEUE_ITEM_STATUSES.STOPPED).length,
        success: items.filter((item) => item.status === QUEUE_ITEM_STATUSES.SUCCESS).length,
        ...extra
    };
}

function publicQueue(queue, { terminalStatuses = DEFAULT_TERMINAL_STATUSES, extraProgress = {} } = {}) {
    if (!queue) return null;
    return {
        queueId: queue.queueId,
        ...sourceIdentity(queue.source, queue.report),
        status: queue.status,
        stopRequested: queue.stopRequested,
        retryOf: queue.retryOf || null,
        createdAt: queue.createdAt,
        startedAt: queue.startedAt,
        endedAt: queue.endedAt,
        restartNotice: queue.restartNotice,
        progress: summarizeProgress(queue.items, terminalStatuses, extraProgress),
        items: queue.items.map((item) => ({
            ...item,
            source: normalizeSource(queue.source),
            report: queue.report,
            source_report: sourceIdentity(queue.source, queue.report).source_report,
            evidence: attachSourceEvidence({ ...item.evidence }, {
                source: queue.source,
                report: queue.report,
                originalFilename: item.evidence?.source_original_filename || item.evidence?.exported_filename || item.evidence?.downloaded_filename || null,
                standardizedFilename: item.evidence?.source_standardized_filename || item.evidence?.standardized_filename || item.evidence?.processed_filename || null,
                processedPath: item.evidence?.source_processed_artifact || item.evidence?.processed_file_path || null
            })
        }))
    };
}

module.exports = {
    DKCL_REPORT_EXTENSIONS,
    F13_REPORT,
    QUEUE_ITEM_STATUSES,
    DEFAULT_TERMINAL_STATUSES,
    normalizeSource,
    sourceIdentity,
    createQueueId,
    createBaseEvidence,
    attachSourceEvidence,
    summarizeProgress,
    publicQueue
};
