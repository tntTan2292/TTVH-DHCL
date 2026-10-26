/**
 * BF-PHAT-IMPORT-01 -- reads one daily delivery BatchFile `SanLuongChiTiet_DDMMYYYY[_NNN].xlsx`
 * (28 columns). Columns are resolved by header name so a reordered export still maps correctly,
 * and a file missing a required header fails loudly instead of mis-mapping.
 */
'use strict';

const path = require('path');
const xlsx = require('xlsx');

const REQUIRED_HEADERS = ['LADING_CODE', 'STATUS_DATE', 'STATUS_CODE', 'MABC_PHAT', 'POSTMAN_CODE', 'ROUTE_PO_CODE'];

// header in file -> [column in fact_bf_phat, kind]
const COLUMN_MAP = Object.freeze([
    ['LADING_CODE', 'lading_code', 'text'],
    ['Mã Tỉnh', 'ma_tinh', 'text'],
    ['Mã huyện', 'ma_huyen', 'text'],
    ['Mã bưu cục', 'ma_buu_cuc', 'text'],
    ['POSTMAN_CODE', 'postman_code', 'text'],
    ['ROUTE_PO_CODE', 'route_po_code', 'text'],
    ['STATUS_CODE', 'status_code', 'text'],
    ['TYPE_CODE_PAYROLL', 'type_code_payroll', 'text'],
    ['TYPE_NAME_PAYROLL', 'type_name_payroll', 'text'],
    ['SERVICE_NAME_PAYROLL', 'service_name_payroll', 'text'],
    ['REGION_CODE', 'region_code', 'text'],
    ['KG', 'kg', 'num'],
    ['AREA_CODE', 'area_code', 'text'],
    ['SERVICE_CODE', 'service_code', 'text'],
    ['ITEM_TYPE_CODE', 'item_type_code', 'text'],
    ['STATUS_DATE', 'status_date', 'text'],
    ['QUANTITY', 'quantity', 'num'],
    ['SERVICE_PRO', 'service_pro', 'text'],
    ['MABC_CN', 'mabc_cn', 'text'],
    ['MABC_PHAT', 'mabc_phat', 'text'],
    ['SO_TIEN_THU_HO', 'so_tien_thu_ho', 'num'],
    ['CUSTOMER_CODE', 'customer_code', 'text'],
    ['LAT', 'lat', 'num'],
    ['LON', 'lon', 'num'],
    ['STATUS_TIME', 'status_time', 'text'],
    ['GTGT', 'gtgt', 'text'],
    ['Xác nhận đến BCP', 'xac_nhan_den_bcp', 'text'],
    ['Mã lô', 'ma_lo', 'text'],
]);

const DB_COLUMNS = Object.freeze(COLUMN_MAP.map(([, column]) => column));

const FILENAME_RE = /^SanLuongChiTiet_(\d{2})(\d{2})(\d{4})(?:_(\d+))?\.xlsx$/i;

/** 'SanLuongChiTiet_20102026.xlsx' -> '2026-10-20'; null if the name is not a daily BF file. */
function extractBfDateFromFilename(filename) {
    const match = FILENAME_RE.exec(path.basename(filename));
    if (!match) return null;
    const [, dd, mm, yyyy] = match;
    const iso = `${yyyy}-${mm}-${dd}`;
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

function cleanText(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text === '' ? null : text;
}

function cleanNumber(value) {
    const text = cleanText(value);
    if (text === null) return null;
    const number = Number(text.replace(/,/g, ''));
    return Number.isFinite(number) ? number : null;
}

function parseBfPhatDailyExcel(filePath) {
    const workbook = xlsx.readFile(filePath, { cellDates: false, raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw Object.assign(new Error('BF Phát: file không có sheet dữ liệu.'), { code: 'BF_PHAT_NO_SHEET' });
    const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false });
    if (matrix.length === 0) throw Object.assign(new Error('BF Phát: file rỗng.'), { code: 'BF_PHAT_EMPTY' });

    const header = matrix[0].map((cell) => (cell === null ? '' : String(cell).trim()));
    const missing = REQUIRED_HEADERS.filter((name) => !header.includes(name));
    if (missing.length) {
        throw Object.assign(new Error(`BF Phát: thiếu cột ${missing.join(', ')}.`), { code: 'BF_PHAT_MISSING_HEADER', missing });
    }
    const indexOf = new Map(COLUMN_MAP.map(([name]) => [name, header.indexOf(name)]));

    const rows = [];
    let skipped = 0;
    for (let r = 1; r < matrix.length; r += 1) {
        const line = matrix[r];
        const row = {};
        for (const [name, column, kind] of COLUMN_MAP) {
            const index = indexOf.get(name);
            const raw = index >= 0 ? line[index] : null;
            row[column] = kind === 'num' ? cleanNumber(raw) : cleanText(raw);
        }
        if (!row.lading_code) { skipped += 1; continue; }
        rows.push(row);
    }
    return { rows, skipped, totalLines: matrix.length - 1 };
}

module.exports = {
    parseBfPhatDailyExcel,
    extractBfDateFromFilename,
    DB_COLUMNS,
    REQUIRED_HEADERS,
};
