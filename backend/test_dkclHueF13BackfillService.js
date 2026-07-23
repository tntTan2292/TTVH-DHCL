/**
 * Focused AUTO-IMPORT-003 tests for Hue F1.3 missing-date scan.
 * Run: node test_dkclHueF13BackfillService.js
 */
'use strict';

const {
    DkclHueF13BackfillService,
    enumerateDates
} = require('./src/services/dkclHueF13BackfillService');
const { globalRegistry } = require('./src/services/dkclSessionPreflightService');

const validHueClient = {
    isF13ReportReady: async () => true,
    isAuthenticated: async () => true,
    close: async () => {}
};
globalRegistry.set('HUE', {
    state: 'BACKGROUND_READY',
    client: validHueClient,
    openingPromise: null,
    authenticated: true,
    backgroundReady: true,
    lastError: null,
    updatedAt: new Date().toISOString()
});

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
    if (condition) {
        console.log(`  PASS: ${label}`);
        passed++;
    } else {
        console.error(`  FAIL: ${label}${detail ? ' - ' + detail : ''}`);
        failed++;
    }
}

async function runTests() {
    console.log('\nTEST 1: inclusive date enumeration');
    assert('range includes both endpoints', enumerateDates('2026-07-16', '2026-07-18').join(',') === '2026-07-16,2026-07-17,2026-07-18');
    assert('single day is accepted', enumerateDates('2026-07-16', '2026-07-16').join(',') === '2026-07-16');

    console.log('\nTEST 2: invalid scan inputs fail safely');
    let invalidCode = null;
    try {
        await new DkclHueF13BackfillService({ syncService: { checkCompleted: async () => ({}) } }).scanMissingDates({
            fromDate: '16/07/2026',
            toDate: '2026-07-18'
        });
    } catch (error) {
        invalidCode = error.code;
    }
    assert('invalid date format is rejected', invalidCode === 'INVALID_DATE');

    let reversedCode = null;
    try {
        enumerateDates('2026-07-18', '2026-07-16');
    } catch (error) {
        reversedCode = error.code;
    }
    assert('reversed range is rejected', reversedCode === 'INVALID_DATE_RANGE');

    assert('large range is accepted without arbitrary scan limit', enumerateDates('2026-01-01', '2026-04-01').length === 91);

    console.log('\nTEST 3: scan maps completion states to selectable operations');
    const calls = [];
    const fakeSyncService = {
        async checkCompleted(date) {
            calls.push(date);
            if (date === '2026-07-16') {
                return {
                    complete: true,
                    rowCount: 3941,
                    distinctCount: 3941,
                    processedPath: 'Data DKCL/F1.3/Processed/HUE/F1.3-2026.07.16.xlsx'
                };
            }
            if (date === '2026-07-17') {
                return {
                    complete: false,
                    inconsistent: false,
                    staleEvidence: true,
                    rowCount: 0,
                    distinctCount: 0,
                    reason: 'No valid completed Hue F1.3 import evidence; stale logs/files do not block Update.'
                };
            }
            return { complete: false, inconsistent: false };
        }
    };
    const service = new DkclHueF13BackfillService({ syncService: fakeSyncService });
    const result = await service.scanMissingDates({
        fromDate: '2026-07-16',
        toDate: '2026-07-18'
    });

    assert('completion check is called sequentially by date', calls.join(',') === '2026-07-16,2026-07-17,2026-07-18');
    assert('summary counts are correct', result.complete_count === 1 && result.manual_review_count === 0 && result.missing_count === 2);
    assert('complete date is selectable', result.results[0].status === 'COMPLETE' && result.results[0].selectable === true);
    assert('stale evidence date is selectable as missing', result.results[1].status === 'MISSING' && result.results[1].selectable === true);
    assert('missing date is selectable', result.results[2].status === 'MISSING' && result.results[2].selectable === true);
    assert('standardized evidence filename is returned', result.results[2].evidence.standardized_filename === 'F1.3-2026.07.18.xlsx');
    assert('scan exposes explicit date lists', result.existing_dates.join(',') === '2026-07-16' && result.missing_dates.join(',') === '2026-07-17,2026-07-18' && result.completed_dates.join(',') === '2026-07-16');

    console.log('\nTEST 4: coverage summary exposes database coverage and selected range');
    const coverageService = new DkclHueF13BackfillService({
        syncService: {
            db: {
                async get(sql) {
                    if (/MIN\(ngay_do_kiem\)/.test(sql)) {
                        return {
                            first_business_date: '2026-05-01',
                            last_business_date: '2026-07-18',
                            imported_dates_count: 42
                        };
                    }
                    return {
                        file_name: 'F1.3-2026.07.18.xlsx',
                        ngay_do_kiem: '2026-07-18',
                        created_at: '2026-07-19 23:08:39',
                        total_records: 3174
                    };
                },
                async all(sql) {
                    if (/substr\(ngay_do_kiem, 1, 4\)/.test(sql)) return [{ year: '2026' }];
                    if (/substr\(ngay_do_kiem, 1, 7\)/.test(sql)) return [{ month: '2026-05' }, { month: '2026-06' }, { month: '2026-07' }];
                    return [];
                }
            },
            async checkCompleted(date) {
                if (date === '2026-07-16') return { complete: true, rowCount: 3941, distinctCount: 3941, processedPath: 'done.xlsx' };
                return { complete: false, inconsistent: false };
            }
        }
    });
    const coverage = await coverageService.getCoverageSummary({
        fromDate: '2026-07-16',
        toDate: '2026-07-17'
    });
    assert('coverage exposes available years and months', coverage.available_years.join(',') === '2026' && coverage.available_months.join(',') === '2026-05,2026-06,2026-07');
    assert('coverage exposes first and last business date', coverage.first_business_date === '2026-05-01' && coverage.last_business_date === '2026-07-18');
    assert('coverage exposes imported date count and latest success', coverage.imported_dates_count === 42 && coverage.latest_successful_import.business_date === '2026-07-18');
    assert('coverage selected range exposes missing count and date lists', coverage.selected_range.missing_dates_count === 1 && coverage.selected_range.completed_dates.join(',') === '2026-07-16' && coverage.selected_range.missing_dates.join(',') === '2026-07-17');

    console.log('\nTEST 5: queue processes dates sequentially and returns evidence');
    const sequentialEvents = [];
    const sequentialOptions = [];
    const sequentialRuns = new Map();
    const sequentialService = new DkclHueF13BackfillService({
        pollIntervalMs: 1,
        syncService: {
            db: makeEvidenceDb({ '2026-07-20': 5, '2026-07-21': 7 }),
            async checkCompleted() { return { complete: false, inconsistent: false }; },
            async validateAuthentication(options) {
                sequentialOptions.push(['validateAuthentication', options?.requireExistingSession]);
            },
            async start(date, options) {
                sequentialOptions.push(['start', date, options?.requireExistingSession]);
                sequentialEvents.push(['start', date]);
                const run = {
                    runId: `run-${date}`,
                    status: 'RUNNING',
                    generatedPortalFilename: `export-${date}.xlsx`,
                    workbookRowCount: date.endsWith('20') ? 5 : 7,
                    importedCount: date.endsWith('20') ? 5 : 7
                };
                sequentialRuns.set(run.runId, run);
                setTimeout(() => {
                    sequentialEvents.push(['finish', date]);
                    run.status = 'SUCCESS';
                }, 5);
                return { accepted: true, status: 'QUEUED', run };
            },
            getRun(runId) { return sequentialRuns.get(runId); }
        }
    });
    const sequentialQueue = await sequentialService.startQueue(['2026-07-21', '2026-07-20']);
    await waitForQueue(sequentialService, sequentialQueue.queueId);
    const sequentialDone = sequentialService.getQueue(sequentialQueue.queueId);
    assert('queue sorts selected dates ascending', sequentialDone.items.map((item) => item.measurementDate).join(',') === '2026-07-20,2026-07-21');
    assert('second date starts after first finishes', sequentialEvents.map((event) => event.join(':')).join('|') === 'start:2026-07-20|finish:2026-07-20|start:2026-07-21|finish:2026-07-21', JSON.stringify(sequentialEvents));
    assert('queue reaches SUCCESS', sequentialDone.status === 'SUCCESS');
    assert('queue validates authentication before running and requires existing session for worker', sequentialOptions.map((event) => event.join(':')).join('|') === 'validateAuthentication:true|start:2026-07-20:true|start:2026-07-21:true', JSON.stringify(sequentialOptions));
    assert('evidence includes run, export, workbook, DB and logs', sequentialDone.items[0].evidence.run_id === 'run-2026-07-20' && sequentialDone.items[0].evidence.exported_filename === 'export-2026-07-20.xlsx' && sequentialDone.items[0].evidence.workbook_row_count === 5 && sequentialDone.items[0].evidence.imported_database_row_count === 5 && sequentialDone.items[0].evidence.distinct_shipment_count === 5 && sequentialDone.items[0].evidence.success_log_count === 1);
    assert('queue status progress summarizes items', sequentialDone.progress.total === 2 && sequentialDone.progress.success === 2 && sequentialDone.progress.completed === 2);
    assert('restart limitation is exposed', /in memory/i.test(sequentialDone.restartNotice));

    console.log('\nTEST 6: duplicate and completed dates are rejected');
    let duplicateCode = null;
    try {
        await sequentialService.startQueue(['2026-07-22', '2026-07-22']);
    } catch (error) {
        duplicateCode = error.code;
    }
    assert('duplicate submitted dates are rejected', duplicateCode === 'DUPLICATE_DATES');

    let completedCode = null;
    const completedService = new DkclHueF13BackfillService({
        syncService: {
            async checkCompleted() { return { complete: true, rowCount: 1, distinctCount: 1, processedPath: 'done.xlsx' }; }
        }
    });
    try {
        await completedService.startQueue(['2026-07-23']);
    } catch (error) {
        completedCode = error.code;
    }
    assert('completed date is rejected before queue start', completedCode === 'DATE_ALREADY_COMPLETED');

    console.log('\nTEST 6B: invalid DKCL authentication rejects queue before start');
    let authRejectCode = null;
    let authRejectStarted = false;
    const authRejectService = new DkclHueF13BackfillService({
        syncService: {
            async validateAuthentication() {
                const error = new Error('expired DKCL session');
                error.code = 'AUTHENTICATION_REQUIRED';
                throw error;
            },
            async checkCompleted() { return { complete: false, inconsistent: false }; },
            async start() {
                authRejectStarted = true;
            }
        }
    });
    try {
        globalRegistry.set('HUE', {
            state: 'SESSION_EXPIRED',
            client: null,
            openingPromise: null,
            authenticated: false,
            backgroundReady: false,
            lastError: null,
            updatedAt: new Date().toISOString()
        });
        await authRejectService.startQueue(['2026-07-30']);
    } catch (error) {
        authRejectCode = error.code;
    } finally {
        globalRegistry.set('HUE', {
            state: 'BACKGROUND_READY',
            client: validHueClient,
            openingPromise: null,
            authenticated: true,
            backgroundReady: true,
            lastError: null,
            updatedAt: new Date().toISOString()
        });
    }
    assert('invalid authentication rejects queue creation immediately', authRejectCode === 'AUTHENTICATION_REQUIRED' && authRejectService.getActiveQueue() === null);
    assert('invalid authentication does not start worker', authRejectStarted === false);

    console.log('\nTEST 7: only one active queue and duplicate active date are rejected');
    const activeRuns = new Map();
    const activeService = new DkclHueF13BackfillService({
        pollIntervalMs: 1,
        syncService: {
            db: makeEvidenceDb({}),
            async checkCompleted() { return { complete: false, inconsistent: false }; },
            async start(date) {
                const run = { runId: `active-${date}`, status: 'RUNNING' };
                activeRuns.set(run.runId, run);
                return { accepted: true, status: 'QUEUED', run };
            },
            getRun(runId) { return activeRuns.get(runId); }
        }
    });
    const activeQueue = await activeService.startQueue(['2026-07-24']);
    let activeCode = null;
    try {
        await activeService.startQueue(['2026-07-25']);
    } catch (error) {
        activeCode = error.code;
    }
    assert('second active queue is rejected', activeCode === 'QUEUE_ALREADY_ACTIVE');
    activeService.stopQueue(activeQueue.queueId);
    activeRuns.get('active-2026-07-24').status = 'FAILED';
    await waitForQueue(activeService, activeQueue.queueId);

    console.log('\nTEST 8: graceful stop allows running item to finish and stops remaining items');
    const stopRuns = new Map();
    const stopService = new DkclHueF13BackfillService({
        pollIntervalMs: 1,
        syncService: {
            db: makeEvidenceDb({ '2026-07-26': 3 }),
            async checkCompleted() { return { complete: false, inconsistent: false }; },
            async start(date) {
                const run = { runId: `stop-${date}`, status: 'RUNNING', importedCount: 3, workbookRowCount: 3 };
                stopRuns.set(run.runId, run);
                return { accepted: true, status: 'QUEUED', run };
            },
            getRun(runId) { return stopRuns.get(runId); }
        }
    });
    const stopQueue = await stopService.startQueue(['2026-07-26', '2026-07-27']);
    await waitUntil(() => stopService.getQueue(stopQueue.queueId).items[0].status === 'RUNNING');
    const stoppedSnapshot = stopService.stopQueue(stopQueue.queueId);
    assert('stop marks queued item as STOPPED while first runs', stoppedSnapshot.items[1].status === 'STOPPED');
    stopRuns.get('stop-2026-07-26').status = 'SUCCESS';
    await waitForQueue(stopService, stopQueue.queueId);
    const stopDone = stopService.getQueue(stopQueue.queueId);
    assert('running item completes successfully after stop', stopDone.items[0].status === 'SUCCESS');
    assert('queue final status is STOPPED', stopDone.status === 'STOPPED');

    console.log('\nTEST 9: retry is allowed after failure and authentication required');
    const retryService = makeRetryableService();
    const failedQueue = await retryService.startQueue(['2026-07-28']);
    await waitForQueue(retryService, failedQueue.queueId);
    const failedDone = retryService.getQueue(failedQueue.queueId);
    assert('initial item fails', failedDone.items[0].status === 'FAILED');
    const retryFailed = await retryService.retryQueueItem(failedQueue.queueId, '2026-07-28');
    await waitForQueue(retryService, retryFailed.queueId);
    assert('failed item can be retried through a new queue', retryService.getQueue(retryFailed.queueId).status === 'SUCCESS');

    const authService = makeRetryableService('AUTHENTICATION_REQUIRED');
    const authQueue = await authService.startQueue(['2026-07-29']);
    await waitForQueue(authService, authQueue.queueId);
    const retryAuth = await authService.retryQueueItem(authQueue.queueId, '2026-07-29');
    await waitForQueue(authService, retryAuth.queueId);
    assert('auth item can be retried through a new queue', authService.getQueue(retryAuth.queueId).status === 'SUCCESS');

    let successRetryCode = null;
    try {
        await retryService.retryQueueItem(retryFailed.queueId, '2026-07-28');
    } catch (error) {
        successRetryCode = error.code;
    }
    assert('successful item cannot be retried', successRetryCode === 'QUEUE_ITEM_NOT_RETRYABLE');

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

function makeEvidenceDb(rowCounts = {}) {
    return {
        async get(_sql, params) {
            const count = rowCounts[params[0]] ?? 0;
            return { row_count: count, distinct_count: count };
        },
        async all(_sql, params) {
            const count = rowCounts[params[0]] ?? 0;
            return count > 0 ? [{ status: 'SUCCESS' }] : [];
        }
    };
}

async function waitUntil(predicate, timeoutMs = 1000) {
    const timeoutAt = Date.now() + timeoutMs;
    while (Date.now() < timeoutAt) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 2));
    }
    throw new Error('Timed out waiting for condition.');
}

async function waitForQueue(service, queueId) {
    await waitUntil(() => ['SUCCESS', 'FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(service.getQueue(queueId)?.status), 2000);
    return service.getQueue(queueId);
}

function makeRetryableService(firstStatus = 'FAILED') {
    const runs = new Map();
    const attempts = new Map();
    return new DkclHueF13BackfillService({
        pollIntervalMs: 1,
        syncService: {
            db: makeEvidenceDb({ '2026-07-28': 2, '2026-07-29': 2 }),
            async checkCompleted() { return { complete: false, inconsistent: false }; },
            async start(date) {
                const nextAttempt = (attempts.get(date) || 0) + 1;
                attempts.set(date, nextAttempt);
                const terminalStatus = nextAttempt === 1 ? firstStatus : 'SUCCESS';
                const run = {
                    runId: `retry-${date}-${nextAttempt}`,
                    status: terminalStatus,
                    safeErrorMessage: terminalStatus === 'SUCCESS' ? null : `${terminalStatus} test error`,
                    generatedPortalFilename: `retry-${date}.xlsx`,
                    workbookRowCount: 2,
                    importedCount: terminalStatus === 'SUCCESS' ? 2 : null
                };
                runs.set(run.runId, run);
                return { accepted: true, status: 'QUEUED', run };
            },
            getRun(runId) { return runs.get(runId); }
        }
    });
}

runTests().catch((error) => {
    console.error('FATAL TEST ERROR:', error);
    process.exit(1);
});
