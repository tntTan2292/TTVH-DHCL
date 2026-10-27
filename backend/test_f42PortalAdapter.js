'use strict';

// F42-PHASE-3 - F4.2 Portal adapter tests: request builders against the observed requests, the HTML helpers,
// the portal-client methods over a fake page (report, detail, export, generated-file list, download), the
// one-date services over a fake client (and the PO's real 10/10/2026 files as the known answer) and the
// executors. No browser, no portal, no live database.
// Run per file: node --test --experimental-sqlite test_f42PortalAdapter.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f42-portal-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F42 = path.join(sandbox, 'F4.2');

const { db } = require('./src/config/db');
const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const methods = require('./src/services/f42PortalClientMethods');
const { F42_EXECUTOR_IDENTITIES } = require('./src/services/autoBackfillF42Contract');
const { F42HueSingleDateService, F42TctSingleDateService, F42HueAdapter, standardizedFilename } = require('./src/services/f42SingleDateServices');
const { F42AutoBackfillExecutor, F42_BACKFILL_EXPORT_TIMEOUT_MS, createF42AutoBackfillExecutors } = require('./src/services/autoBackfillF42Executors');
const { selectNewestGeneratedFile } = require('./src/services/dkclHueF13SyncService');
const { hueCsvBuffer, tctBuffer, tctPopulation } = require('./test/f42Fixtures');

const REAL_HUE = path.resolve(__dirname, '../Data DKCL/F4.2-2026.10.10.csv');
const REAL_TCT = path.resolve(__dirname, '../Data DKCL/F4.2-TCT-2026.10.10.xlsx');

test.after(async () => {
    await new Promise((resolve) => db.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// 1. requests equal the ones observed on the real portal (Manifest Sections 3-4)
// ---------------------------------------------------------------------------------------------
test('report queries equal the requests observed for HUE (Tinh 53) and TCT (Tinh ALL) on 10/10/2026', () => {
    assert.equal(
        methods.buildF42ReportQuery('HUE', '2026-10-10'),
        'TuyChonGR=BT&stMaHuyenPhat=&stMaTinhPhat=53&stMaBuuCucPhat=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&stDiaBan=NULL&stPhamVi=NULL&stPhamViTinh=NULL&iFrom=10%2F10%2F2026&iTo=10%2F10%2F2026',
    );
    assert.equal(
        methods.buildF42ReportQuery('TCT', '2026-10-10'),
        'TuyChonGR=BT&stMaHuyenPhat=&stMaTinhPhat=ALL&stMaBuuCucPhat=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&stDiaBan=NULL&stPhamVi=NULL&stPhamViTinh=NULL&iFrom=10%2F10%2F2026&iTo=10%2F10%2F2026',
    );
    // MM/DD/YYYY proof: 9 October is iFrom=10/09/2026
    assert.match(methods.buildF42ReportQuery('HUE', '2026-10-09'), /iFrom=10%2F09%2F2026&iTo=10%2F09%2F2026$/);
});

test('the HUE detail query equals the observed detail request (unquoted province, YYYYMMDD, iDetailReport=1, iTotal)', () => {
    assert.equal(
        methods.buildF42HueDetailQuery('2026-10-10', 6466),
        'stMaTinhPhat=53&stMaBuuCucPhat=NULL&stMaBuuTa=NULL&iFrom=20261010&iTo=20261010&stMaDichVu=NULL&stNhomLoaiBuuGui=NULL&stLoaiDichVu=NULL&stMaLoaiBuuGui=NULL&stNhomLoaiKH=NULL&stDiaBan=NULL&stMaKHL=NULL&stKhoiLuong=NULL&name_store=sp_Phat_GBT_PTC_ChiTiet_V2&iDetailReport=1&iTotal=6466',
    );
});

test('builders reject an unsupported lane, a malformed date and a non-positive total', () => {
    assert.throws(() => methods.buildF42ReportQuery('XYZ', '2026-10-10'), /no filter profile/);
    assert.throws(() => methods.buildF42ReportQuery('HUE', '10/10/2026'), /YYYY-MM-DD/);
    assert.throws(() => methods.buildF42HueDetailQuery('2026-10-10', 0), /positive summary total/);
    assert.throws(() => methods.buildF42HueDetailQuery('2026-10-10', 'abc'), /positive summary total/);
});

test('the generated-file match of TCT can never select a HUE detail file, and vice versa; other indicators never match', () => {
    const detail = { filename: '25418_26-10-2026_11-23-08_F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_01.csv', createdAt: '2026-10-26T04:23:13Z' };
    const summary = { filename: '26-10-2026_15-09-42_F4.2_chat_luong_phat_giao_buu_ta(1).xlsx', createdAt: '2026-10-26T08:09:54Z' };
    const requestedAt = new Date('2026-10-26T00:00:00Z');
    assert.equal(selectNewestGeneratedFile([detail, summary], { requestedAt, match: F42_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), summary);
    assert.equal(selectNewestGeneratedFile([detail, summary], { requestedAt, match: F42_EXECUTOR_IDENTITIES.HUE.generatedFileMatch }), detail);
    assert.equal(selectNewestGeneratedFile([detail], { requestedAt, match: F42_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), null);
    assert.equal(selectNewestGeneratedFile([summary], { requestedAt, match: F42_EXECUTOR_IDENTITIES.HUE.generatedFileMatch }), null);
    const f12 = { filename: '26-10-2026_10-31-43_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx', createdAt: '2026-10-26T04:31:43Z' };
    const f41 = { filename: '09-10-2026_14-48-41_F4.1_chat_luong_phat_thanh_cong_cua_buu_cuc(1).xlsx', createdAt: '2026-10-26T04:31:43Z' };
    for (const other of [f12, f41]) {
        assert.equal(selectNewestGeneratedFile([other], { requestedAt, match: F42_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), null);
        assert.equal(selectNewestGeneratedFile([other], { requestedAt, match: F42_EXECUTOR_IDENTITIES.HUE.generatedFileMatch }), null);
    }
});

test('the link picker takes the exported CSV by its name link and the xlsx by the xlsx button; chunk keys group `_NN` files', () => {
    const links = ['https://dkcl.vnpost.vn/files/553015', 'https://dkcl.vnpost.vn/files/553015', 'https://dkcl.vnpost.vn/files-xlsx/553015'];
    assert.equal(methods.pickHref(links, 'csv'), 'https://dkcl.vnpost.vn/files/553015');
    assert.equal(methods.pickHref(links, 'xlsx'), 'https://dkcl.vnpost.vn/files-xlsx/553015');
    assert.equal(methods.pickHref([], 'csv'), null);
    assert.equal(methods.chunkGroupKey('25418_26-10-2026_11-23-08_F4.2_x_chi_tiet_01.csv'), methods.chunkGroupKey('25418_26-10-2026_11-23-08_F4.2_x_chi_tiet_02.csv'));
    assert.notEqual(methods.chunkGroupKey('25418_a_chi_tiet_01.csv'), methods.chunkGroupKey('25419_a_chi_tiet_01.csv'));
});

// ---------------------------------------------------------------------------------------------
// 2. HTML helpers (29 screen cells)
// ---------------------------------------------------------------------------------------------
function cells29(overrides = {}) {
    const base = Array(29).fill('');
    for (const [index, value] of Object.entries(overrides)) base[Number(index)] = String(value);
    return base;
}
function trHtml(cells, attrs = 'class="row_tong_quan"') {
    return `<tr ${attrs}>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
}
// The observed HUE grand-total row of 10/10/2026 (carries the number 1, no province, no postman)
const HUE_TOTAL_CELLS = cells29({ 0: 1, 13: 6466, 14: 5232, 15: '80.92%', 16: 4475, 17: '69.21%', 18: 757, 19: 0, 20: 207, 21: 37, 22: '15.48%', 23: 1, 24: 193, 25: 72, 26: 34, 27: 6669, 28: 169 });
const TCT_TOTAL_CELLS = cells29({ 0: 1, 13: 516597, 14: 455120, 15: '88.1%', 16: 393197, 17: '76.11%', 18: 61923, 19: 0, 20: 31503, 21: 9636, 22: '19.95%', 23: 1644, 24: 27503, 25: 29639, 26: 77203, 27: 617150, 28: 30932 });
const POSTMAN_CELLS = cells29({ 0: 2, 1: 53, 2: 'Thừa Thiên Huế', 7: '53A121', 8: 'CHÂU THÀNH DANH', 13: 72, 14: 62, 16: 51, 18: 11 });

test('outer rows keep the 29-cell rows, ignore nested tables and short rows', () => {
    const nested = '<table><tbody><tr><td>x</td><td>y</td></tr></tbody></table>';
    const html = [
        trHtml(HUE_TOTAL_CELLS),
        `<tr class="row_tong_quan"><td>2</td>${'<td>a</td>'.repeat(10)}<td>${nested}</td>${'<td>b</td>'.repeat(17)}</tr>`,
        '<tr><td>header</td><td>no number</td></tr>',
        trHtml(POSTMAN_CELLS),
    ].join('');
    const rows = methods.outerDataRows(html);
    assert.equal(rows.length, 3);
    assert.equal(rows[0][13], '6466');
    assert.equal(rows[2][7], '53A121');
});

test('totals come from the grand-total row (no province, no postman); a first row with a postman is refused', () => {
    assert.deepEqual(methods.readTotals(methods.outerDataRows(trHtml(HUE_TOTAL_CELLS))), {
        totalVolume: 6466, evaluatedVolume: 5232, passedVolume: 4475, failedVolume: 757, notEnoughInfoVolume: 169, rateText: '69.21%',
    });
    assert.deepEqual(methods.readTotals(methods.outerDataRows(trHtml(TCT_TOTAL_CELLS))), {
        totalVolume: 516597, evaluatedVolume: 455120, passedVolume: 393197, failedVolume: 61923, notEnoughInfoVolume: 30932, rateText: '76.11%',
    });
    assert.equal(methods.readTotals(methods.outerDataRows(trHtml(POSTMAN_CELLS))), null);
    assert.equal(methods.readTotals([]), null);
});

// ---------------------------------------------------------------------------------------------
// 3. portal-client methods over a fake page (no browser)
// ---------------------------------------------------------------------------------------------
function exportFormHtml(identity, total) {
    return `<form id="exportReport" action="https://dkcl.vnpost.vn/export/${identity}/all" method="GET"><input type="hidden" name="Total" value="${total}"><input type="hidden" name="FilterSelected" value="{&quot;f&quot;:1}"></form>`;
}

function createFakePage({ reportResponse, detailResponse, exportStatus = 200, fileRows = [], downloadBody = Buffer.from('X'), downloadStatus = 200 } = {}) {
    const calls = { get: [], fetch: [], goto: [] };
    const response = (status, body) => ({ status: () => status, text: async () => body, body: async () => Buffer.from(body), headers: () => ({}) });
    return {
        calls,
        url: () => 'https://dkcl.vnpost.vn/kpi/chat-luong-phat-giao-buu-ta',
        async goto(url) { calls.goto.push(url); },
        async waitForSelector() { return {}; },
        locator() { return { count: async () => 0, first: () => ({ waitFor: async () => {} }) }; },
        async waitForTimeout() {},
        async evaluate() { return fileRows; },
        request: {
            async get(url) {
                calls.get.push(url);
                if (url.includes('/files')) return { status: () => downloadStatus, body: async () => downloadBody };
                return url.includes('-chi-tiet') ? detailResponse() : reportResponse();
            },
            async fetch(url, options) {
                calls.fetch.push({ url, options });
                return response(exportStatus, '');
            },
        },
        response,
    };
}

function createClient(page) {
    const client = new DkclHueF13PortalClient({ logger: { log() {}, warn() {} } });
    client.page = page;
    client.baseUrl = 'https://dkcl.vnpost.vn';
    client.stopForSecurityChallenge = async () => {};
    client.captureF41Diagnostics = async () => null;
    return client;
}

const HUE_REPORT_BODY = JSON.stringify({ data: [trHtml(HUE_TOTAL_CELLS), trHtml(POSTMAN_CELLS)].join(''), template_paginator: '<div></div>' });
const HUE_DETAIL_BODY = JSON.stringify({ data: '<tr><td>1</td><td>EA1VN</td></tr><tr><td>2</td><td>EA2VN</td></tr>', template_paginator: exportFormHtml('sp_Phat_GBT_PTC_ChiTiet_V2', 6466) });
const respond = (status, body) => createFakePage().response(status, body);

test('HUE client flow: filters -> verified summary -> detail -> export, with the exact observed requests', async () => {
    const page = createFakePage({ reportResponse: () => respond(200, HUE_REPORT_BODY), detailResponse: () => respond(200, HUE_DETAIL_BODY) });
    const client = createClient(page);
    await client.openF42Report();
    await client.submitF42HueFilters({ businessDate: '2026-10-10' });
    const summary = await client.readF42HueOuterSummary();
    assert.deepEqual(summary, {
        outerRowCount: 2, totalVolume: 6466, evaluatedVolume: 5232, passedVolume: 4475, failedVolume: 757,
        notEnoughInfoVolume: 169, rateText: '69.21%', detailIdentity: 'sp_Phat_GBT_PTC_ChiTiet_V2',
    });
    await client.requestF42HueExport();

    assert.equal(page.calls.get[0], 'https://dkcl.vnpost.vn/kpi/chat-luong-phat-giao-buu-ta?' + methods.buildF42ReportQuery('HUE', '2026-10-10'));
    assert.equal(page.calls.get[1], 'https://dkcl.vnpost.vn/kpi/chat-luong-phat-giao-buu-ta-chi-tiet?' + methods.buildF42HueDetailQuery('2026-10-10', 6466));
    assert.equal(page.calls.fetch.length, 1);
    assert.equal(page.calls.fetch[0].url, 'https://dkcl.vnpost.vn/export/sp_Phat_GBT_PTC_ChiTiet_V2/all');
    assert.deepEqual(page.calls.fetch[0].options.params, { Total: '6466', FilterSelected: '{"f":1}' });
    assert.equal(page.calls.goto.every((url) => !url.includes('?')), true, 'the shared page is never navigated to a filtered URL');
});

test('HUE client refuses a detail export whose Total differs from the verified summary, a wrong store, a missing form and an HTTP error', async () => {
    const mismatch = JSON.stringify({ data: '<tr><td>1</td></tr>', template_paginator: exportFormHtml('sp_Phat_GBT_PTC_ChiTiet_V2', 6400) });
    let page = createFakePage({ reportResponse: () => respond(200, HUE_REPORT_BODY), detailResponse: () => respond(200, mismatch) });
    let client = createClient(page);
    await client.submitF42HueFilters({ businessDate: '2026-10-10' });
    await client.readF42HueOuterSummary();
    await assert.rejects(client.requestF42HueExport(), (error) => error.code === 'F42_DETAIL_EXPORT_TOTAL_MISMATCH');
    assert.equal(page.calls.fetch.length, 0, 'no export is fired on a mismatch');

    const withAnchor = JSON.stringify({
        data: `<tr class="tongquan_params" data-store="sp_Other" data-url="/kpi/chat-luong-phat-giao-buu-ta-chi-tiet"></tr>${JSON.parse(HUE_REPORT_BODY).data}`,
        template_paginator: '',
    });
    client = createClient(createFakePage({ reportResponse: () => respond(200, withAnchor), detailResponse: () => respond(200, HUE_DETAIL_BODY) }));
    await client.submitF42HueFilters({ businessDate: '2026-10-10' });
    await client.readF42HueOuterSummary();
    await assert.rejects(client.requestF42HueExport(), (error) => error.code === 'F42_DETAIL_IDENTITY_MISMATCH');

    client = createClient(createFakePage({
        reportResponse: () => respond(200, HUE_REPORT_BODY),
        detailResponse: () => respond(200, JSON.stringify({ data: '<tr><td>1</td></tr>', template_paginator: '<div>no form</div>' })),
    }));
    await client.submitF42HueFilters({ businessDate: '2026-10-10' });
    await client.readF42HueOuterSummary();
    await assert.rejects(client.requestF42HueExport(), (error) => error.code === 'F42_DETAIL_EXPORT_FORM_NOT_FOUND');

    client = createClient(createFakePage({ reportResponse: () => respond(500, '{}'), detailResponse: () => null }));
    await client.submitF42HueFilters({ businessDate: '2026-10-10' });
    await assert.rejects(client.readF42HueOuterSummary(), (error) => error.code === 'F42_REPORT_REQUEST_FAILED');
});

test('HUE summary without a grand-total row is refused', async () => {
    const noTotal = JSON.stringify({ data: trHtml(POSTMAN_CELLS), template_paginator: '' });
    const client = createClient(createFakePage({ reportResponse: () => respond(200, noTotal), detailResponse: () => null }));
    await client.submitF42HueFilters({ businessDate: '2026-10-10' });
    await assert.rejects(client.readF42HueOuterSummary(), (error) => error.code === 'F42_OUTER_SUMMARY_NOT_FOUND');
});

test('TCT client flow: export form is read from the summary response and fired once', async () => {
    const body = JSON.stringify({
        data: [trHtml(TCT_TOTAL_CELLS), trHtml(POSTMAN_CELLS)].join(''),
        template_paginator: exportFormHtml('sp_Phat_GBT_PTC_BuuTa_V2', 13666),
    });
    const page = createFakePage({ reportResponse: () => respond(200, body), detailResponse: () => null });
    const client = createClient(page);
    await client.submitF42TctFilters({ businessDate: '2026-10-10' });
    const summary = await client.readF42TctOuterSummary();
    assert.deepEqual(summary, {
        outerRowCount: 2, totalVolume: 516597, evaluatedVolume: 455120, passedVolume: 393197, failedVolume: 61923,
        notEnoughInfoVolume: 30932, rateText: '76.11%',
        exportIdentity: 'sp_Phat_GBT_PTC_BuuTa_V2', exportAction: '/export/sp_Phat_GBT_PTC_BuuTa_V2/all', exportTotal: 13666,
    });
    await client.requestF42TctExport();
    assert.equal(page.calls.fetch.length, 1);
    assert.equal(page.calls.fetch[0].url, 'https://dkcl.vnpost.vn/export/sp_Phat_GBT_PTC_BuuTa_V2/all');
    assert.equal(page.calls.get[0], 'https://dkcl.vnpost.vn/kpi/chat-luong-phat-giao-buu-ta?' + methods.buildF42ReportQuery('TCT', '2026-10-10'));
});

test('TCT export is refused when the summary response carried no matching export form', async () => {
    const body = JSON.stringify({ data: trHtml(TCT_TOTAL_CELLS), template_paginator: exportFormHtml('sp_Other', 13666) });
    const page = createFakePage({ reportResponse: () => respond(200, body), detailResponse: () => null });
    const client = createClient(page);
    await client.submitF42TctFilters({ businessDate: '2026-10-10' });
    const summary = await client.readF42TctOuterSummary();
    assert.equal(summary.exportIdentity, null);
    await assert.rejects(client.requestF42TctExport(), (error) => error.code === 'EXPORT_CONTROL_NOT_READY');
    assert.equal(page.calls.fetch.length, 0);
});

test('a portal timeout becomes the coded, retryable F42_PORTAL_REQUEST_TIMEOUT', async () => {
    const page = createFakePage({
        reportResponse: () => { const e = new Error('page.request.get: Timeout 240000ms exceeded.'); e.name = 'TimeoutError'; throw e; },
        detailResponse: () => null,
    });
    const client = createClient(page);
    await client.submitF42HueFilters({ businessDate: '2026-10-10' });
    await assert.rejects(client.readF42HueOuterSummary(), (error) => error.code === 'F42_PORTAL_REQUEST_TIMEOUT');
    const { DEFAULT_ERROR_MAP } = require('./src/services/importIndicatorRegistry');
    assert.equal(DEFAULT_ERROR_MAP.F42_PORTAL_REQUEST_TIMEOUT, 'TRANSIENT');
});

test('F4.2 methods are mixed in next to the F1.2 ones and use their own state fields', async () => {
    const client = createClient(createFakePage({ reportResponse: () => respond(200, HUE_REPORT_BODY), detailResponse: () => null }));
    for (const name of ['openF42Report', 'submitF42HueFilters', 'submitF42TctFilters', 'readF42HueOuterSummary', 'readF42TctOuterSummary', 'requestF42HueExport', 'requestF42TctExport', 'pollF42GeneratedFile', 'downloadF42File', 'openF12Report']) {
        assert.equal(typeof client[name], 'function', name);
    }
    client.lastF12Query = 'F12-STATE';
    await client.submitF42HueFilters({ businessDate: '2026-10-10' });
    assert.equal(client.lastF12Query, 'F12-STATE', 'F4.2 never touches F1.2 state');
    assert.equal(client.lastF42Lane, 'HUE');
});

test('opening the report with a valid session is not mistaken for an HRM login by the `Mã HRM` column header (live bug 2026-10-26)', async () => {
    const page = createFakePage({ reportResponse: () => respond(200, HUE_REPORT_BODY), detailResponse: () => null });
    const bodyOf = (text) => ({ innerText: async () => text });
    const realLocator = page.locator;
    const withBody = (text) => { page.locator = (selector) => (selector === 'body' ? bodyOf(text) : realLocator(selector)); };
    const client = new DkclHueF13PortalClient({ logger: { log() {}, warn() {} } });
    client.page = page;
    client.baseUrl = 'https://dkcl.vnpost.vn';
    client.captureLoginDiagnostics = async () => {};

    withBody('CHẤT LƯỢNG PHÁT GIAO BƯU TÁ Mã bưu tá Tên bưu tá Mã HRM Chức danh');
    await client.openF42Report(); // must not throw

    withBody('Nhập mã xác thực captcha để tiếp tục');
    await assert.rejects(client.openF42Report(), (error) => error.code === 'AUTHENTICATION_REQUIRED');
    withBody('Đăng nhập SSO');
    await assert.rejects(client.openF42Report(), (error) => error.code === 'AUTHENTICATION_REQUIRED');
});

test('generated-file poll: the HUE CSV by its name link, the TCT xlsx by the button, a chunked export refused, a stale file ignored', async () => {
    const row = (filename, id, time) => ({
        filename,
        createdAtText: time,
        links: [`/files/${id}`, `/files/${id}`, `/files-xlsx/${id}`],
    });
    const detailName = '25418_26-10-2026_11-23-08_F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_01.csv';
    const summaryName = '26-10-2026_15-09-42_F4.2_chat_luong_phat_giao_buu_ta(1).xlsx';
    const rows = [row(summaryName, 553110, '26/10/2026 - 15:09:54'), row(detailName, 553015, '26/10/2026 - 11:23:13')];
    const before = new Date('2026-10-26T00:00:00+07:00');
    const poll = (fileRows, extra) => createClient(createFakePage({ fileRows })).pollF42GeneratedFile({ requestedAt: before, timeoutMs: 50, intervalMs: 1, ...extra });

    const hue = await poll(rows, { match: F42_EXECUTOR_IDENTITIES.HUE.generatedFileMatch, format: 'csv' });
    assert.deepEqual([hue.filename, hue.href, hue.format], [detailName, '/files/553015', 'csv']);
    const tct = await poll(rows, { match: F42_EXECUTOR_IDENTITIES.TCT.generatedFileMatch, format: 'xlsx' });
    assert.deepEqual([tct.filename, tct.href], [summaryName, '/files-xlsx/553110']);

    const chunked = [...rows, row(detailName.replace('_01.csv', '_02.csv'), 553016, '26/10/2026 - 11:23:14')];
    await assert.rejects(poll(chunked, { match: F42_EXECUTOR_IDENTITIES.HUE.generatedFileMatch, format: 'csv' }), (error) => error.code === 'F42_EXPORT_CHUNKED');

    const stale = await createClient(createFakePage({ fileRows: rows })).pollF42GeneratedFile({
        requestedAt: new Date('2026-10-26T16:00:00+07:00'), timeoutMs: 20, intervalMs: 1, match: F42_EXECUTOR_IDENTITIES.HUE.generatedFileMatch, format: 'csv',
    });
    assert.equal(stale, null, 'a file older than the request is never taken');
});

test('download saves the body under the portal file name and refuses an HTTP error or an empty body', async () => {
    const targetDir = path.join(sandbox, 'dl');
    const ok = createClient(createFakePage({ downloadBody: Buffer.from('a,b\n1,2\n') }));
    const saved = await ok.downloadF42File({ file: { filename: 'x_chi_tiet_01.csv', href: '/files/1' }, targetDir });
    assert.equal(fs.readFileSync(saved, 'utf8'), 'a,b\n1,2\n');
    await assert.rejects(createClient(createFakePage({ downloadStatus: 500 })).downloadF42File({ file: { filename: 'y.csv', href: '/files/1' }, targetDir }), (error) => error.code === 'F42_DOWNLOAD_FAILED');
    await assert.rejects(createClient(createFakePage({ downloadBody: Buffer.alloc(0) })).downloadF42File({ file: { filename: 'z.csv', href: '/files/1' }, targetDir }), (error) => error.code === 'F42_DOWNLOAD_EMPTY');
});

// ---------------------------------------------------------------------------------------------
// 4. one-date services over a fake client
// ---------------------------------------------------------------------------------------------
function createServiceClient({ source, summary, generatedName, format }) {
    const calls = [];
    return {
        calls,
        async openF42Report() { calls.push('open'); },
        async submitF42HueFilters({ businessDate }) { calls.push(`filters:${businessDate}`); },
        async submitF42TctFilters({ businessDate }) { calls.push(`filters:${businessDate}`); },
        async readF42HueOuterSummary() { calls.push('summary'); return summary; },
        async readF42TctOuterSummary() { calls.push('summary'); return summary; },
        async requestF42HueExport() { calls.push('export'); },
        async requestF42TctExport() { calls.push('export'); },
        async pollF42GeneratedFile({ match, format: wanted }) { calls.push(`poll:${match}:${wanted}`); return { filename: generatedName, href: `/files/1`, format }; },
        async downloadF42File({ file, targetDir }) {
            calls.push('download');
            const target = path.join(targetDir, file.filename);
            fs.copyFileSync(source, target);
            return target;
        },
        async deleteGeneratedFile() { calls.push('cleanup'); return { status: 'DELETED' }; },
    };
}

const HUE_SUMMARY = {
    outerRowCount: 100, totalVolume: 6466, evaluatedVolume: 5232, passedVolume: 4475, failedVolume: 757,
    notEnoughInfoVolume: 169, rateText: '69.21%', detailIdentity: 'sp_Phat_GBT_PTC_ChiTiet_V2',
};
const TCT_SUMMARY = {
    outerRowCount: 100, totalVolume: 516597, evaluatedVolume: 455120, passedVolume: 393197, failedVolume: 61923,
    notEnoughInfoVolume: 30932, rateText: '76.11%',
    exportIdentity: 'sp_Phat_GBT_PTC_BuuTa_V2', exportAction: '/export/sp_Phat_GBT_PTC_BuuTa_V2/all', exportTotal: 13666,
};

function newService(Class, extra = {}) {
    const imports = [];
    const service = new Class({
        rawDownloadDir: path.join(sandbox, `raw-${Class.name}-${Math.random().toString(16).slice(2)}`),
        generationPollingIntervalMs: 1,
        executeImport: async (args) => { imports.push(args); return { success: true, total: 1, inserted: 1, processedPath: 'X' }; },
        logger: { warn() {}, log() {} },
        ...extra,
    });
    return { service, imports };
}

const HAS_HUE = { skip: fs.existsSync(REAL_HUE) ? false : 'PO file not present' };
const HAS_TCT = { skip: fs.existsSync(REAL_TCT) ? false : 'PO file not present' };
const HUE_NAME = '25418_26-10-2026_11-23-08_F4.2_chat_luong_phat_giao_buu_ta_chi_tiet_01.csv';
const TCT_NAME = '26-10-2026_15-09-42_F4.2_chat_luong_phat_giao_buu_ta(1).xlsx';

test('HUE service on the real 2026-10-10 CSV: reconciles, copies to Incoming/HUE as .csv, imports as F4.2/HUE, cleans up', HAS_HUE, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: HUE_SUMMARY, generatedName: HUE_NAME, format: 'csv' });
    const { service, imports } = newService(F42HueSingleDateService);
    const result = await service.runOneDate('2026-10-10', { portalClient: client });
    assert.equal(result.status, 'SUCCESS');
    assert.deepEqual(
        { total: result.total, passed: result.passed, failed: result.failed, blank: result.blank, rate: result.rate },
        { total: 6466, passed: 4475, failed: 757, blank: 1234, rate: 69.21 },
    );
    assert.deepEqual(client.calls, ['open', 'filters:2026-10-10', 'summary', 'export', `poll:${F42_EXECUTOR_IDENTITIES.HUE.generatedFileMatch}:csv`, 'download', 'cleanup']);
    assert.equal(imports.length, 1);
    assert.deepEqual(
        { indicator: imports[0].indicator, lane: imports[0].lane, force: imports[0].forceReimport, source: imports[0].source },
        { indicator: 'F4.2', lane: 'HUE', force: false, source: 'AUTO_BACKFILL_F42_HUE' },
    );
    assert.equal(path.basename(imports[0].filePath), 'F4.2-2026.10.10.csv');
    assert.ok(imports[0].filePath.includes(path.join('F4.2', 'Incoming', 'HUE')));
    assert.equal(result.cleanup.status, 'DELETED');
    fs.rmSync(imports[0].filePath, { force: true });
});

test('HUE service accepts a file with exactly one "Đạt" fewer than the portal summary and records the difference (PO 2026-10-27)', HAS_HUE, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: { ...HUE_SUMMARY, passedVolume: 4476 }, generatedName: HUE_NAME, format: 'csv' });
    const { service, imports } = newService(F42HueSingleDateService);
    const result = await service.runOneDate('2026-10-10', { portalClient: client });
    assert.equal(result.status, 'SUCCESS');
    assert.deepEqual([result.total, result.passed, result.failed], [6466, 4475, 757]);
    assert.deepEqual(result.reconciliation, { exact: false, differences: { passed: -1 } });
    assert.equal(imports.length, 1);
    fs.rmSync(imports[0].filePath, { force: true });
});

test('HUE service refuses a file that does not reconcile beyond the accepted one-row shortfall (no Incoming copy, no import, no cleanup)', HAS_HUE, async () => {
    for (const bad of [{ passedVolume: 4474 }, { passedVolume: 4477 }, { failedVolume: 758 }, { totalVolume: 6467 }]) {
        const client = createServiceClient({ source: REAL_HUE, summary: { ...HUE_SUMMARY, ...bad }, generatedName: HUE_NAME, format: 'csv' });
        const { service, imports } = newService(F42HueSingleDateService);
        await assert.rejects(
            service.runOneDate('2026-10-10', { portalClient: client }),
            (error) => error.code === 'F42_HUE_RECONCILIATION_FAILED' && Object.keys(error.details.differences).length === 1,
        );
        assert.equal(imports.length, 0);
        assert.equal(client.calls.includes('cleanup'), false);
    }
});

test('HUE dry run (supervised probe) reconciles but copies nothing and imports nothing', HAS_HUE, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: HUE_SUMMARY, generatedName: HUE_NAME, format: 'csv' });
    const { service, imports } = newService(F42HueSingleDateService, { importEnabled: false });
    const result = await service.runOneDate('2026-10-10', { portalClient: client });
    assert.equal(result.dryRun, true);
    assert.equal(imports.length, 0);
    assert.equal(client.calls.includes('cleanup'), false);
});

test('HUE service refuses a file whose GBT day is not the requested day (file-name rule)', HAS_HUE, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: HUE_SUMMARY, generatedName: HUE_NAME, format: 'csv' });
    const { service, imports } = newService(F42HueSingleDateService);
    await assert.rejects(service.runOneDate('2026-10-09', { portalClient: client }), /does not match the data/);
    assert.equal(imports.length, 0);
});

test('HUE service on a synthetic CSV reconciles with a matching summary and refuses a summary of other figures', async () => {
    const dir = fs.mkdtempSync(path.join(sandbox, 'syn-'));
    const source = path.join(dir, 'x.csv');
    fs.writeFileSync(source, hueCsvBuffer());
    const summary = { ...HUE_SUMMARY, totalVolume: 4, evaluatedVolume: 3, passedVolume: 2, failedVolume: 1 };
    const ok = createServiceClient({ source, summary, generatedName: HUE_NAME, format: 'csv' });
    const { service } = newService(F42HueSingleDateService, { importEnabled: false });
    const result = await service.runOneDate('2026-10-10', { portalClient: ok });
    assert.deepEqual([result.total, result.passed, result.failed, result.blank], [4, 2, 1, 1]);
    const bad = createServiceClient({ source, summary: { ...summary, passedVolume: 4, evaluatedVolume: 4 }, generatedName: HUE_NAME, format: 'csv' });
    await assert.rejects(newService(F42HueSingleDateService, { importEnabled: false }).service.runOneDate('2026-10-10', { portalClient: bad }), (error) => error.code === 'F42_HUE_RECONCILIATION_FAILED');
});

test('TCT service on the real national workbook reconciles with the portal summary and imports as F4.2/TCT (.xlsx)', HAS_TCT, async () => {
    const client = createServiceClient({ source: REAL_TCT, summary: TCT_SUMMARY, generatedName: TCT_NAME, format: 'xlsx' });
    const { service, imports } = newService(F42TctSingleDateService);
    const result = await service.runOneDate('2026-10-10', { portalClient: client });
    assert.deepEqual(
        { rows: result.rows, postmanRows: result.postmanRows, total: result.total, passed: result.passed, exportTotal: result.exportTotal },
        { rows: 34, postmanRows: 13665, total: 516597, passed: 393197, exportTotal: 13666 },
    );
    assert.deepEqual(client.calls, ['open', 'filters:2026-10-10', 'summary', 'export', `poll:${F42_EXECUTOR_IDENTITIES.TCT.generatedFileMatch}:xlsx`, 'download', 'cleanup']);
    assert.deepEqual(
        { indicator: imports[0].indicator, lane: imports[0].lane, source: imports[0].source },
        { indicator: 'F4.2', lane: 'TCT', source: 'AUTO_BACKFILL_F42_TCT' },
    );
    assert.equal(path.basename(imports[0].filePath), 'F4.2-2026.10.10.xlsx');
    fs.rmSync(imports[0].filePath, { force: true });
});

test('TCT service refuses a workbook whose grand total differs from the summary', HAS_TCT, async () => {
    for (const bad of [{ totalVolume: 516598 }, { passedVolume: 393196 }]) {
        const client = createServiceClient({ source: REAL_TCT, summary: { ...TCT_SUMMARY, ...bad }, generatedName: TCT_NAME, format: 'xlsx' });
        const { service, imports } = newService(F42TctSingleDateService);
        await assert.rejects(service.runOneDate('2026-10-10', { portalClient: client }), (error) => error.code === 'F42_TCT_RECONCILIATION_FAILED');
        assert.equal(imports.length, 0);
    }
});

test('TCT service on a synthetic workbook with the 34 provinces and one outside row reconciles', async () => {
    const dir = fs.mkdtempSync(path.join(sandbox, 'syn-'));
    const source = path.join(dir, 'x.xlsx');
    fs.writeFileSync(source, tctBuffer(tctPopulation({}, [{ code: '01', postman: 'EMS1', gbt: 100, ok: 90 }])));
    const total = 34 * 1000 + 100;
    const passed = 34 * 800 + 90;
    const summary = { ...TCT_SUMMARY, totalVolume: total, passedVolume: passed, evaluatedVolume: total, failedVolume: 0 };
    const client = createServiceClient({ source, summary, generatedName: TCT_NAME, format: 'xlsx' });
    const result = await newService(F42TctSingleDateService, { importEnabled: false }).service.runOneDate('2026-10-10', { portalClient: client });
    assert.deepEqual([result.total, result.passed, result.rows], [total, passed, 34]);
});

test('services refuse an incomplete or inconsistent outer summary and a client without the F4.2 methods', async () => {
    const { service } = newService(F42HueSingleDateService, { importEnabled: false });
    for (const bad of [{ totalVolume: 0 }, { passedVolume: 5233 }, { detailIdentity: 'sp_Other' }, { failedVolume: -1 }]) {
        const client = createServiceClient({ source: REAL_HUE, summary: { ...HUE_SUMMARY, ...bad }, generatedName: HUE_NAME, format: 'csv' });
        await assert.rejects(service.runOneDate('2026-10-10', { portalClient: client }), (error) => error.code === 'F42_HUE_OUTER_SUMMARY_INVALID');
        assert.equal(client.calls.includes('export'), false, 'nothing is exported on a rejected summary');
    }
    await assert.rejects(service.runOneDate('2026-10-10', { portalClient: {} }), (error) => error.code === 'F42_HUE_PORTAL_CLIENT_INCOMPLETE');
    await assert.rejects(service.runOneDate('10/10/2026', { portalClient: {} }), (error) => error.code === 'INVALID_DATE');
    assert.equal(standardizedFilename('2026-10-10', 'HUE'), 'F4.2-2026.10.10.csv');
    assert.equal(standardizedFilename('2026-10-10', 'TCT'), 'F4.2-2026.10.10.xlsx');
});

// ---------------------------------------------------------------------------------------------
// 5. executors
// ---------------------------------------------------------------------------------------------
function fakePreflight({ status = 'SESSION_VALID', client = {}, entry = {} } = {}) {
    const state = { locked: [], entry: { ...entry } };
    return {
        state,
        async preflight() { return { status, error: { message: 'x' } }; },
        async withSourceLock(source, run) { state.locked.push(source); return run(); },
        getRegistryState() { return state.entry; },
        getInteractiveClient() { return client; },
    };
}

test('executor accepts exactly F4.2 / its lane / a date, holds the source lock and marks the operation', async () => {
    const seen = [];
    const preflight = fakePreflight({ client: { id: 'client' } });
    const adapter = { async runOneDate(date, context) { seen.push({ date, active: preflight.state.entry.activeOperation, refresh: context.refreshRequested }); return { ok: true }; } };
    const executor = new F42AutoBackfillExecutor({ identity: F42_EXECUTOR_IDENTITIES.HUE, adapter, sessionPreflightService: preflight });
    assert.deepEqual(await executor.execute({ indicator: 'F4.2', sourceLane: 'HUE', businessDate: '2026-10-10', forceReimport: true }), { ok: true });
    assert.deepEqual(seen, [{ date: '2026-10-10', active: 'AUTO_BACKFILL_F42_HUE', refresh: true }]);
    assert.equal(preflight.state.entry.activeOperation, null);
    assert.deepEqual(preflight.state.locked, ['HUE']);
    for (const request of [
        { indicator: 'F1.2', sourceLane: 'HUE', businessDate: '2026-10-10' },
        { indicator: 'F4.2', sourceLane: 'TCT', businessDate: '2026-10-10' },
        { indicator: 'F4.2', sourceLane: 'HUE', businessDate: '10/10/2026' },
    ]) {
        await assert.rejects(executor.execute(request), (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH');
    }
});

test('executor refuses an expired session and a source already owned by another operation', async () => {
    const adapter = { async runOneDate() { throw new Error('must not run'); } };
    const expired = new F42AutoBackfillExecutor({ identity: F42_EXECUTOR_IDENTITIES.TCT, adapter, sessionPreflightService: fakePreflight({ status: 'AUTH_REQUIRED' }) });
    await assert.rejects(expired.execute({ indicator: 'F4.2', sourceLane: 'TCT', businessDate: '2026-10-10' }), (error) => error.code === 'AUTHENTICATION_REQUIRED');
    const busy = new F42AutoBackfillExecutor({ identity: F42_EXECUTOR_IDENTITIES.TCT, adapter, sessionPreflightService: fakePreflight({ client: {}, entry: { activeOperation: 'OTHER' } }) });
    await assert.rejects(busy.execute({ indicator: 'F4.2', sourceLane: 'TCT', businessDate: '2026-10-10' }), (error) => error.code === 'DKCL_SOURCE_OPERATION_ACTIVE');
});

test('the queue waits 5 minutes for an F4.2 export, the plain service keeps its 15-minute default', () => {
    const executors = createF42AutoBackfillExecutors({ sessionPreflightService: fakePreflight() });
    assert.equal(F42_BACKFILL_EXPORT_TIMEOUT_MS, 300000);
    for (const lane of ['HUE', 'TCT']) {
        assert.equal(executors[lane].adapter.service.config.generationTimeoutMs, 300000);
    }
    const custom = createF42AutoBackfillExecutors({ sessionPreflightService: fakePreflight(), serviceOptions: { generationTimeoutMs: 1000 } });
    assert.equal(custom.TCT.adapter.service.config.generationTimeoutMs, 1000);
    assert.equal(new F42TctSingleDateService().config.generationTimeoutMs, 900000);
});

test('the executor factory builds one executor per lane with the F4.2 identities', () => {
    const executors = createF42AutoBackfillExecutors({ sessionPreflightService: fakePreflight() });
    assert.equal(executors.HUE.identity.id, 'DKCL_F42_HUE_SINGLE_DATE_V1');
    assert.equal(executors.TCT.identity.id, 'DKCL_F42_TCT_SINGLE_DATE_V1');
    assert.equal(new F42HueAdapter({ service: { runOneDate() {} } }) instanceof F42HueAdapter, true);
    assert.throws(() => new F42HueAdapter({ service: {} }), /runOneDate/);
});
