'use strict';

// F12-DASHBOARD-RANKING-01 - read queries for the F1.2 (thu gom buu gui lien tinh) Operation Dashboard and
// Ranking over fact_f12, ACCEPTING side only (PD-F12-2).
//
// Generated from the F1.1 repository (itself the F4.1 one) with the table and the metric column swapped
// (danh_gia, 10 h rule) and the ranked unit changed from the delivering BCVH to the accepting unit
// (ma_huyen / ten_huyen, 37 units). Same row shapes as FactF11Repository, so the shared
// BcvhOverviewService / BcvhWeeklyComparisonService / F41RankingService work unchanged; the unit list is
// not the six canonical BCVH but the units found in the data (getRankedUnits), injected by F12RankingService.
//
// Metric (PD-F12-5): volume = COUNT(*) of the day's rows (every row has a rating), passed = danh_gia = 'Đạt'.
// Scope (PD-F12-8): the module total (KPI, daily trend) covers every row; ranking / overview / weekly /
// monthly cover every unit EXCEPT the large-customer office 531120, which is counted in the total and
// shown apart (getOfficeGrid), never ranked.
//
// New in F1.2: getRankedUnits(), getOfficeGrid(), getMonthlyUnitGrid().

const LARGE_CUSTOMER_OFFICE = '531120';
const RANKED_OFFICES = ` AND COALESCE(ma_bc_chap_nhan, '') <> '${LARGE_CUSTOMER_OFFICE}'`;

const defaultDb = require('../config/db').db;

class FactF12Repository {
    constructor(db = defaultDb) {
        this.db = db;
    }

    getKpiMetrics(startDate, endDate, filters = {}) {
        return new Promise((resolve, reject) => {
            const params = [startDate, endDate];
            // a unit filter is a ranked-unit view: the large-customer office never belongs to it (PD-F12-8)
            const bcvhClause = filters.bcvhId ? ` AND ma_huyen = ?${RANKED_OFFICES}` : '';
            if (filters.bcvhId) params.push(filters.bcvhId);
            const sql = `
                SELECT
                    COUNT(*) AS total_rows,
                    SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS total_passed,
                    SUM(CASE WHEN danh_gia = 'Không đạt' THEN 1 ELSE 0 END) AS total_failed,
                    SUM(CASE WHEN danh_gia IS NULL OR TRIM(danh_gia) = '' THEN 1 ELSE 0 END) AS total_blank,
                    CASE
                        WHEN COUNT(*) = 0 THEN NULL
                        ELSE ROUND((SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2)
                    END AS rate_percent
                FROM fact_f12
                WHERE ngay_do_kiem BETWEEN ? AND ?${bcvhClause}
            `;
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    getMeta() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT MIN(ngay_do_kiem) AS min_date, MAX(ngay_do_kiem) AS max_date
                FROM fact_f12
                WHERE date(ngay_do_kiem) <= date('now', 'localtime')
            `;
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row || { min_date: null, max_date: null });
            });
        });
    }

    // The units that are ranked: every accepting unit with at least one office other than the large-customer
    // office, named from the data (a unit that only holds 531120 is not ranked).
    getRankedUnits() {
        return this._all(`
            SELECT ma_huyen AS ma_bcvh, MAX(ten_huyen) AS ten_bcvh
            FROM fact_f12
            WHERE ma_huyen IS NOT NULL AND TRIM(ma_huyen) <> ''${RANKED_OFFICES}
            GROUP BY ma_huyen
            ORDER BY MAX(ten_huyen) ASC, ma_huyen ASC
        `);
    }

    // True when rows of the large-customer office exist (they are in the module total, not in the ranking).
    hasLargeCustomerRows() {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT EXISTS(SELECT 1 FROM fact_f12 WHERE ma_bc_chap_nhan = '${LARGE_CUSTOMER_OFFICE}' LIMIT 1) AS present`,
                [],
                (err, row) => (err ? reject(err) : resolve(Boolean(row && row.present)))
            );
        });
    }

    // ---------------------------------------------------------------------
    // F12 dashboard: BCVH overview / weekly / monthly /
    // daily-trend read queries. Every method returns the same row shape as its
    // FactBuuGuiRepository twin so the F1.3 BcvhOverviewService and
    // BcvhWeeklyComparisonService can be reused unchanged (Design of Record
    // Section 4.2). F1.1 semantics (DC-6): volume = COUNT(*) of all rows,
    // passed = danh_gia = 'Đạt', failed = NOT passed (see below); blank
    // evaluations stay in the denominator. GROUP BY always names the real
    // column ma_huyen; the ma_bcvh / ten_bcvh names exist only as output
    // aliases (fact_f12 has no real column called ma_bcvh).
    // ---------------------------------------------------------------------

    // PO decision 2026-10-08: in these dashboard/ranking views a row with a blank evaluation is in the
    // denominator and counts as NOT passed, so every `failed` / `khong_dat_kpi_2026` below is
    // COUNT(*) - passed (displayed as "Không đạt"). The later Evidence module will split out
    // "Chưa có đánh giá". getKpiMetrics / getBcvhReconciliation (F11 minimum dashboard) keep the
    // strict Không đạt / blank split and are not changed.

    _all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    getBcvhOverviewMonthly(anchorCeiling, canonicalCodes = []) {
        return this._getBcvhOverviewAggregate('monthly', anchorCeiling, canonicalCodes);
    }

    getBcvhOverviewDaily(anchorCeiling, canonicalCodes = []) {
        return this._getBcvhOverviewAggregate('daily', anchorCeiling, canonicalCodes);
    }

    getBcvhOverviewMtd(anchorCeiling, canonicalCodes = []) {
        return this._getBcvhOverviewAggregate('mtd', anchorCeiling, canonicalCodes);
    }

    // F1.2 has no route block: the overview service gets an empty list.
    getBcvhOverviewRoutes() {
        return Promise.resolve([]);
    }

    _getBcvhOverviewAggregate(kind, anchorCeiling, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);

        const placeholders = canonicalCodes.map(() => '?').join(', ');
        const bounds = `
            WITH bounds AS (
                SELECT MAX(ngay_do_kiem) AS anchor_date
                FROM fact_f12
                WHERE date(ngay_do_kiem) <= date(?)
                  AND ma_huyen IN (${placeholders})${RANKED_OFFICES}
            )
        `;
        const baseParams = [anchorCeiling, ...canonicalCodes];
        let sql;
        let params = baseParams;

        if (kind === 'monthly') {
            sql = `${bounds},
                day_bcvh AS MATERIALIZED (
                    SELECT ngay_do_kiem,
                           ma_huyen AS ma_bcvh,
                           MAX(ten_huyen) AS ten_bcvh,
                           COUNT(*) AS volume,
                           SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                           SUM(CASE WHEN danh_gia = 'Đạt' THEN 0 ELSE 1 END) AS failed
                    FROM fact_f12, bounds
                    WHERE ngay_do_kiem BETWEEN substr(bounds.anchor_date, 1, 4) || '-01-01' AND bounds.anchor_date
                      AND ma_huyen IN (${placeholders})${RANKED_OFFICES}
                    GROUP BY ngay_do_kiem, ma_huyen
                ),
                global_days AS (
                    SELECT substr(ngay_do_kiem, 1, 7) AS month,
                           COUNT(DISTINCT ngay_do_kiem) AS days_in_period
                    FROM day_bcvh
                    GROUP BY substr(ngay_do_kiem, 1, 7)
                ),
                agg AS (
                    SELECT substr(ngay_do_kiem, 1, 7) AS month,
                           ma_bcvh,
                           MAX(ten_bcvh) AS ten_bcvh,
                           SUM(volume) AS volume,
                           SUM(passed) AS passed,
                           SUM(failed) AS failed,
                           COUNT(*) AS days_with_data
                    FROM day_bcvh
                    GROUP BY substr(ngay_do_kiem, 1, 7), ma_bcvh
                )
                SELECT agg.*, global_days.days_in_period, bounds.anchor_date
                FROM agg
                JOIN global_days ON global_days.month = agg.month
                CROSS JOIN bounds
                ORDER BY agg.month ASC, agg.ma_bcvh ASC
            `;
            params = [...baseParams, ...canonicalCodes];
        } else if (kind === 'daily') {
            sql = `${bounds},
                prev_bounds AS (
                    SELECT MAX(ngay_do_kiem) AS prev_anchor_date
                    FROM fact_f12, bounds
                    WHERE date(ngay_do_kiem) < date(bounds.anchor_date)
                      AND ma_huyen IN (${placeholders})${RANKED_OFFICES}
                ),
                week_bounds AS (
                    SELECT date(bounds.anchor_date, '-7 days') AS week_ago_date
                    FROM bounds
                )
                SELECT ngay_do_kiem AS date,
                       ma_huyen AS ma_bcvh,
                       MAX(ten_huyen) AS ten_bcvh,
                       COUNT(*) AS volume,
                       SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                       SUM(CASE WHEN danh_gia = 'Đạt' THEN 0 ELSE 1 END) AS failed,
                       bounds.anchor_date,
                       prev_bounds.prev_anchor_date,
                       week_bounds.week_ago_date
                FROM fact_f12, bounds, prev_bounds, week_bounds
                WHERE (
                    ngay_do_kiem BETWEEN substr(bounds.anchor_date, 1, 7) || '-01' AND bounds.anchor_date
                    OR ngay_do_kiem = prev_bounds.prev_anchor_date
                    OR ngay_do_kiem = week_bounds.week_ago_date
                )
                  AND ma_huyen IN (${placeholders})${RANKED_OFFICES}
                GROUP BY ngay_do_kiem, ma_huyen
                ORDER BY ngay_do_kiem ASC, ma_huyen ASC
            `;
            params = [...baseParams, ...canonicalCodes, ...canonicalCodes];
        } else if (kind === 'mtd') {
            sql = `${bounds},
                periods AS (
                    SELECT anchor_date,
                           substr(anchor_date, 1, 7) || '-01' AS current_start,
                           date(substr(anchor_date, 1, 7) || '-01', '-1 month') AS previous_start,
                           MIN(
                               date(substr(anchor_date, 1, 7) || '-01', '-1 month',
                                    '+' || (CAST(strftime('%d', anchor_date) AS INTEGER) - 1) || ' days'),
                               date(substr(anchor_date, 1, 7) || '-01', '-1 day')
                           ) AS previous_end
                    FROM bounds
                ),
                day_bcvh AS MATERIALIZED (
                    SELECT ngay_do_kiem,
                           ma_huyen AS ma_bcvh,
                           MAX(ten_huyen) AS ten_bcvh,
                           COUNT(*) AS volume,
                           SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                           SUM(CASE WHEN danh_gia = 'Đạt' THEN 0 ELSE 1 END) AS failed
                    FROM fact_f12, periods
                    WHERE ngay_do_kiem BETWEEN periods.previous_start AND periods.anchor_date
                      AND ma_huyen IN (${placeholders})${RANKED_OFFICES}
                    GROUP BY ngay_do_kiem, ma_huyen
                ),
                current_agg AS (
                    SELECT ma_bcvh, MAX(ten_bcvh) AS ten_bcvh,
                           SUM(volume) AS volume,
                           SUM(passed) AS passed,
                           SUM(failed) AS failed
                    FROM day_bcvh, periods
                    WHERE ngay_do_kiem BETWEEN periods.current_start AND periods.anchor_date
                    GROUP BY ma_bcvh
                ),
                previous_agg AS (
                    SELECT ma_bcvh,
                           SUM(volume) AS previous_volume,
                           SUM(passed) AS previous_passed
                    FROM day_bcvh, periods
                    WHERE ngay_do_kiem BETWEEN periods.previous_start AND periods.previous_end
                    GROUP BY ma_bcvh
                ),
                previous_full_agg AS (
                    SELECT ma_bcvh,
                           SUM(volume) AS previous_full_volume,
                           SUM(passed) AS previous_full_passed
                    FROM day_bcvh, periods
                    WHERE ngay_do_kiem BETWEEN periods.previous_start AND date(periods.current_start, '-1 day')
                    GROUP BY ma_bcvh
                )
                SELECT current_agg.*, previous_agg.previous_volume, previous_agg.previous_passed,
                       previous_full_agg.previous_full_volume, previous_full_agg.previous_full_passed,
                       periods.anchor_date
                FROM current_agg
                LEFT JOIN previous_agg USING (ma_bcvh)
                LEFT JOIN previous_full_agg USING (ma_bcvh)
                CROSS JOIN periods
                ORDER BY current_agg.ma_bcvh ASC
            `;
            params = [...baseParams, ...canonicalCodes];
        } else {
            return Promise.reject(new Error(`Unsupported BCVH overview aggregate: ${kind}`));
        }

        return this._all(sql, params);
    }

    // Custom week = Thursday..Wednesday (same rule as F1.3, PO decision on
    // F13-BCVH-WEEKLY-COMPARISON-01): week_start is the Thursday on/before the date.
    getBcvhWeeksList(canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._all(`
            SELECT
                date(ngay_do_kiem, '-' || ((CAST(strftime('%w', ngay_do_kiem) AS INTEGER) - 4 + 7) % 7) || ' days') AS week_start,
                MIN(ngay_do_kiem) AS first_date,
                MAX(ngay_do_kiem) AS last_date,
                COUNT(DISTINCT ngay_do_kiem) AS days_with_data
            FROM fact_f12
            WHERE ma_huyen IN (${placeholders})${RANKED_OFFICES}
            GROUP BY week_start
            ORDER BY week_start ASC
        `, canonicalCodes);
    }

    getBcvhMonthsList(canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._all(`
            SELECT
                strftime('%Y-%m-01', ngay_do_kiem) AS month_start,
                MIN(ngay_do_kiem) AS first_date,
                MAX(ngay_do_kiem) AS last_date,
                COUNT(DISTINCT ngay_do_kiem) AS days_with_data
            FROM fact_f12
            WHERE ma_huyen IN (${placeholders})${RANKED_OFFICES}
            GROUP BY month_start
            ORDER BY month_start ASC
        `, canonicalCodes);
    }

    getBcvhWeeklyTrendAggregate(fromDate, toDate, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._all(`
            SELECT
                date(ngay_do_kiem, '-' || ((CAST(strftime('%w', ngay_do_kiem) AS INTEGER) - 4 + 7) % 7) || ' days') AS week_start,
                ma_huyen AS ma_bcvh,
                COUNT(*) AS volume,
                SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed
            FROM fact_f12
            WHERE ma_huyen IN (${placeholders})${RANKED_OFFICES}
              AND ngay_do_kiem BETWEEN ? AND ?
            GROUP BY week_start, ma_huyen
            ORDER BY week_start ASC, ma_huyen ASC
        `, [...canonicalCodes, fromDate, toDate]);
    }

    // weekABounds/weekBBounds: { from, to } inclusive ISO dates already resolved by the service.
    getBcvhWeeklyComparisonAggregate(weekABounds, weekBBounds, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._all(`
            SELECT
                ma_huyen AS ma_bcvh,
                MAX(ten_huyen) AS ten_bcvh,
                SUM(CASE WHEN ngay_do_kiem BETWEEN ? AND ? THEN 1 ELSE 0 END) AS volume_a,
                SUM(CASE WHEN ngay_do_kiem BETWEEN ? AND ? AND danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed_a,
                SUM(CASE WHEN ngay_do_kiem BETWEEN ? AND ? THEN 1 ELSE 0 END) AS volume_b,
                SUM(CASE WHEN ngay_do_kiem BETWEEN ? AND ? AND danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed_b
            FROM fact_f12
            WHERE ma_huyen IN (${placeholders})${RANKED_OFFICES}
              AND (ngay_do_kiem BETWEEN ? AND ? OR ngay_do_kiem BETWEEN ? AND ?)
            GROUP BY ma_huyen
        `, [
            weekABounds.from, weekABounds.to,
            weekABounds.from, weekABounds.to,
            weekBBounds.from, weekBBounds.to,
            weekBBounds.from, weekBBounds.to,
            ...canonicalCodes,
            weekABounds.from, weekABounds.to,
            weekBBounds.from, weekBBounds.to,
        ]);
    }

    // One row per canonical BCVH for an inclusive date range (same shape idea as
    // FactBuuGuiRepository.getBcvhOperationMetricsBetween, F1.1 naming kept
    // F1.3-compatible: sl_bg_ptc = all rows, dat_kpi_2026 = passed).
    getBcvhOperationMetricsBetween(startDate, endDate, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._all(`
            SELECT
                ma_huyen AS ma_bcvh,
                MAX(ten_huyen) AS ten_bcvh,
                COUNT(*) AS sl_bg_ptc,
                SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS dat_kpi_2026,
                SUM(CASE WHEN danh_gia = 'Đạt' THEN 0 ELSE 1 END) AS khong_dat_kpi_2026
            FROM fact_f12
            WHERE ngay_do_kiem BETWEEN ? AND ?
              AND ma_huyen IN (${placeholders})${RANKED_OFFICES}
            GROUP BY ma_huyen
        `, [startDate, endDate, ...canonicalCodes]);
    }

    // Module-level daily series (all rows, PO-2 total-rows denominator) or one BCVH.
    getDailyTrendData(fromDate, toDate, filters = {}) {
        const bcvhClause = filters.bcvhId ? ` AND ma_huyen = ?${RANKED_OFFICES}` : '';
        const params = [fromDate, toDate, fromDate, toDate];
        if (filters.bcvhId) params.push(filters.bcvhId);
        return this._all(`
            WITH RECURSIVE dates(date_value) AS (
                SELECT date(?)
                UNION ALL
                SELECT date(date_value, '+1 day')
                FROM dates
                WHERE date_value < date(?)
            ),
            agg AS (
                SELECT
                    ngay_do_kiem AS date_value,
                    COUNT(*) AS total_volume,
                    SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                    SUM(CASE WHEN danh_gia = 'Đạt' THEN 0 ELSE 1 END) AS failed
                FROM fact_f12
                WHERE ngay_do_kiem BETWEEN date(?) AND date(?)
                ${bcvhClause}
                GROUP BY ngay_do_kiem
            )
            SELECT
                d.date_value AS date,
                COALESCE(a.total_volume, 0) AS total_volume,
                COALESCE(a.passed, 0) AS passed,
                COALESCE(a.failed, 0) AS failed,
                CASE
                    WHEN COALESCE(a.total_volume, 0) = 0 THEN NULL
                    ELSE ROUND((CAST(COALESCE(a.passed, 0) AS REAL) / COALESCE(a.total_volume, 0)) * 100, 4)
                END AS quality_rate,
                CASE WHEN COALESCE(a.total_volume, 0) > 0 THEN 1 ELSE 0 END AS data_available
            FROM dates d
            LEFT JOIN agg a ON a.date_value = d.date_value
            ORDER BY d.date_value ASC
        `, params);
    }

    getLatestImportMeta() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT ngay_do_kiem, created_at FROM fact_f12 ORDER BY ngay_do_kiem DESC, id DESC LIMIT 1',
                [],
                (err, row) => (err ? reject(err) : resolve(row || null))
            );
        });
    }

    // One row per (accepting unit, accepting office) for an inclusive date range: volume = all rows, passed =
    // 'Đạt'. The large-customer office is included here (flagged by the service) so the grid sums to the
    // module total.
    getOfficeGrid(startDate, endDate) {
        return this._all(`
            SELECT
                COALESCE(ma_huyen, '') AS ma_huyen,
                MAX(ten_huyen) AS ten_huyen,
                COALESCE(ma_bc_chap_nhan, '') AS ma_chap_nhan,
                MAX(ten_bc_chap_nhan) AS ten_chap_nhan,
                COUNT(*) AS volume,
                SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed
            FROM fact_f12
            WHERE ngay_do_kiem BETWEEN ? AND ?
            GROUP BY ma_huyen, ma_bc_chap_nhan
        `, [startDate, endDate]);
    }

    // One row per (month, unit, large-customer flag) for the rolling 12-month block: sums of the daily rows.
    getMonthlyUnitGrid(startDate, endDate) {
        return this._all(`
            SELECT
                substr(ngay_do_kiem, 1, 7) AS month,
                COALESCE(ma_huyen, '') AS ma_bcvh,
                MAX(ten_huyen) AS ten_bcvh,
                CASE WHEN COALESCE(ma_bc_chap_nhan, '') = '${LARGE_CUSTOMER_OFFICE}' THEN 1 ELSE 0 END AS large_customer,
                COUNT(DISTINCT ngay_do_kiem) AS days_with_data,
                COUNT(*) AS volume,
                SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS passed
            FROM fact_f12
            WHERE ngay_do_kiem BETWEEN ? AND ?
            GROUP BY substr(ngay_do_kiem, 1, 7), ma_huyen, large_customer
        `, [startDate, endDate]);
    }

    // Distinct days with data per month (module level), for the rolling 12-month block.
    getDaysByMonth(startDate, endDate) {
        return this._all(`
            SELECT substr(ngay_do_kiem, 1, 7) AS month, COUNT(DISTINCT ngay_do_kiem) AS days_with_data
            FROM fact_f12
            WHERE ngay_do_kiem BETWEEN ? AND ?
            GROUP BY substr(ngay_do_kiem, 1, 7)
        `, [startDate, endDate]);
    }

    getDaysWithData(startDate, endDate) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT COUNT(DISTINCT ngay_do_kiem) AS days FROM fact_f12 WHERE ngay_do_kiem BETWEEN ? AND ?',
                [startDate, endDate],
                (err, row) => (err ? reject(err) : resolve(Number(row?.days || 0)))
            );
        });
    }
}

module.exports = {
    FactF12Repository,
    factF12Repository: new FactF12Repository(),
    LARGE_CUSTOMER_OFFICE,
};
