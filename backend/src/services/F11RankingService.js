'use strict';

// F11-DASHBOARD-RANKING-01 (T1/T2) - F1.1 Operation Dashboard / BCVH Ranking read services and the
// accepting-office x delivering-BCVH pair table.
//
// The overview / weekly / monthly / summary / daily-trend / single-day ranking logic is the F4.1
// service run over the F1.1 repository and national-rank service (both constructor-injected): the
// metric semantics are identical (PD-9: volume = every row, passed = 'Đạt', blank evaluation = 0 Đạt
// and stays in the denominator; module total over every row, ranking/overview/weekly over the 6
// canonical BCVH). Only the pair table is new.

const { F41RankingService, CANONICAL_CODES } = require('./F41RankingService');
const { factF11Repository } = require('../repositories/FactF11Repository');
const { f11NationalRankService } = require('./F11NationalRankService');
const { CANONICAL_BCVH_UNITS, buildDashboardMeta } = require('../config/canonicalBcvhUnits');
const { F11_KPI_SCOPE_NOTE } = require('../config/f11KpiScopeContract');

const OTHER_COLUMN = Object.freeze({ ma_bcvh: 'OTHER', ten_bcvh: 'Khác' });
const UNKNOWN_OFFICE = Object.freeze({ ma_chap_nhan: '', ten_chap_nhan: '(Không rõ bưu cục chấp nhận)' });
const PERIODS = new Set(['day', 'week', 'month']);

function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function shiftDate(dateStr, deltaDays) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + deltaDays);
    return date.toISOString().slice(0, 10);
}

function codedError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function rate2(part, total) {
    if (!total) return null;
    return Number(((part / total) * 100).toFixed(2));
}

function cell(volume, passed, blank) {
    return { volume, passed, failed: volume - passed, blank, rate: rate2(passed, volume) };
}

function emptyCell() {
    return { volume: 0, passed: 0, blank: 0 };
}

function addTo(target, source) {
    target.volume += source.volume;
    target.passed += source.passed;
    target.blank += source.blank;
}

// Day = the date itself; week = the Thursday-Wednesday week containing it (as F1.3); month = the
// calendar month containing it. An explicit from_date/to_date range overrides the period.
function resolvePeriod({ period, anchorDate, fromDate, toDate }) {
    if (fromDate || toDate) {
        if (!isIsoDate(fromDate) || !isIsoDate(toDate)) {
            throw codedError('INVALID_DATE', 'from_date and to_date must be valid ISO dates in YYYY-MM-DD format');
        }
        if (fromDate > toDate) throw codedError('INVALID_RANGE', 'from_date must be less than or equal to to_date');
        return { period: 'range', from: fromDate, to: toDate };
    }
    if (!PERIODS.has(period)) throw codedError('MISSING_PARAM', 'Yêu cầu period (day|week|month) cùng anchor_date, hoặc from_date và to_date');
    if (!isIsoDate(anchorDate)) throw codedError('INVALID_DATE', 'anchor_date must be a valid ISO date in YYYY-MM-DD format');
    if (period === 'day') return { period, from: anchorDate, to: anchorDate };
    if (period === 'week') {
        const dow = new Date(`${anchorDate}T00:00:00Z`).getUTCDay();
        const from = shiftDate(anchorDate, -((dow - 4 + 7) % 7));
        return { period, from, to: shiftDate(from, 6) };
    }
    const from = `${anchorDate.slice(0, 7)}-01`;
    const next = new Date(Date.UTC(Number(anchorDate.slice(0, 4)), Number(anchorDate.slice(5, 7)), 1));
    return { period, from, to: shiftDate(next.toISOString().slice(0, 10), -1) };
}

class F11RankingService extends F41RankingService {
    constructor({ repository = factF11Repository, nationalRankService = f11NationalRankService, now } = {}) {
        super({ repository, nationalRankService, ...(now ? { now } : {}) });
    }

    // Dashboard bootstrap: first/last day with data, the 6 official BCVH, the KPI scope note.
    async getDashboardMeta() {
        const { min_date, max_date } = await this.repository.getMeta();
        return {
            ...buildDashboardMeta(max_date, min_date),
            kpi_scope_note: F11_KPI_SCOPE_NOTE,
            kpi_includes_non_canonical_bcvh: await this.repository.hasNonCanonicalBcvhRows(CANONICAL_CODES),
        };
    }

    // The 34 provinces/cities ranked nationally for the Dashboard province table.
    async getNationalRanking(fromDate, toDate) {
        this._validateRange(fromDate, toDate);
        return this.nationalRankService.getNationalRanking(fromDate, toDate);
    }

    // Accepting office (rows) x delivering BCVH (columns): the six canonical BCVH plus "Khác" for every
    // other delivery code, so each row total and the grand total equal the module total of the same
    // period (PD-8, PD-13). Rates are volume-weighted from the cell counts, never averaged.
    async getPairTable({ period, anchorDate, fromDate, toDate } = {}) {
        const range = resolvePeriod({ period, anchorDate, fromDate, toDate });
        const [grid, daysWithData] = await Promise.all([
            this.repository.getPairGrid(range.from, range.to),
            this.repository.getDaysWithData(range.from, range.to),
        ]);

        const canonical = new Set(CANONICAL_CODES);
        const offices = new Map();
        const columnTotals = new Map([...CANONICAL_CODES, OTHER_COLUMN.ma_bcvh].map((code) => [code, emptyCell()]));
        const grand = emptyCell();

        for (const row of grid) {
            const key = row.ma_chap_nhan || '';
            if (!offices.has(key)) {
                offices.set(key, {
                    ma_chap_nhan: key,
                    ten_chap_nhan: row.ten_chap_nhan || (key ? key : UNKNOWN_OFFICE.ten_chap_nhan),
                    cells: new Map(),
                    total: emptyCell(),
                });
            }
            const office = offices.get(key);
            if (!office.ten_chap_nhan || office.ten_chap_nhan === key) office.ten_chap_nhan = row.ten_chap_nhan || office.ten_chap_nhan;
            const columnCode = canonical.has(row.ma_bcvh) ? row.ma_bcvh : OTHER_COLUMN.ma_bcvh;
            const part = { volume: Number(row.volume || 0), passed: Number(row.passed || 0), blank: Number(row.blank || 0) };
            if (!office.cells.has(columnCode)) office.cells.set(columnCode, emptyCell());
            addTo(office.cells.get(columnCode), part);
            addTo(office.total, part);
            addTo(columnTotals.get(columnCode), part);
            addTo(grand, part);
        }

        const columns = [...CANONICAL_BCVH_UNITS.map((unit) => ({ ma_bcvh: unit.ma_bcvh, ten_bcvh: unit.ten_bcvh })), { ...OTHER_COLUMN }];
        const render = (cells) => Object.fromEntries(columns.map((column) => {
            const value = cells.get(column.ma_bcvh);
            return [column.ma_bcvh, value && value.volume > 0 ? cell(value.volume, value.passed, value.blank) : null];
        }));

        const rows = [...offices.values()]
            .sort((a, b) => (b.total.volume - a.total.volume) || String(a.ma_chap_nhan).localeCompare(String(b.ma_chap_nhan)))
            .map((office) => ({
                ma_chap_nhan: office.ma_chap_nhan,
                ten_chap_nhan: office.ten_chap_nhan,
                cells: render(office.cells),
                total: cell(office.total.volume, office.total.passed, office.total.blank),
            }));

        return {
            meta: {
                period: range.period,
                from_date: range.from,
                to_date: range.to,
                days_with_data: daysWithData,
                has_data: grid.length > 0,
                office_count: rows.length,
            },
            columns,
            rows,
            total_row: {
                ten_chap_nhan: 'TỔNG CỘNG',
                cells: render(columnTotals),
                total: cell(grand.volume, grand.passed, grand.blank),
            },
        };
    }
}

module.exports = {
    F11RankingService,
    f11RankingService: new F11RankingService(),
    CANONICAL_CODES,
    resolvePeriod,
};
