'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-service-points-import-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyNetworkManagement001Phase3Schema } = require('../../../migrate_network_management_001_phase3_schema');
const { run, all } = require('../../config/db');
const { withTransaction } = require('./transactionHelper');
const { classifyServicePoints, hasBlockingError, applyServicePointsImport } = require('./servicePointsImport');
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
    await run('DELETE FROM network_service_point');
    await run('DELETE FROM network_import_snapshot');
    await run('DELETE FROM network_import_log');
});

async function makeImportLog() {
    const result = await run(
        "INSERT INTO network_import_log (module, file_name, file_fingerprint, status) VALUES ('service_point', 'test.xlsx', ?, 'SUCCESS')",
        [`fp-${Date.now()}-${Math.random()}`],
    );
    return result.lastID;
}

test('classifies added / unchanged / changed / duplicate / error correctly', async () => {
    await run(
        "INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('530000', 'Huế', 'Hoạt động')",
    );
    await run(
        "INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('530001', 'Quảng Điền', 'Hoạt động')",
    );

    const parsed = [
        { ma_diem: '530000', ten_diem: 'Huế', trang_thai: 'Hoạt động' }, // unchanged
        { ma_diem: '530001', ten_diem: 'Quảng Điền (đổi tên)', trang_thai: 'Hoạt động' }, // changed
        { ma_diem: '999999', ten_diem: 'Điểm mới', trang_thai: 'Hoạt động' }, // added
        { ma_diem: '999999', ten_diem: 'Điểm mới (dup)', trang_thai: 'Hoạt động' }, // duplicate in file
        { ma_diem: '', ten_diem: 'Thiếu mã', trang_thai: 'Hoạt động' }, // error
    ];

    const { rows, summary } = await classifyServicePoints(parsed);
    assert.equal(rows[0].classification, 'unchanged');
    assert.equal(rows[1].classification, 'changed');
    assert.equal(rows[2].classification, 'added');
    assert.equal(rows[3].classification, 'duplicate');
    assert.equal(rows[4].classification, 'error');
    assert.deepEqual(summary, { added: 1, changed: 1, unchanged: 1, duplicate: 1, error: 1 });
    assert.equal(hasBlockingError(rows), true);
});

test('trang_thai is never defaulted or transformed — "Tạm dừng" survives classify+apply verbatim', async () => {
    const parsed = [{ ma_diem: '536101', ten_diem: 'Sân Bay', trang_thai: 'Tạm dừng', lat: 16.3975601862286, lon: 107.700091969722 }];
    const { rows } = await classifyServicePoints(parsed);
    assert.equal(rows[0].classification, 'added');

    const importLogId = await makeImportLog();
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, importLogId, rows));

    const [saved] = await all('SELECT * FROM network_service_point WHERE ma_diem = ?', ['536101']);
    assert.equal(saved.trang_thai, 'Tạm dừng');
});

test('upsert never deletes points absent from the file', async () => {
    await run("INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('111111', 'Điểm cũ', 'Hoạt động')");

    const parsed = [{ ma_diem: '222222', ten_diem: 'Điểm khác', trang_thai: 'Hoạt động' }];
    const { rows } = await classifyServicePoints(parsed);
    const importLogId = await makeImportLog();
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, importLogId, rows));

    const remaining = await all('SELECT ma_diem FROM network_service_point ORDER BY ma_diem');
    assert.deepEqual(remaining.map((r) => r.ma_diem), ['111111', '222222']);
});

test('apply records a snapshot per written row: INSERT for added, UPDATE with before-image for changed', async () => {
    await run("INSERT INTO network_service_point (ma_diem, ten_diem, trang_thai) VALUES ('530000', 'Huế cũ', 'Hoạt động')");

    const parsed = [
        { ma_diem: '530000', ten_diem: 'Huế mới', trang_thai: 'Hoạt động' },
        { ma_diem: '999999', ten_diem: 'Mới', trang_thai: 'Hoạt động' },
    ];
    const { rows } = await classifyServicePoints(parsed);
    const importLogId = await makeImportLog();
    await withTransaction(async (runInTx) => applyServicePointsImport(runInTx, importLogId, rows));

    const snapshots = await getSnapshotsForImport(importLogId);
    const updateSnap = snapshots.find((s) => s.row_key.ma_diem === '530000');
    const insertSnap = snapshots.find((s) => s.row_key.ma_diem === '999999');
    assert.equal(updateSnap.operation, 'UPDATE');
    assert.equal(updateSnap.before_image.ten_diem, 'Huế cũ');
    assert.equal(insertSnap.operation, 'INSERT');
    assert.equal(insertSnap.before_image, null);
});

test('a blocking error row means Confirm must not be called for the file (hasBlockingError gate)', async () => {
    const parsed = [{ ma_diem: null, ten_diem: 'X' }];
    const { rows } = await classifyServicePoints(parsed);
    assert.equal(hasBlockingError(rows), true);
    // Controller-level contract: applyServicePointsImport must never be invoked when hasBlockingError() is true.
});
