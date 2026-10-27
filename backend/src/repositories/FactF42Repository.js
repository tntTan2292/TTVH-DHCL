'use strict';

// F42-DASHBOARD-RANKING-01 - read queries for the F4.2 (chat luong phat giao buu ta) Operation Dashboard,
// BCVH Ranking and postman table, over fact_f42.
//
// Generated from the F1.1 repository (itself the F4.1 queries) with the metric column swapped to `danh_gia`
// (the portal rating, PTC dung quy dinh 11,5 h) and the F4.1 counting rule of PD-F42-2: volume = EVERY GBT row,
// passed = danh_gia = 'Dat', failed = volume - passed, so rows without a rating (not delivered yet, returned) stay in
// the denominator and count as not passed; the blank figure and the strict 'Khong dat' figure stay available apart.
// Ranking / overview / weekly cover the 6 canonical BCVH (ma_bc_phat); the module total covers every row. Every
// method returns the same row shape as its FactF11Repository / FactF41Repository twin so the shared BcvhOverviewService
// and BcvhWeeklyComparisonService work unchanged.
//
// New in F4.2: getPostmanGrid() -- one row per postman of a delivery office (PD-F42-3). Reads the detail table
// directly (no day-aggregate table yet: the data holds about 6 500 rows a day for Hue).

const defaultDb = require('../config/db').db;
const { makeSources } = require('./aggSqlSource');

// aggSqlSource builds the counting expressions once; only the detail relation is used.
const SOURCES = makeSources({
    factTable: 'fact_f42',
    aggTable: 'agg_f42_day',
    evaluationColumn: 'danh_gia',
    nameColumn: 'ten_bc_phat',
    failedMode: 'notPassed',
    volumeMode: 'rows',
});

class FactF42Repository {
    constructor(db = defaultDb) {
        this.db = db;
    }

    // Every aggregate read runs on the detail table (build receives the source).
    async _read(method, build) {
        return build(SOURCES.fact);
    }

    getKpiMetrics(startDate, endDate, filters = {}) {
        return this._read('getKpiMetrics', (src) => new Promise((resolve, reject) => {
            const params = [startDate, endDate];
            const bcvhClause = filters.bcvhId ? ' AND ma_bc_phat = ?' : '';
            if (filters.bcvhId) params.push(filters.bcvhId);
            const sql = `
                SELECT
                    ${src.count()} AS total_rows,
                    ${src.rows()} AS total_all_rows,
                    ${src.passed()} AS total_passed,
                    ${src.failed()} AS total_failed,
                    ${src.strictFailed()} AS total_strict_failed,
                    ${src.blank()} AS total_blank,
                    CASE
                        WHEN ${src.count()} = 0 THEN NULL
                        ELSE ROUND((${src.passed()} * 100.0) / ${src.count()}, 2)
                    END AS rate_percent
                FROM ${src.table}
                WHERE ngay_do_kiem BETWEEN ? AND ?${bcvhClause}
            `;
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }));
    }

    getMeta() {
        return this._read('getMeta', (src) => new Promise((resolve, reject) => {
            const sql = `
                SELECT MIN(ngay_do_kiem) AS min_date, MAX(ngay_do_kiem) AS max_date
                FROM ${src.table}
                WHERE ngay_do_kiem <= date('now', 'localtime')
            `;
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row || { min_date: null, max_date: null });
            });
        }));
    }

    // F4.2 scope note: the KPI aggregate
    // (getKpiMetrics with no bcvhId) already sums the entire fact_f42 table
    // unconditionally - this method only tells the caller *whether* rows
    // outside the 6-code canonical BCVH filter exist, so Phase F1 can show
    // an accurate scope caveat without guessing.
    hasNonCanonicalBcvhRows(canonicalCodes) {
        return this._read('hasNonCanonicalBcvhRows', (src) => new Promise((resolve, reject) => {
            const placeholders = canonicalCodes.map(() => '?').join(', ');
            const sql = `
                SELECT EXISTS(
                    SELECT 1 FROM ${src.table}
                    WHERE ma_bc_phat IS NULL OR ma_bc_phat NOT IN (${placeholders})
                    LIMIT 1
                ) AS has_non_canonical
            `;
            this.db.get(sql, canonicalCodes, (err, row) => {
                if (err) reject(err);
                else resolve(!!(row && row.has_non_canonical));
            });
        }));
    }

    getBcvhReconciliation(date) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    ma_bc_phat,
                    MAX(ten_bc_phat) AS ten_bc_phat,
                    COUNT(*) AS total_rows,
                    COUNT(*) AS total_all_rows,
                    SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) AS total_passed,
                    SUM(CASE WHEN danh_gia = 'Đạt' THEN 0 ELSE 1 END) AS total_failed,
                    SUM(CASE WHEN danh_gia = 'Không đạt' THEN 1 ELSE 0 END) AS total_strict_failed,
                    SUM(CASE WHEN danh_gia IS NULL OR TRIM(danh_gia) = '' THEN 1 ELSE 0 END) AS total_blank,
                    CASE
                        WHEN COUNT(*) = 0 THEN NULL
                        ELSE ROUND((SUM(CASE WHEN danh_gia = 'Đạt' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2)
                    END AS rate_percent
                FROM fact_f42
                WHERE ngay_do_kiem = ?
                GROUP BY ma_bc_phat
                ORDER BY ma_bc_phat
            `;
            this.db.all(sql, [date], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // ---------------------------------------------------------------------
    // F11 dashboard (T1/T2): BCVH overview / weekly / monthly /
    // daily-trend read queries. Every method returns the same row shape as its
    // FactBuuGuiRepository twin so the F1.3 BcvhOverviewService and
    // BcvhWeeklyComparisonService can be reused unchanged (Design of Record
    // Section 4.2). F4.2 semantics (PD-F42-2): volume = every row, passed =
    // danh_gia = 'Đạt', failed = volume - passed; blank ratings are
    // inside the denominator (counted as not passed). GROUP BY always names the real
    // column ma_bc_phat; the ma_bcvh / ten_bcvh names exist only as output
    // aliases (fact_f42 has no real column called ma_bcvh).
    // ---------------------------------------------------------------------

    // Every `volume` / `failed` / `khong_dat_kpi_2026` below counts every row (blank ratings included).

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

    // F4.2 has no route dimension: the overview service gets an empty list.
    getBcvhOverviewRoutes() {
        return Promise.resolve([]);
    }

    _getBcvhOverviewAggregate(kind, anchorCeiling, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        return this._read(`getBcvhOverview:${kind}`, (src) => this._overviewSql(src, kind, anchorCeiling, canonicalCodes));
    }

    _overviewSql(src, kind, anchorCeiling, canonicalCodes) {

        const placeholders = canonicalCodes.map(() => '?').join(', ');
        const bounds = `
            WITH bounds AS (
                SELECT MAX(ngay_do_kiem) AS anchor_date
                FROM ${src.table}
                WHERE ngay_do_kiem <= date(?)
                  AND ma_bc_phat IN (${placeholders})
            )
        `;
        const baseParams = [anchorCeiling, ...canonicalCodes];
        let sql;
        let params = baseParams;

        if (kind === 'monthly') {
            sql = `${bounds},
                day_bcvh AS MATERIALIZED (
                    SELECT ngay_do_kiem,
                           ma_bc_phat AS ma_bcvh,
                           MAX(ten_bc_phat) AS ten_bcvh,
                           ${src.count()} AS volume,
                           ${src.passed()} AS passed,
                           ${src.failed()} AS failed
                    FROM ${src.table}, bounds
                    WHERE ngay_do_kiem BETWEEN substr(bounds.anchor_date, 1, 4) || '-01-01' AND bounds.anchor_date
                      AND ma_bc_phat IN (${placeholders})
                    GROUP BY ngay_do_kiem, ma_bc_phat
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
                    FROM ${src.table}, bounds
                    WHERE ngay_do_kiem < date(bounds.anchor_date)
                      AND ma_bc_phat IN (${placeholders})
                ),
                week_bounds AS (
                    SELECT date(bounds.anchor_date, '-7 days') AS week_ago_date
                    FROM bounds
                )
                SELECT ngay_do_kiem AS date,
                       ma_bc_phat AS ma_bcvh,
                       MAX(ten_bc_phat) AS ten_bcvh,
                       ${src.count()} AS volume,
                       ${src.passed()} AS passed,
                       ${src.failed()} AS failed,
                       bounds.anchor_date,
                       prev_bounds.prev_anchor_date,
                       week_bounds.week_ago_date
                FROM ${src.table}, bounds, prev_bounds, week_bounds
                WHERE (
                    ngay_do_kiem BETWEEN substr(bounds.anchor_date, 1, 7) || '-01' AND bounds.anchor_date
                    OR ngay_do_kiem = prev_bounds.prev_anchor_date
                    OR ngay_do_kiem = week_bounds.week_ago_date
                )
                  AND ma_bc_phat IN (${placeholders})
                GROUP BY ngay_do_kiem, ma_bc_phat
                ORDER BY ngay_do_kiem ASC, ma_bc_phat ASC
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
                           ma_bc_phat AS ma_bcvh,
                           MAX(ten_bc_phat) AS ten_bcvh,
                           ${src.count()} AS volume,
                           ${src.passed()} AS passed,
                           ${src.failed()} AS failed
                    FROM ${src.table}, periods
                    WHERE ngay_do_kiem BETWEEN periods.previous_start AND periods.anchor_date
                      AND ma_bc_phat IN (${placeholders})
                    GROUP BY ngay_do_kiem, ma_bc_phat
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
        return this._read('getBcvhWeeksList', (src) => this._all(`
            SELECT
                date(ngay_do_kiem, '-' || ((CAST(strftime('%w', ngay_do_kiem) AS INTEGER) - 4 + 7) % 7) || ' days') AS week_start,
                MIN(ngay_do_kiem) AS first_date,
                MAX(ngay_do_kiem) AS last_date,
                COUNT(DISTINCT ngay_do_kiem) AS days_with_data
            FROM ${src.table}
            WHERE ma_bc_phat IN (${placeholders})
            GROUP BY week_start
            ORDER BY week_start ASC
        `, canonicalCodes));
    }

    getBcvhMonthsList(canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._read('getBcvhMonthsList', (src) => this._all(`
            SELECT
                strftime('%Y-%m-01', ngay_do_kiem) AS month_start,
                MIN(ngay_do_kiem) AS first_date,
                MAX(ngay_do_kiem) AS last_date,
                COUNT(DISTINCT ngay_do_kiem) AS days_with_data
            FROM ${src.table}
            WHERE ma_bc_phat IN (${placeholders})
            GROUP BY month_start
            ORDER BY month_start ASC
        `, canonicalCodes));
    }

    getBcvhWeeklyTrendAggregate(fromDate, toDate, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._read('getBcvhWeeklyTrendAggregate', (src) => this._all(`
            SELECT
                date(ngay_do_kiem, '-' || ((CAST(strftime('%w', ngay_do_kiem) AS INTEGER) - 4 + 7) % 7) || ' days') AS week_start,
                ma_bc_phat AS ma_bcvh,
                ${src.count()} AS volume,
                ${src.passed()} AS passed
            FROM ${src.table}
            WHERE ma_bc_phat IN (${placeholders})
              AND ngay_do_kiem BETWEEN ? AND ?
            GROUP BY week_start, ma_bc_phat
            ORDER BY week_start ASC, ma_bc_phat ASC
        `, [...canonicalCodes, fromDate, toDate]));
    }

    // weekABounds/weekBBounds: { from, to } inclusive ISO dates already resolved by the service.
    getBcvhWeeklyComparisonAggregate(weekABounds, weekBBounds, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._read('getBcvhWeeklyComparisonAggregate', (src) => this._all(`
            SELECT
                ma_bc_phat AS ma_bcvh,
                MAX(ten_bc_phat) AS ten_bcvh,
                ${src.count('ngay_do_kiem BETWEEN ? AND ?')} AS volume_a,
                ${src.passed('ngay_do_kiem BETWEEN ? AND ?')} AS passed_a,
                ${src.count('ngay_do_kiem BETWEEN ? AND ?')} AS volume_b,
                ${src.passed('ngay_do_kiem BETWEEN ? AND ?')} AS passed_b
            FROM ${src.table}
            WHERE ma_bc_phat IN (${placeholders})
              AND (ngay_do_kiem BETWEEN ? AND ? OR ngay_do_kiem BETWEEN ? AND ?)
            GROUP BY ma_bc_phat
        `, [
            weekABounds.from, weekABounds.to,
            weekABounds.from, weekABounds.to,
            weekBBounds.from, weekBBounds.to,
            weekBBounds.from, weekBBounds.to,
            ...canonicalCodes,
            weekABounds.from, weekABounds.to,
            weekBBounds.from, weekBBounds.to,
        ]));
    }

    // One row per canonical BCVH for an inclusive date range (same shape idea as
    // FactBuuGuiRepository.getBcvhOperationMetricsBetween, F4.2 naming kept
    // F1.3-compatible: sl_bg_ptc = every row, dat_kpi_2026 = passed).
    getBcvhOperationMetricsBetween(startDate, endDate, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._read('getBcvhOperationMetricsBetween', (src) => this._all(`
            SELECT
                ma_bc_phat AS ma_bcvh,
                MAX(ten_bc_phat) AS ten_bcvh,
                ${src.count()} AS sl_bg_ptc,
                ${src.passed()} AS dat_kpi_2026,
                ${src.failed()} AS khong_dat_kpi_2026
            FROM ${src.table}
            WHERE ngay_do_kiem BETWEEN ? AND ?
              AND ma_bc_phat IN (${placeholders})
            GROUP BY ma_bc_phat
        `, [startDate, endDate, ...canonicalCodes]));
    }

    // Module-level daily series (every row) or one BCVH.
    getDailyTrendData(fromDate, toDate, filters = {}) {
        const bcvhClause = filters.bcvhId ? ' AND ma_bc_phat = ?' : '';
        const params = [fromDate, toDate, fromDate, toDate];
        if (filters.bcvhId) params.push(filters.bcvhId);
        return this._read('getDailyTrendData', (src) => this._all(`
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
                    ${src.count()} AS total_volume,
                    ${src.passed()} AS passed,
                    ${src.failed()} AS failed
                FROM ${src.table}
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
        `, params));
    }

    getLatestImportMeta() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT ngay_do_kiem, created_at FROM fact_f42 ORDER BY ngay_do_kiem DESC, id DESC LIMIT 1',
                [],
                (err, row) => (err ? reject(err) : resolve(row || null))
            );
        });
    }

    // Postman grid (PD-F42-3): one row per (delivery office, postman) for an inclusive date range, optionally one
    // office. Same definitions as everywhere else: volume = every GBT row, passed = 'Dat', blank counted apart;
    // `strict_failed` = rated 'Khong dat'. Postmen of an office outside `officeCodes` are never returned.
    getPostmanGrid(startDate, endDate, officeCodes = []) {
        if (!officeCodes.length) return Promise.resolve([]);
        const placeholders = officeCodes.map(() => '?').join(', ');
        return this._read('getPostmanGrid', (src) => this._all(`
            SELECT
                ma_bc_phat AS ma_bcvh,
                MAX(ten_bc_phat) AS ten_bcvh,
                ma_buu_ta,
                MAX(ten_buu_ta) AS ten_buu_ta,
                ${src.count()} AS volume,
                ${src.passed()} AS passed,
                ${src.strictFailed()} AS strict_failed,
                ${src.blank()} AS blank
            FROM ${src.table}
            WHERE ngay_do_kiem BETWEEN ? AND ?
              AND ma_bc_phat IN (${placeholders})
            GROUP BY ma_bc_phat, ma_buu_ta
        `, [startDate, endDate, ...officeCodes]));
    }

    // One postman, day by day (F42-POSTMAN-API-01): the same counting rules as the postman grid, limited to the
    // given delivery offices (the caller passes the scope), grouped by data day and office.
    getPostmanDaily(startDate, endDate, officeCodes = [], postmanCode = '') {
        if (!officeCodes.length || !postmanCode) return Promise.resolve([]);
        const placeholders = officeCodes.map(() => '?').join(', ');
        return this._read('getPostmanDaily', (src) => this._all(`
            SELECT
                ngay_do_kiem AS date,
                ma_bc_phat AS ma_bcvh,
                MAX(ten_bc_phat) AS ten_bcvh,
                MAX(ten_buu_ta) AS ten_buu_ta,
                ${src.count()} AS volume,
                ${src.passed()} AS passed,
                ${src.strictFailed()} AS strict_failed,
                ${src.blank()} AS blank
            FROM ${src.table}
            WHERE ngay_do_kiem BETWEEN ? AND ?
              AND ma_buu_ta = ?
              AND ma_bc_phat IN (${placeholders})
            GROUP BY ngay_do_kiem, ma_bc_phat
            ORDER BY ngay_do_kiem ASC
        `, [startDate, endDate, postmanCode, ...officeCodes]));
    }

    getDaysWithData(startDate, endDate) {
        return this._read('getDaysWithData', (src) => new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(DISTINCT ngay_do_kiem) AS days FROM ${src.table} WHERE ngay_do_kiem BETWEEN ? AND ?`,
                [startDate, endDate],
                (err, row) => (err ? reject(err) : resolve(Number(row?.days || 0)))
            );
        }));
    }
}

module.exports = {
    FactF42Repository,
    factF42Repository: new FactF42Repository(),
};
