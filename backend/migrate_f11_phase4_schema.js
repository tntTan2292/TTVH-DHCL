/**
 * F11-PHASE-4 - F1.1 TCT national aggregate foundation.
 *
 * Additive-only migration: creates fact_f11_national and its indexes if absent.
 * Safe to run repeatedly; it inserts no business data and touches no other table.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const F11_PHASE4_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fact_f11_national (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem TEXT NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    stt INTEGER,
    ma_tinh_chap_nhan TEXT NOT NULL,
    ten_tinh_chap_nhan TEXT,
    ma_bc_chap_nhan TEXT,
    ten_bc_chap_nhan TEXT,
    ma_tinh_phat TEXT NOT NULL,
    ten_tinh_phat TEXT,
    ma_bc_phat TEXT,
    ten_bc_phat TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    sl_co_thong_tin_phat INTEGER DEFAULT 0,
    sl_ptc_nop_tien_ch INTEGER DEFAULT 0,
    sl_ptc_nop_tien INTEGER DEFAULT 0,
    sl_dung_qd_24h INTEGER DEFAULT 0,
    tl_dung_qd_24h TEXT,
    sl_qua_qd_24h INTEGER DEFAULT 0,
    sl_chua_du_thong_tin INTEGER DEFAULT 0,
    sl_theo_chi_tieu INTEGER DEFAULT 0,
    sl_dung_chi_tieu INTEGER DEFAULT 0,
    tl_dung_chi_tieu TEXT,
    sl_qua_chi_tieu INTEGER DEFAULT 0,
    tl_qua_chi_tieu TEXT,
    sl_tg_le_24h INTEGER DEFAULT 0,
    sl_tg_24_36h INTEGER DEFAULT 0,
    sl_tg_36_48h INTEGER DEFAULT 0,
    sl_tg_48_60h INTEGER DEFAULT 0,
    sl_tg_tren_60h INTEGER DEFAULT 0,
    sl_loai_tru INTEGER DEFAULT 0,

    UNIQUE(ngay_do_kiem, ma_tinh_chap_nhan, ma_tinh_phat),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

CREATE INDEX IF NOT EXISTS idx_f11_nat_ngay ON fact_f11_national(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f11_nat_phat_ngay ON fact_f11_national(ma_tinh_phat, ngay_do_kiem);
`;

const F11_PHASE4_TABLE_NAMES = ['fact_f11_national'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyF11Phase4Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);

            db.exec(F11_PHASE4_SCHEMA_SQL, (execErr) => {
                if (execErr) return db.close(() => reject(execErr));

                db.all(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${F11_PHASE4_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
                    F11_PHASE4_TABLE_NAMES,
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
    console.log('=== F11-PHASE-4 Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF11Phase4Schema(dbPath)
        .then((tables) => {
            console.log('[OK] Tables present after migration:');
            tables.forEach((name) => console.log(`  - ${name}`));
            if (tables.length !== F11_PHASE4_TABLE_NAMES.length) {
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
    applyF11Phase4Schema,
    F11_PHASE4_SCHEMA_SQL,
    F11_PHASE4_TABLE_NAMES,
};
