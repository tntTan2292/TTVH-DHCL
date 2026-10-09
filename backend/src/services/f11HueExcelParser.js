'use strict';

// F11-PHASE-1 - F1.1 (toan trinh noi tinh) HUE row-level parser.
//
// Parses by HEADER NAME, never by position or column count: the portal export already drifted from
// 52 to 55 columns (three Ky thuat tinh columns appended). The 52 base headers are required (a
// missing one is a hard error that names it); the 3 newer headers are optional and stored as NULL
// when absent. Unknown extra headers are accepted and reported (drift visibility), never dropped
// silently. The business date comes ONLY from the file name, never from cell content.

const xlsx = require('xlsx');

// source header -> [fact_f11 column, type]
const F11_REQUIRED_COLUMNS = Object.freeze({
    'STT': ['stt', 'INTEGER'],
    'Số hiệu bưu gửi': ['ma_bg', 'TEXT'],
    'Số hiệu lô': ['so_hieu_lo', 'TEXT'],
    'Mã tỉnh chấp nhận': ['ma_tinh_chap_nhan', 'TEXT'],
    'Tên tỉnh chấp nhận': ['ten_tinh_chap_nhan', 'TEXT'],
    'Địa bàn chấp nhận': ['dia_ban_chap_nhan', 'TEXT'],
    'Mã BC chấp nhận': ['ma_bc_chap_nhan', 'TEXT'],
    'Tên BC chấp nhận': ['ten_bc_chap_nhan', 'TEXT'],
    'Loại BC chấp nhận': ['loai_bc_chap_nhan', 'TEXT'],
    'Mã BCKT chấp nhận': ['ma_bckt_chap_nhan', 'TEXT'],
    'Tên BCKT chấp nhận': ['ten_bckt_chap_nhan', 'TEXT'],
    'Mã tỉnh phát': ['ma_tinh_phat', 'TEXT'],
    'Tên tỉnh phát': ['ten_tinh_phat', 'TEXT'],
    'Địa bàn phát': ['dia_ban_phat', 'TEXT'],
    'Mã BC phát': ['ma_bc_phat', 'TEXT'],
    'Tên BC phát': ['ten_bc_phat', 'TEXT'],
    'Loại BC phát': ['loai_bc_phat', 'TEXT'],
    'Mã BCKT phát': ['ma_bckt_phat', 'TEXT'],
    'Tên BCKT phát': ['ten_bckt_phat', 'TEXT'],
    'Mã tuyến phát': ['ma_tuyen_phat', 'TEXT'],
    'Tên tuyến phát': ['ten_tuyen_phat', 'TEXT'],
    'Loại tuyến phát': ['loai_tuyen_phat', 'TEXT'],
    'Loại bưu gửi': ['loai_buu_gui', 'TEXT'],
    'Dịch vụ': ['dich_vu', 'TEXT'],
    'Loại DV': ['loai_dv', 'TEXT'],
    'Nhóm SPDV': ['nhom_spdv', 'TEXT'],
    'Mã SPDV': ['ma_spdv', 'TEXT'],
    'Khối lượng thực tế': ['khoi_luong_thuc_te', 'REAL'],
    'Khối lượng quy đổi': ['khoi_luong_quy_doi', 'TEXT'],
    'Mã KHL': ['ma_khl', 'TEXT'],
    'Tên KHL': ['ten_khl', 'TEXT'],
    'Nhóm khách hàng': ['nhom_khach_hang', 'TEXT'],
    'Số hiệu BD8 Đóng Đi tại BC Chấp nhận': ['so_hieu_bd8_dong_di_bc_chap_nhan', 'TEXT'],
    'Thời gian BD8 Đóng Đi tại BC Chấp nhận': ['thoi_gian_bd8_dong_di_bc_chap_nhan', 'TEXT'],
    'Số hiệu BD8 XNĐ tại BCKTT': ['so_hieu_bd8_xnd_bcktt', 'TEXT'],
    'Thời gian BD8 XNĐ tại BCKTT': ['thoi_gian_bd8_xnd_bcktt', 'TEXT'],
    'Số hiệu BD10 XNĐ tại BCKT phát': ['so_hieu_bd10_xnd_bckt_phat', 'TEXT'],
    'Thời gian BD10 XNĐ tại BCKT phát': ['thoi_gian_bd10_xnd_bckt_phat', 'TEXT'],
    'Thời gian phát đến BCP': ['thoi_gian_phat_den_bcp', 'TEXT'],
    'Thời gian nhận tin thu gom': ['thoi_gian_nhan_tin_thu_gom', 'TEXT'],
    'Thời gian chấp nhận': ['thoi_gian_chap_nhan', 'TEXT'],
    'Thời gian PTC': ['thoi_gian_ptc', 'TEXT'],
    'Thời gian nộp tiền COD': ['thoi_gian_nop_tien_cod', 'TEXT'],
    'Thời gian thực tế': ['thoi_gian_thuc_te', 'TEXT'],
    'Đánh giá 2025': ['danh_gia_2025', 'TEXT'],
    'Thời gian chỉ tiêu 2026': ['thoi_gian_chi_tieu_2026', 'INTEGER'],
    'Đánh giá 2026': ['danh_gia_2026', 'TEXT'],
    'Nội dung lý do': ['noi_dung_ly_do', 'TEXT'],
    'Mã Phường Xã Chấp Nhận': ['ma_phuong_xa_chap_nhan', 'TEXT'],
    'Tên Phường Xã Chấp Nhận': ['ten_phuong_xa_chap_nhan', 'TEXT'],
    'Mã Phường Xã Phát': ['ma_phuong_xa_phat', 'TEXT'],
    'Tên Phường Xã Phát': ['ten_phuong_xa_phat', 'TEXT'],
});

const F11_OPTIONAL_COLUMNS = Object.freeze({
    'Số BD10 Đóng đi tại KTTỉnh': ['so_bd10_dong_di_kttinh', 'TEXT'],
    'Thời gian BD10 Đóng đi tại KTTỉnh': ['thoi_gian_bd10_dong_di_kttinh', 'TEXT'],
    'Thời gian BD10 Quét Lên TMS tại KTTỉnh': ['thoi_gian_bd10_quet_len_tms_kttinh', 'TEXT'],
});

const F11_ALL_COLUMNS = Object.freeze({ ...F11_REQUIRED_COLUMNS, ...F11_OPTIONAL_COLUMNS });
const REQUIRED_COLUMN = 'Số hiệu bưu gửi';
const METRIC_COLUMN = 'Đánh giá 2026';
const MAX_HEADER_SCAN_ROWS = 20;
const F11_DB_COLUMNS = Object.freeze(Object.values(F11_ALL_COLUMNS).map(([column]) => column));

function normalizeHeader(header) {
    if (header === null || header === undefined) return '';
    return String(header).replace(/\s+/g, ' ').trim();
}

function formatDate(value) {
    if (Number.isNaN(value.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

function coerce(value, type) {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return formatDate(value);
    if (typeof value === 'string') {
        if (value.trim() === '') return null;
        if (type === 'INTEGER' || type === 'REAL') {
            const n = Number(value);
            return Number.isFinite(n) ? n : value;
        }
        return value;
    }
    if (type === 'TEXT') return String(value);
    return value;
}

function extractF11DateFromFilename(filename) {
    const match = String(filename).match(/^F1\.1-(\d{4})\.(\d{2})\.(\d{2})\.xlsx$/i);
    if (!match) {
        throw new Error(`Invalid F1.1 filename format. Expected 'F1.1-YYYY.MM.DD.xlsx', got: '${filename}'.`);
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error(`Invalid F1.1 filename date '${match[1]}.${match[2]}.${match[3]}' in '${filename}'.`);
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseF11HueExcel(buffer, filename) {
    const ngayDoKiem = extractF11DateFromFilename(filename);
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    let headerRowIdx = -1;
    const scanLimit = Math.min(rawData.length, MAX_HEADER_SCAN_ROWS);
    for (let i = 0; i < scanLimit; i++) {
        const normalized = Array.isArray(rawData[i]) ? rawData[i].map(normalizeHeader) : [];
        if (normalized.includes(REQUIRED_COLUMN)) {
            headerRowIdx = i;
            break;
        }
    }
    if (headerRowIdx === -1) {
        throw new Error(`Invalid F1.1 HUE Excel format. Required column '${REQUIRED_COLUMN}' not found within the first ${MAX_HEADER_SCAN_ROWS} rows.`);
    }

    const headers = rawData[headerRowIdx].map(normalizeHeader);
    const missingHeaders = Object.keys(F11_REQUIRED_COLUMNS).filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
        throw new Error(`Invalid F1.1 HUE Excel format. Missing expected column(s): ${missingHeaders.join(', ')}.`);
    }

    const unmappedHeaders = headers.filter((header) => header && !F11_ALL_COLUMNS[header]);
    const presentOptionalHeaders = Object.keys(F11_OPTIONAL_COLUMNS).filter((header) => headers.includes(header));
    const maBgIdx = headers.indexOf(REQUIRED_COLUMN);
    const colIndexMap = headers
        .map((header, idx) => ({ idx, spec: F11_ALL_COLUMNS[header] }))
        .filter((item) => item.spec);

    const parsedData = [];
    for (const row of rawData.slice(headerRowIdx + 1)) {
        if (!row || row[maBgIdx] === null || row[maBgIdx] === undefined || String(row[maBgIdx]).trim() === '') continue;
        const item = { ngay_do_kiem: ngayDoKiem };
        for (const column of F11_DB_COLUMNS) item[column] = null; // absent optional columns stay NULL
        for (const { idx, spec } of colIndexMap) item[spec[0]] = coerce(row[idx], spec[1]);
        parsedData.push(item);
    }

    return {
        parsedData,
        totalParsed: parsedData.length,
        ngayDoKiem,
        dbColumns: ['ngay_do_kiem', ...F11_DB_COLUMNS],
        columnCount: headers.length,
        presentOptionalHeaders,
        unmappedHeaders,
    };
}

module.exports = {
    extractF11DateFromFilename,
    parseF11HueExcel,
    F11_REQUIRED_COLUMNS,
    F11_OPTIONAL_COLUMNS,
    F11_ALL_COLUMNS,
    F11_DB_COLUMNS,
    REQUIRED_COLUMN,
    METRIC_COLUMN,
};
