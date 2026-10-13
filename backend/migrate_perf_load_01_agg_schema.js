/**
 * PERF-LOAD-01 Phase 2 - pre-aggregated day tables (agg_f13_day, agg_f41_day, agg_f11_day, agg_f12_day).
 *
 * Additive-only and idempotent: creates the derived tables and indexes if absent, inserts no data
 * (population is the separate `scripts/agg_tool.js build`) and touches no other table.
 * Design: docs/04_TECHNICAL_PLANNING/Feature/PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md section 3.
 *
 * Uniqueness is an expression index over IFNULL(col, char(1)) so a NULL key and an empty-string key
 * (both can occur in the detail table) stay two different rows.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const PERF_LOAD_01_AGG_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agg_f13_day (
    ngay_do_kiem TEXT NOT NULL,
    ma_bcvh TEXT,
    ma_tuyen TEXT,
    ten_bcvh TEXT,
    ten_tuyen TEXT,
    loai_tuyen_phat TEXT,
    n_rows INTEGER NOT NULL,
    n_bg INTEGER NOT NULL,
    n_dat INTEGER NOT NULL,
    n_khong_dat INTEGER NOT NULL,
    n_blank INTEGER NOT NULL,
    n_nop_tien INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agg_f13_day ON agg_f13_day(ngay_do_kiem, IFNULL(ma_bcvh, char(1)), IFNULL(ma_tuyen, char(1)));
CREATE INDEX IF NOT EXISTS idx_agg_f13_day_bcvh ON agg_f13_day(ma_bcvh, ngay_do_kiem);

CREATE TABLE IF NOT EXISTS agg_f41_day (
    ngay_do_kiem TEXT NOT NULL,
    ma_bc_phat TEXT,
    ten_bc_phat TEXT,
    n_rows INTEGER NOT NULL,
    n_dat INTEGER NOT NULL,
    n_khong_dat INTEGER NOT NULL,
    n_blank INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agg_f41_day ON agg_f41_day(ngay_do_kiem, IFNULL(ma_bc_phat, char(1)));
CREATE INDEX IF NOT EXISTS idx_agg_f41_day_unit ON agg_f41_day(ma_bc_phat, ngay_do_kiem);

CREATE TABLE IF NOT EXISTS agg_f11_day (
    ngay_do_kiem TEXT NOT NULL,
    ma_bc_chap_nhan TEXT,
    ma_bc_phat TEXT,
    ten_bc_chap_nhan TEXT,
    ten_bc_phat TEXT,
    n_rows INTEGER NOT NULL,
    n_dat INTEGER NOT NULL,
    n_khong_dat INTEGER NOT NULL,
    n_blank INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agg_f11_day ON agg_f11_day(ngay_do_kiem, IFNULL(ma_bc_chap_nhan, char(1)), IFNULL(ma_bc_phat, char(1)));
CREATE INDEX IF NOT EXISTS idx_agg_f11_day_phat ON agg_f11_day(ma_bc_phat, ngay_do_kiem);

CREATE TABLE IF NOT EXISTS agg_f12_day (
    ngay_do_kiem TEXT NOT NULL,
    ma_huyen TEXT,
    ma_bc_chap_nhan TEXT,
    ten_huyen TEXT,
    ten_bc_chap_nhan TEXT,
    n_rows INTEGER NOT NULL,
    n_dat INTEGER NOT NULL,
    n_khong_dat INTEGER NOT NULL,
    n_blank INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agg_f12_day ON agg_f12_day(ngay_do_kiem, IFNULL(ma_huyen, char(1)), IFNULL(ma_bc_chap_nhan, char(1)));
CREATE INDEX IF NOT EXISTS idx_agg_f12_day_unit ON agg_f12_day(ma_huyen, ngay_do_kiem);

CREATE TABLE IF NOT EXISTS agg_state (
    indicator TEXT PRIMARY KEY,
    last_full_build_at TEXT,
    last_verified_at TEXT,
    last_verify_ok INTEGER
);
`;

const AGG_TABLE_NAMES = ['agg_f13_day', 'agg_f41_day', 'agg_f11_day', 'agg_f12_day', 'agg_state'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyPerfLoad01AggSchema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);
            db.exec(`PRAGMA busy_timeout = 30000; ${PERF_LOAD_01_AGG_SCHEMA_SQL}`, (execErr) => {
                if (execErr) return db.close(() => reject(execErr));
                db.all(
                    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${AGG_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
                    AGG_TABLE_NAMES,
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
    console.log('=== PERF-LOAD-01 agg schema migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyPerfLoad01AggSchema(dbPath)
        .then((tables) => { console.log(`[OK] Tables present: ${tables.join(', ')}`); })
        .catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
}

module.exports = { applyPerfLoad01AggSchema, PERF_LOAD_01_AGG_SCHEMA_SQL, AGG_TABLE_NAMES };
