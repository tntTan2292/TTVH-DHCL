'use strict';

// F11-PHASE-4 - national rank of Hue among the 34 ranked provinces, F1.1 counterpart of
// F41NationalRankService (same public methods and result shape, so the shared overview/weekly
// services consume it unchanged).
//
// Rule (PO decision PD-17, 2026-10-09): rank by the DELIVERING province (ma_tinh_phat). Every row of
// a province is added first -- numerators (sl_dung_chi_tieu) and denominators (sl_theo_chi_tieu),
// whatever the accepting province -- and only then is the rate computed and ranked. Only the 34
// frozen national-ranking codes are ranked; other delivery codes (district centres, Binh Duong...)
// are ignored, as in F1.3/F4.1 (Q-16). The rate is the PUBLISHED national KPI-2026 rate (rows that
// cannot be evaluated yet are not in the denominator) and is labelled as such; it never replaces
// the Hue dashboard figure, which counts blank evaluations as 0 Dat (PD-9).

const defaultDb = require('../config/db').db;
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');

const METRIC = 'tl_dung_chi_tieu';
const METRIC_LABEL = 'Tỷ lệ KPI 2026 theo báo cáo toàn quốc';
const TIE_BEHAVIOR = 'Thứ tự theo tỷ lệ giảm dần, sau đó theo sản lượng giảm dần; không gộp đồng hạng.';
const DEFAULT_PROVINCE_CODE = '53';
const RANKED_PLACEHOLDERS = NATIONAL_RANKED_PROVINCE_CODES.map(() => '?').join(', ');

function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function rate(passed, volume) {
    if (!volume) return 0;
    return Number(((passed / volume) * 100).toFixed(1));
}

class F11NationalRankService {
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

    // Ranked provinces for an inclusive range: one row per delivering province, rows summed first.
    async _rankedRange(startDate, endDate) {
        return this._all(`
            SELECT
                ma_tinh_phat AS ma_don_vi,
                MAX(ten_tinh_phat) AS ten_don_vi,
                SUM(sl_theo_chi_tieu) AS volume,
                SUM(sl_dung_chi_tieu) AS passed
            FROM fact_f11_national
            WHERE ngay_do_kiem BETWEEN ? AND ?
              AND ma_tinh_phat IN (${RANKED_PLACEHOLDERS})
            GROUP BY ma_tinh_phat
            HAVING SUM(sl_theo_chi_tieu) > 0
            ORDER BY (SUM(sl_dung_chi_tieu) * 1.0 / SUM(sl_theo_chi_tieu)) DESC,
                     SUM(sl_theo_chi_tieu) DESC,
                     ma_tinh_phat ASC
        `, [startDate, endDate, ...NATIONAL_RANKED_PROVINCE_CODES]);
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
            'SELECT MAX(ngay_do_kiem) AS period FROM fact_f11_national WHERE ngay_do_kiem < ?',
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
        const datePlaceholders = uniqueDates.map(() => '?').join(', ');
        const rows = await this._all(`
            SELECT ngay_do_kiem, ma_tinh_phat AS ma_don_vi, MAX(ten_tinh_phat) AS ten_don_vi,
                   SUM(sl_theo_chi_tieu) AS volume, SUM(sl_dung_chi_tieu) AS passed
            FROM fact_f11_national
            WHERE ngay_do_kiem IN (${datePlaceholders})
              AND ma_tinh_phat IN (${RANKED_PLACEHOLDERS})
            GROUP BY ngay_do_kiem, ma_tinh_phat
            HAVING SUM(sl_theo_chi_tieu) > 0
            ORDER BY ngay_do_kiem ASC,
                     (SUM(sl_dung_chi_tieu) * 1.0 / SUM(sl_theo_chi_tieu)) DESC,
                     SUM(sl_theo_chi_tieu) DESC,
                     ma_tinh_phat ASC
        `, [...uniqueDates, ...NATIONAL_RANKED_PROVINCE_CODES]);

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
    F11NationalRankService,
    f11NationalRankService: new F11NationalRankService(),
    NATIONAL_RANK_METRIC: METRIC,
    NATIONAL_RANK_METRIC_LABEL: METRIC_LABEL,
};
