'use strict';

// F11-PHASE-4 test helper: builds a TCT F1.1 workbook with the real layout (header row, sub-header
// row, column-number legend, GRAND-TOTAL row first, body rows). Used by the parser, rank and
// pipeline tests; never reads or writes the PO's real files.

const xlsx = require('xlsx');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('../src/services/nationalExcelParser');

const HEADER = [
    'TT', 'Mã tỉnh chấp nhận', 'Tên tỉnh chấp nhận', 'Mã BC chấp nhận', 'Tên BC chấp nhận', 'Mã tỉnh phát', 'Tên tỉnh phát',
    'Mã BC phát', 'Tên BC phát', 'Mã KHL', 'Tên KHL', 'Sản lượng bưu gửi có thông tin phát',
    'SL bưu gửi phát thành công/Nộp tiền/chuyển hoàn', 'Sản lượng bưu gửi PTC/nộp tiền',
    'Sản lượng bưu gửi PTC/nộp tiền đúng QĐ <= 24h', 'Tỷ lệ bưu gửi PTC/Nộp tiền đúng QĐ',
    'Sản lượng bưu gửi quá quy định >24h', 'Sản lượng chưa đủ thông tin đo kiểm', 'KPI 2026 theo chi tiêu phường xã',
    null, null, null, null, 'Thời gian thực hiện\n(Thời gian PTC/Nộp tiền - Thời gian Nhận tin/Chấp nhận)', null, null, null, null,
    'Sản lượng loại trừ',
];
const SUB_HEADER = [
    ...Array(18).fill(null),
    'SL bưu gửi phát thành công/Nộp tiền/chuyển hoàn', 'Sản lượng bưu gửi PTC/nộp tiền đúng QĐ theo chi tiêu',
    'Tỷ lệ bưu gửi PTC/Nộp tiền đúng QĐ theo chi tiêu', 'Sản lượng bưu gửi quá quy định theo chi tiêu',
    'Tỷ lệ bưu gửi quá quy định theo chi tiêu', '<=24 giờ', '>24 giờ đến <=36 giờ', '>36 giờ đến <=48 giờ',
    '>48 giờ đến <=60 giờ', '> 60 giờ', null,
];
const LEGEND = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, null, 10, 11, 12, 13, '14=13/11', 15, 16, 17, 18, '19=18/17', 20, '21=20/17', 22, 23, 24, 25, 26, 27];

// one body row: {acc, del, den, ok, accName?, delName?} -> 29 cells
function bodyRow(index, spec) {
    const den = spec.den;
    const ok = spec.ok;
    const measures = [
        den + 5, den + 1, den, ok, `${(ok / (den + 1) * 100).toFixed(2)}%`, den - ok, 0, den, ok,
        `${den ? (ok / den * 100).toFixed(2) : 0}%`, den - ok, `${den ? ((den - ok) / den * 100).toFixed(2) : 0}%`,
        ok, 0, 0, 0, den - ok, 2,
    ];
    return [
        index, String(spec.acc), spec.accName || `Unit ${spec.acc}`, null, null,
        Number(spec.del), spec.delName || `Unit ${spec.del}`, null, null, null, null, ...measures,
    ];
}

function sumColumns(rows) {
    const totals = Array(29).fill(null);
    for (let c = 11; c <= 28; c++) {
        const values = rows.map((row) => row[c]);
        totals[c] = typeof values[0] === 'number' ? values.reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0) : null;
    }
    return totals;
}

// default population: every ranked province delivers to itself (den 1000+i, ok 900-ish), plus extras
function defaultSpecs() {
    return NATIONAL_RANKED_PROVINCE_CODES.map((code, i) => ({ acc: code, del: code, den: 1000 + i, ok: 800 + i }));
}

function buildTctWorkbookBuffer(specs = defaultSpecs(), { breakTotal = false, header = HEADER } = {}) {
    const body = specs.map((spec, i) => bodyRow(i + 2, spec));
    const total = sumColumns(body);
    total[0] = 1;
    if (breakTotal) total[19] += 1;
    const aoa = [header, SUB_HEADER, LEGEND, total, ...body];
    const sheet = xlsx.utils.aoa_to_sheet(aoa);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'Worksheet');
    return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { HEADER, SUB_HEADER, LEGEND, bodyRow, defaultSpecs, buildTctWorkbookBuffer };
