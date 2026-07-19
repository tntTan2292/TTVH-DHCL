/**
 * test_dkclHueF13SyncService.js
 *
 * Focused AUTO-IMPORT-002 tests for the Huế F1.3 acquisition engine.
 * Run: node test_dkclHueF13SyncService.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const { run, get, all, db } = require('./src/config/db');
const { COLUMN_MAPPING } = require('./src/services/excelParser');
const {
    DkclHueF13SyncService,
    STATUSES,
    standardizedFilename,
    safeErrorMessage,
    selectNewestGeneratedFile
} = require('./src/services/dkclHueF13SyncService');
const {
    BASE_INCOMING,
    BASE_PROCESSED,
    BASE_ERROR,
    BASE_PROCESSING
} = require('./src/services/importPipeline');
const {
    DkclHueF13PortalClient,
    formatPortalRequestDate,
    findVisibleDetailCandidateIndex,
    findExactFileRowIndexes,
    DETAIL_METRIC_HEADER
} = require('./src/services/dkclHueF13PortalClient');

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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function removeIfExists(filePath) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function pathIn(base, filename) {
    return path.join(base, 'HUE', filename);
}

function buildWorkbook(rowCount) {
    const headers = Object.keys(COLUMN_MAPPING);
    const rowTemplate = Object.fromEntries(headers.map((header) => [header, null]));
    const rows = Array.from({ length: rowCount }, (_, idx) => ({
        ...rowTemplate,
        'Số hiệu bưu gửi': `AUTO002_${String(idx + 1).padStart(4, '0')}`,
        'Mã BC phát': '533140',
        'Tên BC phát': 'BCVH TEST',
        'Đánh giá 2026 (Đạt/Không đạt)': idx % 2 === 0 ? 'Đạt' : 'Không đạt'
    }));

    const sheetRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))];
    const ws = xlsx.utils.aoa_to_sheet(sheetRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Worksheet');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function makePortalClient({ sourcePath, total = 2, delayMs = 0, filename = 'generated_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx' }) {
    const calls = [];
    return {
        calls,
        async authenticate(payload) {
            calls.push(['authenticate', !!payload.username, !!payload.password]);
        },
        async openF13Report() {
            calls.push(['openF13Report']);
        },
        async submitFilters(filters) {
            calls.push(['submitFilters', filters]);
        },
        async getSelectedFilters() {
            calls.push(['getSelectedFilters']);
            return {
                groupBy: { value: 'BC', label: 'BC' },
                province: { value: '53', label: '53 - Bưu điện tỉnh Thừa Thiên Huế' },
                bcktProvince: { value: 'ALL', label: 'Chọn tất cả' },
                deliveryPostOffice: { value: 'ALL', label: 'Chọn tất cả' },
                fromDate: '01/02/2098',
                toDate: '01/02/2098'
            };
        },
        async readDetailTotal() {
            calls.push(['readDetailTotal']);
            return total;
        },
        async openDetailTable() {
            calls.push(['openDetailTable']);
            return {
                header: DETAIL_METRIC_HEADER,
                value: total,
                cellIndex: 8,
                selector: 'summary aggregate row visible td.ajax_cell'
            };
        },
        async readDetailTableTotal() {
            calls.push(['readDetailTableTotal']);
            return total;
        },
        async requestDetailExport() {
            calls.push(['requestDetailExport']);
        },
        async pollGeneratedFile({ requestedAt }) {
            calls.push(['pollGeneratedFile', requestedAt instanceof Date]);
            if (delayMs) await sleep(delayMs);
            return { filename, createdAt: new Date(Date.now() + 1000).toISOString() };
        },
        async downloadXlsx({ targetDir }) {
            calls.push(['downloadXlsx']);
            ensureDir(targetDir);
            const targetPath = path.join(targetDir, filename);
            fs.copyFileSync(sourcePath, targetPath);
            return targetPath;
        },
        async deleteGeneratedFile(file) {
            calls.push(['deleteGeneratedFile', file.filename]);
        }
    };
}

function makeFakeLocator(page, kind) {
    return {
        first() { return this; },
        last() { return this; },
        nth() { return this; },
        filter() { return this; },
        locator() { return this; },
        async count() {
            if (kind === 'username' || kind === 'password') return page.currentUrl.includes('/login') ? 1 : 0;
            if (kind === 'date') return 2;
            if (kind === 'submit') return 1;
            if (kind === 'hrm') return /HRM|ma nhan vien|employee|nhan vien/i.test(page.bodyText) ? 1 : 0;
            return 1;
        },
        async fill(value) {
            page.events.push(['fill', kind, value ? '[REDACTED]' : '']);
        },
        async evaluate(callback, value) {
            page.events.push(['evaluate', kind, value]);
            callback({ value: '', dispatchEvent() {} }, value);
        },
        async click() {
            page.events.push(['click', kind]);
            if (kind === 'submit' && /HRM|ma nhan vien|employee|nhan vien/i.test(page.bodyText)) {
                page.afterHrmSubmit?.();
            } else if (kind === 'submit' && page.currentUrl.includes('/login')) {
                page.afterPasswordSubmit?.();
            }
        },
        async textContent() { return null; },
        async innerText() { return page.bodyText; },
        async selectOption() {},
        async waitFor() {}
    };
}

function makeFakePortalPage({ events, initialUrl, bodyText }) {
    return {
        events,
        currentUrl: initialUrl,
        bodyText,
        afterPasswordSubmit: null,
        afterHrmSubmit: null,
        url() { return this.currentUrl; },
        async goto(url) {
            events.push(['goto', url]);
            this.currentUrl = url;
        },
        locator(selector) {
            if (selector === 'body') return makeFakeLocator(this, 'body');
            if (selector.includes('password')) return makeFakeLocator(this, 'password');
            if (selector.includes('hrm') || selector.includes('employee')) return makeFakeLocator(this, 'hrm');
            if (this.currentUrl.includes('/login') && (selector.includes('email') || selector.includes('user') || selector.includes('login'))) return makeFakeLocator(this, 'username');
            if (selector.includes('input[type="text"]') || selector.includes('input[type="date"]')) return makeFakeLocator(this, 'date');
            if (selector.includes('button') || selector.includes('submit')) return makeFakeLocator(this, 'submit');
            return makeFakeLocator(this, 'username');
        },
        getByRole() { return makeFakeLocator(this, 'submit'); },
        async evaluate(callback, value) {
            events.push(['page-evaluate', value]);
            const previousDocument = global.document;
            global.document = {
                querySelector() {
                    return { value: '', dispatchEvent() {} };
                }
            };
            try {
                return callback(value);
            } finally {
                global.document = previousDocument;
            }
        },
        async waitForFunction() {},
        async waitForLoadState() {},
        async waitForTimeout() {}
    };
}

function makeFakePlaywright(page, events) {
    return {
        chromium: {
            async launchPersistentContext(profileDir) {
                events.push(['launchPersistentContext', profileDir]);
                fs.mkdirSync(profileDir, { recursive: true });
                return {
                    pages() { return [page]; },
                    async newPage() { return page; },
                    async close() { events.push(['context-close']); }
                };
            }
        }
    };
}

async function cleanupDate(date) {
    const filename = standardizedFilename(date);
    await run('DELETE FROM fact_f13 WHERE ngay_do_kiem = ?', [date]);
    await run('DELETE FROM import_log WHERE ngay_do_kiem = ? OR file_name = ?', [date, filename]);
    for (const base of [BASE_INCOMING, BASE_PROCESSING, BASE_PROCESSED, BASE_ERROR]) {
        ensureDir(path.join(base, 'HUE'));
        removeIfExists(pathIn(base, filename));
    }
}

async function waitForRun(service, runId) {
    for (let i = 0; i < 100; i++) {
        const runState = service.getRun(runId);
        if ([
            STATUSES.SUCCESS,
            STATUSES.NO_DATA,
            STATUSES.FAILED,
            STATUSES.AUTHENTICATION_REQUIRED,
            STATUSES.ALREADY_COMPLETED,
            STATUSES.MANUAL_REVIEW_REQUIRED
        ].includes(runState.status)) {
            return runState;
        }
        await sleep(50);
    }
    return service.getRun(runId);
}

async function runTests() {
    const tmpDir = path.join(__dirname, '..', 'portal-downloads', 'dkcl', 'hue', 'f13', 'test');
    ensureDir(tmpDir);
    const validFixture = path.join(tmpDir, 'valid.xlsx');
    const mismatchFixture = path.join(tmpDir, 'mismatch.xlsx');
    const corruptFixture = path.join(tmpDir, 'corrupt.xlsx');
    fs.writeFileSync(validFixture, buildWorkbook(2));
    fs.writeFileSync(mismatchFixture, buildWorkbook(1));
    fs.writeFileSync(corruptFixture, '<html>not excel</html>');

    const successDate = '2098-02-01';
    const existingDate = '2098-02-02';
    const mismatchDate = '2098-02-03';
    const corruptDate = '2098-02-04';
    const manualDate = '2098-02-05';
    const conflictDate = '2098-02-06';
    const noDataDate = '2098-02-12';
    const detailMismatchDate = '2098-02-13';
    const summaryAuthoritativeDate = '2098-02-14';

    for (const date of [successDate, existingDate, mismatchDate, corruptDate, manualDate, conflictDate, noDataDate, detailMismatchDate, summaryAuthoritativeDate]) {
        await cleanupDate(date);
    }

    console.log('\nTEST 1: standardized filename');
    assert('standardized filename is correct', standardizedFilename('2026-02-01') === 'F1.3-2026.02.01.xlsx');

    console.log('\nTEST 2: successful acquisition handoff and import');
    const successClient = makePortalClient({ sourcePath: validFixture, total: 2 });
    const successService = new DkclHueF13SyncService({
        portalClient: successClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const accepted = await successService.start(successDate);
    const successRun = await waitForRun(successService, accepted.run.runId);
    const rows = await get('SELECT COUNT(*) AS c, COUNT(DISTINCT ma_bg) AS d FROM fact_f13 WHERE ngay_do_kiem = ?', [successDate]);
    const logs = await all('SELECT status FROM import_log WHERE ngay_do_kiem = ?', [successDate]);
    assert('run accepted', accepted.accepted === true);
    assert('run reaches SUCCESS', successRun.status === STATUSES.SUCCESS, successRun.safeErrorMessage);
    assert('workbook count recorded', successRun.workbookRowCount === 2);
    assert('imported count recorded', successRun.importedCount === 2);
    assert('database row count matches', rows.c === 2 && rows.d === 2, JSON.stringify(rows));
    assert('one SUCCESS import log detected', logs.length === 1 && logs[0].status === 'SUCCESS', JSON.stringify(logs));
    assert('file moved to Processed', fs.existsSync(pathIn(BASE_PROCESSED, standardizedFilename(successDate))));
    assert('no Error file created', !fs.existsSync(pathIn(BASE_ERROR, standardizedFilename(successDate))));
    assert('successful download is followed by generated-file delete', successClient.calls.some((call) => call[0] === 'deleteGeneratedFile'));
    assert('delete targets the current generated file', successClient.calls.find((call) => call[0] === 'deleteGeneratedFile')?.[1] === 'generated_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx');
    assert('selected filters are recorded', successRun.selectedFilters?.groupBy?.value === 'BC' && successRun.selectedFilters?.bcktProvince?.value === 'ALL');

    console.log('\nTEST 2B: zero-result summary returns NO_DATA without export');
    const noDataClient = makePortalClient({ sourcePath: validFixture, total: 0 });
    const noDataService = new DkclHueF13SyncService({
        portalClient: noDataClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const noDataStart = await noDataService.start(noDataDate);
    const noDataRun = await waitForRun(noDataService, noDataStart.run.runId);
    const noDataRows = await get('SELECT COUNT(*) AS c FROM fact_f13 WHERE ngay_do_kiem = ?', [noDataDate]);
    assert('zero-result run reaches NO_DATA', noDataRun.status === STATUSES.NO_DATA, noDataRun.safeErrorMessage);
    assert('zero-result portal total is recorded', noDataRun.portalDetailTotal === 0);
    assert('zero-result does not open detail table', !noDataClient.calls.some((call) => call[0] === 'openDetailTable'));
    assert('zero-result does not export', !noDataClient.calls.some((call) => call[0] === 'requestDetailExport' || call[0] === 'downloadXlsx'));
    assert('zero-result creates no DB rows', noDataRows.c === 0);
    assert('positive result opens visible detail metric', successClient.calls.some((call) => call[0] === 'openDetailTable'));

    console.log('\nTEST 2C: detail-table total may become authoritative from summary');
    await cleanupDate(summaryAuthoritativeDate);
    const summaryAuthoritativeClient = makePortalClient({ sourcePath: validFixture, total: 2 });
    summaryAuthoritativeClient.openDetailTable = async () => {
        summaryAuthoritativeClient.calls.push(['openDetailTable']);
        return { header: DETAIL_METRIC_HEADER, value: 1 };
    };
    const summaryAuthoritativeService = new DkclHueF13SyncService({
        portalClient: summaryAuthoritativeClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const summaryAuthoritativeStart = await summaryAuthoritativeService.start(summaryAuthoritativeDate);
    const summaryAuthoritativeRun = await waitForRun(summaryAuthoritativeService, summaryAuthoritativeStart.run.runId);
    assert('detail total matching summary can continue', summaryAuthoritativeRun.status === STATUSES.SUCCESS, summaryAuthoritativeRun.safeErrorMessage);
    assert('summary-authoritative detail total recorded', summaryAuthoritativeRun.detailTableTotal === 2);

    console.log('\nTEST 2D: detail-table total mismatch fails safely');
    const detailMismatchClient = makePortalClient({ sourcePath: validFixture, total: 2 });
    detailMismatchClient.readDetailTableTotal = async () => {
        detailMismatchClient.calls.push(['readDetailTableTotal']);
        return 3;
    };
    const detailMismatchService = new DkclHueF13SyncService({
        portalClient: detailMismatchClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const detailMismatchStart = await detailMismatchService.start(detailMismatchDate);
    const detailMismatchRun = await waitForRun(detailMismatchService, detailMismatchStart.run.runId);
    assert('detail-table mismatch returns FAILED', detailMismatchRun.status === STATUSES.FAILED && /differs from both/i.test(detailMismatchRun.safeErrorMessage));
    assert('detail-table mismatch does not export', !detailMismatchClient.calls.some((call) => call[0] === 'requestDetailExport'));

    console.log('\nTEST 3: existing completed date returns ALREADY_COMPLETED without portal access');
    const existingFile = pathIn(BASE_PROCESSED, standardizedFilename(existingDate));
    ensureDir(path.dirname(existingFile));
    fs.writeFileSync(existingFile, buildWorkbook(1));
    await run(
        `INSERT INTO import_log (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
         VALUES (?, ?, 'SUCCESS', 1, 0, 0)`,
        [standardizedFilename(existingDate), existingDate]
    );
    await run(
        `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026)
         VALUES (?, 'AUTO002_EXISTING', '533140', 'BCVH TEST', 'Đạt')`,
        [existingDate]
    );
    const existingClient = makePortalClient({ sourcePath: validFixture, total: 2 });
    const existingService = new DkclHueF13SyncService({ portalClient: existingClient });
    const existingResult = await existingService.start(existingDate);
    assert('ALREADY_COMPLETED returned', existingResult.status === STATUSES.ALREADY_COMPLETED);
    assert('portal was not called for completed date', existingClient.calls.length === 0, JSON.stringify(existingClient.calls));

    console.log('\nTEST 4: one active Hue job only');
    const slowClient = makePortalClient({ sourcePath: validFixture, total: 2, delayMs: 500 });
    const slowService = new DkclHueF13SyncService({
        portalClient: slowClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const first = await slowService.start(conflictDate);
    const second = await slowService.start('2098-02-07');
    assert('first request accepted', first.accepted === true);
    assert('second request returns IN_PROGRESS', second.status === 'IN_PROGRESS');
    await waitForRun(slowService, first.run.runId);

    console.log('\nTEST 5: validation failures');
    const mismatchService = new DkclHueF13SyncService({
        portalClient: makePortalClient({ sourcePath: mismatchFixture, total: 2 }),
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 1000 }
    });
    const mismatchStart = await mismatchService.start(mismatchDate);
    const mismatchRun = await waitForRun(mismatchService, mismatchStart.run.runId);
    assert('row-count mismatch fails safely', mismatchRun.status === STATUSES.FAILED && /row count/i.test(mismatchRun.safeErrorMessage));

    const corruptService = new DkclHueF13SyncService({
        portalClient: makePortalClient({ sourcePath: corruptFixture, total: 2 }),
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 1000 }
    });
    const corruptStart = await corruptService.start(corruptDate);
    const corruptRun = await waitForRun(corruptService, corruptStart.run.runId);
    assert('corrupt or non-XLSX download fails safely', corruptRun.status === STATUSES.FAILED && /valid XLSX/i.test(corruptRun.safeErrorMessage));
    assert('download failure does not trigger delete', !corruptService.portalClient.calls.some((call) => call[0] === 'deleteGeneratedFile'));

    console.log('\nTEST 6: inconsistent existing state prevents automatic replacement');
    await run(
        `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026)
         VALUES (?, 'AUTO002_INCONSISTENT', '533140', 'BCVH TEST', 'Đạt')`,
        [manualDate]
    );
    const manualService = new DkclHueF13SyncService({ portalClient: makePortalClient({ sourcePath: validFixture, total: 2 }) });
    const manualResult = await manualService.start(manualDate);
    assert('manual review is required for inconsistent existing data', manualResult.status === STATUSES.MANUAL_REVIEW_REQUIRED);

    console.log('\nTEST 7: sensitive values are absent from safe errors');
    const sanitized = safeErrorMessage(new Error('password=secret cookie=session csrf=token authorization=bearer'));
    assert('password redacted', !sanitized.includes('secret'));
    assert('cookie redacted', !sanitized.includes('session'));
    assert('csrf redacted', !sanitized.includes('token'));
    assert('authorization redacted', !sanitized.includes('bearer'));

    console.log('\nTEST 8: generated-file matching rejects older matching files');
    const requestedAt = new Date('2026-07-19T09:00:00.000Z');
    const newest = selectNewestGeneratedFile([
        { filename: 'old_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx', createdAt: '2026-07-19T08:59:59.000Z' },
        { filename: 'new_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx', createdAt: '2026-07-19T09:00:05.000Z' },
        { filename: 'other_report.xlsx', createdAt: '2026-07-19T09:00:10.000Z' }
    ], { requestedAt, match: 'F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet' });
    const oldOnly = selectNewestGeneratedFile([
        { filename: 'old_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx', createdAt: '2026-07-19T08:59:59.000Z' }
    ], { requestedAt, match: 'F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet' });
    assert('newest matching file after request is selected', newest?.filename === 'new_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx');
    assert('old matching file is rejected', oldOnly === null);

    console.log('\nTEST 9: export timeout and session expiry are safe failures');
    const timeoutService = new DkclHueF13SyncService({
        portalClient: {
            async authenticate() {},
            async openF13Report() {},
            async submitFilters() {},
            async readDetailTotal() { return 2; },
            async openDetailTable() { return { header: DETAIL_METRIC_HEADER, value: 2 }; },
            async readDetailTableTotal() { return 2; },
            async requestDetailExport() {},
            async pollGeneratedFile() { return null; }
        },
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 1000 }
    });
    const timeoutDate = '2098-02-08';
    await cleanupDate(timeoutDate);
    const timeoutStart = await timeoutService.start(timeoutDate);
    const timeoutRun = await waitForRun(timeoutService, timeoutStart.run.runId);
    assert('export timeout returns FAILED safely', timeoutRun.status === STATUSES.FAILED && /Timed out waiting/.test(timeoutRun.safeErrorMessage));

    const sessionService = new DkclHueF13SyncService({
        portalClient: {
            async authenticate() {
                const error = new Error('SESSION_EXPIRED: login required');
                error.code = 'SESSION_EXPIRED';
                throw error;
            }
        },
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 1000 }
    });
    const sessionDate = '2098-02-09';
    await cleanupDate(sessionDate);
    const sessionStart = await sessionService.start(sessionDate);
    const sessionRun = await waitForRun(sessionService, sessionStart.run.runId);
    assert('session expiry is reported as AUTHENTICATION_REQUIRED without secrets', sessionRun.status === STATUSES.AUTHENTICATION_REQUIRED && /SESSION_EXPIRED/.test(sessionRun.safeErrorMessage));

    console.log('\nTEST 10: disabled automation rejects new acquisition before portal access');
    const disabledClient = makePortalClient({ sourcePath: validFixture, total: 2 });
    const disabledService = new DkclHueF13SyncService({ portalClient: disabledClient, config: { enabled: false } });
    const disabledDate = '2098-02-10';
    await cleanupDate(disabledDate);
    const disabledResult = await disabledService.start(disabledDate);
    assert('disabled automation returns FAILED', disabledResult.status === STATUSES.FAILED);
    assert('portal is not called when disabled', disabledClient.calls.length === 0, JSON.stringify(disabledClient.calls));

    console.log('\nTEST 11: portal cleanup failure records warning but import may succeed');
    const cleanupFailureDate = '2098-02-11';
    await cleanupDate(cleanupFailureDate);
    const cleanupClient = makePortalClient({ sourcePath: validFixture, total: 2, filename: 'cleanup_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx' });
    cleanupClient.deleteGeneratedFile = async (file) => {
        cleanupClient.calls.push(['deleteGeneratedFile', file.filename, 'confirm-ok']);
        throw new Error('cleanup failed for generated file only');
    };
    const cleanupService = new DkclHueF13SyncService({
        portalClient: cleanupClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const cleanupStart = await cleanupService.start(cleanupFailureDate);
    const cleanupRun = await waitForRun(cleanupService, cleanupStart.run.runId);
    assert('cleanup failure does not fail otherwise valid import', cleanupRun.status === STATUSES.SUCCESS, cleanupRun.safeErrorMessage);
    assert('cleanup warning is recorded', /cleanup failed/.test(cleanupRun.cleanupWarning || ''));
    assert('delete confirmation path represented by client call', cleanupClient.calls.some((call) => call[0] === 'deleteGeneratedFile' && call[2] === 'confirm-ok'));
    assert('no bulk or unrelated deletion occurs', cleanupClient.calls.filter((call) => call[0] === 'deleteGeneratedFile').length === 1);

    console.log('\nTEST 12: portal client cleanup targets one row, confirms, and verifies disappearance');
    const portalCleanup = new DkclHueF13PortalClient();
    const portalEvents = [];
    let rowVisible = true;
    let confirmVisible = false;
    const targetFilename = 'target_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx';
    const similarFilename = 'old_target_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet.xlsx';
    const fakeTrashButton = {
        async count() { return rowVisible ? 1 : 0; },
        nth() { return this; },
        async isVisible() { return rowVisible; },
        async click() {
            portalEvents.push(['trash-click']);
            confirmVisible = true;
        }
    };
    const fakeConfirmButton = {
        filter() { return this; },
        async count() { return confirmVisible ? 1 : 0; },
        nth() { return this; },
        async isVisible() { return confirmVisible; },
        async click() {
            portalEvents.push(['confirm-delete-click']);
            confirmVisible = false;
            rowVisible = false;
        }
    };
    const fakeRow = {
        locator(selector) {
            portalEvents.push(['row-locator', selector]);
            if (selector === 'button.btn-danger') return fakeConfirmButton;
            return fakeTrashButton;
        }
    };
    portalCleanup.baseUrl = 'https://dkcl.vnpost.vn';
    portalCleanup.page = {
        async goto(url) { portalEvents.push(['goto', url]); },
        async evaluate(callback, filename) {
            portalEvents.push(['exact-row-evaluate', filename]);
            return findExactFileRowIndexes([
                { cells: ['1', similarFilename, 'outside delete'] },
                ...(rowVisible ? [{ cells: ['2', targetFilename, 'target delete'] }] : [])
            ], filename);
        },
        locator(selector) {
            portalEvents.push(['locator', selector]);
            return {
                nth(index) {
                    portalEvents.push(['row-nth', index]);
                    return fakeRow;
                }
            };
        },
        once(event, handler) {
            portalEvents.push(['once', event]);
            handler({ accept: async () => portalEvents.push(['confirm-ok']) });
        },
        async waitForFunction(callback, filename) {
            portalEvents.push(['waitForFunction', filename]);
            if (rowVisible) throw new Error('row still visible');
        },
        async waitForTimeout(ms) { portalEvents.push(['wait', ms]); }
    };
    await portalCleanup.deleteGeneratedFile({ filename: targetFilename });
    assert('cleanup opens file manager', portalEvents.some((event) => event[0] === 'goto' && event[1].endsWith('/files')));
    assert('cleanup matches exact generated filename', portalEvents.some((event) => event[0] === 'exact-row-evaluate' && event[1] === targetFilename));
    assert('cleanup selects only the exact target row', portalEvents.some((event) => event[0] === 'row-nth' && event[1] === 1));
    assert('delete confirmation is accepted', portalEvents.some((event) => event[0] === 'confirm-ok'));
    assert('row disappearance is verified', rowVisible === false);
    assert('only one trash click occurs', portalEvents.filter((event) => event[0] === 'trash-click').length === 1);
    assert('visible modal confirmation is clicked once', portalEvents.filter((event) => event[0] === 'confirm-delete-click').length === 1);

    console.log('\nTEST 12B: portal cleanup exact-row edge cases');
    assert('exact filename row selection ignores similar filenames', findExactFileRowIndexes([
        { cells: ['1', 'target_file(2).xlsx'] },
        { cells: ['2', targetFilename] },
        { cells: ['3', `${targetFilename}.bak`] }
    ], targetFilename).join(',') === '1');
    assert('multiple exact filename rows are reported as ambiguous', findExactFileRowIndexes([
        { cells: ['1', targetFilename] },
        { cells: ['2', targetFilename] }
    ], targetFilename).length === 2);

    const alreadyDeletedCleanup = new DkclHueF13PortalClient();
    alreadyDeletedCleanup.baseUrl = 'https://dkcl.vnpost.vn';
    alreadyDeletedCleanup.page = {
        async goto(url) { portalEvents.push(['already-deleted-goto', url]); },
        async evaluate() { return []; },
        locator() {
            throw new Error('Already-deleted cleanup must not search for delete buttons.');
        }
    };
    const alreadyDeletedResult = await alreadyDeletedCleanup.deleteGeneratedFile({ filename: targetFilename });
    assert('already-deleted file is not treated as failure', alreadyDeletedResult.status === 'ALREADY_DELETED');

    const outsideDeleteCleanup = new DkclHueF13PortalClient();
    const outsideEvents = [];
    outsideDeleteCleanup.baseUrl = 'https://dkcl.vnpost.vn';
    outsideDeleteCleanup.page = {
        async goto(url) { outsideEvents.push(['goto', url]); },
        async evaluate() { return [0]; },
        locator(selector) {
            outsideEvents.push(['locator', selector]);
            return {
                nth() {
                    return {
                        locator() {
                            return {
                                async count() { return 0; },
                                nth() { throw new Error('No row-scoped delete action should be clicked.'); }
                            };
                        }
                    };
                }
            };
        }
    };
    let outsideDeleteCode = null;
    try {
        await outsideDeleteCleanup.deleteGeneratedFile({ filename: targetFilename });
    } catch (error) {
        outsideDeleteCode = error.code;
    }
    assert('ambiguous delete actions outside target row are ignored', outsideDeleteCode === 'CLEANUP_DELETE_NOT_FOUND');

    console.log('\nTEST 13: authenticated persistent profile is reused without login');
    const profileDir = path.join(tmpDir, 'profile-reuse');
    fs.rmSync(profileDir, { recursive: true, force: true });
    fs.rmSync(`${profileDir}.lock`, { recursive: true, force: true });
    const events = [];
    const authPage = makeFakePortalPage({
        events,
        initialUrl: 'https://dkcl.vnpost.vn/',
        bodyText: 'Quản lý tệp tantn.bdtth'
    });
    const reuseClient = new DkclHueF13PortalClient({
        playwright: makeFakePlaywright(authPage, events),
        fs,
        path
    });
    await reuseClient.authenticate({
        baseUrl: 'https://dkcl.vnpost.vn/',
        username: 'user-secret',
        password: 'pass-secret',
        hrmCode: 'hrm-secret',
        profileDir
    });
    await reuseClient.close();
    assert('persistent context is launched', events.some((event) => event[0] === 'launchPersistentContext' && event[1] === profileDir));
    assert('authenticated profile does not use login attempt', reuseClient.loginAttempts === 0);
    assert('profile survives restart as directory', fs.existsSync(profileDir));
    assert('profile lock released after close', !fs.existsSync(`${profileDir}.lock`));

    console.log('\nTEST 14: expired session performs exactly one username/password/HRM login and continues');
    const loginEvents = [];
    const loginProfileDir = path.join(tmpDir, 'profile-login');
    fs.rmSync(loginProfileDir, { recursive: true, force: true });
    fs.rmSync(`${loginProfileDir}.lock`, { recursive: true, force: true });
    const loginPage = makeFakePortalPage({
        events: loginEvents,
        initialUrl: 'https://dkcl.vnpost.vn/login',
        bodyText: 'Login'
    });
    loginPage.afterPasswordSubmit = () => {
        loginPage.bodyText = 'HRM ma nhan vien';
    };
    loginPage.afterHrmSubmit = () => {
        loginPage.currentUrl = 'https://dkcl.vnpost.vn/';
        loginPage.bodyText = 'Quản lý tệp tantn.bdtth';
    };
    const loginClient = new DkclHueF13PortalClient({
        playwright: makeFakePlaywright(loginPage, loginEvents),
        fs,
        path
    });
    await loginClient.authenticate({
        baseUrl: 'https://dkcl.vnpost.vn/',
        username: 'user-secret',
        password: 'pass-secret',
        hrmCode: 'hrm-secret',
        profileDir: loginProfileDir
    });
    await loginClient.close();
    assert('one automated login attempt is performed', loginClient.loginAttempts === 1);
    assert('username is filled once', loginEvents.filter((event) => event[0] === 'fill' && event[1] === 'username').length === 1);
    assert('password is filled once', loginEvents.filter((event) => event[0] === 'fill' && event[1] === 'password').length === 1);
    assert('HRM identifier is filled once', loginEvents.filter((event) => event[0] === 'fill' && event[1] === 'hrm').length === 1);

    console.log('\nTEST 15: failed login returns AUTHENTICATION_REQUIRED after one attempt');
    const failedEvents = [];
    const failedProfileDir = path.join(tmpDir, 'profile-failed');
    fs.rmSync(failedProfileDir, { recursive: true, force: true });
    fs.rmSync(`${failedProfileDir}.lock`, { recursive: true, force: true });
    const failedPage = makeFakePortalPage({
        events: failedEvents,
        initialUrl: 'https://dkcl.vnpost.vn/login',
        bodyText: 'Login'
    });
    const failedClient = new DkclHueF13PortalClient({
        playwright: makeFakePlaywright(failedPage, failedEvents),
        fs,
        path
    });
    let failedLoginCode = null;
    try {
        await failedClient.authenticate({
            baseUrl: 'https://dkcl.vnpost.vn/',
            username: 'user-secret',
            password: 'pass-secret',
            hrmCode: 'hrm-secret',
            profileDir: failedProfileDir
        });
    } catch (error) {
        failedLoginCode = error.code;
    }
    await failedClient.close();
    assert('failed login returns AUTHENTICATION_REQUIRED', failedLoginCode === 'AUTHENTICATION_REQUIRED');
    assert('failed login attempts exactly once', failedClient.loginAttempts === 1);

    console.log('\nTEST 16: concurrent profile access is rejected safely');
    const lockedDir = path.join(tmpDir, 'profile-locked');
    const firstLock = new DkclHueF13PortalClient({ fs, path });
    firstLock.profileDir = lockedDir;
    firstLock.acquireProfileLock();
    const secondLock = new DkclHueF13PortalClient({ fs, path });
    secondLock.profileDir = lockedDir;
    let lockCode = null;
    try {
        secondLock.acquireProfileLock();
    } catch (error) {
        lockCode = error.code;
    }
    await firstLock.close();
    assert('second profile access returns PROFILE_LOCKED', lockCode === 'PROFILE_LOCKED');
    assert('profile directory is git-ignored by parent rule', fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8').includes('Data DKCL/BrowserProfiles/'));

    console.log('\nTEST 17: visible profile waits for manual authentication after security step');
    const manualEvents = [];
    const manualProfileDir = path.join(tmpDir, 'profile-manual-auth');
    fs.rmSync(manualProfileDir, { recursive: true, force: true });
    fs.rmSync(`${manualProfileDir}.lock`, { recursive: true, force: true });
    const manualPage = makeFakePortalPage({
        events: manualEvents,
        initialUrl: 'https://dkcl.vnpost.vn/login',
        bodyText: 'Login'
    });
    manualPage.afterPasswordSubmit = () => {
        manualPage.bodyText = 'HRM ma nhan vien';
    };
    manualPage.afterHrmSubmit = () => {
        manualPage.bodyText = 'HRM ma nhan vien';
    };
    let manualPolls = 0;
    manualPage.waitForTimeout = async () => {
        manualPolls++;
        if (manualPolls === 1) {
            manualPage.currentUrl = 'https://dkcl.vnpost.vn/';
            manualPage.bodyText = 'Quáº£n lÃ½ tá»‡p tantn.bdtth';
        }
    };
    const manualClient = new DkclHueF13PortalClient({
        headless: false,
        manualAuthWaitMs: 5000,
        manualAuthPollMs: 10,
        playwright: makeFakePlaywright(manualPage, manualEvents),
        fs,
        path
    });
    await manualClient.authenticate({
        baseUrl: 'https://dkcl.vnpost.vn/',
        username: 'user-secret',
        password: 'pass-secret',
        hrmCode: 'hrm-secret',
        profileDir: manualProfileDir
    });
    await manualClient.close();
    assert('manual authentication can continue visible profile run', manualClient.loginAttempts === 1 && manualPolls === 1);

    console.log('\nTEST 18: readonly datepicker inputs are set through DOM events');
    const dateEvents = [];
    const datePage = makeFakePortalPage({
        events: dateEvents,
        initialUrl: 'https://dkcl.vnpost.vn/kpi/chat-luong-phat-buu-gui-lien-tinh',
        bodyText: 'F1.3'
    });
    const dateClient = new DkclHueF13PortalClient({ playwright: makeFakePlaywright(datePage, dateEvents), fs, path });
    dateClient.page = datePage;
    await dateClient.fillDateInputs({
        visibleFromDate: '16/07/2026',
        visibleToDate: '16/07/2026',
        requestFromDate: '07/16/2026',
        requestToDate: '07/16/2026'
    });
    assert('from-date is set by DOM event', dateEvents.some((event) => event[0] === 'evaluate' && event[2] === '16/07/2026'));
    assert('to-date is set by DOM event', dateEvents.filter((event) => event[0] === 'evaluate' && event[2] === '16/07/2026').length === 2);
    assert('hidden request date uses portal MM/DD/YYYY', formatPortalRequestDate('2026-07-16') === '07/16/2026');

    console.log('\nTEST 19: visible detail-total candidate selection');
    const detailCandidates = [
        { isAjaxCell: true, isHiddenClass: true, isVisible: false, total: 3967, header: 'Sản lượng có thông tin phát' },
        { isAjaxCell: true, isHiddenClass: false, isVisible: true, total: 3941, header: DETAIL_METRIC_HEADER },
        { isAjaxCell: true, isHiddenClass: false, isVisible: true, total: 3967, header: 'Other metric' }
    ];
    assert('hidden ajax candidate is ignored', findVisibleDetailCandidateIndex(detailCandidates, 'Sản lượng có thông tin phát') === -1);
    assert('visible business metric is selected by header', findVisibleDetailCandidateIndex(detailCandidates, DETAIL_METRIC_HEADER) === 1);
    assert('duplicate values do not cause ambiguity', findVisibleDetailCandidateIndex(detailCandidates, 'Other metric') === 2);
    assert('missing visible candidate fails safely', findVisibleDetailCandidateIndex(detailCandidates.slice(0, 1), DETAIL_METRIC_HEADER) === -1);
    assert('zero-size non-visible candidate fails safely', findVisibleDetailCandidateIndex([{ isAjaxCell: true, isHiddenClass: false, isVisible: false, total: 3941, header: DETAIL_METRIC_HEADER }], DETAIL_METRIC_HEADER) === -1);

    console.log('\nTEST 20: profile path and secrets are absent from safe auth messages');
    const hiddenProfile = path.join('D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong', 'Data DKCL', 'BrowserProfiles', 'HUE');
    const authMessage = safeErrorMessage(new Error(`AUTHENTICATION_REQUIRED password=secret cookie=session hrmCode=employee ${hiddenProfile}`));
    assert('secret password not exposed', !authMessage.includes('secret'));
    assert('cookie not exposed', !authMessage.includes('session'));
    assert('HRM identifier not exposed', !authMessage.includes('employee'));
    assert('profile path not exposed', !authMessage.includes('BrowserProfiles'));

    for (const date of [successDate, existingDate, mismatchDate, corruptDate, manualDate, conflictDate, noDataDate, detailMismatchDate, summaryAuthoritativeDate, '2098-02-07', '2098-02-08', '2098-02-09', '2098-02-10', '2098-02-11']) {
        await cleanupDate(date);
    }
    removeIfExists(validFixture);
    removeIfExists(mismatchFixture);
    removeIfExists(corruptFixture);

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    db.close();
    if (failed > 0) process.exit(1);
}

runTests().catch((error) => {
    console.error('FATAL TEST ERROR:', error);
    db.close();
    process.exit(1);
});
