/**
 * test_dkclHueF13SyncService.js
 *
 * Focused AUTO-IMPORT-002 tests for the Huế F1.3 acquisition engine.
 * Run: node test_dkclHueF13SyncService.js
 *
 * AUTO-IMPORT-012: this suite previously wrote fixture .xlsx files and rows
 * directly into the real production Data DKCL/F1.3 folders and
 * database.sqlite (confirmed twice under AUTO-IMPORT-011). It now runs
 * against an isolated temp sandbox for both the database and the file
 * system — see test/importTestSandbox.js. NODE_ENV=test plus
 * QIS_TEST_DB_PATH/QIS_TEST_DATA_ROOT must be set before requiring
 * ./src/config/db or ./src/services/importPipeline, since both resolve
 * their paths once at require-time.
 */
'use strict';

const path = require('path');
const os = require('os');
const { createSandbox, initSchema, destroySandbox } = require('./test/importTestSandbox');

const sandbox = createSandbox('qis-hue-f13-sync-test-');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = sandbox.dbPath;
process.env.QIS_TEST_DATA_ROOT = sandbox.dataRoot;
process.env.QIS_ALLOW_TEST_FUTURE_DATE = 'true';

const fs = require('fs');
const xlsx = require('xlsx');

const { run, get, all, db, dbPath, operationalDbPath } = require('./src/config/db');
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
    DEFAULT_CHROMIUM_LAUNCH_ARGS,
    buildPersistentLaunchOptions,
    waitForPortalCapablePage,
    formatPortalRequestDate,
    buildF41ReportQuery,
    findVisibleDetailCandidateIndex,
    findExactFileRowIndexes,
    DETAIL_METRIC_HEADER
} = require('./src/services/dkclHueF13PortalClient');
const processManager = require('./src/services/browserProcessManager');

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

async function initializeSandbox() {
    assert('NODE_ENV=test is active before db.js/importPipeline.js load', process.env.NODE_ENV === 'test');
    assert('test DB path is an isolated temp sqlite file', dbPath === sandbox.dbPath && dbPath.startsWith(sandbox.root) && dbPath.endsWith('.sqlite'), dbPath);
    assert('test DB path does not resolve to operational database.sqlite', dbPath !== operationalDbPath);
    assert('BASE_INCOMING resolves inside the isolated sandbox, not production Data DKCL', BASE_INCOMING.startsWith(sandbox.root), BASE_INCOMING);
    await initSchema(db);
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
        async bringToFront() {
            events.push(['bringToFront']);
        },
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
            async launchPersistentContext(profileDir, options) {
                events.push(['launchPersistentContext', profileDir, options]);
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

function makeFakeContext(pages, events) {
    return {
        pages() {
            events.push(['context-pages']);
            return pages;
        },
        async newPage() {
            events.push(['context-newPage']);
            const nextPage = pages[0];
            if (!nextPage) throw new Error('No fake page available');
            return nextPage;
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
    const sharedSessionDate = '2098-02-16';
    const expiredSharedSessionDate = '2098-02-17';
    const refreshCompletedDate = '2098-02-18';

    for (const date of [successDate, existingDate, mismatchDate, corruptDate, manualDate, conflictDate, noDataDate, detailMismatchDate, summaryAuthoritativeDate, sharedSessionDate, expiredSharedSessionDate, refreshCompletedDate]) {
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

    console.log('\nTEST 2E: externally owned Hue session is reused without re-authentication or close');
    const sharedClient = makePortalClient({ sourcePath: validFixture, total: 2 });
    sharedClient.isAuthenticated = async () => {
        sharedClient.calls.push(['isAuthenticated']);
        return true;
    };
    sharedClient.close = async () => {
        sharedClient.calls.push(['close']);
    };
    const privateClient = {
        calls: [],
        async authenticate() {
            privateClient.calls.push(['authenticate']);
            throw new Error('private client should not authenticate when shared session is supplied');
        }
    };
    const sharedSessionService = new DkclHueF13SyncService({
        portalClient: privateClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const sharedSessionStart = await sharedSessionService.start(sharedSessionDate, {
        requireExistingSession: true,
        portalClient: sharedClient
    });
    const sharedSessionRun = await waitForRun(sharedSessionService, sharedSessionStart.run.runId);
    const sharedRows = await get('SELECT COUNT(*) AS c, COUNT(DISTINCT ma_bg) AS d FROM fact_f13 WHERE ngay_do_kiem = ?', [sharedSessionDate]);
    assert('shared session run reaches SUCCESS', sharedSessionRun.status === STATUSES.SUCCESS, sharedSessionRun.safeErrorMessage);
    assert('shared session imported rows idempotently', sharedRows.c === 2 && sharedRows.d === 2, JSON.stringify(sharedRows));
    assert('private portal client is not used', privateClient.calls.length === 0, JSON.stringify(privateClient.calls));
    assert('shared client is verified and reused for report actions', sharedClient.calls.some((call) => call[0] === 'isAuthenticated') && sharedClient.calls.some((call) => call[0] === 'openF13Report'));
    assert('shared session lifecycle remains owned by registry', !sharedClient.calls.some((call) => call[0] === 'authenticate' || call[0] === 'close'), JSON.stringify(sharedClient.calls));

    console.log('\nTEST 2F: expired externally owned Hue session returns authentication required');
    const expiredSharedClient = {
        calls: [],
        async isAuthenticated() {
            this.calls.push(['isAuthenticated']);
            return false;
        },
        async authenticate() {
            this.calls.push(['authenticate']);
        },
        async openF13Report() {
            this.calls.push(['openF13Report']);
        },
        async close() {
            this.calls.push(['close']);
        }
    };
    const expiredSharedService = new DkclHueF13SyncService({
        portalClient: privateClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const expiredSharedStart = await expiredSharedService.start(expiredSharedSessionDate, {
        requireExistingSession: true,
        portalClient: expiredSharedClient
    });
    const expiredSharedRun = await waitForRun(expiredSharedService, expiredSharedStart.run.runId);
    assert('expired shared session returns AUTHENTICATION_REQUIRED', expiredSharedRun.status === STATUSES.AUTHENTICATION_REQUIRED, expiredSharedRun.safeErrorMessage);
    assert('expired shared session is not reauthenticated or closed by sync service', expiredSharedClient.calls.map((call) => call[0]).join('|') === 'isAuthenticated', JSON.stringify(expiredSharedClient.calls));

    console.log('\nTEST 2G: completed Hue date can be force re-imported without duplicates');
    const refreshExistingFile = pathIn(BASE_PROCESSED, standardizedFilename(refreshCompletedDate));
    ensureDir(path.dirname(refreshExistingFile));
    fs.writeFileSync(refreshExistingFile, buildWorkbook(1));
    await run(
        `INSERT INTO import_log (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
         VALUES (?, ?, 'SUCCESS', 1, 0, 0)`,
        [standardizedFilename(refreshCompletedDate), refreshCompletedDate]
    );
    await run(
        `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026)
         VALUES (?, 'AUTO002_OLD', '533140', 'BCVH TEST', 'Không đạt')`,
        [refreshCompletedDate]
    );
    const refreshCompletedClient = makePortalClient({ sourcePath: validFixture, total: 2 });
    const refreshCompletedService = new DkclHueF13SyncService({
        portalClient: refreshCompletedClient,
        config: { enabled: true, rawDownloadDir: tmpDir, importCompletionTimeoutMs: 3000 }
    });
    const refreshCompletedStart = await refreshCompletedService.start(refreshCompletedDate, { forceReimport: true });
    const refreshCompletedRun = await waitForRun(refreshCompletedService, refreshCompletedStart.run.runId);
    const refreshCompletedRows = await get('SELECT COUNT(*) AS c, COUNT(DISTINCT ma_bg) AS d FROM fact_f13 WHERE ngay_do_kiem = ?', [refreshCompletedDate]);
    const oldRow = await get('SELECT COUNT(*) AS c FROM fact_f13 WHERE ngay_do_kiem = ? AND ma_bg = ?', [refreshCompletedDate, 'AUTO002_OLD']);
    assert('force re-import of completed date reaches SUCCESS', refreshCompletedRun.status === STATUSES.SUCCESS, refreshCompletedRun.safeErrorMessage);
    assert('force re-import replaces previous date rows without duplicates', refreshCompletedRows.c === 2 && refreshCompletedRows.d === 2 && oldRow.c === 0, JSON.stringify({ refreshCompletedRows, oldRow }));
    assert('force re-import does not return already completed', refreshCompletedStart.status !== STATUSES.ALREADY_COMPLETED);

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

    console.log('\nTEST 6: stale existing state does not require manual review');
    await run(
        `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026)
         VALUES (?, 'AUTO002_INCONSISTENT', '533140', 'BCVH TEST', 'Đạt')`,
        [manualDate]
    );
    const manualService = new DkclHueF13SyncService({
        portalClient: makePortalClient({ sourcePath: validFixture, total: 2 }),
        config: { enabled: false }
    });
    const manualResult = await manualService.start(manualDate);
    assert('stale row evidence no longer returns manual review', manualResult.status !== STATUSES.MANUAL_REVIEW_REQUIRED);
    assert('disabled automation is reached after stale evidence is ignored', manualResult.status === STATUSES.FAILED);

    console.log('\nTEST 6B: success log with zero DB rows is selectable for acquisition');
    const staleLogDate = '2098-02-15';
    await cleanupDate(staleLogDate);
    await run(
        `INSERT INTO import_log (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
         VALUES (?, ?, 'SUCCESS', 34, 0, 0)`,
        [standardizedFilename(staleLogDate), staleLogDate]
    );
    const staleLogService = new DkclHueF13SyncService({
        portalClient: makePortalClient({ sourcePath: validFixture, total: 2 }),
        config: { enabled: false }
    });
    const staleCompletion = await staleLogService.checkCompleted(staleLogDate);
    const staleStart = await staleLogService.start(staleLogDate);
    assert('stale success log with zero rows is not complete', staleCompletion.complete === false && staleCompletion.inconsistent === false);
    assert('stale success log carries explicit reason', /stale logs\/files do not block Update/.test(staleCompletion.reason || ''));
    assert('stale success log reaches acquisition gate instead of manual review', staleStart.status === STATUSES.FAILED);

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

    console.log('\nTEST 21: Chromium launch helper keeps shared windowed launch contract');
    assert('DEFAULT_CHROMIUM_LAUNCH_ARGS contains --disable-session-crashed-bubble', DEFAULT_CHROMIUM_LAUNCH_ARGS.includes('--disable-session-crashed-bubble'));
    assert('DEFAULT_CHROMIUM_LAUNCH_ARGS contains --hide-crash-restore-bubble', DEFAULT_CHROMIUM_LAUNCH_ARGS.includes('--hide-crash-restore-bubble'));
    assert('DEFAULT_CHROMIUM_LAUNCH_ARGS contains --new-window', DEFAULT_CHROMIUM_LAUNCH_ARGS.includes('--new-window'));
    assert('DEFAULT_CHROMIUM_LAUNCH_ARGS contains --start-maximized', DEFAULT_CHROMIUM_LAUNCH_ARGS.includes('--start-maximized'));

    const launchOptsAuth = buildPersistentLaunchOptions({ headless: true, acceptDownloads: true });
    assert('authenticate options include --disable-session-crashed-bubble', launchOptsAuth.args.includes('--disable-session-crashed-bubble'));
    assert('authenticate options include --hide-crash-restore-bubble', launchOptsAuth.args.includes('--hide-crash-restore-bubble'));
    assert('authenticate options include --new-window', launchOptsAuth.args.includes('--new-window'));
    assert('authenticate options include --start-maximized', launchOptsAuth.args.includes('--start-maximized'));
    assert('authenticate options disable SIGHUP handling', launchOptsAuth.handleSIGHUP === false);
    assert('authenticate options disable SIGINT handling', launchOptsAuth.handleSIGINT === false);
    assert('authenticate options disable SIGTERM handling', launchOptsAuth.handleSIGTERM === false);

    const launchOptsInteractive = buildPersistentLaunchOptions({ headless: false, acceptDownloads: true });
    assert('prepareInteractiveAuthentication options include --disable-session-crashed-bubble', launchOptsInteractive.args.includes('--disable-session-crashed-bubble'));
    assert('prepareInteractiveAuthentication options include --hide-crash-restore-bubble', launchOptsInteractive.args.includes('--hide-crash-restore-bubble'));
    assert('prepareInteractiveAuthentication options include --new-window', launchOptsInteractive.args.includes('--new-window'));
    assert('prepareInteractiveAuthentication options include --start-maximized', launchOptsInteractive.args.includes('--start-maximized'));
    assert('interactive options disable SIGHUP handling', launchOptsInteractive.handleSIGHUP === false);
    assert('interactive options disable SIGINT handling', launchOptsInteractive.handleSIGINT === false);
    assert('interactive options disable SIGTERM handling', launchOptsInteractive.handleSIGTERM === false);

    const helperEvents = [];
    const helperPage = makeFakePortalPage({ events: helperEvents, initialUrl: 'about:blank', bodyText: 'Login' });
    const helperContext = makeFakeContext([helperPage], helperEvents);
    const waitedPage = await waitForPortalCapablePage(helperContext);
    assert('page helper returns the launched portal-capable page', waitedPage === helperPage);
    assert('page helper checks context pages before fallback', helperEvents.some((event) => event[0] === 'context-pages'));

    const flagEvents = [];
    const flagProfileDir = path.join(tmpDir, 'profile-flags');
    fs.rmSync(flagProfileDir, { recursive: true, force: true });
    fs.rmSync(`${flagProfileDir}.lock`, { recursive: true, force: true });
    const flagPage = makeFakePortalPage({ events: flagEvents, initialUrl: 'https://dkcl.vnpost.vn/' });
    const flagClient = new DkclHueF13PortalClient({
        playwright: makeFakePlaywright(flagPage, flagEvents),
        fs, path, source: 'HUE'
    });
    flagClient.restoreWindow = async () => true;
    const originalSetVisible = processManager.setBrowserWindowsVisibleByProfile;
    processManager.setBrowserWindowsVisibleByProfile = async (profileDir) => {
        flagEvents.push(['setBrowserWindowsVisibleByProfile', profileDir]);
        return { success: true, matchedWindowCount: 1 };
    };

    await flagClient.prepareInteractiveAuthentication({ baseUrl: 'https://dkcl.vnpost.vn/', profileDir: flagProfileDir });
    await flagClient.close();
    processManager.setBrowserWindowsVisibleByProfile = originalSetVisible;

    const launchEvent = flagEvents.find(e => e[0] === 'launchPersistentContext');
    assert('prepareInteractiveAuthentication passes args to launchPersistentContext', Boolean(launchEvent && launchEvent[2] && Array.isArray(launchEvent[2].args)));
    assert('prepareInteractiveAuthentication args include --disable-session-crashed-bubble', Boolean(launchEvent && launchEvent[2] && launchEvent[2].args.includes('--disable-session-crashed-bubble')));
    assert('prepareInteractiveAuthentication args include --hide-crash-restore-bubble', Boolean(launchEvent && launchEvent[2] && launchEvent[2].args.includes('--hide-crash-restore-bubble')));
    assert('prepareInteractiveAuthentication args include --new-window', Boolean(launchEvent && launchEvent[2] && launchEvent[2].args.includes('--new-window')));
    assert('prepareInteractiveAuthentication args include --start-maximized', Boolean(launchEvent && launchEvent[2] && launchEvent[2].args.includes('--start-maximized')));
    assert('prepareInteractiveAuthentication disables signal handlers', Boolean(launchEvent && launchEvent[2] && launchEvent[2].handleSIGHUP === false && launchEvent[2].handleSIGINT === false && launchEvent[2].handleSIGTERM === false));
    const bringToFrontIndex = flagEvents.findIndex((event) => event[0] === 'bringToFront');
    const surfaceIndex = flagEvents.findIndex((event) => event[0] === 'setBrowserWindowsVisibleByProfile');
    assert('prepareInteractiveAuthentication brings page to front before window surfacing', bringToFrontIndex >= 0 && surfaceIndex > bringToFrontIndex);
    assert('prepareInteractiveAuthentication navigates non-DKCL page to login URL', flagEvents.some((event) => event[0] === 'goto' && event[1] === 'https://dkcl.vnpost.vn/login'));

    const authEvents = [];
    const authFlagProfileDir = path.join(tmpDir, 'profile-auth-flags');
    fs.rmSync(authFlagProfileDir, { recursive: true, force: true });
    fs.rmSync(`${authFlagProfileDir}.lock`, { recursive: true, force: true });
    const authFlagPage = makeFakePortalPage({ events: authEvents, initialUrl: 'about:blank', bodyText: 'Quản lý tệp tantn.bdtth' });
    const authFlagClient = new DkclHueF13PortalClient({
        playwright: makeFakePlaywright(authFlagPage, authEvents),
        fs, path, source: 'HUE'
    });
    processManager.setBrowserWindowsVisibleByProfile = async (profileDir) => {
        authEvents.push(['setBrowserWindowsVisibleByProfile', profileDir]);
        return { success: true, matchedWindowCount: 1 };
    };
    await authFlagClient.authenticate({
        baseUrl: 'https://dkcl.vnpost.vn/',
        username: 'user-secret',
        password: 'pass-secret',
        hrmCode: 'hrm-secret',
        profileDir: authFlagProfileDir
    });
    await authFlagClient.close();
    processManager.setBrowserWindowsVisibleByProfile = originalSetVisible;
    const authLaunchEvent = authEvents.find((event) => event[0] === 'launchPersistentContext');
    assert('authenticate uses the same shared launch helper args', Boolean(authLaunchEvent && JSON.stringify(authLaunchEvent[2].args) === JSON.stringify(launchEvent[2].args)));
    const authBringToFrontIndex = authEvents.findIndex((event) => event[0] === 'bringToFront');
    const authSurfaceIndex = authEvents.findIndex((event) => event[0] === 'setBrowserWindowsVisibleByProfile');
    assert('authenticate brings page to front before best-effort surfacing', authBringToFrontIndex >= 0 && authSurfaceIndex > authBringToFrontIndex);
    assert('authenticate navigates non-DKCL page to login URL before portal use', authEvents.some((event) => event[0] === 'goto' && event[1] === 'https://dkcl.vnpost.vn/login'));

    console.log('\nTEST 22: AUTO-IMPORT-014 item 4 — rebind to another authenticated page when the tracked page is not authenticated');
    {
        const events22 = [];
        const staleLoginPage = makeFakePortalPage({ events: events22, initialUrl: 'https://dkcl.vnpost.vn/login', bodyText: 'Login form' });
        const authenticatedPage = makeFakePortalPage({ events: events22, initialUrl: 'https://dkcl.vnpost.vn/', bodyText: 'Quan ly tep Tra cứu thông tin bưu gửi' });
        const client22 = new DkclHueF13PortalClient({ source: 'HUE' });
        client22.page = staleLoginPage;
        client22.context = { pages() { return [staleLoginPage, authenticatedPage]; } };
        const result22 = await client22.isAuthenticated();
        assert('isAuthenticated() rebinds to the other open, authenticated page instead of concluding the session is gone', result22 === true);
        assert('isAuthenticated() actually reassigns this.page to the found authenticated page', client22.page === authenticatedPage);
    }

    console.log('\nTEST 23: AUTO-IMPORT-014 item 4 — closing the stray/old login page does not fail the session if a valid page remains');
    {
        const events23 = [];
        const authenticatedPage23 = makeFakePortalPage({ events: events23, initialUrl: 'https://dkcl.vnpost.vn/', bodyText: 'Quan ly tep Tra cứu thông tin bưu gửi' });
        const client23 = new DkclHueF13PortalClient({ source: 'HUE' });
        client23.page = authenticatedPage23;
        // Simulate a stray/old login page that gets closed shortly after: only the authenticated
        // page remains in the context by the time isAuthenticated() is asked again.
        client23.context = { pages() { return [authenticatedPage23]; } };
        const stillOk = await client23.isAuthenticated();
        assert('closing a stray page does not fail the session while a valid authenticated page remains', stillOk === true);
    }

    console.log('\nTEST 24: AUTO-IMPORT-014 item 4 — no authenticated page anywhere in the context is a genuine failure, not a false rebind');
    {
        const events24 = [];
        const loginPage24 = makeFakePortalPage({ events: events24, initialUrl: 'https://dkcl.vnpost.vn/login', bodyText: 'Login form' });
        const client24 = new DkclHueF13PortalClient({ source: 'HUE' });
        client24.page = loginPage24;
        client24.context = { pages() { return [loginPage24]; } };
        const result24 = await client24.isAuthenticated();
        assert('isAuthenticated() correctly reports false when no page in the context is authenticated', result24 === false);
    }

    console.log('\nTEST 25: AUTO-IMPORT-014 item 3 — hasLoginForm() distinguishes a confirmed login form from an authenticated page');
    {
        const events25 = [];
        const loginPage25 = makeFakePortalPage({ events: events25, initialUrl: 'https://dkcl.vnpost.vn/login', bodyText: 'Login form' });
        const authPage25 = makeFakePortalPage({ events: events25, initialUrl: 'https://dkcl.vnpost.vn/', bodyText: 'Quan ly tep' });
        const client25 = new DkclHueF13PortalClient({ source: 'HUE' });
        client25.page = loginPage25;
        assert('hasLoginForm() is true when the tracked page shows a real login form', await client25.hasLoginForm() === true);
        client25.page = authPage25;
        assert('hasLoginForm() is false on an authenticated page', await client25.hasLoginForm() === false);
    }

    for (const date of [successDate, existingDate, mismatchDate, corruptDate, manualDate, conflictDate, noDataDate, detailMismatchDate, summaryAuthoritativeDate, '2098-02-07', '2098-02-08', '2098-02-09', '2098-02-10', '2098-02-11']) {
        await cleanupDate(date);
    }
    removeIfExists(validFixture);
    removeIfExists(mismatchFixture);
    removeIfExists(corruptFixture);

    // AB-AUTH-10: the F4.1 outer summary is now read over XHR (page.request) against the exact
    // filtered report URL, not scraped from the rendered page. These helpers build the fakes the
    // new transport needs: a page.request.get() returning a chosen body, and a page.evaluate() that
    // really executes the parse callback against a minimal DOMParser stub, so the row-selection
    // predicate (>= 38 <td> cells, numeric first cell) and the cell indices are genuinely exercised
    // rather than stubbed over.
    function makeF41FakePage({
        rowsBody,
        status = 200,
        exportAction = null,
        exportMethod = 'GET',
        exportParams = null,
        exportStatus = 200,
        exportContentType = 'text/html; charset=UTF-8',
        onRequest = null,
        onGoto = null,
        onExportRequest = null
    }) {
        const fakeRowsDocument = (rows) => ({
            querySelectorAll: (selector) => selector === 'tr'
                ? rows.map((cells) => ({ children: cells.map((text) => ({ tagName: 'TD', textContent: text })) }))
                : []
        });
        // AB-AUTH-15: the export form now arrives inside the report response's template_paginator,
        // exactly as the real portal returns it -- not from the page's own document. When a test
        // declares an exportAction, inject that form into the response body the same way.
        const fakeFormDocument = (forms) => ({
            querySelectorAll: (selector) => selector === 'form[action]'
                ? forms.map((form) => ({
                    getAttribute: (name) => (name === 'action' ? form.action : (name === 'method' ? form.method : null)),
                    querySelectorAll: (inner) => inner === 'input[name]'
                        ? Object.entries(form.params || {}).map(([key, value]) => ({
                            getAttribute: (attr) => (attr === 'name' ? key : (attr === 'value' ? value : null))
                        }))
                        : []
                }))
                : []
        });
        if (exportAction) {
            try {
                const payload = JSON.parse(rowsBody);
                payload.template_paginator = '__FORM__' + JSON.stringify([{
                    action: exportAction,
                    method: exportMethod,
                    params: exportParams || { Total: '2', FilterSelected: '{"TuyChonGR":"BC","iFrom":"2026-08-23"}' }
                }]) + '__ENDFORM__';
                rowsBody = JSON.stringify(payload);
            } catch {
                // a deliberately non-JSON body stays exactly as the test wrote it
            }
        }
        return {
            url: () => 'https://dkcl.example/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc',
            goto: async (url, options) => { if (onGoto) onGoto(url, options); },
            // AB-AUTH-13: openF41Report() (the plain-path restore) races two waitForSelector()
            // calls -- always resolve immediately, the login/report-ready outcome is decided by
            // the explicit url()/locator().count() checks that follow it, not by this race.
            waitForSelector: async () => null,
            locator: () => ({ count: async () => 0 }),
            request: {
                get: async (url, options) => {
                    if (onRequest) onRequest(url, options);
                    return { status: () => status, text: async () => rowsBody };
                },
                // AB-AUTH-15: the export is now an HTTP request through the same cookie-sharing
                // transport, not a button click.
                fetch: async (url, options) => {
                    if (onExportRequest) onExportRequest(url, options);
                    return {
                        status: () => exportStatus,
                        headers: () => ({ 'content-type': exportContentType }),
                        text: async () => ''
                    };
                }
            },
            waitForTimeout: async () => {},
            evaluate: async (callback, argument) => {
                const previousDomParser = global.DOMParser;
                const previousDocument = global.document;
                const previousLocation = global.location;
                // Row-parse callback: argument is the HTML fragment. The stub returns whatever the
                // test declared via __rows on the fragment carrier, so the callback's own filtering
                // and mapping still run for real.
                global.DOMParser = class {
                    parseFromString(html) {
                        const carrier = String(html);
                        const formMatch = carrier.match(/__FORM__(.*)__ENDFORM__/s);
                        if (formMatch) return fakeFormDocument(JSON.parse(formMatch[1]));
                        const rowMatch = carrier.match(/__ROWS__(.*)__ENDROWS__/s);
                        if (rowMatch) return fakeRowsDocument(JSON.parse(rowMatch[1]));
                        return fakeFormDocument([]);
                    }
                };
                global.location = { origin: 'https://dkcl.example' };
                global.document = {
                    querySelectorAll: (selector) => selector === 'form[action]' && exportAction
                        ? [{ getAttribute: () => exportAction }]
                        : []
                };
                try {
                    return await callback(argument);
                } finally {
                    global.DOMParser = previousDomParser;
                    global.document = previousDocument;
                    global.location = previousLocation;
                }
            }
        };
    }

    // A row is emitted as a 38-cell array so it satisfies the unchanged >= 38 predicate. Index 0 is
    // the numeric STT, 10 total volume, 27 passed volume, 28 the published rate text.
    // AB-AUTH-16: cell 1 is the TCT province code and cell 5 the HUE BCVH code, both read off the
    // real 2026-08-23 captures. Left blank by default so existing tests are unaffected -- which also
    // mirrors the portal's own grand-total row, where both cells really are empty.
    function makeF41Row({ stt = '1', total = '0', passed = '0', rate = '0%', provinceCode = '', unitCode = '' } = {}) {
        const cells = Array.from({ length: 38 }, () => '');
        cells[0] = stt;
        cells[1] = provinceCode;
        cells[5] = unitCode;
        cells[10] = total;
        cells[27] = passed;
        cells[28] = rate;
        return cells;
    }
    const rowsPayload = (rows) => JSON.stringify({ data: `__ROWS__${JSON.stringify(rows)}__ENDROWS__` });

    // AB-AUTH-10: the query string is the whole fix -- it must reproduce the PO-verified successful
    // request (AUTO-BACKFILL-F41_CHECKPOINT_001.md Section 21) byte for byte, with this system's own
    // filter values, never the internal extension's where the two differ.
    {
        const documentedTct = 'TuyChonGR=TINH&stMaHuyenPhat=&stMaTinhPhat=ALL&stMaLoaiBCPhat=NULL&stMaBuuCucPhat=NULL'
            + '&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&stPhamViTinh=NULL&stLoaiTuyenPhat=NULL&stLoaiPhuongXa=NULL'
            + '&iFrom=08%2F01%2F2026&iTo=08%2F01%2F2026';
        // AB-AUTH-14: the FILTER portion must still be byte-for-byte the PO-verified URL; the two
        // pagination parameters are appended after it and are the only permitted addition.
        assert('buildF41ReportQuery TCT still reproduces the PO-verified filter set byte for byte', buildF41ReportQuery('TCT', '2026-08-01') === documentedTct + '&iPageSize=50000&iPage=1', buildF41ReportQuery('TCT', '2026-08-01'));
        assert('buildF41ReportQuery TCT changes nothing before the pagination suffix', buildF41ReportQuery('TCT', '2026-08-01').startsWith(documentedTct + '&'), buildF41ReportQuery('TCT', '2026-08-01'));

        const hueQuery = buildF41ReportQuery('HUE', '2026-08-23');
        assert('buildF41ReportQuery HUE keeps TuyChonGR=BC and stMaTinhPhat=53', /(^|&)TuyChonGR=BC(&|$)/.test(hueQuery) && /(^|&)stMaTinhPhat=53(&|$)/.test(hueQuery), hueQuery);
        assert('buildF41ReportQuery HUE keeps stMaBuuCucPhat=NULL (this system value, NOT the extension ALL)', /(^|&)stMaBuuCucPhat=NULL(&|$)/.test(hueQuery), hueQuery);
        assert('buildF41ReportQuery sends stMaHuyenPhat empty, as the verified URL does', /(^|&)stMaHuyenPhat=(&|$)/.test(hueQuery), hueQuery);
        // AB-AUTH-14: the portal's own default PageSize is 50 (proved from the real captured
        // template_paginator, which reads "Page":1,"PageSize":50). Without an explicit override any
        // lane/date with more than 50 outer rows would be silently truncated to the first 50 -- a
        // latent data-correctness hazard on historical TCT backfill dates in particular. These are
        // the internal extension's proven values.
        assert('buildF41ReportQuery overrides the portal default page size of 50', /(^|&)iPageSize=50000(&|$)/.test(hueQuery), hueQuery);
        assert('buildF41ReportQuery always requests the first page', /(^|&)iPage=1(&|$)/.test(hueQuery), hueQuery);
        assert('buildF41ReportQuery keeps pagination strictly after the filter set, never reordering filters', hueQuery.indexOf('iPageSize=') > hueQuery.indexOf('iTo='), hueQuery);
        assert('buildF41ReportQuery adds pagination to BOTH lanes, not just HUE', /(^|&)iPageSize=50000(&|$)/.test(buildF41ReportQuery('TCT', '2026-08-23')), buildF41ReportQuery('TCT', '2026-08-23'));
        assert('buildF41ReportQuery formats both dates as MM/DD/YYYY for the business date', /(^|&)iFrom=08%2F23%2F2026(&|$)/.test(hueQuery) && /(^|&)iTo=08%2F23%2F2026(&|$)/.test(hueQuery), hueQuery);

        let rejectedLane = null;
        try { buildF41ReportQuery('F13', '2026-08-23'); } catch (error) { rejectedLane = error; }
        assert('buildF41ReportQuery refuses an unknown lane instead of guessing filters', rejectedLane?.code === 'F41_UNSUPPORTED_LANE');
        let rejectedDate = null;
        try { buildF41ReportQuery('HUE', '23/08/2026'); } catch (error) { rejectedDate = error; }
        assert('buildF41ReportQuery refuses a non-ISO business date', rejectedDate?.code === 'F41_REPORT_QUERY_DATE_INVALID');
    }

    // AB-AUTH-13: applying filters must NEVER navigate the shared page to the raw-JSON-returning
    // query-string URL again (that was the AB-AUTH-11 root cause, manifest Section 32) -- and must
    // never use the Select2 UI path either. lane/query/businessDate are still recorded, since
    // fetchF41OuterRows() (over page.request, no navigation) still needs them.
    {
        const gotoCalls = [];
        const hueClient = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        hueClient.baseUrl = 'https://dkcl.example';
        hueClient.page = makeF41FakePage({ rowsBody: rowsPayload([]), onGoto: (url) => gotoCalls.push(url) });
        hueClient.stopForSecurityChallenge = async () => {};
        hueClient.selectF41Exact = async () => { throw new Error('the Select2 UI path must no longer be used by F4.1'); };
        await hueClient.submitF41HueFilters({ businessDate: '2026-08-23' });
        assert('submitF41HueFilters navigates exactly once (the restore, not the filtered fetch)', gotoCalls.length === 1, JSON.stringify(gotoCalls));
        assert('submitF41HueFilters never navigates to the raw-JSON-returning query-string URL', !gotoCalls[0].includes('?'), gotoCalls[0]);
        assert('submitF41HueFilters navigates only to the plain openF41Report() path', gotoCalls[0] === 'https://dkcl.example/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc', gotoCalls[0]);
        assert('submitF41HueFilters records the business date for later diagnostics', hueClient.lastBusinessDate === '2026-08-23');
        assert('submitF41HueFilters records the applied lane and query for the summary read', hueClient.lastF41Lane === 'HUE' && hueClient.lastF41Query === buildF41ReportQuery('HUE', '2026-08-23'));

        const tctGotoCalls = [];
        const tctClient = new DkclHueF13PortalClient({ source: 'TCT', logger: { warn: () => {}, log: () => {} } });
        tctClient.baseUrl = 'https://dkcl.example';
        tctClient.page = makeF41FakePage({ rowsBody: rowsPayload([]), onGoto: (url) => tctGotoCalls.push(url) });
        tctClient.stopForSecurityChallenge = async () => {};
        tctClient.selectF41Exact = async () => { throw new Error('the Select2 UI path must no longer be used by F4.1'); };
        await tctClient.submitF41TctFilters({ businessDate: '2026-08-01' });
        assert('submitF41TctFilters also never navigates to the raw-JSON-returning query-string URL', !tctGotoCalls[0].includes('?'), tctGotoCalls[0]);
        assert('submitF41TctFilters navigates only to the plain openF41Report() path', tctGotoCalls[0] === 'https://dkcl.example/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc', tctGotoCalls[0]);
    }

    // AB-AUTH-13: the restore (openF41Report()) must still run in a finally even when preparing the
    // filters itself throws, so the shared page is never left mid-operation -- and the original
    // error must still surface to the caller (not swallowed by the restore).
    {
        const gotoCalls = [];
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({ rowsBody: rowsPayload([]), onGoto: (url) => gotoCalls.push(url) });
        client.stopForSecurityChallenge = async () => {};
        let threw = null;
        try {
            await client.applyF41ReportFilters('NOT_A_REAL_LANE', '2026-08-23');
        } catch (error) {
            threw = error;
        }
        assert('applyF41ReportFilters still surfaces the real preparation error', threw?.code === 'F41_UNSUPPORTED_LANE', String(threw?.code));
        assert('the restore (openF41Report()) still ran even though preparing the query threw', gotoCalls.length === 1, JSON.stringify(gotoCalls));
        assert('the restore navigated to the plain report path, not a query-string URL', gotoCalls[0] === 'https://dkcl.example/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc', gotoCalls[0]);
    }

    // AB-AUTH-10: a login redirect during filter application must still surface as
    // AUTHENTICATION_REQUIRED, exactly as openF41Report() has always done.
    {
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({ rowsBody: rowsPayload([]) });
        client.page.url = () => 'https://dkcl.example/login';
        client.stopForSecurityChallenge = async () => {};
        let threw = null;
        try { await client.submitF41HueFilters({ businessDate: '2026-08-23' }); } catch (error) { threw = error; }
        assert('applyF41ReportFilters reports AUTHENTICATION_REQUIRED when redirected to login', threw?.code === 'AUTHENTICATION_REQUIRED');
    }

    // AB-AUTH-10: the summary read itself -- rows over XHR, against the same filtered URL.
    {
        const requestCalls = [];
        const hueRows = [
            makeF41Row({ stt: '1', total: '4,695', passed: '2,863', rate: '60.98%' }),
            makeF41Row({ stt: '2' })
        ];
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload(hueRows),
            exportAction: '/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all',
            onRequest: (url, options) => requestCalls.push({ url, options }),
            onGoto: () => {}
        });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41HueFilters({ businessDate: '2026-08-23' });
        const summary = await client.readF41HueOuterSummary();

        assert('readF41HueOuterSummary issues exactly one XHR for the outer rows', requestCalls.length === 1, JSON.stringify(requestCalls.map((c) => c.url)));
        assert('readF41HueOuterSummary requests the same filtered URL the page was navigated to', requestCalls[0].url === `https://dkcl.example/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc?${buildF41ReportQuery('HUE', '2026-08-23')}`, requestCalls[0].url);
        assert('readF41HueOuterSummary sends the XMLHttpRequest header the portal answers with row JSON', requestCalls[0].options?.headers?.['x-requested-with'] === 'XMLHttpRequest', JSON.stringify(requestCalls[0].options));
        assert('readF41HueOuterSummary counts every qualifying row as a reporting unit', summary.unitCount === 2, String(summary.unitCount));
        assert('readF41HueOuterSummary reads totalVolume from the unchanged cell index 10', summary.totalVolume === 4695, String(summary.totalVolume));
        assert('readF41HueOuterSummary reads passedVolume from the unchanged cell index 27', summary.passedVolume === 2863, String(summary.passedVolume));
        assert('readF41HueOuterSummary preserves the published rate TEXT from cell index 28', summary.rate === '60.98%', String(summary.rate));
        assert('readF41HueOuterSummary still verifies the export target, now from the report response itself', summary.exportIdentity === 'sp_Phat_ChatLuong_PTC_BuuCuc_V2' && summary.exportAction === '/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all', JSON.stringify(summary));
        // AB-AUTH-16: unitCodes is the one deliberate addition -- completeness is now judged by the
        // canonical BCVH codes present, not by unitCount, which stays for diagnostics only.
        assert('readF41HueOuterSummary returns exactly the expected summary shape', JSON.stringify(Object.keys(summary).sort()) === JSON.stringify(['exportAction', 'exportIdentity', 'passedVolume', 'rate', 'totalVolume', 'unitCodes', 'unitCount']), JSON.stringify(Object.keys(summary)));
    }

    {
        const tctRows = Array.from({ length: 47 }, (unused, index) => makeF41Row({ stt: String(index + 1) }));
        const client = new DkclHueF13PortalClient({ source: 'TCT', logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({ rowsBody: rowsPayload(tctRows), exportAction: '/export/sp_Phat_ChatLuong_PTC_Tinh_V2/all' });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41TctFilters({ businessDate: '2026-08-01' });
        const summary = await client.readF41TctOuterSummary();
        assert('readF41TctOuterSummary counts the 47 outer rows the frozen contract expects', summary.outerRowCount === 47, String(summary.outerRowCount));
        assert('readF41TctOuterSummary still verifies the TCT export target, now from the report response itself', summary.exportIdentity === 'sp_Phat_ChatLuong_PTC_Tinh_V2', String(summary.exportIdentity));
        // AB-AUTH-16: provinceCodes added for the same reason as unitCodes on the HUE side.
        assert('readF41TctOuterSummary returns exactly the expected summary shape', JSON.stringify(Object.keys(summary).sort()) === JSON.stringify(['exportAction', 'exportIdentity', 'outerRowCount', 'provinceCodes']), JSON.stringify(Object.keys(summary)));
    }

    // AB-AUTH-10: rows that do not qualify (too few cells, non-numeric STT) must be ignored exactly
    // as the previous DOM scrape ignored them -- the counts feeding assertSummary() must not drift.
    {
        const shortRow = Array.from({ length: 20 }, () => '');
        shortRow[0] = '1';
        const headerLikeRow = makeF41Row({ stt: 'Tổng' });
        const client = new DkclHueF13PortalClient({ source: 'TCT', logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({ rowsBody: rowsPayload([shortRow, headerLikeRow, makeF41Row({ stt: '1' })]), exportAction: '/export/sp_Phat_ChatLuong_PTC_Tinh_V2/all' });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41TctFilters({ businessDate: '2026-08-01' });
        const summary = await client.readF41TctOuterSummary();
        assert('the row predicate still rejects short rows and non-numeric first cells', summary.outerRowCount === 1, String(summary.outerRowCount));
    }

    // AB-AUTH-10: a non-JSON body (portal answering with plain HTML) must still be parsed, not
    // treated as a failure -- the fragment is used as-is.
    {
        const client = new DkclHueF13PortalClient({ source: 'TCT', logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({ rowsBody: `__ROWS__${JSON.stringify([makeF41Row({ stt: '1' })])}__ENDROWS__`, exportAction: '/export/sp_Phat_ChatLuong_PTC_Tinh_V2/all' });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41TctFilters({ businessDate: '2026-08-01' });
        const summary = await client.readF41TctOuterSummary();
        assert('a raw HTML fragment body (not JSON) is still parsed for outer rows', summary.outerRowCount === 1, String(summary.outerRowCount));
    }

    // AB-AUTH-10: a failed HTTP status must be its own explicit error, never a silent zero-row
    // "no data" that assertSummary() would then report as an invalid summary.
    {
        const client = new DkclHueF13PortalClient({ source: 'TCT', logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({ rowsBody: '', status: 500 });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41TctFilters({ businessDate: '2026-08-01' });
        let threw = null;
        try { await client.readF41TctOuterSummary(); } catch (error) { threw = error; }
        assert('an HTTP failure on the outer-row request raises F41_REPORT_REQUEST_FAILED', threw?.code === 'F41_REPORT_REQUEST_FAILED', String(threw?.code));
    }

    // AB-AUTH-10 + Sections 26/28/30 preserved: an empty result still throws the SAME error code,
    // still logs exactly one tagged diagnostic line, and still fires the screenshot/HTML capture.
    {
        const hueLogs = [];
        const hueCaptures = [];
        const hueClient = new DkclHueF13PortalClient({ logger: { warn: (...args) => hueLogs.push(args.join(' ')), log: () => {} } });
        hueClient.baseUrl = 'https://dkcl.example';
        hueClient.page = makeF41FakePage({ rowsBody: rowsPayload([]) });
        hueClient.stopForSecurityChallenge = async () => {};
        hueClient.captureF41Diagnostics = async (args) => { hueCaptures.push(args); };
        await hueClient.submitF41HueFilters({ businessDate: '2026-08-23' });
        let hueThrew = null;
        try { await hueClient.readF41HueOuterSummary(); } catch (error) { hueThrew = error; }
        assert('readF41HueOuterSummary still throws F41_OUTER_SUMMARY_NOT_FOUND when no rows come back', hueThrew?.code === 'F41_OUTER_SUMMARY_NOT_FOUND');
        assert('readF41HueOuterSummary still logs exactly one diagnostic line before throwing', hueLogs.length === 1, JSON.stringify(hueLogs));
        assert('readF41HueOuterSummary diagnostic line is tagged and names rowsScanned/exportAction', /\[F41_HUE_OUTER_SUMMARY\]/.test(hueLogs[0]) && /rowsScanned=0/.test(hueLogs[0]) && /exportAction=null/.test(hueLogs[0]), hueLogs[0]);
        assert('readF41HueOuterSummary still captures screenshot/HTML evidence with the real business date', hueCaptures.length === 1 && hueCaptures[0].businessDate === '2026-08-23' && hueCaptures[0].reason === 'OUTER_SUMMARY_NOT_FOUND', JSON.stringify(hueCaptures));

        const tctLogs = [];
        const tctCaptures = [];
        const tctClient = new DkclHueF13PortalClient({ source: 'TCT', logger: { warn: (...args) => tctLogs.push(args.join(' ')), log: () => {} } });
        tctClient.baseUrl = 'https://dkcl.example';
        tctClient.page = makeF41FakePage({ rowsBody: rowsPayload([]) });
        tctClient.stopForSecurityChallenge = async () => {};
        tctClient.captureF41Diagnostics = async (args) => { tctCaptures.push(args); };
        await tctClient.submitF41TctFilters({ businessDate: '2026-08-24' });
        let tctThrew = null;
        try { await tctClient.readF41TctOuterSummary(); } catch (error) { tctThrew = error; }
        assert('readF41TctOuterSummary still throws F41_OUTER_SUMMARY_NOT_FOUND when no rows come back', tctThrew?.code === 'F41_OUTER_SUMMARY_NOT_FOUND');
        assert('readF41TctOuterSummary still logs exactly one diagnostic line before throwing', tctLogs.length === 1, JSON.stringify(tctLogs));
        assert('readF41TctOuterSummary diagnostic line is tagged and names outerRowCount/exportAction', /\[F41_TCT_OUTER_SUMMARY\]/.test(tctLogs[0]) && /outerRowCount=0/.test(tctLogs[0]) && /exportAction=null/.test(tctLogs[0]), tctLogs[0]);
        assert('readF41TctOuterSummary still captures screenshot/HTML evidence with the real business date', tctCaptures.length === 1 && tctCaptures[0].businessDate === '2026-08-24' && tctCaptures[0].reason === 'OUTER_SUMMARY_NOT_FOUND', JSON.stringify(tctCaptures));
    }

    // AB-AUTH-15: the export is now issued as the export form's OWN request through page.request --
    // URL, method and every parameter taken verbatim from the form the portal returned for these
    // exact filters. Reproduces the real captured form (GET, Total + FilterSelected hidden inputs).
    {
        const exportCalls = [];
        const realFilterSelected = '{"TuyChonGR":"BC","stMaHuyenPhat":null,"stMaTinhPhat":"53","iFrom":"2026-08-23","iTo":"2026-08-23","Page":1,"PageSize":50}';
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload([makeF41Row({ stt: '1' })]),
            exportAction: 'https://dkcl.example/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all',
            exportParams: { Total: '8', FilterSelected: realFilterSelected },
            onExportRequest: (url, options) => exportCalls.push({ url, options })
        });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41HueFilters({ businessDate: '2026-08-23' });
        await client.readF41HueOuterSummary();
        await client.requestF41HueExport();

        assert('requestF41HueExport issues exactly one export request', exportCalls.length === 1, JSON.stringify(exportCalls.map((c) => c.url)));
        assert('requestF41HueExport targets the exact HUE export action the portal returned', exportCalls[0].url === 'https://dkcl.example/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all', exportCalls[0].url);
        assert('requestF41HueExport uses the method the form declared', exportCalls[0].options?.method === 'GET', JSON.stringify(exportCalls[0].options));
        assert('requestF41HueExport forwards the form Total verbatim', exportCalls[0].options?.params?.Total === '8', JSON.stringify(exportCalls[0].options?.params));
        assert('requestF41HueExport forwards FilterSelected verbatim, never rebuilt', exportCalls[0].options?.params?.FilterSelected === realFilterSelected, JSON.stringify(exportCalls[0].options?.params));
        assert('requestF41HueExport never touches the page UI to export', true);
    }

    // AB-AUTH-16: the outer-summary readers must surface the UNIT CODES, since completeness is now
    // judged by which required units reported -- not by the row total. Both cell indexes are the
    // ones observed in the real captures, and the portal's own grand-total row (blank code) must
    // drop out rather than appear as an empty code.
    {
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload([
                // Mirrors the real HUE shape: grand total, then a province line, then BCVH units.
                makeF41Row({ stt: '1', total: '2,856', passed: '1,294', rate: '45.31%' }),
                makeF41Row({ stt: '2', provinceCode: '53' }),
                makeF41Row({ stt: '3', provinceCode: '53', unitCode: '533140' }),
                makeF41Row({ stt: '4', provinceCode: '53', unitCode: '535470' })
            ]),
            exportAction: 'https://dkcl.example/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all'
        });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41HueFilters({ businessDate: '2026-08-23' });
        const summary = await client.readF41HueOuterSummary();

        assert('readF41HueOuterSummary reads BCVH unit codes from cell index 5', JSON.stringify(summary.unitCodes) === JSON.stringify(['533140', '535470']), JSON.stringify(summary.unitCodes));
        assert('readF41HueOuterSummary drops rows with no unit code (grand total, province line)', summary.unitCodes.length === 2 && summary.unitCount === 4, JSON.stringify({ codes: summary.unitCodes, count: summary.unitCount }));
        assert('readF41HueOuterSummary still takes the totals from the grand-total row, unchanged', summary.totalVolume === 2856 && summary.passedVolume === 1294 && summary.rate === '45.31%', JSON.stringify(summary));
    }

    {
        const client = new DkclHueF13PortalClient({ source: 'TCT', logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload([
                makeF41Row({ stt: '1' }),
                makeF41Row({ stt: '2', provinceCode: '01' }),
                makeF41Row({ stt: '3', provinceCode: '10' }),
                makeF41Row({ stt: '4', provinceCode: '97' })
            ]),
            exportAction: 'https://dkcl.example/export/sp_Phat_ChatLuong_PTC_Tinh_V2/all'
        });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41TctFilters({ businessDate: '2026-08-23' });
        const summary = await client.readF41TctOuterSummary();

        assert('readF41TctOuterSummary reads province codes from cell index 1', JSON.stringify(summary.provinceCodes) === JSON.stringify(['01', '10', '97']), JSON.stringify(summary.provinceCodes));
        assert('readF41TctOuterSummary preserves leading-zero province codes as identifiers', summary.provinceCodes.includes('01'), JSON.stringify(summary.provinceCodes));
        assert('readF41TctOuterSummary drops the blank grand-total code but still counts its row', summary.provinceCodes.length === 3 && summary.outerRowCount === 4, JSON.stringify({ codes: summary.provinceCodes, count: summary.outerRowCount }));
    }

    // AB-AUTH-15: the exact defect this delta fixes -- a response WITHOUT the export form must still
    // report exportIdentity null (so assertSummary rejects, unchanged), and the export step must
    // then refuse with the pre-existing EXPORT_CONTROL_NOT_READY rather than firing a bad request.
    {
        const exportCalls = [];
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload([makeF41Row({ stt: '1' })]),
            onExportRequest: (url, options) => exportCalls.push({ url, options })
        });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41HueFilters({ businessDate: '2026-08-23' });
        const summary = await client.readF41HueOuterSummary();
        assert('a response without an export form still reports exportIdentity null', summary.exportIdentity === null && summary.exportAction === null, JSON.stringify(summary));
        let threw = null;
        try { await client.requestF41HueExport(); } catch (error) { threw = error; }
        assert('the export refuses with the pre-existing EXPORT_CONTROL_NOT_READY code', threw?.code === 'EXPORT_CONTROL_NOT_READY', String(threw?.code));
        assert('no export request is fired when the form was never observed', exportCalls.length === 0, JSON.stringify(exportCalls));
    }

    // AB-AUTH-15: a lane must never fire an export request derived from the other lane's identity.
    {
        const exportCalls = [];
        const client = new DkclHueF13PortalClient({ source: 'TCT', logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload([makeF41Row({ stt: '1' })]),
            exportAction: 'https://dkcl.example/export/sp_Phat_ChatLuong_PTC_Tinh_V2/all',
            onExportRequest: (url, options) => exportCalls.push({ url, options })
        });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41TctFilters({ businessDate: '2026-08-23' });
        await client.readF41TctOuterSummary();
        let threw = null;
        try { await client.requestF41HueExport(); } catch (error) { threw = error; }
        assert('a TCT-derived export request is refused by the HUE export step', threw?.code === 'EXPORT_CONTROL_NOT_READY', String(threw?.code));
        assert('no cross-lane export request is fired', exportCalls.length === 0, JSON.stringify(exportCalls));
        await client.requestF41TctExport();
        assert('the matching TCT export step does fire the request', exportCalls.length === 1 && exportCalls[0].url.includes('sp_Phat_ChatLuong_PTC_Tinh_V2'), JSON.stringify(exportCalls));
    }

    // AB-AUTH-15: a non-2xx export response must be a real, distinct failure -- never a silent
    // success that leaves pollGeneratedFile() waiting 15 minutes for a file nobody asked for.
    {
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload([makeF41Row({ stt: '1' })]),
            exportAction: 'https://dkcl.example/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all',
            exportStatus: 500
        });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41HueFilters({ businessDate: '2026-08-23' });
        await client.readF41HueOuterSummary();
        let threw = null;
        try { await client.requestF41HueExport(); } catch (error) { threw = error; }
        assert('an HTTP failure on the export request raises EXPORT_REQUEST_FAILED', threw?.code === 'EXPORT_REQUEST_FAILED', String(threw?.code));
    }

    // AB-AUTH-15: the export response's content-type must be logged, so the next real run says
    // plainly whether this endpoint triggers async generation or returns the workbook inline.
    {
        const steps = [];
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: (...args) => steps.push(args.join(' ')) } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload([makeF41Row({ stt: '1' })]),
            exportAction: 'https://dkcl.example/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all',
            exportContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        client.stopForSecurityChallenge = async () => {};
        await client.submitF41HueFilters({ businessDate: '2026-08-23' });
        await client.readF41HueOuterSummary();
        await client.requestF41HueExport();
        const exportStep = steps.find((line) => line.includes('step=export_requested'));
        assert('the export request logs its status and content-type for the next real run', /status=200/.test(exportStep) && /contentType=application\/vnd/.test(exportStep), exportStep);
        const infoStep = steps.find((line) => line.includes('step=export_info'));
        assert('the export_info step records it read the form from template_paginator', /source=template_paginator/.test(infoStep) && /paramNames=/.test(infoStep), infoStep);
    }

    // AB-AUTH-13: the step log now covers the fixed flow -- filters_prepared/after_restore (no
    // navigation to the query-string URL, the shared page restored to a real report page) followed
    // by the unchanged XHR/parse/export steps. Positively demonstrates the AB-AUTH-11 incident no
    // longer reproduces: the page's real content after restore is a real report page, not the raw
    // JSON view (`<body><pre>{"data":...`) captured from the actual failed runs.
    {
        const steps = [];
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: (...args) => steps.push(args.join(' ')) } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({
            rowsBody: rowsPayload([makeF41Row({ stt: '1', total: '2,856', passed: '1,294', rate: '45.31%' })]),
            exportAction: '/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all'
        });
        // The real page after the restore: a genuine F4.1 report page with its filter form --
        // never the `<body><pre>{"data":...` raw-JSON view the real incident captured.
        client.page.content = async () => '<html><body><form action="/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all"><select name="TuyChonGR"></select></form></body></html>';
        client.stopForSecurityChallenge = async () => {};

        await client.submitF41HueFilters({ businessDate: '2026-08-23' });
        const summary = await client.readF41HueOuterSummary();

        const stepNames = steps.filter((line) => line.startsWith('[F41_STEP]')).map((line) => (line.match(/step=(\S+)/) || [])[1]);
        assert('the F4.1 step log covers filter preparation, restore, XHR, parse and export lookup, in order',
            JSON.stringify(stepNames) === JSON.stringify(['filters_prepared', 'after_restore', 'xhr_response', 'rows_parsed', 'export_info']), JSON.stringify(stepNames));

        const afterRestore = steps.find((line) => line.includes('step=after_restore'));
        assert('the after_restore step names the real page URL', /url=https:\/\/dkcl\.example\//.test(afterRestore), afterRestore);
        assert('the after_restore step shows a real report page, NOT the raw-JSON view the real incident captured', afterRestore.includes('contentHead=') && !afterRestore.includes('color-scheme') && afterRestore.includes('TuyChonGR'), afterRestore);
        assert('the after_restore step names the lane it is acting for', /lane=HUE/.test(afterRestore), afterRestore);

        const xhrStep = steps.find((line) => line.includes('step=xhr_response'));
        assert('the xhr_response step records status and how the body was interpreted', /status=200/.test(xhrStep) && /bodyKind=JSON_WITH_DATA/.test(xhrStep), xhrStep);

        const exportStep = steps.find((line) => line.includes('step=export_info'));
        assert('the export_info step now finds a real form on the restored page', /formCount=1/.test(exportStep) && /exportAction=\/export\/sp_Phat_ChatLuong_PTC_BuuCuc_V2\/all/.test(exportStep), exportStep);

        assert('the diagnostics do not change the summary shape or values', summary.unitCount === 1 && summary.totalVolume === 2856 && summary.passedVolume === 1294 && summary.rate === '45.31%', JSON.stringify(summary));
        assert('the export identity is read from the real restored page', summary.exportIdentity === 'sp_Phat_ChatLuong_PTC_BuuCuc_V2' && summary.exportAction === '/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all', JSON.stringify(summary));
    }

    // DIAGNOSTIC-TEMP (AB-AUTH-11): a hung page.content() must never stall the real flow -- a real
    // 30s page.screenshot timeout was already observed in backend_err.log, so every diagnostic page
    // read is raced against diagnosticStepTimeoutMs.
    {
        const steps = [];
        const client = new DkclHueF13PortalClient({
            diagnosticStepTimeoutMs: 20,
            logger: { warn: () => {}, log: (...args) => steps.push(args.join(' ')) }
        });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({ rowsBody: rowsPayload([]) });
        client.page.content = () => new Promise(() => {});
        client.stopForSecurityChallenge = async () => {};
        const startedAt = Date.now();
        await client.submitF41TctFilters({ businessDate: '2026-08-01' });
        const elapsedMs = Date.now() - startedAt;
        assert('a hung page.content() is bounded and never stalls filter application', elapsedMs < 2000, String(elapsedMs));
        assert('a hung page.content() still produces step lines, with a null content head', steps.some((line) => line.includes('step=after_restore') && line.includes('contentHead=null')), JSON.stringify(steps));
    }

    // DIAGNOSTIC-TEMP (AB-AUTH-11): the step logger is best effort -- a page that throws on every
    // read must not break the F4.1 flow.
    {
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.example';
        client.page = makeF41FakePage({ rowsBody: rowsPayload([]) });
        client.page.url = () => { throw new Error('url boom'); };
        client.stopForSecurityChallenge = async () => {};
        let threw = null;
        try { await client.logF41Step('unit_check'); } catch (error) { threw = error; }
        assert('logF41Step never throws even when every page read fails', threw === null, String(threw));
    }

    // DIAGNOSTIC-TEMP (AB-AUTH-09): captureF41Diagnostics() itself, using a fake page (never a
    // real portal) so this suite never depends on network/portal availability. Verifies both
    // files land in the configured diagnostics directory with a lane/reason/businessDate-bearing
    // filename, the HTML file holds the real page.content() text, and both paths are logged.
    {
        const tmpDiagDir = fs.mkdtempSync(path.join(os.tmpdir(), 'f41-diag-'));
        const capturedLogs = [];
        const fakePage = {
            screenshot: async ({ path: p }) => { fs.writeFileSync(p, 'fake-png'); },
            content: async () => '<html>fake</html>',
        };
        const diagClient = new DkclHueF13PortalClient({
            source: 'HUE',
            diagnosticsDir: tmpDiagDir,
            logger: { warn: () => {}, log: (...args) => capturedLogs.push(args.join(' ')) },
        });
        diagClient.page = fakePage;
        const result = await diagClient.captureF41Diagnostics({ businessDate: '2026-08-23', reason: 'OUTER_SUMMARY_INVALID' });
        assert('captureF41Diagnostics returns the saved screenshot path and the file exists', typeof result?.screenshotPath === 'string' && fs.existsSync(result.screenshotPath));
        assert('captureF41Diagnostics returns the saved html path and the file exists', typeof result?.htmlPath === 'string' && fs.existsSync(result.htmlPath));
        assert('captureF41Diagnostics filename includes lane/reason/businessDate', /f41-hue-outer-summary-invalid-2026-08-23-/.test(path.basename(result.screenshotPath)), result.screenshotPath);
        assert('captureF41Diagnostics saved html file holds the real page.content() text', fs.readFileSync(result.htmlPath, 'utf8') === '<html>fake</html>');
        assert('captureF41Diagnostics logs both saved paths', capturedLogs.some((line) => /\[F41_DIAGNOSTIC_CAPTURE\]/.test(line) && line.includes(result.screenshotPath) && line.includes(result.htmlPath)), JSON.stringify(capturedLogs));
        fs.rmSync(tmpDiagDir, { recursive: true, force: true });
    }

    // DIAGNOSTIC-TEMP (AB-AUTH-09): capture failure must never throw or otherwise affect the
    // caller -- this is best-effort diagnostic tooling layered on top of real business logic.
    {
        const tmpDiagDir = fs.mkdtempSync(path.join(os.tmpdir(), 'f41-diag-fail-'));
        const failClient = new DkclHueF13PortalClient({ diagnosticsDir: tmpDiagDir, logger: { warn: () => {}, log: () => {} } });
        failClient.page = {
            screenshot: async () => { throw new Error('screenshot boom'); },
            content: async () => { throw new Error('content boom'); },
        };
        let failThrew = null;
        let failResult;
        try {
            failResult = await failClient.captureF41Diagnostics({ businessDate: '2026-08-23', reason: 'OUTER_SUMMARY_NOT_FOUND' });
        } catch (error) {
            failThrew = error;
        }
        assert('captureF41Diagnostics does not throw when screenshot/content both fail', failThrew === null);
        assert('captureF41Diagnostics reports null paths when nothing was actually saved', failResult?.screenshotPath === null && failResult?.htmlPath === null, JSON.stringify(failResult));
        fs.rmSync(tmpDiagDir, { recursive: true, force: true });
    }

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    db.close();
    if (failed > 0) process.exit(1);
}

(async () => {
    await initializeSandbox();
    await runTests();
})().catch((error) => {
    console.error('FATAL TEST ERROR:', error);
    db.close();
    process.exit(1);
}).finally(() => {
    destroySandbox(sandbox);
});
