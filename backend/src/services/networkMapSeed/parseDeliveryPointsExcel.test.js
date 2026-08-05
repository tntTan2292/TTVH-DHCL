'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const { parseDeliveryPointsWorkbook, SHEET_NAME, COLUMNS } = require('./parseDeliveryPointsExcel');

function buildRow(overrides = {}) {
    const row = new Array(25).fill(null);
    row[COLUMNS.LADING_CODE] = 'CN0001';
    row[COLUMNS.MABC_PHAT] = 533140;
    row[COLUMNS.POSTMAN_CODE] = '53A121';
    row[COLUMNS.ROUTE_PO_CODE] = 533140145;
    row[COLUMNS.STATUS_DATE] = 20260601;
    row[COLUMNS.QUANTITY] = 1;
    row[COLUMNS.SERVICE_NAME_PAYROLL] = 'C-Bưu kiện';
    row[COLUMNS.SO_TIEN_THU_HO] = 100000;
    row[COLUMNS.LAT] = 16.5;
    row[COLUMNS.LON] = 107.6;
    row[COLUMNS.STATUS_TIME] = 103200;
    return Object.assign(row, overrides);
}

function buildWorkbook(rows) {
    const header = new Array(25).fill('');
    header[0] = 'LADING_CODE';
    const sheet = xlsx.utils.aoa_to_sheet([header, ...rows]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
    return workbook;
}

test('keeps a valid row and formats date/time deterministically', () => {
    const { records, stats } = parseDeliveryPointsWorkbook(buildWorkbook([buildRow()]));

    assert.equal(stats.kept_points, 1);
    assert.equal(records[0].ngay_phat, '2026-06-01');
    assert.equal(records[0].status_time, '10:32:00');
    assert.equal(records[0].ma_bcvh, '533140');
    assert.equal(records[0].postman_code, '53A121');
    assert.equal(records[0].route_po_code, '533140145');
});

test('excludes QUANTITY === -1 rows and counts them separately', () => {
    const row = buildRow({ [COLUMNS.QUANTITY]: -1 });
    const { records, stats } = parseDeliveryPointsWorkbook(buildWorkbook([row]));

    assert.equal(records.length, 0);
    assert.equal(stats.excluded_quantity_minus_1, 1);
});

test('excludes rows with missing or zero coordinates', () => {
    const missing = buildRow({ [COLUMNS.LAT]: null });
    const zero = buildRow({ [COLUMNS.LAT]: 0, [COLUMNS.LON]: 0 });
    const { records, stats } = parseDeliveryPointsWorkbook(buildWorkbook([missing, zero]));

    assert.equal(records.length, 0);
    assert.equal(stats.excluded_invalid_coordinates, 2);
});

test('excludes duplicate (LADING_CODE, STATUS_DATE, ROUTE_PO_CODE) rows, keeping the first', () => {
    const first = buildRow();
    const duplicate = buildRow();
    const { records, stats } = parseDeliveryPointsWorkbook(buildWorkbook([first, duplicate]));

    assert.equal(records.length, 1);
    assert.equal(stats.excluded_duplicate_lading_date_route, 1);
});

test('never bulk-loads: stats.total_rows always accounts for every row seen', () => {
    const rows = [buildRow({ [COLUMNS.QUANTITY]: -1 }), buildRow({ [COLUMNS.LAT]: null }), buildRow()];
    const { stats } = parseDeliveryPointsWorkbook(buildWorkbook(rows));

    assert.equal(stats.total_rows, 3);
    assert.equal(
        stats.kept_points + stats.excluded_quantity_minus_1 + stats.excluded_invalid_coordinates + stats.excluded_duplicate_lading_date_route,
        stats.total_rows,
    );
});
