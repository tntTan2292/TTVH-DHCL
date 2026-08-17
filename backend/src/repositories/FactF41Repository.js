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
}

module.exports = {
    FactF41Repository,
    factF41Repository: new FactF41Repository(),
    INSERT_COLUMNS,
};
