'use strict';

// F41-DASHBOARD-RANKING-01 (T1) - national rank of Hue among the provinces of
// fact_f41_national, the F4.1 counterpart of F13DashboardService's
// getNationalRankSummary / getNationalRanksForDates.
//
// Rule (Design of Record Section 5, PO decision 2026-10-08): rank by the
// published national rate of "PTC 8 gio (Co TMS)":
//     SUM(sl_ptc_8h_co_tms) / SUM(sl_ptc_nop_tien_ch)
// over the requested range, descending; ties broken by volume descending and
// never merged. The tl_* text columns are NOT used. The rank is for Hue as a
// whole. Result shape mirrors F13DashboardService so the F1.3 BCVH overview /
// weekly services consume it unchanged (they read available, rank, total).

const defaultDb = require('../config/db').db;

const METRIC = 'tl_ptc_8h_co_tms';
const METRIC_LABEL = 'Tỷ lệ PTC 8 giờ (Có TMS) theo báo cáo toàn quốc';
const TIE_BEHAVIOR = 'Thứ tự theo tỷ lệ giảm dần, sau đó theo sản lượng giảm dần; không gộp đồng hạng.';
const DEFAULT_PROVINCE_CODE = '53';

function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function rate(passed, volume) {
    if (!volume) return 0;
    return Number(((passed / volume) * 100).toFixed(1));
}

class F41NationalRankService {
    constructor(db = defaultDb) {
        this.db = db;
    }

    _all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
        });
    }

    _get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
        });
    }

    async _provinceCode() {
        try {
            const row = await this._get("SELECT config_value FROM system_config WHERE config_key = 'default_province_code'");
            return row?.config_value || DEFAULT_PROVINCE_CODE;
        } catch {
            return DEFAULT_PROVINCE_CODE;
        }
    }

    _unavailableForDate(dateStr, provinceCode, reason = 'missing_date') {
        return {
            available: false,
            message: reason === 'missing_province'
                ? `Chưa có dữ liệu xếp hạng của Huế trong bảng toàn quốc ngày ${dateStr}`
                : `Chưa có dữ liệu xếp hạng toàn quốc cho ngày ${dateStr}`,
            province_code: provinceCode,
            period: dateStr,
            period_start: dateStr,
            period_end: dateStr,
            period_type: 'single_date',
        };
    }

    // Ranked provinces for an inclusive range (one row per ma_don_vi).
    async _rankedRange(startDate, endDate) {
        return this._all(`
            SELECT
                ma_don_vi,
                MAX(ten_don_vi) AS ten_don_vi,
                SUM(sl_ptc_nop_tien_ch) AS volume,
                SUM(sl_ptc_8h_co_tms) AS passed
            FROM fact_f41_national
            WHERE ngay_do_kiem BETWEEN ? AND ?
            GROUP BY ma_don_vi
            HAVING SUM(sl_ptc_nop_tien_ch) > 0
            ORDER BY (SUM(sl_ptc_8h_co_tms) * 1.0 / SUM(sl_ptc_nop_tien_ch)) DESC,
                     SUM(sl_ptc_nop_tien_ch) DESC,
                     ma_don_vi ASC
        `, [startDate, endDate]);
    }

    _buildRank(rows, provinceCode, startDate, endDate) {
        if (!rows.length) return null;
        const index = rows.findIndex((row) => String(row.ma_don_vi) === String(provinceCode));
        if (index < 0) return null;
        const province = rows[index];
        const volume = Number(province.volume || 0);
        const passed = Number(province.passed || 0);
        return {
            available: true,
            rank: index + 1,
            total: rows.length,
            period: startDate === endDate ? endDate : `${startDate}..${endDate}`,
            period_start: startDate,
            period_end: endDate,
            period_type: startDate === endDate ? 'single_date' : 'selected_range',
            province_code: province.ma_don_vi,
            province_name: province.ten_don_vi,
            metric: METRIC,
            metric_label: METRIC_LABEL,
            metric_value: rate(passed, volume),
            volume,
            passed,
            direction: 'desc',
            tie_behavior: TIE_BEHAVIOR,
        };
    }

    async getNationalRankSummary(startDate, endDate) {
        const provinceCode = await this._provinceCode();
        const unavailable = {
            available: false,
            message: 'Chưa có dữ liệu xếp hạng toàn quốc',
            province_code: provinceCode,
            requested_period: endDate,
            requested_period_start: startDate,
            requested_period_end: endDate,
        };
        if (!isIsoDate(startDate) || !isIsoDate(endDate) || startDate > endDate) return unavailable;

        const current = this._buildRank(await this._rankedRange(startDate, endDate), provinceCode, startDate, endDate);
        if (!current) return unavailable;

        const previousRow = await this._get(
            'SELECT MAX(ngay_do_kiem) AS period FROM fact_f41_national WHERE ngay_do_kiem < ?',
            [startDate]
        );
        const previous = previousRow?.period
            ? this._buildRank(await this._rankedRange(previousRow.period, previousRow.period), provinceCode, previousRow.period, previousRow.period)
            : null;

        return {
            ...current,
            requested_period: endDate,
            requested_period_start: startDate,
            requested_period_end: endDate,
            previous_period: previous?.period || null,
            previous_rank: previous?.rank || null,
            movement: previous ? previous.rank - current.rank : null,
        };
    }

    // One query for many single dates (daily-trend). Same result shape per date.
    async getNationalRanksForDates(dates = []) {
        const uniqueDates = [...new Set((dates || []).filter(isIsoDate))].sort();
        if (!uniqueDates.length) return {};
        const provinceCode = await this._provinceCode();
        const placeholders = uniqueDates.map(() => '?').join(', ');
        const rows = await this._all(`
            SELECT ngay_do_kiem, ma_don_vi, ten_don_vi,
                   sl_ptc_nop_tien_ch AS volume, sl_ptc_8h_co_tms AS passed
            FROM fact_f41_national
            WHERE ngay_do_kiem IN (${placeholders}) AND sl_ptc_nop_tien_ch > 0
            ORDER BY ngay_do_kiem ASC,
                     (sl_ptc_8h_co_tms * 1.0 / sl_ptc_nop_tien_ch) DESC,
                     sl_ptc_nop_tien_ch DESC,
                     ma_don_vi ASC
        `, uniqueDates);

        const byDate = rows.reduce((acc, row) => {
            (acc[row.ngay_do_kiem] = acc[row.ngay_do_kiem] || []).push(row);
            return acc;
        }, {});

        return uniqueDates.reduce((acc, dateStr) => {
            const dateRows = byDate[dateStr] || [];
            if (!dateRows.length) {
                acc[dateStr] = this._unavailableForDate(dateStr, provinceCode, 'missing_date');
                return acc;
            }
            const built = this._buildRank(dateRows, provinceCode, dateStr, dateStr);
            acc[dateStr] = built || this._unavailableForDate(dateStr, provinceCode, 'missing_province');
            return acc;
        }, {});
    }

    unavailableForDate(dateStr) {
        return this._unavailableForDate(dateStr, null);
    }
}

module.exports = {
    F41NationalRankService,
    f41NationalRankService: new F41NationalRankService(),
    NATIONAL_RANK_METRIC: METRIC,
    NATIONAL_RANK_METRIC_LABEL: METRIC_LABEL,
};
