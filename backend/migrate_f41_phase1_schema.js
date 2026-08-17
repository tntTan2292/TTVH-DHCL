/**
 * F41-PHASE-1 - HUE row-level foundation.
 *
 * Additive-only migration: creates fact_f41 and indexes if absent.
 * Safe to run repeatedly; it inserts no business data.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const F41_PHASE1_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fact_f41 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem DATE NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    stt INTEGER,
    ma_tinh_phat TEXT,
    ten_tinh_phat TEXT,
    ma_huyen_phat TEXT,
    ten_huyen_phat TEXT,
    dia_ban_phat TEXT,
    ma_bc_phat TEXT,
    ten_bc_phat TEXT,
    loai_bcp TEXT,
    dich_vu TEXT,
    loai_dv TEXT,
    nhom_spdv TEXT,
    ma_spdv TEXT,
    ma_bg TEXT NOT NULL,
    so_hieu_lo TEXT,
    so_tien_cod REAL,
    khoi_luong_thuc_te REAL,
    khoi_luong_quy_doi TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    nhom_khach_hang TEXT,
    so_hieu_bd10_xnd_bcp TEXT,
    thoi_gian_bcp_xnd_bd10 TEXT,
    thoi_gian_bd10_quet_xuong_bcp TEXT,
    so_hieu_bd8_xnd_bcp TEXT,
    thoi_gian_bcp_xnd_bd8 TEXT,
    thoi_gian_xnd_bd1 TEXT,
    thoi_gian_ptc TEXT,
    thoi_gian_nop_tien TEXT,
    thoi_gian_tms_xnd_bcp TEXT,
    thoi_gian_khong_tms_thuc_hien_ptc TEXT,
    thoi_gian_co_tms_thuc_hien_ptc TEXT,
    thoi_gian_khong_tms_thuc_hien_pld TEXT,
    thoi_gian_co_tms_thuc_hien_pld TEXT,
    thoi_gian_chuyen_hoan TEXT,
    danh_gia_12_5h TEXT,
    danh_gia_72h TEXT,
    thoi_gian_phat_thanh_cong_lan_dau TEXT,
    danh_gia_khong_tms_ptc_8h TEXT,
    danh_gia_co_tms_ptc_8h TEXT,
    danh_gia_khong_tms_ptc_lan_dau_8h TEXT,
    danh_gia_co_tms_ptc_lan_dau_8h TEXT,

    UNIQUE(ngay_do_kiem, ma_bg),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

CREATE INDEX IF NOT EXISTS idx_f41_date ON fact_f41(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f41_date_bcvh_eval ON fact_f41(ngay_do_kiem, ma_bc_phat, danh_gia_co_tms_ptc_8h);
CREATE INDEX IF NOT EXISTS idx_f41_bcvh_date ON fact_f41(ma_bc_phat, ngay_do_kiem);
`;

const F41_PHASE1_TABLE_NAMES = ['fact_f41'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyF41Phase1Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);

            db.exec(F41_PHASE1_SCHEMA_SQL, (execErr) => {
                if (execErr) return db.close(() => reject(execErr));

                db.all(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${F41_PHASE1_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
                    F41_PHASE1_TABLE_NAMES,
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
    console.log('=== F41-PHASE-1 Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF41Phase1Schema(dbPath)
        .then((tables) => {
            console.log('[OK] Tables present after migration:');
            tables.forEach((name) => console.log(`  - ${name}`));
            if (tables.length !== F41_PHASE1_TABLE_NAMES.length) {
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
    applyF41Phase1Schema,
    F41_PHASE1_SCHEMA_SQL,
    F41_PHASE1_TABLE_NAMES,
};
