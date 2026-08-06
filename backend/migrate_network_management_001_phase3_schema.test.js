const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyNetworkManagement001Phase1Schema } = require('./migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('./migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('./migrate_network_management_001_phase3_schema');

function createTempDbPath() {
    return path.join(os.tmpdir(), `network-management-001-phase3-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

function dbAll(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) { reject(err); return; }
            db.all(sql, params, (queryErr, rows) => {
                db.close(() => {
                    if (queryErr) reject(queryErr);
                    else resolve(rows);
                });
            });
        });
    });
}

function dbRun(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) { reject(err); return; }
            db.run(sql, params, function onRun(runErr) {
                db.close(() => {
                    if (runErr) reject(runErr);
                    else resolve(this);
                });
            });
        });
    });
}

async function freshDb() {
    const dbPath = createTempDbPath();
    await applyNetworkManagement001Phase1Schema(dbPath);
    await applyNetworkManagement001Phase2Schema(dbPath);
    return dbPath;
}

test('creates network_import_session and network_import_snapshot tables', async () => {
    const dbPath = await freshDb();
    try {
        await applyNetworkManagement001Phase3Schema(dbPath);
        const tables = await dbAll(
            dbPath,
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('network_import_session','network_import_snapshot')",
        );
        assert.deepEqual(tables.map((t) => t.name).sort(), ['network_import_session', 'network_import_snapshot']);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('adds network_import_log.rollback_of_import_log_id additively', async () => {
    const dbPath = await freshDb();
    try {
        const before = await dbAll(dbPath, 'PRAGMA table_info(network_import_log)');
        assert.ok(!before.some((c) => c.name === 'rollback_of_import_log_id'));

        const result = await applyNetworkManagement001Phase3Schema(dbPath);
        assert.equal(result.rollback_column_added, true);

        const after = await dbAll(dbPath, 'PRAGMA table_info(network_import_log)');
        assert.ok(after.some((c) => c.name === 'rollback_of_import_log_id'));
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('creates the UNIQUE(ma_buu_gui, ngay_phat, route_po_code) index on a clean table', async () => {
    const dbPath = await freshDb();
    try {
        const result = await applyNetworkManagement001Phase3Schema(dbPath);
        assert.equal(result.unique_index_created, true);

        // Insert one row, then attempt an exact-key duplicate — must be rejected by SQLite itself.
        await dbRun(
            dbPath,
            `INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, ma_buu_gui, route_po_code)
             VALUES ('2026-06-01', '533140', '53A121', 'EE000000000VN', '533140145')`,
        );
        await assert.rejects(
            () => dbRun(
                dbPath,
                `INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, ma_buu_gui, route_po_code)
                 VALUES ('2026-06-01', '533140', '53A121', 'EE000000000VN', '533140145')`,
            ),
            /UNIQUE constraint failed/,
        );
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('aborts loudly and creates no index when existing duplicate-key rows are present — never silently succeeds', async () => {
    const dbPath = await freshDb();
    try {
        await dbRun(
            dbPath,
            `INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, ma_buu_gui, route_po_code) VALUES
             ('2026-06-01', '533140', '53A121', 'DUP0000000VN', '533140145'),
             ('2026-06-01', '533140', '53A121', 'DUP0000000VN', '533140145')`,
        );

        await assert.rejects(
            () => applyNetworkManagement001Phase3Schema(dbPath),
            /existing duplicate-key row group/,
        );

        const indexes = await dbAll(dbPath, "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_network_delivery_point_unique_key'");
        assert.equal(indexes.length, 0, 'index must not be created when violations exist');
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('is idempotent when run twice against the same database', async () => {
    const dbPath = await freshDb();
    try {
        await applyNetworkManagement001Phase3Schema(dbPath);
        const second = await applyNetworkManagement001Phase3Schema(dbPath);
        assert.equal(second.rollback_column_added, false);
        assert.equal(second.unique_index_created, false);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('no business data is inserted by the migration itself', async () => {
    const dbPath = await freshDb();
    try {
        await applyNetworkManagement001Phase3Schema(dbPath);
        const sessionRows = await dbAll(dbPath, 'SELECT COUNT(*) AS n FROM network_import_session');
        const snapshotRows = await dbAll(dbPath, 'SELECT COUNT(*) AS n FROM network_import_snapshot');
        assert.equal(sessionRows[0].n, 0);
        assert.equal(snapshotRows[0].n, 0);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
