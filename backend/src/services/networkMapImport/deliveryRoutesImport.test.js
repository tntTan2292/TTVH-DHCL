'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-delivery-routes-import-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../../migrate_network_management_001_phase3_schema');
const { run, all } = require('../../config/db');
const { withTransaction } = require('./transactionHelper');
const { classifyDeliveryPoints, hasBlockingError, applyDeliveryRoutesImport } = require('./deliveryRoutesImport');
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
    await run('DELETE FROM network_delivery_point');
    await run('DELETE FROM network_import_snapshot');
    await run('DELETE FROM network_import_log');
});

async function makeImportLog() {
    const result = await run(
        "INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES ('delivery_route', 'test.xlsx', ?, 'SUCCESS')",
        [`fp-${Date.now()}-${Math.random()}`],
    );
    return result.lastID;
}

function baseRecord(overrides = {}) {
    return {
        ma_buu_gui: 'EE000000000VN', ngay_phat: '2026-06-01', ma_bcvh: '533140', postman_code: '53A121',
        route_po_code: '533140145', bien_so: null, lat: 16.5, lon: 107.6, status_time: '10:00:00',
        loai_dich_vu: 'C-Bưu kiện', tien_thu_ho: 100000, thoi_gian_nhap_phat: null, raw_thoi_gian_nhap_phat: null,
        ca_phat: null, ngay_nhap_phat: null, is_duplicate_in_file: false,
        ...overrides,
    };
}

test('classifies added / changed / unchanged / duplicate / error using the locked compound key', async () => {
    await run(
        `INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, ma_buu_gui, route_po_code, bien_so, lat, lon, status_time, loai_dich_vu, tien_thu_ho)
         VALUES ('2026-06-01', '533140', '53A121', 'EE000000000VN', '533140145', NULL, 16.5, 107.6, '10:00:00', 'C-Bưu kiện', 100000)`,
    );

    const records = [
        baseRecord(), // unchanged (identical to DB row)
        baseRecord({ ma_buu_gui: 'EE111111111VN', tien_thu_ho: 999 }), // added
        baseRecord({ ma_buu_gui: 'EE222222222VN', route_po_code: '000', tien_thu_ho: 1 }), // added, then duplicated below
        baseRecord({ ma_buu_gui: 'EE222222222VN', route_po_code: '000', tien_thu_ho: 2, is_duplicate_in_file: true }), // duplicate in file
        baseRecord({ ma_buu_gui: null }), // error: missing key field
    ];

    const { rows, summary } = await classifyDeliveryPoints(records);
    assert.equal(rows[0].classification, 'unchanged');
    assert.equal(rows[1].classification, 'added');
    assert.equal(rows[2].classification, 'added');
    assert.equal(rows[3].classification, 'duplicate');
    assert.equal(rows[4].classification, 'error');
    assert.deepEqual(summary, { added: 2, changed: 0, unchanged: 1, duplicate: 1, error: 1 });
    assert.equal(hasBlockingError(rows), true);
});

test('classifies a content change on the same key as "changed", not "added"', async () => {
    await run(
        `INSERT INTO network_delivery_point (ngay_phat, ma_bcvh, postman_code, ma_buu_gui, route_po_code, tien_thu_ho)
         VALUES ('2026-06-01', '533140', '53A121', 'EE000000000VN', '533140145', 100000)`,
    );
    const records = [baseRecord({ tien_thu_ho: 250000 })];
    const { rows } = await classifyDeliveryPoints(records);
    assert.equal(rows[0].classification, 'changed');
});

test('Confirm applies via upsert — an edited existing row is updated, never silently ignored', async () => {
    const insertLogId = await makeImportLog();
    await withTransaction(async (runInTx) => applyDeliveryRoutesImport(runInTx, insertLogId, (
        await classifyDeliveryPoints([baseRecord()])
    ).rows));

    const [before] = await all('SELECT * FROM network_delivery_point');
    assert.equal(before.tien_thu_ho, 100000);

    // Re-import the SAME key with an edited field — must UPDATE, not be ignored.
    const updateLogId = await makeImportLog();
    const { rows } = await classifyDeliveryPoints([baseRecord({ tien_thu_ho: 777777, status_time: '11:30:00' })]);
    assert.equal(rows[0].classification, 'changed');
    await withTransaction(async (runInTx) => applyDeliveryRoutesImport(runInTx, updateLogId, rows));

    const allRows = await all('SELECT * FROM network_delivery_point');
    assert.equal(allRows.length, 1, 'upsert must not create a second row for the same key');
    assert.equal(allRows[0].tien_thu_ho, 777777);
    assert.equal(allRows[0].status_time, '11:30:00');

    const snapshots = await getSnapshotsForImport(updateLogId);
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].operation, 'UPDATE');
    assert.equal(snapshots[0].before_image.tien_thu_ho, 100000);
});

test('never deletes rows absent from the file — a second, disjoint-key file only adds', async () => {
    const firstLogId = await makeImportLog();
    await withTransaction(async (runInTx) => applyDeliveryRoutesImport(runInTx, firstLogId, (
        await classifyDeliveryPoints([baseRecord()])
    ).rows));

    const secondLogId = await makeImportLog();
    const { rows } = await classifyDeliveryPoints([baseRecord({ ma_buu_gui: 'EE999999999VN' })]);
    await withTransaction(async (runInTx) => applyDeliveryRoutesImport(runInTx, secondLogId, rows));

    const allRows = await all('SELECT ma_buu_gui FROM network_delivery_point ORDER BY ma_buu_gui');
    assert.deepEqual(allRows.map((r) => r.ma_buu_gui), ['EE000000000VN', 'EE999999999VN']);
});

test('same-month, different-fingerprint file is allowed by classify (no month-level fingerprint gate here)', async () => {
    // Fingerprint gating happens at the controller/session layer, not in classify — verifying
    // classify itself has no hidden per-month restriction.
    const records = [baseRecord({ ngay_phat: '2026-06-15', ma_buu_gui: 'EE333333333VN' })];
    const { rows } = await classifyDeliveryPoints(records);
    assert.equal(rows[0].classification, 'added');
});
