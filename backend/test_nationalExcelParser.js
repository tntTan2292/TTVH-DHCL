'use strict';

const assert = require('assert');
const xlsx = require('xlsx');
const {
    parseF13NationalExcel,
    NATIONAL_RANKED_PROVINCE_CODES
} = require('./src/services/nationalExcelParser');

const headers = [
    'TT',
    'Mã tỉnh phát',
    'Tên tỉnh phát',
    'Mã bưu cục phát',
    'Tên bưu cục phát',
    'Mã tuyến',
    'Tên tuyến',
    'Loại tuyến',
    'SL bưu gửi phát thành công/Nộp tiền/CH',
    'Sản lượng PTC/Nộp tiền',
    'Sản lượng BG có BĐ10 gán TMS quét xuống KTT phát',
    'Sản lượng bưu gửi PTC/nộp tiền đúng thời gian QĐ <=14 giờ',
    'Tỷ lệ bưu gửi PTC/Nộp tiền <=14 giờ',
    'SL quá quy định (>14 giờ)',
    'Sản lượng bưu gửi PTC/nộp tiền đúng QĐ theo chi tiêu 2026',
    'Tỷ lệ bưu gửi PTC/Nộp tiền đúng QĐ theo chi tiêu 2026',
    'Sản lượng bưu gửi quá quy định theo chi tiêu 2026',
    'Tỷ lệ bưu gửi quá quy định theo chi tiêu 2026',
    'SL chưa đủ thông tin đo kiểm',
    'SL loại trừ',
    'SL Phát không thành Công',
    'SL PTC ko xác định'
];

function sourceRow(code, name, volume, passed, rate) {
    return [
        1,
        code,
        name,
        null,
        null,
        null,
        null,
        null,
        volume,
        volume,
        volume,
        passed,
        rate,
        Math.max(0, volume - passed),
        passed,
        rate,
        Math.max(0, volume - passed),
        volume ? 1 - rate : 0,
        0,
        0,
        Math.max(0, volume - passed),
        0
    ];
}

function buildWorkbookBuffer() {
    const rows = [
        headers,
        sourceRow('2', 'Formula/index row', 0, 0, 0),
        sourceRow('01', 'Tổng công ty EMS', 1202, 735, 0.6115),
        sourceRow('15', 'Bưu điện Trung tâm Long Biên', 0, 0, 0)
    ];

    for (const code of NATIONAL_RANKED_PROVINCE_CODES) {
        const isHue = code === '53';
        rows.push(sourceRow(
            code,
            isHue ? 'Bưu điện Tỉnh Thừa Thiên Huế' : `Ranked unit ${code}`,
            isHue ? 2399 : 1000 + Number(code),
            isHue ? 1261 : 500 + Number(code),
            isHue ? 0.5256 : 0.5
        ));
    }

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Worksheet');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

const result = parseF13NationalExcel(buildWorkbookBuffer());

assert.strictEqual(result.totalParsed, 34, 'parser imports exactly the approved 34 ranked units');
assert.deepStrictEqual(
    result.parsedData.map((row) => row.ma_tinh_phat).sort(),
    [...NATIONAL_RANKED_PROVINCE_CODES].sort(),
    'parser output matches the approved ranked population'
);

const excludedCodes = result.excludedRows.map((row) => row.ma_tinh_phat).sort();
assert.deepStrictEqual(excludedCodes, ['01', '15', '2'], 'parser records the three source exclusions');
assert(result.excludedRows.some((row) => row.exclusion_code === 'WORKBOOK_FORMULA_INDEX_ROW'), 'formula/index row has an exclusion reason');
assert(result.excludedRows.some((row) => row.exclusion_code === 'ADMINISTRATIVE_SOURCE_ROW'), 'EMS row has an exclusion reason');
assert(result.excludedRows.some((row) => row.exclusion_code === 'NON_RANKED_CENTER_ROW'), 'Long Bien row has an exclusion reason');

const hue = result.parsedData.find((row) => row.ma_tinh_phat === '53');
assert(hue, 'Hue row is retained');
assert.strictEqual(hue.sl_bg_ptc, 2399, 'Hue volume is parsed');
assert.strictEqual(hue.sl_ptc_dung_qd_ct, 1261, 'Hue pass quantity is parsed');
assert.strictEqual(hue.tl_ptc_dung_qd_ct, 0.5256, 'Hue KPI is parsed without recalculating the formula');

console.log('PASS nationalExcelParser: approved 34-unit ranked population and exclusions');
