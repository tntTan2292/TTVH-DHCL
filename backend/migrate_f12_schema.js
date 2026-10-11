/**
 * F12-PHASE-1/4 - F1.2 (thu gom buu gui lien tinh) foundation.
 *
 * Additive-only migration: creates fact_f12 (Hue detail, one row per parcel and day) and
 * fact_f12_national (TCT summary, one row per accepting province and day) with their indexes if absent.
 * Safe to run repeatedly; it inserts no business data and touches no other table.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const F12_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fact_f12 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem DATE NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    stt INTEGER,
    ma_bg TEXT NOT NULL,
    so_hieu_lo TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    nhom_khach_hang TEXT,
    ma_tinh_chap_nhan TEXT,
    ten_tinh_chap_nhan TEXT,
    ma_bc_chap_nhan TEXT,
    ten_bc_chap_nhan TEXT,
    loai_bc_chap_nhan TEXT,
    dich_vu TEXT,
    loai_dv TEXT,
    loai_buu_gui TEXT,
    ma_spdv TEXT,
    nhom_spdv TEXT,
    khoi_luong_thuc_te REAL,
    khoi_luong_quy_doi TEXT,
    ma_bckt TEXT,
    ten_bckt TEXT,
    loai_bckt TEXT,
    ma_tinh_phat TEXT,
    ten_tinh_phat TEXT,
    thoi_gian_nhan_tin_thu_gom TEXT,
    thoi_gian_chap_nhan TEXT,
    so_hieu_bd8_dong_di TEXT,
    thoi_gian_bd8_dong_di TEXT,
    so_hieu_bd10 TEXT,
    thoi_gian_bd10_quet_tms TEXT,
    thoi_gian_bd10_dong_di_bccp TEXT,
    thoi_gian_thuc_te TEXT,
    danh_gia TEXT,
    ma_huyen TEXT,
    ten_huyen TEXT,
    noi_dung_ly_do TEXT,

    UNIQUE(ngay_do_kiem, ma_bg),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

CREATE INDEX IF NOT EXISTS idx_f12_date ON fact_f12(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f12_date_unit_eval ON fact_f12(ngay_do_kiem, ma_huyen, danh_gia);
CREATE INDEX IF NOT EXISTS idx_f12_date_office_eval ON fact_f12(ngay_do_kiem, ma_bc_chap_nhan, danh_gia);
CREATE INDEX IF NOT EXISTS idx_f12_unit_date ON fact_f12(ma_huyen, ngay_do_kiem);

CREATE TABLE IF NOT EXISTS fact_f12_national (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem TEXT NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    stt INTEGER,
    ma_tinh_chap_nhan TEXT NOT NULL,
    ten_tinh_chap_nhan TEXT,
    ma_bc_chap_nhan TEXT,
    ten_bc_chap_nhan TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    sl_bd10_dong_di INTEGER DEFAULT 0,
    sl_bd10_quet_tms INTEGER DEFAULT 0,
    sl_dung_qd INTEGER DEFAULT 0,
    tl_dung_qd TEXT,
    sl_qua_qd INTEGER DEFAULT 0,
    sl_chua_du_thong_tin INTEGER DEFAULT 0,
    sl_tg_le_10h INTEGER DEFAULT 0,
    sl_tg_le_12h INTEGER DEFAULT 0,
    sl_tg_12_24h INTEGER DEFAULT 0,
    sl_tg_24_36h INTEGER DEFAULT 0,
    sl_tg_36_48h INTEGER DEFAULT 0,
    sl_tg_tren_48h INTEGER DEFAULT 0,
    sl_loai_tru INTEGER DEFAULT 0,

    UNIQUE(ngay_do_kiem, ma_tinh_chap_nhan),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

CREATE INDEX IF NOT EXISTS idx_f12_nat_ngay ON fact_f12_national(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f12_nat_tinh_ngay ON fact_f12_national(ma_tinh_chap_nhan, ngay_do_kiem);
`;

const F12_TABLE_NAMES = ['fact_f12', 'fact_f12_national'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyF12Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);

            db.exec(F12_SCHEMA_SQL, (execErr) => {
                if (execErr) return db.close(() => reject(execErr));

                db.all(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${F12_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
                    F12_TABLE_NAMES,
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
    console.log('=== F12 Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF12Schema(dbPath)
        .then((tables) => {
            console.log('[OK] Tables present after migration:');
            tables.forEach((name) => console.log(`  - ${name}`));
            if (tables.length !== F12_TABLE_NAMES.length) {
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
    applyF12Schema,
    F12_SCHEMA_SQL,
    F12_TABLE_NAMES,
};
