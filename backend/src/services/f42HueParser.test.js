const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    parseF42Hue,
    extractF42DateFromFilename,
    readCsvRows,
    F42_REQUIRED_COLUMNS,
    F42_DB_COLUMNS,
} = require('./f42HueParser');
const { HUE_HEADERS, hueCsvBuffer, hueXlsxBuffer, defaultHueSpecs } = require('../../test/f42Fixtures');

const FILE = 'F4.2-2026.10.10.csv';
const REAL_FILE = path.resolve(__dirname, '../../../Data DKCL/F4.2-2026.10.10.csv');

test('file name: F4.2-YYYY.MM.DD with csv or xlsx, strict', () => {
    assert.equal(extractF42DateFromFilename('F4.2-2026.10.10.csv'), '2026-10-10');
    assert.equal(extractF42DateFromFilename('f4.2-2026.01.05.XLSX'), '2026-01-05');
    for (const bad of ['F4.2-2026.10.10.txt', 'F4.1-2026.10.10.csv', 'F4.2-2026.13.10.csv', 'F4.2-2026.02.30.csv', 'x.csv']) {
        assert.throws(() => extractF42DateFromFilename(bad), /Invalid F4\.2 filename/);
    }
});

test('csv reader: BOM-free text, quotes, doubled quotes, CRLF and newline inside quotes', () => {
    assert.deepEqual(readCsvRows('a,b\r\n"x,1","he said ""hi"""\r\n"l1\nl2",z\r\n'), [['a', 'b'], ['x,1', 'he said "hi"'], ['l1\nl2', 'z']]);
});

test('parses a CSV with padded headers, keeps the portal rating and the blank one', () => {
    const result = parseF42Hue(hueCsvBuffer(), FILE);
    assert.equal(result.totalParsed, 4);
    assert.equal(result.ngayDoKiem, '2026-10-10');
    assert.deepEqual(result.ratings, { dat: 2, khongDat: 1, blank: 1 });
    assert.equal(result.columnCount, HUE_HEADERS.length);
    assert.deepEqual(result.unmappedHeaders, []);
    assert.deepEqual(result.missingOptionalHeaders, []);
    const [first, , third, blank] = result.parsedData;
    assert.equal(first.ma_bg, 'P1');
    assert.equal(first.ma_bc_phat, '535470');
    assert.equal(first.ma_tuyen_phat, '53547026'); // padded header ' Mã tuyến phát' still maps
    assert.equal(first.thoi_gian_gbt, '2026-10-10 08:00:00'); // fraction dropped
    assert.equal(third.thoi_gian_thuc_hien, '13:46');
    assert.equal(blank.danh_gia, null);
    assert.equal(blank.thoi_gian_ptc, null);
    assert.ok(F42_DB_COLUMNS.every((column) => column in first));
});

test('an unquoted comma in the customer name is repaired by anchoring on the GBT time', () => {
    const specs = defaultHueSpecs();
    specs[0].customer = 'Phòng Kinh Tế, Hạ Tầng, Đô Thị';
    const result = parseF42Hue(hueCsvBuffer(specs), FILE);
    assert.equal(result.repairedRows, 1);
    assert.equal(result.parsedData[0].ten_khl, 'Phòng Kinh Tế, Hạ Tầng, Đô Thị');
    assert.equal(result.parsedData[0].ma_tuyen_phat, '53547026');
    assert.equal(result.parsedData[0].thoi_gian_gbt, '2026-10-10 08:00:00');
    assert.equal(result.parsedData[0].danh_gia, 'Đạt');
});

test('a row that cannot be repaired refuses the file', () => {
    const text = hueCsvBuffer().toString('utf8');
    // surplus field placed after the GBT time cannot be explained by a customer-name comma
    const broken = text.replace('Đạt\r\n', 'Đạt,extra\r\n');
    assert.throws(() => parseF42Hue(Buffer.from(broken), FILE), /Line \d+ has \d+ fields/);
    const short = hueCsvBuffer().toString('utf8').replace(/,53547026,/, ',');
    assert.throws(() => parseF42Hue(Buffer.from(short), FILE), /Line \d+ has \d+ fields/);
});

test('the Excel export of the same report parses to the same rows', () => {
    const fromCsv = parseF42Hue(hueCsvBuffer(), FILE);
    const fromXlsx = parseF42Hue(hueXlsxBuffer(), 'F4.2-2026.10.10.xlsx');
    assert.deepEqual(fromXlsx.parsedData, fromCsv.parsedData);
});

test('refuses missing required headers, naming them', () => {
    const headers = HUE_HEADERS.filter((h) => h !== 'Mã bưu tá' && h !== 'Đánh giá');
    const rows = defaultHueSpecs().map(() => []);
    const text = `${headers.join(',')}\r\n${rows.map(() => '').join('')}`;
    assert.throws(() => parseF42Hue(Buffer.from(text), FILE), /Missing expected column\(s\): Mã bưu tá, Đánh giá/);
    assert.throws(() => parseF42Hue(Buffer.from('a,b\r\n1,2\r\n'), FILE), /Required column 'Số hiệu bg' not found/);
});

test('refuses a file whose rows are not on the file-name day', () => {
    const specs = defaultHueSpecs().map((s) => ({ ...s, gbt: '2026-10-09 08:00:00.000' }));
    assert.throws(() => parseF42Hue(hueCsvBuffer(specs), FILE), /file name date does not match the data/);
});

test('a few rows of a neighbouring day are reported, not refused', () => {
    const specs = defaultHueSpecs();
    specs[3].gbt = '2026-10-11 08:00:00.000';
    const result = parseF42Hue(hueCsvBuffer(specs), FILE);
    assert.deepEqual(result.dateCheck, { rowsOnDate: 3, rowsOtherDate: 1 });
});

test('the same parcel for two different postmen is two rows; an exact repeat refuses the file', () => {
    const two = defaultHueSpecs();
    two.push({ parcel: 'P1', postman: '53A009', gbt: '2026-10-10 17:00:00.000' });
    assert.equal(parseF42Hue(hueCsvBuffer(two), FILE).totalParsed, 5);
    const repeat = defaultHueSpecs();
    repeat.push({ ...repeat[0] });
    assert.throws(() => parseF42Hue(hueCsvBuffer(repeat), FILE), /Parcel P1 appears twice for postman 53A001/);
});

test('refuses a row without GBT time, an unknown rating and a malformed elapsed time', () => {
    const noGbt = defaultHueSpecs();
    noGbt[0].gbt = '';
    assert.throws(() => parseF42Hue(hueCsvBuffer(noGbt), FILE), /has no GBT time/);
    const badRating = defaultHueSpecs();
    badRating[0].rating = 'Có';
    assert.throws(() => parseF42Hue(hueCsvBuffer(badRating), FILE), /Đánh giá' = "Có"/);
    const badElapsed = defaultHueSpecs();
    badElapsed[0].elapsed = 'abc';
    assert.throws(() => parseF42Hue(hueCsvBuffer(badElapsed), FILE), /Thời gian thực hiện' = "abc"/);
});

test('negative elapsed time is kept as given; rule exceptions are counted, not applied', () => {
    const specs = defaultHueSpecs();
    specs[0].elapsed = '-19:-25';
    specs[1].elapsed = '13:59'; // Đạt above 11:30: a portal exception, reported
    const result = parseF42Hue(hueCsvBuffer(specs), FILE);
    assert.equal(result.parsedData[0].thoi_gian_thuc_hien, '-19:-25');
    assert.equal(result.parsedData[1].danh_gia, 'Đạt');
    assert.equal(result.ratingRuleMismatches, 1);
});

test('required columns are the contract of the portal report', () => {
    assert.equal(Object.keys(F42_REQUIRED_COLUMNS).length, 12);
});

test('the real 10/10/2026 file: 6 466 rows, 4 475 Đạt, 757 Không đạt, 1 234 blank, 128 postmen', { skip: !fs.existsSync(REAL_FILE) }, () => {
    const result = parseF42Hue(fs.readFileSync(REAL_FILE), 'F4.2-2026.10.10.csv');
    assert.equal(result.totalParsed, 6466);
    assert.deepEqual(result.ratings, { dat: 4475, khongDat: 757, blank: 1234 });
    assert.equal(result.repairedRows, 114);
    assert.deepEqual(result.dateCheck, { rowsOnDate: 6466, rowsOtherDate: 0 });
    assert.equal(new Set(result.parsedData.map((r) => r.ma_buu_ta)).size, 128);
    assert.equal(result.ratingRuleMismatches, 5);
    const hue = result.parsedData.filter((r) => r.ten_bc_phat === 'BCVH Thuận Hóa');
    assert.equal(hue.length, 3518);
    assert.equal(hue.filter((r) => r.danh_gia === 'Đạt').length, 2367);
});
