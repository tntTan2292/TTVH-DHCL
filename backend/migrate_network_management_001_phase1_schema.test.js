const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const {
    applyNetworkManagement001Phase1Schema,
    NEW_TABLE_NAMES,
} = require('./migrate_network_management_001_phase1_schema');

function createTempDbPath() {
    return path.join(os.tmpdir(), `network-management-001-phase1-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

function countRows(dbPath, tableName) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            db.get(`SELECT COUNT(*) AS n FROM ${tableName}`, [], (queryErr, row) => {
                db.close(() => {
                    if (queryErr) reject(queryErr);
                    else resolve(row.n);
                });
            });
        });
    });
}

test('creates all five NETWORK-MANAGEMENT-001 Phase 1 tables on a fresh database', async () => {
    const dbPath = createTempDbPath();
    try {
        const createdTables = await applyNetworkManagement001Phase1Schema(dbPath);
        assert.deepEqual(createdTables.sort(), [...NEW_TABLE_NAMES].sort());
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('migration is idempotent when run twice against the same database', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyNetworkManagement001Phase1Schema(dbPath);
        const secondRun = await applyNetworkManagement001Phase1Schema(dbPath);
        assert.deepEqual(secondRun.sort(), [...NEW_TABLE_NAMES].sort());
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('no business data is inserted into any of the new tables', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyNetworkManagement001Phase1Schema(dbPath);
        for (const tableName of NEW_TABLE_NAMES) {
            const rowCount = await countRows(dbPath, tableName);
            assert.equal(rowCount, 0, `${tableName} must contain zero rows after Phase 1 migration`);
        }
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
