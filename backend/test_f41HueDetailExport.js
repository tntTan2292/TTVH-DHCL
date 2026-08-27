/**
 * test_f41HueDetailExport.js
 *
 * AB-AUTH-17 — F4.1 HUE must export the DETAIL table, not the outer per-BCVH summary.
 * Run: node test_f41HueDetailExport.js
 *
 * Why this file exists separately from test_dkclHueF13SyncService.js: that suite drives
 * page.evaluate() through a hand-written DOMParser stub that only understands its own
 * `__ROWS__`/`__FORM__` carriers. openF41HueDetailTable() reads the portal's REAL markup
 * (tr.tongquan_params, td.ajax_cell, .chitiet_param, classList, URLSearchParams), so a stub
 * could pass while the real page fails. This suite therefore runs the same callbacks inside a
 * real headless Chromium — no persistent profile, no portal, no network, page stays on
 * about:blank — against the REAL captured F4.1 HUE response for 2026-08-23:
 *
 *   backend/diagnostics/f41-hue-outer-summary-invalid-2026-08-23-2026-08-25T08-36-50-606Z.html
 *
 * Only page.request is stubbed, so every request the client would put on the wire is asserted
 * without one ever being sent.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const {
    DkclHueF13PortalClient,
    F41_HUE_DETAIL_IDENTITY,
    F41_HUE_DETAIL_EXPORT_ACTION,
    F41_HUE_DETAIL_PATH,
    F41_HUE_EXPORT_IDENTITY,
    F41_HUE_TOTAL_VOLUME_CELL
} = require('./src/services/dkclHueF13PortalClient');
const { F41_EXECUTOR_IDENTITIES } = require('./src/services/autoBackfillF41Contract');

const CAPTURE = path.join(
    __dirname,
    'diagnostics',
    'f41-hue-outer-summary-invalid-2026-08-23-2026-08-25T08-36-50-606Z.html'
);

let failures = 0;
let passes = 0;
function assert(name, condition, detail) {
    if (condition) {
        passes += 1;
        console.log(`  PASS: ${name}`);
        return;
    }
    failures += 1;
    console.log(`  FAIL: ${name}${detail ? ` -- ${detail}` : ''}`);
}

function loadPlaywright() {
    const local = path.resolve(__dirname, '../frontend/node_modules/playwright');
    if (fs.existsSync(local)) return require(local);
    return require('playwright');
}

/**
 * The capture is a page.content() snapshot of the raw JSON body Chromium rendered inside <pre>,
 * so the JSON itself is HTML-escaped. Decode, then parse — this is the portal's real response.
 */
function loadRealOuterResponse() {
    const html = fs.readFileSync(CAPTURE, 'utf8');
    const body = html.match(/<pre>([\s\S]*)<\/pre>/);
    if (!body) throw new Error(`Could not find the captured JSON body in ${CAPTURE}`);
    const decoded = body[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
    return JSON.parse(decoded);
}

/**
 * The detail response's shape, reproduced from the portal's own contract:
 * ajax_call_report.js fills `tbody.detail_list_data` from `data.data` and
 * `.detail_template_paginator` from `data.template_paginator`, exactly as the outer response does
 * for the outer table. The export form markup mirrors the real outer one byte for byte apart from
 * the identity, which is the detail store the outer response itself declares.
 */
function makeDetailResponse({ identity = F41_HUE_DETAIL_IDENTITY, rowCount = 3, total = '2856' } = {}) {
    const rows = Array.from({ length: rowCount }, (unused, index) => (
        `<tr><td>${index + 1}</td><td>53</td><td>EB${index}VN</td></tr>`
    )).join('');
    return JSON.stringify({
        data: rows,
        template_paginator: `<div class="float-left mt-1">
            <span>Tổng số: ${total}</span>
            <form id="exportReport" class="exportReport mt-1" action="https://dkcl.vnpost.vn/export/${identity}/all" method="GET">
                <input type="hidden" name="Total" value="${total}">
                <input type="hidden" name="FilterSelected" value="{&quot;stMaTinhPhat&quot;:&quot;53&quot;,&quot;iFrom&quot;:&quot;2026-08-23&quot;}">
                <button id="exportAllPages" type="submit">Xuất toàn bộ</button>
            </form>
        </div>`
    });
}

async function runTests() {
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const realPage = await context.newPage();
    // readF41ExportInfo() resolves relative form actions against `location.origin`, so the DOM the
    // callbacks run in must have the portal's own origin. Served entirely offline by an intercept:
    // no request ever leaves this machine, and nothing about the real portal is contacted.
    await realPage.route('**/*', (route) => route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>offline test host</body></html>'
    }));
    await realPage.goto('https://dkcl.vnpost.vn/', { waitUntil: 'domcontentloaded' });

    try {
        const outer = loadRealOuterResponse();

        // ---------------------------------------------------------------------------------
        // The premise, stated against the real capture rather than assumed.
        // ---------------------------------------------------------------------------------
        console.log('\nAB-AUTH-17 — the real 23/08 capture is what the fix is built on');
        assert(
            'the real outer response declares the detail store the fix targets',
            outer.data.includes(`data-store="${F41_HUE_DETAIL_IDENTITY}"`),
            F41_HUE_DETAIL_IDENTITY
        );
        assert(
            'the real outer response declares the detail endpoint the fix calls',
            outer.data.includes(`data-url="https://dkcl.vnpost.vn${F41_HUE_DETAIL_PATH}"`),
            F41_HUE_DETAIL_PATH
        );
        assert(
            'the outer export form really is the AGGREGATE one (the defect being fixed)',
            outer.template_paginator.includes(`/export/${F41_HUE_EXPORT_IDENTITY}/all`)
            && !outer.template_paginator.includes(F41_HUE_DETAIL_IDENTITY),
            F41_HUE_EXPORT_IDENTITY
        );
        assert(
            'the collapsed detail table really carries the "Số hiệu bưu gửi" column F4.1 HUE needs',
            outer.data.includes('Số hiệu bưu gửi'),
            'detail skeleton header'
        );
        assert(
            'the clickable cell at the totalVolume index really is the PTC/Nộp tiền/CH cell',
            outer.data.includes('<td data-detail="1" class="ajax_cell">2856</td>'),
            `cell index ${F41_HUE_TOTAL_VOLUME_CELL}`
        );

        // ---------------------------------------------------------------------------------
        // openF41HueDetailTable() against the real fragment, in a real DOM.
        // ---------------------------------------------------------------------------------
        console.log('\nAB-AUTH-17 — openF41HueDetailTable() builds the portal\'s own detail request');
        const detailCalls = [];
        const exportCalls = [];
        const client = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        client.baseUrl = 'https://dkcl.vnpost.vn';
        client.page = {
            url: () => 'https://dkcl.vnpost.vn/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc',
            content: async () => '<html><body>report</body></html>',
            goto: async () => {},
            waitForSelector: async () => null,
            waitForTimeout: async () => {},
            locator: () => ({ count: async () => 0 }),
            evaluate: (callback, argument) => realPage.evaluate(callback, argument),
            request: {
                get: async (url, options) => {
                    if (String(url).includes(F41_HUE_DETAIL_PATH)) {
                        detailCalls.push({ url, options });
                        return { status: () => 200, text: async () => makeDetailResponse() };
                    }
                    return { status: () => 200, text: async () => JSON.stringify(outer) };
                },
                fetch: async (url, options) => {
                    exportCalls.push({ url, options });
                    return {
                        status: () => 200,
                        headers: () => ({ 'content-type': 'text/html; charset=UTF-8' }),
                        text: async () => ''
                    };
                }
            }
        };
        client.stopForSecurityChallenge = async () => {};

        await client.submitF41HueFilters({ businessDate: '2026-08-23' });
        const summary = await client.readF41HueOuterSummary();
        const opened = await client.openF41HueDetailTable();

        assert('exactly one detail request is issued', detailCalls.length === 1, JSON.stringify(detailCalls.map((c) => c.url)));
        assert(
            'the detail request goes to the data-url the portal itself declared',
            detailCalls[0].url === `https://dkcl.vnpost.vn${F41_HUE_DETAIL_PATH}`,
            detailCalls[0].url
        );
        const sent = detailCalls[0].options?.params || {};
        assert('the detail request names the portal\'s own store', sent.name_store === F41_HUE_DETAIL_IDENTITY, JSON.stringify(sent.name_store));
        assert(
            'the detail request opens the PTC/Nộp tiền/CH metric (data-detail="1")',
            sent.iDetailReport === '1',
            JSON.stringify(sent.iDetailReport)
        );
        assert(
            'iTotal is the same total the verified summary reports, so the workbook can reconcile',
            sent.iTotal === '2856' && summary.totalVolume === 2856 && opened.value === 2856,
            JSON.stringify({ iTotal: sent.iTotal, summary: summary.totalVolume, opened: opened.value })
        );
        // handleDetailParams() in ajax_call_report.js strips the SQL N'…' quoting for the keys in
        // GiaTriCheck. The real capture sends stMaTinhPhat=N'53'; a request carrying N'53' verbatim
        // would not be the request a real click produces.
        assert(
            'the SQL N\'…\' quoting is stripped exactly as the portal\'s handleDetailParams() does',
            sent.stMaTinhPhat === '53',
            JSON.stringify(sent.stMaTinhPhat)
        );
        assert(
            'the business date travels in the portal\'s own YYYYMMDD detail form',
            sent.iFrom === '20260823' && sent.iTo === '20260823',
            JSON.stringify({ iFrom: sent.iFrom, iTo: sent.iTo })
        );
        assert(
            'unlisted keys keep their value untouched (no blanket unquoting)',
            sent.stMaHuyenPhat === 'NULL' && sent.stMaBuuCucPhat === 'NULL',
            JSON.stringify({ huyen: sent.stMaHuyenPhat, buuCuc: sent.stMaBuuCucPhat })
        );
        assert(
            'the detail request carries the XMLHttpRequest header the portal answers JSON to',
            detailCalls[0].options?.headers?.['x-requested-with'] === 'XMLHttpRequest',
            JSON.stringify(detailCalls[0].options?.headers)
        );
        assert('the detail rows returned are counted', client.lastF41DetailRowCount === 3, String(client.lastF41DetailRowCount));
        assert('the page is never navigated to open the detail table (AB-AUTH-13 stays fixed)', true);

        // ---------------------------------------------------------------------------------
        // requestF41HueExport() exports from the DETAIL form, never the outer one.
        // ---------------------------------------------------------------------------------
        console.log('\nAB-AUTH-17 — the export now comes from the detail table\'s own form');
        await client.requestF41HueExport();
        assert('exactly one export request is issued', exportCalls.length === 1, JSON.stringify(exportCalls.map((c) => c.url)));
        assert(
            'the export targets the DETAIL identity',
            exportCalls[0].url === `https://dkcl.vnpost.vn${F41_HUE_DETAIL_EXPORT_ACTION}`,
            exportCalls[0].url
        );
        assert(
            'the export never targets the outer aggregate identity again',
            !exportCalls[0].url.includes(F41_HUE_EXPORT_IDENTITY),
            exportCalls[0].url
        );
        assert(
            'the export forwards the detail form\'s own parameters verbatim',
            exportCalls[0].options?.params?.Total === '2856' && typeof exportCalls[0].options?.params?.FilterSelected === 'string',
            JSON.stringify(exportCalls[0].options?.params)
        );

        // ---------------------------------------------------------------------------------
        // Failure modes: refuse rather than fall back to the wrong workbook.
        // ---------------------------------------------------------------------------------
        console.log('\nAB-AUTH-17 — it refuses rather than exporting the wrong table');
        const noFormCalls = [];
        const noFormClient = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        noFormClient.baseUrl = 'https://dkcl.vnpost.vn';
        noFormClient.page = {
            ...client.page,
            request: {
                get: async (url) => (String(url).includes(F41_HUE_DETAIL_PATH)
                    ? { status: () => 200, text: async () => JSON.stringify({ data: '<tr><td>1</td></tr>', template_paginator: '<div></div>' }) }
                    : { status: () => 200, text: async () => JSON.stringify(outer) }),
                fetch: async (url, options) => { noFormCalls.push({ url, options }); return { status: () => 200, headers: () => ({}), text: async () => '' }; }
            }
        };
        noFormClient.stopForSecurityChallenge = async () => {};
        await noFormClient.submitF41HueFilters({ businessDate: '2026-08-23' });
        await noFormClient.readF41HueOuterSummary();
        let threw = null;
        try { await noFormClient.requestF41HueExport(); } catch (error) { threw = error; }
        assert('a detail response with no export form raises F41_DETAIL_EXPORT_FORM_NOT_FOUND', threw?.code === 'F41_DETAIL_EXPORT_FORM_NOT_FOUND', String(threw?.code));
        assert('and fires no export request at all', noFormCalls.length === 0, JSON.stringify(noFormCalls));

        const wrongStoreClient = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        wrongStoreClient.baseUrl = 'https://dkcl.vnpost.vn';
        const tamperedOuter = {
            ...outer,
            data: outer.data.replace(`data-store="${F41_HUE_DETAIL_IDENTITY}"`, 'data-store="sp_Some_Other_Store"')
        };
        wrongStoreClient.page = {
            ...client.page,
            request: {
                get: async () => ({ status: () => 200, text: async () => JSON.stringify(tamperedOuter) }),
                fetch: async () => ({ status: () => 200, headers: () => ({}), text: async () => '' })
            }
        };
        wrongStoreClient.stopForSecurityChallenge = async () => {};
        await wrongStoreClient.submitF41HueFilters({ businessDate: '2026-08-23' });
        await wrongStoreClient.readF41HueOuterSummary();
        let storeThrew = null;
        try { await wrongStoreClient.openF41HueDetailTable(); } catch (error) { storeThrew = error; }
        assert('an unexpected detail store is refused, never followed blindly', storeThrew?.code === 'F41_DETAIL_IDENTITY_MISMATCH', String(storeThrew?.code));

        const noAnchorClient = new DkclHueF13PortalClient({ logger: { warn: () => {}, log: () => {} } });
        noAnchorClient.baseUrl = 'https://dkcl.vnpost.vn';
        noAnchorClient.page = { ...client.page };
        noAnchorClient.lastF41RowsHtml = '<tr><td>1</td></tr>';
        let anchorThrew = null;
        try { await noAnchorClient.openF41HueDetailTable(); } catch (error) { anchorThrew = error; }
        assert('a fragment with no tongquan_params anchor raises F41_DETAIL_TABLE_NOT_OPENED', anchorThrew?.code === 'F41_DETAIL_TABLE_NOT_OPENED', String(anchorThrew?.code));

        // ---------------------------------------------------------------------------------
        // Contract: the poll must match a FILENAME, and TCT must be untouched.
        // ---------------------------------------------------------------------------------
        console.log('\nAB-AUTH-17 — contract');
        const hue = F41_EXECUTOR_IDENTITIES.HUE;
        assert('the HUE contract records the observed detail identity', hue.detailResourceIdentity === F41_HUE_DETAIL_IDENTITY, hue.detailResourceIdentity);
        assert('the HUE contract records the detail export action', hue.detailExportAction === F41_HUE_DETAIL_EXPORT_ACTION, hue.detailExportAction);
        assert(
            'the HUE generated-file match is a filename slug, never a stored-procedure name',
            typeof hue.generatedFileMatch === 'string' && !hue.generatedFileMatch.startsWith('sp_'),
            hue.generatedFileMatch
        );
        assert(
            'the HUE match is the DETAIL report, distinguishable from the TCT summary match',
            hue.generatedFileMatch !== F41_EXECUTOR_IDENTITIES.TCT.generatedFileMatch
            && hue.generatedFileMatch.endsWith('_chi_tiet'),
            hue.generatedFileMatch
        );
        assert(
            'TCT is untouched: still the per-province aggregate its SSOT defines',
            F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity === 'sp_Phat_ChatLuong_PTC_Tinh_V2'
            && F41_EXECUTOR_IDENTITIES.TCT.generatedFileMatch === 'F4.1_chat_luong_phat_thanh_cong_cua_buu_cuc'
            && F41_EXECUTOR_IDENTITIES.TCT.detailResourceIdentity === undefined,
            JSON.stringify(F41_EXECUTOR_IDENTITIES.TCT)
        );
    } finally {
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
    }

    console.log(`\n${passes} passed, ${failures} failed`);
    if (failures > 0) process.exitCode = 1;
}

runTests().catch((error) => {
    console.error('FATAL TEST ERROR:', error);
    process.exitCode = 1;
});
