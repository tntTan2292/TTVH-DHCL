const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF13WhyAgg01Schema, F13_WHY_AGG_01_TABLE_NAMES } = require('./migrate_f13_why_agg_01_schema');

function tempDb() { return path.join(os.tmpdir(), `f13-why-agg-schema-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`); }
function query(dbPath, sql) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => {
            if (e) return reject(e);
            db.all(sql, [], (err, rows) => db.close(() => (err ? reject(err) : resolve(rows))));
        });
    });
}

test('creates the three derived tables, is idempotent (second run changes nothing) and inserts nothing', async () => {
    const dbPath = tempDb();
    try {
        assert.deepEqual(await applyF13WhyAgg01Schema(dbPath), F13_WHY_AGG_01_TABLE_NAMES);
        const first = await query(dbPath, `SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name`);
        assert.deepEqual(await applyF13WhyAgg01Schema(dbPath), F13_WHY_AGG_01_TABLE_NAMES);
        assert.deepEqual(await query(dbPath, `SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name`), first);
        for (const table of F13_WHY_AGG_01_TABLE_NAMES) assert.equal((await query(dbPath, `SELECT COUNT(*) AS n FROM ${table}`))[0].n, 0);
        assert.deepEqual(F13_WHY_AGG_01_TABLE_NAMES, ['f13_cause_day', 'f13_cause_parcel', 'f13_cause_run']);
    } finally { fs.rmSync(dbPath, { force: true }); }
});

test('adds nothing to other tables: only the three tables and their indexes appear', async () => {
    const dbPath = tempDb();
    try {
        await applyF13WhyAgg01Schema(dbPath);
        const tables = (await query(dbPath, `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)).map((r) => r.name);
        assert.deepEqual(tables, ['f13_cause_day', 'f13_cause_parcel', 'f13_cause_run']);
    } finally { fs.rmSync(dbPath, { force: true }); }
});
