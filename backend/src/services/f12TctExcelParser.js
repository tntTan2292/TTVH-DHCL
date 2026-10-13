'use strict';

// F12-PHASE-4 - F1.2 (thu gom buu gui lien tinh) TCT national parser.
//
// The TCT file is the SUMMARY report at national scope: one row per ACCEPTING province (the BC and KHL
// columns are empty at this grouping). Layout (F12-MODULE-PLAN Checkpoint Section 5): two merged header
// rows, a column-number legend row, the GRAND-TOTAL row first (no code), then the body. Units include
// EMS ('01', text), the Ha Noi / HCM centres and Binh Duong besides the 34 ranked provinces; all are
// stored, only the 34 are ranked (PD-F12-7). The total row must equal the sum of the body, codes are
// text, the published rate is kept as its raw text ('92.16%'), the business date comes from the file name.
//
// Completeness rule: all 34 frozen national-ranking province codes must appear as an accepting province.

const path = require('path');
const xlsx = require('xlsx');
const { extractF12DateFromFilename } = require('./f12HueExcelParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');

const MAX_HEADER_SCAN_ROWS = 20;

// column index -> [db column, kind]; kind 'int' | 'code' | 'name' | 'count' | 'text'
const COLUMNS = Object.freeze([
    [0, 'stt', 'int'],
    [1, 'ma_tinh_chap_nhan', 'code'],
    [2, 'ten_tinh_chap_nhan', 'name'],
    [3, 'ma_bc_chap_nhan', 'code'],
    [4, 'ten_bc_chap_nhan', 'name'],
    [5, 'ma_khl', 'code'],
    [6, 'ten_khl', 'name'],
    [7, 'sl_bd10_dong_di', 'count'],
    [8, 'sl_bd10_quet_tms', 'count'],
    [9, 'sl_dung_qd', 'count'],
    [10, 'tl_dung_qd', 'text'],
    [11, 'sl_qua_qd', 'count'],
    [12, 'sl_chua_du_thong_tin', 'count'],
    [13, 'sl_tg_le_10h', 'count'],
    [14, 'sl_tg_le_12h', 'count'],
    [15, 'sl_tg_12_24h', 'count'],
    [16, 'sl_tg_24_36h', 'count'],
    [17, 'sl_tg_36_48h', 'count'],
    [18, 'sl_tg_tren_48h', 'count'],
    [19, 'sl_loai_tru', 'count'],
]);
const COUNT_COLUMNS = Object.freeze(COLUMNS.filter(([, , kind]) => kind === 'count'));
const F12_TCT_DB_COLUMNS = Object.freeze(COLUMNS.map(([, column]) => column));

// [row 0 or 1 of the header block, column index, phrase that must appear (lower case)]
const HEADER_ANCHORS = Object.freeze([
    [0, 1, 'mã tỉnh chấp nhận'],
    [0, 3, 'mã bc nhận tin'],
    [0, 7, 'bđ10 đóng đi'],
    [0, 8, 'quét tms'],
    [0, 9, '<= 10 giờ'],
    [0, 10, 'tỷ lệ'],
    [0, 11, 'quá quy định'],
    [0, 12, 'chưa đủ thông tin'],
    [0, 13, 'thời gian thực hiện'],
    [0, 19, 'loại trừ'],
    [1, 13, '<=10'],
    [1, 14, '<=12'],
    [1, 15, '>12'],
    [1, 18, '> 48'],
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
        throw new Error(`Invalid F1.2 TCT Excel data. '${columnName}' = "${value}" in ${rowLabel}, expected a whole count.`);
    }
    return n;
}

function parseF12TctExcel(buffer, filename) {
    const ngayDoKiem = extractF12DateFromFilename(path.basename(String(filename)));
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
        throw new Error(`Invalid F1.2 TCT Excel format. Header 'TT / Mã tỉnh chấp nhận' not found within the first ${MAX_HEADER_SCAN_ROWS} rows.`);
    }

    const headerBlock = [rawData[headerRowIdx] || [], rawData[headerRowIdx + 1] || []];
    const missingAnchors = HEADER_ANCHORS
        .filter(([rowOffset, index, phrase]) => !normalize(headerBlock[rowOffset][index]).toLowerCase().includes(phrase))
        .map(([, index, phrase]) => `column ${index + 1} (${phrase})`);
    if (missingAnchors.length) {
        throw new Error(`Invalid F1.2 TCT Excel format. Unexpected layout at: ${missingAnchors.join(', ')}.`);
    }

    // body = everything after the two header rows and the column-number legend row
    const bodyRows = rawData.slice(headerRowIdx + 3);
    const parsedData = [];
    const codeLessRows = []; // the grand total plus, on most days, a few parcels TCT could not assign to a province
    const seenProvinces = new Set();

    bodyRows.forEach((row, offset) => {
        if (!Array.isArray(row) || row.every((cell) => cell === null || normalize(cell) === '')) return;
        const rowNumber = headerRowIdx + 4 + offset;
        const acceptCode = toCode(row[1]);
        if (!acceptCode) {
            if (typeof row[7] === 'number') { codeLessRows.push({ row, rowNumber }); return; }
            throw new Error(`Invalid F1.2 TCT Excel data. Row ${rowNumber} has no accepting province code.`);
        }
        if (toCode(row[3]) || toCode(row[5])) {
            throw new Error(`Invalid F1.2 TCT Excel format. Row ${rowNumber} is grouped by office or customer; export the report grouped by province.`);
        }
        const rowLabel = `row ${rowNumber} (${acceptCode})`;
        if (seenProvinces.has(acceptCode)) {
            throw new Error(`Invalid F1.2 TCT Excel data. Accepting province ${acceptCode} appears more than once (${rowLabel}).`);
        }
        seenProvinces.add(acceptCode);

        const item = { ngay_do_kiem: ngayDoKiem };
        for (const [index, column, kind] of COLUMNS) {
            const value = row[index];
            if (kind === 'code') item[column] = toCode(value);
            else if (kind === 'name' || kind === 'text') item[column] = normalize(value) || null;
            else if (kind === 'int') item[column] = value !== null && Number.isFinite(Number(value)) ? Number(value) : null;
            else item[column] = toCount(value, column, rowLabel);
        }
        parsedData.push(item);
    });

    if (!parsedData.length) {
        throw new Error('Invalid F1.2 TCT Excel format. No province rows found.');
    }

    // The published grand total must equal the body, otherwise the file was edited or truncated.
    // Rows without an accepting province are not stored (they cannot be ranked); one of them is the grand total
    // (its position varies between exports), the others are unassigned parcels that the total still counts.
    let totalRow = null;
    const unassigned = Object.fromEntries(COUNT_COLUMNS.map(([, column]) => [column, 0])); // counts of the unstored rows
    if (codeLessRows.length) {
        const sumOf = (rows, index) => rows.reduce((sum, row) => sum + toCount(row[index], '', 'unassigned row'), 0);
        const differences = (candidate) => {
            const others = codeLessRows.filter((entry) => entry !== candidate).map((entry) => entry.row);
            return COUNT_COLUMNS.flatMap(([index, column]) => {
                const expected = toCount(candidate.row[index], column, 'grand-total row');
                const actual = parsedData.reduce((sum, item) => sum + item[column], 0) + sumOf(others, index);
                return expected === actual ? [] : [`${column} total ${expected} vs rows ${actual}`];
            });
        };
        const matching = codeLessRows.find((candidate) => differences(candidate).length === 0);
        if (!matching) {
            const largest = codeLessRows.reduce((best, entry) => (entry.row[7] > best.row[7] ? entry : best));
            throw new Error(`Invalid F1.2 TCT Excel data. Grand total does not equal the sum of the rows: ${differences(largest).join('; ')}.`);
        }
        totalRow = matching.row;
        for (const entry of codeLessRows.filter((candidate) => candidate !== matching)) {
            for (const [index, column] of COUNT_COLUMNS) unassigned[column] += toCount(entry.row[index], column, 'unassigned row');
        }
    }

    const acceptingCodes = new Set(parsedData.map((item) => item.ma_tinh_chap_nhan));
    const missing = NATIONAL_RANKED_PROVINCE_CODES.filter((code) => !acceptingCodes.has(code));
    if (missing.length) {
        throw new Error(`Invalid F1.2 TCT Excel data. Missing accepting province code(s): ${missing.join(', ')}.`);
    }

    return {
        parsedData,
        totalParsed: parsedData.length,
        ngayDoKiem,
        dbColumns: ['ngay_do_kiem', ...F12_TCT_DB_COLUMNS],
        grandTotalChecked: Boolean(totalRow),
        unassigned, // not stored; the portal's outer summary counts them
    };
}

module.exports = {
    parseF12TctExcel,
    F12_TCT_DB_COLUMNS,
    F12_TCT_COLUMNS: COLUMNS,
};
