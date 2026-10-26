'use strict';

// F42-PHASE-4 - F4.2 (chat luong phat giao buu ta) TCT national parser.
//
// The TCT file is the national report by POSTMAN (13 665 rows on 2026-10-10): two merged header rows, a
// column-number legend row, the GRAND-TOTAL row first (no province), then one row per postman. Only the
// 34 ranked provinces matter (PD-F42-6, same codes as F1.3 / F4.1), so the postman rows are added up per
// province and ONLY those 34 province rows are returned; every other row (EMS, district centres, 'Khong Xac
// Dinh'...) is dropped to keep the database light. Before dropping, the published grand total must equal the
// sum of ALL rows, otherwise the file was edited or truncated.
//
// Layout (0-based columns): 1 Ma tinh, 2 Ten tinh, 7 Ma buu ta, 10 San luong GBT co thong tin phat (the
// F4.2 denominator, already after the exclusions), 11 phat thanh cong, 13 PTC dung QD (11,5 gio, the numerator),
// 15 qua thoi gian quy dinh, 16 PKTC, 17 chuyen hoan, 18 cho chuyen hoan, 20 cho VTN/VTN, 21 chuyen tiep,
// 22 phat hoan, 23 loai tru, 24 GBT chua loai tru, 25 GBT chua co thong tin phat. The business date comes
// from the file name 'F4.2-YYYY.MM.DD.xlsx' (the file carries no date).

const path = require('path');
const xlsx = require('xlsx');
const { extractF42DateFromFilename } = require('./f42HueParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');

const MAX_HEADER_SCAN_ROWS = 20;

// [column index, db column] of the counts that are summed per province; the grand total checks the same set
const COUNT_COLUMNS = Object.freeze([
    [10, 'sl_gbt'],
    [11, 'sl_phat_thanh_cong'],
    [13, 'sl_dung_qd'],
    [15, 'sl_qua_qd'],
    [16, 'sl_pktc'],
    [17, 'sl_chuyen_hoan'],
    [18, 'sl_cho_chuyen_hoan'],
    [20, 'sl_cho_vtn'],
    [21, 'sl_chuyen_tiep'],
    [22, 'sl_phat_hoan'],
    [23, 'sl_loai_tru'],
    [24, 'sl_gbt_chua_loai_tru'],
    [25, 'sl_gbt_chua_thong_tin'],
]);
const F42_TCT_DB_COLUMNS = Object.freeze([
    'ma_tinh_phat', 'ten_tinh_phat', 'so_buu_ta', ...COUNT_COLUMNS.slice(0, 3).map(([, column]) => column),
    'tl_dung_qd', ...COUNT_COLUMNS.slice(3).map(([, column]) => column),
]);

// [header row 0|1 of the block, column index, phrase that must appear (lower case)]
const HEADER_ANCHORS = Object.freeze([
    [0, 1, 'mã tỉnh'],
    [0, 2, 'tên tỉnh'],
    [0, 7, 'mã bưu tá'],
    [0, 10, 'có thông tin phát'],
    [0, 11, 'phát thành công'],
    [0, 13, 'đúng qđ'],
    [0, 15, 'quá thời gian quy định'],
    [0, 20, 'không tính vào mẫu số'],
    [0, 23, 'loại trừ'],
    [0, 24, 'chưa loại trừ'],
    [0, 25, 'chưa có thông tin phát'],
    [1, 15, '11,5'],
    [1, 16, 'pktc'],
    [1, 17, 'chuyển hoàn'],
    [1, 20, 'vtn'],
    [1, 21, 'chuyển tiếp'],
    [1, 22, 'phát hoàn'],
]);

function normalize(value) {
    return String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

// province codes are numbers in most rows ('10' as 10) and text in others ('01')
function toCode(value) {
    const text = normalize(value);
    return text === '' ? null : text;
}

function toCount(value, columnName, rowLabel) {
    if (value === null || value === undefined || normalize(value) === '') return 0;
    const n = typeof value === 'number' ? value : Number(String(value).replace(/[.,\s]/g, ''));
    if (!Number.isInteger(n) || n < 0) {
        throw new Error(`Invalid F4.2 TCT Excel data. '${columnName}' = "${value}" in ${rowLabel}, expected a whole count.`);
    }
    return n;
}

function rateText(passed, volume) {
    return `${volume ? ((passed / volume) * 100).toFixed(2) : '0.00'}%`;
}

function parseF42Tct(buffer, filename) {
    const ngayDoKiem = extractF42DateFromFilename(path.basename(String(filename)));
    if (/\.csv$/i.test(String(filename))) {
        throw new Error('Invalid F4.2 TCT file. The national report must be the Excel export (F4.2-YYYY.MM.DD.xlsx).');
    }
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    let headerRowIdx = -1;
    const scanLimit = Math.min(rawData.length, MAX_HEADER_SCAN_ROWS);
    for (let i = 0; i < scanLimit; i++) {
        const row = Array.isArray(rawData[i]) ? rawData[i] : [];
        if (normalize(row[0]) === 'TT' && normalize(row[1]).toLowerCase() === 'mã tỉnh') {
            headerRowIdx = i;
            break;
        }
    }
    if (headerRowIdx === -1) {
        throw new Error(`Invalid F4.2 TCT Excel format. Header 'TT / Mã tỉnh' not found within the first ${MAX_HEADER_SCAN_ROWS} rows.`);
    }

    const headerBlock = [rawData[headerRowIdx] || [], rawData[headerRowIdx + 1] || []];
    const missingAnchors = HEADER_ANCHORS
        .filter(([rowOffset, index, phrase]) => !normalize(headerBlock[rowOffset][index]).toLowerCase().includes(phrase))
        .map(([, index, phrase]) => `column ${index + 1} (${phrase})`);
    if (missingAnchors.length) {
        throw new Error(`Invalid F4.2 TCT Excel format. Unexpected layout at: ${missingAnchors.join(', ')}.`);
    }

    // body = everything after the two header rows and the column-number legend row
    const bodyRows = rawData.slice(headerRowIdx + 3);
    const sums = Object.fromEntries(COUNT_COLUMNS.map(([, column]) => [column, 0]));
    const provinces = new Map();
    let totalRow = null;
    let postmanRows = 0;

    bodyRows.forEach((row, offset) => {
        if (!Array.isArray(row) || row.every((cell) => cell === null || normalize(cell) === '')) return;
        const rowNumber = headerRowIdx + 4 + offset;
        const code = toCode(row[1]);
        const postman = toCode(row[7]);
        if (!code && !postman) {
            if (totalRow) throw new Error(`Invalid F4.2 TCT Excel data. Row ${rowNumber} has no province and no postman code, and a grand-total row was already found.`);
            totalRow = row;
            return;
        }
        if (!code) throw new Error(`Invalid F4.2 TCT Excel data. Row ${rowNumber} has a postman but no province code.`);
        if (!postman) {
            throw new Error(`Invalid F4.2 TCT Excel format. Row ${rowNumber} (${code}) has no postman code; export the report grouped by postman.`);
        }
        postmanRows++;
        const rowLabel = `row ${rowNumber} (${code} / ${postman})`;
        const counts = {};
        for (const [index, column] of COUNT_COLUMNS) {
            counts[column] = toCount(row[index], column, rowLabel);
            sums[column] += counts[column];
        }
        if (!NATIONAL_RANKED_PROVINCE_CODES.includes(code)) return;
        let province = provinces.get(code);
        if (!province) {
            province = { ma_tinh_phat: code, ten_tinh_phat: normalize(row[2]) || null, so_buu_ta: 0, ...Object.fromEntries(COUNT_COLUMNS.map(([, column]) => [column, 0])) };
            provinces.set(code, province);
        }
        for (const [, column] of COUNT_COLUMNS) province[column] += counts[column];
        if (counts.sl_gbt > 0) province.so_buu_ta++;
    });

    if (!postmanRows) {
        throw new Error('Invalid F4.2 TCT Excel format. No postman rows found.');
    }
    if (!totalRow) {
        throw new Error('Invalid F4.2 TCT Excel format. Grand-total row (no province, no postman) not found.');
    }

    // The published grand total must equal the sum of every row, otherwise the file was edited or truncated.
    const differences = COUNT_COLUMNS.flatMap(([index, column]) => {
        const expected = toCount(totalRow[index], column, 'grand-total row');
        return expected === sums[column] ? [] : [`${column} total ${expected} vs rows ${sums[column]}`];
    });
    if (differences.length) {
        throw new Error(`Invalid F4.2 TCT Excel data. Grand total does not equal the sum of the rows: ${differences.join('; ')}.`);
    }

    const missing = NATIONAL_RANKED_PROVINCE_CODES.filter((code) => !provinces.has(code));
    if (missing.length) {
        throw new Error(`Invalid F4.2 TCT Excel data. Missing delivering province code(s): ${missing.join(', ')}.`);
    }

    const parsedData = NATIONAL_RANKED_PROVINCE_CODES.map((code) => {
        const province = provinces.get(code);
        return { ngay_do_kiem: ngayDoKiem, ...province, tl_dung_qd: rateText(province.sl_dung_qd, province.sl_gbt) };
    });

    return {
        parsedData,
        totalParsed: parsedData.length,
        ngayDoKiem,
        dbColumns: ['ngay_do_kiem', ...F42_TCT_DB_COLUMNS],
        postmanRows,
        grandTotalChecked: true,
        grandTotal: { sl_gbt: sums.sl_gbt, sl_dung_qd: sums.sl_dung_qd },
        // volume of the rows that are not stored (EMS, centres, unknown...): reported, never ranked
        notStored: {
            sl_gbt: sums.sl_gbt - parsedData.reduce((sum, item) => sum + item.sl_gbt, 0),
            sl_dung_qd: sums.sl_dung_qd - parsedData.reduce((sum, item) => sum + item.sl_dung_qd, 0),
        },
    };
}

module.exports = {
    parseF42Tct,
    F42_TCT_DB_COLUMNS,
    F42_TCT_COUNT_COLUMNS: COUNT_COLUMNS,
};
