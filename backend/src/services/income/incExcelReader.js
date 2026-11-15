'use strict';
/**
 * Reads the files PMTL uses (xlsx, or the csv seeds) as plain row arrays and finds header rows the way PMTL does:
 * by the names of the columns, not by position.
 */
const path = require('path');
const ExcelJS = require('exceljs');

/** lower case, no diacritics, only letters and digits: "Mã tuyến", "ma_tuyen" and "MA TUYEN" all become "matuyen". */
function norm(value) {
    return String(value == null ? '' : cellText(value))
        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
        .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function cellText(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
        if (value.result !== undefined) return cellText(value.result);
        if (value.richText) return value.richText.map((part) => part.text).join('');
        if (value.text !== undefined) return cellText(value.text);
        if (value instanceof Date) return value.toISOString();
        return '';
    }
    return String(value);
}

function cellValue(value) {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        if (value.result !== undefined) return cellValue(value.result);
        if (value.richText) return cellText(value);
        if (value.text !== undefined) return value.text;
        return null;
    }
    return value === undefined ? null : value;
}

/** => [{ name, rows: [[cell, ...], ...] }] ; csv files give one sheet named 'csv'. */
async function readSheets(filePath) {
    const workbook = new ExcelJS.Workbook();
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.csv') {
        const sheet = await workbook.csv.readFile(filePath);
        return [{ name: 'csv', rows: sheetRows(sheet) }];
    }
    if (ext !== '.xlsx') throw new Error(`Unsupported file type ${ext} (use .xlsx or .csv)`);
    await workbook.xlsx.readFile(filePath);
    return workbook.worksheets.map((sheet) => ({ name: sheet.name, rows: sheetRows(sheet) }));
}

function sheetRows(sheet) {
    const rows = [];
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const values = [];
        for (let c = 1; c <= row.cellCount; c += 1) values.push(cellValue(row.getCell(c).value));
        rows[rowNumber - 1] = values;
    });
    for (let i = 0; i < rows.length; i += 1) if (!rows[i]) rows[i] = [];
    return rows;
}

/**
 * Finds the first sheet and row (within maxRow) that holds all `required` columns (each a list of accepted names).
 * Returns { sheet, headerRow (0-based), index: { required[i] -> column }, header: Map(norm -> first column) } or null.
 */
function findTable(sheets, required, maxRow = 20) {
    for (const sheet of sheets) {
        for (let r = 0; r < Math.min(maxRow, sheet.rows.length); r += 1) {
            const header = new Map();
            sheet.rows[r].forEach((cell, c) => { const key = norm(cell); if (key && !header.has(key)) header.set(key, c); });
            const index = required.map((names) => (Array.isArray(names) ? names : [names]).map(norm).map((n) => header.get(n)).find((c) => c !== undefined));
            if (index.every((c) => c !== undefined)) return { sheet, headerRow: r, index, header };
        }
    }
    return null;
}

const text = (v) => (v == null ? '' : String(typeof v === 'number' && Number.isInteger(v) ? v : v).normalize('NFC').trim());
function num(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const n = Number(String(v).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
}

module.exports = { readSheets, findTable, norm, text, num };
