'use strict';

const defaultDb = require('../config/db').db;

const INSERT_COLUMNS = [
    'ngay_do_kiem',
    'stt',
    'ma_tinh_phat',
    'ten_tinh_phat',
    'ma_huyen_phat',
    'ten_huyen_phat',
    'dia_ban_phat',
    'ma_bc_phat',
    'ten_bc_phat',
    'loai_bcp',
    'dich_vu',
    'loai_dv',
    'nhom_spdv',
    'ma_spdv',
    'ma_bg',
    'so_hieu_lo',
    'so_tien_cod',
    'khoi_luong_thuc_te',
    'khoi_luong_quy_doi',
    'ma_khl',
    'ten_khl',
    'nhom_khach_hang',
    'so_hieu_bd10_xnd_bcp',
    'thoi_gian_bcp_xnd_bd10',
    'thoi_gian_bd10_quet_xuong_bcp',
    'so_hieu_bd8_xnd_bcp',
    'thoi_gian_bcp_xnd_bd8',
    'thoi_gian_xnd_bd1',
    'thoi_gian_ptc',
    'thoi_gian_nop_tien',
    'thoi_gian_tms_xnd_bcp',
    'thoi_gian_khong_tms_thuc_hien_ptc',
    'thoi_gian_co_tms_thuc_hien_ptc',
    'thoi_gian_khong_tms_thuc_hien_pld',
    'thoi_gian_co_tms_thuc_hien_pld',
    'thoi_gian_chuyen_hoan',
    'danh_gia_12_5h',
    'danh_gia_72h',
    'thoi_gian_phat_thanh_cong_lan_dau',
    'danh_gia_khong_tms_ptc_8h',
    'danh_gia_co_tms_ptc_8h',
    'danh_gia_khong_tms_ptc_lan_dau_8h',
    'danh_gia_co_tms_ptc_lan_dau_8h',
];

class FactF41Repository {
    constructor(db = defaultDb) {
        this.db = db;
    }

    overwriteImport(date, rows, importLogId = null) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION;', (beginErr) => {
                    if (beginErr) return reject(beginErr);

                    this.db.run('DELETE FROM fact_f41 WHERE ngay_do_kiem = ?', [date], (deleteErr) => {
                        if (deleteErr) return this.db.run('ROLLBACK;', () => reject(deleteErr));

                        const columns = [...INSERT_COLUMNS];
                        if (importLogId !== null) columns.splice(1, 0, 'import_log_id');
                        const placeholders = columns.map(() => '?').join(', ');
                        const sql = `INSERT INTO fact_f41 (${columns.join(', ')}) VALUES (${placeholders})`;
                        const stmt = this.db.prepare(sql, (prepareErr) => {
                            if (prepareErr) return this.db.run('ROLLBACK;', () => reject(prepareErr));
                        });

                        let hasError = false;
                        for (const row of rows) {
                            const values = columns.map((column) => {
                                if (column === 'import_log_id') return importLogId;
                                if (column === 'ngay_do_kiem') return date;
                                return row[column] ?? null;
                            });
                            stmt.run(values, (insertErr) => {
                                if (insertErr && !hasError) {
                                    hasError = true;
                                    this.db.run('ROLLBACK;', () => reject(insertErr));
                                }
                            });
                        }

                        stmt.finalize((finalizeErr) => {
                            if (finalizeErr && !hasError) {
                                hasError = true;
                                this.db.run('ROLLBACK;', () => reject(finalizeErr));
                            } else if (!hasError) {
                                this.db.run('COMMIT;', (commitErr) => {
                                    if (commitErr) reject(commitErr);
                                    else resolve({ inserted: rows.length, ngay_do_kiem: date });
                                });
                            }
                        });
                    });
                });
            });
        });
    }

    getKpiMetrics(startDate, endDate, filters = {}) {
        return new Promise((resolve, reject) => {
            const params = [startDate, endDate];
            const bcvhClause = filters.bcvhId ? ' AND ma_bc_phat = ?' : '';
            if (filters.bcvhId) params.push(filters.bcvhId);
            const sql = `
                SELECT
                    COUNT(*) AS total_rows,
                    SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS total_passed,
                    SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Không đạt' THEN 1 ELSE 0 END) AS total_failed,
                    SUM(CASE WHEN danh_gia_co_tms_ptc_8h IS NULL OR TRIM(danh_gia_co_tms_ptc_8h) = '' THEN 1 ELSE 0 END) AS total_blank,
                    CASE
                        WHEN COUNT(*) = 0 THEN NULL
                        ELSE ROUND((SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2)
                    END AS rate_percent
                FROM fact_f41
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
                FROM fact_f41
                WHERE date(ngay_do_kiem) <= date('now', 'localtime')
            `;
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row || { min_date: null, max_date: null });
            });
        });
    }

    // ITR-F41-NB-04 remediation (PO decision, Phương án A): the KPI aggregate
    // (getKpiMetrics with no bcvhId) already sums the entire fact_f41 table
    // unconditionally - this method only tells the caller *whether* rows
    // outside the 6-code canonical BCVH filter exist, so Phase F1 can show
    // an accurate scope caveat without guessing.
    hasNonCanonicalBcvhRows(canonicalCodes) {
        return new Promise((resolve, reject) => {
            const placeholders = canonicalCodes.map(() => '?').join(', ');
            const sql = `
                SELECT EXISTS(
                    SELECT 1 FROM fact_f41
                    WHERE ma_bc_phat IS NULL OR ma_bc_phat NOT IN (${placeholders})
                    LIMIT 1
                ) AS has_non_canonical
            `;
            this.db.get(sql, canonicalCodes, (err, row) => {
                if (err) reject(err);
                else resolve(!!(row && row.has_non_canonical));
            });
        });
    }

    getBcvhReconciliation(date) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    ma_bc_phat,
                    MAX(ten_bc_phat) AS ten_bc_phat,
                    COUNT(*) AS total_rows,
                    SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS total_passed,
                    SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Không đạt' THEN 1 ELSE 0 END) AS total_failed,
                    SUM(CASE WHEN danh_gia_co_tms_ptc_8h IS NULL OR TRIM(danh_gia_co_tms_ptc_8h) = '' THEN 1 ELSE 0 END) AS total_blank,
                    CASE
                        WHEN COUNT(*) = 0 THEN NULL
                        ELSE ROUND((SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2)
                    END AS rate_percent
                FROM fact_f41
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
    // F41-DASHBOARD-RANKING-01 (T1/T2): BCVH overview / weekly / monthly /
    // daily-trend read queries. Every method returns the same row shape as its
    // FactBuuGuiRepository twin so the F1.3 BcvhOverviewService and
    // BcvhWeeklyComparisonService can be reused unchanged (Design of Record
    // Section 4.2). F4.1 semantics (DC-6): volume = COUNT(*) of all rows,
    // passed = danh_gia_co_tms_ptc_8h = 'Đạt', failed = 'Không đạt'; blank
    // evaluations stay in the denominator. GROUP BY always names the real
    // column ma_bc_phat; the ma_bcvh / ten_bcvh names exist only as output
    // aliases (fact_f41 has no real column called ma_bcvh).
    // ---------------------------------------------------------------------

    // PO decision 2026-10-08: in these dashboard/ranking views a row with a blank evaluation is in the
    // denominator and counts as NOT passed, so every `failed` / `khong_dat_kpi_2026` below is
    // COUNT(*) - passed (displayed as "Không đạt"). The later Evidence module will split out
    // "Chưa có đánh giá". getKpiMetrics / getBcvhReconciliation (F41-DASHBOARD-MINIMUM-01) keep the
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

    // F4.1 has no route dimension (D-13): the overview service gets an empty list.
    getBcvhOverviewRoutes() {
        return Promise.resolve([]);
    }

    _getBcvhOverviewAggregate(kind, anchorCeiling, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);

        const placeholders = canonicalCodes.map(() => '?').join(', ');
        const bounds = `
            WITH bounds AS (
                SELECT MAX(ngay_do_kiem) AS anchor_date
                FROM fact_f41
                WHERE date(ngay_do_kiem) <= date(?)
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
                           COUNT(*) AS volume,
                           SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                           SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 0 ELSE 1 END) AS failed
                    FROM fact_f41, bounds
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
                    FROM fact_f41, bounds
                    WHERE date(ngay_do_kiem) < date(bounds.anchor_date)
                      AND ma_bc_phat IN (${placeholders})
                ),
                week_bounds AS (
                    SELECT date(bounds.anchor_date, '-7 days') AS week_ago_date
                    FROM bounds
                )
                SELECT ngay_do_kiem AS date,
                       ma_bc_phat AS ma_bcvh,
                       MAX(ten_bc_phat) AS ten_bcvh,
                       COUNT(*) AS volume,
                       SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                       SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 0 ELSE 1 END) AS failed,
                       bounds.anchor_date,
                       prev_bounds.prev_anchor_date,
                       week_bounds.week_ago_date
                FROM fact_f41, bounds, prev_bounds, week_bounds
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
                           COUNT(*) AS volume,
                           SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                           SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 0 ELSE 1 END) AS failed
                    FROM fact_f41, periods
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
        return this._all(`
            SELECT
                date(ngay_do_kiem, '-' || ((CAST(strftime('%w', ngay_do_kiem) AS INTEGER) - 4 + 7) % 7) || ' days') AS week_start,
                MIN(ngay_do_kiem) AS first_date,
                MAX(ngay_do_kiem) AS last_date,
                COUNT(DISTINCT ngay_do_kiem) AS days_with_data
            FROM fact_f41
            WHERE ma_bc_phat IN (${placeholders})
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
            FROM fact_f41
            WHERE ma_bc_phat IN (${placeholders})
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
                ma_bc_phat AS ma_bcvh,
                COUNT(*) AS volume,
                SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS passed
            FROM fact_f41
            WHERE ma_bc_phat IN (${placeholders})
              AND ngay_do_kiem BETWEEN ? AND ?
            GROUP BY week_start, ma_bc_phat
            ORDER BY week_start ASC, ma_bc_phat ASC
        `, [...canonicalCodes, fromDate, toDate]);
    }

    // weekABounds/weekBBounds: { from, to } inclusive ISO dates already resolved by the service.
    getBcvhWeeklyComparisonAggregate(weekABounds, weekBBounds, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._all(`
            SELECT
                ma_bc_phat AS ma_bcvh,
                MAX(ten_bc_phat) AS ten_bcvh,
                SUM(CASE WHEN ngay_do_kiem BETWEEN ? AND ? THEN 1 ELSE 0 END) AS volume_a,
                SUM(CASE WHEN ngay_do_kiem BETWEEN ? AND ? AND danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS passed_a,
                SUM(CASE WHEN ngay_do_kiem BETWEEN ? AND ? THEN 1 ELSE 0 END) AS volume_b,
                SUM(CASE WHEN ngay_do_kiem BETWEEN ? AND ? AND danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS passed_b
            FROM fact_f41
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
        ]);
    }

    // One row per canonical BCVH for an inclusive date range (same shape idea as
    // FactBuuGuiRepository.getBcvhOperationMetricsBetween, F4.1 naming kept
    // F1.3-compatible: sl_bg_ptc = all rows, dat_kpi_2026 = passed).
    getBcvhOperationMetricsBetween(startDate, endDate, canonicalCodes = []) {
        if (!canonicalCodes.length) return Promise.resolve([]);
        const placeholders = canonicalCodes.map(() => '?').join(', ');
        return this._all(`
            SELECT
                ma_bc_phat AS ma_bcvh,
                MAX(ten_bc_phat) AS ten_bcvh,
                COUNT(*) AS sl_bg_ptc,
                SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS dat_kpi_2026,
                SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 0 ELSE 1 END) AS khong_dat_kpi_2026
            FROM fact_f41
            WHERE ngay_do_kiem BETWEEN ? AND ?
              AND ma_bc_phat IN (${placeholders})
            GROUP BY ma_bc_phat
        `, [startDate, endDate, ...canonicalCodes]);
    }

    // Module-level daily series (all rows, PO-2 total-rows denominator) or one BCVH.
    getDailyTrendData(fromDate, toDate, filters = {}) {
        const bcvhClause = filters.bcvhId ? ' AND ma_bc_phat = ?' : '';
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
                    SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                    SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 0 ELSE 1 END) AS failed
                FROM fact_f41
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
                'SELECT ngay_do_kiem, created_at FROM fact_f41 ORDER BY ngay_do_kiem DESC, id DESC LIMIT 1',
                [],
                (err, row) => (err ? reject(err) : resolve(row || null))
            );
        });
    }
}

module.exports = {
    FactF41Repository,
    factF41Repository: new FactF41Repository(),
    INSERT_COLUMNS,
};
