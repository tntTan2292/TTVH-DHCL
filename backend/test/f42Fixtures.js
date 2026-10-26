'use strict';

// F42 test helpers: build a HUE CSV (portal layout: padded headers, unquoted commas in free text) and a TCT
// national workbook (two header rows, number legend, grand total first, one row per postman). They never read
// the PO's real files.

const xlsx = require('xlsx');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('../src/services/nationalExcelParser');

const HUE_HEADERS = [
    'Mã tỉnh phát', 'Tên tỉnh phát', 'Mã huyện phát', 'Tên huyện phát',
    'Địa bàn phát (Trung tâm tỉnh/Huyện thông thường/Huyện khó khăn/Huyện đảo)', 'Mã BC phát', 'Tên BC phát', 'Mã bưu tá',
    'Tên bưu tá', 'Mã HRM', 'Loại bg', 'Dịch vụ', 'Loại DV', 'Nhóm SPDV', 'Mã SPDV', 'Số hiệu bg', 'Số hiệu lô', 'Số Tiền COD',
    'Khối lượng thực tế', 'Khối lượng quy đổi', 'Tên hàng hoá', 'Mã KHL', 'Tên KHL', ' Mã tuyến phát', ' Tên tuyến phát',
    ' Loại tuyến phát', 'Thời gian GBT', 'Thời gian PTC', 'Thời gian chuyển hoàn', 'Thời gian nộp tiền', 'Thời gian thực hiện', 'Đánh giá',
];

// spec: {parcel, postman, office, gbt, ptc, rating, elapsed, customer}
function hueRow(spec) {
    return [
        '53', 'Bưu điện  Tỉnh Thừa Thiên Huế', '5372  ', spec.officeName || 'BCVH Hương Trà', '', spec.office || '535470', spec.officeName || 'BCVH Hương Trà',
        spec.postman || '53A001', 'NGUYỄN VĂN A', '', 'EMS', 'E', 'KCOD', 'Truyền thống -TMĐT', 'E', spec.parcel, '', '', '500.0', '<=2kg', '',
        'T006461306', spec.customer || 'TikTok', '53547026', 'Phong Điền_02', 'Tuyến phát xã (01 lần/ ngày)',
        spec.gbt ?? '2026-10-10 08:00:00.000', spec.ptc ?? '', '', '', spec.elapsed ?? '', spec.rating ?? '',
    ];
}

function toCsv(headers, rows) {
    // quote nothing: the portal leaves free text unquoted, so commas inside it widen the row
    return `﻿${[headers, ...rows].map((r) => r.join(',')).join('\r\n')}\r\n`;
}

// default: 3 rated rows (2 Đạt, 1 Không đạt) and 1 blank (not delivered yet)
function hueCsvBuffer(specs = defaultHueSpecs(), headers = HUE_HEADERS) {
    return Buffer.from(toCsv(headers, specs.map(hueRow)), 'utf8');
}

function defaultHueSpecs() {
    return [
        { parcel: 'P1', ptc: '2026-10-10 09:00:00.000', elapsed: '1:0', rating: 'Đạt' },
        { parcel: 'P2', postman: '53A002', ptc: '2026-10-10 10:00:00.000', elapsed: '2:0', rating: 'Đạt', office: '536250', officeName: 'BCVH Hương Thủy' },
        { parcel: 'P3', ptc: '2026-10-11 15:00:00.000', elapsed: '13:46', rating: 'Không đạt' },
        { parcel: 'P4' },
    ];
}

function hueXlsxBuffer(specs = defaultHueSpecs()) {
    const sheet = xlsx.utils.aoa_to_sheet([HUE_HEADERS, ...specs.map(hueRow)]);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'Worksheet');
    return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
}

const TCT_HEADER = [
    'TT', 'Mã tỉnh', 'Tên tỉnh', 'Mã huyện', 'Tên huyện', 'Mã BC', 'Tên BC', 'Mã bưu tá', 'Tên bưu tá', 'Mã HRM',
    'Sản lượng GBT có thông tin phát', 'Sản lượng phát thành công', 'Tỷ lệ phát thành công', 'Sản lượng PTC đúng QĐ (11,5 giờ)',
    'Tỷ lệ PTC đúng QĐ (11,5 giờ)', 'Quá thời gian quy định', null, null, null, null, 'Không tính vào mẫu số', null, null,
    'Sản lượng loại trừ', 'Sản lượng GBT có thông tin phát (Chưa loại trừ)', 'Sản lượng GBT chưa có thông tin phát',
];
const TCT_SUB_HEADER = [
    ...Array(15).fill(null), 'Sản lượng phát thành công >11,5 giờ', 'Sản lượng PKTC', 'SL chuyển hoàn', 'SL chờ chuyển hoàn',
    'Tỷ lệ quá thời gian quy định', 'SL chờ VTN/VTN', 'SL chuyển tiếp', 'SL phát hoàn', null, null, null,
];
const TCT_LEGEND = [1, 2, 3, 4, 5, 7, 8, 9, 10, 13, 14, 15, '16=15/14', 17, '18=17/14', 19, 20, 21, 22, '23=(19+20+21+22)/14', 24, 25, 26, 27, 28, 29];

// spec {code, postman, gbt, ok, late?, name?} -> 26 cells (as the portal: codes may be numbers, rates are text)
function tctRow(index, spec) {
    const { gbt, ok } = spec;
    const late = spec.late ?? 0;
    const pct = (n) => `${gbt ? ((n / gbt) * 100).toFixed(2) : 0}%`;
    return [
        index, spec.code === '10' ? 10 : spec.code, spec.name ?? `Province ${spec.code}`, null, null, 100000 + index, `Office ${index}`,
        spec.postman ?? `P${index}`, `Postman ${index}`, null, gbt, ok + late, pct(ok + late), ok, pct(ok), late, 0, 0, 0, pct(late),
        0, 0, 0, 0, gbt, 0,
    ];
}

function tctTotal(rows) {
    const sum = (i) => rows.reduce((acc, row) => acc + (typeof row[i] === 'number' ? row[i] : 0), 0);
    const total = Array(26).fill(null);
    total[0] = 1;
    for (const i of [10, 11, 13, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25]) total[i] = sum(i);
    total[12] = '0%'; total[14] = '0%'; total[19] = '0%';
    return total;
}

// two postmen per ranked province unless overridden; extra rows (EMS, centres...) can be appended
function tctPopulation(overrides = {}, extra = []) {
    const specs = [];
    for (const code of NATIONAL_RANKED_PROVINCE_CODES) {
        const o = overrides[code] || {};
        specs.push({ code, postman: `${code}A001`, gbt: 600, ok: 500, ...o.first });
        specs.push({ code, postman: `${code}A002`, gbt: 400, ok: 300, late: 20, ...o.second });
    }
    return [...specs, ...extra];
}

function tctBuffer(specs = tctPopulation(), { totalOverride = null } = {}) {
    const body = specs.map((spec, i) => tctRow(i + 2, spec));
    const total = totalOverride ? totalOverride(tctTotal(body)) : tctTotal(body);
    const sheet = xlsx.utils.aoa_to_sheet([TCT_HEADER, TCT_SUB_HEADER, TCT_LEGEND, total, ...body]);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'Worksheet');
    return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { HUE_HEADERS, hueRow, hueCsvBuffer, hueXlsxBuffer, defaultHueSpecs, tctBuffer, tctPopulation };
