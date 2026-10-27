'use strict';

// F42-DASHBOARD-RANKING-01 - F4.2 (chat luong phat giao buu ta) Operation Dashboard / BCVH Ranking read services
// and the postman table.
//
// The overview / weekly / monthly / summary / daily-trend / single-day ranking logic is the F4.1 service run over
// the F4.2 repository and national-rank service (both constructor-injected), exactly as F1.1 does: volume = every
// GBT row, passed = danh_gia = 'Đạt', blank ratings stay in the denominator (PD-F42-2); module total over every
// row, ranking/overview/weekly over the 6 canonical BCVH. New here: the postman table (PD-F42-3), BCVH -> the
// postmen who delivered in the period, and the target rate in the dashboard metadata.

const { F41RankingService, CANONICAL_CODES } = require('./F41RankingService');
const { factF42Repository } = require('../repositories/FactF42Repository');
const { f42NationalRankService } = require('./F42NationalRankService');
const { CANONICAL_BCVH_UNITS, buildDashboardMeta } = require('../config/canonicalBcvhUnits');
const { F42_KPI_SCOPE_NOTE, F42_TARGET_RATE } = require('../config/f42KpiScopeContract');
const { resolvePeriod } = require('./F11RankingService');

function codedError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

const POSTMAN_TREND_MAX_DAYS = 93;

function shiftDay(isoDate) {
    return new Date(Date.parse(`${isoDate}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
}

function rate2(part, total) {
    if (!total) return null;
    return Number(((part / total) * 100).toFixed(2));
}

function figures(volume, passed, strictFailed, blank) {
    return { volume, passed, failed: volume - passed, strict_failed: strictFailed, blank, rate: rate2(passed, volume) };
}

class F42RankingService extends F41RankingService {
    constructor({ repository = factF42Repository, nationalRankService = f42NationalRankService, now } = {}) {
        super({ repository, nationalRankService, ...(now ? { now } : {}) });
    }

    // Dashboard bootstrap: first/last day with data, the 6 official BCVH, the KPI scope note and the 90 % target.
    async getDashboardMeta() {
        const { min_date, max_date } = await this.repository.getMeta();
        return {
            ...buildDashboardMeta(max_date, min_date),
            target_rate: F42_TARGET_RATE,
            kpi_scope_note: F42_KPI_SCOPE_NOTE,
            kpi_includes_non_canonical_bcvh: await this.repository.hasNonCanonicalBcvhRows(CANONICAL_CODES),
        };
    }

    // The 34 provinces/cities ranked nationally for the Dashboard province table.
    async getNationalRanking(fromDate, toDate) {
        this._validateRange(fromDate, toDate);
        return this.nationalRankService.getNationalRanking(fromDate, toDate);
    }

    // BCVH (blocks) -> postmen (rows) who handled parcels in the period (PD-F42-3): only postmen with volume appear,
    // each BCVH block total equals the BCVH figure of the same period and the grand total equals the six-BCVH total.
    // Rates are volume-weighted from the counts, never averaged. `bcvhId` limits the answer to one BCVH.
    async getPostmanTable({ period, anchorDate, fromDate, toDate, bcvhId = null } = {}) {
        const range = resolvePeriod({ period, anchorDate, fromDate, toDate });
        const wanted = bcvhId && bcvhId !== 'all' ? String(bcvhId) : null;
        if (wanted && !CANONICAL_CODES.includes(wanted)) throw codedError('INVALID_BCVH', 'Mã BCVH không hợp lệ.');
        const codes = wanted ? [wanted] : CANONICAL_CODES;

        const [grid, daysWithData] = await Promise.all([
            this.repository.getPostmanGrid(range.from, range.to, codes),
            this.repository.getDaysWithData(range.from, range.to),
        ]);

        const blocks = new Map(codes.map((code) => {
            const unit = CANONICAL_BCVH_UNITS.find((item) => item.ma_bcvh === code);
            return [code, { ma_bcvh: code, ten_bcvh: unit?.ten_bcvh || code, volume: 0, passed: 0, strict_failed: 0, blank: 0, postmen: [] }];
        }));
        const grand = { volume: 0, passed: 0, strict_failed: 0, blank: 0 };
        for (const row of grid) {
            const block = blocks.get(row.ma_bcvh);
            if (!block) continue;
            const part = {
                volume: Number(row.volume || 0),
                passed: Number(row.passed || 0),
                strict_failed: Number(row.strict_failed || 0),
                blank: Number(row.blank || 0),
            };
            if (part.volume === 0) continue;
            block.postmen.push({ ma_buu_ta: row.ma_buu_ta, ten_buu_ta: row.ten_buu_ta || row.ma_buu_ta, ...part });
            for (const key of ['volume', 'passed', 'strict_failed', 'blank']) {
                block[key] += part[key];
                grand[key] += part[key];
            }
        }

        const units = [...blocks.values()].map((block) => {
            // rank inside the BCVH: rate desc, then volume desc, then code (no shared ranks)
            const ordered = [...block.postmen].sort((a, b) => {
                const ra = a.volume ? a.passed / a.volume : -1;
                const rb = b.volume ? b.passed / b.volume : -1;
                return (rb - ra) || (b.volume - a.volume) || String(a.ma_buu_ta).localeCompare(String(b.ma_buu_ta));
            });
            const rankOf = new Map(ordered.map((postman, index) => [postman.ma_buu_ta, index + 1]));
            const postmen = [...block.postmen]
                .sort((a, b) => (b.volume - a.volume) || String(a.ma_buu_ta).localeCompare(String(b.ma_buu_ta)))
                .map((postman) => ({
                    ma_buu_ta: postman.ma_buu_ta,
                    ten_buu_ta: postman.ten_buu_ta,
                    ...figures(postman.volume, postman.passed, postman.strict_failed, postman.blank),
                    rank: rankOf.get(postman.ma_buu_ta),
                }));
            return {
                ma_bcvh: block.ma_bcvh,
                ten_bcvh: block.ten_bcvh,
                ...figures(block.volume, block.passed, block.strict_failed, block.blank),
                postman_count: postmen.length,
                postmen,
            };
        });

        return {
            meta: {
                period: range.period,
                from_date: range.from,
                to_date: range.to,
                days_with_data: daysWithData,
                has_data: grid.length > 0,
                postman_count: units.reduce((sum, unit) => sum + unit.postman_count, 0),
                target_rate: F42_TARGET_RATE,
            },
            units,
            total_row: { label: 'TỔNG CỘNG', ...figures(grand.volume, grand.passed, grand.strict_failed, grand.blank) },
        };
    }

    // One postman, day by day (F42-POSTMAN-API-01): volume, passed, failed and rate for each day of the range, days
    // without parcels listed with a null rate so a chart shows the gap. `bcvhId` is the scope: a postman is looked up
    // only in that BCVH (every canonical BCVH when it is empty), so a scoped user never reads another office's work.
    async getPostmanTrend({ maBuuTa, fromDate, toDate, bcvhId = null } = {}) {
        const postman = String(maBuuTa || '').trim();
        if (!postman) throw codedError('MISSING_PARAM', 'Yêu cầu ma_buu_ta');
        this._validateRange(fromDate, toDate);
        const span = (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000 + 1;
        if (span > POSTMAN_TREND_MAX_DAYS) throw codedError('INVALID_RANGE', `Khoảng ngày tối đa ${POSTMAN_TREND_MAX_DAYS} ngày.`);
        const wanted = bcvhId && bcvhId !== 'all' ? String(bcvhId) : null;
        if (wanted && !CANONICAL_CODES.includes(wanted)) throw codedError('INVALID_BCVH', 'Mã BCVH không hợp lệ.');

        const rows = await this.repository.getPostmanDaily(fromDate, toDate, wanted ? [wanted] : CANONICAL_CODES, postman);
        const byDay = new Map();
        const offices = new Map();
        let name = null;
        for (const row of rows) {
            const day = byDay.get(row.date) || { volume: 0, passed: 0, strict_failed: 0, blank: 0 };
            day.volume += Number(row.volume || 0);
            day.passed += Number(row.passed || 0);
            day.strict_failed += Number(row.strict_failed || 0);
            day.blank += Number(row.blank || 0);
            byDay.set(row.date, day);
            const office = offices.get(row.ma_bcvh) || { ma_bcvh: row.ma_bcvh, ten_bcvh: row.ten_bcvh || row.ma_bcvh, volume: 0 };
            office.volume += Number(row.volume || 0);
            offices.set(row.ma_bcvh, office);
            name = row.ten_buu_ta || name;
        }

        const days = [];
        const total = { volume: 0, passed: 0, strict_failed: 0, blank: 0 };
        for (let cursor = fromDate; cursor <= toDate; cursor = shiftDay(cursor)) {
            const day = byDay.get(cursor);
            if (!day || day.volume === 0) {
                days.push({ date: cursor, data_available: false, volume: 0, passed: 0, failed: 0, strict_failed: 0, blank: 0, rate: null });
                continue;
            }
            for (const key of Object.keys(total)) total[key] += day[key];
            days.push({ date: cursor, data_available: true, ...figures(day.volume, day.passed, day.strict_failed, day.blank) });
        }

        return {
            meta: {
                ma_buu_ta: postman,
                ten_buu_ta: name || postman,
                from_date: fromDate,
                to_date: toDate,
                days_with_data: days.filter((day) => day.data_available).length,
                has_data: rows.length > 0,
                target_rate: F42_TARGET_RATE,
            },
            offices: [...offices.values()],
            days,
            total_row: { label: 'TỔNG CỘNG', ...figures(total.volume, total.passed, total.strict_failed, total.blank) },
        };
    }
}

module.exports = {
    F42RankingService,
    f42RankingService: new F42RankingService(),
    CANONICAL_CODES,
};
