'use strict';

// F12-DASHBOARD-RANKING-01 - F1.2 (thu gom buu gui lien tinh) Operation Dashboard / Ranking read services.
//
// F1.2 has only the ACCEPTING side (PD-F12-2): the ranked unit is the accepting unit (`Tên Huyện`, 37 units
// with drill-down to its 73 accepting offices, PD-F12-8), there is no delivering BCVH and no pair table.
//
// Reuse, not copy: `F12RankingService extends F41RankingService` over `FactF12Repository` and
// `F12NationalRankService`; the shared overview / weekly / monthly services run unchanged. The only
// difference is the unit list: the six canonical BCVH are replaced, before every call, by the units found
// in the data (`FactF12Repository.getRankedUnits()`), so a new accepting unit appears without a code change.
//
// Scope (PD-F12-8): the module total (summary, daily trend, office table total row) covers every row; the
// ranking / overview / weekly / monthly cover the ranked units, i.e. everything except the large-customer
// office 531120, which is counted in the total and shown apart (office table `unranked`).
//
// New here: getOfficeTable() (unit -> offices for a day / week / month) and getCumulative12().

const { F41RankingService } = require('./F41RankingService');
const { BcvhOverviewService } = require('./bcvhOverviewService');
const { factF12Repository, LARGE_CUSTOMER_OFFICE } = require('../repositories/FactF12Repository');
const { f12NationalRankService } = require('./F12NationalRankService');
const { F12_KPI_SCOPE_NOTE, F12_TARGET_RATE } = require('../config/f12KpiScopeContract');

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

function figures(volume, passed) {
    return { volume, passed, failed: volume - passed, rate: rate2(passed, volume) };
}

// Day = the date itself; week = the Thursday-Wednesday week containing it (as F1.3); month = the calendar
// month containing it. An explicit from_date/to_date range overrides the period.
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

// Week and month are "to date": a period never reaches past the selected day (review N2), so choosing 10/10
// shows the week/month up to 10/10 and never includes later days. `period_end` keeps the natural end.
function clampToAnchor(range, anchorDate) {
    if (!range.period || range.period === 'day' || range.period === 'range' || !anchorDate) return range;
    return range.to > anchorDate ? { ...range, to: anchorDate, period_end: range.to } : range;
}

function monthEnd(monthKey) {
    const next = new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 1));
    return shiftDate(next.toISOString().slice(0, 10), -1);
}

// The 12 month keys ending at (and including) `monthKey` (YYYY-MM), oldest first.
function rollingMonths(monthKey) {
    const year = Number(monthKey.slice(0, 4));
    const month = Number(monthKey.slice(5, 7));
    const keys = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
        const date = new Date(Date.UTC(year, month - 1 - offset, 1));
        keys.push(date.toISOString().slice(0, 7));
    }
    return keys;
}

// Competition ranking (equal rate + volume share a rank), best first.
function rankByRate(rows) {
    const sorted = [...rows].sort((a, b) => {
        const delta = (b.passed / b.volume) - (a.passed / a.volume);
        if (delta !== 0) return delta;
        return b.volume - a.volume;
    });
    let previousKey = null;
    let previousRank = null;
    sorted.forEach((row, index) => {
        const key = `${row.passed / row.volume}|${row.volume}`;
        if (key !== previousKey) previousRank = index + 1;
        row.rank = previousRank;
        previousKey = key;
    });
    return sorted;
}

class F12RankingService extends F41RankingService {
    constructor({ repository = factF12Repository, nationalRankService = f12NationalRankService, now } = {}) {
        super({ repository, nationalRankService, ...(now ? { now } : {}) });
        // Office-level overview (every accepting office) for the Dashboard operations table: the same shared
        // overview service over an adapter that serves the office queries; monthly / route blocks stay empty.
        const officeAdapter = {
            getBcvhOverviewMonthly: async () => [],
            getBcvhOverviewRoutes: async () => [],
            getBcvhOverviewDaily: (anchorCeiling) => repository.getOfficeOverviewAggregate('daily', anchorCeiling),
            getBcvhOverviewMtd: (anchorCeiling) => repository.getOfficeOverviewAggregate('mtd', anchorCeiling),
        };
        // Office-level ranking (Analysis page): the F4.1 ranking over an adapter whose "unit" is the accepting office.
        this.officeRankingService = new F41RankingService({
            repository: {
                getBcvhOperationMetricsBetween: (startDate, endDate, codes) => repository.getOfficeOperationMetricsBetween(startDate, endDate, codes),
            },
            nationalRankService,
            ...(now ? { now } : {}),
        });
        this.officeOverviewService = new BcvhOverviewService({
            repository: officeAdapter,
            dashboardService: nationalRankService,
            ...(now ? { now } : {}),
        });
    }

    // Replaces the ranked unit list of this service and of the two reused services by the units in the data.
    async _syncUnits() {
        const units = (await this.repository.getRankedUnits())
            .map((unit) => ({ ma_bcvh: String(unit.ma_bcvh), ten_bcvh: unit.ten_bcvh || String(unit.ma_bcvh) }));
        const codes = units.map((unit) => unit.ma_bcvh);
        this.canonicalCodes = codes;
        this.canonicalSet = new Set(codes);
        this.overviewService.units = units;
        this.overviewService.codes = codes;
        this.overviewService.unitByCode = new Map(units.map((unit) => [unit.ma_bcvh, unit]));
        this.weeklyService.units = units;
        this.weeklyService.codes = codes;
        return units;
    }

    async getOverview(anchorDate) { await this._syncUnits(); return super.getOverview(anchorDate); }
    async listWeeks() { await this._syncUnits(); return super.listWeeks(); }
    async compareWeeks(week, compareWeek) { await this._syncUnits(); return super.compareWeeks(week, compareWeek); }
    async trendWeeks(week, options) { await this._syncUnits(); return super.trendWeeks(week, options); }
    async listMonths() { await this._syncUnits(); return super.listMonths(); }
    async compareMonths(month, compareMonth, options) { await this._syncUnits(); return super.compareMonths(month, compareMonth, options); }
    async getSummary(fromDate, toDate, filters) { await this._syncUnits(); return super.getSummary(fromDate, toDate, filters); }
    async getDailyTrend(fromDate, toDate, filters) { await this._syncUnits(); return super.getDailyTrend(fromDate, toDate, filters); }
    async getBcvhRanking(fromDate, toDate, page, pageSize) { await this._syncUnits(); return super.getBcvhRanking(fromDate, toDate, page, pageSize); }

    // Dashboard bootstrap: first/last day with data, the ranked units, the scope note and the target.
    async getDashboardMeta() {
        const [{ min_date, max_date }, units, hasLargeCustomer] = await Promise.all([
            this.repository.getMeta(),
            this._syncUnits(),
            this.repository.hasLargeCustomerRows(),
        ]);
        return {
            min_date: min_date || null,
            max_date: max_date || null,
            bcvh_units: units,
            target_rate: F12_TARGET_RATE,
            kpi_scope_note: F12_KPI_SCOPE_NOTE,
            kpi_includes_large_customer: hasLargeCustomer,
            large_customer_office: LARGE_CUSTOMER_OFFICE,
        };
    }

    // Month-to-date and day figures of EVERY accepting office (73 on 10/10), same shape as the unit overview,
    // for the Dashboard operations table. The large-customer office is a row like the others, so the table
    // total equals the module total. Only the anchor-day figures, the previous day / week-ago day and the month
    // are returned (no monthly series, no routes).
    async getOfficeOverview(anchorDate) {
        const offices = (await this.repository.getOfficeList())
            .map((office) => ({ ma_bcvh: String(office.ma_bcvh), ten_bcvh: office.ten_bcvh || String(office.ma_bcvh) }));
        const service = this.officeOverviewService;
        service.units = offices;
        service.codes = offices.map((office) => office.ma_bcvh);
        service.unitByCode = new Map(offices.map((office) => [office.ma_bcvh, office]));
        const overview = await service.getOverview(anchorDate);
        return { ...overview, monthly: [], routes: [] };
    }

    // Ranking of the accepting OFFICES for a day or a range (PO 2026-10-12: "Mã và tên bưu cục nhận tin/chấp nhận").
    // Same payload as getBcvhRanking (rank, rates, D-1 / D-7, month to date, total row, national rank). The
    // large-customer office is not ranked (PD-F12-8); it stays in the module total of the dashboards.
    async getOfficeRanking(fromDate, toDate, page = 1, pageSize = 100) {
        const list = (await this.repository.getOfficeList())
            .filter((office) => String(office.ma_bcvh) !== LARGE_CUSTOMER_OFFICE);
        const offices = list.map((office) => String(office.ma_bcvh));
        const unitOf = new Map(list.map((office) => [String(office.ma_bcvh), office.ma_huyen || null]));
        const service = this.officeRankingService;
        service.canonicalCodes = offices;
        service.canonicalSet = new Set(offices);
        const result = await service.getBcvhRanking(fromDate, toDate, page, pageSize);
        // the accepting unit of each office, so a screen can filter the offices of one unit
        return { ...result, data: result.data.map((row) => ({ ...row, ma_huyen: unitOf.get(String(row.ma_bcvh)) || null })) };
    }

    // The 34 provinces/cities ranked nationally by the accepting province.
    async getNationalRanking(fromDate, toDate) {
        this._validateRange(fromDate, toDate);
        return this.nationalRankService.getNationalRanking(fromDate, toDate);
    }

    // Accepting unit -> its accepting offices for a day, a Thursday-Wednesday week or a month. Ranked units
    // carry a rank (rate desc, then volume desc); the large-customer office sits in `unranked`, and the total
    // row covers both, so it equals the module total of the same period. Rates come from summed counts.
    async getOfficeTable({ period, anchorDate, fromDate, toDate } = {}) {
        const range = clampToAnchor(resolvePeriod({ period, anchorDate, fromDate, toDate }), anchorDate);
        const [grid, daysWithData] = await Promise.all([
            this.repository.getOfficeGrid(range.from, range.to),
            this.repository.getDaysWithData(range.from, range.to),
        ]);

        const units = new Map();
        const grand = { volume: 0, passed: 0 };
        for (const row of grid) {
            const code = row.ma_huyen || '';
            if (!units.has(code)) {
                units.set(code, { ma_huyen: code, ten_huyen: row.ten_huyen || code || '(Không rõ đơn vị)', offices: [], volume: 0, passed: 0, ranked_volume: 0, ranked_passed: 0 });
            }
            const unit = units.get(code);
            const volume = Number(row.volume || 0);
            const passed = Number(row.passed || 0);
            const isLarge = row.ma_chap_nhan === LARGE_CUSTOMER_OFFICE;
            unit.offices.push({
                ma_chap_nhan: row.ma_chap_nhan,
                ten_chap_nhan: row.ten_chap_nhan || row.ma_chap_nhan || '(Không rõ bưu cục)',
                large_customer: isLarge,
                ...figures(volume, passed),
            });
            unit.volume += volume;
            unit.passed += passed;
            if (!isLarge) {
                unit.ranked_volume += volume;
                unit.ranked_passed += passed;
            }
            grand.volume += volume;
            grand.passed += passed;
        }

        const byVolume = (a, b) => (b.volume - a.volume) || String(a.ma_chap_nhan).localeCompare(String(b.ma_chap_nhan));
        const ranked = [];
        const unranked = [];
        for (const unit of units.values()) {
            unit.offices.sort(byVolume);
            const largeOffices = unit.offices.filter((office) => office.large_customer);
            const otherOffices = unit.offices.filter((office) => !office.large_customer);
            if (otherOffices.length > 0) {
                ranked.push({
                    ma_huyen: unit.ma_huyen,
                    ten_huyen: unit.ten_huyen,
                    ...figures(unit.ranked_volume, unit.ranked_passed),
                    offices: otherOffices,
                });
            }
            if (largeOffices.length > 0) {
                unranked.push({
                    ma_huyen: unit.ma_huyen,
                    ten_huyen: unit.ten_huyen,
                    ...figures(largeOffices.reduce((s, o) => s + o.volume, 0), largeOffices.reduce((s, o) => s + o.passed, 0)),
                    offices: largeOffices,
                });
            }
        }
        const withRank = rankByRate(ranked.filter((unit) => unit.volume > 0));
        const rankOf = new Map(withRank.map((unit) => [unit.ma_huyen, unit.rank]));
        const rows = ranked
            .map((unit) => ({ ...unit, rank: rankOf.get(unit.ma_huyen) ?? null }))
            .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || (b.volume - a.volume));

        return {
            meta: {
                period: range.period,
                from_date: range.from,
                to_date: range.to,
                period_end: range.period_end || range.to,
                days_with_data: daysWithData,
                has_data: grid.length > 0,
                unit_count: rows.length,
                office_count: rows.reduce((sum, unit) => sum + unit.offices.length, 0) + unranked.reduce((sum, unit) => sum + unit.offices.length, 0),
                target_rate: F12_TARGET_RATE,
            },
            rows,
            unranked,
            total_row: { ten_huyen: 'TỔNG CỘNG', ...figures(grand.volume, grand.passed) },
        };
    }

    // Rolling 12 months ending at `month` (YYYY-MM), PD-F12-10: sums of the daily rows (PD-18). Per month:
    // module total + national rank; per ranked unit: the 12-month sum, its rank and its monthly figures.
    async getCumulative12(month) {
        if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            throw codedError('INVALID_MONTH_ID', 'month must be a valid YYYY-MM');
        }
        const keys = rollingMonths(month);
        const from = `${keys[0]}-01`;
        const to = monthEnd(month);
        const [grid, units, maxMeta, dayCounts] = await Promise.all([
            this.repository.getMonthlyUnitGrid(from, to),
            this._syncUnits(),
            this.repository.getMeta(),
            this.repository.getDaysByMonth(from, to),
        ]);
        const daysByMonth = new Map(dayCounts.map((row) => [row.month, Number(row.days_with_data || 0)]));
        const latest = maxMeta?.max_date || null;

        const monthly = new Map(keys.map((key) => [key, { volume: 0, passed: 0, days: 0 }]));
        const perUnit = new Map(units.map((unit) => [unit.ma_bcvh, { ma_bcvh: unit.ma_bcvh, ten_bcvh: unit.ten_bcvh, volume: 0, passed: 0, months: {} }]));
        for (const row of grid) {
            const volume = Number(row.volume || 0);
            const passed = Number(row.passed || 0);
            const bucket = monthly.get(row.month);
            if (!bucket) continue;
            bucket.volume += volume;
            bucket.passed += passed;
            bucket.days = daysByMonth.get(row.month) || 0;
            if (Number(row.large_customer) === 1) continue;
            const unit = perUnit.get(String(row.ma_bcvh));
            if (!unit) continue;
            unit.volume += volume;
            unit.passed += passed;
            const cell = unit.months[row.month] || { volume: 0, passed: 0 };
            cell.volume += volume;
            cell.passed += passed;
            unit.months[row.month] = cell;
        }

        const nationalFor = async (start, end) => {
            try {
                const summary = await this.nationalRankService.getNationalRankSummary(start, end);
                return summary && summary.available && summary.rank && summary.total ? { rank: summary.rank, total: summary.total } : null;
            } catch {
                return null;
            }
        };
        const months = await Promise.all(keys.map(async (key) => {
            const bucket = monthly.get(key);
            const start = `${key}-01`;
            const end = latest && latest < monthEnd(key) ? latest : monthEnd(key);
            return {
                month: key,
                ...figures(bucket.volume, bucket.passed),
                days_with_data: bucket.days,
                data_available: bucket.volume > 0,
                national_rank: bucket.volume > 0 && end >= start ? await nationalFor(start, end) : null,
            };
        }));

        const total = months.reduce((acc, item) => ({ volume: acc.volume + item.volume, passed: acc.passed + item.passed }), { volume: 0, passed: 0 });
        const rankedUnits = rankByRate([...perUnit.values()].filter((unit) => unit.volume > 0));
        const rankOf = new Map(rankedUnits.map((unit) => [unit.ma_bcvh, unit.rank]));
        const unitRows = [...perUnit.values()]
            .map((unit) => ({
                ma_bcvh: unit.ma_bcvh,
                ten_bcvh: unit.ten_bcvh,
                ...figures(unit.volume, unit.passed),
                rank: rankOf.get(unit.ma_bcvh) ?? null,
                months: Object.fromEntries(keys.map((key) => {
                    const cell = unit.months[key];
                    return [key, cell ? { volume: cell.volume, passed: cell.passed, rate: rate2(cell.passed, cell.volume) } : null];
                })),
            }))
            .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.ten_bcvh.localeCompare(b.ten_bcvh));

        const cumulativeEnd = latest && latest < to ? latest : to;
        return {
            meta: {
                month,
                from_date: from,
                to_date: to,
                months: keys,
                target_rate: F12_TARGET_RATE,
                has_data: total.volume > 0,
                unit_count: unitRows.filter((unit) => unit.volume > 0).length,
            },
            months,
            cumulative: {
                ...figures(total.volume, total.passed),
                national_rank: total.volume > 0 ? await nationalFor(from, cumulativeEnd) : null,
            },
            units: unitRows,
        };
    }
}

module.exports = {
    F12RankingService,
    f12RankingService: new F12RankingService(),
    resolvePeriod,
    rollingMonths,
};
