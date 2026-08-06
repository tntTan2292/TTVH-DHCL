'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-rollback-service-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../../migrate_network_management_001_phase3_schema');
const { run, all, get } = require('../../config/db');
const { withTransaction } = require('./transactionHelper');
const { classifyServicePoints, applyServicePointsImport } = require('./servicePointsImport');
const { classifyLevel2Routes, applyLevel2RoutesImport } = require('./level2RoutesImport');
const { rollbackImport } = require('./rollbackService');

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
    await applyNetworkManagement001Phase2Schema(testDbPath);
    await applyNetworkManagement001Phase3Schema(testDbPath);
});

test.after(() => {
    try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
});

test.beforeEach(async () => {
    await run('DELETE FROM network_service_point');
    await run('DELETE FROM network_level2_route_stop');
    await run('DELETE FROM network_level2_route');
    await run('DELETE FROM network_import_snapshot');
    await run('DELETE FROM network_import_log');
});

async function makeImportLog(module = 'service_point') {
    const result = await run(
        "INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES (?, 'test.xlsx', ?, 'SUCCESS')",
        [module, `fp-${Date.now()}-${Math.random()}`],
    );
    return result.lastID;
}

test('rollback of an INSERT-only import removes the newly-added row', async () => {
    const importLogId = await makeImportLog();
    const { rows } = await classifyServicePoints([{ ma_diem: '999999', ten_diem: 'Mới', trang_thai: 'Hoạt động' }]);
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, importLogId, rows));

    let existing = await get('SELECT * FROM network_service_point WHERE ma_diem = ?', ['999999']);
    assert.ok(existing);

    const result = await rollbackImport(importLogId, 'admin');
    assert.equal(result.success, true);

    existing = await get('SELECT * FROM network_service_point WHERE ma_diem = ?', ['999999']);
    assert.equal(existing, undefined);

    const rollbackLog = await get("SELECT * FROM network_import_log WHERE rollback_of_import_log_id = ?", [importLogId]);
    assert.equal(rollbackLog.status, 'ROLLED_BACK');
});

test('rollback of an UPDATE import restores the exact before-image', async () => {
    await run("INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('530000', 'Huế gốc', 'Hoạt động')");

    const importLogId = await makeImportLog();
    const { rows } = await classifyServicePoints([{ ma_diem: '530000', ten_diem: 'Huế đổi tên', trang_thai: 'Hoạt động' }]);
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, importLogId, rows));

    let current = await get('SELECT * FROM network_service_point WHERE ma_diem = ?', ['530000']);
    assert.equal(current.ten_diem, 'Huế đổi tên');

    await rollbackImport(importLogId, 'admin');

    current = await get('SELECT * FROM network_service_point WHERE ma_diem = ?', ['530000']);
    assert.equal(current.ten_diem, 'Huế gốc');
});

test('rollback of ĐTC2 delete-and-reinsert restores the exact prior stop set', async () => {
    await run("INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('530000', 'Huế', 'Hoạt động')");
    await run("INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('536101', 'Sân Bay', 'Tạm dừng')");

    const routeResult = await run("INSERT INTO network_level2_route (route_name, declared_km, trips_per_week, operator) VALUES ('Tuyến X', 20, 7, 'Op')");
    const routeId = routeResult.lastID;
    await run("INSERT INTO network_level2_route_stop (route_id, seq, ma_diem, stop_name) VALUES (?, 1, '530000', 'Huế cũ')", [routeId]);

    const groups = [{
        route_id: String(routeId), route_name: 'Tuyến X (đổi)', declared_km: 25, trips_per_week: 6, operator: 'Op', isNew: false,
        stops: [{ seq: 1, ma_diem: '536101', stop_name: 'Sân Bay mới' }],
    }];
    const { routes } = await classifyLevel2Routes(groups);
    const importLogId = await makeImportLog('level2_route');
    await withTransaction(async (runInTx) => applyLevel2RoutesImport(runInTx, importLogId, routes, [`id:${routeId}`]));

    let stops = await all('SELECT * FROM network_level2_route_stop WHERE route_id = ?', [routeId]);
    assert.equal(stops.length, 1);
    assert.equal(stops[0].ma_diem, '536101');

    const result = await rollbackImport(importLogId, 'admin');
    assert.equal(result.success, true);

    stops = await all('SELECT * FROM network_level2_route_stop WHERE route_id = ? ORDER BY seq', [routeId]);
    assert.equal(stops.length, 1);
    assert.equal(stops[0].ma_diem, '530000');
    assert.equal(stops[0].stop_name, 'Huế cũ');

    const restoredRoute = await get('SELECT * FROM network_level2_route WHERE id = ?', [routeId]);
    assert.equal(restoredRoute.route_name, 'Tuyến X');
    assert.equal(restoredRoute.declared_km, 20);
});

test('rollback is blocked when a later Import touched the same scope', async () => {
    const firstLogId = await makeImportLog();
    const { rows: firstRows } = await classifyServicePoints([{ ma_diem: '111111', ten_diem: 'V1', trang_thai: 'Hoạt động' }]);
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, firstLogId, firstRows));

    const secondLogId = await makeImportLog();
    const { rows: secondRows } = await classifyServicePoints([{ ma_diem: '111111', ten_diem: 'V2', trang_thai: 'Hoạt động' }]);
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, secondLogId, secondRows));

    const result = await rollbackImport(firstLogId, 'admin');
    assert.equal(result.success, false);
    assert.equal(result.code, 'BLOCKED_BY_LATER_IMPORT');
    assert.equal(result.blockingImportLogId, secondLogId);

    // Data must be untouched by the blocked attempt.
    const current = await get('SELECT * FROM network_service_point WHERE ma_diem = ?', ['111111']);
    assert.equal(current.ten_diem, 'V2');
});

test('rollback is allowed when a later Import touched a disjoint scope', async () => {
    const firstLogId = await makeImportLog();
    const { rows: firstRows } = await classifyServicePoints([{ ma_diem: '222222', ten_diem: 'A', trang_thai: 'Hoạt động' }]);
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, firstLogId, firstRows));

    const secondLogId = await makeImportLog();
    const { rows: secondRows } = await classifyServicePoints([{ ma_diem: '333333', ten_diem: 'B', trang_thai: 'Hoạt động' }]);
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, secondLogId, secondRows));

    const result = await rollbackImport(firstLogId, 'admin');
    assert.equal(result.success, true);

    const gone = await get('SELECT * FROM network_service_point WHERE ma_diem = ?', ['222222']);
    assert.equal(gone, undefined);
    const untouched = await get('SELECT * FROM network_service_point WHERE ma_diem = ?', ['333333']);
    assert.ok(untouched);
});

test('rollback of an already-rolled-back import is rejected', async () => {
    const importLogId = await makeImportLog();
    const { rows } = await classifyServicePoints([{ ma_diem: '444444', ten_diem: 'X', trang_thai: 'Hoạt động' }]);
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, importLogId, rows));

    const first = await rollbackImport(importLogId, 'admin');
    assert.equal(first.success, true);

    const second = await rollbackImport(importLogId, 'admin');
    assert.equal(second.success, false);
    assert.equal(second.code, 'NOT_ROLLBACKABLE');
});
