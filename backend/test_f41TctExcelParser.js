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

// AB-AUTH-16: the count columns the grand-total row must keep reconciling against. Removing a unit
// row therefore also subtracts that unit's counts from the grand total -- which is exactly what a
// real day where the unit did not report looks like, and keeps the still-enforced
// assertGrandTotalReconciles() check honest rather than accidentally masking the population check.
const TCT_COUNT_COLUMN_INDEXES = [10, 11, 13, 15, 17, 19, 21, 22, 23, 25, 27, 29, 30, 31, 32, 33, 34, 36];
const GRAND_TOTAL_ROW = 3;
const FIRST_UNIT_ROW = 4;

function removeUnitRow(rows, code) {
    const index = rows.findIndex((row, rowIndex) => rowIndex >= FIRST_UNIT_ROW && String(row[1] ?? '').trim() === code);
    assert.ok(index >= 0, `fixture must contain unit ${code} before it can be removed`);
    const removed = rows[index];
    for (const column of TCT_COUNT_COLUMN_INDEXES) {
        rows[GRAND_TOTAL_ROW][column] = Number(rows[GRAND_TOTAL_ROW][column] || 0) - Number(removed[column] || 0);
    }
    rows.splice(index, 1);
    return removed;
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

// ---------------------------------------------------------------------------
// AB-AUTH-16 (PO rule change, LEVEL 2): F4.1 completeness is "the required set is all present",
// not "the totals match frozen numbers". Non-fixed units -- khách vãng lai, đơn vị không cố định --
// legitimately come and go, and their absence is normal data rather than a broken workbook.
// ---------------------------------------------------------------------------

test('AB-AUTH-16: a workbook missing a NON-required unit still parses (row/exclusion totals no longer gate)', () => {
    const buffer = mutateRealWorkbook((rows) => removeUnitRow(rows, EXCLUDED_F41_TCT_CODES[0]));
    const result = parseF41TctExcel(buffer, 'F4.1-2026.08.01.xlsx');

    assert.equal(result.parsedData.length, EXPECTED_ACCEPTED_REPORTING_UNITS, 'every ranked province is still present');
    assert.equal(result.rawReportingRows, EXPECTED_RAW_REPORTING_UNITS - 1, 'the raw total is simply reported, not enforced');
    assert.equal(result.excludedRowsCount, EXCLUDED_F41_TCT_CODES.length - 1);
    assert.ok(
        !result.excludedRows.map((row) => row.ma_don_vi).includes(EXCLUDED_F41_TCT_CODES[0]),
        'the absent optional unit is genuinely gone from the workbook'
    );
});

test('AB-AUTH-16: a workbook missing SEVERAL non-required units still parses', () => {
    const dropped = EXCLUDED_F41_TCT_CODES.slice(0, 4);
    const buffer = mutateRealWorkbook((rows) => {
        for (const code of dropped) removeUnitRow(rows, code);
    });
    const result = parseF41TctExcel(buffer, 'F4.1-2026.08.01.xlsx');

    assert.equal(result.parsedData.length, EXPECTED_ACCEPTED_REPORTING_UNITS);
    assert.equal(result.rawReportingRows, EXPECTED_RAW_REPORTING_UNITS - dropped.length);
});

test('AB-AUTH-16: a workbook missing ANY single required province still FAILS, naming that province', () => {
    for (const missing of ['10', '53', '97']) {
        const buffer = mutateRealWorkbook((rows) => removeUnitRow(rows, missing));
        assert.throws(
            () => parseF41TctExcel(buffer, 'F4.1-2026.08.01.xlsx'),
            (error) => {
                assert.match(error.message, /Missing required national province\/city units/);
                assert.match(error.message, new RegExp(`\\b${missing}\\b`));
                return true;
            },
            `missing ranked province ${missing} must still be rejected`
        );
    }
});

test('AB-AUTH-16: structural checks that were explicitly kept still fire', () => {
    // Grand total deliberately left un-adjusted after dropping a row -> must fail reconciliation,
    // NOT the population check. This proves assertGrandTotalReconciles() is still enforced.
    const brokenTotal = mutateRealWorkbook((rows) => {
        const index = rows.findIndex((row, rowIndex) => rowIndex >= FIRST_UNIT_ROW && String(row[1] ?? '').trim() === EXCLUDED_F41_TCT_CODES[1]);
        rows.splice(index, 1);
    });
    assert.throws(() => parseF41TctExcel(brokenTotal, 'F4.1-2026.08.01.xlsx'), (error) => {
        assert.match(error.message, /Grand-total row does not reconcile/);
        return true;
    });

    // Header identity is still enforced.
    const brokenHeader = mutateRealWorkbook((rows) => { rows[0][1] = 'Không phải Mã tỉnh'; });
    assert.throws(() => parseF41TctExcel(brokenHeader, 'F4.1-2026.08.01.xlsx'), (error) => {
        assert.match(error.message, /Header row 1/);
        return true;
    });

    // The grand-total row's own identity is still enforced.
    const brokenGrandTotal = mutateRealWorkbook((rows) => { rows[GRAND_TOTAL_ROW][1] = '53'; });
    assert.throws(() => parseF41TctExcel(brokenGrandTotal, 'F4.1-2026.08.01.xlsx'), (error) => {
        assert.match(error.message, /grand-total row/i);
        return true;
    });
});
