/**
 * F41-PHASE-2 - Multi-indicator Import foundation.
 *
 * Additive-only migration: creates fact_f41_national and adds Import log
 * metadata needed to isolate F1.3/F4.1 and HUE/TCT imports.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const F41_PHASE2_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    ngay_do_kiem TEXT NOT NULL,
    indicator TEXT DEFAULT 'F1.3',
    source_lane TEXT,
    trigger_source TEXT DEFAULT 'AUTO',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL,
    total_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fact_f41_national (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_do_kiem TEXT NOT NULL,
    import_log_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    stt INTEGER,
    ma_don_vi TEXT NOT NULL,
    ten_don_vi TEXT,
    ma_huyen TEXT,
    ten_huyen TEXT,
    ma_bc TEXT,
    ten_bc TEXT,
    loai_bc TEXT,
    ma_khl TEXT,
    ten_khl TEXT,
    sl_ptc_nop_tien_ch INTEGER DEFAULT 0,
    sl_ptc_nop_tien INTEGER DEFAULT 0,
    tl_ptc_nop_tien REAL DEFAULT 0,
    sl_dung_12_5h INTEGER DEFAULT 0,
    tl_dung_12_5h REAL DEFAULT 0,
    sl_dung_72h INTEGER DEFAULT 0,
    tl_dung_72h REAL DEFAULT 0,
    sl_qua_12_5h INTEGER DEFAULT 0,
    tl_qua_12_5h REAL DEFAULT 0,
    sl_qua_72h INTEGER DEFAULT 0,
    tl_qua_72h REAL DEFAULT 0,
    sl_chua_du_thong_tin INTEGER DEFAULT 0,
    sl_loai_tru INTEGER DEFAULT 0,
    sl_chuyen_hoan INTEGER DEFAULT 0,
    tl_chuyen_hoan REAL DEFAULT 0,
    sl_ptc_8h_xnd_bd1 INTEGER DEFAULT 0,
    tl_ptc_8h_xnd_bd1 REAL DEFAULT 0,
    sl_ptc_8h_co_tms INTEGER DEFAULT 0,
    tl_ptc_8h_co_tms REAL DEFAULT 0,
    sl_bucket_12h INTEGER DEFAULT 0,
    sl_bucket_14h INTEGER DEFAULT 0,
    sl_bucket_16h INTEGER DEFAULT 0,
    sl_bucket_36h INTEGER DEFAULT 0,
    sl_bucket_36h_plus INTEGER DEFAULT 0,
    sl_ptc_8h_lan_dau_xnd_bd1 INTEGER DEFAULT 0,
    tl_ptc_8h_lan_dau_xnd_bd1 REAL DEFAULT 0,
    sl_ptc_8h_lan_dau_co_tms INTEGER DEFAULT 0,
    tl_ptc_8h_lan_dau_co_tms REAL DEFAULT 0,

    UNIQUE(ngay_do_kiem, ma_don_vi),
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);

CREATE INDEX IF NOT EXISTS idx_f41_nat_ngay ON fact_f41_national(ngay_do_kiem);
CREATE INDEX IF NOT EXISTS idx_f41_nat_don_vi_ngay ON fact_f41_national(ma_don_vi, ngay_do_kiem);
`;

const F41_PHASE2_TABLE_NAMES = ['fact_f41_national'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (error) => error ? reject(error) : resolve(db));
    });
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => error ? reject(error) : resolve()));
}

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}

function closeDb(db) {
    return new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

async function ensureImportLogColumn(db, columnName, ddl) {
    const columns = await all(db, 'PRAGMA table_info(import_log)');
    if (columns.some((column) => column.name === columnName)) return;
    await exec(db, `ALTER TABLE import_log ADD COLUMN ${ddl}`);
}

async function applyF41Phase2Schema(dbPath) {
    const db = await openDb(dbPath);
    try {
        await exec(db, F41_PHASE2_SCHEMA_SQL);
        await ensureImportLogColumn(db, 'indicator', "indicator TEXT DEFAULT 'F1.3'");
        await ensureImportLogColumn(db, 'source_lane', 'source_lane TEXT');
        await ensureImportLogColumn(db, 'trigger_source', "trigger_source TEXT DEFAULT 'AUTO'");
        await exec(db, "UPDATE import_log SET indicator = 'F1.3' WHERE indicator IS NULL");
        const rows = await all(
            db,
            `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${F41_PHASE2_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
            F41_PHASE2_TABLE_NAMES,
        );
        return rows.map((row) => row.name);
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== F41-PHASE-2 Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF41Phase2Schema(dbPath)
        .then((tables) => {
            console.log('[OK] Tables present after migration:');
            tables.forEach((name) => console.log(`  - ${name}`));
            console.log('[OK] Migration complete. No business data was inserted.');
        })
        .catch((error) => {
            console.error('[FAIL] Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyF41Phase2Schema,
    F41_PHASE2_SCHEMA_SQL,
    F41_PHASE2_TABLE_NAMES,
};
