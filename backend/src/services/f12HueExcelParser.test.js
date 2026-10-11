const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const xlsx = require('xlsx');

const {
    parseF12HueExcel,
    extractF12DateFromFilename,
    elapsedMinutes,
    F12_REQUIRED_COLUMNS,
    F12_OPTIONAL_COLUMNS,
    F12_DB_COLUMNS,
} = require('./f12HueExcelParser');

const REQUIRED_HEADERS = Object.keys(F12_REQUIRED_COLUMNS);
const ALL_HEADERS = [...REQUIRED_HEADERS, ...Object.keys(F12_OPTIONAL_COLUMNS)];
const TMS = 'Thời gian BĐ10 quét lên xe tại KT tỉnh chấp nhận TMS/ quét xuống đối với tỉnh có HUB';
const BCCP = 'Thời gian BĐ10 đóng đi tại KT tỉnh chấp nhận (BCCP)/ XNĐ đối với tỉnh có HUB';
const BD10 = 'Số hiệu BĐ10 quét lên xe tại KT tỉnh chấp nhận / XNĐ đối với tỉnh có HUB';
const NAME = 'F1.2-2026.10.10.xlsx';

function workbookBuffer(headers, rows) {
    const sheet = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'Worksheet');
    return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
}

function parcel(i, values = {}) {
    return {
        'STT': i,
        'Số hiệu bưu gửi': `CB${String(i).padStart(9, '0')}VN`,
        'Mã tỉnh chấp nhận': 53,
        'Tên tỉnh chấp nhận': 'Bưu điện Tỉnh Thừa Thiên Huế',
        'Mã BC nhận tin/chấp nhận': 531120,
        'Tên BC nhận tin/chấp nhận': 'Khách hàng lớn',
        'Mã tỉnh phát': '01',
        'Thời gian chấp nhận': '09/10/2026 18:21:42',
        [BD10]: '`530100520100610101',
        [TMS]: '10/10/2026 05:32:36',
        [BCCP]: '10/10/2026 05:25:33',
        'Thời gian thực hiện thực tế (giờ)': '1:11',
        'Đánh giá (Đạt/Không đạt)': 'Đạt',
        'Mã Huyện': 5375,
        'Tên Huyện': 'BCVH Thuận Hóa',
        ...values,
    };
}

function buffer(parcels, headers = ALL_HEADERS) {
    return workbookBuffer(headers, parcels.map((p) => headers.map((h) => (h in p ? p[h] : null))));
}

test('column set: 12 required + 23 optional = the 35 portal columns', () => {
    assert.equal(REQUIRED_HEADERS.length, 12);
    assert.equal(F12_DB_COLUMNS.length, 35);
});

test('file name gives the business date; other names and impossible dates are refused', () => {
    assert.equal(extractF12DateFromFilename('F1.2-2026.10.10.xlsx'), '2026-10-10');
    assert.equal(extractF12DateFromFilename('D:\\Data DKCL\\F1.2\\Incoming\\HUE\\F1.2-2026.10.10.xlsx'), '2026-10-10');
    assert.throws(() => extractF12DateFromFilename('11-10-2026_21-29-33_F1.2_CL_thu_gom_buu_giay_lien_tinh_chi_tiet.xlsx'), /F1\.2-YYYY\.MM\.DD/);
    assert.throws(() => extractF12DateFromFilename('F1.1-2026.10.10.xlsx'), /F1\.2/);
    assert.throws(() => extractF12DateFromFilename('F1.2-2026.02.30.xlsx'), /Invalid F1\.2 filename date/);
});

test('codes are text, the BĐ10 back-tick is stripped, a negative elapsed time is kept as given', () => {
    const result = parseF12HueExcel(buffer([
        parcel(1),
        parcel(2, { 'Thời gian thực hiện thực tế (giờ)': '-3:-51' }),
        parcel(3, { 'Thời gian thực hiện thực tế (giờ)': '11:8', 'Đánh giá (Đạt/Không đạt)': 'Không đạt' }),
    ]), NAME);
    assert.equal(result.totalParsed, 3);
    assert.equal(result.ngayDoKiem, '2026-10-10');
    const [first, second] = result.parsedData;
    assert.equal(first.ma_tinh_chap_nhan, '53');
    assert.equal(first.ma_bc_chap_nhan, '531120');
    assert.equal(first.ma_huyen, '5375');
    assert.equal(first.ma_tinh_phat, '01');
    assert.equal(first.so_hieu_bd10, '530100520100610101');
    assert.equal(second.thoi_gian_thuc_te, '-3:-51');
    assert.equal(result.ratingRuleMismatches, 0);
    assert.deepEqual(result.dateCheck, { rowsOnDate: 3, rowsOtherDate: 0, rowsWithoutBd10: 0 });
});

test('elapsed minutes read both signed parts', () => {
    assert.equal(elapsedMinutes('1:11'), 71);
    assert.equal(elapsedMinutes('-3:-51'), -231);
    assert.equal(elapsedMinutes('10:0'), 600);
    assert.equal(elapsedMinutes(null), null);
});

test('only the core headers are required; absent optional ones stay NULL', () => {
    const result = parseF12HueExcel(buffer([parcel(1)], REQUIRED_HEADERS), NAME);
    assert.equal(result.parsedData[0].ma_khl, null);
    assert.equal(result.parsedData[0].so_hieu_bd10, null);
    assert.equal(result.missingOptionalHeaders.length, 23);
    const without = REQUIRED_HEADERS.filter((h) => h !== 'Mã Huyện');
    assert.throws(() => parseF12HueExcel(buffer([parcel(1)], without), NAME), /Missing expected column\(s\): Mã Huyện/);
});

test('a duplicated header, a duplicated parcel or an unknown rating refuses the file', () => {
    assert.throws(() => parseF12HueExcel(buffer([parcel(1)], [...ALL_HEADERS, 'Mã Huyện']), NAME), /Duplicated column/);
    assert.throws(() => parseF12HueExcel(buffer([parcel(1), parcel(1)]), NAME), /appears more than once/);
    assert.throws(() => parseF12HueExcel(buffer([parcel(1, { 'Đánh giá (Đạt/Không đạt)': 'Dat' })]), NAME), /unexpected value/);
    assert.throws(() => parseF12HueExcel(buffer([parcel(1, { 'Thời gian thực hiện thực tế (giờ)': '1h11' })]), NAME), /H:M/);
});

test('PD-F12-6: the BĐ10 day must be the file-name day (TMS scan, else the BCCP close)', () => {
    // no TMS scan: the BCCP close decides
    const ok = parseF12HueExcel(buffer([parcel(1, { [TMS]: null })]), NAME);
    assert.deepEqual(ok.dateCheck, { rowsOnDate: 1, rowsOtherDate: 0, rowsWithoutBd10: 0 });
    // a file renamed to the wrong day is refused
    assert.throws(() => parseF12HueExcel(buffer([parcel(1), parcel(2)]), 'F1.2-2026.10.11.xlsx'), /file name date does not match/);
    // a minority of neighbouring-day rows is reported, not refused
    const mixed = parseF12HueExcel(buffer([parcel(1), parcel(2), parcel(3, { [TMS]: '11/10/2026 00:10:00' })]), NAME);
    assert.equal(mixed.dateCheck.rowsOtherDate, 1);
});

test('a rating that disagrees with the 10 h rule is stored as given and counted', () => {
    const result = parseF12HueExcel(buffer([parcel(1, { 'Thời gian thực hiện thực tế (giờ)': '10:01' })]), NAME);
    assert.equal(result.parsedData[0].danh_gia, 'Đạt');
    assert.equal(result.ratingRuleMismatches, 1);
});

// Real-file baseline (PO file, git-ignored under Data DKCL): skipped when absent.
// Known answer: F12-MODULE-PLAN Checkpoint Section 7.
const REAL_FILE = process.env.F12_REAL_FILE || path.resolve(__dirname, '../../../Data DKCL/F1.2-2026.10.10.xlsx');

test('real file F1.2 10/10/2026: 1 758 parcels, 1 620 Đạt, 92,15 %, 73 offices in 37 units', { skip: fs.existsSync(REAL_FILE) ? false : 'PO file not present on this machine' }, () => {
    const result = parseF12HueExcel(fs.readFileSync(REAL_FILE), NAME);
    const rows = result.parsedData;
    assert.equal(result.totalParsed, 1758);
    assert.equal(result.columnCount, 35);
    assert.deepEqual(result.unmappedHeaders, []);
    assert.deepEqual(result.dateCheck, { rowsOnDate: 1758, rowsOtherDate: 0, rowsWithoutBd10: 0 });
    assert.equal(result.ratingRuleMismatches, 0);
    const passed = rows.filter((r) => r.danh_gia === 'Đạt').length;
    assert.equal(passed, 1620);
    assert.equal(rows.filter((r) => r.danh_gia === 'Không đạt').length, 138);
    assert.equal(((passed / rows.length) * 100).toFixed(2), '92.15');
    assert.equal(new Set(rows.map((r) => r.ma_bc_chap_nhan)).size, 73);
    assert.equal(new Set(rows.map((r) => r.ma_huyen)).size, 37);
    // each office belongs to exactly one unit
    const unitsPerOffice = new Map();
    rows.forEach((r) => unitsPerOffice.set(r.ma_bc_chap_nhan, new Set([...(unitsPerOffice.get(r.ma_bc_chap_nhan) || []), r.ma_huyen])));
    assert.ok([...unitsPerOffice.values()].every((units) => units.size === 1));
    const kh = rows.filter((r) => r.ma_bc_chap_nhan === '531120');
    assert.deepEqual([kh.length, kh.filter((r) => r.danh_gia === 'Đạt').length, kh[0].ma_huyen], [550, 549, '5375']);
    assert.ok(rows.every((r) => !String(r.so_hieu_bd10).startsWith('`')));
});
