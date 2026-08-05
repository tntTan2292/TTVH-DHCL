const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyNetworkManagement001Phase1Schema } = require('./migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('./migrate_network_management_001_phase2_schema');

function createTempDbPath() {
    return path.join(os.tmpdir(), `network-management-001-phase2-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

function getColumns(dbPath, tableName) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            db.all(`PRAGMA table_info(${tableName})`, [], (queryErr, rows) => {
                db.close(() => {
                    if (queryErr) reject(queryErr);
                    else resolve(rows.map((row) => row.name));
                });
            });
        });
    });
}

test('adds route_po_code to network_delivery_point without touching other columns', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyNetworkManagement001Phase1Schema(dbPath);
        const before = await getColumns(dbPath, 'network_delivery_point');
        assert.ok(!before.includes('route_po_code'));

        const result = await applyNetworkManagement001Phase2Schema(dbPath);
        assert.equal(result.route_po_code_added, true);

        const after = await getColumns(dbPath, 'network_delivery_point');
        assert.ok(after.includes('route_po_code'));
        assert.ok(after.includes('thoi_gian_nhap_phat'));
        assert.ok(after.includes('raw_thoi_gian_nhap_phat'));
        assert.ok(after.includes('ca_phat'));
        assert.ok(after.includes('ngay_nhap_phat'));
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('is idempotent when run twice — no duplicate-column error', async () => {
    const dbPath = createTempDbPath();
    try {
        await applyNetworkManagement001Phase1Schema(dbPath);
        await applyNetworkManagement001Phase2Schema(dbPath);
        const secondRun = await applyNetworkManagement001Phase2Schema(dbPath);
        assert.equal(secondRun.route_po_code_added, false);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
