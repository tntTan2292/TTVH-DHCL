'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, 'src/db/database.sqlite');
const db = new sqlite3.Database(dbPath);

const migrationSql = `
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
CREATE TABLE fact_f13_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem DATE NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    stt INTEGER,
    ma_bg TEXT NOT NULL,
    ma_tinh_phat TEXT,
    ten_tinh_phat TEXT,
    dia_ban_phat TEXT,
    ma_bckt_tinh_phat TEXT,
    ten_bckt_tinh_phat TEXT,
    ma_bcvh TEXT NOT NULL,
    ten_bcvh TEXT NOT NULL,
    loai_bc_phat TEXT,
    loai_bg TEXT,
    dich_vu TEXT,
    loai_dv TEXT,
    nhom_spdv TEXT,
    ma_spdv TEXT,
    so_hieu_lo TEXT,
    so_tien_cod REAL,
    khoi_luong_thuc_te REAL,
    khoi_luong_quy_doi REAL,
    ten_khl TEXT,
    nhom_khach_hang TEXT,
    ma_tuyen TEXT,
    ten_tuyen TEXT,
    loai_tuyen_phat TEXT,
    so_hieu_bd8 TEXT,
    thoi_gian_bckt_tinh_xnd_bd8 DATETIME,
    so_hieu_bd10 TEXT,
    thoi_gian_bd10_xnd_kttp DATETIME,
    thoi_gian_bd10_quet_tms DATETIME,
    thoi_gian_ptc DATETIME,
    thoi_gian_nop_tien DATETIME,
    thoi_gian_thuc_hien_thuc_te_gio REAL,
    ket_qua_f13 TEXT,
    danh_gia_2026 TEXT,
    thoi_gian_chi_tieu TEXT,
    ma_huyen TEXT,
    ten_huyen TEXT,
    ma_phuong_xa_chap_nhan TEXT,
    ten_phuong_xa_chap_nhan TEXT,
    ma_phuong_xa_phat TEXT,
    ten_phuong_xa_phat TEXT,
    UNIQUE(ngay_do_kiem, ma_bg),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);
INSERT INTO fact_f13_new (
    id, ngay_do_kiem, import_log_id, created_at, stt, ma_bg, ma_tinh_phat, ten_tinh_phat,
    dia_ban_phat, ma_bckt_tinh_phat, ten_bckt_tinh_phat, ma_bcvh, ten_bcvh, loai_bc_phat,
    loai_bg, dich_vu, loai_dv, nhom_spdv, ma_spdv, so_hieu_lo, so_tien_cod, khoi_luong_thuc_te,
    khoi_luong_quy_doi, ten_khl, nhom_khach_hang, ma_tuyen, ten_tuyen, loai_tuyen_phat,
    so_hieu_bd8, thoi_gian_bckt_tinh_xnd_bd8, so_hieu_bd10, thoi_gian_bd10_xnd_kttp,
    thoi_gian_bd10_quet_tms, thoi_gian_ptc, thoi_gian_nop_tien, thoi_gian_thuc_hien_thuc_te_gio,
    ket_qua_f13, danh_gia_2026, thoi_gian_chi_tieu, ma_huyen, ten_huyen,
    ma_phuong_xa_chap_nhan, ten_phuong_xa_chap_nhan, ma_phuong_xa_phat, ten_phuong_xa_phat
)
SELECT
    id, ngay_do_kiem, import_log_id, created_at, stt, ma_bg, ma_tinh_phat, ten_tinh_phat,
    dia_ban_phat, ma_bckt_tinh_phat, ten_bckt_tinh_phat, ma_bcvh, ten_bcvh, loai_bc_phat,
    loai_bg, dich_vu, loai_dv, nhom_spdv, ma_spdv, so_hieu_lo, so_tien_cod, khoi_luong_thuc_te,
    khoi_luong_quy_doi, ten_khl, nhom_khach_hang, ma_tuyen, ten_tuyen, loai_tuyen_phat,
    so_hieu_bd8, thoi_gian_bckt_tinh_xnd_bd8, so_hieu_bd10, thoi_gian_bd10_xnd_kttp,
    thoi_gian_bd10_quet_tms, thoi_gian_ptc, thoi_gian_nop_tien, thoi_gian_thuc_hien_thuc_te_gio,
    ket_qua_f13, danh_gia_2026, thoi_gian_chi_tieu, ma_huyen, ten_huyen,
    ma_phuong_xa_chap_nhan, ten_phuong_xa_chap_nhan, ma_phuong_xa_phat, ten_phuong_xa_phat
FROM fact_f13;
DROP TABLE fact_f13;
ALTER TABLE fact_f13_new RENAME TO fact_f13;
CREATE INDEX IF NOT EXISTS idx_f13_date_bcvh_covering ON fact_f13(ngay_do_kiem, ma_bcvh, ket_qua_f13);
CREATE INDEX IF NOT EXISTS idx_f13_date_tuyen_covering ON fact_f13(ngay_do_kiem, ma_tuyen, ket_qua_f13);
CREATE INDEX IF NOT EXISTS idx_ngay_do_kiem ON fact_f13(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_bcvh_ngay ON fact_f13(ma_bcvh, ngay_do_kiem);
COMMIT;
PRAGMA foreign_keys = ON;
`;

db.exec(migrationSql, (err) => {
    if (err) {
        console.error(`Migration failed: ${err.message}`);
        process.exit(1);
    }

    db.all('PRAGMA table_info(fact_f13);', [], (pragmaErr, rows) => {
        if (pragmaErr) {
            console.error(pragmaErr.message);
            process.exit(1);
        }

        const ketQua = rows.find((item) => item.name === 'ket_qua_f13');
        console.log(JSON.stringify({
            dbPath,
            ket_qua_f13_notnull: ketQua ? ketQua.notnull : null
        }, null, 2));
        db.close();
    });
});
