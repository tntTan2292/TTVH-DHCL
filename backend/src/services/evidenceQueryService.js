// F13-ROUTE-EVIDENCE-STATUS-02 Phase B1 (Design of Record R0, PO-approved 2026-09-07).
// Orchestrates `GET /f13/evidence`: status (Đạt/Không đạt/Chuyển hoàn) x period (Ngày/Kỳ tháng
// đến ngày neo) drill-down, entirely server-side (§5 kiến trúc). Additive-only — does not touch
// `F13DashboardService.js`, `GET /f13/evidence-list`, or `getEvidenceListFacts()`.
//
// §5.1 P-01..P-04 (binding): the browser never receives more than one page; the backend never
// materializes the full scope except the one bounded search-projection exception (§5.4, P-03);
// no ceiling is ever raised — the old `fetchAllEvidenceRows()`-style "walk every page and
// concatenate" model does not exist anywhere in this file.

const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const { all: defaultAll } = require('../config/db');
const { matchesSearchQuery } = require('../shared/evidenceSearchMatch');

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const VALID_PERIODS = new Set(['day', 'month_to_anchor']);
const VALID_STATUSES = new Set(['all', 'passed', 'failed', 'returned']);
const VALID_REASONS = new Set(['all', 'delayed_cash', 'other', 'unknown']);
const VALID_SORTS = new Set(['delay_hours', 'ngay_do_kiem', 'ma_bg', 'ma_tuyen']);

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// §5.4: ~3.6x the worst real scope measured while designing (55,650 rows, BCVH 533140,
// 2026-08). Never raised as a fix for real growth — see Design of Record §13 phương án D
// (an indexed, normalized search column) for the actual long-term answer if this is ever
// approached for real; raising this constant instead would just reintroduce §2's root cause
// one size class later.
const SEARCH_SCOPE_MAX_ROWS = 200000;

function isValidIsoDate(value) {
    return typeof value === 'string' && ISO_DATE_RE.test(value);
}

function clampPageSize(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
    return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

function clampPage(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.floor(n);
}

class EvidenceQueryService {
    // `repository` and `queryAnchor` are injectable exactly like `RoutePeriodService`
    // (`routePeriodService.js`) — this service is unit-testable without a real database.
    // `queryAnchor`'s default SQL is a deliberate byte-identical copy of
    // `routePeriodService.js`'s own default anchor query (§4.2/C-05: `anchor_date` must
    // resolve per BCVH, never system-wide — the exact defect class caught as `ITR3-BLOCK-01`
    // on the Tuyến Ranking side). It is duplicated rather than imported because
    // `routePeriodService.js` itself is forbidden to touch in this ticket (§9.4 Cấm chạm).
    constructor({ repository = factBuuGuiRepo, queryAnchor = null } = {}) {
        this.repository = repository;
        this.queryAnchor = queryAnchor || ((bcvh, anchorCeiling) => defaultAll(
            `SELECT MAX(ngay_do_kiem) as anchor_date, MAX(ten_bcvh) as ten_bcvh
             FROM fact_f13
             WHERE ma_bcvh = ? AND date(ngay_do_kiem) <= COALESCE(date(?), date('now', 'localtime'))`,
            [bcvh, anchorCeiling]
        ));
    }

    _emptyPayload(bcvh, period, pageSize) {
        return {
            data: [],
            meta: {
                anchor_date: null,
                bcvh: { ma_bcvh: bcvh, ten_bcvh: null },
                period: { key: period, start: null, end: null, days_in_period: 0 },
                pagination: { page: 1, page_size: pageSize, total_items: 0, total_pages: 0 },
                status_summary: { all: 0, passed: 0, failed: 0, returned: 0, identity_ok: true },
                violation_summary: { total_failed: 0, delayed_cash_count: 0, other_failed_count: 0, unknown_count: 0 },
                search: { keyword: '', active: false, matched_items: null, matched_routes: null },
                scope_guard: { scope_rows: 0, limit: SEARCH_SCOPE_MAX_ROWS, exceeded: false },
            },
        };
    }

    // §4.1: verbatim reuse of routePeriodService.js's own two period definitions
    // (`day` = [anchor_date, anchor_date]; `month_to_anchor` = [<tháng của anchor_date>-01,
    // anchor_date]) and its `monthDaysElapsed` formula (day-of-month of anchor_date) — not
    // imported, for the same "Cấm chạm" reason as `queryAnchor` above.
    _resolvePeriod(period, anchorDate) {
        if (period === 'month_to_anchor') {
            const start = `${anchorDate.slice(0, 7)}-01`;
            const daysInPeriod = Number(anchorDate.slice(8, 10));
            return { key: 'month_to_anchor', start, end: anchorDate, days_in_period: daysInPeriod };
        }
        return { key: 'day', start: anchorDate, end: anchorDate, days_in_period: 1 };
    }

    // §6.4 C-07: identity computed from the numbers the repository actually returned, never
    // assumed true — a fake repository can inject an inconsistent set in a unit test (T-B04)
    // and this must flip to false, not silently pass.
    _buildStatusSummary(counts) {
        const { all, passed, failed, returned } = counts;
        return { all, passed, failed, returned, identity_ok: all === passed + failed + returned };
    }

    _buildViolationSummary(reasonRows) {
        const byReason = Object.fromEntries((reasonRows || []).map((r) => [r.reason, Number(r.n || 0)]));
        const delayed_cash_count = byReason['Chậm nộp tiền'] || 0;
        const other_failed_count = byReason['Không đạt khác'] || 0;
        const unknown_count = byReason['Chưa xác định nguyên nhân'] || 0;
        return {
            total_failed: delayed_cash_count + other_failed_count + unknown_count,
            delayed_cash_count,
            other_failed_count,
            unknown_count,
        };
    }

    // §6.3/§6.4 C-02: total_items for the currently selected status/reason, derived from the
    // two aggregate queries already run for status_summary/violation_summary — never a
    // separate COUNT query, and never the length of the returned page.
    _resolveNonSearchTotalItems({ status, reason, statusSummary, violationSummary }) {
        if (status === 'failed') {
            const reasonCount = {
                delayed_cash: violationSummary.delayed_cash_count,
                other: violationSummary.other_failed_count,
                unknown: violationSummary.unknown_count,
            }[reason];
            return reasonCount !== undefined ? reasonCount : statusSummary.failed;
        }
        if (status === 'passed') return statusSummary.passed;
        if (status === 'returned') return statusSummary.returned;
        return statusSummary.all;
    }

    // JS-side sort over the (already keyword-narrowed, already bounded by
    // SEARCH_SCOPE_MAX_ROWS) matched projection rows — the only point in the search path where
    // sorting happens outside SQL, and only because the matched set itself only exists after
    // the JS keyword filter runs. `ma_bg` is always the tiebreaker, for the same determinism
    // reason as the repository's own SQL `ORDER BY ... , ma_bg ASC`.
    _sortProjectionRows(rows, sort, order) {
        const factor = order === 'asc' ? 1 : -1;
        const byMaBg = (a, b) => (a.ma_bg < b.ma_bg ? -1 : a.ma_bg > b.ma_bg ? 1 : 0);
        const sorted = [...rows];
        sorted.sort((a, b) => {
            if (sort === 'delay_hours') {
                const av = a.do_tre_gio;
                const bv = b.do_tre_gio;
                if (av === null && bv === null) return byMaBg(a, b);
                if (av === null) return 1; // nulls always last, regardless of direction
                if (bv === null) return -1;
                if (av !== bv) return (av - bv) * factor;
                return byMaBg(a, b);
            }
            const field = sort === 'ma_tuyen' ? 'ma_tuyen' : sort === 'ngay_do_kiem' ? 'ngay_do_kiem' : 'ma_bg';
            const av = String(a[field] || '');
            const bv = String(b[field] || '');
            if (av !== bv) return av < bv ? -1 * factor : 1 * factor;
            return byMaBg(a, b);
        });
        return sorted;
    }

    async getEvidence(rawParams = {}) {
        const bcvh = rawParams.bcvh;
        if (!bcvh) {
            const error = new Error('bcvh là tham số bắt buộc');
            error.code = 'MISSING_PARAM';
            throw error;
        }
        if (rawParams.anchor_date !== undefined && rawParams.anchor_date !== null && rawParams.anchor_date !== ''
            && !isValidIsoDate(rawParams.anchor_date)) {
            const error = new Error('anchor_date must be a valid ISO date in YYYY-MM-DD format');
            error.code = 'INVALID_DATE';
            throw error;
        }

        const period = VALID_PERIODS.has(rawParams.period) ? rawParams.period : 'day';
        const route = rawParams.route && rawParams.route !== 'all' ? rawParams.route : 'all';
        // D-OPEN-02 (PO decision, 2026-09-07): default status is "Tất cả trạng thái" — this
        // deliberately overrides the Design of Record R0's own recommended default ('failed');
        // the PO chose differently on the actual PO UI Check discussion and that decision
        // governs (F13-STANDARDIZATION-001_MANIFEST.md §64).
        const status = VALID_STATUSES.has(rawParams.status) ? rawParams.status : 'all';
        const reason = VALID_REASONS.has(rawParams.reason) ? rawParams.reason : 'all';
        const search = typeof rawParams.search === 'string' ? rawParams.search.trim() : '';
        const sort = VALID_SORTS.has(rawParams.sort) ? rawParams.sort : 'delay_hours';
        const order = rawParams.order === 'asc' ? 'asc' : 'desc';
        const page = clampPage(rawParams.page);
        const pageSize = clampPageSize(rawParams.page_size);

        const anchorCeiling = isValidIsoDate(rawParams.anchor_date) ? rawParams.anchor_date : null;
        const anchorRows = await this.queryAnchor(bcvh, anchorCeiling);
        const anchorDate = anchorRows?.[0]?.anchor_date || null;
        if (!anchorDate) {
            // §4.2: no fallback to another BCVH or another date — an explicit empty state,
            // same discipline as routePeriodService.js's own _emptyPayload.
            return this._emptyPayload(bcvh, period, pageSize);
        }
        const tenBcvh = anchorRows[0]?.ten_bcvh || null;
        const periodInfo = this._resolvePeriod(period, anchorDate);
        const scope = { bcvh, route, fromDate: periodInfo.start, toDate: periodInfo.end };

        const [statusCounts, reasonRows] = await Promise.all([
            this.repository.getEvidenceStatusSummary(scope),
            this.repository.getEvidenceReasonSummary(scope),
        ]);
        const statusSummary = this._buildStatusSummary(statusCounts);
        const violationSummary = this._buildViolationSummary(reasonRows);
        const bcvhMeta = { ma_bcvh: bcvh, ten_bcvh: tenBcvh };

        const isSearchActive = Boolean(search);

        if (!isSearchActive) {
            const totalItems = this._resolveNonSearchTotalItems({ status, reason, statusSummary, violationSummary });
            const totalPages = Math.ceil(totalItems / pageSize);
            const offset = (page - 1) * pageSize;
            const rows = totalItems > 0
                ? await this.repository.getEvidencePage({ ...scope, status, reason, sort, order, limit: pageSize, offset })
                : [];
            return {
                data: rows,
                meta: {
                    anchor_date: anchorDate,
                    bcvh: bcvhMeta,
                    period: periodInfo,
                    pagination: { page, page_size: pageSize, total_items: totalItems, total_pages: totalPages },
                    status_summary: statusSummary,
                    violation_summary: violationSummary,
                    search: { keyword: '', active: false, matched_items: null, matched_routes: null },
                    scope_guard: { scope_rows: totalItems, limit: SEARCH_SCOPE_MAX_ROWS, exceeded: false },
                },
            };
        }

        // §5.4 "Khi có từ khoá" — P-03's one permitted server-side materialization, hard-capped
        // by SEARCH_SCOPE_MAX_ROWS and reported explicitly rather than silently truncated.
        const scopeRows = await this.repository.getEvidenceScopeCount({ ...scope, status, reason });
        if (scopeRows > SEARCH_SCOPE_MAX_ROWS) {
            return {
                data: [],
                meta: {
                    anchor_date: anchorDate,
                    bcvh: bcvhMeta,
                    period: periodInfo,
                    pagination: { page, page_size: pageSize, total_items: 0, total_pages: 0 },
                    status_summary: statusSummary,
                    violation_summary: violationSummary,
                    search: { keyword: search, active: true, matched_items: null, matched_routes: null },
                    scope_guard: { scope_rows: scopeRows, limit: SEARCH_SCOPE_MAX_ROWS, exceeded: true },
                },
            };
        }

        const projectionRows = await this.repository.getEvidenceSearchProjection({ ...scope, status, reason });
        const matched = projectionRows.filter((row) => matchesSearchQuery(
            [row.ma_bg, row.ma_tuyen, row.ten_tuyen, row.ten_bcvh],
            search,
        ));
        const matchedRouteIds = new Set(matched.map((row) => row.ma_tuyen).filter(Boolean));
        const sortedMatched = this._sortProjectionRows(matched, sort, order);
        const totalItems = sortedMatched.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const offset = (page - 1) * pageSize;
        const pageIds = sortedMatched.slice(offset, offset + pageSize).map((row) => row.id);
        const rows = pageIds.length ? await this.repository.getEvidenceRowsByIds({ ids: pageIds, sort, order }) : [];

        return {
            data: rows,
            meta: {
                anchor_date: anchorDate,
                bcvh: bcvhMeta,
                period: periodInfo,
                pagination: { page, page_size: pageSize, total_items: totalItems, total_pages: totalPages },
                status_summary: statusSummary,
                violation_summary: violationSummary,
                search: { keyword: search, active: true, matched_items: totalItems, matched_routes: matchedRouteIds.size },
                scope_guard: { scope_rows: scopeRows, limit: SEARCH_SCOPE_MAX_ROWS, exceeded: false },
            },
        };
    }
}

module.exports = {
    EvidenceQueryService,
    evidenceQueryService: new EvidenceQueryService(),
    SEARCH_SCOPE_MAX_ROWS,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
};
