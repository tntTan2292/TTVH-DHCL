'use strict';

// F13-V2-STRUCTURE-01: "Bảng BCVH theo ngày" for one day or a free range (PO D1, D2).
//   So sánh (N-1): the L days right before the range;  So sánh (N-7): the same range shifted back 7 days.
// A single day (L = 1) gives exactly yesterday and the same weekday last week, i.e. the figures of the old ranking.
// Rate, delta and late-cash rules are the F13DashboardService ones (injected), so there is one definition of them.

const { CANONICAL_BCVH_UNITS } = require('../../config/canonicalBcvhUnits');
const { isRealDate } = require('./periodResolve');

const MS_PER_DAY = 86400000;
const MAX_RANGE_DAYS = 366;

function shiftIsoDate(dateString, days) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function daysInclusive(fromDate, toDate) {
    return Math.round((new Date(`${toDate}T00:00:00Z`).getTime() - new Date(`${fromDate}T00:00:00Z`).getTime()) / MS_PER_DAY) + 1;
}

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

/** The two comparison windows of a range. */
function comparisonWindows(fromDate, toDate) {
    const length = daysInclusive(fromDate, toDate);
    return {
        n1: { from_date: shiftIsoDate(fromDate, -length), to_date: shiftIsoDate(fromDate, -1) },
        n7: { from_date: shiftIsoDate(fromDate, -7), to_date: shiftIsoDate(toDate, -7) },
    };
}

class DaySummaryService {
    constructor({ repository, dashboardService } = {}) {
        if (!repository || !dashboardService) throw new Error('DaySummaryService needs a repository and a dashboard service');
        this.repository = repository;
        this.dashboard = dashboardService;
        this.codes = new Set(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh));
    }

    _canonical(rows) {
        return (rows || []).filter((row) => this.codes.has(String(row?.ma_bcvh || '')));
    }

    _index(rows) {
        const map = {};
        for (const row of this._canonical(rows)) map[row.ma_bcvh] = row;
        return map;
    }

    _compareBlock(current, previous) {
        if (!previous) return { volume: null, rate: null, volume_delta: null, rate_delta: null };
        const previousVolume = Number(previous.sl_bg_ptc || 0);
        const previousPassed = Number(previous.dat_kpi_2026 || 0);
        return {
            volume: previousVolume,
            rate: this.dashboard._calculateRate(previousPassed, previousVolume),
            volume_delta: current.volume - previousVolume,
            rate_delta: this.dashboard._calculateNullableRateDelta(current.passed, current.volume, previousPassed, previousVolume),
        };
    }

    /**
     * @param {string} fromDate YYYY-MM-DD
     * @param {string} toDate YYYY-MM-DD
     * @param {{bcvhId?: string|null}} options a single BCVH to keep (already scope-checked by the controller)
     */
    async getSummary(fromDate, toDate, { bcvhId = null } = {}) {
        if (!isRealDate(fromDate) || !isRealDate(toDate)) throw fail('INVALID_DATE', 'from and to must be valid dates in YYYY-MM-DD format');
        if (fromDate > toDate) throw fail('INVALID_RANGE', 'from must be less than or equal to to');
        const days = daysInclusive(fromDate, toDate);
        if (days > MAX_RANGE_DAYS) throw fail('RANGE_TOO_LONG', `range is limited to ${MAX_RANGE_DAYS} days`);
        if (bcvhId && !this.codes.has(String(bcvhId))) throw fail('INVALID_BCVH', 'Mã BCVH không hợp lệ.');

        const windows = comparisonWindows(fromDate, toDate);
        const [currentMetrics, n1Metrics, n7Metrics, facts] = await Promise.all([
            this.repository.getBcvhOperationMetricsBetween(fromDate, toDate),
            this.repository.getBcvhOperationMetricsBetween(windows.n1.from_date, windows.n1.to_date),
            this.repository.getBcvhOperationMetricsBetween(windows.n7.from_date, windows.n7.to_date),
            this.repository.getFactBetween(fromDate, toDate),
        ]);

        const current = this._canonical(currentMetrics);
        const n1Map = this._index(n1Metrics);
        const n7Map = this._index(n7Metrics);
        const { rateMap, summaryMap } = this.dashboard._buildF13302SummaryMap(facts);

        // Rank over every BCVH of the city (rate, then volume - same order as the old ranking); the scope layer drops it
        // for a BCVH-mode account, so a unit never learns its place among the others.
        const ranked = current
            .map((row) => ({ row, ratio: Number(row.dat_kpi_2026 || 0) / Math.max(Number(row.sl_bg_ptc || 0), 1), volume: Number(row.sl_bg_ptc || 0) }))
            .sort((a, b) => b.ratio - a.ratio || b.volume - a.volume);
        const rankOf = new Map();
        ranked.forEach((entry, index) => {
            const previous = ranked[index - 1];
            const sameAsPrevious = previous && previous.ratio === entry.ratio && previous.volume === entry.volume;
            rankOf.set(entry.row.ma_bcvh, sameAsPrevious ? rankOf.get(previous.row.ma_bcvh) : index + 1);
        });

        const buildRow = (row) => {
            const volume = Number(row.sl_bg_ptc || 0);
            const passed = Number(row.dat_kpi_2026 || 0);
            const base = { volume, passed };
            return {
                ma_bcvh: row.ma_bcvh,
                ten_bcvh: row.ten_bcvh,
                rank: rankOf.get(row.ma_bcvh),
                volume,
                passed,
                failed: Number(row.khong_dat_kpi_2026 || 0),
                rate: this.dashboard._calculateRate(passed, volume),
                late_cash: {
                    count: summaryMap[row.ma_bcvh]?.delayed_cash_handover_count ?? 0,
                    rate: rateMap[row.ma_bcvh] ?? 0,
                },
                compare: {
                    n1: this._compareBlock(base, n1Map[row.ma_bcvh]),
                    n7: this._compareBlock(base, n7Map[row.ma_bcvh]),
                },
            };
        };

        const allRows = current.map(buildRow).sort((a, b) => a.rank - b.rank);
        const rows = bcvhId ? allRows.filter((row) => row.ma_bcvh === String(bcvhId)) : allRows;

        // TỔNG CỘNG = summed volume then rate, never an average of rates.
        const sumOf = (list, pick) => list.reduce((acc, item) => acc + Number(pick(item) || 0), 0);
        const keep = bcvhId ? new Set([String(bcvhId)]) : this.codes;
        const inKeep = (list) => this._canonical(list).filter((item) => keep.has(item.ma_bcvh));
        const totalVolume = sumOf(rows, (r) => r.volume);
        const totalPassed = sumOf(rows, (r) => r.passed);
        const totalOf = (metrics) => {
            const kept = inKeep(metrics);
            return { volume: sumOf(kept, (r) => r.sl_bg_ptc), passed: sumOf(kept, (r) => r.dat_kpi_2026), covered: kept.length };
        };
        const totalBlock = (metrics) => {
            const prev = totalOf(metrics);
            if (!prev.covered) return { volume: null, rate: null, volume_delta: null, rate_delta: null };
            return {
                volume: prev.volume,
                rate: this.dashboard._calculateRate(prev.passed, prev.volume),
                volume_delta: totalVolume - prev.volume,
                rate_delta: this.dashboard._calculateNullableRateDelta(totalPassed, totalVolume, prev.passed, prev.volume),
            };
        };

        return {
            rows,
            meta: {
                from_date: fromDate,
                to_date: toDate,
                days,
                has_data: current.length > 0,
                compare: windows,
                total_row: {
                    ten_bcvh: 'TỔNG CỘNG',
                    volume: totalVolume,
                    passed: totalPassed,
                    failed: sumOf(rows, (r) => r.failed),
                    rate: this.dashboard._calculateRate(totalPassed, totalVolume),
                    late_cash: { count: sumOf(rows, (r) => r.late_cash.count) },
                    compare: { n1: totalBlock(n1Metrics), n7: totalBlock(n7Metrics) },
                },
            },
        };
    }
}

module.exports = { DaySummaryService, comparisonWindows, daysInclusive, MAX_RANGE_DAYS };
