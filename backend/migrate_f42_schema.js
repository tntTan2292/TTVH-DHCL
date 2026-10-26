/**
 * F42-PHASE-1/4 - F4.2 (chat luong phat giao buu ta) foundation.
 *
 * Additive-only migration: creates fact_f42 (Hue detail, one row per delivery handed to a postman and day)
 * and fact_f42_national (TCT summary, one row per ranked province and day, aggregated from the postman rows)
 * with their indexes if absent. Safe to run repeatedly; it inserts no business data and touches no other table.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const F42_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fact_f42 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem DATE NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    ma_tinh_phat TEXT,
    ten_tinh_phat TEXT,
    ma_huyen_phat TEXT,
    ten_huyen_phat TEXT,
    dia_ban_phat TEXT,
    ma_bc_phat TEXT NOT NULL,
    ten_bc_phat TEXT,
    ma_buu_ta TEXT NOT NULL,
    ten_buu_ta TEXT,
    ma_hrm TEXT,
    loai_buu_gui TEXT,
    dich_vu TEXT,
    loai_dv TEXT,
    nhom_spdv TEXT,
    ma_spdv TEXT,
    ma_bg TEXT NOT NULL,
    so_hieu_lo TEXT,
    so_tien_cod REAL,
    khoi_luong_thuc_te REAL,
    khoi_luong_quy_doi TEXT,
    ten_hang_hoa TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    ma_tuyen_phat TEXT,
    ten_tuyen_phat TEXT,
    loai_tuyen_phat TEXT,
    thoi_gian_gbt TEXT NOT NULL,
    thoi_gian_ptc TEXT,
    thoi_gian_chuyen_hoan TEXT,
    thoi_gian_nop_tien TEXT,
    thoi_gian_thuc_hien TEXT,
    danh_gia TEXT,

    UNIQUE(ngay_do_kiem, ma_bg, ma_buu_ta, thoi_gian_gbt),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

CREATE INDEX IF NOT EXISTS idx_f42_date ON fact_f42(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f42_date_bc_eval ON fact_f42(ngay_do_kiem, ma_bc_phat, danh_gia);
CREATE INDEX IF NOT EXISTS idx_f42_date_bc_postman ON fact_f42(ngay_do_kiem, ma_bc_phat, ma_buu_ta);
CREATE INDEX IF NOT EXISTS idx_f42_bc_date ON fact_f42(ma_bc_phat, ngay_do_kiem);

CREATE TABLE IF NOT EXISTS fact_f42_national (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem TEXT NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    ma_tinh_phat TEXT NOT NULL,
    ten_tinh_phat TEXT,
    so_buu_ta INTEGER DEFAULT 0,
    sl_gbt INTEGER DEFAULT 0,
    sl_phat_thanh_cong INTEGER DEFAULT 0,
    sl_dung_qd INTEGER DEFAULT 0,
    tl_dung_qd TEXT,
    sl_qua_qd INTEGER DEFAULT 0,
    sl_pktc INTEGER DEFAULT 0,
    sl_chuyen_hoan INTEGER DEFAULT 0,
    sl_cho_chuyen_hoan INTEGER DEFAULT 0,
    sl_cho_vtn INTEGER DEFAULT 0,
    sl_chuyen_tiep INTEGER DEFAULT 0,
    sl_phat_hoan INTEGER DEFAULT 0,
    sl_loai_tru INTEGER DEFAULT 0,
    sl_gbt_chua_loai_tru INTEGER DEFAULT 0,
    sl_gbt_chua_thong_tin INTEGER DEFAULT 0,

    UNIQUE(ngay_do_kiem, ma_tinh_phat),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

CREATE INDEX IF NOT EXISTS idx_f42_nat_ngay ON fact_f42_national(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f42_nat_tinh_ngay ON fact_f42_national(ma_tinh_phat, ngay_do_kiem);
`;

const F42_TABLE_NAMES = ['fact_f42', 'fact_f42_national'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyF42Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);

            db.exec(F42_SCHEMA_SQL, (execErr) => {
                if (execErr) return db.close(() => reject(execErr));

                db.all(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${F42_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
                    F42_TABLE_NAMES,
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
    console.log('=== F42 Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF42Schema(dbPath)
        .then((tables) => {
            console.log('[OK] Tables present after migration:');
            tables.forEach((name) => console.log(`  - ${name}`));
            if (tables.length !== F42_TABLE_NAMES.length) {
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
    applyF42Schema,
    F42_SCHEMA_SQL,
    F42_TABLE_NAMES,
};
