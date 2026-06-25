'use strict';

/**
 * excelParser.js
 *
 * SSOT Reference : docs/04_DOMAINS/.../f1.3_chat_luong_phat_lien_tinh/data_blueprint.md
 * Technical Design: docs/05_TECHNICAL_IMPLEMENTATION/f1.3_technical_design_v1.0.md § 2.1
 *
 * Responsibility:
 *   - Read F1.3 Excel buffer using xlsx library.
 *   - Map STATIC 41 columns (COLUMN_MAPPING) to DB fields.
 *   - Throw hard error if required column 'Số hiệu bưu gửi' is missing.
 *   - Convert DATETIME cell values to SQLite-compatible ISO strings.
 *   - Extract ngay_do_kiem from filename (NEVER from Excel content — SSOT rule).
 *
 * DOES NOT:
 *   - Calculate any KPI metric.
 *   - Apply Business Rules.
 *   - Write to the database.
 */

const xlsx = require('xlsx');

// ===========================================================================
// FROZEN — Static 41-column mapping (Excel Header → DB field name).
// SSOT: data_blueprint.md § 3 "Source File Column Mapping".
// DO NOT modify without a Documentation Change Request (DCR).
// ===========================================================================
const COLUMN_MAPPING = {
    'STT':                                                                           'stt',
    'Số hiệu bưu gửi':                                                              'ma_bg',
    'Mã tỉnh phát':                                                                  'ma_tinh_phat',
    'Tên tỉnh phát':                                                                 'ten_tinh_phat',
    'Địa bàn phát':                                                                  'dia_ban_phat',
    'Mã BCKT Tỉnh phát':                                                             'ma_bckt_tinh_phat',
    'Tên BCKT Tỉnh phát':                                                            'ten_bckt_tinh_phat',
    'Mã BC phát':                                                                    'ma_bcvh',
    'Tên BC phát':                                                                   'ten_bcvh',
    'Loại BC Phát':                                                                  'loai_bc_phat',
    'Loại bg':                                                                       'loai_bg',
    'Dịch vụ':                                                                       'dich_vu',
    'Loại DV':                                                                       'loai_dv',
    'Nhóm SPDV':                                                                     'nhom_spdv',
    'Mã SPDV':                                                                       'ma_spdv',
    'Số hiệu lô':                                                                    'so_hieu_lo',
    'Số tiền COD':                                                                   'so_tien_cod',
    'Khối lượng thực tế':                                                            'khoi_luong_thuc_te',
    'Khối lượng quy đổi':                                                            'khoi_luong_quy_doi',
    'Tên KHL':                                                                       'ten_khl',
    'Nhóm khách hàng':                                                               'nhom_khach_hang',
    'Mã tuyến phát':                                                                 'ma_tuyen',
    'Tên tuyến phát':                                                                'ten_tuyen',
    'Loại tuyến phát':                                                               'loai_tuyen_phat',
    'Số hiệu BĐ8 XNĐ BCKT phát':                                                    'so_hieu_bd8',
    'Thời gian BCKT tỉnh XNĐ BĐ8':                                                  'thoi_gian_bckt_tinh_xnd_bd8',
    'Số hiệu BĐ10 (XNĐ) KT tỉnh phát / đóng đi với Tỉnh có Hub':                   'so_hieu_bd10',
    'Thời gian BĐ10 XNĐ KTTP trên BCCP / đóng đi với Tỉnh có Hub':                  'thoi_gian_bd10_xnd_kttp',
    'Thời gian BĐ10 quét TMS xuống KT tỉnh phát / quét lên với Tỉnh có Hub':        'thoi_gian_bd10_quet_tms',
    'Thời gian PTC':                                                                 'thoi_gian_ptc',
    'Thời gian nộp tiền':                                                            'thoi_gian_nop_tien',
    'Thời gian thực hiện thực tế (giờ)':                                             'thoi_gian_thuc_hien_thuc_te_gio',
    'Đánh giá (Đạt/Không đạt)':                                                     'ket_qua_f13',
    'Đánh giá 2026 (Đạt/Không đạt)':                                                'danh_gia_2026',
    'Thời gian chi tiêu':                                                            'thoi_gian_chi_tieu',
    'Mã Huyện':                                                                      'ma_huyen',
    'Tên Huyện':                                                                     'ten_huyen',
    'Mã Phường Xã Chấp Nhận':                                                        'ma_phuong_xa_chap_nhan',
    'Tên Phường Xã Chấp Nhận':                                                       'ten_phuong_xa_chap_nhan',
    'Mã Phường Xã Phát':                                                             'ma_phuong_xa_phat',
    'Tên Phường Xã Phát':                                                            'ten_phuong_xa_phat'
};

// Column whose presence in the Excel header validates the correct file structure.
// Reference: Technical Design § 2.1 "bắt lỗi nếu không tìm thấy cột Số hiệu bưu gửi"
const REQUIRED_COLUMN = 'Số hiệu bưu gửi';

// Safety limit: stop scanning for header row after this many rows.
const MAX_HEADER_SCAN_ROWS = 20;

// Pre-computed list of DB field names derived from the static mapping.
// Used by callers (e.g. importService.js) to build INSERT statements.
const DB_COLUMNS = Object.values(COLUMN_MAPPING);

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Convert a cell value to a format suitable for SQLite storage.
 *
 * xlsx with cellDates:true returns DATETIME cells as JS Date objects.
 * SQLite DATETIME columns accept 'YYYY-MM-DD HH:MM:SS' text.
 *
 * Rules:
 *   - null | undefined | '' → null
 *   - Date              → 'YYYY-MM-DD HH:MM:SS'
 *   - number | string   → as-is (SQLite handles coercion for REAL/INTEGER)
 *
 * @param {*} value
 * @returns {string|number|null}
 */
function toSqliteValue(value) {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) {
        if (isNaN(value.getTime())) return null; // Guard against invalid dates
        const pad = n => String(n).padStart(2, '0');
        return (
            `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ` +
            `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
        );
    }
    return value;
}

// ===========================================================================
// Public API
// ===========================================================================

/**
 * Extract ngay_do_kiem from the Excel filename.
 *
 * SSOT RULE (data_blueprint.md § "Trường dữ liệu Hệ thống"):
 *   ngay_do_kiem MUST be sourced from the filename.
 *   NEVER extract it from Excel cell content.
 *
 * @param {string} filename  e.g. 'F1.3-2026.06.18.xlsx'
 * @returns {string}         ISO date string 'YYYY-MM-DD'
 * @throws {Error}           If filename does not match the expected pattern.
 */
function extractDateFromFilename(filename) {
    // Regex anchored to require .xlsx suffix — prevents partial matches.
    const match = filename.match(/^F1\.3-(\d{4})\.(\d{2})\.(\d{2})\.xlsx$/i);
    if (!match) {
        throw new Error(
            `Invalid filename format. Expected 'F1.3-YYYY.MM.DD.xlsx', got: '${filename}'. ` +
            `SSOT: ngay_do_kiem must be extractable from the filename.`
        );
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Parse an F1.3 Excel file buffer and map columns to DB fields.
 *
 * Technical Design § 2.1:
 *   "Đọc file bằng thư viện xlsx, map tĩnh 41 cột theo cấu hình chuẩn,
 *    bắt lỗi nếu không tìm thấy cột 'Số hiệu bưu gửi'."
 *
 * IMPORTANT: ngay_do_kiem is NOT injected here.
 * Caller is responsible for injecting it per SSOT rule.
 *
 * @param {Buffer} buffer
 * @returns {{
 *   parsedData : Object[],  - Array of row objects keyed by DB field names
 *   totalParsed: number,    - Count of valid (non-empty) rows
 *   dbColumns  : string[]   - Ordered list of DB column names (= DB_COLUMNS)
 * }}
 * @throws {Error} If required column is not found.
 */
function parseF13Excel(buffer) {
    // cellDates: true → DATETIME cells are returned as native JS Date objects
    // instead of Excel serial numbers. Prevents corrupt datetime storage.
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // 2D array mode for dynamic header row discovery.
    // defval: null → missing cells yield null rather than undefined.
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // Locate the header row (scan at most MAX_HEADER_SCAN_ROWS rows).
    let headerRowIdx = -1;
    const scanLimit = Math.min(rawData.length, MAX_HEADER_SCAN_ROWS);
    for (let i = 0; i < scanLimit; i++) {
        if (Array.isArray(rawData[i]) && rawData[i].includes(REQUIRED_COLUMN)) {
            headerRowIdx = i;
            break;
        }
    }

    if (headerRowIdx === -1) {
        throw new Error(
            `Invalid Excel format. Required column '${REQUIRED_COLUMN}' not found ` +
            `within the first ${MAX_HEADER_SCAN_ROWS} rows.`
        );
    }

    const headers   = rawData[headerRowIdx];
    const maBgIdx   = headers.indexOf(REQUIRED_COLUMN);
    const dataRows  = rawData.slice(headerRowIdx + 1);

    // Build index: excelHeaderIndex → dbFieldName (for fast per-row mapping)
    const colIndexMap = []; // [{idx, dbField}]
    headers.forEach((header, idx) => {
        const dbField = COLUMN_MAPPING[header];
        if (dbField !== undefined) colIndexMap.push({ idx, dbField });
    });

    const parsedData = [];

    for (const row of dataRows) {
        // Skip rows with no value in the mandatory ma_bg column
        if (!row || !row[maBgIdx]) continue;

        const item = {};
        for (const { idx, dbField } of colIndexMap) {
            item[dbField] = toSqliteValue(row[idx]);
        }
        parsedData.push(item);
    }

    return {
        parsedData,
        totalParsed: parsedData.length,
        dbColumns: DB_COLUMNS   // Kept for backward-compat with importService.js
    };
}

module.exports = {
    extractDateFromFilename,
    parseF13Excel,
    COLUMN_MAPPING,    // Export for importProcessor.js (Task 2.2)
    DB_COLUMNS         // Export for SQL building convenience
};
