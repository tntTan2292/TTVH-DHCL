'use strict';

const xlsx = require('xlsx');

const F41_HUE_COLUMN_MAPPING = {
    'STT': 'stt',
    'Mã tỉnh phát': 'ma_tinh_phat',
    'Tên tỉnh phát': 'ten_tinh_phat',
    'Mã huyện phát': 'ma_huyen_phat',
    'Tên huyện phát': 'ten_huyen_phat',
    'Địa bàn phát (Trung tâm tỉnh/Huyện thông thường/Huyện khó khăn/Huyện đảo': 'dia_ban_phat',
    'Mã BC phát': 'ma_bc_phat',
    'Tên BC phát': 'ten_bc_phat',
    'Loại BCP': 'loai_bcp',
    'Dịch vụ': 'dich_vu',
    'Loại DV': 'loai_dv',
    'Nhóm SPDV': 'nhom_spdv',
    'Mã SPDV': 'ma_spdv',
    'Số hiệu bưu gửi': 'ma_bg',
    'Số hiệu lô': 'so_hieu_lo',
    'Số tiền COD': 'so_tien_cod',
    'Khối lượng thực tế': 'khoi_luong_thuc_te',
    'Khối lượng quy đổi': 'khoi_luong_quy_doi',
    'Mã KHL': 'ma_khl',
    'Tên KHL': 'ten_khl',
    'Nhóm khách hàng': 'nhom_khach_hang',
    'Số hiệu BD10 XNĐ BCP': 'so_hieu_bd10_xnd_bcp',
    'Thời gian BCP XNĐ BĐ10': 'thoi_gian_bcp_xnd_bd10',
    'Thời gian BD10 quét xuống tại BCP': 'thoi_gian_bd10_quet_xuong_bcp',
    'Số hiệu BD8 XNĐ BCP': 'so_hieu_bd8_xnd_bcp',
    'Thời gian BCP XNĐ BĐ8': 'thoi_gian_bcp_xnd_bd8',
    'Thời gian XND BD1': 'thoi_gian_xnd_bd1',
    'Thời gian PTC': 'thoi_gian_ptc',
    'Thời gian nộp tiền': 'thoi_gian_nop_tien',
    'Thời gian TMS XNĐ BCP': 'thoi_gian_tms_xnd_bcp',
    'Thời gian ko TMS thực hiện PTC': 'thoi_gian_khong_tms_thuc_hien_ptc',
    'Thời gian có TMS thực hiện PTC': 'thoi_gian_co_tms_thuc_hien_ptc',
    'Thời gian ko TMS thực hiện PLD': 'thoi_gian_khong_tms_thuc_hien_pld',
    'Thời gian có TMS thực hiện PLD': 'thoi_gian_co_tms_thuc_hien_pld',
    'Thời gian chuyển hoàn': 'thoi_gian_chuyen_hoan',
    'Đánh giá (so sánh thời gian thực hiện với 12,5 giờ)': 'danh_gia_12_5h',
    'Đánh giá (so sánh thời gian thực hiện với 72 giờ)': 'danh_gia_72h',
    'Thời gian Phát thành công lần đầu': 'thoi_gian_phat_thanh_cong_lan_dau',
    'Đánh giá (thời gian Không đo TMS PTC 8 giờ)': 'danh_gia_khong_tms_ptc_8h',
    'Đánh giá (thời gian Có TMS PTC 8 giờ)': 'danh_gia_co_tms_ptc_8h',
    'Đánh giá (thời gian Không đo TMS PTC lần đầu 8 giờ)': 'danh_gia_khong_tms_ptc_lan_dau_8h',
    'Đánh giá (thời gian Có TMS PTC lần đầu 8 giờ)': 'danh_gia_co_tms_ptc_lan_dau_8h',
};

const REQUIRED_COLUMN = 'Số hiệu bưu gửi';
const METRIC_COLUMN = 'Đánh giá (thời gian Có TMS PTC 8 giờ)';
const EXPECTED_COLUMN_COUNT = 42;
const MAX_HEADER_SCAN_ROWS = 20;
const F41_HUE_DB_COLUMNS = Object.values(F41_HUE_COLUMN_MAPPING);

function normalizeHeader(header) {
    if (header === null || header === undefined) return '';
    return String(header).replace(/\s+/g, ' ').trim();
}

function toSqliteValue(value) {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        const pad = (n) => String(n).padStart(2, '0');
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    }
    return value;
}

function extractF41DateFromFilename(filename) {
    const match = String(filename).match(/^F4\.1-(\d{4})\.(\d{2})\.(\d{2})\.xlsx$/i);
    if (!match) {
        throw new Error(`Invalid F4.1 filename format. Expected 'F4.1-YYYY.MM.DD.xlsx', got: '${filename}'.`);
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseF41HueExcel(buffer, filename) {
    const ngayDoKiem = extractF41DateFromFilename(filename);
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
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
        throw new Error(`Invalid F4.1 HUE Excel format. Required column '${REQUIRED_COLUMN}' not found within the first ${MAX_HEADER_SCAN_ROWS} rows.`);
    }

    const headers = rawData[headerRowIdx].map(normalizeHeader);
    if (headers.length !== EXPECTED_COLUMN_COUNT) {
        throw new Error(`Invalid F4.1 HUE Excel format. Expected ${EXPECTED_COLUMN_COUNT} columns, got ${headers.length}.`);
    }
    if (!headers.includes(METRIC_COLUMN)) {
        throw new Error(`Invalid F4.1 HUE Excel format. Metric column '${METRIC_COLUMN}' not found.`);
    }

    const missingHeaders = Object.keys(F41_HUE_COLUMN_MAPPING).filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
        throw new Error(`Invalid F4.1 HUE Excel format. Missing expected column(s): ${missingHeaders.join(', ')}.`);
    }

    const maBgIdx = headers.indexOf(REQUIRED_COLUMN);
    const colIndexMap = headers
        .map((header, idx) => ({ idx, dbField: F41_HUE_COLUMN_MAPPING[header] }))
        .filter((item) => item.dbField);

    const parsedData = [];
    for (const row of rawData.slice(headerRowIdx + 1)) {
        if (!row || !row[maBgIdx]) continue;
        const item = { ngay_do_kiem: ngayDoKiem };
        for (const { idx, dbField } of colIndexMap) {
            item[dbField] = toSqliteValue(row[idx]);
        }
        parsedData.push(item);
    }

    return {
        parsedData,
        totalParsed: parsedData.length,
        ngayDoKiem,
        dbColumns: ['ngay_do_kiem', ...F41_HUE_DB_COLUMNS],
    };
}

module.exports = {
    extractF41DateFromFilename,
    parseF41HueExcel,
    F41_HUE_COLUMN_MAPPING,
    F41_HUE_DB_COLUMNS,
    REQUIRED_COLUMN,
    METRIC_COLUMN,
    EXPECTED_COLUMN_COUNT,
};
