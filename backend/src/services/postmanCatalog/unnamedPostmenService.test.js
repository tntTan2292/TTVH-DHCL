'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-unnamed-postmen-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyF13RoutePostmanIdentity01Phase1Schema } = require('../../../migrate_f13_route_postman_identity_phase1_schema');
const { run } = require('../../config/db');
const { listUnnamedPostmen } = require('./unnamedPostmenService');

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
    await applyNetworkManagement001Phase2Schema(testDbPath);
    await applyF13RoutePostmanIdentity01Phase1Schema(testDbPath);

    await run("INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, nguon) VALUES ('53A001', 'NAMED', 'IMPORT')");

    const rows = [
        ['2026-06-01', '530000', '53A001', '533140001'],
        ['2026-06-01', '530000', '53B999', '533140002'],
        ['2026-06-02', '530000', '53B999', '533140002'],
        ['2026-07-01', '530000', '53B999', '533140003'],
        ['2026-06-01', '531120', '53C888', '533140002'],
    ];
    for (const [ngay, bcvh, code, route] of rows) {
        // eslint-disable-next-line no-await-in-loop
        await run(
            'INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, route_po_code) VALUES (?, ?, ?, ?)',
            [ngay, bcvh, code, route],
        );
    }
});

test.after(() => {
    try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
});

test('excludes codes already named in dm_buu_ta', async () => {
    const rows = await listUnnamedPostmen();
    assert.ok(!rows.some((r) => r.ma_buu_ta === '53A001'));
});

test('aggregates volume, date range, months covered, and top routes for an unnamed code', async () => {
    const rows = await listUnnamedPostmen();
    const target = rows.find((r) => r.ma_buu_ta === '53B999');
    assert.ok(target);
    assert.equal(target.san_luong, 3);
    assert.equal(target.ky_xuat_hien.first_date, '2026-06-01');
    assert.equal(target.ky_xuat_hien.last_date, '2026-07-01');
    assert.deepEqual(target.ky_xuat_hien.thang_covered, ['2026-06', '2026-07']);
    assert.equal(target.ma_bcvh_chinh, '530000');
});

test('sorted by volume descending', async () => {
    const rows = await listUnnamedPostmen();
    for (let i = 1; i < rows.length; i += 1) {
        assert.ok(rows[i - 1].san_luong >= rows[i].san_luong);
    }
});

test('ma_bcvh filter narrows results', async () => {
    const rows = await listUnnamedPostmen({ ma_bcvh: '531120' });
    assert.deepEqual(rows.map((r) => r.ma_buu_ta), ['53C888']);
});
