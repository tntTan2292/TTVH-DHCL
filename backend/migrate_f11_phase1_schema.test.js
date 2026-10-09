const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF11Phase1Schema, F11_PHASE1_TABLE_NAMES } = require('./migrate_f11_phase1_schema');
const { F11_DB_COLUMNS } = require('./src/services/f11HueExcelParser');

function createTempDbPath() {
    return path.join(os.tmpdir(), `f11-phase1-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

function withDb(dbPath, fn) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, async (openErr) => {
            if (openErr) return reject(openErr);
            try {
                const result = await fn(db);
                db.close(() => resolve(result));
            } catch (error) {
                db.close(() => reject(error));
            }
        });
    });
}

const all = (db, sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows))));
const run = (db, sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, (e) => (e ? reject(e) : resolve())));

test('creates fact_f11 on a fresh database', async () => {
    const dbPath = createTempDbPath();
    try {
        assert.deepEqual(await applyF11Phase1Schema(dbPath), F11_PHASE1_TABLE_NAMES);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('F11 Phase 1 migration is idempotent and inserts no business data', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyF11Phase1Schema(dbPath);
        assert.deepEqual(await applyF11Phase1Schema(dbPath), F11_PHASE1_TABLE_NAMES);
        const rows = await withDb(dbPath, (db) => all(db, 'SELECT COUNT(*) AS n FROM fact_f11'));
        assert.equal(rows[0].n, 0);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('fact_f11 columns equal the system fields plus every parser column (no drift)', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyF11Phase1Schema(dbPath);
        const info = await withDb(dbPath, (db) => all(db, 'PRAGMA table_info(fact_f11)'));
        const tableColumns = info.map((c) => c.name).sort();
        const expected = ['id', 'ngay_do_kiem', 'import_log_id', 'created_at', ...F11_DB_COLUMNS].sort();
        assert.deepEqual(tableColumns, expected);
        assert.equal(F11_DB_COLUMNS.length, 55);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('UNIQUE(ngay_do_kiem, ma_bg) rejects a duplicate and allows the same parcel on another date', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyF11Phase1Schema(dbPath);
        await withDb(dbPath, async (db) => {
            await run(db, "INSERT INTO fact_f11 (ngay_do_kiem, ma_bg) VALUES ('2026-10-07', 'AA1VN')");
            await run(db, "INSERT INTO fact_f11 (ngay_do_kiem, ma_bg) VALUES ('2026-10-08', 'AA1VN')");
            await assert.rejects(run(db, "INSERT INTO fact_f11 (ngay_do_kiem, ma_bg) VALUES ('2026-10-07', 'AA1VN')"), /UNIQUE/);
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('migration leaves other tables untouched', async () => {
    const dbPath = createTempDbPath();
    try {
        await withDb(dbPath, async (db) => {
            await run(db, 'CREATE TABLE fact_f13 (id INTEGER PRIMARY KEY, ma_bg TEXT)');
            await run(db, "INSERT INTO fact_f13 (ma_bg) VALUES ('S1'), ('S2')");
            await run(db, 'CREATE TABLE fact_f41 (id INTEGER PRIMARY KEY, ma_bg TEXT)');
        });
        await applyF11Phase1Schema(dbPath);
        const counts = await withDb(dbPath, async (db) => ({
            f13: (await all(db, 'SELECT COUNT(*) AS n FROM fact_f13'))[0].n,
            tables: (await all(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).map((r) => r.name),
        }));
        assert.equal(counts.f13, 2);
        assert.ok(counts.tables.includes('fact_f13') && counts.tables.includes('fact_f41') && counts.tables.includes('fact_f11'));
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('the four F1.1 indexes exist', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyF11Phase1Schema(dbPath);
        const names = (await withDb(dbPath, (db) => all(db, "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='fact_f11'"))).map((r) => r.name);
        for (const name of ['idx_f11_date', 'idx_f11_date_bcvh_eval', 'idx_f11_bcvh_date', 'idx_f11_date_pair_eval']) {
            assert.ok(names.includes(name), name);
        }
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
