'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { TctF13BackfillService } = require('./src/services/tctF13BackfillService');

function makeDb() {
    const national = new Map([
        ['2026-07-19', { row_count: 34, distinct_count: 34 }],
        ['2026-07-18', { row_count: 12, distinct_count: 12 }],
        ['2026-07-16', { row_count: 0, distinct_count: 0 }]
    ]);
    const logs = new Map([
        ['2026-07-19', [{ status: 'SUCCESS', total_records: 34, error_records: 0, skipped_records: 0 }]],
        ['2026-07-18', [{ status: 'SUCCESS', total_records: 12, error_records: 0, skipped_records: 0 }]],
        ['2026-07-16', [{ status: 'FAILED', total_records: 0, error_records: 1, skipped_records: 0 }]]
    ]);
    return {
        async get(sql, params = []) {
            if (/COUNT\(\*\).*fact_f13_national/s.test(sql)) {
                return national.get(params[0]) || { row_count: 0, distinct_count: 0 };
            }
            if (/MIN\(ngay_do_kiem\)/.test(sql)) {
                return {
                    first_business_date: '2026-06-28',
                    last_business_date: '2026-07-19',
                    imported_dates_count: 2
                };
            }
            if (/FROM import_log/.test(sql)) {
                return {
                    file_name: 'F1.3-2026.07.19.xlsx',
                    ngay_do_kiem: '2026-07-19',
                    created_at: '2026-07-20 09:05:11',
                    total_records: 34
                };
            }
            throw new Error(`Unexpected get SQL: ${sql}`);
        },
        async all(sql, params = []) {
            if (/SELECT status/.test(sql)) {
                return logs.get(params[0]) || [];
            }
            if (/substr\(ngay_do_kiem, 1, 4\)/.test(sql)) {
                return [{ year: '2026' }];
            }
            if (/substr\(ngay_do_kiem, 1, 7\)/.test(sql)) {
                return [{ month: '2026-06' }, { month: '2026-07' }];
            }
            throw new Error(`Unexpected all SQL: ${sql}`);
        }
    };
}

function removeDirEventually(dir) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
            return;
        } catch (error) {
            if (attempt === 4) throw error;
        }
    }
}

(async () => {
    const fixtureProcessedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tct-f13-fixture-processed-'));
    process.env.DKCL_TCT_PROCESSED_DIR = fixtureProcessedDir;
    fs.writeFileSync(path.join(fixtureProcessedDir, 'F1.3-2026.07.19.xlsx'), Buffer.from([0x50, 0x4b, 0x03, 0x04]));

    const service = new TctF13BackfillService({ db: makeDb() });

    console.log('\nTEST 1: TCT coverage summary');
    const coverage = await service.getCoverageSummary({
        fromDate: '2026-07-17',
        toDate: '2026-07-19'
    });
    assert.strictEqual(coverage.source, 'TCT', 'coverage source is TCT');
    assert.strictEqual(coverage.ranked_population_count, 34, 'coverage exposes 34 ranked units');
    assert.deepStrictEqual(coverage.available_years, ['2026'], 'available years are returned');
    assert.deepStrictEqual(coverage.available_months, ['2026-06', '2026-07'], 'available months are returned');
    assert.strictEqual(coverage.first_business_date, '2026-06-28', 'first business date is returned');
    assert.strictEqual(coverage.last_business_date, '2026-07-19', 'latest business date is returned');
    assert.strictEqual(coverage.imported_dates_count, 2, 'imported date count is returned');
    assert.strictEqual(coverage.latest_successful_import.business_date, '2026-07-19', 'latest success evidence is returned');
    assert.deepStrictEqual(coverage.selected_range.completed_dates, ['2026-07-19'], 'selected range has completed dates');
    assert.deepStrictEqual(coverage.selected_range.missing_dates, ['2026-07-17'], 'selected range has missing dates');
    assert.strictEqual(new Set(coverage.selected_range.existing_dates).size, coverage.selected_range.existing_dates.length, 'existing dates are duplicate-free');

    console.log('\nTEST 2: existing/completed/missing/incomplete classification');
    const scan = await service.scanMissingDates({ fromDate: '2026-07-16', toDate: '2026-07-19' });
    assert.strictEqual(scan.total_days, 4, 'operator-selected date range is propagated');
    assert.deepStrictEqual(scan.missing_dates, ['2026-07-17'], 'missing date is classified');
    assert.deepStrictEqual(scan.incomplete_dates, ['2026-07-16', '2026-07-18'], '0/34 stale and partial dates are incomplete');
    assert.deepStrictEqual(scan.completed_dates, ['2026-07-19'], 'completed date is classified');
    assert.deepStrictEqual(scan.existing_dates, ['2026-07-16', '2026-07-18', '2026-07-19'], 'stale, partial and complete dates are existing dates');
    assert.strictEqual(scan.results.find((item) => item.measurement_date === '2026-07-16').status, 'INCOMPLETE', '0/34 stale evidence is incomplete');
    assert.strictEqual(scan.results.find((item) => item.measurement_date === '2026-07-16').selectable, true, '0/34 stale evidence is retryable/selectable');
    assert.strictEqual(scan.results.find((item) => item.measurement_date === '2026-07-18').status, 'INCOMPLETE', 'partial evidence is incomplete');
    assert.strictEqual(scan.results.find((item) => item.measurement_date === '2026-07-18').selectable, true, 'partial 1..33/34 evidence is retryable/selectable');
    assert.strictEqual(scan.results.find((item) => item.measurement_date === '2026-07-17').selectable, true, 'missing date is selectable');
    assert.strictEqual(scan.results.find((item) => item.measurement_date === '2026-07-19').selectable, true, 'completed date is selectable');

    console.log('\nTEST 3: queue sequencing and evidence');
    const processed = [];
    const queueDb = makeDb();
    const queueService = new TctF13BackfillService({
        db: queueDb,
        pollIntervalMs: 1,
        sessionPreflightService: { preflight: async () => ({ source: 'TCT', status: 'SESSION_VALID' }) }
    });
    queueService.runOneDateImport = async (date) => {
        processed.push(date);
        return {
            run_id: `run-${date}`,
            downloaded_filename: `download-${date}.xlsx`,
            workbook_row_count: 39,
            parsed_ranked_unit_count: 34,
            imported_database_row_count: 34,
            temp_file_deleted: false,
            local_file_retained: true,
            processed_filename: `F1.3-${date}.xlsx`,
            portal_cleanup_status: 'NOT_SUPPORTED'
        };
    };
    queueService.checkCompleted = async (date) => ({ complete: false, inconsistent: false, rowCount: 0, distinctCount: 0, successLogCount: 0 });
    queueService.loadDatabaseEvidence = async () => ({ rowCount: 34, distinctCount: 34, successLogCount: 1, errorLogCount: 0 });
    queueService.loadHueEvidence = async () => ({ volume: 2399, pass: 1261, kpi: 0.5256, rank: 24 });
    const queue = await queueService.startQueue(['2026-07-21', '2026-07-20']);
    assert(['QUEUED', 'RUNNING'].includes(queue.status), 'queue is accepted before async processing completes');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const finalQueue = queueService.getQueue(queue.queueId);
    assert.deepStrictEqual(processed, ['2026-07-20', '2026-07-21'], 'queue processes dates sequentially ascending');
    assert.strictEqual(finalQueue.status, 'SUCCESS', 'queue reaches success');
    assert.strictEqual(finalQueue.items[0].evidence.parsed_ranked_unit_count, 34, 'evidence includes exact 34-unit parse');
    assert.strictEqual(finalQueue.items[0].evidence.hue_rank, 24, 'evidence includes Hue rank');
    assert.strictEqual(finalQueue.items[0].evidence.temp_file_deleted, false, 'evidence confirms temp file was not deleted');
    assert.strictEqual(finalQueue.items[0].evidence.local_file_retained, true, 'evidence includes local file retention');

    console.log('\nTEST 4: duplicate/completed/preflight rejection before RUNNING');
    await assert.rejects(
        () => queueService.startQueue(['2026-07-20', '2026-07-20']),
        /Duplicate/,
        'duplicate dates are rejected'
    );
    const completedService = new TctF13BackfillService({
        db: makeDb(),
        pollIntervalMs: 1,
        sessionPreflightService: { preflight: async () => ({ source: 'TCT', status: 'SESSION_VALID' }) }
    });
    completedService.runOneDateImport = async () => ({
        run_id: 'incomplete-retry-run',
        downloaded_filename: 'incomplete-retry.xlsx',
        workbook_row_count: 39,
        parsed_ranked_unit_count: 34,
        imported_database_row_count: 34,
        replaced_incomplete_evidence: true,
        temp_file_deleted: false,
        local_file_retained: true
    });
    completedService.loadDatabaseEvidence = async () => ({ rowCount: 34, distinctCount: 34, successLogCount: 1, errorLogCount: 0 });
    completedService.loadHueEvidence = async () => ({ volume: null, pass: null, kpi: null, rank: null });
    await assert.rejects(
        () => completedService.startQueue(['2026-07-19']),
        /already has completed/,
        'completed dates are rejected'
    );
    const refreshQueue = await completedService.startQueue(['2026-07-19'], { refreshDates: ['2026-07-19'] });
    assert.strictEqual(refreshQueue.items[0].refreshRequested, true, 'a COMPLETE date is refreshed only after an explicit operator request');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const recoveryQueue = await completedService.startQueue(['2026-07-18']);
    assert(['QUEUED', 'RUNNING'].includes(recoveryQueue.status), 'incomplete dates are accepted for controlled re-import');
    const authService = new TctF13BackfillService({
        db: makeDb(),
        sessionPreflightService: { preflight: async () => ({ source: 'TCT', status: 'AUTHENTICATION_REQUIRED', error: { message: 'Đăng nhập lại' } }) }
    });
    authService.checkCompleted = async () => ({ complete: false, inconsistent: false });
    await assert.rejects(
        () => authService.startQueue(['2026-07-20']),
        /Đăng nhập lại/,
        'authentication-required preflight rejects before queue creation'
    );
    assert.strictEqual(authService.getActiveQueue(), null, 'preflight rejection does not create an active queue');

    console.log('\nTEST 5: one active queue, graceful stop, and retry eligibility');
    const slowService = new TctF13BackfillService({
        db: makeDb(),
        sessionPreflightService: { preflight: async () => ({ source: 'TCT', status: 'SESSION_VALID' }) }
    });
    slowService.checkCompleted = async () => ({ complete: false, inconsistent: false });
    slowService.loadDatabaseEvidence = async () => ({ rowCount: 0, distinctCount: 0, successLogCount: 0, errorLogCount: 0 });
    slowService.loadHueEvidence = async () => ({ volume: null, pass: null, kpi: null, rank: null });
    let release;
    slowService.runOneDateImport = async () => new Promise((resolve) => {
        release = () => resolve({
            run_id: 'slow-run',
            downloaded_filename: 'slow.xlsx',
            workbook_row_count: 39,
            parsed_ranked_unit_count: 34,
            imported_database_row_count: 34,
            temp_file_deleted: false,
            local_file_retained: true
        });
    });
    const slowQueue = await slowService.startQueue(['2026-07-20', '2026-07-21']);
    await assert.rejects(
        () => slowService.startQueue(['2026-07-22']),
        /already active/,
        'only one active TCT queue is allowed'
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    const stopped = slowService.stopQueue(slowQueue.queueId);
    assert.strictEqual(stopped.items[1].status, 'STOPPED', 'queued item is stopped gracefully');
    release();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(slowService.getQueue(slowQueue.queueId).status, 'STOPPED', 'queue final state is STOPPED after graceful stop');

    const retryService = new TctF13BackfillService({
        db: makeDb(),
        sessionPreflightService: { preflight: async () => ({ source: 'TCT', status: 'SESSION_VALID' }) }
    });
    retryService.checkCompleted = async () => ({ complete: false, inconsistent: false });
    retryService.loadDatabaseEvidence = async () => ({ rowCount: 0, distinctCount: 0, successLogCount: 0, errorLogCount: 1 });
    retryService.loadHueEvidence = async () => ({ volume: null, pass: null, kpi: null, rank: null });
    retryService.runOneDateImport = async () => {
        const error = new Error('boom');
        error.code = 'IMPORT_FAILED';
        throw error;
    };
    const failedQueue = await retryService.startQueue(['2026-07-20']);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(retryService.getQueue(failedQueue.queueId).items[0].status, 'FAILED', 'failed item is retryable');
    retryService.runOneDateImport = async () => ({
        run_id: 'retry-run',
        downloaded_filename: 'retry.xlsx',
            workbook_row_count: 39,
            parsed_ranked_unit_count: 34,
            imported_database_row_count: 34,
            temp_file_deleted: false,
            local_file_retained: true
        });
    const retryQueue = await retryService.retryQueueItem(failedQueue.queueId, '2026-07-20');
    assert(['QUEUED', 'RUNNING'].includes(retryQueue.items[0].status), 'failed item retry creates a new queue');
    await new Promise((resolve) => setTimeout(resolve, 20));
    await assert.rejects(
        () => retryService.retryQueueItem(retryQueue.queueId, '2026-07-20'),
        /cannot be retried/,
        'successful item cannot be retried'
    );

    console.log('\nTEST 5B: systemic portal failures block the queue after one date');
    const blockedService = new TctF13BackfillService({
        db: makeDb(),
        pollIntervalMs: 1,
        sessionPreflightService: { preflight: async () => ({ source: 'TCT', status: 'SESSION_VALID' }) }
    });
    blockedService.checkCompleted = async () => ({ complete: false, incomplete: false, rowCount: 0, distinctCount: 0, successLogCount: 0 });
    blockedService.loadDatabaseEvidence = async () => ({ rowCount: 0, distinctCount: 0, successLogCount: 0, errorLogCount: 0 });
    blockedService.loadHueEvidence = async () => ({ volume: null, pass: null, kpi: null, rank: null });
    const blockedDates = [];
    blockedService.runOneDateImport = async (date) => {
        blockedDates.push(date);
        const error = new Error('TCT export control is not ready.');
        error.code = 'EXPORT_CONTROL_NOT_READY';
        throw error;
    };
    const blockedQueue = await blockedService.startQueue(['2026-07-20', '2026-07-21']);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const blockedFinal = blockedService.getQueue(blockedQueue.queueId);
    assert.strictEqual(blockedFinal.status, 'BLOCKED', 'systemic portal error blocks the queue');
    assert.deepStrictEqual(blockedDates, ['2026-07-20'], 'only the first date is attempted');
    assert.strictEqual(blockedFinal.items[0].status, 'FAILED', 'attempted date retains its explicit failure');
    assert.strictEqual(blockedFinal.items[1].status, 'QUEUED', 'remaining date stays unrun for retry');
    const blockedRetry = await blockedService.retryQueueItem(blockedQueue.queueId, '2026-07-21');
    assert(['QUEUED', 'RUNNING'].includes(blockedRetry.status), 'unrun blocked date can be retried after remediation');

    console.log('\nTEST 6: workbook cleanup on failure and authentication retry eligibility');
    const cleanupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tct-f13-backfill-'));
    const invalidWorkbook = path.join(cleanupDir, 'invalid.xlsx');
    const cleanupService = new TctF13BackfillService({
        db: makeDb(),
        rawDownloadDir: cleanupDir,
        portalClientFactory: () => ({
            async authenticate() {},
            async openF13Report() {},
            async submitFilters() {},
            async waitForF13ExportReadiness() { return { ready: true, status: 'READY_TO_EXPORT' }; },
            async requestSummaryExport() {},
            async pollGeneratedFile() {
                return { fileName: 'invalid.xlsx' };
            },
            async downloadXlsx() {
                fs.writeFileSync(invalidWorkbook, 'not an xlsx');
                return invalidWorkbook;
            },
            async close() {}
        })
    });
    await assert.rejects(
        () => cleanupService.runOneDateImport('2026-07-20', 'queue-cleanup'),
        (error) => {
            assert.strictEqual(error.code, 'INVALID_XLSX', 'invalid workbook fails validation');
            assert.strictEqual(error.evidence.temp_file_deleted, false, 'failure evidence confirms temp workbook is not deleted');
            assert.strictEqual(error.evidence.local_file_retained, true, 'failure evidence keeps local workbook for investigation');
            return true;
        }
    );
    assert.strictEqual(fs.existsSync(invalidWorkbook), true, 'temporary workbook is retained after failure');
    removeDirEventually(cleanupDir);

    const authRetryService = new TctF13BackfillService({
        db: makeDb(),
        sessionPreflightService: { preflight: async () => ({ source: 'TCT', status: 'SESSION_VALID' }) }
    });
    authRetryService.checkCompleted = async () => ({ complete: false, inconsistent: false });
    authRetryService.loadDatabaseEvidence = async () => ({ rowCount: 0, distinctCount: 0, successLogCount: 0, errorLogCount: 1 });
    authRetryService.loadHueEvidence = async () => ({ volume: null, pass: null, kpi: null, rank: null });
    authRetryService.runOneDateImport = async () => {
        const error = new Error('Đăng nhập lại TCT DKCL');
        error.code = 'AUTHENTICATION_REQUIRED';
        throw error;
    };
    const authFailedQueue = await authRetryService.startQueue(['2026-07-22']);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(authRetryService.getQueue(authFailedQueue.queueId).items[0].status, 'AUTHENTICATION_REQUIRED', 'authentication-required item is retryable');
    authRetryService.runOneDateImport = async () => ({
        run_id: 'auth-retry-run',
        downloaded_filename: 'auth-retry.xlsx',
        workbook_row_count: 39,
        parsed_ranked_unit_count: 34,
        imported_database_row_count: 34,
        temp_file_deleted: false,
        local_file_retained: true
    });
    const authRetryQueue = await authRetryService.retryQueueItem(authFailedQueue.queueId, '2026-07-22');
    assert(['QUEUED', 'RUNNING'].includes(authRetryQueue.items[0].status), 'authentication-required item retry creates a new queue');

    console.log('\nTEST 7: incomplete retry replaces only invalid evidence and still blocks complete dates');
    const replaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tct-f13-replace-'));
    const replaceProcessedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tct-f13-processed-'));
    fs.writeFileSync(path.join(replaceProcessedDir, 'F1.3-2026.07.19.xlsx'), Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    const downloadedWorkbook = path.join(replaceDir, 'valid.xlsx');
    const importCalls = [];
    const cleanupOrder = [];
    const replaceService = new TctF13BackfillService({
        db: makeDb(),
        rawDownloadDir: replaceDir,
        processedDir: replaceProcessedDir,
        importNationalParsedData: async (payload) => {
            importCalls.push(payload);
            return { inserted: 34 };
        },
        portalClientFactory: () => ({
            async authenticate() {},
            async openF13Report() {},
            async submitFilters() {},
            async waitForF13ExportReadiness() { return { ready: true, status: 'READY_TO_EXPORT' }; },
            async requestSummaryExport() {},
            async pollGeneratedFile() {
                return { filename: 'valid.xlsx' };
            },
            async downloadXlsx() {
                fs.writeFileSync(downloadedWorkbook, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
                return downloadedWorkbook;
            },
            async deleteGeneratedFile(file) {
                cleanupOrder.push({
                    file: file.filename,
                    processedExists: fs.existsSync(path.join(replaceProcessedDir, 'F1.3-2026.07.18.xlsx'))
                });
                return { status: 'DELETED' };
            },
            async close() {}
        })
    });
    replaceService.validateWorkbook = () => ({
        workbookRowCount: 40,
        parsed: {
            totalParsed: 34,
            parsedData: [{ ma_tinh_phat: '53' }]
        }
    });
    const replaced = await replaceService.runOneDateImport('2026-07-18', 'queue-replace');
    assert.strictEqual(importCalls[0].forceReimport, true, 'incomplete rows are safely replaced during retry');
    assert.strictEqual(replaced.replaced_incomplete_evidence, true, 'evidence marks incomplete replacement');
    assert.strictEqual(replaced.temp_file_deleted, false, 'successful import does not delete local evidence');
    assert.strictEqual(replaced.local_file_retained, true, 'successful import retains local processed evidence');
    assert.strictEqual(replaced.processed_filename, 'F1.3-2026.07.18.xlsx', 'processed TCT workbook is standardized');
    assert.strictEqual(fs.existsSync(path.join(replaceProcessedDir, 'F1.3-2026.07.18.xlsx')), true, 'processed TCT workbook is retained');
    assert.strictEqual(fs.existsSync(downloadedWorkbook), false, 'raw download is moved rather than unlinked');
    assert.strictEqual(replaced.portal_cleanup_status, 'DELETED', 'portal cleanup status is reported after persistence');
    assert.deepStrictEqual(cleanupOrder[0], {
        file: 'valid.xlsx',
        processedExists: true
    }, 'portal cleanup runs only after processed workbook exists');
    await assert.rejects(
        () => replaceService.runOneDateImport('2026-07-19', 'queue-complete'),
        /already has completed/,
        'completed 34/34 date is not force-replaced'
    );
    const refreshed = await replaceService.runOneDateImport('2026-07-19', 'queue-refresh', { refreshRequested: true });
    assert.strictEqual(importCalls.at(-1).forceReimport, true, 'explicit COMPLETE refresh uses transactional re-import');
    assert.strictEqual(refreshed.replaced_incomplete_evidence, true, 'refresh evidence records the reconciliation path');
    assert.strictEqual(fs.existsSync(refreshed.processed_file_path), true, 'refreshed processed workbook exists');
    removeDirEventually(replaceDir);
    removeDirEventually(replaceProcessedDir);

    console.log('\nTEST 8: persistence failure keeps source file and skips portal cleanup');
    const persistRawDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tct-f13-persist-'));
    const blockedProcessedPath = path.join(os.tmpdir(), `tct-f13-processed-file-${Date.now()}.tmp`);
    fs.writeFileSync(blockedProcessedPath, 'not a directory');
    const persistWorkbook = path.join(persistRawDir, 'persist.xlsx');
    let cleanupAttempted = false;
    const persistService = new TctF13BackfillService({
        db: makeDb(),
        rawDownloadDir: persistRawDir,
        processedDir: blockedProcessedPath,
        importNationalParsedData: async () => ({ inserted: 34 }),
        portalClientFactory: () => ({
            async authenticate() {},
            async openF13Report() {},
            async submitFilters() {},
            async waitForF13ExportReadiness() { return { ready: true, status: 'READY_TO_EXPORT' }; },
            async requestSummaryExport() {},
            async pollGeneratedFile() { return { filename: 'persist.xlsx' }; },
            async downloadXlsx() {
                fs.writeFileSync(persistWorkbook, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
                return persistWorkbook;
            },
            async deleteGeneratedFile() { cleanupAttempted = true; },
            async close() {}
        })
    });
    persistService.validateWorkbook = () => ({
        workbookRowCount: 40,
        parsed: {
            totalParsed: 34,
            parsedData: [{ ma_tinh_phat: '53' }]
        }
    });
    await assert.rejects(
        () => persistService.runOneDateImport('2026-07-18', 'queue-persist'),
        (error) => {
            assert.strictEqual(error.evidence.temp_file_deleted, false, 'persistence failure does not delete source evidence');
            assert.strictEqual(error.evidence.local_file_retained, true, 'source workbook remains for investigation');
            return true;
        }
    );
    assert.strictEqual(cleanupAttempted, false, 'portal cleanup is skipped when processed persistence fails');
    assert.strictEqual(fs.existsSync(persistWorkbook), true, 'source workbook remains after persistence failure');
    removeDirEventually(persistRawDir);
    fs.rmSync(blockedProcessedPath, { force: true });
    removeDirEventually(fixtureProcessedDir);

    console.log('\nRESULT: tctF13BackfillService checks passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
