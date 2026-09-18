'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-postman-ranking-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../migrate_network_management_001_phase2_schema');
const { applyF13RoutePostmanIdentity01Phase1Schema } = require('../../migrate_f13_route_postman_identity_phase1_schema');
const { run } = require('../config/db');
const { resolvePostmenForRoutes } = require('./postmanRankingService');

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
    await applyNetworkManagement001Phase2Schema(testDbPath);
    await applyF13RoutePostmanIdentity01Phase1Schema(testDbPath);

    await run("INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, nguon) VALUES ('53A819', 'NGUYEN VAN A', '530000', 'IMPORT')");
    await run("INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, nguon) VALUES ('53A856', 'TRAN THI B', '530000', 'IMPORT')");
    await run("INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, nguon) VALUES ('53M999', 'LE VAN C', '539999', 'IMPORT')");

    const rows = [
        // Multi-postman same route/day: 53A819 (30 items) + 53A856 (11 items) on route R1, 2026-08-15
        ...Array.from({ length: 30 }, (_, i) => ['2026-08-15', '530000', '53A819', 'R1', `BG-A819-${i}`]),
        ...Array.from({ length: 11 }, (_, i) => ['2026-08-15', '530000', '53A856', 'R1', `BG-A856-${i}`]),
        // Unnamed code on route R2, 2026-08-15
        ['2026-08-15', '530000', '53Z000', 'R2', 'BG-Z000-1'],
        // BCVH mismatch: dp.ma_bcvh (531111) differs from dm_buu_ta.ma_bcvh (539999) for 53M999 on route R3
        ['2026-08-15', '531111', '53M999', 'R3', 'BG-M999-1'],
    ];
    for (const [ngay, bcvh, code, route, buuGui] of rows) {
        // eslint-disable-next-line no-await-in-loop
        await run(
            'INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, route_po_code, ma_buu_gui) VALUES (?, ?, ?, ?, ?)',
            [ngay, bcvh, code, route, buuGui],
        );
    }
});

test.after(() => {
    try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
});

test('multi-postman preservation: both postmen on the same route/day are kept with correct item_count, ordered by volume desc', async () => {
    const { byRoute, postmanAnchorDate } = await resolvePostmenForRoutes('2026-08-15', ['R1']);
    assert.equal(postmanAnchorDate, '2026-08-15');
    const r1 = byRoute.get('R1');
    assert.equal(r1.status, 'OK');
    assert.equal(r1.postmen.length, 2);
    assert.equal(r1.postmen[0].ma_buu_ta, '53A819');
    assert.equal(r1.postmen[0].item_count, 30);
    assert.equal(r1.postmen[0].name_status, 'NAMED');
    assert.equal(r1.postmen[1].ma_buu_ta, '53A856');
    assert.equal(r1.postmen[1].item_count, 11);
});

test('unnamed code -> name_status UNNAMED, ten_buu_ta null, never fabricated', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2026-08-15', ['R2']);
    const r2 = byRoute.get('R2');
    assert.equal(r2.status, 'OK');
    assert.equal(r2.postmen.length, 1);
    assert.equal(r2.postmen[0].ma_buu_ta, '53Z000');
    assert.equal(r2.postmen[0].ten_buu_ta, null);
    assert.equal(r2.postmen[0].name_status, 'UNNAMED');
});

test('BCVH mismatch is flagged but never suppresses the name (cross-check only)', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2026-08-15', ['R3']);
    const r3 = byRoute.get('R3');
    assert.equal(r3.postmen[0].ma_buu_ta, '53M999');
    assert.equal(r3.postmen[0].ten_buu_ta, 'LE VAN C');
    assert.equal(r3.postmen[0].bcvh_mismatch, true);
});

test('no BF data for the anchor date at all -> NO_BF_FOR_DATE, empty postmen', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2099-01-01', ['R1']);
    assert.equal(byRoute.get('R1').status, 'NO_BF_FOR_DATE');
    assert.deepEqual(byRoute.get('R1').postmen, []);
});

test('date has data but route is absent from BF -> ROUTE_NOT_IN_BF', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2026-08-15', ['R404']);
    assert.equal(byRoute.get('R404').status, 'ROUTE_NOT_IN_BF');
    assert.deepEqual(byRoute.get('R404').postmen, []);
});

test('never borrows a postman from a different date', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2026-08-16', ['R1']);
    // 2026-08-16 has zero rows anywhere -> NO_BF_FOR_DATE (never falls back to 08-15's data)
    assert.equal(byRoute.get('R1').status, 'NO_BF_FOR_DATE');
});
