const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { ensureStartupSchemaMigrations } = require('./server');

function createTempDbPath() {
    return path.join(os.tmpdir(), `server-startup-migrations-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

function openDb(dbPath) {
    return new sqlite3.Database(dbPath);
}

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function closeDb(db) {
    return new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
    });
}

async function createFactF13Sentinel(dbPath) {
    const db = openDb(dbPath);
    try {
        await run(db, `
            CREATE TABLE fact_f13 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ngay_do_kiem TEXT NOT NULL,
                ma_bg TEXT NOT NULL,
                danh_gia_2026 TEXT,
                UNIQUE(ngay_do_kiem, ma_bg)
            )
        `);
        await run(db, `
            INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, danh_gia_2026)
            VALUES ('2026-08-01', 'F13-SENTINEL', 'Đạt')
        `);
    } finally {
        await closeDb(db);
    }
}

test('startup schema migrations create fact_f41 without watcher/import side effects', async () => {
    const dbPath = createTempDbPath();
    try {
        await createFactF13Sentinel(dbPath);
        await ensureStartupSchemaMigrations(dbPath);

        let db = openDb(dbPath);
        try {
            const factF41 = await get(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='fact_f41'");
            const factF41National = await get(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='fact_f41_national'");
            const f41Rows = await get(db, 'SELECT COUNT(*) AS n FROM fact_f41');
            const f41NationalRows = await get(db, 'SELECT COUNT(*) AS n FROM fact_f41_national');
            const f13Rows = await get(db, 'SELECT COUNT(*) AS n FROM fact_f13');
            const queueRunRows = await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_run');
            const queueJobRows = await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_job');
            const queueEventRows = await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_event');
            const f13Sentinel = await get(db, "SELECT ngay_do_kiem, ma_bg, danh_gia_2026 FROM fact_f13 WHERE ma_bg = 'F13-SENTINEL'");

            assert.equal(factF41.name, 'fact_f41');
            assert.equal(factF41National.name, 'fact_f41_national');
            assert.equal(f41Rows.n, 0);
            assert.equal(f41NationalRows.n, 0);
            assert.equal(f13Rows.n, 1);
            assert.equal(queueRunRows.n, 0);
            assert.equal(queueJobRows.n, 0);
            assert.equal(queueEventRows.n, 0);
            assert.deepEqual(f13Sentinel, {
                ngay_do_kiem: '2026-08-01',
                ma_bg: 'F13-SENTINEL',
                danh_gia_2026: 'Đạt',
            });
        } finally {
            await closeDb(db);
        }

        await ensureStartupSchemaMigrations(dbPath);
        db = openDb(dbPath);
        try {
            const f41RowsAfterSecondRun = await get(db, 'SELECT COUNT(*) AS n FROM fact_f41');
            const f41NationalRowsAfterSecondRun = await get(db, 'SELECT COUNT(*) AS n FROM fact_f41_national');
            const f13RowsAfterSecondRun = await get(db, 'SELECT COUNT(*) AS n FROM fact_f13');
            const queueRunRowsAfterSecondRun = await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_run');
            const queueJobRowsAfterSecondRun = await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_job');
            assert.equal(f41RowsAfterSecondRun.n, 0);
            assert.equal(f41NationalRowsAfterSecondRun.n, 0);
            assert.equal(f13RowsAfterSecondRun.n, 1);
            assert.equal(queueRunRowsAfterSecondRun.n, 0);
            assert.equal(queueJobRowsAfterSecondRun.n, 0);
        } finally {
            await closeDb(db);
        }
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
