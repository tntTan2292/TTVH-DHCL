/**
 * F11-PHASE-1 - F1.1 HUE row-level foundation.
 *
 * Additive-only migration: creates fact_f11 and its indexes if absent.
 * Safe to run repeatedly; it inserts no business data and touches no other table.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const F11_PHASE1_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fact_f11 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem DATE NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    stt INTEGER,
    ma_bg TEXT NOT NULL,
    so_hieu_lo TEXT,
    ma_tinh_chap_nhan TEXT,
    ten_tinh_chap_nhan TEXT,
    dia_ban_chap_nhan TEXT,
    ma_bc_chap_nhan TEXT,
    ten_bc_chap_nhan TEXT,
    loai_bc_chap_nhan TEXT,
    ma_bckt_chap_nhan TEXT,
    ten_bckt_chap_nhan TEXT,
    ma_tinh_phat TEXT,
    ten_tinh_phat TEXT,
    dia_ban_phat TEXT,
    ma_bc_phat TEXT,
    ten_bc_phat TEXT,
    loai_bc_phat TEXT,
    ma_bckt_phat TEXT,
    ten_bckt_phat TEXT,
    ma_tuyen_phat TEXT,
    ten_tuyen_phat TEXT,
    loai_tuyen_phat TEXT,
    loai_buu_gui TEXT,
    dich_vu TEXT,
    loai_dv TEXT,
    nhom_spdv TEXT,
    ma_spdv TEXT,
    khoi_luong_thuc_te REAL,
    khoi_luong_quy_doi TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    nhom_khach_hang TEXT,
    so_hieu_bd8_dong_di_bc_chap_nhan TEXT,
    thoi_gian_bd8_dong_di_bc_chap_nhan TEXT,
    so_hieu_bd8_xnd_bcktt TEXT,
    thoi_gian_bd8_xnd_bcktt TEXT,
    so_hieu_bd10_xnd_bckt_phat TEXT,
    thoi_gian_bd10_xnd_bckt_phat TEXT,
    thoi_gian_phat_den_bcp TEXT,
    thoi_gian_nhan_tin_thu_gom TEXT,
    thoi_gian_chap_nhan TEXT,
    thoi_gian_ptc TEXT,
    thoi_gian_nop_tien_cod TEXT,
    thoi_gian_thuc_te TEXT,
    danh_gia_2025 TEXT,
    thoi_gian_chi_tieu_2026 INTEGER,
    danh_gia_2026 TEXT,
    noi_dung_ly_do TEXT,
    ma_phuong_xa_chap_nhan TEXT,
    ten_phuong_xa_chap_nhan TEXT,
    ma_phuong_xa_phat TEXT,
    ten_phuong_xa_phat TEXT,
    so_bd10_dong_di_kttinh TEXT,
    thoi_gian_bd10_dong_di_kttinh TEXT,
    thoi_gian_bd10_quet_len_tms_kttinh TEXT,

    UNIQUE(ngay_do_kiem, ma_bg),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

CREATE INDEX IF NOT EXISTS idx_f11_date ON fact_f11(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f11_date_bcvh_eval ON fact_f11(ngay_do_kiem, ma_bc_phat, danh_gia_2026);
CREATE INDEX IF NOT EXISTS idx_f11_bcvh_date ON fact_f11(ma_bc_phat, ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f11_date_pair_eval ON fact_f11(ngay_do_kiem, ma_bc_chap_nhan, ma_bc_phat, danh_gia_2026);
`;

const F11_PHASE1_TABLE_NAMES = ['fact_f11'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyF11Phase1Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);

            db.exec(F11_PHASE1_SCHEMA_SQL, (execErr) => {
                if (execErr) return db.close(() => reject(execErr));

                db.all(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${F11_PHASE1_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
                    F11_PHASE1_TABLE_NAMES,
                    (queryErr, rows) => {
                        db.close((closeErr) => {
                            if (queryErr) return reject(queryErr);
                            if (closeErr) return reject(closeErr);
                            resolve(rows.map((row) => row.name));
                        });
                    },
                );
            });
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== F11-PHASE-1 Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF11Phase1Schema(dbPath)
        .then((tables) => {
            console.log('[OK] Tables present after migration:');
            tables.forEach((name) => console.log(`  - ${name}`));
            if (tables.length !== F11_PHASE1_TABLE_NAMES.length) {
                console.error('[FAIL] Expected table set does not match.');
                process.exit(1);
            }
            console.log('[OK] Migration complete. No business data was inserted.');
        })
        .catch((error) => {
            console.error('[FAIL] Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyF11Phase1Schema,
    F11_PHASE1_SCHEMA_SQL,
    F11_PHASE1_TABLE_NAMES,
};
