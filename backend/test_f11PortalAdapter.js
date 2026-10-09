'use strict';

// F11-PHASE-3 - F1.1 Portal adapter tests: request builders against the observed requests, the HTML
// helpers, the portal-client methods over a fake page, the one-date services over a fake client (and
// the PO's real files as the known answer) and the executors. No browser, no portal, no live database.
// Run per file: node --test --experimental-sqlite test_f11PortalAdapter.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f11-portal-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F11 = path.join(sandbox, 'F1.1');

const { db } = require('./src/config/db');
const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const methods = require('./src/services/f11PortalClientMethods');
const { F11_EXECUTOR_IDENTITIES } = require('./src/services/autoBackfillF11Contract');
const { F11HueSingleDateService, F11TctSingleDateService, F11HueAdapter, standardizedFilename } = require('./src/services/f11SingleDateServices');
const { F11AutoBackfillExecutor, createF11AutoBackfillExecutors } = require('./src/services/autoBackfillF11Executors');
const { selectNewestGeneratedFile } = require('./src/services/dkclHueF13SyncService');
const { buildTctWorkbookBuffer, defaultSpecs } = require('./test/f11TctFixture');

const REAL_HUE = path.resolve(__dirname, '../Data DKCL/F1.1-2026.10.07.xlsx');
const REAL_TCT = path.resolve(__dirname, '../Data DKCL/F1.1/Processed/TCT/F1.1-2026.10.07.xlsx');

test.after(async () => {
    await new Promise((resolve) => db.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// 1. requests equal the ones observed on the real portal (Manifest Section 12)
// ---------------------------------------------------------------------------------------------
test('report queries equal the requests observed for HUE (BC/53) and TCT (TINH/ALL) on 07/10/2026', () => {
    assert.equal(
        methods.buildF11ReportQuery('HUE', '2026-10-07'),
        'TuyChonGR=BC&stMaTinhChapNhan=53&stMaBuuCucNhan=NULL&stMaTinhPhat=53&stMaBCKTTinhChapNhan=NULL&stMaBCKTTinhPhat=NULL&stMaLoaiBCKT=NULL&stMaBuuCucPhat=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&iFrom=10%2F07%2F2026&iTo=10%2F07%2F2026',
    );
    assert.equal(
        methods.buildF11ReportQuery('TCT', '2026-10-07'),
        'TuyChonGR=TINH&stMaTinhChapNhan=ALL&stMaBuuCucNhan=NULL&stMaTinhPhat=ALL&stMaBCKTTinhChapNhan=NULL&stMaBCKTTinhPhat=NULL&stMaLoaiBCKT=NULL&stMaBuuCucPhat=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&iFrom=10%2F07%2F2026&iTo=10%2F07%2F2026',
    );
});

test('the HUE detail query equals the observed detail request (YYYYMMDD dates, store, iTotal)', () => {
    assert.equal(
        methods.buildF11HueDetailQuery('2026-10-07', 2621),
        'stMaTinhPhat=53&stMaBuuCucPhat=NULL&stMaTinhChapNhan=53&stMaBuuCucNhan=NULL&stMaBCKTTinhPhat=NULL&stMaLoaiBCKT=NULL&stMaBCKTTinhChapNhan=NULL&iFrom=20261007&iTo=20261007&stMaDichVu=NULL&stNhomLoaiBuuGui=NULL&stLoaiDichVu=NULL&stMaLoaiBuuGui=NULL&stNhomLoaiKH=NULL&stMaKHL=NULL&stPhuongTien=NULL&stKhoiLuong=NULL&name_store=sp_TT_NoiTinh_ChiTiet&iDetailReport=1&iTotal=2621',
    );
});

test('builders reject an unsupported lane, a malformed date and a non-positive total', () => {
    assert.throws(() => methods.buildF11ReportQuery('XYZ', '2026-10-07'), /no filter profile/);
    assert.throws(() => methods.buildF11ReportQuery('HUE', '07/10/2026'), /YYYY-MM-DD/);
    assert.throws(() => methods.buildF11HueDetailQuery('2026-10-07', 0), /positive summary total/);
    assert.throws(() => methods.buildF11HueDetailQuery('2026-10-07', 'abc'), /positive summary total/);
});

test('the generated-file match for TCT can never select a HUE detail file, and vice versa', () => {
    const detail = { filename: '09-10-2026_23-22-07_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_chi_tiet(1).xlsx', createdAt: '2026-10-09T16:22:11Z' };
    const summary = { filename: '09-10-2026_23-18-43_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1).xlsx', createdAt: '2026-10-09T16:18:43Z' };
    const requestedAt = new Date('2026-10-09T16:00:00Z');
    assert.equal(selectNewestGeneratedFile([detail, summary], { requestedAt, match: F11_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), summary);
    assert.equal(selectNewestGeneratedFile([detail, summary], { requestedAt, match: F11_EXECUTOR_IDENTITIES.HUE.generatedFileMatch }), detail);
    assert.equal(selectNewestGeneratedFile([detail], { requestedAt, match: F11_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), null);
    assert.equal(selectNewestGeneratedFile([summary], { requestedAt, match: F11_EXECUTOR_IDENTITIES.HUE.generatedFileMatch }), null);
    // F4.1 files never match either
    const f41 = { filename: '09-10-2026_14-48-41_F4.1_chat_luong_phat_thanh_cong_cua_buu_cuc(1).xlsx', createdAt: '2026-10-09T16:30:00Z' };
    assert.equal(selectNewestGeneratedFile([f41], { requestedAt, match: F11_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), null);
});

// ---------------------------------------------------------------------------------------------
// 2. HTML helpers
// ---------------------------------------------------------------------------------------------
function cells29(overrides = {}) {
    const base = Array(29).fill('');
    for (const [index, value] of Object.entries(overrides)) base[Number(index)] = String(value);
    return base;
}
function trHtml(cells, attrs = 'class="row_tong_quan"') {
    return `<tr ${attrs}>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
}
const TOTAL_CELLS = cells29({ 0: 1, 11: '2,621', 12: 2589, 13: 2571, 14: 2400, 16: 171, 17: 10, 18: 2588, 19: 2348, 20: '90.73%', 21: 240 });

test('outer rows ignore rows of a nested table and rows too short to be data rows', () => {
    const nested = '<table><tbody><tr><td>x</td><td>y</td></tr></tbody></table>';
    const html = [
        trHtml(TOTAL_CELLS),
        `<tr class="row_tong_quan"><td>2</td>${'<td>a</td>'.repeat(10)}<td>${nested}</td>${'<td>b</td>'.repeat(17)}</tr>`,
        '<tr><td>header</td><td>no number</td></tr>',
        trHtml(cells29({ 0: 3, 1: 53, 5: 53, 7: 533140, 11: 38 })),
    ].join('');
    const rows = methods.outerDataRows(html);
    assert.equal(rows.length, 3);
    assert.equal(rows[0][11], '2,621');
    assert.equal(rows[1].length, 29);
    assert.equal(rows[2][7], '533140');
});

test('totals come from the grand-total row (no province codes); a first row with codes is refused', () => {
    const totals = methods.readTotals(methods.outerDataRows(trHtml(TOTAL_CELLS)));
    assert.deepEqual(totals, { totalVolume: 2621, ptcVolume: 2589, evaluatedVolume: 2588, passedVolume: 2348, failedVolume: 240, rateText: '90.73%' });
    assert.equal(methods.readTotals(methods.outerDataRows(trHtml(cells29({ 0: 1, 1: 53, 5: 53, 11: 5 })))), null);
    assert.equal(methods.readTotals([]), null);
});

test('export forms are read with their method and every hidden input, entities decoded', () => {
    const html = '<div><form id="x" action="/logout" method="post"><input type="hidden" name="a" value="1"></form>'
        + '<form id="exportReport" action="https://dkcl.vnpost.vn/export/sp_TT_NoiTinh_Tinh/all" method="GET">'
        + '<input type="hidden" name="Total" value="85"><input type="hidden" name="FilterSelected" value="{&quot;iFrom&quot;:&quot;2026-10-07&quot;}">'
        + '<button type="submit">Xuất toàn bộ</button></form></div>';
    const forms = methods.parseExportForms(html);
    assert.equal(forms.length, 2);
    assert.deepEqual(forms[1], { action: 'https://dkcl.vnpost.vn/export/sp_TT_NoiTinh_Tinh/all', method: 'GET', params: { Total: '85', FilterSelected: '{"iFrom":"2026-10-07"}' } });
});

// ---------------------------------------------------------------------------------------------
// 3. portal-client methods over a fake page (no browser)
// ---------------------------------------------------------------------------------------------
function exportFormHtml(identity, total) {
    return `<form id="exportReport" action="https://dkcl.vnpost.vn/export/${identity}/all" method="GET"><input type="hidden" name="Total" value="${total}"><input type="hidden" name="FilterSelected" value="{&quot;f&quot;:1}"></form>`;
}

function createFakePage({ reportResponse, detailResponse, exportStatus = 200 } = {}) {
    const calls = { get: [], fetch: [], goto: [] };
    const response = (status, body) => ({ status: () => status, text: async () => body, headers: () => ({}) });
    return {
        calls,
        url: () => 'https://dkcl.vnpost.vn/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh',
        async goto(url) { calls.goto.push(url); },
        async waitForSelector() { return {}; },
        locator() { return { count: async () => 0 }; },
        async waitForTimeout() {},
        request: {
            async get(url) {
                calls.get.push(url);
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

const HUE_REPORT_BODY = JSON.stringify({
    data: [trHtml(TOTAL_CELLS), trHtml(cells29({ 0: 2, 1: 53, 3: 530000, 5: 53, 7: 533140, 11: 38, 18: 38, 19: 38 }))].join(''),
    template_paginator: '<div></div>',
});
const HUE_DETAIL_BODY = JSON.stringify({ data: '<tr><td>1</td><td>CB533608058VN</td></tr><tr><td>2</td><td>CC1VN</td></tr>', template_paginator: exportFormHtml('sp_TT_NoiTinh_ChiTiet', 2621) });

test('HUE client flow: filters -> verified summary -> detail -> export, with the exact observed requests', async () => {
    const page = createFakePage({
        reportResponse: () => createFakePage().response(200, HUE_REPORT_BODY),
        detailResponse: () => createFakePage().response(200, HUE_DETAIL_BODY),
    });
    const client = createClient(page);
    await client.openF11Report();
    await client.submitF11HueFilters({ businessDate: '2026-10-07' });
    const summary = await client.readF11HueOuterSummary();
    assert.deepEqual(summary, { outerRowCount: 2, totalVolume: 2621, ptcVolume: 2589, evaluatedVolume: 2588, passedVolume: 2348, failedVolume: 240, rateText: '90.73%', detailIdentity: 'sp_TT_NoiTinh_ChiTiet' });
    await client.requestF11HueExport();

    assert.equal(page.calls.get[0], 'https://dkcl.vnpost.vn/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh?' + methods.buildF11ReportQuery('HUE', '2026-10-07'));
    assert.equal(page.calls.get[1], 'https://dkcl.vnpost.vn/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh-chi-tiet?' + methods.buildF11HueDetailQuery('2026-10-07', 2621));
    assert.equal(page.calls.fetch.length, 1);
    assert.equal(page.calls.fetch[0].url, 'https://dkcl.vnpost.vn/export/sp_TT_NoiTinh_ChiTiet/all');
    assert.deepEqual(page.calls.fetch[0].options.params, { Total: '2621', FilterSelected: '{"f":1}' });
    assert.equal(page.calls.fetch[0].options.method, 'GET');
    assert.equal(page.calls.goto.every((url) => !url.includes('?')), true, 'the shared page is never navigated to a filtered URL');
});

test('HUE client refuses a detail export whose Total differs from the verified summary', async () => {
    const mismatch = JSON.stringify({ data: '<tr><td>1</td></tr>', template_paginator: exportFormHtml('sp_TT_NoiTinh_ChiTiet', 2000) });
    const page = createFakePage({
        reportResponse: () => createFakePage().response(200, HUE_REPORT_BODY),
        detailResponse: () => createFakePage().response(200, mismatch),
    });
    const client = createClient(page);
    await client.submitF11HueFilters({ businessDate: '2026-10-07' });
    await client.readF11HueOuterSummary();
    await assert.rejects(client.requestF11HueExport(), (error) => error.code === 'F11_DETAIL_EXPORT_TOTAL_MISMATCH');
    assert.equal(page.calls.fetch.length, 0, 'no export is fired on a mismatch');
});

test('HUE client refuses a wrong detail store, a missing export form and an HTTP error', async () => {
    const wrongStore = HUE_REPORT_BODY.replace('"template_paginator":"<div></div>"', '"template_paginator":"<div></div>"');
    const withAnchor = JSON.stringify({ data: `<tr class="tongquan_params" data-store="sp_Other" data-url="/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh-chi-tiet"></tr>${JSON.parse(HUE_REPORT_BODY).data}`, template_paginator: '' });
    let client = createClient(createFakePage({ reportResponse: () => createFakePage().response(200, withAnchor), detailResponse: () => createFakePage().response(200, HUE_DETAIL_BODY) }));
    await client.submitF11HueFilters({ businessDate: '2026-10-07' });
    await client.readF11HueOuterSummary();
    await assert.rejects(client.requestF11HueExport(), (error) => error.code === 'F11_DETAIL_IDENTITY_MISMATCH');

    client = createClient(createFakePage({ reportResponse: () => createFakePage().response(200, wrongStore), detailResponse: () => createFakePage().response(200, JSON.stringify({ data: '<tr><td>1</td></tr>', template_paginator: '<div>no form</div>' })) }));
    await client.submitF11HueFilters({ businessDate: '2026-10-07' });
    await client.readF11HueOuterSummary();
    await assert.rejects(client.requestF11HueExport(), (error) => error.code === 'F11_DETAIL_EXPORT_FORM_NOT_FOUND');

    client = createClient(createFakePage({ reportResponse: () => createFakePage().response(500, '{}'), detailResponse: () => null }));
    await client.submitF11HueFilters({ businessDate: '2026-10-07' });
    await assert.rejects(client.readF11HueOuterSummary(), (error) => error.code === 'F11_REPORT_REQUEST_FAILED');
});

test('HUE summary without a grand-total row is refused', async () => {
    const noTotal = JSON.stringify({ data: trHtml(cells29({ 0: 2, 1: 53, 5: 53, 11: 5 })), template_paginator: '' });
    const client = createClient(createFakePage({ reportResponse: () => createFakePage().response(200, noTotal), detailResponse: () => null }));
    await client.submitF11HueFilters({ businessDate: '2026-10-07' });
    await assert.rejects(client.readF11HueOuterSummary(), (error) => error.code === 'F11_OUTER_SUMMARY_NOT_FOUND');
});

test('TCT client flow: export form is read from the summary response and fired once', async () => {
    const body = JSON.stringify({
        data: [trHtml(cells29({ 0: 1, 11: 187593, 12: 182036, 18: 181427, 19: 149629, 21: 31451, 20: '82.47%' })), trHtml(cells29({ 0: 2, 1: '01', 5: 10, 11: 2712 }))].join(''),
        template_paginator: exportFormHtml('sp_TT_NoiTinh_Tinh', 85),
    });
    const page = createFakePage({ reportResponse: () => createFakePage().response(200, body), detailResponse: () => null });
    const client = createClient(page);
    await client.submitF11TctFilters({ businessDate: '2026-10-07' });
    const summary = await client.readF11TctOuterSummary();
    assert.deepEqual(summary, { outerRowCount: 2, totalVolume: 187593, ptcVolume: 182036, evaluatedVolume: 181427, passedVolume: 149629, failedVolume: 31451, rateText: '82.47%', exportIdentity: 'sp_TT_NoiTinh_Tinh', exportAction: '/export/sp_TT_NoiTinh_Tinh/all', exportTotal: 85 });
    await client.requestF11TctExport();
    assert.equal(page.calls.fetch.length, 1);
    assert.equal(page.calls.fetch[0].url, 'https://dkcl.vnpost.vn/export/sp_TT_NoiTinh_Tinh/all');
    assert.equal(page.calls.get[0], 'https://dkcl.vnpost.vn/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh?' + methods.buildF11ReportQuery('TCT', '2026-10-07'));
});

test('a portal timeout becomes the coded, retryable F11_PORTAL_REQUEST_TIMEOUT', async () => {
    const page = createFakePage({ reportResponse: () => { const e = new Error('page.request.get: Timeout 120000ms exceeded.'); e.name = 'TimeoutError'; throw e; }, detailResponse: () => null });
    const client = createClient(page);
    await client.submitF11HueFilters({ businessDate: '2026-10-07' });
    await assert.rejects(client.readF11HueOuterSummary(), (error) => error.code === 'F11_PORTAL_REQUEST_TIMEOUT');
    const { DEFAULT_ERROR_MAP } = require('./src/services/importIndicatorRegistry');
    assert.equal(DEFAULT_ERROR_MAP.F11_PORTAL_REQUEST_TIMEOUT, 'TRANSIENT');
});

// ---------------------------------------------------------------------------------------------
// 4. one-date services over a fake client
// ---------------------------------------------------------------------------------------------
function createServiceClient({ lane, source, summary, generatedName }) {
    const calls = [];
    return {
        calls,
        async openF11Report() { calls.push('open'); },
        async submitF11HueFilters({ businessDate }) { calls.push(`filters:${businessDate}`); },
        async submitF11TctFilters({ businessDate }) { calls.push(`filters:${businessDate}`); },
        async readF11HueOuterSummary() { calls.push('summary'); return summary; },
        async readF11TctOuterSummary() { calls.push('summary'); return summary; },
        async requestF11HueExport() { calls.push('export'); },
        async requestF11TctExport() { calls.push('export'); },
        async pollGeneratedFile({ match }) { calls.push(`poll:${match}`); return { filename: generatedName, href: '/files-xlsx/1' }; },
        async downloadXlsx({ file, targetDir }) {
            calls.push('download');
            const target = path.join(targetDir, file.filename);
            fs.copyFileSync(source, target);
            return target;
        },
        async deleteGeneratedFile() { calls.push('cleanup'); return { status: 'DELETED' }; },
        lane,
    };
}

const HUE_SUMMARY = { outerRowCount: 176, totalVolume: 2621, ptcVolume: 2589, evaluatedVolume: 2588, passedVolume: 2348, failedVolume: 240, rateText: '90.73%', detailIdentity: 'sp_TT_NoiTinh_ChiTiet' };
const TCT_SUMMARY = { outerRowCount: 50, totalVolume: 187593, ptcVolume: 182036, evaluatedVolume: 181427, passedVolume: 149629, failedVolume: 31451, rateText: '82.47%', exportIdentity: 'sp_TT_NoiTinh_Tinh', exportAction: '/export/sp_TT_NoiTinh_Tinh/all', exportTotal: 85 };

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

test('HUE service on the real 2026-10-07 workbook: reconciles, copies to Incoming/HUE, imports as F1.1/HUE, cleans up', { skip: fs.existsSync(REAL_HUE) ? false : 'PO file not present' }, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: HUE_SUMMARY, generatedName: '09-10-2026_23-22-07_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_chi_tiet(1).xlsx' });
    const { service, imports } = newService(F11HueSingleDateService);
    const result = await service.runOneDate('2026-10-07', { portalClient: client });
    assert.equal(result.status, 'SUCCESS');
    assert.deepEqual({ total: result.total, evaluated: result.evaluated, passed: result.passed, failed: result.failed, rate: result.rate }, { total: 2621, evaluated: 2588, passed: 2348, failed: 240, rate: 89.58 });
    assert.deepEqual(client.calls, ['open', 'filters:2026-10-07', 'summary', 'export', `poll:${F11_EXECUTOR_IDENTITIES.HUE.generatedFileMatch}`, 'download', 'cleanup']);
    assert.equal(imports.length, 1);
    assert.deepEqual({ indicator: imports[0].indicator, lane: imports[0].lane, force: imports[0].forceReimport, source: imports[0].source }, { indicator: 'F1.1', lane: 'HUE', force: false, source: 'AUTO_BACKFILL_F11_HUE' });
    assert.equal(path.basename(imports[0].filePath), 'F1.1-2026.10.07.xlsx');
    assert.ok(imports[0].filePath.includes(path.join('F1.1', 'Incoming', 'HUE')));
    assert.equal(result.cleanup.status, 'DELETED');
    fs.rmSync(imports[0].filePath, { force: true });
});

test('HUE service refuses a workbook that does not reconcile (no Incoming copy, no import, no cleanup)', { skip: fs.existsSync(REAL_HUE) ? false : 'PO file not present' }, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: { ...HUE_SUMMARY, passedVolume: 2349 }, generatedName: 'x_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_chi_tiet(1).xlsx' });
    const { service, imports } = newService(F11HueSingleDateService);
    await assert.rejects(service.runOneDate('2026-10-07', { portalClient: client }), (error) => error.code === 'F11_HUE_RECONCILIATION_FAILED' && error.details.workbook.passed === 2348 && error.details.portal.passed === 2349);
    assert.equal(imports.length, 0);
    assert.equal(client.calls.includes('cleanup'), false);
});

test('HUE dry run (supervised probe) reconciles but copies nothing and imports nothing', { skip: fs.existsSync(REAL_HUE) ? false : 'PO file not present' }, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: HUE_SUMMARY, generatedName: 'y_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh_chi_tiet(1).xlsx' });
    const { service, imports } = newService(F11HueSingleDateService, { importEnabled: false });
    const result = await service.runOneDate('2026-10-07', { portalClient: client });
    assert.equal(result.dryRun, true);
    assert.equal(imports.length, 0);
    assert.equal(client.calls.includes('cleanup'), false);
});

test('TCT service on the real single-day workbook reconciles with the portal summary and imports as F1.1/TCT', { skip: fs.existsSync(REAL_TCT) ? false : 'PO file not present' }, async () => {
    const client = createServiceClient({ source: REAL_TCT, summary: TCT_SUMMARY, generatedName: '09-10-2026_23-18-43_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1).xlsx' });
    const { service, imports } = newService(F11TctSingleDateService);
    const result = await service.runOneDate('2026-10-07', { portalClient: client });
    assert.deepEqual({ rows: result.rows, total: result.total, evaluated: result.evaluated, passed: result.passed, exportTotal: result.exportTotal }, { rows: 84, total: 187593, evaluated: 181427, passed: 149629, exportTotal: 85 });
    assert.equal(imports[0].lane, 'TCT');
    assert.ok(client.calls.includes(`poll:${F11_EXECUTOR_IDENTITIES.TCT.generatedFileMatch}`));
    assert.ok(imports[0].filePath.includes(path.join('F1.1', 'Incoming', 'TCT')));
    fs.rmSync(imports[0].filePath, { force: true });
});

test('TCT service on a synthetic workbook: summary mismatch refused; an existing Incoming file needs manual review', async () => {
    const synthetic = path.join(sandbox, 'synthetic-tct.xlsx');
    fs.writeFileSync(synthetic, buildTctWorkbookBuffer(defaultSpecs()));
    const total = defaultSpecs().reduce((a, s) => a + s.den + 5, 0);
    const evaluated = defaultSpecs().reduce((a, s) => a + s.den, 0);
    const passed = defaultSpecs().reduce((a, s) => a + s.ok, 0);
    const summary = { ...TCT_SUMMARY, totalVolume: total, evaluatedVolume: evaluated, passedVolume: passed };

    let client = createServiceClient({ source: synthetic, summary: { ...summary, passedVolume: passed + 1 }, generatedName: 'z_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1).xlsx' });
    let built = newService(F11TctSingleDateService);
    await assert.rejects(built.service.runOneDate('2026-10-12', { portalClient: client }), (error) => error.code === 'F11_TCT_RECONCILIATION_FAILED');

    client = createServiceClient({ source: synthetic, summary, generatedName: 'z_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1).xlsx' });
    built = newService(F11TctSingleDateService);
    const ok = await built.service.runOneDate('2026-10-12', { portalClient: client });
    assert.equal(ok.rows, 34);
    // the standardized file is still in Incoming (the stubbed import did not move it): a second run must stop
    client = createServiceClient({ source: synthetic, summary, generatedName: 'z_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1).xlsx' });
    built = newService(F11TctSingleDateService);
    await assert.rejects(built.service.runOneDate('2026-10-12', { portalClient: client }), (error) => error.code === 'MANUAL_REVIEW_REQUIRED');
    fs.rmSync(built.imports[0]?.filePath || path.join(sandbox, 'none'), { force: true });
});

test('services validate their inputs: date format, portal-client methods, summary shape, forced refresh flag', async () => {
    const { service } = newService(F11HueSingleDateService);
    await assert.rejects(service.runOneDate('07/10/2026', { portalClient: {} }), (error) => error.code === 'INVALID_DATE');
    await assert.rejects(service.runOneDate('2026-10-07', { portalClient: {} }), (error) => error.code === 'F11_HUE_PORTAL_CLIENT_INCOMPLETE');
    assert.throws(() => service.assertSummary({ totalVolume: 0, evaluatedVolume: 0, passedVolume: 0, detailIdentity: 'sp_TT_NoiTinh_ChiTiet' }), (error) => error.code === 'F11_HUE_OUTER_SUMMARY_INVALID');
    assert.throws(() => service.assertSummary({ ...HUE_SUMMARY, detailIdentity: 'sp_Other' }), (error) => error.code === 'F11_HUE_OUTER_SUMMARY_INVALID');
    assert.throws(() => service.assertSummary({ ...HUE_SUMMARY, passedVolume: 9999 }), (error) => error.code === 'F11_HUE_OUTER_SUMMARY_INVALID');
    assert.equal(standardizedFilename('2026-10-07'), 'F1.1-2026.10.07.xlsx');

    const seen = [];
    const adapter = new F11HueAdapter({ service: { runOneDate: async (date, context) => { seen.push(context); return { ok: true }; } } });
    await adapter.runOneDate('2026-10-07', { portalClient: { p: 1 }, refreshRequested: true });
    assert.equal(seen[0].refreshRequested, true);
});

// ---------------------------------------------------------------------------------------------
// 5. executors
// ---------------------------------------------------------------------------------------------
function sessionHarness(status = 'SESSION_VALID') {
    const entry = { activeOperation: null };
    const portalClient = { id: 'client' };
    const calls = [];
    return {
        entry, portalClient, calls,
        service: {
            async preflight(source) { calls.push(`preflight:${source}`); return status === 'SESSION_VALID' ? { status } : { status, error: { message: 'login required' } }; },
            withSourceLock(source, operation) { calls.push(`lock:${source}`); return operation(); },
            getRegistryState() { return entry; },
            getInteractiveClient() { return portalClient; },
        },
    };
}

test('executor: exact F1.1/lane/date only, session validated, source lock + active-operation marker, adapter called once', async () => {
    const harness = sessionHarness();
    const seen = [];
    const executor = new F11AutoBackfillExecutor({
        identity: F11_EXECUTOR_IDENTITIES.HUE,
        adapter: { runOneDate: async (date, context) => { seen.push({ date, context, marker: harness.entry.activeOperation }); return { status: 'SUCCESS' }; } },
        sessionPreflightService: harness.service,
    });
    await assert.rejects(executor.execute({ indicator: 'F1.3', sourceLane: 'HUE', businessDate: '2026-10-07' }), (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH');
    await assert.rejects(executor.execute({ indicator: 'F1.1', sourceLane: 'TCT', businessDate: '2026-10-07' }), (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH');
    await assert.rejects(executor.execute({ indicator: 'F1.1', sourceLane: 'HUE', businessDate: '07/10/2026' }), (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH');
    const result = await executor.execute({ indicator: 'F1.1', sourceLane: 'HUE', businessDate: '2026-10-07', jobId: 'j1', forceReimport: true });
    assert.equal(result.status, 'SUCCESS');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].context.refreshRequested, true);
    assert.equal(seen[0].context.portalClient, harness.portalClient);
    assert.equal(seen[0].marker, 'AUTO_BACKFILL_F11_HUE');
    assert.equal(harness.entry.activeOperation, null, 'marker released');
});

test('executor: authentication required, pending manual login and an already-active source are distinct failures', async () => {
    let harness = sessionHarness('AUTHENTICATION_REQUIRED');
    const make = (h) => new F11AutoBackfillExecutor({ identity: F11_EXECUTOR_IDENTITIES.TCT, adapter: { runOneDate: async () => ({}) }, sessionPreflightService: h.service });
    await assert.rejects(make(harness).execute({ indicator: 'F1.1', sourceLane: 'TCT', businessDate: '2026-10-07' }), (error) => error.code === 'AUTHENTICATION_REQUIRED');
    harness = sessionHarness('LOGIN_IN_PROGRESS');
    await assert.rejects(make(harness).execute({ indicator: 'F1.1', sourceLane: 'TCT', businessDate: '2026-10-07' }), (error) => error.code === 'SESSION_PENDING_HUMAN_ACTION');
    harness = sessionHarness();
    harness.entry.activeOperation = 'SOMETHING_ELSE';
    await assert.rejects(make(harness).execute({ indicator: 'F1.1', sourceLane: 'TCT', businessDate: '2026-10-07' }), (error) => error.code === 'DKCL_SOURCE_OPERATION_ACTIVE');
});

test('executors are created for both lanes with the registered identities', () => {
    const executors = createF11AutoBackfillExecutors({ sessionPreflightService: sessionHarness().service });
    assert.equal(executors.HUE.identity.id, 'DKCL_F11_HUE_SINGLE_DATE_V1');
    assert.equal(executors.TCT.identity.id, 'DKCL_F11_TCT_SINGLE_DATE_V1');
    assert.equal(F11_EXECUTOR_IDENTITIES.HUE.detailResourceIdentity, 'sp_TT_NoiTinh_ChiTiet');
    assert.equal(F11_EXECUTOR_IDENTITIES.TCT.resourceIdentity, 'sp_TT_NoiTinh_Tinh');
});
