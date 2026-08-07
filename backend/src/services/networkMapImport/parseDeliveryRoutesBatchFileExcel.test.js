'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const xlsx = require('xlsx');

const {
    parseDeliveryRoutesBatchFileWorkbook,
    parseFilenamePeriod,
    findDataSheet,
    REQUIRED_HEADERS,
} = require('./parseDeliveryRoutesBatchFileExcel');

const RAW_HEADER = [
    'LADING_CODE', 'Mã Tỉnh', 'Mã huyện', 'Mã bưu cục', 'POSTMAN_CODE', 'ROUTE_PO_CODE', 'STATUS_CODE',
    'TYPE_CODE_PAYROLL', 'TYPE_NAME_PAYROLL', 'SERVICE_NAME_PAYROLL', 'REGION_CODE', 'KG', 'AREA_CODE',
    'SERVICE_CODE', 'ITEM_TYPE_CODE', 'STATUS_DATE', 'QUANTITY', 'SERVICE_PRO', 'MABC_CN', 'MABC_PHAT',
    'SO_TIEN_THU_HO', 'CUSTOMER_CODE', 'LAT', 'LON', 'STATUS_TIME', 'GTGT', 'Xác nhận đến BCP', 'Mã lô',
    'Thời gian nhập phát',
];

function buildRow(overrides = {}) {
    const row = new Array(29).fill(null);
    row[0] = 'CN0001';
    row[4] = '53A121';
    row[5] = '533140145';
    row[9] = 'C-Bưu kiện';
    row[15] = 20260601;
    row[16] = 1;
    row[19] = '533140';
    row[20] = 100000;
    row[22] = 16.5;
    row[23] = 107.6;
    row[24] = 103200;
    row[28] = '01/06/2026 10:32:00';
    return Object.assign(row, overrides);
}

function buildWorkbook(rows, { header = RAW_HEADER, sheetName = 'Data_Ghep_1782916740832' } = {}) {
    const sheet = xlsx.utils.aoa_to_sheet([header, ...rows]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
    return workbook;
}

/** Builds a workbook with several sheets, each `{ name, header, rows }`. */
function buildMultiSheetWorkbook(sheetSpecs) {
    const workbook = xlsx.utils.book_new();
    sheetSpecs.forEach(({ name, header, rows }) => {
        const sheet = xlsx.utils.aoa_to_sheet([header, ...(rows || [])]);
        xlsx.utils.book_append_sheet(workbook, sheet, name);
    });
    return workbook;
}

test('parseFilenamePeriod reads "thang MM.YYYY" from the real naming convention, ignoring the export-date prefix', () => {
    assert.deepEqual(
        parseFilenamePeriod('2026.07.01 - BatchFile Phat thang 06.2026.xlsb'),
        { month: 6, year: 2026, period: '2026-06' },
    );
    assert.equal(parseFilenamePeriod('random-file.xlsx'), null);
    assert.equal(parseFilenamePeriod(''), null);
    assert.equal(parseFilenamePeriod(null), null);
});

test('findDataSheet finds the data sheet by header CONTENT, regardless of its name — reproduces the PO Gate 4 recheck finding (2026-08-06)', () => {
    // The May BatchFile that failed used sheet "Data_Tong_Hop" instead of the
    // June file's "Data_Ghep_<suffix>" naming — neither name should matter.
    const wb = buildMultiSheetWorkbook([
        { name: 'Data_Tong_Hop', header: RAW_HEADER, rows: [buildRow()] },
    ]);
    const found = findDataSheet(wb);
    assert.equal(found.sheetName, 'Data_Tong_Hop');
    assert.equal(found.rows.length, 2, 'header + 1 data row');
});

test('findDataSheet skips a leading non-data sheet (e.g. a cover/summary tab) and finds the real data sheet by its headers', () => {
    const wb = buildMultiSheetWorkbook([
        { name: 'Sheet1', header: ['Ghi chú', 'Không liên quan'], rows: [['abc', 'def']] },
        { name: 'Data_Tong_Hop', header: RAW_HEADER, rows: [buildRow()] },
    ]);
    const found = findDataSheet(wb);
    assert.equal(found.sheetName, 'Data_Tong_Hop');
});

test('findDataSheet throws a clear error naming every sheet and its specific missing headers — never a silent 0-row result', () => {
    const wb = buildMultiSheetWorkbook([
        { name: 'Sheet1', header: ['Ghi chú'], rows: [] },
        { name: 'Sheet2', header: RAW_HEADER.filter((h) => h !== 'ROUTE_PO_CODE'), rows: [] },
    ]);
    assert.throws(() => findDataSheet(wb), (err) => {
        assert.match(err.message, /Sheet1/);
        assert.match(err.message, /Sheet2/);
        assert.match(err.message, /ROUTE_PO_CODE/);
        return true;
    });
});

test('a workbook shaped like the failing May BatchFile (single "Data_Tong_Hop" sheet) parses successfully end-to-end, not 0/0/0/0/0', () => {
    const mayRow = (overrides) => buildRow({ 15: 20260515, 28: '15/05/2026 10:32:00', ...overrides });
    const wb = buildMultiSheetWorkbook([
        { name: 'Data_Tong_Hop', header: RAW_HEADER, rows: [mayRow(), mayRow({ 0: 'CN0002' })] },
    ]);
    const { records, stats, declaredPeriod, actualPeriodMonths, periodWarning } = parseDeliveryRoutesBatchFileWorkbook(
        wb,
        '2026.06.01 - BatchFile Phat thang 05.2026.xlsb',
    );
    assert.equal(stats.kept_points, 2, 'must not silently yield 0 rows just because the sheet is not named Data_Ghep*');
    assert.equal(records.length, 2);
    assert.equal(declaredPeriod, '2026-05');
    assert.deepEqual(actualPeriodMonths, ['2026-05']);
    assert.equal(periodWarning, null, 'declared (May, from filename) and actual (May, from content) periods match');
});

test('parses the exact real 29-column header with zero reformatting required, mapping by header name', () => {
    const { records, stats, declaredPeriod, actualPeriodMonths, periodWarning } = parseDeliveryRoutesBatchFileWorkbook(
        buildWorkbook([buildRow()]),
        '2026.07.01 - BatchFile Phat thang 06.2026.xlsb',
    );

    assert.equal(stats.kept_points, 1);
    assert.equal(records[0].ma_buu_gui, 'CN0001');
    assert.equal(records[0].ngay_phat, '2026-06-01');
    assert.equal(records[0].ma_bcvh, '533140');
    assert.equal(records[0].postman_code, '53A121');
    assert.equal(records[0].route_po_code, '533140145');
    assert.equal(records[0].lat, 16.5);
    assert.equal(records[0].lon, 107.6);
    assert.equal(records[0].status_time, '10:32:00');
    assert.equal(records[0].loai_dich_vu, 'C-Bưu kiện');
    assert.equal(records[0].tien_thu_ho, 100000);
    assert.equal(records[0].thoi_gian_nhap_phat, '2026-06-01 10:32:00');
    assert.equal('bien_so' in records[0], false, '"Biển số" must never appear in the parsed record — no source column');

    assert.equal(declaredPeriod, '2026-06');
    assert.deepEqual(actualPeriodMonths, ['2026-06']);
    assert.equal(periodWarning, null);
});

test('column order does not matter — resolves by header NAME, not position (postal system could reorder columns)', () => {
    // Swap LADING_CODE and POSTMAN_CODE columns/positions entirely.
    const reorderedHeader = [...RAW_HEADER];
    [reorderedHeader[0], reorderedHeader[4]] = [reorderedHeader[4], reorderedHeader[0]];
    const row = buildRow();
    [row[0], row[4]] = [row[4], row[0]];

    const { records } = parseDeliveryRoutesBatchFileWorkbook(buildWorkbook([row], { header: reorderedHeader }), 'x.xlsb');
    // Values were swapped in lockstep with the header labels, so each value
    // still sits under its correct header name — the parser must resolve
    // the same correct output as the unswapped case, proving it reads by
    // name rather than by fixed position.
    assert.equal(records[0].ma_buu_gui, 'CN0001', 'LADING_CODE is now at index 4, still correctly resolved by name');
    assert.equal(records[0].postman_code, '53A121', 'POSTMAN_CODE is now at index 0, still correctly resolved by name');
});

test('the 18 columns not used by any current feature are accepted (present) but never read into the record', () => {
    const row = buildRow();
    const { records } = parseDeliveryRoutesBatchFileWorkbook(buildWorkbook([row]), 'x.xlsb');
    const keys = Object.keys(records[0]);
    ['Mã Tỉnh', 'Mã huyện', 'Mã bưu cục', 'STATUS_CODE', 'TYPE_CODE_PAYROLL', 'TYPE_NAME_PAYROLL', 'REGION_CODE', 'KG',
        'AREA_CODE', 'SERVICE_CODE', 'ITEM_TYPE_CODE', 'SERVICE_PRO', 'MABC_CN', 'CUSTOMER_CODE', 'GTGT',
        'Xác nhận đến BCP', 'Mã lô'].forEach((unused) => {
        assert.ok(!keys.includes(unused), `${unused} must not be persisted`);
    });
});

test('throws a clear, named error (never a silent mis-map) when a required header is missing', () => {
    const badHeader = RAW_HEADER.filter((h) => h !== 'ROUTE_PO_CODE');
    const row = buildRow().filter((_, i) => RAW_HEADER[i] !== 'ROUTE_PO_CODE');
    assert.throws(
        () => parseDeliveryRoutesBatchFileWorkbook(buildWorkbook([row], { header: badHeader }), 'x.xlsb'),
        /ROUTE_PO_CODE/,
    );
});

test('excludes QUANTITY === -1 and invalid/zero-coordinate rows, same business rules as the original one-time seed parser', () => {
    const rows = [
        buildRow({ 16: -1 }),
        buildRow({ 22: 0, 23: 0 }),
        buildRow(),
    ];
    const { records, stats } = parseDeliveryRoutesBatchFileWorkbook(buildWorkbook(rows), 'x.xlsb');
    assert.equal(records.length, 1);
    assert.equal(stats.excluded_quantity_minus_1, 1);
    assert.equal(stats.excluded_invalid_coordinates, 1);
});

test('flags (does not silently drop) within-file duplicate (LADING_CODE, STATUS_DATE, ROUTE_PO_CODE) rows', () => {
    const rows = [buildRow(), buildRow()];
    const { records } = parseDeliveryRoutesBatchFileWorkbook(buildWorkbook(rows), 'x.xlsb');
    assert.equal(records.length, 2, 'both rows are still present in the output — classify() decides, not the parser');
    assert.equal(records[0].is_duplicate_in_file, false);
    assert.equal(records[1].is_duplicate_in_file, true);
});

test('period warning: filename period vs. content period mismatch is flagged, not blocked', () => {
    const { periodWarning } = parseDeliveryRoutesBatchFileWorkbook(
        buildWorkbook([buildRow()]), // content is June
        '2026.08.01 - BatchFile Phat thang 07.2026.xlsb', // filename declares July
    );
    assert.match(periodWarning, /không khớp/i);
});

test('period warning: a file spanning multiple months is flagged, not blocked', () => {
    const rows = [buildRow(), buildRow({ 0: 'CN0002', 15: 20260701 })];
    const { periodWarning, actualPeriodMonths } = parseDeliveryRoutesBatchFileWorkbook(
        buildWorkbook(rows),
        '2026.07.01 - BatchFile Phat thang 06.2026.xlsb',
    );
    assert.deepEqual(actualPeriodMonths, ['2026-06', '2026-07']);
    assert.match(periodWarning, /nhiều kỳ/i);
});

test('period warning: no warning when the filename cannot be parsed and content matches nothing to compare — still surfaces a warning rather than silently assuming correctness', () => {
    const { periodWarning, declaredPeriod } = parseDeliveryRoutesBatchFileWorkbook(
        buildWorkbook([buildRow()]),
        'unrelated-filename.xlsb',
    );
    assert.equal(declaredPeriod, null);
    assert.match(periodWarning, /Không đọc được kỳ dữ liệu/);
});

test('required headers list matches exactly what this parser reads (documentation/consistency guard)', () => {
    assert.deepEqual(
        [...REQUIRED_HEADERS].sort(),
        ['LADING_CODE', 'LAT', 'LON', 'MABC_PHAT', 'POSTMAN_CODE', 'QUANTITY', 'ROUTE_PO_CODE',
            'SERVICE_NAME_PAYROLL', 'SO_TIEN_THU_HO', 'STATUS_DATE', 'STATUS_TIME', 'Thời gian nhập phát'].sort(),
    );
});

// PO Gate 4 mandatory test: parse the real, unmodified monthly BatchFile
// and confirm the exact known-good baseline (143,475 kept rows) still
// reproduces via this new header-name-based parser. Read-only — the source
// file is never written to.
test('parses the REAL Data QLML BatchFile end-to-end and reproduces the known 143,475-row baseline', { timeout: 60000 }, () => {
    const realFilePath = path.resolve(__dirname, '../../../../Data QLML/2026.07.01 - BatchFile Phat thang 06.2026.xlsb');
    if (!fs.existsSync(realFilePath)) {
        // Environment without Data QLML checked out — skip rather than fail,
        // this is a real-file regression check, not a unit-test dependency.
        return;
    }

    const workbook = xlsx.readFile(realFilePath);
    const { records, stats, declaredPeriod, actualPeriodMonths, periodWarning } = parseDeliveryRoutesBatchFileWorkbook(
        workbook,
        path.basename(realFilePath),
    );

    // Unlike the retired one-time seed parser (which silently dropped
    // within-file duplicates), this parser flags them via
    // `is_duplicate_in_file` and leaves classify()/apply() — deliberately
    // left unchanged per PO decision §6 — to skip them at Confirm time. The
    // *effective* persisted count (non-duplicate rows) must still reproduce
    // the exact known-good baseline of 143,475.
    const nonDuplicateCount = records.filter((r) => !r.is_duplicate_in_file).length;
    assert.equal(nonDuplicateCount, 143475, 'non-duplicate rows must reproduce the exact known-good baseline');
    assert.equal(stats.kept_points, records.length);
    assert.equal(declaredPeriod, '2026-06');
    assert.deepEqual(actualPeriodMonths, ['2026-06']);
    assert.equal(periodWarning, null, 'the real June file must not trigger a period warning');
    assert.equal(records.every((r) => !('bien_so' in r)), true);
});
