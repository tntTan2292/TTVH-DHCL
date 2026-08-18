'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const xlsx = require('xlsx');

const {
    parseF41TctExcel,
    F41_TCT_DB_COLUMNS,
    F41_TCT_RATE_COLUMNS,
    EXPECTED_COLUMN_COUNT,
    EXPECTED_RAW_REPORTING_UNITS,
    EXPECTED_ACCEPTED_REPORTING_UNITS,
} = require('./src/services/f41TctExcelParser');

const EXCLUDED_F41_TCT_CODES = ['01', '08', '11', '12', '14', '15', '34', '49', '71', '75', '77', '82'];
const REAL_TCT_FILE = path.resolve(__dirname, '../Data DKCL/F4.1/Processed/TCT/F4.1-2026.08.01.xlsx');

function readRealRows() {
    const workbook = xlsx.readFile(REAL_TCT_FILE);
    return xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: null });
}

function buildWorkbook(rows) {
    const worksheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Worksheet');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function mutateRealWorkbook(mutator) {
    const rows = readRealRows().map((row) => [...row]);
    mutator(rows);
    return buildWorkbook(rows);
}

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
    const filePath = REAL_TCT_FILE;
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

test('rejects missing or shifted F4.1 TCT header labels', () => {
    const missingHeader = mutateRealWorkbook((rows) => {
        rows[0][13] = null;
    });
    assert.throws(
        () => parseF41TctExcel(missingHeader, 'F4.1-2026.08.01.xlsx'),
        /Invalid F4\.1 TCT Excel format\. Header row 1 mismatch/
    );

    const shiftedHeader = mutateRealWorkbook((rows) => {
        rows.unshift(Array(38).fill(null));
    });
    assert.throws(
        () => parseF41TctExcel(shiftedHeader, 'F4.1-2026.08.01.xlsx'),
        /Invalid F4\.1 TCT Excel format\. Header row 1 mismatch/
    );
});

test('rejects invalid F4.1 TCT column-number and formula legend row', () => {
    const buffer = mutateRealWorkbook((rows) => {
        rows[2][28] = '28=27/9';
    });
    assert.throws(
        () => parseF41TctExcel(buffer, 'F4.1-2026.08.01.xlsx'),
        /Invalid F4\.1 TCT Excel format\. Column-number\/formula legend row mismatch/
    );
});

test('rejects missing F4.1 TCT grand-total row', () => {
    const buffer = mutateRealWorkbook((rows) => {
        rows[3][1] = '53';
        rows[3][2] = 'Bưu điện Tỉnh Thừa Thiên Huế';
    });
    assert.throws(
        () => parseF41TctExcel(buffer, 'F4.1-2026.08.01.xlsx'),
        /Invalid F4\.1 TCT Excel format\. Row 4 must be the grand-total row/
    );
});

test('rejects non-reconciling F4.1 TCT grand-total numeric counts', () => {
    const buffer = mutateRealWorkbook((rows) => {
        rows[3][27] = Number(rows[3][27]) + 1;
    });
    assert.throws(
        () => parseF41TctExcel(buffer, 'F4.1-2026.08.01.xlsx'),
        /Invalid F4\.1 TCT Excel format\. Grand-total row does not reconcile/
    );
});
