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

function rowHasAnyValue(row = []) {
    return row.some((value) => !isBlank(value));
}

function isGrandTotalRow(row = []) {
    return normalizeCode(row[1]) === null && normalizeText(row[2]) === null && rowHasAnyValue(row);
}

function parseF41TctExcel(buffer, filename) {
    const ngayDoKiem = extractF41DateFromFilename(filename);
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

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
