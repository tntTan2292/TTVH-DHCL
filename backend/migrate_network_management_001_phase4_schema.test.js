const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyNetworkManagement001Phase1Schema } = require('./migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('./migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('./migrate_network_management_001_phase3_schema');
const { applyNetworkManagement001Phase4Schema } = require('./migrate_network_management_001_phase4_schema');

function createTempDbPath() {
    return path.join(os.tmpdir(), `network-management-001-phase4-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
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

test('creates network_import_archive with the expected columns', async () => {
    const dbPath = createTempDbPath();
    await applyNetworkManagement001Phase1Schema(dbPath);
    await applyNetworkManagement001Phase2Schema(dbPath);
    await applyNetworkManagement001Phase3Schema(dbPath);
    await applyNetworkManagement001Phase4Schema(dbPath);

    const columns = await dbAll(dbPath, 'PRAGMA table_info(network_import_archive)');
    const names = columns.map((c) => c.name).sort();
    assert.deepEqual(
        names,
        ['actual_period_months', 'archived_at', 'archived_path', 'byte_size', 'declared_period',
            'file_fingerprint', 'file_name', 'id', 'import_log_id', 'module', 'uploaded_by'].sort(),
    );

    try { fs.rmSync(dbPath, { force: true }); } catch { /* Windows file lock, best-effort */ }
});

test('is idempotent — running twice does not error and does not duplicate the table/index', async () => {
    const dbPath = createTempDbPath();
    await applyNetworkManagement001Phase1Schema(dbPath);
    await applyNetworkManagement001Phase2Schema(dbPath);
    await applyNetworkManagement001Phase3Schema(dbPath);
    await applyNetworkManagement001Phase4Schema(dbPath);
    await applyNetworkManagement001Phase4Schema(dbPath);

    const tables = await dbAll(
        dbPath,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='network_import_archive'",
    );
    assert.equal(tables.length, 1);

    try { fs.rmSync(dbPath, { force: true }); } catch { /* Windows file lock, best-effort */ }
});

test('enforces UNIQUE(module, file_fingerprint) — a second archive row for the same module+fingerprint is rejected', async () => {
    const dbPath = createTempDbPath();
    await applyNetworkManagement001Phase1Schema(dbPath);
    await applyNetworkManagement001Phase2Schema(dbPath);
    await applyNetworkManagement001Phase3Schema(dbPath);
    await applyNetworkManagement001Phase4Schema(dbPath);

    const db = new sqlite3.Database(dbPath);
    const runAsync = (sql, params) => new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) { if (err) reject(err); else resolve(this); });
    });

    await runAsync(
        "INSERT INTO network_import_log (id, module, file_name, file_fingerprint, status) VALUES (1, 'delivery_route', 'a.xlsb', 'fp1', 'SUCCESS')",
        [],
    );
    await runAsync(
        "INSERT INTO network_import_archive (import_log_id, module, file_name, file_fingerprint, byte_size, archived_path) VALUES (1, 'delivery_route', 'a.xlsb', 'fp1', 100, '/tmp/a.xlsb')",
        [],
    );

    await assert.rejects(
        runAsync(
            "INSERT INTO network_import_archive (import_log_id, module, file_name, file_fingerprint, byte_size, archived_path) VALUES (1, 'delivery_route', 'a.xlsb', 'fp1', 100, '/tmp/a2.xlsb')",
            [],
        ),
        /UNIQUE constraint failed/,
    );

    await new Promise((resolve) => db.close(resolve));
    try { fs.rmSync(dbPath, { force: true }); } catch { /* Windows file lock, best-effort */ }
});
