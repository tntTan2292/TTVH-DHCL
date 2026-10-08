'use strict';

// F41-DASHBOARD-RANKING-01 (T1/T2) - F4.1 counterpart of the F1.3 Operation
// Dashboard / BCVH Ranking read services (Design of Record Section 4).
//
// * overview / weeks / weekly-comparison / weekly-trend / months /
//   monthly-comparison reuse the F1.3 BcvhOverviewService and
//   BcvhWeeklyComparisonService unchanged, handing them the F4.1 repository
//   and the F4.1 national-rank service (both constructor-injected).
// * summary / daily-trend / single-day ranking are implemented here with the
//   same field names as their F1.3 twins for every field the screens read.
//
// F4.1 semantics (PO-1/PO-2/DC-6): volume = every row, passed =
// danh_gia_co_tms_ptc_8h = 'Đạt', blank evaluations stay in the denominator.
// The module total (summary, daily-trend) covers the whole table; ranking,
// overview and weekly/monthly cover the 6 canonical BCVH only (PO-6, DC-7), so
// the six-unit total (e.g. 60,97%) is legitimately not the module total (60,98%).

const { factF41Repository } = require('../repositories/FactF41Repository');
const { f41NationalRankService } = require('./F41NationalRankService');
const { BcvhOverviewService } = require('./bcvhOverviewService');
const { BcvhWeeklyComparisonService } = require('./bcvhWeeklyComparisonService');
const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');

const CANONICAL_CODES = CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh);
const CANONICAL_SET = new Set(CANONICAL_CODES);

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

function monthStartOf(dateStr) {
    return `${dateStr.slice(0, 7)}-01`;
}

// Same-day-of-month window in the previous calendar month, clamped to its last day.
function previousMonthComparablePeriod(dateStr) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    const previousMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0)).getUTCDate();
    const day = Math.min(date.getUTCDate(), lastDay);
    return {
        start: previousMonth.toISOString().slice(0, 10),
        end: new Date(Date.UTC(previousMonth.getUTCFullYear(), previousMonth.getUTCMonth(), day)).toISOString().slice(0, 10),
    };
}

function rate1(part, total) {
    if (!total) return 0;
    return Number(((part / total) * 100).toFixed(1));
}

function rate2(part, total) {
    if (!total) return 0;
    return Number(((part / total) * 100).toFixed(2));
}

function nullableDelta(curPassed, curTotal, prevPassed, prevTotal) {
    if (!curTotal || !prevTotal) return null;
    return Number((rate1(curPassed, curTotal) - rate1(prevPassed, prevTotal)).toFixed(2));
}

function codedError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function indexByBcvh(rows = []) {
    return rows.reduce((acc, row) => {
        acc[row.ma_bcvh] = row;
        return acc;
    }, {});
}

// Competition ranking (equal rate+volume share a rank), matching F1.3's SQL RANK().
function rankRows(rows) {
    const sorted = [...rows].sort((a, b) => {
        const delta = (b.dat_kpi_2026 / b.sl_bg_ptc) - (a.dat_kpi_2026 / a.sl_bg_ptc);
        if (delta !== 0) return delta;
        return b.sl_bg_ptc - a.sl_bg_ptc;
    });
    const ranks = {};
    let previousKey = null;
    let previousRank = null;
    sorted.forEach((row, index) => {
        const key = `${row.dat_kpi_2026 / row.sl_bg_ptc}|${row.sl_bg_ptc}`;
        if (key !== previousKey) previousRank = index + 1;
        ranks[row.ma_bcvh] = previousRank;
        previousKey = key;
    });
    return ranks;
}

function rankMovement(currentRank, comparisonRank) {
    if (!currentRank || !comparisonRank) {
        return { comparison_rank: comparisonRank ?? null, delta: null, direction: 'unavailable' };
    }
    const direction = currentRank < comparisonRank ? 'improved' : currentRank > comparisonRank ? 'declined' : 'unchanged';
    return { comparison_rank: comparisonRank, delta: comparisonRank - currentRank, direction };
}

function comparisonBlock(currentRow, comparisonRow, comparisonRank) {
    const currentVolume = Number(currentRow?.sl_bg_ptc || 0);
    const has = comparisonRow !== undefined && comparisonRow !== null;
    const volume = has ? Number(comparisonRow.sl_bg_ptc || 0) : null;
    const passed = has ? Number(comparisonRow.dat_kpi_2026 || 0) : null;
    return {
        volume,
        f1_3_rate: has ? rate1(passed, volume) : null,
        volume_delta: has ? currentVolume - volume : null,
        comparison_rank: comparisonRank ?? null,
    };
}

function totalComparisonBlock(currentTotals, comparisonRows, canonicalCount) {
    const currentVolume = Number(currentTotals.sl_bg_ptc || 0);
    const currentPassed = Number(currentTotals.dat_kpi_2026 || 0);
    const currentRate = currentVolume > 0 ? rate1(currentPassed, currentVolume) : null;
    const coverage = comparisonRows.length;
    if (coverage === 0) {
        return {
            volume: null, f1_3_rate: null, volume_delta: null, rate_delta: null,
            coverage: { available_rows: 0, canonical_total: canonicalCount, is_partial: false, is_complete: false },
        };
    }
    const complete = coverage === canonicalCount;
    const volume = comparisonRows.reduce((sum, row) => sum + Number(row.sl_bg_ptc || 0), 0);
    const passed = comparisonRows.reduce((sum, row) => sum + Number(row.dat_kpi_2026 || 0), 0);
    const comparisonRate = complete ? rate1(passed, volume) : null;
    return {
        volume: complete ? volume : null,
        f1_3_rate: comparisonRate,
        volume_delta: complete ? currentVolume - volume : null,
        rate_delta: complete && currentRate !== null ? Number((currentRate - comparisonRate).toFixed(2)) : null,
        coverage: { available_rows: coverage, canonical_total: canonicalCount, is_partial: coverage < canonicalCount, is_complete: complete },
    };
}

function sumRows(rows) {
    return rows.reduce((acc, row) => {
        acc.sl_bg_ptc += Number(row.sl_bg_ptc || 0);
        acc.dat_kpi_2026 += Number(row.dat_kpi_2026 || 0);
        acc.khong_dat_kpi_2026 += Number(row.khong_dat_kpi_2026 || 0);
        return acc;
    }, { sl_bg_ptc: 0, dat_kpi_2026: 0, khong_dat_kpi_2026: 0 });
}

class F41RankingService {
    constructor({ repository = factF41Repository, nationalRankService = f41NationalRankService, now } = {}) {
        this.repository = repository;
        this.nationalRankService = nationalRankService;
        this.overviewService = new BcvhOverviewService({ repository, dashboardService: nationalRankService, ...(now ? { now } : {}) });
        this.weeklyService = new BcvhWeeklyComparisonService({ repository, dashboardService: nationalRankService });
    }

    _validateRange(fromDate, toDate) {
        if (!isIsoDate(fromDate) || !isIsoDate(toDate)) {
            throw codedError('INVALID_DATE', 'from_date and to_date must be valid ISO dates in YYYY-MM-DD format');
        }
        if (fromDate > toDate) {
            throw codedError('INVALID_RANGE', 'from_date must be less than or equal to to_date');
        }
    }

    // ---- reused F1.3 services -------------------------------------------------
    getOverview(anchorDate) { return this.overviewService.getOverview(anchorDate); }
    listWeeks() { return this.weeklyService.listWeeks(); }
    compareWeeks(week, compareWeek) { return this.weeklyService.compareWeeks(week, compareWeek); }
    trendWeeks(week, options) { return this.weeklyService.trendWeeks(week, options); }
    listMonths() { return this.weeklyService.listMonths(); }
    compareMonths(month, compareMonth, options) { return this.weeklyService.compareMonths(month, compareMonth, options); }

    // ---- summary (KPI cards) --------------------------------------------------
    _comparisonMetric(current, previous) {
        const curTotal = Number(current?.total_rows || 0);
        const prevTotal = Number(previous?.total_rows || 0);
        if (!curTotal || !prevTotal) return { available: false, pass_rate: null, total_volume: null };
        const curRate = rate1(Number(current.total_passed || 0), curTotal);
        const prevRate = rate1(Number(previous.total_passed || 0), prevTotal);
        return {
            available: true,
            pass_rate: { current: curRate, previous: prevRate, delta: Number((curRate - prevRate).toFixed(2)) },
            total_volume: { current: curTotal, previous: prevTotal, delta: curTotal - prevTotal },
        };
    }

    async getSummary(fromDate, toDate, filters = {}) {
        this._validateRange(fromDate, toDate);
        const bcvhId = filters.bcvhId || null;
        if (bcvhId && !CANONICAL_SET.has(bcvhId)) throw codedError('INVALID_BCVH', 'Mã BCVH không hợp lệ.');

        const previousDay = shiftDate(toDate, -1);
        const previousWeek = shiftDate(toDate, -7);
        const nationalRankOrNull = async () => {
            try {
                return await this.nationalRankService.getNationalRankSummary(fromDate, toDate);
            } catch {
                return null;
            }
        };
        const [metrics, current, d1, d7, nationalRank] = await Promise.all([
            this.repository.getKpiMetrics(fromDate, toDate, { bcvhId }),
            this.repository.getKpiMetrics(toDate, toDate, { bcvhId }),
            this.repository.getKpiMetrics(previousDay, previousDay, { bcvhId }),
            this.repository.getKpiMetrics(previousWeek, previousWeek, { bcvhId }),
            bcvhId ? Promise.resolve(null) : nationalRankOrNull(),
        ]);

        const total = Number(metrics?.total_rows || 0);
        const passed = Number(metrics?.total_passed || 0);
        // PO 2026-10-08: rows without an evaluation are in the denominator and count as Không đạt;
        // the blank count stays available as total_blank for the later Evidence module.
        const failed = total - passed;
        return {
            total_bg: total,
            total_passed: passed,
            total_failed: failed,
            total_unknown: 0,
            total_blank: Number(metrics?.total_blank || 0),
            passed_rate: rate2(passed, total),
            failed_rate: rate2(failed, total),
            national_rank: nationalRank,
            comparisons: {
                current_date: toDate,
                d1: { ...this._comparisonMetric(current, d1), current_date: toDate, previous_date: previousDay },
                d7: { ...this._comparisonMetric(current, d7), current_date: toDate, previous_date: previousWeek },
            },
        };
    }

    // ---- daily trend ----------------------------------------------------------
    async getDailyTrend(fromDate, toDate, filters = {}) {
        this._validateRange(fromDate, toDate);
        const bcvhId = filters.bcvhId && filters.bcvhId !== 'all' ? filters.bcvhId : null;
        if (bcvhId && !CANONICAL_SET.has(bcvhId)) throw codedError('INVALID_BCVH', 'Mã BCVH không hợp lệ.');

        const [latestImport, rows] = await Promise.all([
            this.repository.getLatestImportMeta(),
            this.repository.getDailyTrendData(fromDate, toDate, { bcvhId }),
        ]);
        const items = rows.map((row) => ({
            date: row.date,
            total_volume: Number(row.total_volume || 0),
            passed: Number(row.passed || 0),
            failed: Number(row.failed || 0),
            quality_rate: row.quality_rate === null || row.quality_rate === undefined ? null : Number(row.quality_rate),
            data_available: Number(row.data_available || 0) === 1,
        }));

        let enriched = items;
        if (!bcvhId) {
            let ranks = {};
            try {
                ranks = await this.nationalRankService.getNationalRanksForDates(
                    items.filter((item) => item.data_available).map((item) => item.date)
                );
            } catch {
                ranks = {};
            }
            enriched = items.map((item) => ({
                ...item,
                national_rank: item.data_available
                    ? ranks[item.date] || this.nationalRankService.unavailableForDate(item.date)
                    : null,
            }));
        }

        return {
            meta: {
                from_date: fromDate,
                to_date: toDate,
                interval: 'daily',
                record_count: enriched.length,
                latest_import: latestImport?.ngay_do_kiem || null,
                data_freshness: latestImport?.created_at || null,
                filters: { bcvh_id: bcvhId },
            },
            items: enriched,
        };
    }

    // ---- single-day / range BCVH ranking -------------------------------------
    // Rows always come back in rank order (best first), exactly like the F1.3 endpoint, which accepts
    // sort/order but orders by rank; the UI sorts the page client-side.
    async getBcvhRanking(fromDate, toDate, page = 1, pageSize = 20) {
        this._validateRange(fromDate, toDate);
        const monthStart = monthStartOf(toDate);
        const previousMonth = previousMonthComparablePeriod(toDate);
        const yesterday = shiftDate(toDate, -1);
        const weekAgo = shiftDate(toDate, -7);

        const repo = this.repository;
        const current = await repo.getBcvhOperationMetricsBetween(fromDate, toDate, CANONICAL_CODES);
        const hasData = current.length > 0;
        const [yesterdayRows, weekAgoRows, mtdRows, previousMtdRows] = await Promise.all([
            repo.getBcvhOperationMetricsBetween(yesterday, yesterday, CANONICAL_CODES),
            repo.getBcvhOperationMetricsBetween(weekAgo, weekAgo, CANONICAL_CODES),
            hasData ? repo.getBcvhOperationMetricsBetween(monthStart, toDate, CANONICAL_CODES) : Promise.resolve([]),
            hasData ? repo.getBcvhOperationMetricsBetween(previousMonth.start, previousMonth.end, CANONICAL_CODES) : Promise.resolve([]),
        ]);

        const yesterdayMap = indexByBcvh(yesterdayRows);
        const weekAgoMap = indexByBcvh(weekAgoRows);
        const mtdMap = indexByBcvh(mtdRows);
        const previousMtdMap = indexByBcvh(previousMtdRows);
        const ranks = rankRows(current);
        const yesterdayRanks = rankRows(yesterdayRows);
        const weekAgoRanks = rankRows(weekAgoRows);

        const data = current.map((row) => {
            const volume = Number(row.sl_bg_ptc || 0);
            const passed = Number(row.dat_kpi_2026 || 0);
            const failed = Number(row.khong_dat_kpi_2026 || 0);
            const mtd = mtdMap[row.ma_bcvh];
            const prevMtd = previousMtdMap[row.ma_bcvh];
            const rank = ranks[row.ma_bcvh];
            return {
                ma_bcvh: row.ma_bcvh,
                ten_bcvh: row.ten_bcvh,
                total_bg: volume,
                passed_rate: rate1(passed, volume),
                total_failed: failed,
                sl_bg_ptc: volume,
                dat_kpi_2026: passed,
                khong_dat_kpi_2026: failed,
                kpi_2026: rate1(passed, volume),
                kpi_2026_dod: nullableDelta(passed, volume, yesterdayMap[row.ma_bcvh]?.dat_kpi_2026 ?? 0, yesterdayMap[row.ma_bcvh]?.sl_bg_ptc ?? 0),
                kpi_2026_swc: nullableDelta(passed, volume, weekAgoMap[row.ma_bcvh]?.dat_kpi_2026 ?? 0, weekAgoMap[row.ma_bcvh]?.sl_bg_ptc ?? 0),
                month_to_date_sl_bg_ptc: mtd?.sl_bg_ptc ?? null,
                month_to_date_dat_kpi_2026: mtd?.dat_kpi_2026 ?? null,
                month_to_date_khong_dat_kpi_2026: mtd?.khong_dat_kpi_2026 ?? null,
                month_to_date_kpi_2026: mtd ? rate1(mtd.dat_kpi_2026, mtd.sl_bg_ptc) : null,
                previous_month_to_date_sl_bg_ptc: prevMtd?.sl_bg_ptc ?? null,
                previous_month_to_date_dat_kpi_2026: prevMtd?.dat_kpi_2026 ?? null,
                previous_month_to_date_kpi_2026: prevMtd ? rate1(prevMtd.dat_kpi_2026, prevMtd.sl_bg_ptc) : null,
                comparisons: {
                    d1: {
                        ...comparisonBlock(row, yesterdayMap[row.ma_bcvh], yesterdayRanks[row.ma_bcvh]),
                        rank_movement: rankMovement(rank, yesterdayRanks[row.ma_bcvh]),
                    },
                    d7: {
                        ...comparisonBlock(row, weekAgoMap[row.ma_bcvh], weekAgoRanks[row.ma_bcvh]),
                        rank_movement: rankMovement(rank, weekAgoRanks[row.ma_bcvh]),
                    },
                },
                rank,
            };
        });

        data.sort((a, b) => (a.rank - b.rank) || (b.sl_bg_ptc - a.sl_bg_ptc));

        const totalCurrent = sumRows(current);
        const totalMtd = sumRows(mtdRows);
        const totalPrevMtd = sumRows(previousMtdRows);
        const totalYesterday = sumRows(yesterdayRows);
        const totalWeekAgo = sumRows(weekAgoRows);
        const totalRow = {
            ten_bcvh: 'TỔNG CỘNG',
            sl_bg_ptc: totalCurrent.sl_bg_ptc,
            dat_kpi_2026: totalCurrent.dat_kpi_2026,
            khong_dat_kpi_2026: totalCurrent.khong_dat_kpi_2026,
            kpi_2026: rate1(totalCurrent.dat_kpi_2026, totalCurrent.sl_bg_ptc),
            month_to_date_sl_bg_ptc: hasData ? totalMtd.sl_bg_ptc : null,
            month_to_date_dat_kpi_2026: hasData ? totalMtd.dat_kpi_2026 : null,
            month_to_date_khong_dat_kpi_2026: hasData ? totalMtd.khong_dat_kpi_2026 : null,
            month_to_date_kpi_2026: hasData ? rate1(totalMtd.dat_kpi_2026, totalMtd.sl_bg_ptc) : null,
            previous_month_to_date_sl_bg_ptc: hasData ? totalPrevMtd.sl_bg_ptc : null,
            previous_month_to_date_dat_kpi_2026: hasData ? totalPrevMtd.dat_kpi_2026 : null,
            previous_month_to_date_kpi_2026: hasData ? rate1(totalPrevMtd.dat_kpi_2026, totalPrevMtd.sl_bg_ptc) : null,
            kpi_2026_dod: nullableDelta(totalCurrent.dat_kpi_2026, totalCurrent.sl_bg_ptc, totalYesterday.dat_kpi_2026, totalYesterday.sl_bg_ptc),
            kpi_2026_swc: nullableDelta(totalCurrent.dat_kpi_2026, totalCurrent.sl_bg_ptc, totalWeekAgo.dat_kpi_2026, totalWeekAgo.sl_bg_ptc),
            comparisons: {
                d1: totalComparisonBlock(totalCurrent, yesterdayRows, current.length),
                d7: totalComparisonBlock(totalCurrent, weekAgoRows, current.length),
            },
        };

        let nationalRank = null;
        try {
            const summary = await this.nationalRankService.getNationalRankSummary(fromDate, toDate);
            if (summary && summary.available && summary.rank && summary.total) {
                nationalRank = { rank: summary.rank, total: summary.total };
            }
        } catch {
            nationalRank = null;
        }

        const totalItems = data.length;
        const size = Number(pageSize) > 0 ? Number(pageSize) : 20;
        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const pageData = data.slice((pageNumber - 1) * size, pageNumber * size);

        return {
            data: pageData,
            meta: {
                total_row: totalRow,
                national_rank: nationalRank,
                date_range: { from_date: fromDate, to_date: toDate, single_day: fromDate === toDate },
                month_to_date: {
                    from_date: monthStart,
                    to_date: hasData ? toDate : null,
                    requested_to_date: toDate,
                    current_data_date: toDate,
                    used_latest_available: false,
                    available: hasData,
                },
                previous_month_to_date: {
                    from_date: hasData ? previousMonth.start : null,
                    to_date: hasData ? previousMonth.end : null,
                    available: Boolean(hasData && previousMtdRows.length),
                },
                evaluation_date: {
                    date: toDate,
                    requested_to_date: toDate,
                    used_latest_available: false,
                    available: hasData,
                },
                pagination: {
                    page: pageNumber,
                    page_size: size,
                    total_items: totalItems,
                    total_pages: Math.ceil(totalItems / size),
                },
            },
        };
    }
}

module.exports = {
    F41RankingService,
    f41RankingService: new F41RankingService(),
    CANONICAL_CODES,
};
