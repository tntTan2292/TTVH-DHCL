'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-postman-catalog-service-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyF13RoutePostmanIdentity01Phase1Schema } = require('../../../migrate_f13_route_postman_identity_phase1_schema');
const { run, all, get } = require('../../config/db');
const { withTransaction } = require('../networkMapImport/transactionHelper');
const { classifyPostmanCatalogImport, applyPostmanCatalogImport } = require('./postmanCatalogImport');
const {
    manualUpsert, resolveConflict, rollbackBatch, checkRollbackEligibility, listOpenConflicts, listDirectory,
} = require('./postmanCatalogService');

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
    await applyNetworkManagement001Phase2Schema(testDbPath);
    await applyF13RoutePostmanIdentity01Phase1Schema(testDbPath);
});

test.after(() => {
    try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch { /* Windows file lock, best-effort */ }
});

test.beforeEach(async () => {
    await run('DELETE FROM dm_buu_ta');
    await run('DELETE FROM dm_buu_ta_event');
    await run('DELETE FROM dm_buu_ta_conflict');
});

async function confirmImport(records, meta = {}) {
    const batchId = meta.batchId || `batch-${Date.now()}-${Math.random()}`;
    const classified = await classifyPostmanCatalogImport(records);
    await withTransaction((runInTx) => applyPostmanCatalogImport(runInTx, batchId, classified, {
        fileName: meta.fileName || 'test.xls', fileFingerprint: meta.fileFingerprint || 'fp', performedBy: meta.performedBy || 'tester',
    }));
    return batchId;
}

test('manualUpsert creates a MANUAL record for a previously-unnamed code', async () => {
    const row = await manualUpsert('53B001', { ten_buu_ta: 'PO ENTERED NAME' }, 'po_user');
    assert.equal(row.nguon, 'MANUAL');
    assert.equal(row.ten_buu_ta, 'PO ENTERED NAME');
});

test('manualUpsert rejects a missing name', async () => {
    await assert.rejects(() => manualUpsert('53B002', {}, 'po_user'), (err) => err.code === 'MISSING_NAME');
});

test('resolveConflict KEPT_MANUAL leaves dm_buu_ta untouched and closes the conflict', async () => {
    await run("INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, nguon, in_latest_import) VALUES ('53B003', 'MANUAL NAME', 'MANUAL', 1)");
    await confirmImport([{ ma_buu_ta: '53B003', ten_buu_ta: 'FILE NAME', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' }]);

    const openBefore = await listOpenConflicts();
    assert.equal(openBefore.length, 1);

    await resolveConflict(openBefore[0].id, 'KEPT_MANUAL', 'po_user');

    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53B003']);
    assert.equal(row.ten_buu_ta, 'MANUAL NAME');

    const openAfter = await listOpenConflicts();
    assert.equal(openAfter.length, 0);
});

test('resolveConflict APPLIED_FILE writes the file name and switches ownership to IMPORT', async () => {
    await run("INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, nguon, in_latest_import) VALUES ('53B004', 'MANUAL NAME', 'MANUAL', 1)");
    await confirmImport([{ ma_buu_ta: '53B004', ten_buu_ta: 'FILE NAME', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' }]);

    const [conflict] = await listOpenConflicts();
    await resolveConflict(conflict.id, 'APPLIED_FILE', 'po_user');

    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53B004']);
    assert.equal(row.ten_buu_ta, 'FILE NAME');
    assert.equal(row.nguon, 'IMPORT');
});

test('rollback restores the exact before-image of an INSERT (row disappears)', async () => {
    const batchId = await confirmImport([{ ma_buu_ta: '53B005', ten_buu_ta: 'ROLLBACK ME', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' }]);
    assert.ok(await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53B005']));

    const result = await rollbackBatch(batchId, 'po_user');
    assert.equal(result.success, true);
    assert.equal(await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53B005']), undefined);
});

test('rollback restores the exact before-image of an UPDATE', async () => {
    const first = await confirmImport([{ ma_buu_ta: '53B006', ten_buu_ta: 'V1', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' }]);
    await confirmImport([{ ma_buu_ta: '53B006', ten_buu_ta: 'V2', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' }]);
    const rowBeforeRollback = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53B006']);
    assert.equal(rowBeforeRollback.ten_buu_ta, 'V2');

    // Roll back the SECOND batch (V1 -> V2), the later one, which is eligible since nothing followed it.
    const secondBatchEvent = await get("SELECT batch_id FROM dm_buu_ta_event WHERE ma_buu_ta = ? AND operation='UPDATE' ORDER BY id DESC LIMIT 1", ['53B006']);
    const result = await rollbackBatch(secondBatchEvent.batch_id, 'po_user');
    assert.equal(result.success, true);

    const restored = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53B006']);
    assert.equal(restored.ten_buu_ta, 'V1');
    void first;
});

test('rollback is refused when a later batch touched the same code — reported, not forced', async () => {
    const batchId = await confirmImport([{ ma_buu_ta: '53B007', ten_buu_ta: 'V1', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' }]);
    await confirmImport([{ ma_buu_ta: '53B007', ten_buu_ta: 'V2', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' }]);

    const eligibility = await checkRollbackEligibility(batchId);
    assert.equal(eligibility.eligible, false);
    assert.equal(eligibility.reason, 'BLOCKED_BY_LATER_BATCH');

    const result = await rollbackBatch(batchId, 'po_user');
    assert.equal(result.success, false);
    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53B007']);
    assert.equal(row.ten_buu_ta, 'V2', 'nothing must be touched when rollback is refused');
});

test('re-import after rollback does not create duplicate rows', async () => {
    const record = { ma_buu_ta: '53B008', ten_buu_ta: 'IDEMPOTENT', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' };
    const batchId = await confirmImport([record]);
    await rollbackBatch(batchId, 'po_user');
    await confirmImport([record]);

    const rows = await all('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53B008']);
    assert.equal(rows.length, 1);
});

test('listDirectory search and BCVH filter work', async () => {
    await manualUpsert('53B009', { ten_buu_ta: 'FIND ME', ma_bcvh: '530000' }, 'po_user');
    const bySearch = await listDirectory({ search: 'FIND ME' });
    assert.equal(bySearch.length, 1);
    const byBcvh = await listDirectory({ ma_bcvh: '530000' });
    assert.ok(byBcvh.some((r) => r.ma_buu_ta === '53B009'));
});
