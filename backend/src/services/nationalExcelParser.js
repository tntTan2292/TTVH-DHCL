'use strict';

/**
 * nationalExcelParser.js
 * 
 * Parser for F1.3 National (TCT) Aggregated Data.
 * Target Table: fact_f13_national
 */

const xlsx = require('xlsx');

// Re-use logic from HUE parser
const { extractDateFromFilename } = require('./excelParser');

const NATIONAL_DB_COLUMNS = [
    'ma_tinh_phat', 'ten_tinh_phat',
    'sl_bg_ptc', 'sl_ptc_nop_tien', 'sl_bg_bd10',
    'sl_ptc_dung_qd_14h', 'tl_ptc_dung_qd_14h', 'sl_qua_qd_14h',
    'sl_ptc_dung_qd_ct', 'tl_ptc_dung_qd_ct', 'sl_qua_qd_ct', 'tl_qua_qd_ct',
    'sl_chua_du_tt', 'sl_loai_tru', 'sl_phat_ktc', 'sl_ptc_kxd'
];

const NATIONAL_RANKED_PROVINCE_CODES = Object.freeze([
    '02', '03', '04', '05', '06', '07', '08', '09', '10', '11',
    '12', '13', '14', '16', '17', '18', '19', '20', '21', '22',
    '23', '24', '25', '26', '27', '28', '29', '30', '31', '32',
    '33', '34', '35', '53'
]);

const NATIONAL_MAPPING = {
    'Mã tỉnh phát': 'ma_tinh_phat',
    'Tên tỉnh phát': 'ten_tinh_phat',
    'SL bưu gửi phát thành công/Nộp tiền/CH': 'sl_bg_ptc',
    'Sản lượng PTC/Nộp tiền': 'sl_ptc_nop_tien',
    'Sản lượng BG có BĐ10 gán TMS quét xuống KTT phát': 'sl_bg_bd10',
    'Sản lượng bưu gửi PTC/nộp tiền đúng thời gian QĐ <=14 giờ': 'sl_ptc_dung_qd_14h',
    'Tỷ lệ bưu gửi PTC/Nộp tiền <=14 giờ': 'tl_ptc_dung_qd_14h',
    'SL quá quy định (>14 giờ)': 'sl_qua_qd_14h',
    'Sản lượng bưu gửi PTC/nộp tiền đúng QĐ theo chi tiêu 2026': 'sl_ptc_dung_qd_ct',
    'Tỷ lệ bưu gửi PTC/Nộp tiền đúng QĐ theo chi tiêu 2026': 'tl_ptc_dung_qd_ct',
    'Sản lượng bưu gửi quá quy định theo chi tiêu 2026': 'sl_qua_qd_ct',
    'Tỷ lệ bưu gửi quá quy định theo chi tiêu 2026': 'tl_qua_qd_ct',
    'SL chưa đủ thông tin đo kiểm': 'sl_chua_du_tt',
    'SL loại trừ': 'sl_loai_tru',
    'SL Phát không thành Công': 'sl_phat_ktc',
    'SL PTC ko xác định': 'sl_ptc_kxd'
};

const REQUIRED_COLUMN = 'Mã tỉnh phát';

function parsePercentage(val) {
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.includes('%')) {
        const num = parseFloat(val.replace('%', '').trim());
        return isNaN(num) ? 0 : num / 100;
    }
    return 0;
}

function parseIntSafe(val) {
    if (typeof val === 'number') return Math.floor(val);
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
}

function parseF13NationalExcel(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        if (Array.isArray(rawData[i]) && rawData[i].includes(REQUIRED_COLUMN)) {
            headerRowIdx = i;
            break;
        }
    }

    if (headerRowIdx === -1) {
        throw new Error(`Invalid Excel format. Required column '${REQUIRED_COLUMN}' not found.`);
    }

    const headers = rawData[headerRowIdx];
    const maTinhIdx = headers.indexOf(REQUIRED_COLUMN);
    const dataRows = rawData.slice(headerRowIdx + 1);

    const colIndexMap = [];
    headers.forEach((header, idx) => {
        const dbField = NATIONAL_MAPPING[header];
        if (dbField) colIndexMap.push({ idx, dbField });
    });

    const parsedData = [];
    const excludedRows = [];

    for (const row of dataRows) {
        if (!row) continue;
        
        let maTinh = row[maTinhIdx];
        if (maTinh === null || maTinh === undefined || String(maTinh).trim() === '') {
            continue; // Skip Dòng Tổng
        }

        maTinh = String(maTinh).trim();
        
        if (maTinh === '2' || maTinh === 'Mã tỉnh phát') {
            excludedRows.push({
                ma_tinh_phat: maTinh,
                exclusion_code: 'WORKBOOK_FORMULA_INDEX_ROW'
            });
            continue; // Skip Dòng Index
        }
        
        if (maTinh === '01' || maTinh === '15') {
            excludedRows.push({
                ma_tinh_phat: maTinh,
                exclusion_code: maTinh === '01' ? 'ADMINISTRATIVE_SOURCE_ROW' : 'NON_RANKED_CENTER_ROW'
            });
            continue; // Skip Tổng công ty EMS
        }

        const item = {};
        for (const { idx, dbField } of colIndexMap) {
            let val = row[idx];
            if (dbField.startsWith('tl_')) {
                item[dbField] = parsePercentage(val);
            } else if (dbField.startsWith('sl_')) {
                item[dbField] = parseIntSafe(val);
            } else {
                item[dbField] = val !== null && val !== undefined ? String(val).trim() : null;
            }
        }
        parsedData.push(item);
    }

    return {
        parsedData,
        totalParsed: parsedData.length,
        dbColumns: NATIONAL_DB_COLUMNS,
        excludedRows
    };
}

module.exports = {
    extractDateFromFilename,
    parseF13NationalExcel,
    NATIONAL_MAPPING,
    NATIONAL_DB_COLUMNS,
    NATIONAL_RANKED_PROVINCE_CODES
};
