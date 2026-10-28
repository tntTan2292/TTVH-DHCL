'use strict';

// F42-PHASE-3 - F4.2 (chat luong phat giao buu ta) portal operations for DkclHueF13PortalClient.
//
// Everything here is built from evidence observed on the real DKCL portal on 2026-10-26 (the built-in
// browser, a session with TCT scope; docs/10_TICKETS/F42-PHASE-3_MANIFEST.md Sections 3-6), never inferred:
//   - report route, the two filter profiles (GR = Buu ta; delivering province 53 or ALL) and the date
//     encodings (the report request uses MM/DD/YYYY, the detail request YYYYMMDD; both ends inclusive);
//   - the detail request sends the province UNQUOTED (stMaTinhPhat=53), iDetailReport=1, iTotal = the
//     summary's GBT count; detail store `sp_Phat_GBT_PTC_ChiTiet_V2`, postman summary export store
//     `sp_Phat_GBT_PTC_BuuTa_V2` (the same store for Hue and for the national run);
//   - the export form travels in the `template_paginator` of the response that produced the rows (the
//     mechanism F4.1, F1.1 and F1.2 proved), so the export target is read from the portal, not guessed;
//   - the generated files are listed by Quan ly tep: the HUE detail as a CSV (`/files/<id>`), the postman
//     summary as an xlsx (`/files-xlsx/<id>` or `/files/<id>`), downloaded here through the page's request
//     context (cookie jar shared, no navigation of the shared page).
// Transport mirrors F1.2: page.request XHR, HTML fragments parsed in Node (table-depth aware), which also
// makes every step unit-testable. The generic HTML helpers are reused from the F1.1 module.
//
// The methods are mixed into DkclHueF13PortalClient.prototype (see the bottom of that file). They touch
// only F4.2 state fields (lastF42*) and share nothing mutable with F1.1/F1.2/F1.3/F4.1.

const fs = require('node:fs');
const path = require('node:path');
const {
    parseOuterRows,
    parseExportForms,
    parseCount,
} = require('./f11PortalClientMethods');
const { selectNewestGeneratedFile, generatedNameMatches } = require('./dkclHueF13SyncService');

const F42_REPORT_PATH = '/kpi/chat-luong-phat-giao-buu-ta';
const F42_DETAIL_PATH = '/kpi/chat-luong-phat-giao-buu-ta-chi-tiet';
const F42_HUE_DETAIL_IDENTITY = 'sp_Phat_GBT_PTC_ChiTiet_V2';
const F42_HUE_DETAIL_EXPORT_ACTION = `/export/${F42_HUE_DETAIL_IDENTITY}/all`;
const F42_TCT_EXPORT_IDENTITY = 'sp_Phat_GBT_PTC_BuuTa_V2';
const F42_TCT_EXPORT_ACTION = `/export/${F42_TCT_EXPORT_IDENTITY}/all`;

// Observed request profiles. Both group by postman (GR = BT); the delivering province differs.
const F42_LANE_FILTERS = Object.freeze({
    HUE: Object.freeze({ TuyChonGR: 'BT', stMaTinhPhat: '53' }),
    TCT: Object.freeze({ TuyChonGR: 'BT', stMaTinhPhat: 'ALL' }),
});

// Outer-table cell positions on the SCREEN (29 cells, observed: the ajax cells sit at 13, 14, 16, 18, 20,
// 21, 23-28): 1 province, 7 postman, 13 GBT, 14 phat thanh cong, 15 rate, 16 PTC dung QD (11,5 h), 17 rate,
// 18 qua thoi gian quy dinh, 19 PKTC, 20 chuyen hoan, 21 cho chuyen hoan, 22 rate, 23 cho VTN, 24 chuyen
// tiep, 25 phat hoan, 26 loai tru, 27 GBT chua loai tru, 28 GBT chua co thong tin phat.
const F42_CELL = Object.freeze({
    PROVINCE: 1, POSTMAN: 7,
    GBT: 13, DELIVERED: 14, DELIVERED_RATE_TEXT: 15, PASSED: 16, RATE_TEXT: 17, FAILED: 18,
    NOT_ENOUGH_INFO: 28,
});
const F42_MIN_OUTER_CELLS = 29;

const F42_XHR_HEADERS = Object.freeze({ accept: '*/*', 'x-requested-with': 'XMLHttpRequest' });
const F42_REQUEST_TIMEOUT_MS = Number(process.env.DKCL_F42_REQUEST_TIMEOUT_MS) > 0
    ? Number(process.env.DKCL_F42_REQUEST_TIMEOUT_MS)
    // the national report (13 665 postmen) took about a minute to answer on 2026-10-26
    : 240000;

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
        throw portalError(`F4.2 ${label} request timed out after ${F42_REQUEST_TIMEOUT_MS} ms.`, 'F42_PORTAL_REQUEST_TIMEOUT');
    }
}

function assertIsoDate(businessDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(businessDate || ''))) {
        throw portalError('F4.2 request requires a YYYY-MM-DD business date.', 'F42_REPORT_QUERY_DATE_INVALID');
    }
}

// MM/DD/YYYY, the encoding of the report request (observed: iFrom=10%2F10%2F2026 for 10 October).
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

function buildF42ReportQuery(lane, businessDate) {
    const filters = F42_LANE_FILTERS[String(lane || '').toUpperCase()];
    if (!filters) throw portalError(`F4.2 report query has no filter profile for lane ${lane}.`, 'F42_UNSUPPORTED_LANE');
    const date = reportRequestDate(businessDate);
    return new URLSearchParams([
        ['TuyChonGR', filters.TuyChonGR],
        ['stMaHuyenPhat', ''],
        ['stMaTinhPhat', filters.stMaTinhPhat],
        ['stMaBuuCucPhat', 'NULL'],
        ['stLoaiDichVu', 'ALL'],
        ['stNhomLoaiKH', 'ALL'],
        ['stDiaBan', 'NULL'],
        ['stPhamVi', 'NULL'],
        ['stPhamViTinh', 'NULL'],
        ['iFrom', date],
        ['iTo', date],
    ]).toString();
}

// The HUE detail request, in the observed order. `total` is the summary's own GBT count (iTotal), so the
// detail set is the whole of the verified summary. The province is sent unquoted: stMaTinhPhat=53.
function buildF42HueDetailQuery(businessDate, total) {
    const date = detailRequestDate(businessDate);
    const count = Number(total);
    if (!Number.isInteger(count) || count <= 0) {
        throw portalError('F4.2 HUE detail request requires a positive summary total.', 'F42_DETAIL_TOTAL_INVALID');
    }
    return new URLSearchParams([
        ['stMaTinhPhat', '53'],
        ['stMaBuuCucPhat', 'NULL'],
        ['stMaBuuTa', 'NULL'],
        ['iFrom', date],
        ['iTo', date],
        ['stMaDichVu', 'NULL'],
        ['stNhomLoaiBuuGui', 'NULL'],
        ['stLoaiDichVu', 'NULL'],
        ['stMaLoaiBuuGui', 'NULL'],
        ['stNhomLoaiKH', 'NULL'],
        ['stDiaBan', 'NULL'],
        ['stMaKHL', 'NULL'],
        ['stKhoiLuong', 'NULL'],
        ['name_store', F42_HUE_DETAIL_IDENTITY],
        ['iDetailReport', '1'],
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

// A data row of the summary has the 29 screen cells and a numeric row number; the grand-total row has no
// province and no postman and a numeric GBT count (observed: it carries the number 1).
function outerDataRows(rowsHtml) {
    return parseOuterRows(rowsHtml)
        .map((row) => row.cells.map((cell) => cell.text))
        .filter((cells) => cells.length >= F42_MIN_OUTER_CELLS
            && (/^\d+$/.test(cells[0] || '')
                || ((cells[F42_CELL.PROVINCE] || '') === '' && (cells[F42_CELL.POSTMAN] || '') === '' && /\d/.test(cells[F42_CELL.GBT] || ''))));
}

// Grand-total row = the first outer row, which carries no province and no postman code.
function readTotals(rows) {
    const total = rows[0];
    if (!total) return null;
    if ((total[F42_CELL.PROVINCE] || '') !== '' || (total[F42_CELL.POSTMAN] || '') !== '') return null;
    return {
        totalVolume: parseCount(total[F42_CELL.GBT]),
        evaluatedVolume: parseCount(total[F42_CELL.DELIVERED]),
        passedVolume: parseCount(total[F42_CELL.PASSED]),
        failedVolume: parseCount(total[F42_CELL.FAILED]),
        notEnoughInfoVolume: parseCount(total[F42_CELL.NOT_ENOUGH_INFO]),
        rateText: total[F42_CELL.RATE_TEXT] || null,
    };
}

// The portal lists a generated file once with its name link (`/files/<id>`, the file as exported) and an
// xlsx button (`/files-xlsx/<id>`, the converted workbook). HUE reads the CSV as exported, TCT the xlsx.
function pickHref(links, format) {
    const wantXlsx = String(format).toLowerCase() === 'xlsx';
    const hit = (links || []).find((href) => (wantXlsx ? /\/files-xlsx\//i : /\/files\/\d+/i).test(href || '')
        && (wantXlsx || !/files-xlsx/i.test(href)));
    return hit || null;
}

// `<jobId>_<stamp>_..._01.csv`: the part before the `_NN` chunk number, used to detect a chunked export.
function chunkGroupKey(filename) {
    return String(filename || '').replace(/_\d{2}(\.[a-z0-9]+)$/i, '$1').replace(/\.[a-z0-9]+$/i, '');
}

// ---- methods mixed into the portal client --------------------------------------------------------

const methods = {
    async openF42Report() {
        await this.page.goto(`${this.baseUrl}${F42_REPORT_PATH}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // The F4.2 report is a table by postman with a `Ma HRM` column: its header would trip the HRM detector
        // (it treats the word HRM on a page as an HRM login prompt) and every run would stop as AUTHENTICATION_REQUIRED
        // with a valid session (seen on the first live run, 2026-10-26). Captcha / OTP / SSO words are still refused,
        // and a real login form is still caught by the login-input check below.
        await this.stopForSecurityChallenge({ allowHrm: true });
        await Promise.race([
            this.page.waitForSelector('select[name="TuyChonGR"]', { state: 'attached', timeout: 20000 }).catch(() => null),
            this.page.waitForSelector('input[name="login"], input[id="login"], input[type="password"]', { state: 'attached', timeout: 20000 }).catch(() => null),
        ]);
        if (this.page.url().includes('/login') || await this.page.locator('input[name="login"], input[id="login"], input[type="password"]').count() > 0) {
            throw portalError('AUTHENTICATION_REQUIRED: login required', 'AUTHENTICATION_REQUIRED');
        }
    },

    // Records lane + query (no navigation of the shared page beyond opening the report) and clears the
    // previous date's fragments so a failed fetch can never leave stale state behind.
    async applyF42ReportFilters(lane, businessDate) {
        this.lastBusinessDate = businessDate;
        this.lastF42Lane = String(lane).toUpperCase();
        this.lastF42Query = buildF42ReportQuery(lane, businessDate);
        this.lastF42RowsHtml = null;
        this.lastF42Paginator = null;
        this.lastF42DetailPaginator = null;
        this.lastF42DetailRowCount = null;
        this.lastF42ExportRequest = null;
        this.lastF42Rows = null;
        await this.openF42Report();
    },

    async submitF42HueFilters({ businessDate }) { await this.applyF42ReportFilters('HUE', businessDate); },
    async submitF42TctFilters({ businessDate }) { await this.applyF42ReportFilters('TCT', businessDate); },

    async fetchF42OuterRows(lane) {
        const query = this.lastF42Query || buildF42ReportQuery(lane, this.lastBusinessDate);
        const response = await withRequestTimeout('report', () => this.page.request.get(`${this.baseUrl}${F42_REPORT_PATH}?${query}`, {
            headers: { ...F42_XHR_HEADERS },
            timeout: F42_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F4.2 report request returned HTTP ${status}.`, 'F42_REPORT_REQUEST_FAILED');
        }
        const { rowsHtml, paginator } = splitPayload(await response.text());
        this.lastF42RowsHtml = rowsHtml;
        this.lastF42Paginator = paginator;
        this.lastF42Rows = outerDataRows(rowsHtml);
        return this.lastF42Rows;
    },

    // Reads the export form the portal returned inside `html` (observed, never inferred) and keeps it
    // as the request requestF42Export() will fire. Returns the identity only when the form matches.
    readF42ExportInfo(exportIdentity, html) {
        const wanted = `/export/${exportIdentity}/all`;
        const forms = parseExportForms(html);
        const resolved = forms.map((form) => ({ ...form, url: new URL(form.action, this.baseUrl || 'https://dkcl.vnpost.vn') }));
        const match = resolved.find((form) => form.url.pathname === wanted);
        this.lastF42ExportRequest = match
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

    async requestF42Export(expectedIdentity, laneLabel) {
        const request = this.lastF42ExportRequest;
        if (!request?.url || request.exportIdentity !== expectedIdentity) {
            throw portalError(`F4.2 ${laneLabel} export control is not uniquely ready.`, 'EXPORT_CONTROL_NOT_READY');
        }
        const response = await withRequestTimeout('export', () => this.page.request.fetch(request.url, {
            method: request.method || 'GET',
            params: request.params || {},
            headers: { ...F42_XHR_HEADERS },
            timeout: F42_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F4.2 ${laneLabel} export request returned HTTP ${status}.`, 'EXPORT_REQUEST_FAILED');
        }
        await this.page.waitForTimeout(1000);
    },

    async readF42HueOuterSummary() {
        const rows = await this.fetchF42OuterRows('HUE');
        const totals = readTotals(rows);
        if (!totals) {
            await this.captureF41Diagnostics?.({ businessDate: this.lastBusinessDate, reason: 'F42_HUE_OUTER_SUMMARY_NOT_FOUND' });
            throw portalError('F4.2 HUE outer summary (grand-total row) was not found.', 'F42_OUTER_SUMMARY_NOT_FOUND');
        }
        return { outerRowCount: rows.length, ...totals, detailIdentity: F42_HUE_DETAIL_IDENTITY };
    },

    // The national screen is paged and slow; the grand-total row is first and the export carries every
    // row, so the export's own Total (postman rows + the total row) is what is reported.
    async readF42TctOuterSummary() {
        const rows = await this.fetchF42OuterRows('TCT');
        const totals = readTotals(rows);
        const info = this.readF42ExportInfo(F42_TCT_EXPORT_IDENTITY, this.lastF42Paginator);
        if (!totals) {
            await this.captureF41Diagnostics?.({ businessDate: this.lastBusinessDate, reason: 'F42_TCT_OUTER_SUMMARY_NOT_FOUND' });
            throw portalError('F4.2 TCT outer summary (grand-total row) was not found.', 'F42_OUTER_SUMMARY_NOT_FOUND');
        }
        return {
            outerRowCount: rows.length,
            ...totals,
            exportIdentity: info.exportIdentity,
            exportAction: info.exportAction,
            exportTotal: info.exportTotal,
        };
    },

    // The XHR equivalent of clicking the GBT count of the HUE summary: requests the detail table with the
    // observed parameter set, the total being the summary's own (iTotal). When the portal's own
    // `tr.tongquan_params` markup is present, its store must equal the expected store.
    async openF42HueDetailTable() {
        const total = this.lastF42Rows?.[0]?.[F42_CELL.GBT];
        if (!total) throw portalError('F4.2 HUE detail needs the verified summary first.', 'F42_DETAIL_TABLE_NOT_OPENED');
        const anchor = parseOuterRows(this.lastF42RowsHtml).find((row) => /\btongquan_params\b/.test(row.attributes.class || ''));
        if (anchor) {
            const store = anchor.attributes['data-store'] || '';
            if (store && store !== F42_HUE_DETAIL_IDENTITY) {
                throw portalError(`F4.2 HUE detail store is ${store}, expected ${F42_HUE_DETAIL_IDENTITY}.`, 'F42_DETAIL_IDENTITY_MISMATCH');
            }
            const url = anchor.attributes['data-url'];
            if (url && new URL(url, this.baseUrl).pathname !== F42_DETAIL_PATH) {
                throw portalError(`F4.2 HUE detail endpoint ${url} is not the expected portal detail path.`, 'F42_DETAIL_ENDPOINT_UNEXPECTED');
            }
        }
        const query = buildF42HueDetailQuery(this.lastBusinessDate, parseCount(total));
        const response = await withRequestTimeout('detail', () => this.page.request.get(`${this.baseUrl}${F42_DETAIL_PATH}?${query}`, {
            headers: { ...F42_XHR_HEADERS },
            timeout: F42_REQUEST_TIMEOUT_MS,
        }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F4.2 HUE detail request returned HTTP ${status}.`, 'F42_DETAIL_REQUEST_FAILED');
        }
        const { rowsHtml, paginator } = splitPayload(await response.text());
        this.lastF42DetailPaginator = paginator;
        this.lastF42DetailRowCount = parseOuterRows(rowsHtml).filter((row) => row.cells.length > 0).length;
        return { value: parseCount(total), detailRowCount: this.lastF42DetailRowCount, store: F42_HUE_DETAIL_IDENTITY };
    },

    // HUE exports from the DETAIL table's own form (the postman summary export would be the aggregate).
    async requestF42HueExport() {
        const detail = await this.openF42HueDetailTable();
        const info = this.readF42ExportInfo(F42_HUE_DETAIL_IDENTITY, this.lastF42DetailPaginator);
        if (info.exportIdentity !== F42_HUE_DETAIL_IDENTITY) {
            throw portalError(`F4.2 HUE detail export form (${F42_HUE_DETAIL_EXPORT_ACTION}) was not found in the detail response.`, 'F42_DETAIL_EXPORT_FORM_NOT_FOUND');
        }
        if (info.exportTotal !== detail.value) {
            throw portalError(`F4.2 HUE detail export covers ${info.exportTotal} rows, the verified summary says ${detail.value}.`, 'F42_DETAIL_EXPORT_TOTAL_MISMATCH');
        }
        await this.requestF42Export(F42_HUE_DETAIL_IDENTITY, 'HUE detail');
    },

    async requestF42TctExport() {
        await this.requestF42Export(F42_TCT_EXPORT_IDENTITY, 'TCT');
    },

    // Polls Quan ly tep for the file generated after `requestedAt`. `format` picks the link: 'csv' = the name
    // link as exported, 'xlsx' = the xlsx button. A detail export the portal splits into chunks (`_01`,
    // `_02`...) is refused: the single-file contract was only observed for one chunk (6 466 rows).
    async pollF42GeneratedFile({ requestedAt, timeoutMs, intervalMs, match, format = 'xlsx' }) {
        const timeoutAt = Date.now() + timeoutMs;
        let lastSeen = null;
        while (Date.now() < timeoutAt) {
            await this.page.goto(`${this.baseUrl}/files`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await this.page.locator('table tbody tr').first().waitFor({ timeout: 10000 }).catch(() => {});
            const files = await this.page.evaluate(() => Array.from(document.querySelectorAll('table tbody tr')).map((tr) => {
                const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim().replace(/\s+/g, ' '));
                return {
                    filename: cells[1],
                    createdAtText: cells[3],
                    links: Array.from(tr.querySelectorAll('a')).map((a) => a.getAttribute('href')).filter(Boolean),
                };
            }));
            const normalized = files.map((file) => ({
                filename: file.filename,
                createdAtText: file.createdAtText,
                createdAt: this.parsePortalTimestamp(file.createdAtText),
                href: pickHref(file.links, format),
            }));
            lastSeen = normalized;
            const selected = selectNewestGeneratedFile(normalized, { requestedAt, match });
            if (selected?.href) {
                const key = chunkGroupKey(selected.filename);
                const siblings = normalized.filter((file) => file.filename !== selected.filename
                    && generatedNameMatches(file.filename, match)
                    && chunkGroupKey(file.filename) === key);
                if (siblings.length > 0) {
                    throw portalError(`F4.2 export was delivered in ${siblings.length + 1} chunks (${selected.filename} and ${siblings.map((f) => f.filename).join(', ')}); chunked exports are not supported.`, 'F42_EXPORT_CHUNKED');
                }
                return { ...selected, format };
            }
            await this.page.waitForTimeout(intervalMs);
        }
        this.logGeneratedFileTimeout('pollF42GeneratedFile', lastSeen, { requestedAt, match });
        return null;
    },

    // Downloads the generated file through the page's request context (shared cookie jar) and saves it as
    // `<targetDir>/<file name>`; refuses an HTTP error or an empty body.
    async downloadF42File({ file, targetDir }) {
        fs.mkdirSync(targetDir, { recursive: true });
        const url = file.href.startsWith('http') ? file.href : `${this.baseUrl}${file.href}`;
        const response = await withRequestTimeout('download', () => this.page.request.get(url, { timeout: F42_REQUEST_TIMEOUT_MS }));
        const status = typeof response?.status === 'function' ? response.status() : 0;
        if (status < 200 || status >= 300) {
            throw portalError(`F4.2 generated file download returned HTTP ${status}.`, 'F42_DOWNLOAD_FAILED');
        }
        const body = await response.body();
        if (!body || body.length === 0) throw portalError('F4.2 generated file download was empty.', 'F42_DOWNLOAD_EMPTY');
        const targetPath = path.join(targetDir, path.basename(file.filename));
        fs.writeFileSync(targetPath, body);
        return targetPath;
    },
};

module.exports = {
    methods,
    F42_REPORT_PATH,
    F42_DETAIL_PATH,
    F42_HUE_DETAIL_IDENTITY,
    F42_HUE_DETAIL_EXPORT_ACTION,
    F42_TCT_EXPORT_IDENTITY,
    F42_TCT_EXPORT_ACTION,
    F42_LANE_FILTERS,
    F42_CELL,
    buildF42ReportQuery,
    buildF42HueDetailQuery,
    outerDataRows,
    readTotals,
    pickHref,
    chunkGroupKey,
};
