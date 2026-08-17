const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF41Phase2Schema, F41_PHASE2_TABLE_NAMES } = require('./migrate_f41_phase2_schema');

function createTempDbPath() {
    return path.join(os.tmpdir(), `f41-phase2-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

function getRow(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.get(sql, params, (queryErr, row) => {
            db.close(() => queryErr ? reject(queryErr) : resolve(row));
        });
    });
}

function run(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(sql, params, function onRun(queryErr) {
            db.close(() => queryErr ? reject(queryErr) : resolve(this));
        });
    });
}

test('creates fact_f41_national and Import metadata without business rows', async () => {
    const dbPath = createTempDbPath();
    try {
        const tables = await applyF41Phase2Schema(dbPath);
        assert.deepEqual(tables, F41_PHASE2_TABLE_NAMES);
        assert.equal((await getRow(dbPath, 'SELECT COUNT(*) AS n FROM fact_f41_national')).n, 0);
        assert.equal((await getRow(dbPath, "SELECT COUNT(*) AS n FROM pragma_table_info('import_log') WHERE name IN ('indicator', 'source_lane', 'trigger_source')")).n, 3);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('F41 Phase 2 migration is idempotent', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyF41Phase2Schema(dbPath);
        const secondRun = await applyF41Phase2Schema(dbPath);
        assert.deepEqual(secondRun, F41_PHASE2_TABLE_NAMES);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('repairs existing fact_f41_national rate columns from REAL to TEXT without dropping rows', async () => {
    const dbPath = createTempDbPath();
    try {
        await run(dbPath, `
            CREATE TABLE import_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                ngay_do_kiem TEXT NOT NULL,
                status TEXT NOT NULL,
                total_records INTEGER DEFAULT 0,
                error_records INTEGER DEFAULT 0,
                skipped_records INTEGER DEFAULT 0
            )
        `);
        await run(dbPath, `
            CREATE TABLE fact_f41_national (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ngay_do_kiem TEXT NOT NULL,
                import_log_id INTEGER,
                ma_don_vi TEXT NOT NULL,
                tl_ptc_8h_co_tms REAL DEFAULT 0,
                UNIQUE(ngay_do_kiem, ma_don_vi),
                FOREIGN KEY(import_log_id) REFERENCES import_log(id)
            )
        `);
        await run(dbPath, `
            INSERT INTO fact_f41_national (ngay_do_kiem, ma_don_vi, tl_ptc_8h_co_tms)
            VALUES ('2026-08-01', '53', 61.12)
        `);

        await applyF41Phase2Schema(dbPath);
        await applyF41Phase2Schema(dbPath);

        const typeRow = await getRow(dbPath, "SELECT type FROM pragma_table_info('fact_f41_national') WHERE name = 'tl_ptc_8h_co_tms'");
        const countRow = await getRow(dbPath, 'SELECT COUNT(*) AS n FROM fact_f41_national');
        const keyRow = await getRow(dbPath, "SELECT ngay_do_kiem, ma_don_vi, CAST(tl_ptc_8h_co_tms AS TEXT) AS rate FROM fact_f41_national WHERE ma_don_vi = '53'");
        const indexRow = await getRow(dbPath, "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name IN ('idx_f41_nat_ngay', 'idx_f41_nat_don_vi_ngay')");

        assert.equal(typeRow.type, 'TEXT');
        assert.equal(countRow.n, 1);
        assert.deepEqual(keyRow, { ngay_do_kiem: '2026-08-01', ma_don_vi: '53', rate: '61.12' });
        assert.equal(indexRow.n, 2);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
