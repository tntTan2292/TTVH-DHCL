'use strict';

// HOME-BI-01 (B1) - read model of the executive Home page: for each of F1.1 / F1.2 / F1.3 / F4.1 the current
// rate of Hue, its national rank among the 34 provinces, the gap to the indicator's own target, the change
// against the previous day, a 30-day trend, Hue's rank history, the lowest units and the 34-province table.
//
// Nothing is recomputed here: every figure comes from the same service the indicator's own dashboard uses
// (summary / daily trend / BCVH ranking), so the Home page can never disagree with those dashboards. The
// only new query is the 34-province table for F1.3 and F4.1, which reuses the generic F11NationalRankService
// with the column map of fact_f13_national / fact_f41_national (both hold exactly the 34 ranked provinces).
// Each indicator is its own measure: nothing is compared or summed across indicators.

const { F11NationalRankService, F11_RANK_SOURCE } = require('./F11NationalRankService');
const { resolvePeriod } = require('./F11RankingService');
const defaultDb = require('../config/db').db;

const TARGETS = Object.freeze({ f11: 95, f12: 95, f13: 90, f41: 90 }); // = frontend indicatorConfig.js
const LABELS = Object.freeze({ f11: 'F1.1', f12: 'F1.2', f13: 'F1.3', f41: 'F4.1' });
const ORDER = Object.freeze(['f11', 'f12', 'f13', 'f41']);
const TREND_DAYS = 30;
const LOWEST_UNITS = 5;

const F13_RANK_SOURCE = Object.freeze({
    table: 'fact_f13_national',
    unitColumn: 'ma_tinh_phat',
    nameColumn: 'ten_tinh_phat',
    volumeColumn: 'sl_bg_ptc',
    passedColumn: 'sl_ptc_dung_qd_ct',
    metric: 'tl_ptc_dung_qd_ct',
    metricLabel: 'Tỷ lệ PTC/nộp tiền đúng QĐ theo chỉ tiêu 2026',
});

const F41_RANK_SOURCE = Object.freeze({
    table: 'fact_f41_national',
    unitColumn: 'ma_don_vi',
    nameColumn: 'ten_don_vi',
    volumeColumn: 'sl_ptc_nop_tien_ch',
    passedColumn: 'sl_ptc_8h_co_tms',
    metric: 'tl_ptc_8h_co_tms',
    metricLabel: 'Tỷ lệ PTC 8 giờ (Có TMS) theo báo cáo toàn quốc',
});

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

function monthEnd(monthStart) {
    const next = new Date(Date.UTC(Number(monthStart.slice(0, 4)), Number(monthStart.slice(5, 7)), 1));
    return shiftDate(next.toISOString().slice(0, 10), -1);
}

function codedError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function round1(value) {
    return Number(Number(value).toFixed(1));
}

function num(value) {
    return value === null || value === undefined ? null : Number(value);
}

function buildDefaultAdapters(db = defaultDb) {
    // Required lazily so a unit test with fake adapters never loads the real services / database.
    const { f11RankingService } = require('./F11RankingService');
    const { f12RankingService } = require('./F12RankingService');
    const { f41RankingService } = require('./F41RankingService');
    const f13DashboardService = require('./F13DashboardService');
    const { f12NationalRankService } = require('./F12NationalRankService');
    const { f11NationalRankService } = require('./F11NationalRankService');

    const withSource = (source) => new F11NationalRankService(db, source);
    const f13Rank = withSource(F13_RANK_SOURCE);
    const f41Rank = withSource(F41_RANK_SOURCE);

    return {
        f11: {
            summary: (from, to) => f11RankingService.getSummary(from, to, {}),
            trend: (from, to) => f11RankingService.getDailyTrend(from, to, {}),
            ranking: (from, to) => f11RankingService.getBcvhRanking(from, to, 1, 200),
            rank: f11NationalRankService,
            localTable: 'fact_f11',
        },
        f12: {
            summary: (from, to) => f12RankingService.getSummary(from, to, {}),
            trend: (from, to) => f12RankingService.getDailyTrend(from, to, {}),
            ranking: (from, to) => f12RankingService.getBcvhRanking(from, to, 1, 200),
            rank: f12NationalRankService,
            localTable: 'fact_f12',
        },
        f13: {
            summary: (from, to) => f13DashboardService.getDashboardKpi(from, to, {}),
            trend: (from, to) => f13DashboardService.getDailyTrend(from, to, {}),
            ranking: (from, to) => f13DashboardService.getBcvhRanking(from, to, 1, 200),
            rank: f13Rank,
            localTable: 'fact_f13',
        },
        f41: {
            summary: (from, to) => f41RankingService.getSummary(from, to, {}),
            trend: (from, to) => f41RankingService.getDailyTrend(from, to, {}),
            ranking: (from, to) => f41RankingService.getBcvhRanking(from, to, 1, 200),
            rank: f41Rank,
            localTable: 'fact_f41',
        },
    };
}

class HomeExecutiveService {
    constructor({ adapters, db = defaultDb } = {}) {
        this.db = db;
        this.adapters = adapters || null;
    }

    _adapters() {
        if (!this.adapters) this.adapters = buildDefaultAdapters(this.db);
        return this.adapters;
    }

    _get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
        });
    }

    // Latest day with loaded detail data (the rate of the indicator's own dashboard), never after the anchor.
    // The national report can run a day ahead of or behind the detail; the rank is read for the same day.
    async _dataDate(adapter, anchorDate) {
        const table = adapter.localTable;
        if (!table) return anchorDate || null;
        const row = anchorDate
            ? await this._get(`SELECT MAX(ngay_do_kiem) AS d FROM ${table} WHERE ngay_do_kiem <= ?`, [anchorDate])
            : await this._get(`SELECT MAX(ngay_do_kiem) AS d FROM ${table}`);
        return row?.d || null;
    }

    _unavailable(id, message, extra = {}) {
        return {
            id,
            label: LABELS[id],
            target_rate: TARGETS[id],
            available: false,
            message,
            data_date: null,
            rate: null,
            gap_to_target: null,
            previous_date: null,
            previous_rate: null,
            rate_change: null,
            rank: null,
            total: null,
            rank_basis_rate: null,
            previous_rank: null,
            rank_movement: null,
            volume: null,
            passed: null,
            failed: null,
            trend: [],
            monthly_rank: [],
            lowest_units: [],
            ...extra,
        };
    }

    async _indicator(id, anchorDate) {
        const adapter = this._adapters()[id];
        const target = TARGETS[id];
        const dataDate = await this._dataDate(adapter, anchorDate);
        if (!dataDate) return this._unavailable(id, 'Chưa có dữ liệu');

        const trendFrom = shiftDate(dataDate, -(TREND_DAYS - 1));
        const [summary, trend, ranking] = await Promise.all([
            adapter.summary(dataDate, dataDate),
            adapter.trend(trendFrom, dataDate),
            adapter.ranking(dataDate, dataDate).catch(() => null),
        ]);

        const volume = Number(summary?.total_bg || 0);
        if (!volume) return this._unavailable(id, `Chưa có dữ liệu chi tiết ngày ${dataDate}`, { data_date: dataDate });

        const items = (trend?.items || []).map((item) => ({
            date: item.date,
            rate: item.data_available && item.quality_rate !== null && item.quality_rate !== undefined ? round1(item.quality_rate) : null,
            rank: item.data_available && item.national_rank?.available ? Number(item.national_rank.rank) : null,
            volume: Number(item.total_volume || 0),
        }));
        const previousDate = shiftDate(dataDate, -1);
        const previousItem = items.find((item) => item.date === previousDate && item.rate !== null) || null;

        const rate = round1(summary.passed_rate);
        const nationalRank = summary.national_rank?.available ? summary.national_rank : null;
        const previousRate = previousItem ? previousItem.rate : null;

        const rows = ranking?.data || [];
        const lowest = rows
            .filter((row) => Number(row.total_bg ?? row.sl_bg_ptc ?? 0) > 0)
            .sort((a, b) => Number(a.passed_rate) - Number(b.passed_rate))
            .slice(0, LOWEST_UNITS)
            .map((row) => ({
                ma_bcvh: row.ma_bcvh,
                ten_bcvh: row.ten_bcvh,
                rate: round1(row.passed_rate),
                gap_to_target: round1(row.passed_rate - target),
                failed: Number(row.total_failed ?? row.khong_dat_kpi_2026 ?? 0),
                volume: Number(row.total_bg ?? row.sl_bg_ptc ?? 0),
            }));

        return {
            id,
            label: LABELS[id],
            target_rate: target,
            available: true,
            message: null,
            data_date: dataDate,
            rate,
            gap_to_target: round1(rate - target),
            previous_date: previousItem ? previousDate : null,
            previous_rate: previousRate,
            rate_change: previousRate === null ? null : round1(rate - previousRate),
            rank: nationalRank ? Number(nationalRank.rank) : null,
            total: nationalRank ? Number(nationalRank.total) : null,
            rank_basis_rate: nationalRank ? num(nationalRank.metric_value) : null,
            previous_rank: nationalRank?.previous_rank ? Number(nationalRank.previous_rank) : null,
            rank_movement: nationalRank && nationalRank.movement !== null && nationalRank.movement !== undefined
                ? Number(nationalRank.movement) : null,
            previous_rank_date: nationalRank?.previous_period || null,
            volume,
            passed: Number(summary.total_passed || 0),
            failed: Number(summary.total_failed || 0),
            trend: items,
            monthly_rank: await this._monthlyRank(adapter, dataDate),
            lowest_units: lowest,
        };
    }

    // Hue's rank and rate per month from January of the data year to the month of the data date.
    async _monthlyRank(adapter, dataDate) {
        const year = dataDate.slice(0, 4);
        const lastMonth = Number(dataDate.slice(5, 7));
        const months = [];
        for (let m = 1; m <= lastMonth; m += 1) {
            const start = `${year}-${String(m).padStart(2, '0')}-01`;
            const end = start.slice(0, 7) === dataDate.slice(0, 7) ? dataDate : monthEnd(start);
            months.push({ month: start.slice(0, 7), start, end });
        }
        const results = await Promise.all(months.map(async (month) => {
            try {
                const rank = await adapter.rank.getNationalRankSummary(month.start, month.end);
                return rank?.available
                    ? { month: month.month, rank: Number(rank.rank), total: Number(rank.total), rate: num(rank.metric_value) }
                    : { month: month.month, rank: null, total: null, rate: null };
            } catch {
                return { month: month.month, rank: null, total: null, rate: null };
            }
        }));
        return results;
    }

    // GET /api/home/executive
    async getExecutive({ anchorDate } = {}) {
        if (anchorDate && !isIsoDate(anchorDate)) throw codedError('INVALID_DATE', 'anchor_date must be a valid ISO date in YYYY-MM-DD format');
        const indicators = await Promise.all(ORDER.map(async (id) => {
            try {
                return await this._indicator(id, anchorDate || null);
            } catch (error) {
                return this._unavailable(id, 'Không đọc được dữ liệu của chỉ tiêu này');
            }
        }));
        return { anchor_date: anchorDate || null, indicators };
    }

    // GET /api/home/national-ranking?indicator=&period=&anchor_date=
    async getNationalRanking({ indicator, period = 'day', anchorDate, fromDate, toDate } = {}) {
        if (!ORDER.includes(indicator)) throw codedError('INVALID_INDICATOR', 'indicator must be one of f11, f12, f13, f41');
        const adapter = this._adapters()[indicator];

        let range;
        if (fromDate || toDate) {
            range = resolvePeriod({ fromDate, toDate });
        } else {
            const effective = anchorDate || await this._dataDate(adapter, null);
            if (!effective) return this._emptyRanking(indicator, 'Chưa có dữ liệu xếp hạng toàn quốc');
            range = resolvePeriod({ period, anchorDate: effective });
            // A week / month still running is read up to the anchor, never past the last loaded day.
            if (range.to > effective) range = { ...range, to: effective };
        }

        const table = await adapter.rank.getNationalRanking(range.from, range.to);
        if (!table?.available) return this._emptyRanking(indicator, table?.message || 'Chưa có dữ liệu xếp hạng toàn quốc', range);

        const target = TARGETS[indicator];
        const volume = table.items.reduce((sum, item) => sum + item.volume, 0);
        const passed = table.items.reduce((sum, item) => sum + item.passed, 0);
        const nationalRate = volume ? round1((passed / volume) * 100) : null;
        const hue = table.items.find((item) => item.is_hue) || null;
        const above = hue && hue.rank > 1 ? table.items[hue.rank - 2] : null;

        return {
            indicator,
            label: LABELS[indicator],
            target_rate: target,
            available: true,
            period: range.period || period,
            period_start: range.from,
            period_end: range.to,
            previous_period: table.previous_period,
            total: table.total,
            national_rate: nationalRate,
            hue: hue ? {
                rank: hue.rank,
                rate: hue.rate,
                gap_to_target: round1(hue.rate - target),
                gap_to_national_rate: nationalRate === null ? null : round1(hue.rate - nationalRate),
                above: above ? { rank: above.rank, ten_tinh: above.ten_tinh, rate: above.rate, gap: round1(above.rate - hue.rate) } : null,
            } : null,
            items: table.items.map((item) => ({
                rank: item.rank,
                ma_tinh: item.ma_tinh,
                ten_tinh: item.ten_tinh,
                rate: item.rate,
                volume: item.volume,
                failed: item.failed,
                previous_rank: item.previous_rank,
                movement: item.movement,
                gap_to_target: round1(item.rate - target),
                is_hue: item.is_hue,
            })),
        };
    }

    _emptyRanking(indicator, message, range = null) {
        return {
            indicator,
            label: LABELS[indicator],
            target_rate: TARGETS[indicator],
            available: false,
            message,
            period_start: range?.from || null,
            period_end: range?.to || null,
            total: 0,
            national_rate: null,
            hue: null,
            items: [],
        };
    }
}

module.exports = {
    HomeExecutiveService,
    homeExecutiveService: new HomeExecutiveService(),
    F13_RANK_SOURCE,
    F41_RANK_SOURCE,
    TARGETS,
};
