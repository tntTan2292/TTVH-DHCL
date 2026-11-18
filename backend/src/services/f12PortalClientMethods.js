'use strict';

// F12-PHASE-3 - F1.2 (thu gom buu gui lien tinh) portal operations for DkclHueF13PortalClient.
//
// Everything here is built from evidence observed on the real DKCL portal on 2026-10-11 (Claude in
// Chrome, the PO's own session; docs/10_TICKETS/F12-PHASE-3_MANIFEST.md Sections 3-6), never inferred:
//   - report route, the two filter profiles and the date encodings (the report request uses
//     MM/DD/YYYY, the detail request YYYYMMDD; From and To are both inclusive);
//   - only the ACCEPTING side exists for F1.2 (stMaTinhNhan, no "Tinh phat" filter);
//   - the detail request sends the province quoted, stMaTinhNhan=N'53', with iDetailReport=6;
//   - detail store `sp_TT_ThuGom_LienTinh_ChiTiet`, TCT export store `sp_TT_ThuGom_LienTinh_Tinh`;
//   - the export form travels in the `template_paginator` of the response that produced the rows
//     (the mechanism F4.1 and F1.1 proved), so the export target is read from the portal, not guessed.
// Transport mirrors F1.1: page.request XHR sharing the page's cookie jar, never a navigation of the
// shared page. HTML fragments are parsed in Node (table-depth aware), which also makes every step
// unit-testable. The generic HTML helpers are reused from the F1.1 module (imported, not edited).
//
// The methods are mixed into DkclHueF13PortalClient.prototype (see the bottom of that file). They
// touch only F1.2 state fields (lastF12*) and share nothing mutable with F1.1/F1.3/F4.1.

const {
    parseOuterRows,
    parseExportForms,
    parseCount,
} = require('./f11PortalClientMethods');

const F12_REPORT_PATH = '/kpi/chat-luong-thu-gom-buu-lien-tinh';
const F12_DETAIL_PATH = '/kpi/chat-luong-thu-gom-buu-lien-tinh-chi-tiet';
const F12_HUE_DETAIL_IDENTITY = 'sp_TT_ThuGom_LienTinh_ChiTiet';
const F12_HUE_DETAIL_EXPORT_ACTION = `/export/${F12_HUE_DETAIL_IDENTITY}/all`;
const F12_TCT_EXPORT_IDENTITY = 'sp_TT_ThuGom_LienTinh_Tinh';
const F12_TCT_EXPORT_ACTION = `/export/${F12_TCT_EXPORT_IDENTITY}/all`;

// Observed request profiles. HUE = group by BC, accepting province 53; TCT = group by Tinh, ALL.
const F12_LANE_FILTERS = Object.freeze({
    HUE: Object.freeze({ TuyChonGR: 'BC', stMaTinhNhan: '53' }),
    TCT: Object.freeze({ TuyChonGR: 'TINH', stMaTinhNhan: 'ALL' }),
});

// Outer-table cell positions on the SCREEN: the exported workbook's 20 columns plus one extra
// (`Ty le qua quy dinh`, between the over-time count and "chua du thong tin"), 21 cells in all.
const F12_CELL = Object.freeze({
    ACCEPT_PROVINCE: 1, ACCEPT_BC: 3,
    BD10_CLOSED: 7, BD10_TMS: 8, PASSED: 9, RATE_TEXT: 10, FAILED: 11, FAILED_RATE_TEXT: 12,
    NOT_ENOUGH_INFO: 13,
});
const F12_MIN_OUTER_CELLS = 21;

const F12_XHR_HEADERS = Object.freeze({ accept: '*/*', 'x-requested-with': 'XMLHttpRequest' });
const F12_REQUEST_TIMEOUT_MS = Number(process.env.DKCL_F12_REQUEST_TIMEOUT_MS) > 0
    ? Number(process.env.DKCL_F12_REQUEST_TIMEOUT_MS)
    : 120000;

function portalError(message, code) {
    const error = new Error(message);
    error.code = code;
    error.safeMessage = message;
    return error;
}

function isPlaywrightTimeout(error) {
    return error?.name === 'TimeoutError' || /Timeout \d+ms exceeded/i.test(String(error?.message || ''));
}

async function withRequestTimeout(label, run) {
    try {
        return await run();
    } catch (error) {
        if (error?.code || !isPlaywrightTimeout(error)) throw error;
        throw portalError(`F1.2 ${label} request timed out after ${F12_REQUEST_TIMEOUT_MS} ms.`, 'F12_PORTAL_REQUEST_TIMEOUT');
    }
}

function assertIsoDate(businessDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(businessDate || ''))) {
        throw portalError('F1.2 request requires a YYYY-MM-DD business date.', 'F12_REPORT_QUERY_DATE_INVALID');
    }
}

// MM/DD/YYYY, the encoding of the report request (observed: iFrom=10%2F09%2F2026 for 9 October).
function reportRequestDate(businessDate) {
    assertIsoDate(businessDate);
    const [year, month, day] = businessDate.split('-');
    return `${month}/${day}/${year}`;
}

// YYYYMMDD, the encoding of the detail request (observed: iFrom=20261010).
function detailRequestDate(businessDate) {
    assertIsoDate(businessDate);
    return businessDate.replace(/-/g, '');
}

function buildF12ReportQuery(lane, businessDate) {
    const filters = F12_LANE_FILTERS[String(lane || '').toUpperCase()];
    if (!filters) throw portalError(`F1.2 report query has no filter profile for lane ${lane}.`, 'F12_UNSUPPORTED_LANE');
    const date = reportRequestDate(businessDate);
    return new URLSearchParams([
        ['TuyChonGR', filters.TuyChonGR],
        ['stMaTinhNhan', filters.stMaTinhNhan],
        ['stMaBuuCucNhan', 'NULL'],
        ['stMaBCKTTinhNhan', 'NULL'],
        ['stLoaiDichVu', 'ALL'],
        ['stNhomLoaiKH', 'ALL'],
        ['iFrom', date],
        ['iTo', date],
    ]).toString();
}

// The HUE detail request, in the observed order. `total` is the summary's own BD10 count (iTotal), so
// the detail set is the whole of the verified summary. The province is sent quoted: N'53'.
function buildF12HueDetailQuery(businessDate, total) {
    const date = detailRequestDate(businessDate);
    const count = Number(total);
    if (!Number.isInteger(count) || count <= 0) {
        throw portalError('F1.2 HUE detail request requires a positive summary total.', 'F12_DETAIL_TOTAL_INVALID');
    }
    return new URLSearchParams([
        ['stMaTinhNhan', "N'53'"],
        ['stMaBuuCucNhan', 'NULL'],
        ['iFrom', date],
        ['iTo', date],
        ['stMaDichVu', 'NULL'],
        ['stNhomLoaiBuuGui', 'NULL'],
        ['stLoaiDichVu', 'NULL'],
        ['stMaLoaiBuuGui', 'NULL'],
        ['stNhomLoaiKH', 'NULL'],
        ['stMaBCKTTinhNhan', 'NULL'],
        ['stMaKHL', 'NULL'],
        ['stPhuongTien', 'NULL'],
        ['stKhoiLuong', 'NULL'],
        ['name_store', F12_HUE_DETAIL_IDENTITY],
        ['iDetailReport', '6'],
        ['iTotal', String(count)],
    ]).toString();
}

function splitPayload(body) {
    let rowsHtml = body;
    let paginator = null;
    try {
        const payload = JSON.parse(body);
        if (typeof payload?.data === 'string') rowsHtml = payload.data;
        if (typeof payload?.template_paginator === 'string') paginator = payload.template_paginator;
    } catch {
        rowsHtml = body;
    }
    return { rowsHtml, paginator };
}

// A data row of the summary has at least the 21 screen cells and a numeric row number, or (for the
// grand-total row, which may carry no number) no province code and a numeric BD10 count.
function outerDataRows(rowsHtml) {
    return parseOuterRows(rowsHtml)
        .map((row) => row.cells.map((cell) => cell.text))
        .filter((cells) => cells.length >= F12_MIN_OUTER_CELLS
            && (/^\d+$/.test(cells[0] || '')
                || ((cells[F12_CELL.ACCEPT_PROVINCE] || '') === '' && /\d/.test(cells[F12_CELL.BD10_CLOSED] || ''))));
}

// Grand-total row = the first outer row, which carries no accepting-province code.
function readTotals(rows) {
    const total = rows[0];
    if (!total) return null;
    if ((total[F12_CELL.ACCEPT_PROVINCE] || '') !== '' || (total[F12_CELL.ACCEPT_BC] || '') !== '') return null;
    return {
        totalVolume: parseCount(total[F12_CELL.BD10_CLOSED]),
        evaluatedVolume: parseCount(total[F12_CELL.BD10_TMS]),
        passedVolume: parseCount(total[F12_CELL.PASSED]),
        failedVolume: parseCount(total[F12_CELL.FAILED]),
        notEnoughInfoVolume: parseCount(total[F12_CELL.NOT_ENOUGH_INFO]),
        rateText: total[F12_CELL.RATE_TEXT] || null,
    };
}

// ---- methods mixed into the portal client --------------------------------------------------------

const methods = {
    async openF12Report() {
        await this.page.goto(`${this.baseUrl}${F12_REPORT_PATH}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.stopForSecurityChallenge({ allowHrm: false });
        await Promise.race([
            this.page.waitForSelector('select[name="TuyChonGR"]', { state: 'attached', timeout: 20000 }).catch(() => null),
            this.page.waitForSelector('input[name="login"], input[id="login"], input[type="password"]', { state: 'attached', timeout: 20000 }).catch(() => null),
        ]);
        if (this.page.url().includes('/login') || await this.page.locator('input[name="login"], input[id="login"], input[type="password"]').count() > 0) {
            throw portalError('AUTHENTICATION_REQUIRED: login required', 'AUTHENTICATION_REQUIRED');
        }
    },

    // Records lane + query (no navigation of the shared page) and clears the previous date's
    // fragments so a failed fetch can never leave stale state behind.
    async applyF12ReportFilters(lane, businessDate) {
        this.lastBusinessDate = businessDate;
        this.lastF12Lane = String(lane).toUpperCase();
        this.lastF12Query = buildF12ReportQuery(lane, businessDate);
        this.lastF12RowsHtml = null;
        this.lastF12Paginator = null;
        this.lastF12DetailPaginator = null;
        this.lastF12DetailRowCount = null;
        this.lastF12ExportRequest = null;
        this.lastF12Rows = null;
        await this.openF12Report();
    },

    async submitF12HueFilters({ businessDate }) { await this.applyF12ReportFilters('HUE', businessDate); },
    async submitF12TctFilters({ businessDate }) { await this.applyF12ReportFilters('TCT', businessDate); },

    async fetchF12OuterRows(lane) {
        const query = this.lastF12Query || buildF12ReportQuery(lane, this.lastBusinessDate);
        const response = await withRequestTimeout('report', () => this.page.request.get(`${this.baseUrl}${F12_REPORT_PATH}?${query}`, {
            headers: { ...F12_XHR_HEADERS },
            timeout: F12_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F1.2 report request returned HTTP ${status}.`, 'F12_REPORT_REQUEST_FAILED');
        }
        const { rowsHtml, paginator } = splitPayload(await response.text());
        this.lastF12RowsHtml = rowsHtml;
        this.lastF12Paginator = paginator;
        this.lastF12Rows = outerDataRows(rowsHtml);
        return this.lastF12Rows;
    },

    // Reads the export form the portal returned inside `html` (observed, never inferred) and keeps it
    // as the request requestF12Export() will fire. Returns the identity only when the form matches.
    readF12ExportInfo(exportIdentity, html) {
        const wanted = `/export/${exportIdentity}/all`;
        const forms = parseExportForms(html);
        const resolved = forms.map((form) => ({ ...form, url: new URL(form.action, this.baseUrl || 'https://dkcl.vnpost.vn') }));
        const match = resolved.find((form) => form.url.pathname === wanted);
        this.lastF12ExportRequest = match
            ? { url: match.url.href, method: match.method, params: match.params, exportIdentity }
            : null;
        return {
            exportAction: match ? match.url.pathname : null,
            exportIdentity: match ? exportIdentity : null,
            formCount: forms.length,
            sampleActions: resolved.map((form) => form.url.pathname).slice(0, 5),
            exportTotal: match ? parseCount(match.params.Total) : null,
        };
    },

    async requestF12Export(expectedIdentity, laneLabel) {
        const request = this.lastF12ExportRequest;
        if (!request?.url || request.exportIdentity !== expectedIdentity) {
            throw portalError(`F1.2 ${laneLabel} export control is not uniquely ready.`, 'EXPORT_CONTROL_NOT_READY');
        }
        const response = await withRequestTimeout('export', () => this.page.request.fetch(request.url, {
            method: request.method || 'GET',
            params: request.params || {},
            headers: { ...F12_XHR_HEADERS },
            timeout: F12_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F1.2 ${laneLabel} export request returned HTTP ${status}.`, 'EXPORT_REQUEST_FAILED');
        }
        await this.page.waitForTimeout(1000);
    },

    async readF12HueOuterSummary() {
        const rows = await this.fetchF12OuterRows('HUE');
        const totals = readTotals(rows);
        if (!totals) {
            await this.captureF41Diagnostics?.({ businessDate: this.lastBusinessDate, reason: 'F12_HUE_OUTER_SUMMARY_NOT_FOUND' });
            throw portalError('F1.2 HUE outer summary (grand-total row) was not found.', 'F12_OUTER_SUMMARY_NOT_FOUND');
        }
        return { outerRowCount: rows.length, ...totals, detailIdentity: F12_HUE_DETAIL_IDENTITY };
    },

    // The TCT screen is paged (50 rows); the grand-total row is first on page 1 and the export carries
    // every row, so the export's own Total is what is reported.
    async readF12TctOuterSummary() {
        const rows = await this.fetchF12OuterRows('TCT');
        const totals = readTotals(rows);
        const info = this.readF12ExportInfo(F12_TCT_EXPORT_IDENTITY, this.lastF12Paginator);
        if (!totals) {
            await this.captureF41Diagnostics?.({ businessDate: this.lastBusinessDate, reason: 'F12_TCT_OUTER_SUMMARY_NOT_FOUND' });
            throw portalError('F1.2 TCT outer summary (grand-total row) was not found.', 'F12_OUTER_SUMMARY_NOT_FOUND');
        }
        return {
            outerRowCount: rows.length,
            ...totals,
            exportIdentity: info.exportIdentity,
            exportAction: info.exportAction,
            exportTotal: info.exportTotal,
        };
    },

    // The XHR equivalent of clicking the BD10 count of the HUE summary: requests the detail table with
    // the observed parameter set, the total being the summary's own (iTotal). When the portal's own
    // `tr.tongquan_params` markup is present, its store must equal the expected store.
    async openF12HueDetailTable() {
        const total = this.lastF12Rows?.[0]?.[F12_CELL.BD10_CLOSED];
        if (!total) throw portalError('F1.2 HUE detail needs the verified summary first.', 'F12_DETAIL_TABLE_NOT_OPENED');
        const anchor = parseOuterRows(this.lastF12RowsHtml).find((row) => /\btongquan_params\b/.test(row.attributes.class || ''));
        if (anchor) {
            const store = anchor.attributes['data-store'] || '';
            if (store && store !== F12_HUE_DETAIL_IDENTITY) {
                throw portalError(`F1.2 HUE detail store is ${store}, expected ${F12_HUE_DETAIL_IDENTITY}.`, 'F12_DETAIL_IDENTITY_MISMATCH');
            }
            const url = anchor.attributes['data-url'];
            if (url && new URL(url, this.baseUrl).pathname !== F12_DETAIL_PATH) {
                throw portalError(`F1.2 HUE detail endpoint ${url} is not the expected portal detail path.`, 'F12_DETAIL_ENDPOINT_UNEXPECTED');
            }
        }
        const query = buildF12HueDetailQuery(this.lastBusinessDate, parseCount(total));
        const response = await withRequestTimeout('detail', () => this.page.request.get(`${this.baseUrl}${F12_DETAIL_PATH}?${query}`, {
            headers: { ...F12_XHR_HEADERS },
            timeout: F12_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F1.2 HUE detail request returned HTTP ${status}.`, 'F12_DETAIL_REQUEST_FAILED');
        }
        const { rowsHtml, paginator } = splitPayload(await response.text());
        this.lastF12DetailPaginator = paginator;
        this.lastF12DetailRowCount = parseOuterRows(rowsHtml).filter((row) => row.cells.length > 0).length;
        return { value: parseCount(total), detailRowCount: this.lastF12DetailRowCount, store: F12_HUE_DETAIL_IDENTITY };
    },

    // HUE exports from the DETAIL table's own form (the summary export would be the per-BC aggregate).
    async requestF12HueExport() {
        const detail = await this.openF12HueDetailTable();
        const info = this.readF12ExportInfo(F12_HUE_DETAIL_IDENTITY, this.lastF12DetailPaginator);
        if (info.exportIdentity !== F12_HUE_DETAIL_IDENTITY) {
            throw portalError(`F1.2 HUE detail export form (${F12_HUE_DETAIL_EXPORT_ACTION}) was not found in the detail response.`, 'F12_DETAIL_EXPORT_FORM_NOT_FOUND');
        }
        if (info.exportTotal !== detail.value) {
            throw portalError(`F1.2 HUE detail export covers ${info.exportTotal} rows, the verified summary says ${detail.value}.`, 'F12_DETAIL_EXPORT_TOTAL_MISMATCH');
        }
        await this.requestF12Export(F12_HUE_DETAIL_IDENTITY, 'HUE detail');
    },

    async requestF12TctExport() {
        await this.requestF12Export(F12_TCT_EXPORT_IDENTITY, 'TCT');
    },
};

module.exports = {
    methods,
    F12_REPORT_PATH,
    F12_DETAIL_PATH,
    F12_HUE_DETAIL_IDENTITY,
    F12_HUE_DETAIL_EXPORT_ACTION,
    F12_TCT_EXPORT_IDENTITY,
    F12_TCT_EXPORT_ACTION,
    F12_LANE_FILTERS,
    F12_CELL,
    buildF12ReportQuery,
    buildF12HueDetailQuery,
    outerDataRows,
    readTotals,
};
