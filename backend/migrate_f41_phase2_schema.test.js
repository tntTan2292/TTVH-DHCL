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
