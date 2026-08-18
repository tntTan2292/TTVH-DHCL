'use strict';

const xlsx = require('xlsx');
const { extractF41DateFromFilename } = require('./f41HueExcelParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');

const F41_TCT_DB_COLUMNS = [
    'stt',
    'ma_don_vi',
    'ten_don_vi',
    'ma_huyen',
    'ten_huyen',
    'ma_bc',
    'ten_bc',
    'loai_bc',
    'ma_khl',
    'ten_khl',
    'sl_ptc_nop_tien_ch',
    'sl_ptc_nop_tien',
    'tl_ptc_nop_tien',
    'sl_dung_12_5h',
    'tl_dung_12_5h',
    'sl_dung_72h',
    'tl_dung_72h',
    'sl_qua_12_5h',
    'tl_qua_12_5h',
    'sl_qua_72h',
    'tl_qua_72h',
    'sl_chua_du_thong_tin',
    'sl_loai_tru',
    'sl_chuyen_hoan',
    'tl_chuyen_hoan',
    'sl_ptc_8h_xnd_bd1',
    'tl_ptc_8h_xnd_bd1',
    'sl_ptc_8h_co_tms',
    'tl_ptc_8h_co_tms',
    'sl_bucket_12h',
    'sl_bucket_14h',
    'sl_bucket_16h',
    'sl_bucket_36h',
    'sl_bucket_36h_plus',
    'sl_ptc_8h_lan_dau_xnd_bd1',
    'tl_ptc_8h_lan_dau_xnd_bd1',
    'sl_ptc_8h_lan_dau_co_tms',
    'tl_ptc_8h_lan_dau_co_tms',
];

const F41_TCT_RATE_COLUMNS = F41_TCT_DB_COLUMNS.filter((column) => column.startsWith('tl_'));
const EXPECTED_COLUMN_COUNT = 38;
const EXPECTED_RAW_REPORTING_UNITS = 46;
const EXPECTED_ACCEPTED_REPORTING_UNITS = NATIONAL_RANKED_PROVINCE_CODES.length;
const FIRST_REPORTING_ROW_INDEX = 4;
const LEGEND_ROW_INDEX = 2;
const GRAND_TOTAL_ROW_INDEX = 3;
const COUNT_COLUMN_INDEXES = Object.freeze([10, 11, 13, 15, 17, 19, 21, 22, 23, 25, 27, 29, 30, 31, 32, 33, 34, 36]);

const REQUIRED_HEADER_CELLS = Object.freeze([
    [0, 'TT'],
    [1, 'Mã tỉnh'],
    [2, 'Tên tỉnh'],
    [3, 'Mã huyện'],
    [4, 'Tên huyện'],
    [5, 'Mã BC'],
    [6, 'Tên BC'],
    [7, 'Loại BC'],
    [8, 'Ma KHL'],
    [9, 'Ten KHL'],
    [10, 'Sản lượng PTC/ Nộp tiền/ CH'],
    [11, 'Sản lượng PTC/ Nộp tiền'],
    [12, 'Tỷ lệ PTC/ Nộp tiền'],
    [13, 'Đúng thời gian quy định'],
    [17, 'Quá thời gian quy định'],
    [21, 'Sản lượng chưa đủ thông tin đo kiểm'],
    [22, 'SL loại trừ không đo kiểm'],
    [23, 'SL Chuyển hoàn'],
    [24, 'Tỷ lệ chuyển hoàn'],
    [25, 'Sản lượng bưu gửi PTC 8 giờ tại bưu cục (XNĐ BD1)'],
    [26, 'Tỷ lệ gửi PTC 8 giờ tại bưu cục ( XNĐ BD1)'],
    [27, 'Sản lượng bưu gửi PTC 8 giờ tại bưu cục (có quét TMS)'],
    [28, 'Tỷ lệ gửi PTC 8 giờ tại bưu cục (có quét TMS)'],
    [34, 'Sản lượng bưu gửi PTC 8 giờ lần đầu tại bưu cục (XNĐ BD1)'],
    [35, 'Tỷ lệ gửi PTC 8 giờ lần đầu tại bưu cục (XNĐ BD1)'],
    [36, 'Sản lượng bưu gửi PTC 8 giờ lần đầu tại bưu cục (có quét TMS)'],
    [37, 'Tỷ lệ gửi PTC 8 giờ lần đầu tại bưu cục (có quét TMS)'],
]);

const REQUIRED_SUBHEADER_CELLS = Object.freeze([
    [13, 'Sản lượng PTC trong thời gian QĐ 12,5 giờ'],
    [14, 'Tỷ PTC trong thời gian QĐ 12,5 giờ'],
    [15, 'Sản lượng bưu gửi PTC/Nộp tiền/Chuyển hoàn trong thời gian QĐ giờ 72 giờ'],
    [16, 'Tỷ lệ bưu gửi PTC/Nộp tiền/Chuyển hoàn trong thời gian QĐ giờ/72 giờ'],
    [17, 'Sản lượng phát thành công /Nộp tiền>12,5 giờ và chuyển hoàn'],
    [18, 'Tỷ lệ phát thành công /Nộp tiền>12,5 giờ và chuyển hoàn'],
    [19, 'Sản lượng phát thành công /Nộp tiền/Chuyển hoàn > 72 giờ'],
    [20, 'Tỷ lệ phát thành công /Nộp tiền/Chuyển hoàn > 72 giờ'],
]);

const REQUIRED_LEGEND_CELLS = Object.freeze([
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
    [12, '11=10/9'], [13, 12], [14, 13], [15, 14], [16, '15=14/9'], [17, 16],
    [18, '17=16/9'], [19, 18], [20, '19=18/9'], [21, 20], [22, 21], [23, 22],
    [24, '22/9=23'], [25, 24], [26, '24/9=25'], [27, 26], [28, '27=26/9'],
    [29, 28], [30, 29], [31, 30], [32, 31], [34, 32], [35, '33=32/9'], [36, 34],
    [37, '35=34/9'],
]);

function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

function normalizeText(value) {
    if (isBlank(value)) return null;
    return String(value).trim();
}

function normalizeCode(value) {
    if (isBlank(value)) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
    return String(value).trim();
}

function normalizeNumber(value) {
    if (isBlank(value)) return 0;
    if (typeof value === 'number') return value;
    const normalized = String(value).replace('%', '').replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRateText(value) {
    if (isBlank(value)) return null;
    return String(value).trim();
}

function normalizeComparable(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function buildFormatError(message) {
    const error = new Error(`Invalid F4.1 TCT Excel format. ${message}`);
    error.code = 'INVALID_F41_TCT_FORMAT';
    return error;
}

function rowHasAnyValue(row = []) {
    return row.some((value) => !isBlank(value));
}

function isGrandTotalRow(row = []) {
    return normalizeCode(row[1]) === null && normalizeText(row[2]) === null && rowHasAnyValue(row);
}

function assertCells(row, requiredCells, label) {
    for (const [index, expected] of requiredCells) {
        if (normalizeComparable(row?.[index]) !== normalizeComparable(expected)) {
            throw buildFormatError(`${label} mismatch at column ${index + 1}. Expected '${expected}', got '${row?.[index] ?? ''}'.`);
        }
    }
}

function assertGrandTotalReconciles(grandTotalRow, unitRows) {
    for (const index of COUNT_COLUMN_INDEXES) {
        const expected = normalizeNumber(grandTotalRow[index]);
        const actual = unitRows.reduce((sum, row) => sum + normalizeNumber(row[index]), 0);
        if (expected !== actual) {
            throw buildFormatError(`Grand-total row does not reconcile at column ${index + 1}. Expected ${expected}, summed ${actual}.`);
        }
    }
}

function validateFrozenWorkbookIdentity(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length < FIRST_REPORTING_ROW_INDEX + EXPECTED_RAW_REPORTING_UNITS) {
        throw buildFormatError(`Expected at least ${FIRST_REPORTING_ROW_INDEX + EXPECTED_RAW_REPORTING_UNITS} rows for the frozen positional layout.`);
    }

    const headerRow = rawRows[0] || [];
    const subHeaderRow = rawRows[1] || [];
    const legendRow = rawRows[LEGEND_ROW_INDEX] || [];
    const grandTotalRow = rawRows[GRAND_TOTAL_ROW_INDEX] || [];

    if (headerRow.length < EXPECTED_COLUMN_COUNT || subHeaderRow.length < EXPECTED_COLUMN_COUNT || legendRow.length < EXPECTED_COLUMN_COUNT || grandTotalRow.length < EXPECTED_COLUMN_COUNT) {
        throw buildFormatError(`Expected ${EXPECTED_COLUMN_COUNT} positional columns in header, legend, and grand-total rows.`);
    }

    assertCells(headerRow, REQUIRED_HEADER_CELLS, 'Header row 1');
    assertCells(subHeaderRow, REQUIRED_SUBHEADER_CELLS, 'Header row 2');
    assertCells(legendRow, REQUIRED_LEGEND_CELLS, 'Column-number/formula legend row');

    if (normalizeNumber(grandTotalRow[0]) !== 1 || !isGrandTotalRow(grandTotalRow)) {
        throw buildFormatError('Row 4 must be the grand-total row with TT=1 and blank Mã tỉnh/Tên tỉnh.');
    }

    const unitRows = rawRows.slice(FIRST_REPORTING_ROW_INDEX).filter((row) => rowHasAnyValue(row) && !isGrandTotalRow(row));
    if (unitRows.length !== EXPECTED_RAW_REPORTING_UNITS) {
        throw buildFormatError(`Expected ${EXPECTED_RAW_REPORTING_UNITS} raw reporting unit rows after row 4, got ${unitRows.length}.`);
    }
    assertGrandTotalReconciles(grandTotalRow, unitRows);
}

function parseF41TctExcel(buffer, filename) {
    const ngayDoKiem = extractF41DateFromFilename(filename);
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    validateFrozenWorkbookIdentity(rawRows);

    const parsedData = [];
    const excludedRows = [];
    let rawReportingRows = 0;
    for (let rowIndex = FIRST_REPORTING_ROW_INDEX; rowIndex < rawRows.length; rowIndex += 1) {
        const row = rawRows[rowIndex] || [];
        if (!rowHasAnyValue(row) || isGrandTotalRow(row)) continue;
        if (row.length < EXPECTED_COLUMN_COUNT) {
            throw new Error(`Invalid F4.1 TCT Excel format. Expected ${EXPECTED_COLUMN_COUNT} positional columns at row ${rowIndex + 1}, got ${row.length}.`);
        }

        rawReportingRows += 1;
        const item = { ngay_do_kiem: ngayDoKiem };
        F41_TCT_DB_COLUMNS.forEach((column, index) => {
            if (index === 0) item[column] = normalizeNumber(row[index]);
            else if (F41_TCT_RATE_COLUMNS.includes(column)) item[column] = normalizeRateText(row[index]);
            else if (index >= 10) item[column] = normalizeNumber(row[index]);
            else if (['ma_don_vi', 'ma_huyen', 'ma_bc', 'ma_khl'].includes(column)) item[column] = normalizeCode(row[index]);
            else item[column] = normalizeText(row[index]);
        });

        if (!item.ma_don_vi) continue;
        if (!NATIONAL_RANKED_PROVINCE_CODES.includes(item.ma_don_vi)) {
            excludedRows.push({
                ma_don_vi: item.ma_don_vi,
                ten_don_vi: item.ten_don_vi,
                row_number: rowIndex + 1,
                exclusion_code: 'NON_NATIONAL_RANKED_PROVINCE_CODE',
            });
            continue;
        }
        parsedData.push(item);
    }

    if (rawReportingRows !== EXPECTED_RAW_REPORTING_UNITS) {
        throw new Error(`Invalid F4.1 TCT Excel format. Expected ${EXPECTED_RAW_REPORTING_UNITS} raw reporting units after skipping headers/legend/grand total, got ${rawReportingRows}.`);
    }
    if (parsedData.length !== EXPECTED_ACCEPTED_REPORTING_UNITS) {
        throw new Error(`Invalid F4.1 TCT Excel format. Expected ${EXPECTED_ACCEPTED_REPORTING_UNITS} accepted national province/city units, got ${parsedData.length}.`);
    }

    return {
        parsedData,
        totalParsed: parsedData.length,
        rawReportingRows,
        acceptedRows: parsedData.length,
        excludedRows,
        excludedRowsCount: excludedRows.length,
        ngayDoKiem,
        dbColumns: ['ngay_do_kiem', ...F41_TCT_DB_COLUMNS],
    };
}

module.exports = {
    parseF41TctExcel,
    F41_TCT_DB_COLUMNS,
    F41_TCT_RATE_COLUMNS,
    EXPECTED_COLUMN_COUNT,
    EXPECTED_RAW_REPORTING_UNITS,
    EXPECTED_ACCEPTED_REPORTING_UNITS,
    FIRST_REPORTING_ROW_INDEX,
};
