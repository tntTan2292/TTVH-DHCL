'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const { parseDeliveryRoutesImportWorkbook, EXPECTED_HEADERS, SHEET_NAME } = require('./parseDeliveryRoutesImportExcel');

function buildWorkbook(rows) {
    const sheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
    return workbook;
}

test('parses a valid row and derives ca_phat/ngay_nhap_phat from Thời gian nhập phát', () => {
    const wb = buildWorkbook([
        EXPECTED_HEADERS,
        ['EE000000000VN', '2026-06-01', '533140', '53A121', '533140145', null, 16.5, 107.6, '10:00:00', 'C-Bưu kiện', 100000, '01/06/2026 09:15:00'],
    ]);
    const { records, warnings } = parseDeliveryRoutesImportWorkbook(wb);
    assert.equal(warnings.length, 0);
    assert.equal(records.length, 1);
    assert.equal(records[0].ma_buu_gui, 'EE000000000VN');
    assert.equal(records[0].ngay_phat, '2026-06-01');
    assert.equal(records[0].route_po_code, '533140145');
    assert.equal(records[0].ca_phat, 'Ca sáng');
    assert.equal(records[0].ngay_nhap_phat, '2026-06-01');
    assert.equal(records[0].is_duplicate_in_file, false);
});

test('flags the second occurrence of (ma_buu_gui, ngay_phat, route_po_code) as duplicate-in-file', () => {
    const row = ['EE111111111VN', '2026-06-01', '533140', '53A121', '533140145', null, 16.5, 107.6, '10:00:00', 'C', 0, null];
    const wb = buildWorkbook([EXPECTED_HEADERS, row, row]);
    const { records } = parseDeliveryRoutesImportWorkbook(wb);
    assert.equal(records[0].is_duplicate_in_file, false);
    assert.equal(records[1].is_duplicate_in_file, true);
});
