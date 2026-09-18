'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-postman-catalog-import-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../../migrate_network_management_001_phase1_schema');
const { applyNetworkManagement001Phase2Schema } = require('../../../migrate_network_management_001_phase2_schema');
const { applyF13RoutePostmanIdentity01Phase1Schema } = require('../../../migrate_f13_route_postman_identity_phase1_schema');
const { run, all, get } = require('../../config/db');
const { withTransaction } = require('../networkMapImport/transactionHelper');
const { classifyPostmanCatalogImport, applyPostmanCatalogImport } = require('./postmanCatalogImport');

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
    const counts = await withTransaction((runInTx) => applyPostmanCatalogImport(runInTx, batchId, classified, {
        fileName: meta.fileName || 'test.xls', fileFingerprint: meta.fileFingerprint || 'fp', performedBy: meta.performedBy || 'tester',
    }));
    return { batchId, classified, counts };
}

test('new code -> insert, nguon=IMPORT, in_latest_import=1, INSERT event logged', async () => {
    const { classified, counts } = await confirmImport([
        { ma_buu_ta: '53A001', ten_buu_ta: 'NGUYEN VAN A', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' },
    ]);
    assert.equal(classified.summary.insert, 1);
    assert.equal(counts.inserted, 1);

    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53A001']);
    assert.equal(row.nguon, 'IMPORT');
    assert.equal(row.in_latest_import, 1);

    const events = await all('SELECT * FROM dm_buu_ta_event WHERE ma_buu_ta = ?', ['53A001']);
    assert.equal(events.length, 1);
    assert.equal(events[0].operation, 'INSERT');
    assert.equal(events[0].before_image, null);
});

test('re-uploading the same file yields all-unchanged and no new events', async () => {
    const record = { ma_buu_ta: '53A002', ten_buu_ta: 'TRAN THI B', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' };
    await confirmImport([record]);
    const before = await all('SELECT * FROM dm_buu_ta_event');

    const { classified } = await confirmImport([record]);
    assert.equal(classified.summary.unchanged, 1);
    const after = await all('SELECT * FROM dm_buu_ta_event');
    assert.equal(after.length, before.length, 'no new event for a truly unchanged row');
});

test('D1: IMPORT-owned record with a different name in a newer file -> UPDATE (file still owns)', async () => {
    const first = { ma_buu_ta: '53A003', ten_buu_ta: 'OLD NAME', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' };
    await confirmImport([first]);

    const second = { ...first, ten_buu_ta: 'NEW NAME' };
    const { classified } = await confirmImport([second]);
    assert.equal(classified.summary.update, 1);

    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53A003']);
    assert.equal(row.ten_buu_ta, 'NEW NAME');
    assert.equal(row.nguon, 'IMPORT');
});

test('D1: MANUAL record with the same name from a newer file -> unchanged, ownership stays MANUAL', async () => {
    await run(
        "INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, nguon, in_latest_import) VALUES ('53A004', 'MANUAL NAME', '530000', 'MANUAL', 0)",
    );
    const { classified } = await confirmImport([
        { ma_buu_ta: '53A004', ten_buu_ta: 'MANUAL NAME', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' },
    ]);
    // in_latest_import flips 0 -> 1, which is a field change, so it lands in 'update' — but nguon must stay MANUAL.
    assert.ok(classified.summary.update === 1 || classified.summary.unchanged === 1);
    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53A004']);
    assert.equal(row.nguon, 'MANUAL');
    assert.equal(row.ten_buu_ta, 'MANUAL NAME');
    assert.equal(row.in_latest_import, 1);
});

test('D1: MANUAL record with a DIFFERENT name from a newer file -> conflict, no write to dm_buu_ta', async () => {
    await run(
        "INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, nguon, in_latest_import) VALUES ('53A005', 'MANUAL NAME', '530000', 'MANUAL', 1)",
    );
    const { classified, counts } = await confirmImport([
        { ma_buu_ta: '53A005', ten_buu_ta: 'FILE NAME', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' },
    ]);
    assert.equal(classified.summary.conflict, 1);
    assert.equal(counts.conflicts, 1);

    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53A005']);
    assert.equal(row.ten_buu_ta, 'MANUAL NAME', 'dm_buu_ta must not be touched while conflict is OPEN');

    const conflicts = await all("SELECT * FROM dm_buu_ta_conflict WHERE ma_buu_ta = ? AND trang_thai = 'OPEN'", ['53A005']);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].ten_hien_tai, 'MANUAL NAME');
    assert.equal(conflicts[0].ten_tu_file, 'FILE NAME');
});

test('D3: a code absent from a newer file is kept, never deleted, and marked in_latest_import=0', async () => {
    await confirmImport([
        { ma_buu_ta: '53A006', ten_buu_ta: 'STILL HERE', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' },
    ]);
    const { classified } = await confirmImport([
        { ma_buu_ta: '53A099', ten_buu_ta: 'SOMEONE ELSE', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động' },
    ]);
    assert.equal(classified.summary.absent_from_file, 1);

    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53A006']);
    assert.ok(row, 'row must still exist — D3 forbids deletion');
    assert.equal(row.in_latest_import, 0);
});

test('data minimization: no forbidden PII field is ever written or logged', async () => {
    await confirmImport([
        {
            ma_buu_ta: '53A007', ten_buu_ta: 'NO PII', ma_bcvh: '530000', ten_bcvh: 'Hue', trang_thai_hoat_dong: 'Hoạt động',
            so_dien_thoai: '0900000000', ma_hrm: '000111', loai_hop_dong: 'HĐLĐ',
        },
    ]);
    const row = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', ['53A007']);
    const rowKeys = Object.keys(row);
    ['so_dien_thoai', 'ma_hrm', 'loai_hop_dong', 'chuc_danh'].forEach((f) => assert.ok(!rowKeys.includes(f)));

    const event = await get("SELECT * FROM dm_buu_ta_event WHERE ma_buu_ta = ? AND operation = 'INSERT'", ['53A007']);
    assert.ok(!event.after_image.includes('0900000000'));
    assert.ok(!event.after_image.includes('000111'));
});
