const db = require('../config/db').db;

class FactBuuGuiRepository {
    
    /**
     * Luồng Overwrite Import với Transaction.
     * Xóa sạch dữ liệu ngày cũ, chèn dữ liệu ngày mới từ mảng.
     * @param {string} date YYYY-MM-DD
     * @param {string} sessionId
     * @param {Array} dataArray
     */
    overwriteImport(date, sessionId, dataArray) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION;', (err) => {
                    if (err) return reject(err);
                });

                // Xóa dữ liệu cũ của ngày này (để overwrite)
                db.run('DELETE FROM fact_f13 WHERE ngay_do_kiem = ?', [date], (err) => {
                    if (err) {
                        return db.run('ROLLBACK;', () => reject(err));
                    }
                });

                const sql = `
                    INSERT INTO fact_f13 
                    (session_id, ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, ket_qua_f13, thoi_gian_ptc, thoi_gian_nop_tien, extended_data) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                const stmt = db.prepare(sql, (err) => {
                    if (err) {
                        return db.run('ROLLBACK;', () => reject(err));
                    }
                });

                let hasError = false;
                for (const item of dataArray) {
                    const extendedDataStr = item.extended_data ? JSON.stringify(item.extended_data) : null;
                    stmt.run([
                        sessionId,
                        date,
                        item.ma_bg,
                        item.ma_bcvh,
                        item.ten_bcvh,
                        item.ma_tuyen,
                        item.ten_tuyen,
                        item.ket_qua_f13,
                        item.thoi_gian_ptc,
                        item.thoi_gian_nop_tien,
                        extendedDataStr
                    ], (err) => {
                        if (err && !hasError) {
                            hasError = true;
                            db.run('ROLLBACK;', () => reject(err));
                        }
                    });
                }
                
                stmt.finalize((err) => {
                    if (err && !hasError) {
                        hasError = true;
                        db.run('ROLLBACK;', () => reject(err));
                    } else if (!hasError) {
                        db.run('COMMIT;', (err) => {
                            if (err) reject(err);
                            else resolve(true);
                        });
                    }
                });
            });
        });
    }

    getKpiMetrics(startDate, endDate, filters = {}) {
        return new Promise((resolve, reject) => {
            const bcvhClause = filters.bcvhId ? ' AND ma_bcvh = ?' : '';
            const params = [startDate, endDate];
            if (filters.bcvhId) params.push(filters.bcvhId);
            const sql = `
                SELECT 
                    COUNT(ma_bg) as total_bg,
                    SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as total_passed,
                    SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as total_failed
                FROM fact_f13
                WHERE ngay_do_kiem >= ? AND ngay_do_kiem <= ?${bcvhClause}
            `;
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    getBcvhRanking(date, page = 1, pageSize = 20, sort = 'total_bg', order = 'desc') {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * pageSize;
            const sqlCount = `SELECT COUNT(DISTINCT ma_bcvh) as total FROM fact_f13 WHERE ngay_do_kiem = ? AND ma_bcvh IS NOT NULL`;
            
            // Whitelist for sorting columns to prevent SQL Injection
            const allowedSorts = ['total_bg', 'total_passed', 'total_failed'];
            const safeSort = allowedSorts.includes(sort) ? sort : 'total_bg';
            const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            const sqlData = `
                SELECT 
                    ma_bcvh, 
                    MAX(ten_bcvh) as ten_bcvh,
                    COUNT(ma_bg) as total_bg,
                    SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as total_passed,
                    SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as total_failed,
                    SUM(CASE WHEN thoi_gian_nop_tien IS NOT NULL AND TRIM(thoi_gian_nop_tien) != '' THEN 1 ELSE 0 END) as sl_ptc_nop_tien,
                    SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_kpi_2026,
                    SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as khong_dat_kpi_2026,
                    RANK() OVER (
                        ORDER BY (SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) * 1.0 / COUNT(ma_bg)) DESC, COUNT(ma_bg) DESC
                    ) as rank
                FROM fact_f13
                WHERE ngay_do_kiem = ? AND ma_bcvh IS NOT NULL
                GROUP BY ma_bcvh
                ORDER BY rank ASC
                LIMIT ? OFFSET ?
            `;
            
            db.get(sqlCount, [date], (err, countRow) => {
                if (err) return reject(err);
                db.all(sqlData, [date, pageSize, offset], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ data: rows, totalItems: countRow.total });
                });
            });
        });
    }

    getBcvhOperationMetricsByDate(date) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    ma_bcvh,
                    MAX(ten_bcvh) as ten_bcvh,
                    COUNT(ma_bg) as sl_bg_ptc,
                    SUM(CASE WHEN thoi_gian_nop_tien IS NOT NULL AND TRIM(thoi_gian_nop_tien) != '' THEN 1 ELSE 0 END) as sl_ptc_nop_tien,
                    SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_kpi_2026,
                    SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as khong_dat_kpi_2026
                FROM fact_f13
                WHERE ngay_do_kiem = ? AND ma_bcvh IS NOT NULL
                GROUP BY ma_bcvh
            `;

            db.all(sql, [date], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getLatestBcvhDataDateInRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT MAX(ngay_do_kiem) as latest_date
                FROM fact_f13
                WHERE date(ngay_do_kiem) BETWEEN date(?) AND date(?)
                  AND ma_bcvh IS NOT NULL
            `;

            db.get(sql, [startDate, endDate], (err, row) => {
                if (err) reject(err);
                else resolve(row?.latest_date || null);
            });
        });
    }

    getBcvhOperationMetricsBetween(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    ma_bcvh,
                    MAX(ten_bcvh) as ten_bcvh,
                    COUNT(ma_bg) as sl_bg_ptc,
                    SUM(CASE WHEN thoi_gian_nop_tien IS NOT NULL AND TRIM(thoi_gian_nop_tien) != '' THEN 1 ELSE 0 END) as sl_ptc_nop_tien,
                    SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_kpi_2026,
                    SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as khong_dat_kpi_2026
                FROM fact_f13
                WHERE date(ngay_do_kiem) BETWEEN date(?) AND date(?)
                  AND ma_bcvh IS NOT NULL
                GROUP BY ma_bcvh
            `;

            db.all(sql, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getRouteRanking(date, bcvh, page = 1, pageSize = 20, sort = 'total_bg', order = 'desc') {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * pageSize;
            const sqlCount = `SELECT COUNT(DISTINCT ma_tuyen) as total FROM fact_f13 WHERE ngay_do_kiem = ? AND ma_bcvh = ? AND ma_tuyen IS NOT NULL`;
            
            const allowedSorts = ['total_bg', 'total_passed', 'total_failed'];
            const safeSort = allowedSorts.includes(sort) ? sort : 'total_bg';
            const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            const sqlData = `
                SELECT 
                    ma_tuyen, 
                    MAX(ten_tuyen) as ten_tuyen,
                    COUNT(ma_bg) as total_bg,
                    SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as total_passed,
                    SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as total_failed
                FROM fact_f13
                WHERE ngay_do_kiem = ? AND ma_bcvh = ? AND ma_tuyen IS NOT NULL
                GROUP BY ma_tuyen
                ORDER BY ${safeSort} ${safeOrder}
                LIMIT ? OFFSET ?
            `;
            
            db.get(sqlCount, [date, bcvh], (err, countRow) => {
                if (err) return reject(err);
                db.all(sqlData, [date, bcvh, pageSize, offset], (err, rows) => {
                    if (err) reject(err);
                    else resolve({ data: rows, totalItems: countRow.total });
                });
            });
        });
    }

    getParetoData(date, bcvh) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    ma_tuyen, 
                    MAX(ten_tuyen) as ten_tuyen,
                    SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as total_failed
                FROM fact_f13
                WHERE ngay_do_kiem = ? AND ma_tuyen IS NOT NULL
            `;
            const params = [date];
            if (bcvh) {
                sql += ` AND ma_bcvh = ?`;
                params.push(bcvh);
            }
            sql += ` GROUP BY ma_tuyen ORDER BY total_failed DESC`;

            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getEvidenceList(date, bcvh, route, page = 1, pageSize = 20) {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * pageSize;
            const sqlCount = `SELECT COUNT(*) as total FROM fact_f13 WHERE ngay_do_kiem = ? AND ma_bcvh = ? AND ma_tuyen = ? AND danh_gia_2026 = 'Không đạt'`;
            
            const sqlData = `
                SELECT * 
                FROM fact_f13 
                WHERE ngay_do_kiem = ? AND ma_bcvh = ? AND ma_tuyen = ? AND danh_gia_2026 = 'Không đạt'
                LIMIT ? OFFSET ?
            `;
            
            db.get(sqlCount, [date, bcvh, route], (err, countRow) => {
                if (err) return reject(err);
                db.all(sqlData, [date, bcvh, route, pageSize, offset], (err, rows) => {
                    if (err) return reject(err);
                    
                    // Decode JSON extended_data
                    const mappedRows = rows.map(r => {
                        if (r.extended_data) {
                            try { r.extended_data = JSON.parse(r.extended_data); } catch(e) {}
                        }
                        return r;
                    });
                    
                    resolve({ data: mappedRows, totalItems: countRow.total });
                });
            });
        });
    }

    getFactByDate(date) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM fact_f13 WHERE ngay_do_kiem = ?`;
            db.all(sql, [date], (err, rows) => {
                if (err) return reject(err);
                
                // Decode JSON extended_data
                const mappedRows = rows.map(r => {
                    if (r.extended_data) {
                        try { r.extended_data = JSON.parse(r.extended_data); } catch(e) {}
                    }
                    return r;
                });
                
                resolve(mappedRows);
            });
        });
    }

    getLatestImportMeta() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    ngay_do_kiem,
                    created_at,
                    file_name,
                    status,
                    total_records,
                    error_records,
                    skipped_records
                FROM import_log
                WHERE status = 'SUCCESS'
                  AND date(ngay_do_kiem) <= date('now', 'localtime')
                ORDER BY date(ngay_do_kiem) DESC, datetime(created_at) DESC, id DESC
                LIMIT 1
            `;

            db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }

    getDailyTrendData(fromDate, toDate, filters = {}) {
        return new Promise((resolve, reject) => {
            const params = [fromDate, toDate];
            const bcvhClause = filters.bcvhId ? ' AND ma_bcvh = ?' : '';
            if (filters.bcvhId) params.push(filters.bcvhId);

            const sql = `
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
                        SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) AS passed,
                        SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) AS failed
                    FROM fact_f13
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
            `;

            const sqlParams = [fromDate, toDate, fromDate, toDate];
            if (filters.bcvhId) sqlParams.push(filters.bcvhId);

            db.all(sql, sqlParams, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = new FactBuuGuiRepository();
