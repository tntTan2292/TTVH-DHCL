'use strict';

// F12-PHASE-4 test helper: builds a TCT F1.2 workbook with the real layout (two header rows, column-number
// legend, GRAND-TOTAL row first, one body row per accepting province). Never reads the PO's real files.

const xlsx = require('xlsx');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('../src/services/nationalExcelParser');

const HEADER = [
    'TT', 'Mã tỉnh chấp nhận', 'Tên tỉnh chấp nhận', 'Mã BC nhận tin/ chấp nhận', 'Tên BC nhận tin/ chấp nhận', 'Mã KHL', 'Tên KHL',
    'SL bưu gửi có BĐ10 đóng đi tại khai thác tỉnh chấp nhận', 'SL bưu gửi có BD10 quét TMS lên tại Khai thác tỉnh hoặc BC khớp nối',
    'SL đúng thời gian quy định <= 10 giờ', 'Tỷ lệ đúng thời gian quy định', 'SL quá quy định ( > 10 giờ)', 'Sản lượng chưa đủ thông tin',
    'Thời gian thực hiện\n(Thời gian BD10 quét TMS lên xe - Thời nhận tin/Chấp nhận)', null, null, null, null, null, 'SL Loại trừ',
];
const SUB_HEADER = [...Array(13).fill(null), '<=10 giờ', '<=12 giờ', '>12 giờ đến <=24 giờ', '>24 giờ đến <=36 giờ', '>36 giờ đến <=48 giờ', '> 48 giờ', null];
const LEGEND = [1, 2, 3, 4, 5, null, null, 6, 7, 8, '9=8/6', 10, 12, 13, 14, 15, 16, 17, 18, 19];

// spec {code, den, ok, name?, tms?} -> 20 cells. As in the real file, the late count and the buckets follow the
// TMS count (a centre can scan more than it closed, so ok may exceed den); buckets: ok <= 10 h, the rest 12-24 h.
function bodyRow(index, spec) {
    const { den, ok } = spec;
    const tms = spec.tms ?? den;
    return [
        index, spec.code, spec.name || `Unit ${spec.code}`, spec.office ?? null, null, null, null,
        den, tms, ok, `${den ? ((ok / den) * 100).toFixed(2) : 0}%`, tms - ok, 3,
        ok, ok, tms - ok, 0, 0, 0, 0,
    ];
}

function totalRow(body) {
    const sum = (i) => body.reduce((acc, row) => acc + row[i], 0);
    return [1, null, null, null, null, null, null, sum(7), sum(8), sum(9), '0%', sum(11), sum(12), sum(13), sum(14), sum(15), sum(16), sum(17), sum(18), sum(19)];
}

// every ranked province (code as text, Ha Noi given as a number like the portal) unless overridden
function population(overrides = {}, extra = []) {
    const specs = NATIONAL_RANKED_PROVINCE_CODES.map((code) => ({ code: code === '10' ? 10 : code, den: 1000, ok: 900, ...overrides[code] }));
    return [...specs, ...extra];
}

function f12TctBuffer(specs = population(), { totalOverride = null } = {}) {
    const body = specs.map((spec, i) => bodyRow(i + 2, spec));
    const total = totalOverride ? totalOverride(totalRow(body)) : totalRow(body);
    const sheet = xlsx.utils.aoa_to_sheet([HEADER, SUB_HEADER, LEGEND, total, ...body]);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'Worksheet');
    return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { f12TctBuffer, population, HEADER };
