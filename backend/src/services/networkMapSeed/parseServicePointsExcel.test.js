'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const { parseServicePointsWorkbook, EXPECTED_HEADERS, SHEET_NAME } = require('./parseServicePointsExcel');

function buildWorkbook(rows) {
    const sheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
    return workbook;
}

function baseRows(dataRows) {
    return [
        ['DỮ LIỆU BẢN ĐỒ MẠNG ĐIỂM PHỤC VỤ'],
        ['note'],
        [null],
        EXPECTED_HEADERS,
        ...dataRows,
    ];
}

test('parses a well-formed sheet with no header drift', () => {
    const workbook = buildWorkbook(baseRows([
        [1, '530000', 'Huế', 'Giao dịch', 'Ngôi sao', '8 Đường X', 'Phường Thuận Hóa', 'Hoạt động', 107.59, 16.46, 'BĐ Thuận Hóa'],
    ]));
    const { records, warnings } = parseServicePointsWorkbook(workbook);

    assert.equal(records.length, 1);
    assert.equal(warnings.length, 0);
    assert.deepEqual(records[0], {
        ma_diem: '530000',
        ten_diem: 'Huế',
        loai_diem: 'Giao dịch',
        dia_chi: '8 Đường X',
        phuong_xa: 'Phường Thuận Hóa',
        trang_thai: 'Hoạt động',
        lon: 107.59,
        lat: 16.46,
        don_vi_quan_ly: 'BĐ Thuận Hóa',
    });
});

test('skips rows with missing mã điểm and warns instead of guessing', () => {
    const workbook = buildWorkbook(baseRows([
        [1, null, 'Không có mã', 'Giao dịch', 'Ngôi sao', 'X', 'Y', 'Hoạt động', 107.59, 16.46, 'Z'],
        [2, '530001', 'Có mã', 'Giao dịch', 'Ngôi sao', 'X', 'Y', 'Hoạt động', 107.6, 16.47, 'Z'],
    ]));
    const { records, warnings } = parseServicePointsWorkbook(workbook);

    assert.equal(records.length, 1);
    assert.equal(records[0].ma_diem, '530001');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /missing Mã điểm phục vụ/);
});

test('keeps a record with null coordinates and warns rather than fabricating lat/lon', () => {
    const workbook = buildWorkbook(baseRows([
        [1, '530002', 'Thiếu tọa độ', 'Giao dịch', 'Ngôi sao', 'X', 'Y', 'Hoạt động', null, null, 'Z'],
    ]));
    const { records, warnings } = parseServicePointsWorkbook(workbook);

    assert.equal(records.length, 1);
    assert.equal(records[0].lat, null);
    assert.equal(records[0].lon, null);
    assert.match(warnings[0], /missing\/invalid coordinates/);
});

test('reports a header-mismatch warning when a column drifts, instead of silently mis-mapping', () => {
    const driftedHeaders = [...EXPECTED_HEADERS];
    driftedHeaders[1] = 'Mã điểm (đổi tên)';
    const workbook = buildWorkbook([
        ['title'], ['note'], [null], driftedHeaders,
        [1, '530000', 'Huế', 'Giao dịch', 'Ngôi sao', 'X', 'Y', 'Hoạt động', 107.59, 16.46, 'Z'],
    ]);
    const { warnings } = parseServicePointsWorkbook(workbook);

    assert.ok(warnings.some((w) => w.includes('Column 1 header mismatch')));
});

test('throws a clear error when the expected sheet is absent', () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([['x']]), 'Some other sheet');

    assert.throws(() => parseServicePointsWorkbook(workbook), /Sheet "Dữ liệu bản đồ" not found/);
});
