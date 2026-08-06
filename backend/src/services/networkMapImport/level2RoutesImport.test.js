'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-level2-routes-import-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../../migrate_network_management_001_phase3_schema');
const { run, all, get } = require('../../config/db');
const { withTransaction } = require('./transactionHelper');
const { classifyLevel2Routes, applyLevel2RoutesImport } = require('./level2RoutesImport');
const { getSnapshotsForImport } = require('./importSnapshot');

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
    await applyNetworkManagement001Phase2Schema(testDbPath);
    await applyNetworkManagement001Phase3Schema(testDbPath);
});

test.after(() => {
    try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
});

test.beforeEach(async () => {
    await run('DELETE FROM network_level2_route_stop');
    await run('DELETE FROM network_level2_route');
    await run('DELETE FROM network_service_point');
    await run('DELETE FROM network_import_snapshot');
    await run('DELETE FROM network_import_log');

    await run("INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('530000', 'Huế', 'Hoạt động')");
    await run("INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('536101', 'Sân Bay', 'Tạm dừng')");
});

async function makeImportLog() {
    const result = await run(
        "INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES ('level2_route', 'test.xlsx', ?, 'SUCCESS')",
        [`fp-${Date.now()}-${Math.random()}`],
    );
    return result.lastID;
}

test('a stop referencing a missing ma_diem is an error for that route only', async () => {
    const groups = [{
        route_id: null, route_name: 'Tuyến mới', declared_km: 10, trips_per_week: 7, operator: 'X', isNew: true,
        stops: [{ rowNumber: 2, seq: 1, ma_diem: '999999', stop_name: 'Không tồn tại' }],
    }];
    const { routes, summary } = await classifyLevel2Routes(groups);
    assert.equal(routes[0].classification, 'error');
    assert.equal(summary.error, 1);
});

test('a stop referencing a "Tạm dừng" service point is valid — status never blocks geometry linkage', async () => {
    const groups = [{
        route_id: null, route_name: 'Tuyến sân bay', declared_km: 8, trips_per_week: 7, operator: 'X', isNew: true,
        stops: [{ rowNumber: 2, seq: 1, ma_diem: '536101', stop_name: 'Sân Bay' }],
    }];
    const { routes } = await classifyLevel2Routes(groups);
    assert.equal(routes[0].classification, 'added');
});

test('one invalid route does not block a second, valid route in the same file', async () => {
    const groups = [
        {
            route_id: null, route_name: 'Tuyến lỗi', declared_km: 5, trips_per_week: 7, operator: 'X', isNew: true,
            stops: [{ rowNumber: 2, seq: 1, ma_diem: 'KHONGTONTAI' }],
        },
        {
            route_id: null, route_name: 'Tuyến hợp lệ', declared_km: 5, trips_per_week: 7, operator: 'X', isNew: true,
            stops: [{ rowNumber: 3, seq: 1, ma_diem: '530000', stop_name: 'Huế' }],
        },
    ];
    const { routes } = await classifyLevel2Routes(groups);
    assert.equal(routes[0].classification, 'error');
    assert.equal(routes[1].classification, 'added');
});

test('Confirm only applies the routes the admin explicitly selected', async () => {
    const groups = [
        { route_id: null, route_name: 'Tuyến A', declared_km: 5, trips_per_week: 7, operator: 'X', isNew: true, stops: [{ seq: 1, ma_diem: '530000', stop_name: 'Huế' }] },
        { route_id: null, route_name: 'Tuyến B', declared_km: 5, trips_per_week: 7, operator: 'X', isNew: true, stops: [{ seq: 1, ma_diem: '536101', stop_name: 'Sân Bay' }] },
    ];
    const { routes } = await classifyLevel2Routes(groups);
    const importLogId = await makeImportLog();

    // Select only "Tuyến A" (new:Tuyến A) — "Tuyến B" must remain untouched.
    await withTransaction(async (runInTx) => applyLevel2RoutesImport(runInTx, importLogId, routes, ['new:Tuyến A']));

    const savedRoutes = await all('SELECT route_name FROM network_level2_route');
    assert.deepEqual(savedRoutes.map((r) => r.route_name), ['Tuyến A']);
});

test('a changed route does delete-and-reinsert only its own stops, snapshotting DELETE for old stops and INSERT for new ones', async () => {
    const routeResult = await run("INSERT INTO network_level2_route (route_name, declared_km, trips_per_week, operator) VALUES ('Tuyến X', 20, 7, 'Op')");
    const routeId = routeResult.lastID;
    await run("INSERT INTO network_level2_route_stop (route_id, seq, ma_diem, stop_name) VALUES (?, 1, '530000', 'Huế cũ')", [routeId]);

    const otherRouteResult = await run("INSERT INTO network_level2_route (route_name, declared_km, trips_per_week, operator) VALUES ('Tuyến khác', 5, 7, 'Op')");
    const otherRouteId = otherRouteResult.lastID;
    await run("INSERT INTO network_level2_route_stop (route_id, seq, ma_diem, stop_name) VALUES (?, 1, '536101', 'Không đổi')", [otherRouteId]);

    const groups = [{
        route_id: String(routeId), route_name: 'Tuyến X (đổi)', declared_km: 25, trips_per_week: 6, operator: 'Op',
        isNew: false,
        stops: [{ seq: 1, ma_diem: '536101', stop_name: 'Sân Bay mới' }],
    }];
    const { routes } = await classifyLevel2Routes(groups);
    assert.equal(routes[0].classification, 'changed');

    const importLogId = await makeImportLog();
    await withTransaction(async (runInTx) => applyLevel2RoutesImport(runInTx, importLogId, routes, [`id:${routeId}`]));

    const updatedRoute = await get('SELECT * FROM network_level2_route WHERE id = ?', [routeId]);
    assert.equal(updatedRoute.route_name, 'Tuyến X (đổi)');
    const newStops = await all('SELECT * FROM network_level2_route_stop WHERE route_id = ?', [routeId]);
    assert.equal(newStops.length, 1);
    assert.equal(newStops[0].ma_diem, '536101');

    // Untouched route must be unaffected.
    const otherStops = await all('SELECT * FROM network_level2_route_stop WHERE route_id = ?', [otherRouteId]);
    assert.equal(otherStops.length, 1);
    assert.equal(otherStops[0].stop_name, 'Không đổi');

    const snapshots = await getSnapshotsForImport(importLogId);
    const deleteSnaps = snapshots.filter((s) => s.operation === 'DELETE' && s.table_name === 'network_level2_route_stop');
    const insertSnaps = snapshots.filter((s) => s.operation === 'INSERT' && s.table_name === 'network_level2_route_stop');
    assert.equal(deleteSnaps.length, 1);
    assert.equal(deleteSnaps[0].before_image.stop_name, 'Huế cũ');
    assert.equal(insertSnaps.length, 1);
});
