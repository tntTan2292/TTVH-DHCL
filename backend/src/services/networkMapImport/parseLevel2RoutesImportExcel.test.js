'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const { parseLevel2RoutesImportWorkbook, groupStopRowsByRoute, EXPECTED_HEADERS, SHEET_NAME } = require('./parseLevel2RoutesImportExcel');

function buildWorkbook(rows) {
    const sheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
    return workbook;
}

test('parses stop rows and groups by Route ID', () => {
    const wb = buildWorkbook([
        EXPECTED_HEADERS,
        [1, 'Tuyến A', 36, 7, 'X', 1, '530000', 'Huế', '05:00', '00:05', '05:05', null, ''],
        [1, 'Tuyến A', 36, 7, 'X', 2, '530100', 'KTC1', '05:30', '00:05', '05:35', 18, ''],
    ]);
    const { stopRows, warnings } = parseLevel2RoutesImportWorkbook(wb);
    assert.equal(warnings.length, 0);
    assert.equal(stopRows.length, 2);

    const groups = groupStopRowsByRoute(stopRows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].route_id, '1');
    assert.equal(groups[0].isNew, false);
    assert.equal(groups[0].stops.length, 2);
});

test('blank Route ID groups as a new route, keyed by Tên ĐT', () => {
    const wb = buildWorkbook([
        EXPECTED_HEADERS,
        [null, 'Tuyến mới', 10, 7, 'X', 1, '530000', 'Huế', null, null, null, null, ''],
        [null, 'Tuyến mới', 10, 7, 'X', 2, '530100', 'KTC1', null, null, null, 5, ''],
    ]);
    const { stopRows } = parseLevel2RoutesImportWorkbook(wb);
    const groups = groupStopRowsByRoute(stopRows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].isNew, true);
    assert.equal(groups[0].route_id, null);
    assert.equal(groups[0].stops.length, 2);
});

test('two different Route IDs never merge into one group', () => {
    const wb = buildWorkbook([
        EXPECTED_HEADERS,
        [1, 'Tuyến A', 36, 7, 'X', 1, '530000', 'Huế', null, null, null, null, ''],
        [2, 'Tuyến B', 8, 7, 'X', 1, '530100', 'KTC1', null, null, null, null, ''],
    ]);
    const { stopRows } = parseLevel2RoutesImportWorkbook(wb);
    const groups = groupStopRowsByRoute(stopRows);
    assert.equal(groups.length, 2);
});
