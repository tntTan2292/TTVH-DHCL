'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');

const { applyBfPhat01Schema } = require('../../../migrate_bf_phat_01_schema');
const { extractBfDateFromFilename } = require('./parseBfPhatDailyExcel');
const { BfPhatImportService, pickDailyFiles } = require('./bfPhatImportService');

const HEADER = ['LADING_CODE', 'Mã Tỉnh', 'Mã huyện', 'Mã bưu cục', 'POSTMAN_CODE', 'ROUTE_PO_CODE', 'STATUS_CODE', 'TYPE_CODE_PAYROLL',
    'TYPE_NAME_PAYROLL', 'SERVICE_NAME_PAYROLL', 'REGION_CODE', 'KG', 'AREA_CODE', 'SERVICE_CODE', 'ITEM_TYPE_CODE', 'STATUS_DATE', 'QUANTITY',
    'SERVICE_PRO', 'MABC_CN', 'MABC_PHAT', 'SO_TIEN_THU_HO', 'CUSTOMER_CODE', 'LAT', 'LON', 'STATUS_TIME', 'GTGT', 'Xác nhận đến BCP', 'Mã lô'];

function line(code, over = {}) {
    const base = { LADING_CODE: code, 'Mã Tỉnh': '53', POSTMAN_CODE: '53A966', ROUTE_PO_CODE: '533140141', STATUS_CODE: 'PTC', KG: '500',
        STATUS_DATE: '20261020', QUANTITY: '1', MABC_PHAT: '533140', SO_TIEN_THU_HO: '200000', LAT: '16.47', LON: '107.57', STATUS_TIME: '162400', 'Mã lô': 'L1' };
    return HEADER.map((name) => (name in { ...base, ...over } ? { ...base, ...over }[name] : ''));
}

function writeXlsx(file, lines, header = HEADER) {
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([header, ...lines]), 'S');
    xlsx.writeFile(wb, file);
}

async function makeDb(dir) {
    const dbPath = path.join(dir, 'test.sqlite');
    await new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : db.exec(`CREATE TABLE import_log (id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT NOT NULL,
            ngay_do_kiem TEXT NOT NULL, indicator TEXT DEFAULT 'F1.3', source_lane TEXT, trigger_source TEXT DEFAULT 'AUTO', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL, total_records INTEGER DEFAULT 0, error_records INTEGER DEFAULT 0, skipped_records INTEGER DEFAULT 0, actor TEXT, run_id TEXT, job_id TEXT,
            import_mode TEXT, replaced_row_count INTEGER)`, (e2) => db.close(() => (e2 ? reject(e2) : resolve())))));
    });
    await applyBfPhat01Schema(dbPath);
    return dbPath;
}

const query = (dbPath, sql, params = []) => new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : db.all(sql, params, (e2, rows) => db.close(() => (e2 ? reject(e2) : resolve(rows))))));
});

test('filename date extraction', () => {
    assert.equal(extractBfDateFromFilename('SanLuongChiTiet_20102026.xlsx'), '2026-10-20');
    assert.equal(extractBfDateFromFilename('SanLuongChiTiet_01042026_001.xlsx'), '2026-04-01');
    assert.equal(extractBfDateFromFilename('SanLuongChiTiet_31022026.xlsx'), null);
    assert.equal(extractBfDateFromFilename('other.xlsx'), null);
});

test('imports a day, logs it, and a re-import replaces rather than duplicates', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bfphat-'));
    try {
        const dbPath = await makeDb(dir);
        const file = path.join(dir, 'SanLuongChiTiet_20102026.xlsx');
        writeXlsx(file, [line('A1'), line('A2', { 'Mã lô': '' }), line('')]);
        const service = new BfPhatImportService({ dbPath });

        const first = await service.importFile(file, { actor: 'tester' });
        assert.equal(first.status, 'SUCCESS');
        assert.equal(first.rows, 2);
        assert.equal(first.skipped, 1);

        const second = await service.importFile(file);
        assert.equal(second.replaced, 2);
        const rows = await query(dbPath, 'SELECT lading_code, ma_lo, kg, so_tien_thu_ho, ngay_bf, status_date FROM fact_bf_phat ORDER BY lading_code');
        assert.equal(rows.length, 2);
        assert.deepEqual(rows[0], { lading_code: 'A1', ma_lo: 'L1', kg: 500, so_tien_thu_ho: 200000, ngay_bf: '2026-10-20', status_date: '20261020' });
        assert.equal(rows[1].ma_lo, null);

        const logs = await query(dbPath, 'SELECT indicator, source_lane, status, import_mode, replaced_row_count, total_records FROM import_log ORDER BY id');
        assert.deepEqual(logs.map((l) => [l.indicator, l.status, l.import_mode, l.replaced_row_count, l.total_records]),
            [['BF-PHAT', 'SUCCESS', 'NEW', 0, 2], ['BF-PHAT', 'SUCCESS', 'REIMPORT', 2, 2]]);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('a file missing a required header fails, is logged FAILED, and keeps the old data', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bfphat-'));
    try {
        const dbPath = await makeDb(dir);
        const good = path.join(dir, 'SanLuongChiTiet_20102026.xlsx');
        writeXlsx(good, [line('A1')]);
        const service = new BfPhatImportService({ dbPath });
        await service.importFile(good);

        writeXlsx(good, [['x']], ['LADING_CODE']);
        const bad = await service.importFile(good);
        assert.equal(bad.status, 'FAILED');
        assert.match(bad.error, /thiếu cột/);
        assert.equal((await query(dbPath, 'SELECT COUNT(*) AS n FROM fact_bf_phat'))[0].n, 1);
        assert.equal((await query(dbPath, "SELECT COUNT(*) AS n FROM import_log WHERE status = 'FAILED'"))[0].n, 1);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('importFolder skips loaded days and picks the newest re-export per day', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bfphat-'));
    try {
        const dbPath = await makeDb(dir);
        const plain = path.join(dir, 'SanLuongChiTiet_01042026.xlsx');
        const reexport = path.join(dir, 'SanLuongChiTiet_01042026_001.xlsx');
        writeXlsx(plain, [line('P1', { STATUS_DATE: '20260401' })]);
        writeXlsx(reexport, [line('R1', { STATUS_DATE: '20260401' }), line('R2', { STATUS_DATE: '20260401' })]);
        fs.utimesSync(plain, new Date(2026, 3, 2, 4), new Date(2026, 3, 2, 4));
        fs.utimesSync(reexport, new Date(2026, 3, 2, 9), new Date(2026, 3, 2, 9));
        assert.equal(pickDailyFiles(dir)[0].name, 'SanLuongChiTiet_01042026_001.xlsx');

        const service = new BfPhatImportService({ dbPath });
        const first = await service.importFolder(dir);
        assert.equal(first[0].rows, 2);
        const again = await service.importFolder(dir);
        assert.equal(again[0].status, 'SKIPPED');
        const forced = await service.importFolder(dir, { force: true });
        assert.equal(forced[0].status, 'SUCCESS');
        assert.equal((await query(dbPath, 'SELECT COUNT(*) AS n FROM fact_bf_phat'))[0].n, 2);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
