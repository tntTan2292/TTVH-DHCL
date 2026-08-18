'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f41-pipeline-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F41 = path.join(sandbox, 'F4.1');

const { db, run, get } = require('./src/config/db');
const { executeImport } = require('./src/services/importPipeline');
const { F41_HUE_COLUMN_MAPPING } = require('./src/services/f41HueExcelParser');
const { F41_TCT_DB_COLUMNS } = require('./src/services/f41TctExcelParser');
const { applyF41Phase1Schema } = require('./migrate_f41_phase1_schema');
const { applyF41Phase2Schema } = require('./migrate_f41_phase2_schema');

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function writeWorkbook(filePath, rows) {
    const ws = xlsx.utils.aoa_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Worksheet');
    xlsx.writeFile(wb, filePath);
}

function buildHueFile(filePath) {
    const headers = Object.keys(F41_HUE_COLUMN_MAPPING);
    const row = headers.map((header) => {
        if (header === 'STT') return 1;
        if (header === 'Số hiệu bưu gửi') return 'F41-HUE-001';
        if (header === 'Mã BC phát') return '533140';
        if (header === 'Đánh giá (thời gian Có TMS PTC 8 giờ)') return 'Đạt';
        return null;
    });
    writeWorkbook(filePath, [headers, row]);
}

function buildTctFile(filePath) {
    const rawCodes = [
        '01', '08', '10', '11', '12', '14', '15', '16', '18', '20',
        '22', '24', '25', '27', '29', '30', '33', '34', '36', '38',
        '39', '43', '44', '46', '48', '49', '52', '53', '55', '57',
        '60', '63', '65', '67', '70', '71', '75', '77', '81', '82',
        '84', '87', '88', '89', '90', '97',
    ];
    const header = [
        'TT', 'Mã tỉnh', 'Tên tỉnh', 'Mã huyện', 'Tên huyện', 'Mã BC', 'Tên BC', 'Loại BC', 'Ma KHL', 'Ten KHL',
        'Sản lượng PTC/ Nộp tiền/ CH', 'Sản lượng PTC/ Nộp tiền', 'Tỷ lệ PTC/ Nộp tiền',
        'Đúng thời gian quy định', null, null, null, 'Quá thời gian quy định', null, null, null,
        'Sản lượng chưa đủ thông tin đo kiểm', 'SL loại trừ không đo kiểm', 'SL Chuyển hoàn', 'Tỷ lệ chuyển hoàn',
        'Sản lượng bưu gửi PTC 8 giờ tại bưu cục (XNĐ BD1)', 'Tỷ lệ gửi PTC 8 giờ tại bưu cục ( XNĐ BD1)',
        'Sản lượng bưu gửi PTC 8 giờ tại bưu cục (có quét TMS)', 'Tỷ lệ gửi PTC 8 giờ tại bưu cục (có quét TMS)',
        '≤ 12 giờ', '> 12 giờ ≤ 14 giờ', '> 14 giờ ≤ 16 giờ', '> 16 giờ ≤ 36 giờ', '> 36 giờ',
        'Sản lượng bưu gửi PTC 8 giờ lần đầu tại bưu cục (XNĐ BD1)', 'Tỷ lệ gửi PTC 8 giờ lần đầu tại bưu cục (XNĐ BD1)',
        'Sản lượng bưu gửi PTC 8 giờ lần đầu tại bưu cục (có quét TMS)', 'Tỷ lệ gửi PTC 8 giờ lần đầu tại bưu cục (có quét TMS)',
    ];
    const subHeader = [
        ...Array(13).fill(null),
        'Sản lượng PTC trong thời gian QĐ 12,5 giờ',
        'Tỷ PTC trong thời gian QĐ 12,5 giờ',
        'Sản lượng bưu gửi PTC/Nộp tiền/Chuyển hoàn trong thời gian QĐ giờ 72 giờ',
        'Tỷ lệ bưu gửi PTC/Nộp tiền/Chuyển hoàn trong thời gian QĐ giờ/72 giờ',
        'Sản lượng phát thành công /Nộp tiền>12,5 giờ và chuyển hoàn',
        'Tỷ lệ phát thành công /Nộp tiền>12,5 giờ và chuyển hoàn',
        'Sản lượng phát thành công /Nộp tiền/Chuyển hoàn > 72 giờ',
        'Tỷ lệ phát thành công /Nộp tiền/Chuyển hoàn > 72 giờ',
        ...Array(17).fill(null),
    ];
    const legend = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, null, null, '11=10/9', 12, 13, 14, '15=14/9', 16,
        '17=16/9', 18, '19=18/9', 20, 21, 22, '22/9=23', 24, '24/9=25', 26, '27=26/9',
        28, 29, 30, 31, null, 32, '33=32/9', 34, '35=34/9',
    ];
    const total = [1, null, null, ...Array(35).fill(0)];
    const rows = [header, subHeader, legend, total];
    for (let i = 0; i < rawCodes.length; i += 1) {
        rows.push([
            i + 2,
            rawCodes[i],
            `Unit ${rawCodes[i]}`,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            ...Array(28).fill(0),
        ]);
    }
    writeWorkbook(filePath, rows);
}

test('F4.1 pipeline imports HUE/TCT in isolation, deduplicates retry, and leaves fact_f13 unchanged', async () => {
    try {
        await applyF41Phase1Schema(process.env.QIS_TEST_DB_PATH);
        await applyF41Phase2Schema(process.env.QIS_TEST_DB_PATH);
        await run(`
            CREATE TABLE IF NOT EXISTS fact_f13 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ngay_do_kiem TEXT NOT NULL,
                ma_bg TEXT NOT NULL,
                danh_gia_2026 TEXT,
                UNIQUE(ngay_do_kiem, ma_bg)
            )
        `);
        await run("INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, danh_gia_2026) VALUES ('2026-08-01', 'F13-SENTINEL', 'Đạt')");

        const hueIncoming = path.join(process.env.QIS_TEST_DATA_ROOT_F41, 'Incoming', 'HUE');
        const tctIncoming = path.join(process.env.QIS_TEST_DATA_ROOT_F41, 'Incoming', 'TCT');
        ensureDir(hueIncoming);
        ensureDir(tctIncoming);
        const hueFile = path.join(hueIncoming, 'F4.1-2026.08.01.xlsx');
        const tctFile = path.join(tctIncoming, 'F4.1-2026.08.01.xlsx');
        buildHueFile(hueFile);
        buildTctFile(tctFile);

        const hueResult = await executeImport({ filePath: hueFile, indicator: 'F4.1', lane: 'HUE', source: 'MANUAL' });
        const tctResult = await executeImport({ filePath: tctFile, indicator: 'F4.1', lane: 'TCT', source: 'MANUAL' });

        assert.equal(hueResult.inserted, 1);
        assert.equal(tctResult.inserted, 34);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f41')).n, 1);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f41_national')).n, 34);
        assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f41_national WHERE ma_don_vi IN ('01','08','11','12','14','15','34','49','71','75','77','82')")).n, 0);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f13')).n, 1);

        buildHueFile(hueFile);
        const retry = await executeImport({ filePath: hueFile, indicator: 'F4.1', lane: 'HUE', source: 'MANUAL' });
        assert.equal(retry.requiresConfirmation, true);
        assert.equal(retry.ngay_do_kiem, '2026-08-01');
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f41')).n, 1);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f13')).n, 1);

        const logCounts = await get(`
            SELECT
                SUM(CASE WHEN indicator = 'F4.1' AND source_lane = 'HUE' AND status = 'SUCCESS' THEN 1 ELSE 0 END) AS hue_logs,
                SUM(CASE WHEN indicator = 'F4.1' AND source_lane = 'TCT' AND status = 'SUCCESS' THEN 1 ELSE 0 END) AS tct_logs
            FROM import_log
        `);
        assert.equal(logCounts.hue_logs, 1);
        assert.equal(logCounts.tct_logs, 1);
    } finally {
        await new Promise((resolve) => db.close(() => resolve()));
        fs.rmSync(sandbox, { recursive: true, force: true });
    }
});
