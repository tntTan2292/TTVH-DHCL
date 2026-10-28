'use strict';

// F12-PHASE-3 - F1.2 Portal adapter tests: request builders against the observed requests, the HTML
// helpers, the portal-client methods over a fake page, the one-date services over a fake client (and
// the PO's real 10/10/2026 files as the known answer) and the executors. No browser, no portal, no
// live database.
// Run per file: node --test --experimental-sqlite test_f12PortalAdapter.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f12-portal-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F12 = path.join(sandbox, 'F1.2');

const { db } = require('./src/config/db');
const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const methods = require('./src/services/f12PortalClientMethods');
const { F12_EXECUTOR_IDENTITIES } = require('./src/services/autoBackfillF12Contract');
const { F12HueSingleDateService, F12TctSingleDateService, F12HueAdapter, standardizedFilename } = require('./src/services/f12SingleDateServices');
const { F12AutoBackfillExecutor, F12_BACKFILL_EXPORT_TIMEOUT_MS, createF12AutoBackfillExecutors } = require('./src/services/autoBackfillF12Executors');
const { selectNewestGeneratedFile } = require('./src/services/dkclHueF13SyncService');
const { f12TctBuffer, population } = require('./test/f12TctFixture');

const REAL_HUE = path.resolve(__dirname, '../Data DKCL/F1.2-2026.10.10.xlsx');
const REAL_TCT = path.resolve(__dirname, '../Data DKCL/F1.2-TCT-2026.10.10.xlsx');

test.after(async () => {
    await new Promise((resolve) => db.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// 1. requests equal the ones observed on the real portal (Manifest Sections 3-4)
// ---------------------------------------------------------------------------------------------
test('report queries equal the requests observed for HUE (BC/53) and TCT (TINH/ALL) on 10/10/2026', () => {
    assert.equal(
        methods.buildF12ReportQuery('HUE', '2026-10-10'),
        'TuyChonGR=BC&stMaTinhNhan=53&stMaBuuCucNhan=NULL&stMaBCKTTinhNhan=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&iFrom=10%2F10%2F2026&iTo=10%2F10%2F2026',
    );
    assert.equal(
        methods.buildF12ReportQuery('TCT', '2026-10-10'),
        'TuyChonGR=TINH&stMaTinhNhan=ALL&stMaBuuCucNhan=NULL&stMaBCKTTinhNhan=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&iFrom=10%2F10%2F2026&iTo=10%2F10%2F2026',
    );
    // MM/DD/YYYY proof: 9 October is iFrom=10/09/2026
    assert.match(methods.buildF12ReportQuery('HUE', '2026-10-09'), /iFrom=10%2F09%2F2026&iTo=10%2F09%2F2026$/);
});

test('the HUE detail query equals the observed detail request (quoted province, YYYYMMDD, iDetailReport=6, iTotal)', () => {
    assert.equal(
        methods.buildF12HueDetailQuery('2026-10-10', 1758),
        "stMaTinhNhan=N%2753%27&stMaBuuCucNhan=NULL&iFrom=20261010&iTo=20261010&stMaDichVu=NULL&stNhomLoaiBuuGui=NULL&stLoaiDichVu=NULL&stMaLoaiBuuGui=NULL&stNhomLoaiKH=NULL&stMaBCKTTinhNhan=NULL&stMaKHL=NULL&stPhuongTien=NULL&stKhoiLuong=NULL&name_store=sp_TT_ThuGom_LienTinh_ChiTiet&iDetailReport=6&iTotal=1758",
    );
});

test('builders reject an unsupported lane, a malformed date and a non-positive total', () => {
    assert.throws(() => methods.buildF12ReportQuery('XYZ', '2026-10-10'), /no filter profile/);
    assert.throws(() => methods.buildF12ReportQuery('HUE', '10/10/2026'), /YYYY-MM-DD/);
    assert.throws(() => methods.buildF12HueDetailQuery('2026-10-10', 0), /positive summary total/);
    assert.throws(() => methods.buildF12HueDetailQuery('2026-10-10', 'abc'), /positive summary total/);
});

test('the generated-file match for TCT can never select a HUE detail file, and vice versa', () => {
    const detail = { filename: '11-10-2026_22-14-05_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx', createdAt: '2026-10-11T15:14:09Z' };
    const summary = { filename: '11-10-2026_22-18-45_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx', createdAt: '2026-10-11T15:18:45Z' };
    const requestedAt = new Date('2026-10-11T15:00:00Z');
    assert.equal(selectNewestGeneratedFile([detail, summary], { requestedAt, match: F12_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), summary);
    assert.equal(selectNewestGeneratedFile([detail, summary], { requestedAt, match: F12_EXECUTOR_IDENTITIES.HUE.generatedFileMatch }), detail);
    assert.equal(selectNewestGeneratedFile([detail], { requestedAt, match: F12_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), null);
    assert.equal(selectNewestGeneratedFile([summary], { requestedAt, match: F12_EXECUTOR_IDENTITIES.HUE.generatedFileMatch }), null);
    // F1.1 and F4.1 files never match either
    const f11 = { filename: '09-10-2026_23-18-43_F1.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh(1).xlsx', createdAt: '2026-10-11T15:30:00Z' };
    const f41 = { filename: '09-10-2026_14-48-41_F4.1_chat_luong_phat_thanh_cong_cua_buu_cuc(1).xlsx', createdAt: '2026-10-11T15:30:00Z' };
    for (const other of [f11, f41]) {
        assert.equal(selectNewestGeneratedFile([other], { requestedAt, match: F12_EXECUTOR_IDENTITIES.TCT.generatedFileMatch }), null);
        assert.equal(selectNewestGeneratedFile([other], { requestedAt, match: F12_EXECUTOR_IDENTITIES.HUE.generatedFileMatch }), null);
    }
});

// ---------------------------------------------------------------------------------------------
// 2. HTML helpers
// ---------------------------------------------------------------------------------------------
// 21 screen cells: 0 stt, 1 province code, 2 name, 3 BC code, 4 BC name, 5 KHL code, 6 KHL name,
// 7 BD10 closed, 8 BD10 TMS, 9 Dat, 10 rate, 11 Qua QD, 12 rate over, 13 chua du, 14-19 buckets, 20 loai tru
function cells21(overrides = {}) {
    const base = Array(21).fill('');
    for (const [index, value] of Object.entries(overrides)) base[Number(index)] = String(value);
    return base;
}
function trHtml(cells, attrs = 'class="row_tong_quan"') {
    return `<tr ${attrs}>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
}
// The observed HUE grand-total row of 10/10/2026 (no number, no province code)
const HUE_TOTAL_CELLS = cells21({ 7: '1.758', 8: '1.758', 9: '1.620', 10: '92.15 %', 11: 138, 12: '7.85 %', 13: 133, 14: '1.620', 15: '1.681', 16: 63, 17: 13, 18: 0, 19: 1, 20: 0 });
// The observed TCT grand-total row
const TCT_TOTAL_CELLS = cells21({ 7: '260.522', 8: '264.219', 9: '240.092', 10: '92.16 %', 11: '24.127', 12: '9.26 %', 13: '14.171', 14: '240.076', 15: '249.178', 16: '11.514', 17: '1.787', 18: 785, 19: 955, 20: 675 });
const HUE_UNIT_CELLS = cells21({ 0: 30, 1: 53, 2: 'Thừa Thiên Huế', 3: 530000, 7: '1.758', 8: '1.758', 9: '1.620', 11: 138 });

test('outer rows ignore nested tables and rows too short; the unnumbered grand-total row is kept', () => {
    const nested = '<table><tbody><tr><td>x</td><td>y</td></tr></tbody></table>';
    const html = [
        trHtml(HUE_TOTAL_CELLS),
        `<tr class="row_tong_quan"><td>2</td>${'<td>a</td>'.repeat(10)}<td>${nested}</td>${'<td>b</td>'.repeat(9)}</tr>`,
        '<tr><td>header</td><td>no number</td></tr>',
        trHtml(HUE_UNIT_CELLS),
    ].join('');
    const rows = methods.outerDataRows(html);
    assert.equal(rows.length, 3);
    assert.equal(rows[0][7], '1.758');
    assert.equal(rows[1].length, 21);
    assert.equal(rows[2][1], '53');
});

test('totals come from the grand-total row (no province code); a first row with a code is refused', () => {
    assert.deepEqual(methods.readTotals(methods.outerDataRows(trHtml(HUE_TOTAL_CELLS))), {
        totalVolume: 1758, evaluatedVolume: 1758, passedVolume: 1620, failedVolume: 138, notEnoughInfoVolume: 133, rateText: '92.15 %',
    });
    assert.deepEqual(methods.readTotals(methods.outerDataRows(trHtml(TCT_TOTAL_CELLS))), {
        totalVolume: 260522, evaluatedVolume: 264219, passedVolume: 240092, failedVolume: 24127, notEnoughInfoVolume: 14171, rateText: '92.16 %',
    });
    assert.equal(methods.readTotals(methods.outerDataRows(trHtml(HUE_UNIT_CELLS))), null);
    assert.equal(methods.readTotals([]), null);
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
        url: () => 'https://dkcl.vnpost.vn/kpi/chat-luong-thu-gom-buu-lien-tinh',
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
    data: [trHtml(HUE_TOTAL_CELLS), trHtml(HUE_UNIT_CELLS)].join(''),
    template_paginator: '<div></div>',
});
const HUE_DETAIL_BODY = JSON.stringify({ data: '<tr><td>1</td><td>CB531174172VN</td></tr><tr><td>2</td><td>CC1VN</td></tr>', template_paginator: exportFormHtml('sp_TT_ThuGom_LienTinh_ChiTiet', 1758) });
const respond = (status, body) => createFakePage().response(status, body);

test('HUE client flow: filters -> verified summary -> detail -> export, with the exact observed requests', async () => {
    const page = createFakePage({ reportResponse: () => respond(200, HUE_REPORT_BODY), detailResponse: () => respond(200, HUE_DETAIL_BODY) });
    const client = createClient(page);
    await client.openF12Report();
    await client.submitF12HueFilters({ businessDate: '2026-10-10' });
    const summary = await client.readF12HueOuterSummary();
    assert.deepEqual(summary, {
        outerRowCount: 2, totalVolume: 1758, evaluatedVolume: 1758, passedVolume: 1620, failedVolume: 138,
        notEnoughInfoVolume: 133, rateText: '92.15 %', detailIdentity: 'sp_TT_ThuGom_LienTinh_ChiTiet',
    });
    await client.requestF12HueExport();

    assert.equal(page.calls.get[0], 'https://dkcl.vnpost.vn/kpi/chat-luong-thu-gom-buu-lien-tinh?' + methods.buildF12ReportQuery('HUE', '2026-10-10'));
    assert.equal(page.calls.get[1], 'https://dkcl.vnpost.vn/kpi/chat-luong-thu-gom-buu-lien-tinh-chi-tiet?' + methods.buildF12HueDetailQuery('2026-10-10', 1758));
    assert.equal(page.calls.fetch.length, 1);
    assert.equal(page.calls.fetch[0].url, 'https://dkcl.vnpost.vn/export/sp_TT_ThuGom_LienTinh_ChiTiet/all');
    assert.deepEqual(page.calls.fetch[0].options.params, { Total: '1758', FilterSelected: '{"f":1}' });
    assert.equal(page.calls.fetch[0].options.method, 'GET');
    assert.equal(page.calls.goto.every((url) => !url.includes('?')), true, 'the shared page is never navigated to a filtered URL');
});

test('HUE client refuses a detail export whose Total differs from the verified summary', async () => {
    const mismatch = JSON.stringify({ data: '<tr><td>1</td></tr>', template_paginator: exportFormHtml('sp_TT_ThuGom_LienTinh_ChiTiet', 1700) });
    const page = createFakePage({ reportResponse: () => respond(200, HUE_REPORT_BODY), detailResponse: () => respond(200, mismatch) });
    const client = createClient(page);
    await client.submitF12HueFilters({ businessDate: '2026-10-10' });
    await client.readF12HueOuterSummary();
    await assert.rejects(client.requestF12HueExport(), (error) => error.code === 'F12_DETAIL_EXPORT_TOTAL_MISMATCH');
    assert.equal(page.calls.fetch.length, 0, 'no export is fired on a mismatch');
});

test('HUE client refuses a wrong detail store, a missing export form and an HTTP error', async () => {
    const withAnchor = JSON.stringify({
        data: `<tr class="tongquan_params" data-store="sp_Other" data-url="/kpi/chat-luong-thu-gom-buu-lien-tinh-chi-tiet"></tr>${JSON.parse(HUE_REPORT_BODY).data}`,
        template_paginator: '',
    });
    let client = createClient(createFakePage({ reportResponse: () => respond(200, withAnchor), detailResponse: () => respond(200, HUE_DETAIL_BODY) }));
    await client.submitF12HueFilters({ businessDate: '2026-10-10' });
    await client.readF12HueOuterSummary();
    await assert.rejects(client.requestF12HueExport(), (error) => error.code === 'F12_DETAIL_IDENTITY_MISMATCH');

    client = createClient(createFakePage({
        reportResponse: () => respond(200, HUE_REPORT_BODY),
        detailResponse: () => respond(200, JSON.stringify({ data: '<tr><td>1</td></tr>', template_paginator: '<div>no form</div>' })),
    }));
    await client.submitF12HueFilters({ businessDate: '2026-10-10' });
    await client.readF12HueOuterSummary();
    await assert.rejects(client.requestF12HueExport(), (error) => error.code === 'F12_DETAIL_EXPORT_FORM_NOT_FOUND');

    client = createClient(createFakePage({ reportResponse: () => respond(500, '{}'), detailResponse: () => null }));
    await client.submitF12HueFilters({ businessDate: '2026-10-10' });
    await assert.rejects(client.readF12HueOuterSummary(), (error) => error.code === 'F12_REPORT_REQUEST_FAILED');
});

test('HUE summary without a grand-total row is refused', async () => {
    const noTotal = JSON.stringify({ data: trHtml(HUE_UNIT_CELLS), template_paginator: '' });
    const client = createClient(createFakePage({ reportResponse: () => respond(200, noTotal), detailResponse: () => null }));
    await client.submitF12HueFilters({ businessDate: '2026-10-10' });
    await assert.rejects(client.readF12HueOuterSummary(), (error) => error.code === 'F12_OUTER_SUMMARY_NOT_FOUND');
});

test('TCT client flow: export form is read from the summary response and fired once', async () => {
    const body = JSON.stringify({
        data: [trHtml(TCT_TOTAL_CELLS), trHtml(cells21({ 0: 1, 1: '01', 2: 'EMS', 7: 1000, 8: 1000, 9: 900, 11: 100 }))].join(''),
        template_paginator: exportFormHtml('sp_TT_ThuGom_LienTinh_Tinh', 54),
    });
    const page = createFakePage({ reportResponse: () => respond(200, body), detailResponse: () => null });
    const client = createClient(page);
    await client.submitF12TctFilters({ businessDate: '2026-10-10' });
    const summary = await client.readF12TctOuterSummary();
    assert.deepEqual(summary, {
        outerRowCount: 2, totalVolume: 260522, evaluatedVolume: 264219, passedVolume: 240092, failedVolume: 24127,
        notEnoughInfoVolume: 14171, rateText: '92.16 %',
        exportIdentity: 'sp_TT_ThuGom_LienTinh_Tinh', exportAction: '/export/sp_TT_ThuGom_LienTinh_Tinh/all', exportTotal: 54,
    });
    await client.requestF12TctExport();
    assert.equal(page.calls.fetch.length, 1);
    assert.equal(page.calls.fetch[0].url, 'https://dkcl.vnpost.vn/export/sp_TT_ThuGom_LienTinh_Tinh/all');
    assert.equal(page.calls.get[0], 'https://dkcl.vnpost.vn/kpi/chat-luong-thu-gom-buu-lien-tinh?' + methods.buildF12ReportQuery('TCT', '2026-10-10'));
});

test('TCT export is refused when the summary response carried no matching export form', async () => {
    const body = JSON.stringify({ data: trHtml(TCT_TOTAL_CELLS), template_paginator: exportFormHtml('sp_Other', 54) });
    const page = createFakePage({ reportResponse: () => respond(200, body), detailResponse: () => null });
    const client = createClient(page);
    await client.submitF12TctFilters({ businessDate: '2026-10-10' });
    const summary = await client.readF12TctOuterSummary();
    assert.equal(summary.exportIdentity, null);
    await assert.rejects(client.requestF12TctExport(), (error) => error.code === 'EXPORT_CONTROL_NOT_READY');
    assert.equal(page.calls.fetch.length, 0);
});

test('a portal timeout becomes the coded, retryable F12_PORTAL_REQUEST_TIMEOUT', async () => {
    const page = createFakePage({
        reportResponse: () => { const e = new Error('page.request.get: Timeout 120000ms exceeded.'); e.name = 'TimeoutError'; throw e; },
        detailResponse: () => null,
    });
    const client = createClient(page);
    await client.submitF12HueFilters({ businessDate: '2026-10-10' });
    await assert.rejects(client.readF12HueOuterSummary(), (error) => error.code === 'F12_PORTAL_REQUEST_TIMEOUT');
    const { DEFAULT_ERROR_MAP } = require('./src/services/importIndicatorRegistry');
    assert.equal(DEFAULT_ERROR_MAP.F12_PORTAL_REQUEST_TIMEOUT, 'TRANSIENT');
});

test('F1.2 methods are mixed in next to the F1.1 ones and use their own state fields', async () => {
    const client = createClient(createFakePage({ reportResponse: () => respond(200, HUE_REPORT_BODY), detailResponse: () => null }));
    for (const name of ['openF12Report', 'submitF12HueFilters', 'submitF12TctFilters', 'readF12HueOuterSummary', 'readF12TctOuterSummary', 'requestF12HueExport', 'requestF12TctExport', 'openF11Report']) {
        assert.equal(typeof client[name], 'function', name);
    }
    client.lastF11Query = 'F11-STATE';
    await client.submitF12HueFilters({ businessDate: '2026-10-10' });
    assert.equal(client.lastF11Query, 'F11-STATE', 'F1.2 never touches F1.1 state');
    assert.equal(client.lastF12Lane, 'HUE');
});

// ---------------------------------------------------------------------------------------------
// 4. one-date services over a fake client
// ---------------------------------------------------------------------------------------------
function createServiceClient({ lane, source, summary, generatedName }) {
    const calls = [];
    return {
        calls,
        async openF12Report() { calls.push('open'); },
        async submitF12HueFilters({ businessDate }) { calls.push(`filters:${businessDate}`); },
        async submitF12TctFilters({ businessDate }) { calls.push(`filters:${businessDate}`); },
        async readF12HueOuterSummary() { calls.push('summary'); return summary; },
        async readF12TctOuterSummary() { calls.push('summary'); return summary; },
        async requestF12HueExport() { calls.push('export'); },
        async requestF12TctExport() { calls.push('export'); },
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

const HUE_SUMMARY = {
    outerRowCount: 74, totalVolume: 1758, evaluatedVolume: 1758, passedVolume: 1620, failedVolume: 138,
    notEnoughInfoVolume: 133, rateText: '92.15 %', detailIdentity: 'sp_TT_ThuGom_LienTinh_ChiTiet',
};
const TCT_SUMMARY = {
    outerRowCount: 50, totalVolume: 260522, evaluatedVolume: 264219, passedVolume: 240092, failedVolume: 24127,
    notEnoughInfoVolume: 14171, rateText: '92.16 %',
    exportIdentity: 'sp_TT_ThuGom_LienTinh_Tinh', exportAction: '/export/sp_TT_ThuGom_LienTinh_Tinh/all', exportTotal: 54,
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

test('HUE service on the real 2026-10-10 workbook: reconciles, copies to Incoming/HUE, imports as F1.2/HUE, cleans up', HAS_HUE, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: HUE_SUMMARY, generatedName: '11-10-2026_22-14-05_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx' });
    const { service, imports } = newService(F12HueSingleDateService);
    const result = await service.runOneDate('2026-10-10', { portalClient: client });
    assert.equal(result.status, 'SUCCESS');
    assert.deepEqual(
        { total: result.total, evaluated: result.evaluated, passed: result.passed, failed: result.failed, rate: result.rate },
        { total: 1758, evaluated: 1758, passed: 1620, failed: 138, rate: 92.15 },
    );
    assert.deepEqual(client.calls, ['open', 'filters:2026-10-10', 'summary', 'export', `poll:${F12_EXECUTOR_IDENTITIES.HUE.generatedFileMatch}`, 'download', 'cleanup']);
    assert.equal(imports.length, 1);
    assert.deepEqual(
        { indicator: imports[0].indicator, lane: imports[0].lane, force: imports[0].forceReimport, source: imports[0].source },
        { indicator: 'F1.2', lane: 'HUE', force: false, source: 'AUTO_BACKFILL_F12_HUE' },
    );
    assert.equal(path.basename(imports[0].filePath), 'F1.2-2026.10.10.xlsx');
    assert.ok(imports[0].filePath.includes(path.join('F1.2', 'Incoming', 'HUE')));
    assert.equal(result.cleanup.status, 'DELETED');
    fs.rmSync(imports[0].filePath, { force: true });
});

test('HUE service refuses a workbook that does not reconcile, by one parcel (no Incoming copy, no import, no cleanup)', HAS_HUE, async () => {
    for (const bad of [{ passedVolume: 1621 }, { failedVolume: 139 }, { totalVolume: 1759 }]) {
        const client = createServiceClient({ source: REAL_HUE, summary: { ...HUE_SUMMARY, ...bad }, generatedName: 'x_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx' });
        const { service, imports } = newService(F12HueSingleDateService);
        await assert.rejects(
            service.runOneDate('2026-10-10', { portalClient: client }),
            (error) => error.code === 'F12_HUE_RECONCILIATION_FAILED' && Object.keys(error.details.differences).length === 1,
        );
        assert.equal(imports.length, 0);
        assert.equal(client.calls.includes('cleanup'), false);
    }
});

test('HUE dry run (supervised probe) reconciles but copies nothing and imports nothing', HAS_HUE, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: HUE_SUMMARY, generatedName: 'y_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx' });
    const { service, imports } = newService(F12HueSingleDateService, { importEnabled: false });
    const result = await service.runOneDate('2026-10-10', { portalClient: client });
    assert.equal(result.dryRun, true);
    assert.equal(imports.length, 0);
    assert.equal(client.calls.includes('cleanup'), false);
});

test('HUE service refuses a file whose BD10 day is not the requested day (file-name rule, PD-F12-6)', HAS_HUE, async () => {
    const client = createServiceClient({ source: REAL_HUE, summary: HUE_SUMMARY, generatedName: 'w_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet(1).xlsx' });
    const { service, imports } = newService(F12HueSingleDateService);
    await assert.rejects(service.runOneDate('2026-10-09', { portalClient: client }), /does not match the data/);
    assert.equal(imports.length, 0);
});

test('TCT service on the real national workbook reconciles with the portal summary and imports as F1.2/TCT', HAS_TCT, async () => {
    const client = createServiceClient({ source: REAL_TCT, summary: TCT_SUMMARY, generatedName: '11-10-2026_22-18-45_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx' });
    const { service, imports } = newService(F12TctSingleDateService);
    const result = await service.runOneDate('2026-10-10', { portalClient: client });
    assert.deepEqual(
        { rows: result.rows, total: result.total, evaluated: result.evaluated, passed: result.passed, failed: result.failed, exportTotal: result.exportTotal, notEnoughInfo: result.notEnoughInfo },
        { rows: 53, total: 260522, evaluated: 264219, passed: 240092, failed: 24127, exportTotal: 54, notEnoughInfo: 14171 },
    );
    assert.equal(imports[0].lane, 'TCT');
    assert.equal(imports[0].indicator, 'F1.2');
    assert.ok(client.calls.includes(`poll:${F12_EXECUTOR_IDENTITIES.TCT.generatedFileMatch}`));
    assert.ok(imports[0].filePath.includes(path.join('F1.2', 'Incoming', 'TCT')));
    fs.rmSync(imports[0].filePath, { force: true });
});

test('TCT service on a synthetic workbook: summary mismatch refused; an existing Incoming file needs manual review', async () => {
    const synthetic = path.join(sandbox, 'synthetic-tct.xlsx');
    const specs = population();
    fs.writeFileSync(synthetic, f12TctBuffer(specs));
    const sumOf = (fn) => specs.reduce((a, s) => a + fn(s), 0);
    const total = sumOf((s) => s.den);
    const evaluated = sumOf((s) => s.tms ?? s.den);
    const passed = sumOf((s) => s.ok);
    const summary = { ...TCT_SUMMARY, totalVolume: total, evaluatedVolume: evaluated, passedVolume: passed, failedVolume: evaluated - passed };

    let client = createServiceClient({ source: synthetic, summary: { ...summary, passedVolume: passed + 1 }, generatedName: 'z_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx' });
    let built = newService(F12TctSingleDateService);
    await assert.rejects(built.service.runOneDate('2026-10-12', { portalClient: client }), (error) => error.code === 'F12_TCT_RECONCILIATION_FAILED');
    assert.equal(built.imports.length, 0);

    client = createServiceClient({ source: synthetic, summary, generatedName: 'z_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx' });
    built = newService(F12TctSingleDateService);
    const ok = await built.service.runOneDate('2026-10-12', { portalClient: client });
    assert.equal(ok.rows, specs.length);
    // the standardized file is still in Incoming (the stubbed import did not move it): a second run must stop
    client = createServiceClient({ source: synthetic, summary, generatedName: 'z_F1.2_CL_thu_gom_buu_giay_lien_tinh(1).xlsx' });
    built = newService(F12TctSingleDateService);
    await assert.rejects(built.service.runOneDate('2026-10-12', { portalClient: client }), (error) => error.code === 'MANUAL_REVIEW_REQUIRED');
    fs.rmSync(path.join(sandbox, 'F1.2', 'Incoming', 'TCT', 'F1.2-2026.10.12.xlsx'), { force: true });
});

test('services validate their inputs: date format, portal-client methods, summary shape, refresh flag', async () => {
    const { service } = newService(F12HueSingleDateService);
    await assert.rejects(service.runOneDate('10/10/2026', { portalClient: {} }), (error) => error.code === 'INVALID_DATE');
    await assert.rejects(service.runOneDate('2026-10-10', { portalClient: {} }), (error) => error.code === 'F12_HUE_PORTAL_CLIENT_INCOMPLETE');
    assert.throws(() => service.assertSummary({ ...HUE_SUMMARY, totalVolume: 0 }), (error) => error.code === 'F12_HUE_OUTER_SUMMARY_INVALID');
    assert.throws(() => service.assertSummary({ ...HUE_SUMMARY, detailIdentity: 'sp_Other' }), (error) => error.code === 'F12_HUE_OUTER_SUMMARY_INVALID');
    assert.throws(() => service.assertSummary({ ...HUE_SUMMARY, passedVolume: 9999 }), (error) => error.code === 'F12_HUE_OUTER_SUMMARY_INVALID');
    assert.doesNotThrow(() => service.assertSummary(HUE_SUMMARY));
    const tct = newService(F12TctSingleDateService).service;
    assert.throws(() => tct.assertSummary({ ...TCT_SUMMARY, exportIdentity: null }), (error) => error.code === 'F12_TCT_OUTER_SUMMARY_INVALID');
    // national evaluated may exceed the BD10 count (TMS scans of other days), so it is not capped by the total
    assert.doesNotThrow(() => tct.assertSummary(TCT_SUMMARY));
    assert.equal(standardizedFilename('2026-10-10'), 'F1.2-2026.10.10.xlsx');

    const seen = [];
    const adapter = new F12HueAdapter({ service: { runOneDate: async (date, context) => { seen.push(context); return { ok: true }; } } });
    await adapter.runOneDate('2026-10-10', { portalClient: { p: 1 }, refreshRequested: true });
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

test('executor: exact F1.2/lane/date only, session validated, source lock + active-operation marker, adapter called once', async () => {
    const harness = sessionHarness();
    const seen = [];
    const executor = new F12AutoBackfillExecutor({
        identity: F12_EXECUTOR_IDENTITIES.HUE,
        adapter: { runOneDate: async (date, context) => { seen.push({ date, context, marker: harness.entry.activeOperation }); return { status: 'SUCCESS' }; } },
        sessionPreflightService: harness.service,
    });
    await assert.rejects(executor.execute({ indicator: 'F1.1', sourceLane: 'HUE', businessDate: '2026-10-10' }), (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH');
    await assert.rejects(executor.execute({ indicator: 'F1.2', sourceLane: 'TCT', businessDate: '2026-10-10' }), (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH');
    await assert.rejects(executor.execute({ indicator: 'F1.2', sourceLane: 'HUE', businessDate: '10/10/2026' }), (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH');
    const result = await executor.execute({ indicator: 'F1.2', sourceLane: 'HUE', businessDate: '2026-10-10', jobId: 'j1', forceReimport: true });
    assert.equal(result.status, 'SUCCESS');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].context.refreshRequested, true);
    assert.equal(seen[0].context.portalClient, harness.portalClient);
    assert.equal(seen[0].marker, 'AUTO_BACKFILL_F12_HUE');
    assert.equal(harness.entry.activeOperation, null, 'marker released');
});

test('executor: authentication required, pending manual login and an already-active source are distinct failures', async () => {
    let harness = sessionHarness('AUTHENTICATION_REQUIRED');
    const make = (h) => new F12AutoBackfillExecutor({ identity: F12_EXECUTOR_IDENTITIES.TCT, adapter: { runOneDate: async () => ({}) }, sessionPreflightService: h.service });
    await assert.rejects(make(harness).execute({ indicator: 'F1.2', sourceLane: 'TCT', businessDate: '2026-10-10' }), (error) => error.code === 'AUTHENTICATION_REQUIRED');
    harness = sessionHarness('LOGIN_IN_PROGRESS');
    await assert.rejects(make(harness).execute({ indicator: 'F1.2', sourceLane: 'TCT', businessDate: '2026-10-10' }), (error) => error.code === 'SESSION_PENDING_HUMAN_ACTION');
    harness = sessionHarness();
    harness.entry.activeOperation = 'SOMETHING_ELSE';
    await assert.rejects(make(harness).execute({ indicator: 'F1.2', sourceLane: 'TCT', businessDate: '2026-10-10' }), (error) => error.code === 'DKCL_SOURCE_OPERATION_ACTIVE');
});

test('the queue waits 3 minutes for an F1.2 export on both lanes, the plain service keeps 15 minutes', () => {
    const executors = createF12AutoBackfillExecutors({ sessionPreflightService: sessionHarness().service });
    assert.equal(F12_BACKFILL_EXPORT_TIMEOUT_MS, 180000);
    for (const lane of ['HUE', 'TCT']) assert.equal(executors[lane].adapter.service.config.generationTimeoutMs, 180000);
    const custom = createF12AutoBackfillExecutors({ sessionPreflightService: sessionHarness().service, serviceOptions: { generationTimeoutMs: 1000 } });
    assert.equal(custom.TCT.adapter.service.config.generationTimeoutMs, 1000);
    assert.equal(new F12TctSingleDateService().config.generationTimeoutMs, 900000);
});

test('executors are created for both lanes with the identities; the registry is ACTIVE / AUTOMATED with the verified adapter identities', () => {
    const executors = createF12AutoBackfillExecutors({ sessionPreflightService: sessionHarness().service });
    assert.equal(executors.HUE.identity.id, 'DKCL_F12_HUE_SINGLE_DATE_V1');
    assert.equal(executors.TCT.identity.id, 'DKCL_F12_TCT_SINGLE_DATE_V1');
    assert.equal(F12_EXECUTOR_IDENTITIES.HUE.detailResourceIdentity, 'sp_TT_ThuGom_LienTinh_ChiTiet');
    assert.equal(F12_EXECUTOR_IDENTITIES.TCT.resourceIdentity, 'sp_TT_ThuGom_LienTinh_Tinh');

    const { getIndicatorConfig } = require('./src/services/importIndicatorRegistry');
    const f12 = getIndicatorConfig('F1.2');
    assert.equal(f12.status, 'ACTIVE');
    assert.equal(f12.refreshWindowDays, 2);
    for (const lane of ['HUE', 'TCT']) {
        assert.equal(f12.lanes[lane].automationMode, 'AUTOMATED');
        assert.equal(f12.lanes[lane].portalAdapter.id, F12_EXECUTOR_IDENTITIES[lane].id);
        assert.equal(f12.lanes[lane].portalAdapter.verified, true);
    }
});
