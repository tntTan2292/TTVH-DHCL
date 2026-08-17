'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const xlsx = require('xlsx');

const {
    extractF41DateFromFilename,
    parseF41HueExcel,
    F41_HUE_COLUMN_MAPPING,
    EXPECTED_COLUMN_COUNT,
} = require('./src/services/f41HueExcelParser');

const HEADERS = Object.keys(F41_HUE_COLUMN_MAPPING);

function buildWorkbook(headers, rows) {
    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Worksheet');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

test('extracts F4.1 analysis date from filename only', () => {
    assert.equal(extractF41DateFromFilename('F4.1-2026.08.01.xlsx'), '2026-08-01');
    assert.throws(() => extractF41DateFromFilename('F1.3-2026.08.01.xlsx'), /Invalid F4\.1 filename/);
    assert.throws(() => extractF41DateFromFilename('F4.1-2026-08-01.xlsx'), /Invalid F4\.1 filename/);
});

test('frozen F4.1 HUE mapping contains 42 persisted source columns', () => {
    assert.equal(HEADERS.length, 42);
    assert.equal(EXPECTED_COLUMN_COUNT, 42);
    assert.equal(F41_HUE_COLUMN_MAPPING['Số hiệu bưu gửi'], 'ma_bg');
    assert.equal(F41_HUE_COLUMN_MAPPING['Đánh giá (thời gian Có TMS PTC 8 giờ)'], 'danh_gia_co_tms_ptc_8h');
});

test('parses a valid 42-column HUE workbook and injects filename date', () => {
    const headers = [...HEADERS];
    const row = headers.map((header) => {
        if (header === 'STT') return 1;
        if (header === 'Số hiệu bưu gửi') return 'BG001';
        if (header === 'Mã BC phát') return '533140';
        if (header === 'Tên BC phát') return 'BCVH Thuận Hóa';
        if (header === 'Đánh giá (thời gian Có TMS PTC 8 giờ)') return 'Đạt';
        if (header === 'Thời gian có TMS thực hiện PTC') return '46:7';
        return null;
    });
    const result = parseF41HueExcel(buildWorkbook(headers, [row]), 'F4.1-2026.08.01.xlsx');

    assert.equal(result.ngayDoKiem, '2026-08-01');
    assert.equal(result.totalParsed, 1);
    assert.equal(result.parsedData[0].ngay_do_kiem, '2026-08-01');
    assert.equal(result.parsedData[0].ma_bg, 'BG001');
    assert.equal(result.parsedData[0].ma_bc_phat, '533140');
    assert.equal(result.parsedData[0].danh_gia_co_tms_ptc_8h, 'Đạt');
    assert.equal(result.parsedData[0].thoi_gian_co_tms_thuc_hien_ptc, '46:7');
});

test('rejects missing required HUE shipment column', () => {
    const headers = [...HEADERS.filter((header) => header !== 'Số hiệu bưu gửi')];
    assert.throws(
        () => parseF41HueExcel(buildWorkbook(headers, [['x']]), 'F4.1-2026.08.01.xlsx'),
        /Required column 'Số hiệu bưu gửi' not found/,
    );
});

test('read-only reconciliation of the real HUE source file matches the locked baseline', () => {
    const filePath = path.resolve(__dirname, '../Data DKCL/F4.1/Incoming/HUE/F4.1-2026.08.01.xlsx');
    const buffer = fs.readFileSync(filePath);
    const result = parseF41HueExcel(buffer, path.basename(filePath));
    const counts = result.parsedData.reduce((acc, row) => {
        const value = row.danh_gia_co_tms_ptc_8h;
        if (value === 'Đạt') acc.passed++;
        else if (value === 'Không đạt') acc.failed++;
        else if (value === null || String(value).trim() === '') acc.blank++;
        acc.total++;
        return acc;
    }, { total: 0, passed: 0, failed: 0, blank: 0 });

    assert.deepEqual(counts, { total: 4695, passed: 2863, failed: 1581, blank: 251 });
    assert.equal(((counts.passed / counts.total) * 100).toFixed(2), '60.98');
});
