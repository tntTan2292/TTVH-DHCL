/**
 * test_excelParser.js — Task 2.1 Verification Script
 * Run: node test_excelParser.js
 */
'use strict';

const xlsx = require('xlsx');
const { extractDateFromFilename, parseF13Excel, COLUMN_MAPPING, DB_COLUMNS } = require('./src/services/excelParser');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

// ===========================================================================
// TEST 1: extractDateFromFilename
// ===========================================================================
console.log('\n📋 TEST 1: extractDateFromFilename');

try {
    assert('Valid file F1.3-2026.06.18.xlsx',
        extractDateFromFilename('F1.3-2026.06.18.xlsx') === '2026-06-18');

    assert('Valid file F1.3-2026.01.01.xlsx',
        extractDateFromFilename('F1.3-2026.01.01.xlsx') === '2026-01-01');

    // Should throw on invalid formats
    let threw = false;
    try { extractDateFromFilename('F1.3-2026-06-18.xlsx'); } catch { threw = true; }
    assert('Rejects hyphen separator format', threw);

    threw = false;
    try { extractDateFromFilename('KPI-2026.06.18.xlsx'); } catch { threw = true; }
    assert('Rejects non-F1.3 prefix', threw);

    threw = false;
    try { extractDateFromFilename('F1.3-2026.06.18.xls'); } catch { threw = true; }
    assert('Rejects .xls extension (not .xlsx)', threw);

    threw = false;
    try { extractDateFromFilename('F1.3-2026.6.18.xlsx'); } catch { threw = true; }
    assert('Rejects single-digit month', threw);

} catch (e) {
    console.error('TEST 1 UNEXPECTED ERROR:', e.message);
    failed++;
}

// ===========================================================================
// TEST 2: COLUMN_MAPPING integrity
// ===========================================================================
console.log('\n📋 TEST 2: COLUMN_MAPPING integrity');

assert('Has exactly 41 entries', Object.keys(COLUMN_MAPPING).length === 41,
    `Got: ${Object.keys(COLUMN_MAPPING).length}`);

assert('Contains required key Số hiệu bưu gửi', 'Số hiệu bưu gửi' in COLUMN_MAPPING);
assert('Maps to ma_bg', COLUMN_MAPPING['Số hiệu bưu gửi'] === 'ma_bg');
assert('Maps Mã BC phát → ma_bcvh', COLUMN_MAPPING['Mã BC phát'] === 'ma_bcvh');
assert('Maps Tên BC phát → ten_bcvh', COLUMN_MAPPING['Tên BC phát'] === 'ten_bcvh');
assert('Maps Đánh giá → ket_qua_f13', COLUMN_MAPPING['Đánh giá (Đạt/Không đạt)'] === 'ket_qua_f13');
assert('Maps Thời gian PTC → thoi_gian_ptc', COLUMN_MAPPING['Thời gian PTC'] === 'thoi_gian_ptc');
assert('Maps Thời gian nộp tiền → thoi_gian_nop_tien', COLUMN_MAPPING['Thời gian nộp tiền'] === 'thoi_gian_nop_tien');
assert('DB_COLUMNS length matches COLUMN_MAPPING', DB_COLUMNS.length === 41);

// ===========================================================================
// TEST 3: parseF13Excel with synthetic Excel buffer
// ===========================================================================
console.log('\n📋 TEST 3: parseF13Excel — synthetic Excel');

function buildTestExcel(rows, headers) {
    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Test 3a: Valid file with minimal required columns
try {
    const headers = [
        'Số hiệu bưu gửi', 'Mã BC phát', 'Tên BC phát',
        'Mã tuyến phát', 'Tên tuyến phát', 'Đánh giá (Đạt/Không đạt)',
        'Thời gian PTC', 'Thời gian nộp tiền'
    ];
    const rows = [
        ['BG001', 'BC01', 'BC Văn Hoá 01', 'TN01', 'Tuyến 01', 'Đạt', null, null],
        ['BG002', 'BC01', 'BC Văn Hoá 01', 'TN02', 'Tuyến 02', 'Không đạt', null, null],
        [null, null, null, null, null, null, null, null],  // Empty row — should be skipped
        ['BG003', 'BC02', 'BC Văn Hoá 02', null, null, 'Đạt', null, null],
    ];
    const buffer = buildTestExcel(rows, headers);
    const result = parseF13Excel(buffer);

    assert('Returns parsedData array', Array.isArray(result.parsedData));
    assert('Skips empty rows — totalParsed = 3', result.totalParsed === 3,
        `Got: ${result.totalParsed}`);
    assert('Returns dbColumns array', Array.isArray(result.dbColumns));
    assert('dbColumns has 41 entries', result.dbColumns.length === 41,
        `Got: ${result.dbColumns.length}`);

    const row0 = result.parsedData[0];
    assert('Row 0: ma_bg = BG001', row0.ma_bg === 'BG001');
    assert('Row 0: ma_bcvh = BC01', row0.ma_bcvh === 'BC01');
    assert('Row 0: ten_bcvh = BC Văn Hoá 01', row0.ten_bcvh === 'BC Văn Hoá 01');
    assert('Row 0: ket_qua_f13 = Đạt', row0.ket_qua_f13 === 'Đạt');
    assert('Row 1: ket_qua_f13 = Không đạt', result.parsedData[1].ket_qua_f13 === 'Không đạt');
    assert('Row 2: ma_bcvh = BC02', result.parsedData[2].ma_bcvh === 'BC02');
    assert('Row 2: ma_tuyen is null (missing)', result.parsedData[2].ma_tuyen === null);

} catch (e) {
    console.error('TEST 3a UNEXPECTED ERROR:', e.message);
    failed++;
}

// Test 3b: Missing required column → should throw
console.log('\n📋 TEST 3b: Missing required column');
try {
    const headers = ['Mã BC phát', 'Tên BC phát']; // No 'Số hiệu bưu gửi'
    const buffer = buildTestExcel([['BC01', 'BC01 Name']], headers);
    let threw = false;
    try { parseF13Excel(buffer); } catch { threw = true; }
    assert('Throws when Số hiệu bưu gửi is missing', threw);
} catch (e) {
    console.error('TEST 3b UNEXPECTED ERROR:', e.message);
    failed++;
}

// Test 3c: ngay_do_kiem NOT in parsedData rows (SSOT rule)
console.log('\n📋 TEST 3c: ngay_do_kiem NOT injected by parser (SSOT)');
try {
    const headers = ['Số hiệu bưu gửi', 'Mã BC phát', 'Tên BC phát', 'Đánh giá (Đạt/Không đạt)'];
    const buffer = buildTestExcel([['BG001', 'BC01', 'BC01 Name', 'Đạt']], headers);
    const result = parseF13Excel(buffer);
    assert('ngay_do_kiem NOT present in parsed row (SSOT: from filename only)',
        !('ngay_do_kiem' in result.parsedData[0]));
} catch (e) {
    console.error('TEST 3c UNEXPECTED ERROR:', e.message);
    failed++;
}

// Test 3d: Header row with offset (simulate rows before header)
console.log('\n📋 TEST 3d: Header row with offset rows above');
try {
    const ws = xlsx.utils.aoa_to_sheet([
        ['Report Title'],
        ['Generated on: 2026-06-25'],
        [],
        ['Số hiệu bưu gửi', 'Mã BC phát', 'Tên BC phát', 'Đánh giá (Đạt/Không đạt)'],
        ['BG001', 'BC01', 'BC01 Name', 'Đạt']
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const result = parseF13Excel(buffer);
    assert('Finds header at row offset 3, totalParsed = 1', result.totalParsed === 1,
        `Got: ${result.totalParsed}`);
    assert('Row 0: ma_bg = BG001', result.parsedData[0].ma_bg === 'BG001');
} catch (e) {
    console.error('TEST 3d UNEXPECTED ERROR:', e.message);
    failed++;
}

// Test 3e: DATETIME conversion (cellDates:true → ISO string)
console.log('\n📋 TEST 3e: DATETIME conversion');
try {
    const testDate = new Date(2026, 5, 18, 14, 30, 0); // 2026-06-18 14:30:00
    const headers = ['Số hiệu bưu gửi', 'Mã BC phát', 'Tên BC phát', 'Đánh giá (Đạt/Không đạt)', 'Thời gian PTC'];
    const ws = xlsx.utils.aoa_to_sheet([headers, ['BG001', 'BC01', 'BC Name', 'Đạt', testDate]]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const result = parseF13Excel(buffer);
    const ptc = result.parsedData[0].thoi_gian_ptc;
    // When xlsx serializes/deserializes, we check it's a string not a number
    const isString = typeof ptc === 'string';
    const isNotSerial = isString && isNaN(Number(ptc));
    assert('Thời gian PTC stored as string (not serial number)', isString, `Got type: ${typeof ptc}, value: ${ptc}`);
    assert('Value is not a raw numeric serial', isNotSerial, `Got: ${ptc}`);
    if (isString) {
        console.log(`     ℹ️  PTC value: "${ptc}"`);
    }
} catch (e) {
    console.error('TEST 3e UNEXPECTED ERROR:', e.message);
    failed++;
}

// ===========================================================================
// SUMMARY
// ===========================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
if (failed === 0) {
    console.log('✅ ALL TESTS PASSED — excelParser.js Task 2.1 verified.');
} else {
    console.log('❌ SOME TESTS FAILED — review above.');
    process.exit(1);
}
