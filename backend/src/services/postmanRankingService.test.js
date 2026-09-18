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
    await run("INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, nguon) VALUES ('53A719', 'PHAM VAN D', '530000', 'IMPORT')");
    await run("INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, nguon) VALUES ('53A733', 'VO THI E', '530000', 'IMPORT')");

    const rows = [
        // Multi-postman same route/day: 53A819 (30 items) + 53A856 (11 items) on route R1, 2026-08-15
        ...Array.from({ length: 30 }, (_, i) => ['2026-08-15', '530000', '53A819', 'R1', `BG-A819-${i}`]),
        ...Array.from({ length: 11 }, (_, i) => ['2026-08-15', '530000', '53A856', 'R1', `BG-A856-${i}`]),
        // Unnamed code on route R2, 2026-08-15
        ['2026-08-15', '530000', '53Z000', 'R2', 'BG-Z000-1'],
        // BCVH mismatch: dp.ma_bcvh (531111) differs from dm_buu_ta.ma_bcvh (539999) for 53M999 on route R3
        ['2026-08-15', '531111', '53M999', 'R3', 'BG-M999-1'],
        // B1 regression — route R5: TWO unnamed codes on the same route/day (53Y100=20, 53Y200=5)
        ...Array.from({ length: 20 }, (_, i) => ['2026-08-15', '530000', '53Y100', 'R5', `BG-Y100-${i}`]),
        ...Array.from({ length: 5 }, (_, i) => ['2026-08-15', '530000', '53Y200', 'R5', `BG-Y200-${i}`]),
        // B1 regression — route R6: ONE named + ONE unnamed on the same route/day (53A719=12 named, 53Y300=8 unnamed)
        ...Array.from({ length: 12 }, (_, i) => ['2026-08-15', '530000', '53A719', 'R6', `BG-A719-${i}`]),
        ...Array.from({ length: 8 }, (_, i) => ['2026-08-15', '530000', '53Y300', 'R6', `BG-Y300-${i}`]),
        // B1 regression — route R7: THREE named codes on the same route/day (9 + 7 + 3)
        ...Array.from({ length: 9 }, (_, i) => ['2026-08-15', '530000', '53A819', 'R7', `BG-R7-819-${i}`]),
        ...Array.from({ length: 7 }, (_, i) => ['2026-08-15', '530000', '53A856', 'R7', `BG-R7-856-${i}`]),
        ...Array.from({ length: 3 }, (_, i) => ['2026-08-15', '530000', '53A733', 'R7', `BG-R7-733-${i}`]),
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

// --- B1 regression: Independent Backend Review 002 found that two unnamed
// codes on the same route/day collapsed into one NULL-grouped row (one code
// disappeared, its count merged into the other's). GROUP BY/ORDER BY now use
// the raw dp.* expressions, never the ma_buu_ta/route_po_code SELECT aliases
// that could resolve to the joined dm_buu_ta.ma_buu_ta column instead. ---

test('B1: two UNNAMED postmen on the same route/day are both kept, counts never merged', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2026-08-15', ['R5']);
    const r5 = byRoute.get('R5');
    assert.equal(r5.status, 'OK');
    assert.equal(r5.postmen.length, 2, 'both unnamed codes must survive as separate rows');

    const y100 = r5.postmen.find((p) => p.ma_buu_ta === '53Y100');
    const y200 = r5.postmen.find((p) => p.ma_buu_ta === '53Y200');
    assert.ok(y100 && y200, 'neither unnamed code may vanish');
    assert.equal(y100.item_count, 20);
    assert.equal(y100.name_status, 'UNNAMED');
    assert.equal(y100.ten_buu_ta, null);
    assert.equal(y200.item_count, 5);
    assert.equal(y200.name_status, 'UNNAMED');
    assert.equal(y200.ten_buu_ta, null);
});

test('B1: one NAMED + one UNNAMED postman on the same route/day are both kept, never merged', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2026-08-15', ['R6']);
    const r6 = byRoute.get('R6');
    assert.equal(r6.postmen.length, 2);

    const named = r6.postmen.find((p) => p.ma_buu_ta === '53A719');
    const unnamed = r6.postmen.find((p) => p.ma_buu_ta === '53Y300');
    assert.ok(named && unnamed);
    assert.equal(named.item_count, 12);
    assert.equal(named.ten_buu_ta, 'PHAM VAN D');
    assert.equal(named.name_status, 'NAMED');
    assert.equal(unnamed.item_count, 8);
    assert.equal(unnamed.ten_buu_ta, null);
    assert.equal(unnamed.name_status, 'UNNAMED');
});

test('B1: three NAMED postmen on the same route/day are all kept with correct individual counts', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2026-08-15', ['R7']);
    const r7 = byRoute.get('R7');
    assert.equal(r7.postmen.length, 3);
    const byCode = Object.fromEntries(r7.postmen.map((p) => [p.ma_buu_ta, p]));
    assert.equal(byCode['53A819'].item_count, 9);
    assert.equal(byCode['53A856'].item_count, 7);
    assert.equal(byCode['53A733'].item_count, 3);
    ['53A819', '53A856', '53A733'].forEach((code) => assert.equal(byCode[code].name_status, 'NAMED'));
});

test('B1: per-postman totals and the route total are preserved exactly (no count lost or double-counted)', async () => {
    const { byRoute } = await resolvePostmenForRoutes('2026-08-15', ['R1', 'R5', 'R6', 'R7']);
    const expected = {
        R1: { total: 41, byCode: { '53A819': 30, '53A856': 11 } },
        R5: { total: 25, byCode: { '53Y100': 20, '53Y200': 5 } },
        R6: { total: 20, byCode: { '53A719': 12, '53Y300': 8 } },
        R7: { total: 19, byCode: { '53A819': 9, '53A856': 7, '53A733': 3 } },
    };
    Object.entries(expected).forEach(([route, { total, byCode }]) => {
        const { postmen } = byRoute.get(route);
        const sum = postmen.reduce((acc, p) => acc + p.item_count, 0);
        assert.equal(sum, total, `route ${route} total item_count must equal the raw row count`);
        Object.entries(byCode).forEach(([code, count]) => {
            const found = postmen.find((p) => p.ma_buu_ta === code);
            assert.ok(found, `route ${route} must still contain ${code}`);
            assert.equal(found.item_count, count, `route ${route} code ${code} count must not be merged into another postman's`);
        });
    });
});
