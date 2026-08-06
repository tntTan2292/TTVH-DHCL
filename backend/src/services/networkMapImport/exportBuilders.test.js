'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-export-builders-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../../migrate_network_management_001_phase3_schema');
const { run } = require('../../config/db');
const { buildServicePointsExport, buildLevel2RoutesExport, buildDeliveryRoutesExport, buildDeliveryRoutesExportPreviewCount } = require('./exportBuilders');
const { parseServicePointsWorkbook } = require('../networkMapSeed/parseServicePointsExcel');
const { parseLevel2RoutesImportWorkbook, groupStopRowsByRoute } = require('./parseLevel2RoutesImportExcel');
const { parseDeliveryRoutesImportWorkbook } = require('./parseDeliveryRoutesImportExcel');

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
    await run('DELETE FROM network_delivery_point');
});

test('service points Export round-trips through the Import parser with trạng_thái preserved', async () => {
    await run("INSERT INTO network_service_point (ma_diem, ten_diem, loai_diem, trang_thai, lat, lon) VALUES ('536101', 'Sân Bay', 'Pudo', 'Tạm dừng', 16.39, 107.70)");

    const { buffer, rowCount } = await buildServicePointsExport();
    assert.equal(rowCount, 1);

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const { records, warnings } = parseServicePointsWorkbook(workbook);
    assert.equal(warnings.length, 0, 'Export structure must match what the Import parser expects exactly');
    assert.equal(records.length, 1);
    assert.equal(records[0].ma_diem, '536101');
    assert.equal(records[0].trang_thai, 'Tạm dừng');
});

test('level2 routes Export round-trips with Route ID = network_level2_route.id', async () => {
    const routeResult = await run("INSERT INTO network_level2_route (route_name, declared_km, trips_per_week, operator) VALUES ('Tuyến X', 20, 7, 'Op')");
    const routeId = routeResult.lastID;
    await run("INSERT INTO network_level2_route_stop (route_id, seq, ma_diem, stop_name) VALUES (?, 1, '530000', 'Huế')", [routeId]);

    const { buffer, rowCount } = await buildLevel2RoutesExport();
    assert.equal(rowCount, 1);

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const { stopRows, warnings } = parseLevel2RoutesImportWorkbook(workbook);
    assert.equal(warnings.length, 0);
    const groups = groupStopRowsByRoute(stopRows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].route_id, String(routeId));
    assert.equal(groups[0].isNew, false);
});

test('delivery routes Export defaults to a date range and supports all=true, row count matches the actual export', async () => {
    await run("INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, ma_buu_gui, route_po_code, lat, lon) VALUES ('2026-06-01', '533140', '53A121', 'EE1VN', '1', 16.5, 107.6)");
    await run("INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, ma_buu_gui, route_po_code, lat, lon) VALUES ('2026-07-01', '533140', '53A121', 'EE2VN', '2', 16.5, 107.6)");

    const juneCount = await buildDeliveryRoutesExportPreviewCount({ from: '2026-06-01', to: '2026-06-30' });
    assert.equal(juneCount, 1);
    const allCount = await buildDeliveryRoutesExportPreviewCount({ all: true });
    assert.equal(allCount, 2);

    const { buffer, rowCount } = await buildDeliveryRoutesExport({ from: '2026-06-01', to: '2026-06-30' });
    assert.equal(rowCount, 1);

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const { records, warnings } = parseDeliveryRoutesImportWorkbook(workbook);
    assert.equal(warnings.length, 0);
    assert.equal(records.length, 1);
    assert.equal(records[0].ma_buu_gui, 'EE1VN');
});
