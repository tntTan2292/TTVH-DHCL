'use strict';

// HANGTON-INVENTORY-01: the parcel list of a snapshot as an .xlsx or .csv file (every row of the filter,
// not one page). Headers are Vietnamese; CSV carries a UTF-8 BOM so Excel opens it correctly.
const XLSX = require('xlsx');

const COLUMNS = Object.freeze([
    ['item_code', 'Số hiệu bưu gửi', 20],
    ['office', 'Bưu cục phát', 22],
    ['district', 'Huyện / Phường', 28],
    ['status_name', 'Trạng thái', 22],
    ['ton_level', 'Loại tồn', 12],
    ['cod', 'Tiền COD', 14],
    ['postman_code', 'Mã bưu tá', 12],
    ['postman_name', 'Bưu tá', 24],
    ['customer_class', 'Phân loại KH', 16],
    ['parcel_type', 'Loại bưu gửi', 12],
    ['weight', 'Trọng lượng', 12],
    ['reason', 'Lý do', 40],
]);

function toAoa(rows) {
    return [COLUMNS.map((c) => c[1]), ...rows.map((r) => COLUMNS.map((c) => r[c[0]] ?? ''))];
}

function buildItemsXlsx(rows, { sheetName = 'Hàng tồn' } = {}) {
    const sheet = XLSX.utils.aoa_to_sheet(toAoa(rows));
    sheet['!cols'] = COLUMNS.map((c) => ({ wch: c[2] }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
    return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}

function csvCell(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildItemsCsv(rows) {
    return `﻿${toAoa(rows).map((line) => line.map(csvCell).join(',')).join('\r\n')}`;
}

module.exports = { COLUMNS, buildItemsXlsx, buildItemsCsv };
