'use strict';

// F42-PHASE-1 - F4.2 (chat luong phat giao buu ta) HUE row-level parser.
//
// Source: the DKCL report "F4.2 chat luong phat giao buu ta chi tiet" exported as CSV (UTF-8 with BOM) or
// as Excel; one row per delivery handed to a postman (GBT = giao buu ta). Same contract as the other
// readers: parse by HEADER NAME (NFC, collapsed spaces; the portal pads some names), never by position;
// required headers are a hard error that names them, optional ones are NULL when absent, unknown extra
// headers are reported, a duplicated mapped header refuses the file.
//
// Two portal quirks (audit: docs/06_REVIEWS/Shared/F42-MODULE-PLAN_CHECKPOINT_001.md Section 2):
//   * free-text names are not quoted, so a customer name containing a comma makes the CSV row wider than
//     the header. The row is re-joined by anchoring on the GBT timestamp (the first column whose value is
//     a timestamp) and merging the surplus fields back into 'Tên KHL'; the merge is verified (the route code
//     after it must be digits) and a row that cannot be repaired refuses the file.
//   * the business date is the GBT date (file name only carries the export time): the file name
//     'F4.2-YYYY.MM.DD.csv|xlsx' carries it and is checked against the rows.
//
// The portal rating and elapsed time are stored exactly as given and never recomputed. A blank rating
// (not delivered yet / returned) is kept as NULL: it stays in the F4.2 denominator (PD-F42-2).

const path = require('path');
const xlsx = require('xlsx');

// source header -> [fact_f42 column, type]
const F42_REQUIRED_COLUMNS = Object.freeze({
    'Mã tỉnh phát': ['ma_tinh_phat', 'TEXT'],
    'Mã huyện phát': ['ma_huyen_phat', 'TEXT'],
    'Tên huyện phát': ['ten_huyen_phat', 'TEXT'],
    'Mã BC phát': ['ma_bc_phat', 'TEXT'],
    'Tên BC phát': ['ten_bc_phat', 'TEXT'],
    'Mã bưu tá': ['ma_buu_ta', 'TEXT'],
    'Tên bưu tá': ['ten_buu_ta', 'TEXT'],
    'Số hiệu bg': ['ma_bg', 'TEXT'],
    'Thời gian GBT': ['thoi_gian_gbt', 'TEXT'],
    'Thời gian PTC': ['thoi_gian_ptc', 'TEXT'],
    'Thời gian thực hiện': ['thoi_gian_thuc_hien', 'TEXT'],
    'Đánh giá': ['danh_gia', 'TEXT'],
});

const F42_OPTIONAL_COLUMNS = Object.freeze({
    'Tên tỉnh phát': ['ten_tinh_phat', 'TEXT'],
    'Địa bàn phát (Trung tâm tỉnh/Huyện thông thường/Huyện khó khăn/Huyện đảo)': ['dia_ban_phat', 'TEXT'],
    'Mã HRM': ['ma_hrm', 'TEXT'],
    'Loại bg': ['loai_buu_gui', 'TEXT'],
    'Dịch vụ': ['dich_vu', 'TEXT'],
    'Loại DV': ['loai_dv', 'TEXT'],
    'Nhóm SPDV': ['nhom_spdv', 'TEXT'],
    'Mã SPDV': ['ma_spdv', 'TEXT'],
    'Số hiệu lô': ['so_hieu_lo', 'TEXT'],
    'Số Tiền COD': ['so_tien_cod', 'REAL'],
    'Khối lượng thực tế': ['khoi_luong_thuc_te', 'REAL'],
    'Khối lượng quy đổi': ['khoi_luong_quy_doi', 'TEXT'],
    'Tên hàng hoá': ['ten_hang_hoa', 'TEXT'],
    'Mã KHL': ['ma_khl', 'TEXT'],
    'Tên KHL': ['ten_khl', 'TEXT'],
    'Mã tuyến phát': ['ma_tuyen_phat', 'TEXT'],
    'Tên tuyến phát': ['ten_tuyen_phat', 'TEXT'],
    'Loại tuyến phát': ['loai_tuyen_phat', 'TEXT'],
    'Thời gian chuyển hoàn': ['thoi_gian_chuyen_hoan', 'TEXT'],
    'Thời gian nộp tiền': ['thoi_gian_nop_tien', 'TEXT'],
});

const F42_ALL_COLUMNS = Object.freeze({ ...F42_REQUIRED_COLUMNS, ...F42_OPTIONAL_COLUMNS });
const F42_DB_COLUMNS = Object.freeze(Object.values(F42_ALL_COLUMNS).map(([column]) => column));
const REQUIRED_COLUMN = 'Số hiệu bg';
const GBT_HEADER = 'Thời gian GBT';
const NAME_HEADER = 'Tên KHL';
const ROUTE_CODE_HEADER = 'Mã tuyến phát';
const MAX_HEADER_SCAN_ROWS = 20;

const EVALUATION_VALUES = new Set(['Đạt', 'Không đạt']);
const TIMESTAMP_COLUMNS = Object.freeze([
    'thoi_gian_gbt', 'thoi_gian_ptc', 'thoi_gian_chuyen_hoan', 'thoi_gian_nop_tien',
]);
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,3})?$/;
const TIMESTAMP_START = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;
// 'H:M', hours unbounded; both parts may be negative ('-19:-25'). Kept exactly as given.
const ELAPSED_PATTERN = /^-?\d+:-?\d{1,2}$/;
// DKCL rule of the report: delivered within 11,5 h (11:30) is "Đạt". Reported only, never applied.
const RULE_MINUTES = 11 * 60 + 30;

function normalizeHeader(header) {
    if (header === null || header === undefined) return '';
    return String(header).normalize('NFC').replace(/\s+/g, ' ').trim();
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatDate(value) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())} ${pad2(value.getHours())}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`;
}

function coerce(value, type) {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return formatDate(value);
    if (typeof value === 'string') {
        const text = value.normalize('NFC').replace(/ /g, ' ').trim();
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

// 'yyyy-MM-dd HH:mm:ss(.000)' -> 'yyyy-MM-dd HH:mm:ss'
function trimFraction(value) {
    return typeof value === 'string' ? value.replace(/(\d{2}:\d{2}:\d{2})\.\d+$/, '$1') : value;
}

function extractF42DateFromFilename(filename) {
    const base = path.basename(String(filename));
    const match = base.match(/^F4\.2-(\d{4})\.(\d{2})\.(\d{2})\.(xlsx|csv)$/i);
    if (!match) {
        throw new Error(`Invalid F4.2 filename format. Expected 'F4.2-YYYY.MM.DD.csv' or 'F4.2-YYYY.MM.DD.xlsx', got: '${filename}'.`);
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error(`Invalid F4.2 filename date '${match[1]}.${match[2]}.${match[3]}' in '${filename}'.`);
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}

// Minimal RFC-4180 reader (quotes, doubled quotes, CR/LF, newlines inside quotes) -> array of string arrays.
function readCsvRows(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
            } else field += ch;
        } else if (ch === '"' && field === '') {
            quoted = true;
        } else if (ch === ',') {
            row.push(field); field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            rows.push(row); row = [];
        } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((cell) => cell !== ''));
}

function readSourceRows(buffer, filename) {
    const isCsv = /\.csv$/i.test(String(filename));
    if (isCsv) {
        const text = Buffer.from(buffer).toString('utf8').replace(/^﻿/, '');
        return { rawData: readCsvRows(text), isCsv: true };
    }
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return { rawData: xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null }), isCsv: false };
}

// Brings a CSV row wider than the header back to the header width (see the file header).
function repairCsvRow(row, headers, indexes, lineNumber) {
    if (row.length === headers.length) return row;
    const fail = (why) => new Error(`Invalid F4.2 HUE CSV. Line ${lineNumber} has ${row.length} fields instead of ${headers.length} and ${why}.`);
    if (row.length < headers.length) throw fail('cannot be repaired (too few fields)');
    const extra = row.length - headers.length;
    if (indexes.gbt < 0 || indexes.name < 0) throw fail('cannot be repaired (header \'Tên KHL\' or \'Thời gian GBT\' missing)');
    // the GBT timestamp sits `extra` fields to the right of its header position
    if (!TIMESTAMP_START.test(String(row[indexes.gbt + extra] ?? '').trim()) || TIMESTAMP_START.test(String(row[indexes.gbt] ?? '').trim())) {
        throw fail('cannot be repaired (GBT time not where expected)');
    }
    const repaired = [
        ...row.slice(0, indexes.name),
        row.slice(indexes.name, indexes.name + extra + 1).join(','),
        ...row.slice(indexes.name + extra + 1),
    ];
    if (indexes.routeCode >= 0 && !/^\d*$/.test(String(repaired[indexes.routeCode] ?? '').trim())) {
        throw fail('cannot be repaired (route code is not a number after merging the customer name)');
    }
    return repaired;
}

function toIsoDay(value) {
    if (value === null || value === undefined) return null;
    const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
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
            count++; note('Đánh giá', row, row.danh_gia, 'Đạt | Không đạt | empty');
        }
        for (const column of TIMESTAMP_COLUMNS) {
            const value = row[column];
            if (value !== null && !TIMESTAMP_PATTERN.test(String(value))) {
                count++; note(column, row, value, 'yyyy-MM-dd HH:mm:ss');
            }
        }
        if (row.thoi_gian_thuc_hien !== null && !ELAPSED_PATTERN.test(String(row.thoi_gian_thuc_hien))) {
            count++; note('Thời gian thực hiện', row, row.thoi_gian_thuc_hien, 'H:M (may be negative)');
        }
    }
    if (count) {
        throw new Error(`Invalid F4.2 HUE data. ${count} unexpected value(s), e.g. ${problems.join('; ')}.`);
    }
}

function parseF42Hue(buffer, filename) {
    const ngayDoKiem = extractF42DateFromFilename(filename);
    const { rawData, isCsv } = readSourceRows(buffer, filename);

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
        throw new Error(`Invalid F4.2 HUE format. Required column '${REQUIRED_COLUMN}' not found within the first ${MAX_HEADER_SCAN_ROWS} rows.`);
    }

    const headers = rawData[headerRowIdx].map(normalizeHeader);
    const missingHeaders = Object.keys(F42_REQUIRED_COLUMNS).filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
        throw new Error(`Invalid F4.2 HUE format. Missing expected column(s): ${missingHeaders.join(', ')}.`);
    }

    const seenHeaders = new Map();
    for (const header of headers) {
        if (header && F42_ALL_COLUMNS[header]) seenHeaders.set(header, (seenHeaders.get(header) || 0) + 1);
    }
    const duplicated = [...seenHeaders.entries()].filter(([, count]) => count > 1).map(([header]) => header);
    if (duplicated.length) {
        throw new Error(`Invalid F4.2 HUE format. Duplicated column(s): ${duplicated.join(', ')}.`);
    }

    const unmappedHeaders = headers.filter((header) => header && !F42_ALL_COLUMNS[header]);
    const missingOptionalHeaders = Object.keys(F42_OPTIONAL_COLUMNS).filter((header) => !headers.includes(header));
    const maBgIdx = headers.indexOf(REQUIRED_COLUMN);
    const colIndexMap = headers
        .map((header, idx) => ({ idx, spec: F42_ALL_COLUMNS[header] }))
        .filter((item) => item.spec);
    const indexes = { gbt: headers.indexOf(GBT_HEADER), name: headers.indexOf(NAME_HEADER), routeCode: headers.indexOf(ROUTE_CODE_HEADER) };

    const parsedData = [];
    const seenKeys = new Set();
    let repairedRows = 0;
    rawData.slice(headerRowIdx + 1).forEach((sourceRow, offset) => {
        if (!sourceRow || sourceRow.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')) return;
        const lineNumber = headerRowIdx + 2 + offset;
        let row = sourceRow;
        if (isCsv && row.length !== headers.length) { row = repairCsvRow(row, headers, indexes, lineNumber); repairedRows++; }
        if (row[maBgIdx] === null || row[maBgIdx] === undefined || String(row[maBgIdx]).trim() === '') return;
        const item = { ngay_do_kiem: ngayDoKiem };
        for (const column of F42_DB_COLUMNS) item[column] = null;
        for (const { idx, spec } of colIndexMap) item[spec[0]] = coerce(row[idx], spec[1]);
        for (const column of TIMESTAMP_COLUMNS) item[column] = trimFraction(item[column]);
        if (item.thoi_gian_gbt === null) {
            throw new Error(`Invalid F4.2 HUE data. Parcel ${item.ma_bg} (line ${lineNumber}) has no GBT time; the report is keyed by the GBT day.`);
        }
        if (item.ma_buu_ta === null || item.ma_bc_phat === null) {
            throw new Error(`Invalid F4.2 HUE data. Parcel ${item.ma_bg} (line ${lineNumber}) has no postman code or no delivery office code.`);
        }
        const key = `${item.ma_bg}|${item.ma_buu_ta}|${item.thoi_gian_gbt}`;
        if (seenKeys.has(key)) {
            throw new Error(`Invalid F4.2 HUE data. Parcel ${item.ma_bg} appears twice for postman ${item.ma_buu_ta} at ${item.thoi_gian_gbt}.`);
        }
        seenKeys.add(key);
        parsedData.push(item);
    });

    validateParsedValues(parsedData);

    // The rows must belong to the day of the file name (GBT date), otherwise the file was renamed to the wrong
    // day or exported for a wider range. A few rows of a neighbouring day are reported, not refused.
    let rowsOnDate = 0;
    for (const item of parsedData) {
        if (toIsoDay(item.thoi_gian_gbt) === ngayDoKiem) rowsOnDate++;
    }
    if (parsedData.length > 0 && rowsOnDate * 2 < parsedData.length) {
        throw new Error(`Invalid F4.2 HUE data. Only ${rowsOnDate} of ${parsedData.length} rows have their GBT on ${ngayDoKiem}; the file name date does not match the data.`);
    }

    // Portal rating vs the 11,5 h rule: reported only, the portal value is what is stored.
    let ratingRuleMismatches = 0;
    for (const item of parsedData) {
        const minutes = elapsedMinutes(item.thoi_gian_thuc_hien);
        if (minutes === null || item.danh_gia === null) continue;
        if ((minutes <= RULE_MINUTES) !== (item.danh_gia === 'Đạt')) ratingRuleMismatches++;
    }

    const count = (value) => parsedData.filter((item) => item.danh_gia === value).length;
    return {
        parsedData,
        totalParsed: parsedData.length,
        ngayDoKiem,
        dbColumns: ['ngay_do_kiem', ...F42_DB_COLUMNS],
        columnCount: headers.length,
        missingOptionalHeaders,
        unmappedHeaders,
        repairedRows,
        dateCheck: { rowsOnDate, rowsOtherDate: parsedData.length - rowsOnDate },
        ratingRuleMismatches,
        ratings: { dat: count('Đạt'), khongDat: count('Không đạt'), blank: parsedData.filter((item) => item.danh_gia === null).length },
    };
}

module.exports = {
    extractF42DateFromFilename,
    parseF42Hue,
    readCsvRows,
    elapsedMinutes,
    F42_REQUIRED_COLUMNS,
    F42_OPTIONAL_COLUMNS,
    F42_ALL_COLUMNS,
    F42_DB_COLUMNS,
    REQUIRED_COLUMN,
};
