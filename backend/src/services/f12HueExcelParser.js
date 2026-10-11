'use strict';

// F12-PHASE-1 - F1.2 (thu gom buu gui lien tinh) HUE row-level parser.
//
// Same contract as the F1.1 reader: parse by HEADER NAME (NFC, collapsed spaces), never by position;
// the core headers are required (a missing one is a hard error that names it), the others optional
// (stored as NULL when absent); unknown extra headers are reported, never dropped silently; a
// duplicated mapped header refuses the file. The business date comes from the file name
// 'F1.2-YYYY.MM.DD.xlsx' (PD-F12-6) and is checked against the BD10 date of the rows: the portal day of
// F1.2 is the BD10 scan date (TMS, else the BCCP close), so a file renamed to the wrong day is refused.
//
// The portal elapsed time and rating are stored exactly as given and never recomputed (audit A-6).
// Audit reference: docs/06_REVIEWS/Shared/F12-MODULE-PLAN_CHECKPOINT_001.md Section 4.

const path = require('path');
const xlsx = require('xlsx');

const BD10_TMS_HEADER = 'Thời gian BĐ10 quét lên xe tại KT tỉnh chấp nhận TMS/ quét xuống đối với tỉnh có HUB';
const BD10_BCCP_HEADER = 'Thời gian BĐ10 đóng đi tại KT tỉnh chấp nhận (BCCP)/ XNĐ đối với tỉnh có HUB';
const BD10_NUMBER_HEADER = 'Số hiệu BĐ10 quét lên xe tại KT tỉnh chấp nhận / XNĐ đối với tỉnh có HUB';

// source header -> [fact_f12 column, type]
const F12_REQUIRED_COLUMNS = Object.freeze({
    'Số hiệu bưu gửi': ['ma_bg', 'TEXT'],
    'Mã tỉnh chấp nhận': ['ma_tinh_chap_nhan', 'TEXT'],
    'Tên tỉnh chấp nhận': ['ten_tinh_chap_nhan', 'TEXT'],
    'Mã BC nhận tin/chấp nhận': ['ma_bc_chap_nhan', 'TEXT'],
    'Tên BC nhận tin/chấp nhận': ['ten_bc_chap_nhan', 'TEXT'],
    'Thời gian chấp nhận': ['thoi_gian_chap_nhan', 'TEXT'],
    [BD10_TMS_HEADER]: ['thoi_gian_bd10_quet_tms', 'TEXT'],
    [BD10_BCCP_HEADER]: ['thoi_gian_bd10_dong_di_bccp', 'TEXT'],
    'Thời gian thực hiện thực tế (giờ)': ['thoi_gian_thuc_te', 'TEXT'],
    'Đánh giá (Đạt/Không đạt)': ['danh_gia', 'TEXT'],
    'Mã Huyện': ['ma_huyen', 'TEXT'],
    'Tên Huyện': ['ten_huyen', 'TEXT'],
});

const F12_OPTIONAL_COLUMNS = Object.freeze({
    'STT': ['stt', 'INTEGER'],
    'Số hiệu lô': ['so_hieu_lo', 'TEXT'],
    'Mã KHL': ['ma_khl', 'TEXT'],
    'Tên KHL': ['ten_khl', 'TEXT'],
    'Nhóm khách hàng': ['nhom_khach_hang', 'TEXT'],
    'Loại BC (thu gom/chấp nhận)': ['loai_bc_chap_nhan', 'TEXT'],
    'Dịch vụ': ['dich_vu', 'TEXT'],
    'Loại DV': ['loai_dv', 'TEXT'],
    'Loại bg': ['loai_buu_gui', 'TEXT'],
    'Mã SPDV': ['ma_spdv', 'TEXT'],
    'Nhóm SPDV': ['nhom_spdv', 'TEXT'],
    'Khối lượng thực tế': ['khoi_luong_thuc_te', 'REAL'],
    'Khối lượng quy đổi': ['khoi_luong_quy_doi', 'TEXT'],
    'Mã BCKT': ['ma_bckt', 'TEXT'],
    'Tên BCKT': ['ten_bckt', 'TEXT'],
    'Loại BCKT': ['loai_bckt', 'TEXT'],
    'Mã tỉnh phát': ['ma_tinh_phat', 'TEXT'],
    'Tên tỉnh phát': ['ten_tinh_phat', 'TEXT'],
    'Thời gian nhận tin thu gom': ['thoi_gian_nhan_tin_thu_gom', 'TEXT'],
    'Số hiệu BĐ8 đóng đi khỏi KT tỉnh chấp nhận': ['so_hieu_bd8_dong_di', 'TEXT'],
    'Thời gian BĐ8 đóng đi tại KT tỉnh (thu gom/chấp nhận)': ['thoi_gian_bd8_dong_di', 'TEXT'],
    [BD10_NUMBER_HEADER]: ['so_hieu_bd10', 'TEXT'],
    'Nội dung lý do': ['noi_dung_ly_do', 'TEXT'],
});

const F12_ALL_COLUMNS = Object.freeze({ ...F12_REQUIRED_COLUMNS, ...F12_OPTIONAL_COLUMNS });
const F12_DB_COLUMNS = Object.freeze(Object.values(F12_ALL_COLUMNS).map(([column]) => column));
const REQUIRED_COLUMN = 'Số hiệu bưu gửi';
const METRIC_COLUMN = 'Đánh giá (Đạt/Không đạt)';
const MAX_HEADER_SCAN_ROWS = 20;

const EVALUATION_VALUES = new Set(['Đạt', 'Không đạt']);
const TIMESTAMP_COLUMNS = Object.freeze([
    'thoi_gian_nhan_tin_thu_gom', 'thoi_gian_chap_nhan', 'thoi_gian_bd8_dong_di',
    'thoi_gian_bd10_quet_tms', 'thoi_gian_bd10_dong_di_bccp',
]);
const TIMESTAMP_PATTERNS = [
    /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, // dd/MM/yyyy HH:mm:ss (portal text)
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,3})?$/, // ISO (Date cells)
];
// 'H:M', hours unbounded; both parts may be negative ('-3:-51', audit A-4). Kept exactly as given.
const ELAPSED_PATTERN = /^-?\d+:-?\d{1,2}$/;

function normalizeHeader(header) {
    if (header === null || header === undefined) return '';
    return String(header).normalize('NFC').replace(/\s+/g, ' ').trim();
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
        const text = value.normalize('NFC').trim();
        if (text === '') return null;
        if (type === 'INTEGER' || type === 'REAL') {
            const n = Number(text);
            return Number.isFinite(n) ? n : text;
        }
        return text;
    }
    if (type === 'TEXT') return String(value);
    return value;
}

function extractF12DateFromFilename(filename) {
    const base = path.basename(String(filename));
    const match = base.match(/^F1\.2-(\d{4})\.(\d{2})\.(\d{2})\.xlsx$/i);
    if (!match) {
        throw new Error(`Invalid F1.2 filename format. Expected 'F1.2-YYYY.MM.DD.xlsx', got: '${filename}'.`);
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error(`Invalid F1.2 filename date '${match[1]}.${match[2]}.${match[3]}' in '${filename}'.`);
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}

// 'dd/MM/yyyy HH:mm:ss' or 'yyyy-MM-dd ...' -> 'yyyy-MM-dd' (null when blank/unreadable)
function toIsoDay(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

// The portal day of a row: BD10 TMS scan, else the BD10 BCCP close (audit 4.3).
function bd10Day(row) {
    return toIsoDay(row.thoi_gian_bd10_quet_tms) || toIsoDay(row.thoi_gian_bd10_dong_di_bccp);
}

function elapsedMinutes(text) {
    if (text === null || text === undefined || !ELAPSED_PATTERN.test(String(text))) return null;
    const [hours, minutes] = String(text).split(':').map(Number);
    return hours * 60 + minutes;
}

function validateParsedValues(rows) {
    const problems = [];
    const note = (label, row, value, expected) => {
        if (problems.length < 5) problems.push(`'${label}' = "${value}" (parcel ${row.ma_bg}), expected ${expected}`);
    };
    let count = 0;
    for (const row of rows) {
        if (row.danh_gia !== null && !EVALUATION_VALUES.has(row.danh_gia)) {
            count++; note(METRIC_COLUMN, row, row.danh_gia, 'Đạt | Không đạt | empty');
        }
        for (const column of TIMESTAMP_COLUMNS) {
            const value = row[column];
            if (value !== null && !TIMESTAMP_PATTERNS.some((pattern) => pattern.test(String(value)))) {
                count++; note(column, row, value, 'dd/MM/yyyy HH:mm:ss or yyyy-MM-dd HH:mm:ss');
            }
        }
        if (row.thoi_gian_thuc_te !== null && !ELAPSED_PATTERN.test(String(row.thoi_gian_thuc_te))) {
            count++; note('Thời gian thực hiện thực tế (giờ)', row, row.thoi_gian_thuc_te, 'H:M (may be negative)');
        }
    }
    if (count) {
        throw new Error(`Invalid F1.2 HUE Excel data. ${count} unexpected value(s), e.g. ${problems.join('; ')}.`);
    }
}

function parseF12HueExcel(buffer, filename) {
    const ngayDoKiem = extractF12DateFromFilename(filename);
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
        throw new Error(`Invalid F1.2 HUE Excel format. Required column '${REQUIRED_COLUMN}' not found within the first ${MAX_HEADER_SCAN_ROWS} rows.`);
    }

    const headers = rawData[headerRowIdx].map(normalizeHeader);
    const missingHeaders = Object.keys(F12_REQUIRED_COLUMNS).filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
        throw new Error(`Invalid F1.2 HUE Excel format. Missing expected column(s): ${missingHeaders.join(', ')}.`);
    }

    const seenHeaders = new Map();
    for (const header of headers) {
        if (header && F12_ALL_COLUMNS[header]) seenHeaders.set(header, (seenHeaders.get(header) || 0) + 1);
    }
    const duplicated = [...seenHeaders.entries()].filter(([, count]) => count > 1).map(([header]) => header);
    if (duplicated.length) {
        throw new Error(`Invalid F1.2 HUE Excel format. Duplicated column(s): ${duplicated.join(', ')}.`);
    }

    const unmappedHeaders = headers.filter((header) => header && !F12_ALL_COLUMNS[header]);
    const missingOptionalHeaders = Object.keys(F12_OPTIONAL_COLUMNS).filter((header) => !headers.includes(header));
    const maBgIdx = headers.indexOf(REQUIRED_COLUMN);
    const colIndexMap = headers
        .map((header, idx) => ({ idx, spec: F12_ALL_COLUMNS[header] }))
        .filter((item) => item.spec);

    const parsedData = [];
    const seenParcels = new Set();
    for (const row of rawData.slice(headerRowIdx + 1)) {
        if (!row || row[maBgIdx] === null || row[maBgIdx] === undefined || String(row[maBgIdx]).trim() === '') continue;
        const item = { ngay_do_kiem: ngayDoKiem };
        for (const column of F12_DB_COLUMNS) item[column] = null;
        for (const { idx, spec } of colIndexMap) item[spec[0]] = coerce(row[idx], spec[1]);
        // the portal prefixes the BD10 number with a back-tick to keep Excel from turning it into a number
        if (typeof item.so_hieu_bd10 === 'string') item.so_hieu_bd10 = item.so_hieu_bd10.replace(/^`+/, '') || null;
        if (seenParcels.has(item.ma_bg)) {
            throw new Error(`Invalid F1.2 HUE Excel data. Parcel ${item.ma_bg} appears more than once.`);
        }
        seenParcels.add(item.ma_bg);
        parsedData.push(item);
    }

    validateParsedValues(parsedData);

    // PD-F12-6: the rows must belong to the day of the file name (BD10 date), otherwise the file was
    // renamed to the wrong day. A few rows of a neighbouring day are reported, not refused.
    let rowsOnDate = 0;
    let rowsWithoutBd10 = 0;
    for (const item of parsedData) {
        const day = bd10Day(item);
        if (day === null) rowsWithoutBd10++;
        else if (day === ngayDoKiem) rowsOnDate++;
    }
    const datedRows = parsedData.length - rowsWithoutBd10;
    if (datedRows > 0 && rowsOnDate * 2 < datedRows) {
        throw new Error(`Invalid F1.2 HUE Excel data. Only ${rowsOnDate} of ${datedRows} parcels have their BĐ10 on ${ngayDoKiem}; the file name date does not match the data.`);
    }

    // Portal rating vs the 10 h rule (audit A-5): reported only, the portal value is what is stored.
    let ratingRuleMismatches = 0;
    for (const item of parsedData) {
        const minutes = elapsedMinutes(item.thoi_gian_thuc_te);
        if (minutes === null || item.danh_gia === null) continue;
        if ((minutes <= 600) !== (item.danh_gia === 'Đạt')) ratingRuleMismatches++;
    }

    return {
        parsedData,
        totalParsed: parsedData.length,
        ngayDoKiem,
        dbColumns: ['ngay_do_kiem', ...F12_DB_COLUMNS],
        columnCount: headers.length,
        missingOptionalHeaders,
        unmappedHeaders,
        dateCheck: { rowsOnDate, rowsOtherDate: datedRows - rowsOnDate, rowsWithoutBd10 },
        ratingRuleMismatches,
    };
}

module.exports = {
    extractF12DateFromFilename,
    parseF12HueExcel,
    elapsedMinutes,
    F12_REQUIRED_COLUMNS,
    F12_OPTIONAL_COLUMNS,
    F12_ALL_COLUMNS,
    F12_DB_COLUMNS,
    REQUIRED_COLUMN,
    METRIC_COLUMN,
};
