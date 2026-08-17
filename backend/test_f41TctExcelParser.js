'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    parseF41TctExcel,
    F41_TCT_DB_COLUMNS,
    EXPECTED_COLUMN_COUNT,
    EXPECTED_REPORTING_UNITS,
} = require('./src/services/f41TctExcelParser');

test('frozen F4.1 TCT mapping contains 38 positional columns', () => {
    assert.equal(F41_TCT_DB_COLUMNS.length, 38);
    assert.equal(EXPECTED_COLUMN_COUNT, 38);
    assert.equal(EXPECTED_REPORTING_UNITS, 46);
    assert.equal(F41_TCT_DB_COLUMNS[1], 'ma_don_vi');
    assert.equal(F41_TCT_DB_COLUMNS[37], 'tl_ptc_8h_lan_dau_co_tms');
});

test('read-only reconciliation of the real TCT source file persists 46 reporting units and excludes grand total', () => {
    const filePath = path.resolve(__dirname, '../Data DKCL/F4.1/Incoming/TCT/F4.1-2026.08.01.xlsx');
    const result = parseF41TctExcel(fs.readFileSync(filePath), path.basename(filePath));

    assert.equal(result.ngayDoKiem, '2026-08-01');
    assert.equal(result.totalParsed, 46);
    assert.equal(result.parsedData.length, 46);
    assert.equal(result.parsedData[0].ma_don_vi, '01');
    assert.equal(result.parsedData[0].ten_don_vi, 'Tổng công ty EMS');
    assert.equal(result.parsedData.some((row) => row.ma_don_vi === null || row.ten_don_vi === null), false);
    assert.equal(result.parsedData.some((row) => row.stt === 1), false);
});
