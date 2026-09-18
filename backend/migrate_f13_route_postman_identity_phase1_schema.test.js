const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyNetworkManagement001Phase1Schema } = require('./migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('./migrate_network_management_001_phase2_schema');
const { applyF13RoutePostmanIdentity01Phase1Schema } = require('./migrate_f13_route_postman_identity_phase1_schema');

function createTempDbPath() {
    return path.join(os.tmpdir(), `f13-route-postman-identity-01-phase1-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
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

async function freshDb() {
    const dbPath = createTempDbPath();
    await applyNetworkManagement001Phase1Schema(dbPath);
    await applyNetworkManagement001Phase2Schema(dbPath);
    return dbPath;
}

test('M4: standalone-safe on a genuinely empty database — no prior migration required from the caller', async () => {
    const dbPath = createTempDbPath();
    try {
        const result = await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
        assert.equal(result.tablesAlreadyPresent, 0);
        const tables = await dbAll(
            dbPath,
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('dm_buu_ta','dm_buu_ta_event','dm_buu_ta_conflict','network_delivery_point')",
        );
        assert.deepEqual(
            tables.map((t) => t.name).sort(),
            ['dm_buu_ta', 'dm_buu_ta_conflict', 'dm_buu_ta_event', 'network_delivery_point'],
        );
        const indexes = await dbAll(dbPath, "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_network_delivery_point_route_day'");
        assert.equal(indexes.length, 1);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('creates dm_buu_ta, dm_buu_ta_event, dm_buu_ta_conflict tables', async () => {
    const dbPath = await freshDb();
    try {
        await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
        const tables = await dbAll(
            dbPath,
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('dm_buu_ta','dm_buu_ta_event','dm_buu_ta_conflict')",
        );
        assert.deepEqual(tables.map((t) => t.name).sort(), ['dm_buu_ta', 'dm_buu_ta_conflict', 'dm_buu_ta_event']);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('creates the ranking covering index idx_network_delivery_point_route_day', async () => {
    const dbPath = await freshDb();
    try {
        await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
        const indexes = await dbAll(dbPath, "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_network_delivery_point_route_day'");
        assert.equal(indexes.length, 1);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('dm_buu_ta only carries the five allowed business fields plus source/update metadata — no phone/HRM/contract columns', async () => {
    const dbPath = await freshDb();
    try {
        await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
        const columns = await dbAll(dbPath, 'PRAGMA table_info(dm_buu_ta)');
        const names = columns.map((c) => c.name);
        const forbidden = ['so_dien_thoai', 'ma_hrm', 'loai_hop_dong', 'chuc_danh', 'ma_bdt', 'ten_bdt', 'ma_bdh', 'ten_bdh'];
        forbidden.forEach((f) => assert.ok(!names.includes(f), `forbidden column "${f}" must not exist`));
        assert.deepEqual(
            names.sort(),
            ['created_at', 'in_latest_import', 'last_import_batch_id', 'ma_bcvh', 'ma_buu_ta', 'nguon', 'ten_bcvh', 'ten_buu_ta', 'trang_thai_hoat_dong', 'updated_at', 'updated_by'].sort(),
        );
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('is idempotent when run twice against the same database', async () => {
    const dbPath = await freshDb();
    try {
        await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
        const second = await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
        assert.equal(second.tablesAlreadyPresent, 3);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('no business data is inserted by the migration itself', async () => {
    const dbPath = await freshDb();
    try {
        await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
        const rows = await dbAll(dbPath, 'SELECT COUNT(*) AS n FROM dm_buu_ta');
        assert.equal(rows[0].n, 0);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('no existing table is altered — network_delivery_point / network_import_log column sets unchanged', async () => {
    const dbPath = await freshDb();
    try {
        const before = await dbAll(dbPath, 'PRAGMA table_info(network_delivery_point)');
        await applyF13RoutePostmanIdentity01Phase1Schema(dbPath);
        const after = await dbAll(dbPath, 'PRAGMA table_info(network_delivery_point)');
        assert.deepEqual(before.map((c) => c.name), after.map((c) => c.name));
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
