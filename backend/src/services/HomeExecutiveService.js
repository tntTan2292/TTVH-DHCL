'use strict';

// HOME-BI-01 (B1) - read model of the executive Home page: for each of F1.1 / F1.2 / F1.3 / F4.1 / F4.2 the current
// rate of Hue, its national rank among the 34 provinces, the gap to the indicator's own target, the change
// against the previous day, a 30-day trend, Hue's rank history, the units to act on and the 34-province table.
//
// Nothing is recomputed here: every figure comes from the same service the indicator's own dashboard uses
// (summary / daily trend / BCVH ranking), so the Home page can never disagree with those dashboards. The
// only new query is the 34-province table for F1.3, F4.1 and F4.2, which reuses the generic F11NationalRankService
// with the column map of fact_f13_national / fact_f41_national (both hold exactly the 34 ranked provinces).
// Each indicator is its own measure: nothing is compared or summed across indicators.

const { F11NationalRankService, F11_RANK_SOURCE } = require('./F11NationalRankService');
const { resolvePeriod, CANONICAL_CODES } = require('./F11RankingService');
const defaultDb = require('../config/db').db;

const TARGETS = Object.freeze({ f11: 95, f12: 95, f13: 90, f41: 90, f42: 90 }); // = frontend indicatorConfig.js
const LABELS = Object.freeze({ f11: 'F1.1', f12: 'F1.2', f13: 'F1.3', f41: 'F4.1', f42: 'F4.2' });
const ORDER = Object.freeze(['f11', 'f12', 'f13', 'f41', 'f42']);
const TREND_DAYS = 30;
const SERIES_WEEKS = 12;
const PERIODS = Object.freeze(['day', 'week', 'month']);
const MAX_BACK = 120; // how many periods the back button may go
// The block fills the height it is given, so the server sends up to this many below-threshold units (biggest
// volume first) and the screen shows as many as fit (PO 2026-10-22).
const FOCUS_UNITS = 10;
const CANONICAL_SET = new Set(CANONICAL_CODES.map(String));
// PO 2026-10-13: what the "units to act on" block lists for each indicator.
//   f11 - the accepting-office x delivering-BCVH pairs with the largest volume whose rate is below 85 % (up to 10)
//   f12 - the accepting offices with the largest volume whose rate is below 90 % (up to 10)
//   f13 / f41 / f42 - every BCVH (the six canonical ones), lowest rate first
const FOCUS = Object.freeze({
    f11: { kind: 'pairs', threshold: 85 },
    f12: { kind: 'offices', threshold: 90 },
    f13: { kind: 'bcvh', threshold: null },
    f41: { kind: 'bcvh', threshold: null },
    f42: { kind: 'bcvh', threshold: null },
});

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

// Thursday-Wednesday week (the TCT quality week, PO 2026-10-21): the Thursday it starts on.
function weekStartOf(dateStr) {
    const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    return shiftDate(dateStr, -((dow - 4 + 7) % 7));
}

// First day of the month `delta` months away from the month of dateStr.
function monthShift(dateStr, delta) {
    return new Date(Date.UTC(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)) - 1 + delta, 1)).toISOString().slice(0, 10);
}

// ISO 8601 number of a Thursday-Wednesday week = the ISO week of its own Thursday.
function isoWeekOfThursday(thursday) {
    const year = Number(thursday.slice(0, 4));
    const dayOfYear = Math.round((Date.UTC(year, Number(thursday.slice(5, 7)) - 1, Number(thursday.slice(8, 10))) - Date.UTC(year, 0, 1)) / 86400000) + 1;
    return { year, week: Math.floor((dayOfYear - 1) / 7) + 1 };
}

function previousPeriod(period, from) {
    if (period === 'week') return { from: shiftDate(from, -7), to: shiftDate(from, -1) };
    const to = shiftDate(from, -1);
    return { from: `${to.slice(0, 7)}-01`, to };
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
    const { f42RankingService } = require('./F42RankingService');
    const { f42NationalRankService } = require('./F42NationalRankService');
    const f13DashboardService = require('./F13DashboardService');
    const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
    const { f12NationalRankService } = require('./F12NationalRankService');
    const { f11NationalRankService } = require('./F11NationalRankService');

    const withSource = (source) => new F11NationalRankService(db, source);
    const f13Rank = withSource(F13_RANK_SOURCE);
    const f41Rank = withSource(F41_RANK_SOURCE);

    return {
        f11: {
            summary: (from, to) => f11RankingService.getSummary(from, to, {}),
            trend: (from, to, opts) => f11RankingService.getDailyTrend(from, to, { ...opts }),
            ranking: (from, to) => f11RankingService.getBcvhRanking(from, to, 1, 200),
            rank: f11NationalRankService,
            pairs: (from, to) => f11RankingService.getPairTable({ fromDate: from, toDate: to }),
            localTable: 'fact_f11',
        },
        f12: {
            summary: (from, to) => f12RankingService.getSummary(from, to, {}),
            trend: (from, to, opts) => f12RankingService.getDailyTrend(from, to, { ...opts }),
            ranking: (from, to) => f12RankingService.getBcvhRanking(from, to, 1, 200),
            rank: f12NationalRankService,
            offices: (from, to) => f12RankingService.getOfficeRanking(from, to, 1, 200),
            localTable: 'fact_f12',
        },
        f13: {
            summary: (from, to) => f13DashboardService.getDashboardKpi(from, to, {}),
            trend: (from, to, opts) => f13DashboardService.getDailyTrend(from, to, { ...opts }),
            // The per-BCVH figures straight from the repository the F1.3 ranking itself reads (same counts, same rate
            // rounding): the service's own getBcvhRanking also loads every shipment of the range for its route
            // columns, which the Home block does not show and which takes seconds on a month.
            ranking: async (from, to) => {
                const result = await factBuuGuiRepo.getBcvhRanking(from, to, 1, 200);
                return {
                    data: (result.data || []).map((row) => ({
                        ma_bcvh: row.ma_bcvh,
                        ten_bcvh: row.ten_bcvh,
                        total_bg: row.total_bg,
                        total_failed: row.total_failed,
                        passed_rate: f13DashboardService._calculateRate(row.total_passed, row.total_bg),
                    })),
                };
            },
            rank: f13Rank,
            localTable: 'fact_f13',
        },
        f41: {
            summary: (from, to) => f41RankingService.getSummary(from, to, {}),
            trend: (from, to, opts) => f41RankingService.getDailyTrend(from, to, { ...opts }),
            ranking: (from, to) => f41RankingService.getBcvhRanking(from, to, 1, 200),
            rank: f41Rank,
            localTable: 'fact_f41',
        },
        f42: {
            summary: (from, to) => f42RankingService.getSummary(from, to, {}),
            trend: (from, to, opts) => f42RankingService.getDailyTrend(from, to, { ...opts }),
            ranking: (from, to) => f42RankingService.getBcvhRanking(from, to, 1, 200),
            rank: f42NationalRankService,
            localTable: 'fact_f42',
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

    // The range one indicator shows for a period filter: day = its (offset-th previous) loaded day; week / month =
    // the Thursday-Wednesday week / calendar month that many periods back from its latest loaded day, read up
    // to its last loaded day inside the period (so a running period is "to date"). null = no data there.
    async _range(adapter, period, offset = 0, anchorDate = null) {
        const latest = await this._dataDate(adapter, anchorDate);
        if (!latest) return null;
        const table = adapter.localTable;
        if (period === 'day') {
            let day = latest;
            if (offset < 0 && table) {
                const row = await this._get(
                    `SELECT DISTINCT ngay_do_kiem AS d FROM ${table} WHERE ngay_do_kiem <= ? ORDER BY d DESC LIMIT 1 OFFSET ?`,
                    [latest, -offset]
                );
                day = row?.d || null;
            }
            return day ? { period, from: day, to: day, full_to: day, latest } : null;
        }
        let ref = latest;
        if (offset < 0) ref = period === 'week' ? shiftDate(latest, 7 * offset) : monthShift(latest, offset);
        const full = resolvePeriod({ period, anchorDate: ref });
        const upper = full.to < latest ? full.to : latest;
        let last = upper;
        if (table) {
            const row = await this._get(
                `SELECT MAX(ngay_do_kiem) AS d FROM ${table} WHERE ngay_do_kiem BETWEEN ? AND ?`,
                [full.from, upper]
            );
            last = row?.d || null;
        }
        return last ? { period, from: full.from, to: last, full_to: full.to, latest } : null;
    }

    _periodFields(range, period) {
        if (!range) return { period, period_from: null, period_to: null, period_partial: false, period_week: null, period_year: null };
        const week = period === 'week' ? isoWeekOfThursday(range.from) : null;
        return {
            period,
            period_from: range.from,
            period_to: range.to,
            period_partial: range.to < range.full_to,
            period_week: week ? week.week : null,
            period_year: week ? week.year : Number(range.from.slice(0, 4)),
        };
    }

    // Top-level description of the period every card is showing (taken from the indicator that is furthest ahead).
    async _periodInfo(ranges, period, offset) {
        const ref = ranges.filter(Boolean).sort((a, b) => b.to.localeCompare(a.to))[0] || null;
        const adapters = this._adapters();
        let earliest = null;
        for (const id of ORDER) {
            const table = adapters[id].localTable;
            if (!table) continue;
            try {
                const row = await this._get(`SELECT MIN(ngay_do_kiem) AS d FROM ${table}`);
                if (row?.d && (!earliest || row.d < earliest)) earliest = row.d;
            } catch { /* a missing table only means no earlier day is known */ }
        }
        // Each indicator reads its own latest period (its data can lag the others by a day or two), so around a
        // week / month boundary the cards may stand in different periods: the page says so (`mixed`).
        const froms = new Set(ranges.filter(Boolean).map((range) => range.from));
        return {
            ...this._periodFields(ref, period),
            offset,
            full_to: ref ? ref.full_to : null,
            has_previous: Boolean(ref && earliest && earliest < ref.from) && offset > -MAX_BACK,
            has_next: offset < 0,
            max_back: MAX_BACK,
            mixed: froms.size > 1,
        };
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
            focus_units: { ...FOCUS[id], items: [] },
            ...extra,
        };
    }

    async _indicator(id, period, range) {
        const adapter = this._adapters()[id];
        const target = TARGETS[id];
        if (!range) return this._unavailable(id, 'Chưa có dữ liệu', this._periodFields(null, period));
        if (period !== 'day') return this._periodIndicator(id, adapter, range, period);
        const dataDate = range.to;
        const periodFields = this._periodFields(range, period);

        const trendFrom = shiftDate(dataDate, -(TREND_DAYS - 1));
        const [summary, trend, ranking] = await Promise.all([
            adapter.summary(dataDate, dataDate),
            adapter.trend(trendFrom, dataDate),
            FOCUS[id].kind === 'bcvh' ? adapter.ranking(dataDate, dataDate).catch(() => null) : Promise.resolve(null),
        ]);

        const volume = Number(summary?.total_bg || 0);
        if (!volume) return this._unavailable(id, `Chưa có dữ liệu chi tiết ngày ${dataDate}`, { data_date: dataDate, ...periodFields });

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

        const focusUnits = await this._focusUnits(id, adapter, dataDate, dataDate, ranking, target);

        return {
            ...periodFields,
            trend_kind: 'day',
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
            focus_units: focusUnits,
        };
    }

    // Week / month card: the figures of the whole period (summed counts, never an average of daily rates), the
    // national rank of the same range, and the change against the previous FULL week / month - the same basis as
    // the rank movement of the province table and the "Diễn biến hạng lũy kế tháng" block.
    async _periodIndicator(id, adapter, range, period) {
        const target = TARGETS[id];
        const { from, to } = range;
        const periodFields = this._periodFields(range, period);
        const prev = previousPeriod(period, from);
        const seriesFrom = period === 'week' ? shiftDate(weekStartOf(from), -7 * (SERIES_WEEKS - 1)) : `${to.slice(0, 4)}-01-01`;
        const [summary, prevSummary, ranking, trend, rankNow, rankPrev] = await Promise.all([
            adapter.summary(from, to),
            adapter.summary(prev.from, prev.to).catch(() => null),
            FOCUS[id].kind === 'bcvh' ? adapter.ranking(from, to).catch(() => null) : Promise.resolve(null),
            adapter.trend(seriesFrom, to, { skipNationalRank: true }).catch(() => null),
            adapter.rank.getNationalRankSummary(from, to).catch(() => null),
            adapter.rank.getNationalRankSummary(prev.from, prev.to).catch(() => null),
        ]);

        const volume = Number(summary?.total_bg || 0);
        if (!volume) return this._unavailable(id, `Chưa có dữ liệu chi tiết ${from} → ${to}`, { data_date: to, ...periodFields });

        const rate = round1(summary.passed_rate);
        const previousRate = Number(prevSummary?.total_bg || 0) ? round1(prevSummary.passed_rate) : null;
        const rank = rankNow?.available ? Number(rankNow.rank) : null;
        const previousRank = rankPrev?.available ? Number(rankPrev.rank) : null;

        return {
            ...periodFields,
            trend_kind: period,
            id,
            label: LABELS[id],
            target_rate: target,
            available: true,
            message: null,
            data_date: to,
            rate,
            gap_to_target: round1(rate - target),
            previous_date: previousRate === null ? null : prev.to,
            previous_from: previousRate === null ? null : prev.from,
            previous_rate: previousRate,
            rate_change: previousRate === null ? null : round1(rate - previousRate),
            rank,
            total: rankNow?.available ? Number(rankNow.total) : null,
            rank_basis_rate: rankNow?.available ? num(rankNow.metric_value) : null,
            previous_rank: previousRank,
            rank_movement: rank !== null && previousRank !== null ? previousRank - rank : null,
            previous_rank_date: previousRank !== null ? `${prev.from}..${prev.to}` : null,
            volume,
            passed: Number(summary.total_passed || 0),
            failed: Number(summary.total_failed || 0),
            trend: this._periodSeries(period, trend?.items || [], from, rate),
            monthly_rank: await this._monthlyRank(adapter, to),
            focus_units: await this._focusUnits(id, adapter, from, to, ranking, target),
        };
    }

    // Weekly (last 12 Thursday-Wednesday weeks) or monthly (January to the shown month) rate series, built from
    // the summed daily counts. The point of the period on screen carries the card's own rate.
    _periodSeries(period, items, currentFrom, currentRate) {
        const keyOf = (date) => (period === 'week' ? weekStartOf(date) : `${date.slice(0, 7)}-01`);
        const currentKey = keyOf(currentFrom);
        const groups = new Map();
        for (const item of items) {
            if (!item.data_available) continue;
            const key = keyOf(item.date);
            const group = groups.get(key) || { volume: 0, passed: 0 };
            group.volume += Number(item.total_volume || 0);
            group.passed += Number(item.passed || 0);
            groups.set(key, group);
        }
        const points = [...groups.entries()]
            .filter(([, group]) => group.volume > 0)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, group]) => ({
                date: key,
                // same rounding as the card and the indicator's own dashboard: two decimals, then one
                rate: key === currentKey ? currentRate : round1(Math.round((group.passed / group.volume) * 10000) / 100),
                rank: null,
                volume: group.volume,
            }));
        return period === 'week' ? points.slice(-SERIES_WEEKS) : points;
    }

    // The "units to act on" of one indicator (see FOCUS). A failure here must not hide the card: the list is
    // simply empty and the block says there is nothing to show.
    async _focusUnits(id, adapter, from, to, ranking, target) {
        const { kind, threshold } = FOCUS[id];
        const gap = (rate) => round1(rate - target);
        const biggestBelow = (items) => items
            .filter((item) => item.rate < threshold)
            .sort((a, b) => (b.volume - a.volume) || (a.rate - b.rate))
            .slice(0, FOCUS_UNITS);
        try {
            if (kind === 'pairs' && adapter.pairs) {
                const table = await adapter.pairs(from, to);
                const items = [];
                for (const row of table?.rows || []) {
                    for (const column of table.columns || []) {
                        if (column.ma_bcvh === 'OTHER') continue; // "Khác" lumps many delivery offices: not a single pair
                        const cell = row.cells?.[column.ma_bcvh];
                        if (!cell || !(cell.volume > 0) || cell.rate === null || cell.rate === undefined) continue;
                        items.push({
                            key: `${row.ma_chap_nhan}|${column.ma_bcvh}`,
                            ma_bcvh: row.ma_chap_nhan,
                            ten_bcvh: row.ten_chap_nhan,
                            ten_phat: column.ten_bcvh,
                            rate: round1(cell.rate),
                            gap_to_target: gap(cell.rate),
                            failed: Number(cell.failed || 0),
                            volume: Number(cell.volume),
                        });
                    }
                }
                return { kind, threshold, items: biggestBelow(items) };
            }
            if (kind === 'offices' && adapter.offices) {
                const result = await adapter.offices(from, to);
                const items = (result?.data || [])
                    .filter((row) => Number(row.total_bg || 0) > 0 && row.passed_rate !== null && row.passed_rate !== undefined)
                    .map((row) => ({
                        key: String(row.ma_bcvh),
                        ma_bcvh: row.ma_bcvh,
                        ten_bcvh: row.ten_bcvh,
                        rate: round1(row.passed_rate),
                        gap_to_target: gap(row.passed_rate),
                        failed: Number(row.total_failed || 0),
                        volume: Number(row.total_bg),
                    }));
                return { kind, threshold, items: biggestBelow(items) };
            }
            // the six canonical BCVH only: a stray code (e.g. the large-customer code with one parcel) is not a BCVH
            const items = (ranking?.data || [])
                .filter((row) => CANONICAL_SET.has(String(row.ma_bcvh)) && Number(row.total_bg ?? row.sl_bg_ptc ?? 0) > 0)
                .sort((a, b) => Number(a.passed_rate) - Number(b.passed_rate))
                .map((row) => ({
                    key: String(row.ma_bcvh),
                    ma_bcvh: row.ma_bcvh,
                    ten_bcvh: row.ten_bcvh,
                    rate: round1(row.passed_rate),
                    gap_to_target: gap(row.passed_rate),
                    failed: Number(row.total_failed ?? row.khong_dat_kpi_2026 ?? 0),
                    volume: Number(row.total_bg ?? row.sl_bg_ptc ?? 0),
                    // F41-TMS-COMPARE-01: only the F4.1 ranking rows carry these (other indicators: no extra keys)
                    ...(row.rate_no_tms !== undefined ? { rate_no_tms: row.rate_no_tms, rate_blank_tms: row.rate_blank_tms } : {}),
                }));
            return { kind, threshold, items };
        } catch {
            return { kind, threshold, items: [] };
        }
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

    // GET /api/home/executive?period=day|week|month&offset=0|-1|-2...  (offset 0 = the latest period with data)
    async getExecutive({ anchorDate, period = 'day', offset = 0 } = {}) {
        if (anchorDate && !isIsoDate(anchorDate)) throw codedError('INVALID_DATE', 'anchor_date must be a valid ISO date in YYYY-MM-DD format');
        if (!PERIODS.includes(period)) throw codedError('MISSING_PARAM', 'period must be one of day, week, month');
        if (!Number.isInteger(offset) || offset > 0 || offset < -MAX_BACK) throw codedError('INVALID_RANGE', `offset must be an integer from -${MAX_BACK} to 0`);
        const adapters = this._adapters();
        const ranges = await Promise.all(ORDER.map((id) => this._range(adapters[id], period, offset, anchorDate || null).catch(() => null)));
        const indicators = await Promise.all(ORDER.map(async (id, index) => {
            try {
                return await this._indicator(id, period, ranges[index]);
            } catch (error) {
                return this._unavailable(id, 'Không đọc được dữ liệu của chỉ tiêu này', this._periodFields(null, period));
            }
        }));
        return {
            anchor_date: anchorDate || null,
            period,
            offset,
            period_info: await this._periodInfo(ranges, period, offset),
            indicators,
        };
    }

    // GET /api/home/national-ranking?indicator=&period=&anchor_date=
    async getNationalRanking({ indicator, period = 'day', anchorDate, fromDate, toDate, offset = 0 } = {}) {
        if (!ORDER.includes(indicator)) throw codedError('INVALID_INDICATOR', 'indicator must be one of f11, f12, f13, f41, f42');
        const adapter = this._adapters()[indicator];

        let range;
        if (fromDate || toDate) {
            range = resolvePeriod({ fromDate, toDate });
        } else {
            if (!PERIODS.includes(period)) throw codedError('MISSING_PARAM', 'period must be one of day, week, month');
            if (!Number.isInteger(offset) || offset > 0 || offset < -MAX_BACK) throw codedError('INVALID_RANGE', `offset must be an integer from -${MAX_BACK} to 0`);
            // The same range the cards show (a running week / month is read up to its last loaded day).
            const found = await this._range(adapter, period, offset, anchorDate || null);
            if (!found) return this._emptyRanking(indicator, 'Chưa có dữ liệu xếp hạng toàn quốc');
            range = { period, from: found.from, to: found.to };
        }

        const table = await adapter.rank.getNationalRanking(range.from, range.to);
        if (!table?.available) return this._emptyRanking(indicator, table?.message || 'Chưa có dữ liệu xếp hạng toàn quốc', range);

        // The movement is read against the same kind of period: the previous day, the previous Thursday-Wednesday
        // week or the previous calendar month IN FULL - the figure the "Diễn biến hạng lũy kế tháng" block shows
        // for that month - so the two blocks never give a leader two different movements.
        const movementBasis = await this._movementBasis(adapter, range, table);

        const target = TARGETS[indicator];
        const volume = table.items.reduce((sum, item) => sum + item.volume, 0);
        const passed = table.items.reduce((sum, item) => sum + item.passed, 0);
        const nationalRate = volume ? round1((passed / volume) * 100) : null;
        const hue = table.items.find((item) => item.is_hue) || null;
        const above = hue && hue.rank > 1 ? table.items[hue.rank - 2] : null;

        const items = table.items.map((item) => ({
            rank: item.rank,
            ma_tinh: item.ma_tinh,
            ten_tinh: item.ten_tinh,
            rate: item.rate,
            volume: item.volume,
            failed: item.failed,
            previous_rank: movementBasis.ranks ? (movementBasis.ranks.get(String(item.ma_tinh)) || null) : item.previous_rank,
            movement: movementBasis.ranks
                ? (movementBasis.ranks.get(String(item.ma_tinh)) ? movementBasis.ranks.get(String(item.ma_tinh)) - item.rank : null)
                : item.movement,
            gap_to_target: round1(item.rate - target),
            is_hue: item.is_hue,
        }));

        return {
            indicator,
            label: LABELS[indicator],
            target_rate: target,
            available: true,
            period: range.period || period,
            period_start: range.from,
            period_end: range.to,
            previous_period: movementBasis.previous_period,
            movement_basis: movementBasis.basis,
            total: table.total,
            national_rate: nationalRate,
            hue: hue ? {
                rank: hue.rank,
                rate: hue.rate,
                // rank change against the same basis as the table rows (previous day / week / month)
                previous_rank: items.find((item) => item.is_hue)?.previous_rank ?? null,
                movement: items.find((item) => item.is_hue)?.movement ?? null,
                gap_to_target: round1(hue.rate - target),
                gap_to_national_rate: nationalRate === null ? null : round1(hue.rate - nationalRate),
                above: above ? { rank: above.rank, ten_tinh: above.ten_tinh, rate: above.rate, gap: round1(above.rate - hue.rate) } : null,
            } : null,
            items,
        };
    }

    // Previous comparable period of a week / month view: { basis, previous_period, ranks: Map(ma_tinh -> rank) }.
    // A day view (or an explicit range) keeps the service's own "previous loaded day" movement (ranks = null).
    async _movementBasis(adapter, range, table) {
        const dayBasis = { basis: 'day', previous_period: table.previous_period, ranks: null };
        if (range.period !== 'week' && range.period !== 'month') return dayBasis;
        const { from, to } = previousPeriod(range.period, range.from);
        let previous = null;
        try {
            previous = await adapter.rank.getNationalRanking(from, to);
        } catch {
            previous = null;
        }
        const ranks = new Map();
        if (previous?.available) previous.items.forEach((item) => ranks.set(String(item.ma_tinh), item.rank));
        return { basis: range.period, previous_period: previous?.available ? `${from}..${to}` : null, ranks };
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
    buildDefaultAdapters,
};
