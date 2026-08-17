const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const {
    applyF41Phase1Schema,
    F41_PHASE1_TABLE_NAMES,
} = require('./migrate_f41_phase1_schema');

function createTempDbPath() {
    return path.join(os.tmpdir(), `f41-phase1-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

function getRow(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) return reject(err);
            db.get(sql, params, (queryErr, row) => {
                db.close(() => {
                    if (queryErr) reject(queryErr);
                    else resolve(row);
                });
            });
        });
    });
}

test('creates fact_f41 on a fresh database', async () => {
    const dbPath = createTempDbPath();
    try {
        const tables = await applyF41Phase1Schema(dbPath);
        assert.deepEqual(tables, F41_PHASE1_TABLE_NAMES);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('F41 Phase 1 migration is idempotent', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyF41Phase1Schema(dbPath);
        const secondRun = await applyF41Phase1Schema(dbPath);
        assert.deepEqual(secondRun, F41_PHASE1_TABLE_NAMES);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('migration inserts no business data', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyF41Phase1Schema(dbPath);
        const row = await getRow(dbPath, 'SELECT COUNT(*) AS n FROM fact_f41');
        assert.equal(row.n, 0);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('fact_f41 enforces unique date and shipment key', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyF41Phase1Schema(dbPath);
        const db = new sqlite3.Database(dbPath);
        await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO fact_f41 (ngay_do_kiem, ma_bg, danh_gia_co_tms_ptc_8h) VALUES ('2026-08-01', 'BG001', 'Đạt')",
                (err) => (err ? reject(err) : resolve()),
            );
        });
        await assert.rejects(
            new Promise((resolve, reject) => {
                db.run(
                    "INSERT INTO fact_f41 (ngay_do_kiem, ma_bg, danh_gia_co_tms_ptc_8h) VALUES ('2026-08-01', 'BG001', 'Đạt')",
                    (err) => (err ? reject(err) : resolve()),
                );
            }),
            /UNIQUE/,
        );
        db.close();
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
