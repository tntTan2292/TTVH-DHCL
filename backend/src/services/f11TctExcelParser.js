'use strict';

// F11-PHASE-4 - F1.1 (toan trinh noi tinh) TCT national parser.
//
// The TCT file is the SUMMARY report at national scope: one row per (accepting province x delivering
// province); the BC and KHL columns are empty. Layout (audited in F11-MODULE-PLAN Checkpoint Section
// 25): header row, a sub-header row, a column-number legend row, the GRAND-TOTAL row first, then the
// body. The total row is skipped (and, when present, must equal the sum of the body or the file is
// refused), codes are text, and the business date comes ONLY from the file name.
//
// Completeness rule (as F4.1): all 34 frozen national-ranking province codes must appear as a
// DELIVERING province (ma_tinh_phat); the number of rows is not checked.

const path = require('path');
const xlsx = require('xlsx');
const { extractF11DateFromFilename } = require('./f11HueExcelParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');

const MAX_HEADER_SCAN_ROWS = 20;

// column index -> [db column, kind]; kind 'code' | 'name' | 'count' | 'text' (published percentage, kept raw)
const COLUMNS = Object.freeze([
    [0, 'stt', 'int'],
    [1, 'ma_tinh_chap_nhan', 'code'],
    [2, 'ten_tinh_chap_nhan', 'name'],
    [3, 'ma_bc_chap_nhan', 'code'],
    [4, 'ten_bc_chap_nhan', 'name'],
    [5, 'ma_tinh_phat', 'code'],
    [6, 'ten_tinh_phat', 'name'],
    [7, 'ma_bc_phat', 'code'],
    [8, 'ten_bc_phat', 'name'],
    [9, 'ma_khl', 'code'],
    [10, 'ten_khl', 'name'],
    [11, 'sl_co_thong_tin_phat', 'count'],
    [12, 'sl_ptc_nop_tien_ch', 'count'],
    [13, 'sl_ptc_nop_tien', 'count'],
    [14, 'sl_dung_qd_24h', 'count'],
    [15, 'tl_dung_qd_24h', 'text'],
    [16, 'sl_qua_qd_24h', 'count'],
    [17, 'sl_chua_du_thong_tin', 'count'],
    [18, 'sl_theo_chi_tieu', 'count'],
    [19, 'sl_dung_chi_tieu', 'count'],
    [20, 'tl_dung_chi_tieu', 'text'],
    [21, 'sl_qua_chi_tieu', 'count'],
    [22, 'tl_qua_chi_tieu', 'text'],
    [23, 'sl_tg_le_24h', 'count'],
    [24, 'sl_tg_24_36h', 'count'],
    [25, 'sl_tg_36_48h', 'count'],
    [26, 'sl_tg_48_60h', 'count'],
    [27, 'sl_tg_tren_60h', 'count'],
    [28, 'sl_loai_tru', 'count'],
]);
const COUNT_INDEXES = Object.freeze(COLUMNS.filter(([, , kind]) => kind === 'count').map(([index]) => index));
const F11_TCT_DB_COLUMNS = Object.freeze(COLUMNS.map(([, column]) => column));

// [row 0 or 1 of the header block, column index, phrase that must appear (lower case)]
const HEADER_ANCHORS = Object.freeze([
    [0, 1, 'mã tỉnh chấp nhận'],
    [0, 5, 'mã tỉnh phát'],
    [0, 11, 'có thông tin phát'],
    [0, 12, 'phát thành công/nộp tiền/chuyển hoàn'],
    [0, 13, 'ptc/nộp tiền'],
    [0, 14, '<= 24h'],
    [0, 16, 'quá quy định'],
    [0, 17, 'chưa đủ thông tin'],
    [0, 18, 'kpi 2026'],
    [0, 23, 'thời gian thực hiện'],
    [0, 28, 'loại trừ'],
    [1, 19, 'đúng qđ theo chi tiêu'],
    [1, 21, 'quá quy định theo chi tiêu'],
    [1, 23, '<=24'],
    [1, 27, '> 60'],
]);

function normalize(value) {
    return String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

function toCode(value) {
    const text = normalize(value);
    return text === '' ? null : text;
}

function toCount(value, columnName, rowLabel) {
    if (value === null || value === undefined || normalize(value) === '') return 0;
    const n = typeof value === 'number' ? value : Number(String(value).replace(/[.,\s]/g, ''));
    if (!Number.isInteger(n) || n < 0) {
        throw new Error(`Invalid F1.1 TCT Excel data. '${columnName}' = "${value}" in ${rowLabel}, expected a whole count.`);
    }
    return n;
}

function parseF11TctExcel(buffer, filename) {
    const ngayDoKiem = extractF11DateFromFilename(path.basename(String(filename)));
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    let headerRowIdx = -1;
    const scanLimit = Math.min(rawData.length, MAX_HEADER_SCAN_ROWS);
    for (let i = 0; i < scanLimit; i++) {
        const row = Array.isArray(rawData[i]) ? rawData[i] : [];
        if (normalize(row[0]) === 'TT' && normalize(row[1]).toLowerCase() === 'mã tỉnh chấp nhận') {
            headerRowIdx = i;
            break;
        }
    }
    if (headerRowIdx === -1) {
        throw new Error(`Invalid F1.1 TCT Excel format. Header 'TT / Mã tỉnh chấp nhận' not found within the first ${MAX_HEADER_SCAN_ROWS} rows.`);
    }

    const headerBlock = [rawData[headerRowIdx] || [], rawData[headerRowIdx + 1] || []];
    const missingAnchors = HEADER_ANCHORS
        .filter(([rowOffset, index, phrase]) => !normalize(headerBlock[rowOffset][index]).toLowerCase().includes(phrase))
        .map(([, index, phrase]) => `column ${index + 1} (${phrase})`);
    if (missingAnchors.length) {
        throw new Error(`Invalid F1.1 TCT Excel format. Unexpected layout at: ${missingAnchors.join(', ')}.`);
    }

    // body = everything after the header block and the column-number legend row
    const bodyRows = rawData.slice(headerRowIdx + 3);
    const parsedData = [];
    let totalRow = null;
    const seenPairs = new Set();

    bodyRows.forEach((row, offset) => {
        if (!Array.isArray(row) || row.every((cell) => cell === null || normalize(cell) === '')) return;
        const acceptCode = toCode(row[1]);
        const deliverCode = toCode(row[5]);
        if (!acceptCode && !deliverCode) {
            if (!totalRow && typeof row[12] === 'number') totalRow = row; // grand total (first data row)
            return;
        }
        if (!acceptCode || !deliverCode) {
            throw new Error(`Invalid F1.1 TCT Excel data. Row ${headerRowIdx + 4 + offset} has only one of the two province codes.`);
        }
        const rowLabel = `row ${headerRowIdx + 4 + offset} (${acceptCode} -> ${deliverCode})`;
        const pairKey = `${acceptCode}>${deliverCode}`;
        if (seenPairs.has(pairKey)) {
            throw new Error(`Invalid F1.1 TCT Excel data. Duplicate province pair ${acceptCode} -> ${deliverCode} (${rowLabel}).`);
        }
        seenPairs.add(pairKey);

        const item = { ngay_do_kiem: ngayDoKiem };
        for (const [index, column, kind] of COLUMNS) {
            const value = row[index];
            if (kind === 'code') item[column] = toCode(value);
            else if (kind === 'name') item[column] = normalize(value) || null;
            else if (kind === 'text') item[column] = normalize(value) || null;
            else if (kind === 'int') item[column] = Number.isFinite(Number(value)) && value !== null ? Number(value) : null;
            else item[column] = toCount(value, column, rowLabel);
        }
        parsedData.push(item);
    });

    if (!parsedData.length) {
        throw new Error('Invalid F1.1 TCT Excel format. No province rows found.');
    }

    // The published grand total must equal the body, otherwise the file was edited or truncated.
    if (totalRow) {
        const mismatches = [];
        for (const index of COUNT_INDEXES) {
            const expected = toCount(totalRow[index], COLUMNS[index][1], 'grand-total row');
            const actual = parsedData.reduce((sum, item) => sum + item[COLUMNS[index][1]], 0);
            if (expected !== actual) mismatches.push(`${COLUMNS[index][1]} total ${expected} vs rows ${actual}`);
        }
        if (mismatches.length) {
            throw new Error(`Invalid F1.1 TCT Excel data. Grand total does not equal the sum of the rows: ${mismatches.join('; ')}.`);
        }
    }

    // All 34 ranked provinces must be present as a delivering province.
    const deliveringCodes = new Set(parsedData.map((item) => item.ma_tinh_phat));
    const missing = NATIONAL_RANKED_PROVINCE_CODES.filter((code) => !deliveringCodes.has(code));
    if (missing.length) {
        throw new Error(`Invalid F1.1 TCT Excel data. Missing delivering province code(s): ${missing.join(', ')}.`);
    }

    return {
        parsedData,
        totalParsed: parsedData.length,
        ngayDoKiem,
        dbColumns: ['ngay_do_kiem', ...F11_TCT_DB_COLUMNS],
        grandTotalChecked: Boolean(totalRow),
    };
}

module.exports = {
    parseF11TctExcel,
    F11_TCT_DB_COLUMNS,
    F11_TCT_COLUMNS: COLUMNS,
};
