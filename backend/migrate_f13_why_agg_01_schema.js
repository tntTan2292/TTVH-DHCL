/**
 * F13-WHY-AGG-01 Phase 1 - derived per-parcel cause table and its companions.
 *
 *   f13_cause_parcel  one row per F1.3 row (ngay_do_kiem, ma_bg) with the cause of CauseClassifier, the route scope and the postmen.
 *   f13_cause_day     per measurement day: input signature, classifier version, state (FRESH / STALE / BUILDING), error, row count.
 *   f13_cause_run     log of every build run.
 *
 * Additive-only and idempotent (CREATE ... IF NOT EXISTS), inserts no data and touches no other table; the tables are
 * fully rebuildable (`scripts/f13_cause_tool.js build`). Design: docs/04_TECHNICAL_PLANNING/Feature/F13-WHY-AGG-01_DESIGN_OF_RECORD.md section 5.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const F13_WHY_AGG_01_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS f13_cause_parcel (
    ngay_do_kiem TEXT NOT NULL,
    ma_bg TEXT NOT NULL,
    ma_bcvh TEXT NOT NULL,
    ma_tuyen TEXT,
    route_scope TEXT NOT NULL,
    ma_buu_ta_first TEXT,
    ten_buu_ta_first TEXT,
    ma_buu_ta_shown TEXT,
    ten_buu_ta_shown TEXT,
    danh_gia TEXT,
    cause_code TEXT,
    cause_status TEXT NOT NULL,
    cause_step TEXT,
    flags TEXT,
    hints TEXT,
    ma_lo TEXT,
    khong_tron_lo INTEGER NOT NULL DEFAULT 0,
    limit_ms INTEGER,
    tct_ms INTEGER,
    l_ms INTEGER,
    r_ms INTEGER,
    built_at TEXT NOT NULL,
    classifier_version TEXT NOT NULL,
    cause_detail TEXT,
    cause_reason TEXT,
    remaining_at_arrival_ms INTEGER,
    a_source TEXT,
    basis TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_f13_cause_parcel ON f13_cause_parcel(ngay_do_kiem, ma_bg);
CREATE INDEX IF NOT EXISTS idx_f13_cause_parcel_bcvh ON f13_cause_parcel(ngay_do_kiem, ma_bcvh);
CREATE INDEX IF NOT EXISTS idx_f13_cause_parcel_route ON f13_cause_parcel(ngay_do_kiem, ma_bcvh, ma_tuyen);
CREATE INDEX IF NOT EXISTS idx_f13_cause_parcel_postman ON f13_cause_parcel(ngay_do_kiem, ma_bcvh, ma_tuyen, ma_buu_ta_first);
CREATE INDEX IF NOT EXISTS idx_f13_cause_parcel_bg ON f13_cause_parcel(ma_bg);

CREATE TABLE IF NOT EXISTS f13_cause_day (
    ngay_do_kiem TEXT PRIMARY KEY,
    input_signature TEXT,
    classifier_version TEXT,
    state TEXT NOT NULL CHECK (state IN ('FRESH', 'STALE', 'BUILDING')),
    built_at TEXT,
    error TEXT,
    row_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS f13_cause_run (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_source TEXT NOT NULL,
    from_day TEXT,
    to_day TEXT,
    days_done INTEGER NOT NULL DEFAULT 0,
    days_failed INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    heartbeat_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'DONE', 'PARTIAL', 'FAILED', 'ABANDONED')),
    last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_f13_cause_run_status ON f13_cause_run(status, heartbeat_at);
`;

// F13-WHY-DATA-02 R2: columns added to f13_cause_parcel after the first release (additive; ALTER ... ADD COLUMN for a table created before).
// Same order and types as in the CREATE TABLE above, so an old and a new table end up identical.
const F13_WHY_AGG_01_ADDED_COLUMNS = [
    ['cause_detail', 'TEXT'], // Phát detail: CHAM_GIAO_BUU_TA | PHAT_CHAM_SAU_GIAO | NULL
    ['cause_reason', 'TEXT'], // why a parcel waits for the Chuyên quản (status CHO_CHUYEN_QUAN) or has no usable milestone
    ['remaining_at_arrival_ms', 'INTEGER'], // limit - net T->A, reference only
    ['a_source', 'TEXT'], // F41 | BF | NULL
    ['basis', 'TEXT'], // INTERVAL | MILESTONES
];

const F13_WHY_AGG_01_TABLE_NAMES = ['f13_cause_day', 'f13_cause_parcel', 'f13_cause_run'];

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyF13WhyAgg01Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);
            const fail = (error) => db.close(() => reject(error));
            db.exec(`PRAGMA busy_timeout = 30000; ${F13_WHY_AGG_01_SCHEMA_SQL}`, (execErr) => {
                if (execErr) return fail(execErr);
                return db.all(`SELECT name FROM pragma_table_info('f13_cause_parcel')`, [], (infoErr, columns) => {
                    if (infoErr) return fail(infoErr);
                    const present = new Set(columns.map((column) => column.name));
                    const missing = F13_WHY_AGG_01_ADDED_COLUMNS.filter(([name]) => !present.has(name));
                    const finish = () => db.all(
                        `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${F13_WHY_AGG_01_TABLE_NAMES.map(() => '?').join(',')}) ORDER BY name`,
                        F13_WHY_AGG_01_TABLE_NAMES,
                        (queryErr, rows) => {
                            db.close((closeErr) => {
                                if (queryErr) return reject(queryErr);
                                if (closeErr) return reject(closeErr);
                                return resolve(rows.map((row) => row.name));
                            });
                        },
                    );
                    const addNext = (index) => {
                        if (index >= missing.length) return finish();
                        const [name, type] = missing[index];
                        return db.run(`ALTER TABLE f13_cause_parcel ADD COLUMN ${name} ${type}`, (alterErr) => (alterErr ? fail(alterErr) : addNext(index + 1)));
                    };
                    return addNext(0);
                });
            });
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== F13-WHY-AGG-01 schema migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyF13WhyAgg01Schema(dbPath)
        .then((tables) => { console.log(`[OK] Tables present: ${tables.join(', ')}`); })
        .catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
}

module.exports = { applyF13WhyAgg01Schema, F13_WHY_AGG_01_SCHEMA_SQL, F13_WHY_AGG_01_TABLE_NAMES, F13_WHY_AGG_01_ADDED_COLUMNS };
