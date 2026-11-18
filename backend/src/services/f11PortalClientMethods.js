'use strict';

// F11-PHASE-3 - F1.1 (toan trinh noi tinh) portal operations for DkclHueF13PortalClient.
//
// Everything here is built from evidence observed on the real DKCL portal on 2026-10-09 (Claude in
// Chrome, the PO's own session; docs/10_TICKETS/F11-PHASE-3_MANIFEST.md Section 12), never inferred:
//   - report route, the two filter profiles and the date encodings (the report request uses
//     MM/DD/YYYY, the detail request YYYYMMDD; From and To are both inclusive);
//   - detail store `sp_TT_NoiTinh_ChiTiet`, TCT export store `sp_TT_NoiTinh_Tinh`;
//   - the export form travels in the `template_paginator` of the response that produced the rows
//     (the same mechanism F4.1 proved), so the export target is read from the portal, not guessed.
// Transport mirrors F4.1 (AB-AUTH-10/13/15/17): page.request XHR sharing the page's cookie jar, never
// a navigation of the shared page. HTML fragments are parsed here in Node (table-depth aware, so
// nested detail tables never count as outer rows), which also makes every step unit-testable.
//
// The methods are mixed into DkclHueF13PortalClient.prototype (see the bottom of that file). They
// touch only F1.1 state fields (lastF11*) and share nothing mutable with F1.3/F4.1.

const F11_REPORT_PATH = '/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh';
const F11_DETAIL_PATH = '/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh-chi-tiet';
const F11_HUE_DETAIL_IDENTITY = 'sp_TT_NoiTinh_ChiTiet';
const F11_HUE_DETAIL_EXPORT_ACTION = `/export/${F11_HUE_DETAIL_IDENTITY}/all`;
const F11_TCT_EXPORT_IDENTITY = 'sp_TT_NoiTinh_Tinh';
const F11_TCT_EXPORT_ACTION = `/export/${F11_TCT_EXPORT_IDENTITY}/all`;

// Observed request profiles. HUE = group by BC, accepting and delivering province 53; TCT = group by
// Tinh, both provinces ALL. Every other filter is exactly the value the PO's own request carried.
const F11_LANE_FILTERS = Object.freeze({
    HUE: Object.freeze({ TuyChonGR: 'BC', stMaTinhChapNhan: '53', stMaTinhPhat: '53' }),
    TCT: Object.freeze({ TuyChonGR: 'TINH', stMaTinhChapNhan: 'ALL', stMaTinhPhat: 'ALL' }),
});

// Outer-table cell positions (same layout as the exported workbook, columns 1..29).
const F11_CELL = Object.freeze({
    ACCEPT_PROVINCE: 1, DELIVER_PROVINCE: 5, DELIVER_BC: 7,
    HAS_INFO: 11, PTC_NT_CH: 12, PTC_NT: 13, WITHIN_24H: 14, OVER_24H: 16, NOT_ENOUGH_INFO: 17,
    TARGET_VOLUME: 18, TARGET_PASSED: 19, TARGET_RATE_TEXT: 20, TARGET_OVER: 21,
});
const F11_MIN_OUTER_CELLS = 29;

const F11_XHR_HEADERS = Object.freeze({ accept: '*/*', 'x-requested-with': 'XMLHttpRequest' });
const F11_REQUEST_TIMEOUT_MS = Number(process.env.DKCL_F11_REQUEST_TIMEOUT_MS) > 0
    ? Number(process.env.DKCL_F11_REQUEST_TIMEOUT_MS)
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
        throw portalError(`F1.1 ${label} request timed out after ${F11_REQUEST_TIMEOUT_MS} ms.`, 'F11_PORTAL_REQUEST_TIMEOUT');
    }
}

function assertIsoDate(businessDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(businessDate || ''))) {
        throw portalError('F1.1 request requires a YYYY-MM-DD business date.', 'F11_REPORT_QUERY_DATE_INVALID');
    }
}

// MM/DD/YYYY, the encoding of the report request (observed: iFrom=10%2F07%2F2026 for 7 October).
function reportRequestDate(businessDate) {
    assertIsoDate(businessDate);
    const [year, month, day] = businessDate.split('-');
    return `${month}/${day}/${year}`;
}

// YYYYMMDD, the encoding of the detail request (observed: iFrom=20261007).
function detailRequestDate(businessDate) {
    assertIsoDate(businessDate);
    return businessDate.replace(/-/g, '');
}

function buildF11ReportQuery(lane, businessDate) {
    const filters = F11_LANE_FILTERS[String(lane || '').toUpperCase()];
    if (!filters) throw portalError(`F1.1 report query has no filter profile for lane ${lane}.`, 'F11_UNSUPPORTED_LANE');
    const date = reportRequestDate(businessDate);
    return new URLSearchParams([
        ['TuyChonGR', filters.TuyChonGR],
        ['stMaTinhChapNhan', filters.stMaTinhChapNhan],
        ['stMaBuuCucNhan', 'NULL'],
        ['stMaTinhPhat', filters.stMaTinhPhat],
        ['stMaBCKTTinhChapNhan', 'NULL'],
        ['stMaBCKTTinhPhat', 'NULL'],
        ['stMaLoaiBCKT', 'NULL'],
        ['stMaBuuCucPhat', 'NULL'],
        ['stLoaiDichVu', 'ALL'],
        ['stNhomLoaiKH', 'ALL'],
        ['iFrom', date],
        ['iTo', date],
    ]).toString();
}

// The HUE detail request, in the observed order. `total` is the summary's own total (iTotal), so the
// detail set is the whole of the verified summary.
function buildF11HueDetailQuery(businessDate, total) {
    const date = detailRequestDate(businessDate);
    const count = Number(total);
    if (!Number.isInteger(count) || count <= 0) {
        throw portalError('F1.1 HUE detail request requires a positive summary total.', 'F11_DETAIL_TOTAL_INVALID');
    }
    return new URLSearchParams([
        ['stMaTinhPhat', '53'],
        ['stMaBuuCucPhat', 'NULL'],
        ['stMaTinhChapNhan', '53'],
        ['stMaBuuCucNhan', 'NULL'],
        ['stMaBCKTTinhPhat', 'NULL'],
        ['stMaLoaiBCKT', 'NULL'],
        ['stMaBCKTTinhChapNhan', 'NULL'],
        ['iFrom', date],
        ['iTo', date],
        ['stMaDichVu', 'NULL'],
        ['stNhomLoaiBuuGui', 'NULL'],
        ['stLoaiDichVu', 'NULL'],
        ['stMaLoaiBuuGui', 'NULL'],
        ['stNhomLoaiKH', 'NULL'],
        ['stMaKHL', 'NULL'],
        ['stPhuongTien', 'NULL'],
        ['stKhoiLuong', 'NULL'],
        ['name_store', F11_HUE_DETAIL_IDENTITY],
        ['iDetailReport', '1'],
        ['iTotal', String(count)],
    ]).toString();
}

// ---- tiny, table-depth-aware HTML helpers (no DOM available in Node) ----------------------------

function decodeEntities(text) {
    return String(text ?? '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&#0*39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');
}

function stripTags(html) {
    return decodeEntities(String(html ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseAttributes(tag) {
    const attributes = {};
    const pattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let match;
    while ((match = pattern.exec(String(tag || ''))) !== null) {
        attributes[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
    }
    return attributes;
}

// Direct rows of the fragment: rows (and cells) that sit inside a nested <table> are ignored.
function parseOuterRows(html) {
    const rows = [];
    const pattern = /<(\/?)(table|tr|td|th)\b[^>]*>/gi;
    let depth = 0;
    let row = null;
    let cellStart = -1;
    let cellOpen = '';
    let match;
    while ((match = pattern.exec(String(html || ''))) !== null) {
        const closing = match[1] === '/';
        const tag = match[2].toLowerCase();
        if (tag === 'table') { depth += closing ? -1 : 1; continue; }
        if (depth > 0) continue;
        if (tag === 'tr') {
            if (!closing) row = { open: match[0], attributes: parseAttributes(match[0]), cells: [] };
            else if (row) { rows.push(row); row = null; }
        } else if (row) {
            if (!closing) { cellStart = pattern.lastIndex; cellOpen = match[0]; }
            else if (cellStart >= 0) {
                row.cells.push({ text: stripTags(html.slice(cellStart, match.index)), attributes: parseAttributes(cellOpen) });
                cellStart = -1;
            }
        }
    }
    return rows;
}

function parseExportForms(html) {
    const forms = [];
    const pattern = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let match;
    while ((match = pattern.exec(String(html || ''))) !== null) {
        const attributes = parseAttributes(match[1]);
        if (!attributes.action) continue;
        const params = {};
        const inputPattern = /<input\b[^>]*>/gi;
        let input;
        while ((input = inputPattern.exec(match[2])) !== null) {
            const inputAttributes = parseAttributes(input[0]);
            if (inputAttributes.name) params[inputAttributes.name] = inputAttributes.value ?? '';
        }
        forms.push({ action: attributes.action, method: String(attributes.method || 'GET').toUpperCase(), params });
    }
    return forms;
}

function parseCount(text) {
    const digits = String(text ?? '').replace(/[^\d]/g, '');
    return digits === '' ? 0 : Number(digits);
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

function outerDataRows(rowsHtml) {
    return parseOuterRows(rowsHtml)
        .map((row) => row.cells.map((cell) => cell.text))
        .filter((cells) => cells.length >= F11_MIN_OUTER_CELLS && /^\d+$/.test(cells[0] || ''));
}

// Grand-total row = the first outer row, which carries no province code.
function readTotals(rows) {
    const total = rows[0];
    if (!total) return null;
    if ((total[F11_CELL.ACCEPT_PROVINCE] || '') !== '' || (total[F11_CELL.DELIVER_PROVINCE] || '') !== '') return null;
    return {
        totalVolume: parseCount(total[F11_CELL.HAS_INFO]),
        ptcVolume: parseCount(total[F11_CELL.PTC_NT_CH]),
        evaluatedVolume: parseCount(total[F11_CELL.TARGET_VOLUME]),
        passedVolume: parseCount(total[F11_CELL.TARGET_PASSED]),
        failedVolume: parseCount(total[F11_CELL.TARGET_OVER]),
        rateText: total[F11_CELL.TARGET_RATE_TEXT] || null,
    };
}

// ---- methods mixed into the portal client --------------------------------------------------------

const methods = {
    async openF11Report() {
        await this.page.goto(`${this.baseUrl}${F11_REPORT_PATH}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.stopForSecurityChallenge({ allowHrm: false });
        await Promise.race([
            this.page.waitForSelector('select[name="TuyChonGR"]', { state: 'attached', timeout: 20000 }).catch(() => null),
            this.page.waitForSelector('input[name="login"], input[id="login"], input[type="password"]', { state: 'attached', timeout: 20000 }).catch(() => null),
        ]);
        if (this.page.url().includes('/login') || await this.page.locator('input[name="login"], input[id="login"], input[type="password"]').count() > 0) {
            throw portalError('AUTHENTICATION_REQUIRED: login required', 'AUTHENTICATION_REQUIRED');
        }
    },

    // Records lane + query (no navigation of the shared page, F4.1 AB-AUTH-13) and clears the previous
    // date's fragments so a failed fetch can never leave stale state behind.
    async applyF11ReportFilters(lane, businessDate) {
        this.lastBusinessDate = businessDate;
        this.lastF11Lane = String(lane).toUpperCase();
        this.lastF11Query = buildF11ReportQuery(lane, businessDate);
        this.lastF11RowsHtml = null;
        this.lastF11Paginator = null;
        this.lastF11DetailPaginator = null;
        this.lastF11DetailRowCount = null;
        this.lastF11ExportRequest = null;
        this.lastF11Rows = null;
        await this.openF11Report();
    },

    async submitF11HueFilters({ businessDate }) { await this.applyF11ReportFilters('HUE', businessDate); },
    async submitF11TctFilters({ businessDate }) { await this.applyF11ReportFilters('TCT', businessDate); },

    async fetchF11OuterRows(lane) {
        const query = this.lastF11Query || buildF11ReportQuery(lane, this.lastBusinessDate);
        const response = await withRequestTimeout('report', () => this.page.request.get(`${this.baseUrl}${F11_REPORT_PATH}?${query}`, {
            headers: { ...F11_XHR_HEADERS },
            timeout: F11_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F1.1 report request returned HTTP ${status}.`, 'F11_REPORT_REQUEST_FAILED');
        }
        const { rowsHtml, paginator } = splitPayload(await response.text());
        this.lastF11RowsHtml = rowsHtml;
        this.lastF11Paginator = paginator;
        this.lastF11Rows = outerDataRows(rowsHtml);
        return this.lastF11Rows;
    },

    // Reads the export form the portal returned inside `html` (observed, never inferred) and keeps it
    // as the request requestF11Export() will fire. Returns the identity only when the form matches.
    readF11ExportInfo(exportIdentity, html) {
        const wanted = `/export/${exportIdentity}/all`;
        const forms = parseExportForms(html);
        const resolved = forms.map((form) => ({ ...form, url: new URL(form.action, this.baseUrl || 'https://dkcl.vnpost.vn') }));
        const match = resolved.find((form) => form.url.pathname === wanted);
        this.lastF11ExportRequest = match
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

    async requestF11Export(expectedIdentity, laneLabel) {
        const request = this.lastF11ExportRequest;
        if (!request?.url || request.exportIdentity !== expectedIdentity) {
            throw portalError(`F1.1 ${laneLabel} export control is not uniquely ready.`, 'EXPORT_CONTROL_NOT_READY');
        }
        const response = await withRequestTimeout('export', () => this.page.request.fetch(request.url, {
            method: request.method || 'GET',
            params: request.params || {},
            headers: { ...F11_XHR_HEADERS },
            timeout: F11_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F1.1 ${laneLabel} export request returned HTTP ${status}.`, 'EXPORT_REQUEST_FAILED');
        }
        await this.page.waitForTimeout(1000);
    },

    async readF11HueOuterSummary() {
        const rows = await this.fetchF11OuterRows('HUE');
        const totals = readTotals(rows);
        if (!totals) {
            await this.captureF41Diagnostics?.({ businessDate: this.lastBusinessDate, reason: 'F11_HUE_OUTER_SUMMARY_NOT_FOUND' });
            throw portalError('F1.1 HUE outer summary (grand-total row) was not found.', 'F11_OUTER_SUMMARY_NOT_FOUND');
        }
        return { outerRowCount: rows.length, ...totals, detailIdentity: F11_HUE_DETAIL_IDENTITY };
    },

    async readF11TctOuterSummary() {
        const rows = await this.fetchF11OuterRows('TCT');
        const totals = readTotals(rows);
        const info = this.readF11ExportInfo(F11_TCT_EXPORT_IDENTITY, this.lastF11Paginator);
        if (!totals) {
            await this.captureF41Diagnostics?.({ businessDate: this.lastBusinessDate, reason: 'F11_TCT_OUTER_SUMMARY_NOT_FOUND' });
            throw portalError('F1.1 TCT outer summary (grand-total row) was not found.', 'F11_OUTER_SUMMARY_NOT_FOUND');
        }
        return {
            outerRowCount: rows.length,
            ...totals,
            exportIdentity: info.exportIdentity,
            exportAction: info.exportAction,
            exportTotal: info.exportTotal,
        };
    },

    // The XHR equivalent of clicking the grand-total cell of the HUE summary: requests the detail
    // table with the observed parameter set, the total being the summary's own (iTotal). When the
    // portal's own `tr.tongquan_params` markup is present, its store must equal the expected store.
    async openF11HueDetailTable() {
        const total = this.lastF11Rows?.[0]?.[F11_CELL.HAS_INFO];
        if (!total) throw portalError('F1.1 HUE detail needs the verified summary first.', 'F11_DETAIL_TABLE_NOT_OPENED');
        const anchor = parseOuterRows(this.lastF11RowsHtml).find((row) => /\btongquan_params\b/.test(row.attributes.class || ''));
        if (anchor) {
            const store = anchor.attributes['data-store'] || '';
            if (store && store !== F11_HUE_DETAIL_IDENTITY) {
                throw portalError(`F1.1 HUE detail store is ${store}, expected ${F11_HUE_DETAIL_IDENTITY}.`, 'F11_DETAIL_IDENTITY_MISMATCH');
            }
            const url = anchor.attributes['data-url'];
            if (url && new URL(url, this.baseUrl).pathname !== F11_DETAIL_PATH) {
                throw portalError(`F1.1 HUE detail endpoint ${url} is not the expected portal detail path.`, 'F11_DETAIL_ENDPOINT_UNEXPECTED');
            }
        }
        const query = buildF11HueDetailQuery(this.lastBusinessDate, parseCount(total));
        const response = await withRequestTimeout('detail', () => this.page.request.get(`${this.baseUrl}${F11_DETAIL_PATH}?${query}`, {
            headers: { ...F11_XHR_HEADERS },
            timeout: F11_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F1.1 HUE detail request returned HTTP ${status}.`, 'F11_DETAIL_REQUEST_FAILED');
        }
        const { rowsHtml, paginator } = splitPayload(await response.text());
        this.lastF11DetailPaginator = paginator;
        this.lastF11DetailRowCount = parseOuterRows(rowsHtml).filter((row) => row.cells.length > 0).length;
        return { value: parseCount(total), detailRowCount: this.lastF11DetailRowCount, store: F11_HUE_DETAIL_IDENTITY };
    },

    // HUE exports from the DETAIL table's own form (the summary export would be the per-BC aggregate).
    async requestF11HueExport() {
        const detail = await this.openF11HueDetailTable();
        const info = this.readF11ExportInfo(F11_HUE_DETAIL_IDENTITY, this.lastF11DetailPaginator);
        if (info.exportIdentity !== F11_HUE_DETAIL_IDENTITY) {
            throw portalError(`F1.1 HUE detail export form (${F11_HUE_DETAIL_EXPORT_ACTION}) was not found in the detail response.`, 'F11_DETAIL_EXPORT_FORM_NOT_FOUND');
        }
        if (info.exportTotal !== detail.value) {
            throw portalError(`F1.1 HUE detail export covers ${info.exportTotal} rows, the verified summary says ${detail.value}.`, 'F11_DETAIL_EXPORT_TOTAL_MISMATCH');
        }
        await this.requestF11Export(F11_HUE_DETAIL_IDENTITY, 'HUE detail');
    },

    async requestF11TctExport() {
        await this.requestF11Export(F11_TCT_EXPORT_IDENTITY, 'TCT');
    },
};

module.exports = {
    methods,
    F11_REPORT_PATH,
    F11_DETAIL_PATH,
    F11_HUE_DETAIL_IDENTITY,
    F11_HUE_DETAIL_EXPORT_ACTION,
    F11_TCT_EXPORT_IDENTITY,
    F11_TCT_EXPORT_ACTION,
    F11_LANE_FILTERS,
    F11_CELL,
    buildF11ReportQuery,
    buildF11HueDetailQuery,
    parseOuterRows,
    parseExportForms,
    parseAttributes,
    stripTags,
    outerDataRows,
    readTotals,
    parseCount,
};
