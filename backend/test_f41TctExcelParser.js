'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    parseF41TctExcel,
    F41_TCT_DB_COLUMNS,
    F41_TCT_RATE_COLUMNS,
    EXPECTED_COLUMN_COUNT,
    EXPECTED_RAW_REPORTING_UNITS,
    EXPECTED_ACCEPTED_REPORTING_UNITS,
} = require('./src/services/f41TctExcelParser');

const EXCLUDED_F41_TCT_CODES = ['01', '08', '11', '12', '14', '15', '34', '49', '71', '75', '77', '82'];

test('frozen F4.1 TCT mapping contains 38 positional columns', () => {
    assert.equal(F41_TCT_DB_COLUMNS.length, 38);
    assert.equal(EXPECTED_COLUMN_COUNT, 38);
    assert.equal(EXPECTED_RAW_REPORTING_UNITS, 46);
    assert.equal(EXPECTED_ACCEPTED_REPORTING_UNITS, 34);
    assert.equal(F41_TCT_DB_COLUMNS[1], 'ma_don_vi');
    assert.equal(F41_TCT_DB_COLUMNS[37], 'tl_ptc_8h_lan_dau_co_tms');
    assert.deepEqual(F41_TCT_RATE_COLUMNS, [
        'tl_ptc_nop_tien',
        'tl_dung_12_5h',
        'tl_dung_72h',
        'tl_qua_12_5h',
        'tl_qua_72h',
        'tl_chuyen_hoan',
        'tl_ptc_8h_xnd_bd1',
        'tl_ptc_8h_co_tms',
        'tl_ptc_8h_lan_dau_xnd_bd1',
        'tl_ptc_8h_lan_dau_co_tms',
    ]);
});

test('read-only reconciliation of the real TCT source file accepts the F1.3 34-code national population', () => {
    const filePath = path.resolve(__dirname, '../Data DKCL/F4.1/Processed/TCT/F4.1-2026.08.01.xlsx');
    const result = parseF41TctExcel(fs.readFileSync(filePath), path.basename(filePath));

    assert.equal(result.ngayDoKiem, '2026-08-01');
    assert.equal(result.rawReportingRows, 46);
    assert.equal(result.acceptedRows, 34);
    assert.equal(result.totalParsed, 34);
    assert.equal(result.parsedData.length, 34);
    assert.equal(result.excludedRowsCount, 12);
    assert.deepEqual(result.excludedRows.map((row) => row.ma_don_vi), EXCLUDED_F41_TCT_CODES);
    assert.equal(result.parsedData[0].ma_don_vi, '10');
    assert.equal(result.parsedData[0].ten_don_vi, 'Bưu điện TP Hà Nội');
    assert.equal(result.parsedData.some((row) => row.ma_don_vi === null || row.ten_don_vi === null), false);
    assert.equal(result.parsedData.some((row) => row.stt === 1), false);
    for (const code of EXCLUDED_F41_TCT_CODES) {
        assert.equal(result.parsedData.some((row) => row.ma_don_vi === code), false);
    }

    const hue = result.parsedData.find((row) => row.ma_don_vi === '53');
    assert.equal(hue.sl_ptc_nop_tien_ch, 4684);
    assert.equal(hue.sl_ptc_8h_co_tms, 2863);
    assert.equal(hue.tl_ptc_8h_co_tms, '61.12%');
    for (const column of F41_TCT_RATE_COLUMNS) {
        if (hue[column] !== null) assert.match(hue[column], /%$/);
        assert.equal(typeof hue[column], 'string');
    }
});
