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
    EXPECTED_REPORTING_UNITS,
} = require('./src/services/f41TctExcelParser');

test('frozen F4.1 TCT mapping contains 38 positional columns', () => {
    assert.equal(F41_TCT_DB_COLUMNS.length, 38);
    assert.equal(EXPECTED_COLUMN_COUNT, 38);
    assert.equal(EXPECTED_REPORTING_UNITS, 46);
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

test('read-only reconciliation of the real TCT source file persists 46 reporting units and excludes grand total', () => {
    const filePath = path.resolve(__dirname, '../Data DKCL/F4.1/Processed/TCT/F4.1-2026.08.01.xlsx');
    const result = parseF41TctExcel(fs.readFileSync(filePath), path.basename(filePath));

    assert.equal(result.ngayDoKiem, '2026-08-01');
    assert.equal(result.totalParsed, 46);
    assert.equal(result.parsedData.length, 46);
    assert.equal(result.parsedData[0].ma_don_vi, '01');
    assert.equal(result.parsedData[0].ten_don_vi, 'Tổng công ty EMS');
    assert.equal(result.parsedData.some((row) => row.ma_don_vi === null || row.ten_don_vi === null), false);
    assert.equal(result.parsedData.some((row) => row.stt === 1), false);

    const hue = result.parsedData.find((row) => row.ma_don_vi === '53');
    assert.equal(hue.sl_ptc_nop_tien_ch, 4684);
    assert.equal(hue.sl_ptc_8h_co_tms, 2863);
    assert.equal(hue.tl_ptc_8h_co_tms, '61.12%');
    for (const column of F41_TCT_RATE_COLUMNS) {
        if (hue[column] !== null) assert.match(hue[column], /%$/);
        assert.equal(typeof hue[column], 'string');
    }
});
