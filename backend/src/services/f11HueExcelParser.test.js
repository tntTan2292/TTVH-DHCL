const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();

const {
    parseF11HueExcel,
    extractF11DateFromFilename,
    F11_REQUIRED_COLUMNS,
    F11_OPTIONAL_COLUMNS,
    F11_DB_COLUMNS,
} = require('./f11HueExcelParser');
const { BLANK_REASONS, classifyBlankEvaluation } = require('./f11EvaluationFlags');
const { applyF11Phase1Schema } = require('../../migrate_f11_phase1_schema');

const REQUIRED_HEADERS = Object.keys(F11_REQUIRED_COLUMNS);
const OPTIONAL_HEADERS = Object.keys(F11_OPTIONAL_COLUMNS);

function workbookBuffer(headers, rows) {
    const sheet = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'Worksheet');
    return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
}

function makeRow(headers, values) {
    return headers.map((header) => (header in values ? values[header] : null));
}

test('counts: 52 required + 3 optional = 55 columns', () => {
    assert.equal(REQUIRED_HEADERS.length, 52);
    assert.equal(OPTIONAL_HEADERS.length, 3);
    assert.equal(F11_DB_COLUMNS.length, 55);
});

test('a 52-column workbook parses and leaves the optional columns NULL', () => {
    const row = makeRow(REQUIRED_HEADERS, {
        'STT': 1,
        'Số hiệu bưu gửi': 'CB537147555VN',
        'Mã tỉnh chấp nhận': 53,
        'Mã BC phát': 533140,
        'Mã BCKT chấp nhận': -1,
        'Thời gian thực tế': '1169:33',
        'Thời gian chỉ tiêu 2026': 24,
        'Đánh giá 2026': 'Đạt',
    });
    const result = parseF11HueExcel(workbookBuffer(REQUIRED_HEADERS, [row]), 'F1.1-2026.10.07.xlsx');
    assert.equal(result.totalParsed, 1);
    assert.equal(result.ngayDoKiem, '2026-10-07');
    const item = result.parsedData[0];
    assert.equal(item.ma_bg, 'CB537147555VN');
    assert.equal(item.ma_tinh_chap_nhan, '53'); // code stays text
    assert.equal(item.ma_bc_phat, '533140');
    assert.equal(item.ma_bckt_chap_nhan, '-1');
    assert.equal(item.thoi_gian_thuc_te, '1169:33');
    assert.equal(item.thoi_gian_chi_tieu_2026, 24);
    assert.equal(item.danh_gia_2026, 'Đạt');
    assert.equal(item.so_bd10_dong_di_kttinh, null);
    assert.equal(item.thoi_gian_bd10_quet_len_tms_kttinh, null);
    assert.deepEqual(result.presentOptionalHeaders, []);
    assert.equal(result.columnCount, 52);
});

test('a 55-column workbook keeps the optional columns, ISO timestamp unchanged', () => {
    const headers = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
    const row = makeRow(headers, {
        'Số hiệu bưu gửi': 'EE1VN',
        'Thời gian BD10 Đóng đi tại KTTỉnh': '2026-10-03 06:50:50.513',
        'Số BD10 Đóng đi tại KTTỉnh': 530100537220610050,
    });
    const result = parseF11HueExcel(workbookBuffer(headers, [row]), 'F1.1-2026.10.07.xlsx');
    assert.equal(result.columnCount, 55);
    assert.deepEqual(result.presentOptionalHeaders, OPTIONAL_HEADERS);
    assert.equal(result.parsedData[0].thoi_gian_bd10_dong_di_kttinh, '2026-10-03 06:50:50.513');
    assert.equal(typeof result.parsedData[0].so_bd10_dong_di_kttinh, 'string');
});

test('an unknown extra header is accepted and reported, not dropped silently', () => {
    const headers = [...REQUIRED_HEADERS, 'Cột mới của cổng'];
    const row = makeRow(headers, { 'Số hiệu bưu gửi': 'EE1VN', 'Cột mới của cổng': 'x' });
    const result = parseF11HueExcel(workbookBuffer(headers, [row]), 'F1.1-2026.10.07.xlsx');
    assert.deepEqual(result.unmappedHeaders, ['Cột mới của cổng']);
    assert.equal(result.totalParsed, 1);
});

test('a missing required header is a hard error that names it', () => {
    const headers = REQUIRED_HEADERS.filter((h) => h !== 'Đánh giá 2026' && h !== 'Mã BC chấp nhận');
    const row = makeRow(headers, { 'Số hiệu bưu gửi': 'EE1VN' });
    assert.throws(
        () => parseF11HueExcel(workbookBuffer(headers, [row]), 'F1.1-2026.10.07.xlsx'),
        (error) => /Missing expected column/.test(error.message) && error.message.includes('Đánh giá 2026') && error.message.includes('Mã BC chấp nhận'),
    );
});

test('rows without a parcel number are skipped, everything else is kept', () => {
    const rows = [
        makeRow(REQUIRED_HEADERS, { 'Số hiệu bưu gửi': 'A1' }),
        makeRow(REQUIRED_HEADERS, { 'Số hiệu bưu gửi': null, 'STT': 2 }),
        makeRow(REQUIRED_HEADERS, { 'Số hiệu bưu gửi': '  ' }),
        makeRow(REQUIRED_HEADERS, { 'Số hiệu bưu gửi': 'A2' }),
    ];
    const result = parseF11HueExcel(workbookBuffer(REQUIRED_HEADERS, rows), 'F1.1-2026.10.07.xlsx');
    assert.deepEqual(result.parsedData.map((r) => r.ma_bg), ['A1', 'A2']);
});

test('file name rule: only F1.1-YYYY.MM.DD.xlsx with a real calendar date', () => {
    assert.equal(extractF11DateFromFilename('F1.1-2026.10.07.xlsx'), '2026-10-07');
    assert.equal(extractF11DateFromFilename('f1.1-2024.02.29.XLSX'), '2024-02-29');
    for (const bad of ['F1.3-2026.10.07.xlsx', 'F4.1-2026.10.07.xlsx', 'F1.1_2026.10.07.xlsx', 'F1.1-2026.13.40.xlsx', 'F1.1-2026.02.30.xlsx', 'F1.1-2026.10.07.xls', 'F1.1-2026.10.07.xlsx.bak']) {
        assert.throws(() => extractF11DateFromFilename(bad), /F1\.1/, bad);
    }
});

test('business date comes from the file name, not from cell content', () => {
    const row = makeRow(REQUIRED_HEADERS, { 'Số hiệu bưu gửi': 'A1', 'Thời gian PTC': '09/12/2030 10:00:00' });
    const result = parseF11HueExcel(workbookBuffer(REQUIRED_HEADERS, [row]), 'F1.1-2026.10.07.xlsx');
    assert.equal(result.parsedData[0].ngay_do_kiem, '2026-10-07');
});

test('blank-evaluation reasons follow the fixed order', () => {
    const base = { danh_gia_2026: null, ngay_do_kiem: '2026-10-07', thoi_gian_chi_tieu_2026: 24 };
    assert.equal(classifyBlankEvaluation({ ...base, danh_gia_2026: 'Đạt' }), null);
    assert.equal(classifyBlankEvaluation({ ...base, danh_gia_2026: 'Không đạt' }), null);
    assert.equal(classifyBlankEvaluation({ ...base }), BLANK_REASONS.CHUA_PTC);
    assert.equal(classifyBlankEvaluation({ ...base, thoi_gian_ptc: '08/10/2026 13:19:16' }), BLANK_REASONS.PTC_SAU_NGAY_DO_KIEM);
    assert.equal(classifyBlankEvaluation({ ...base, thoi_gian_nop_tien_cod: '08/10/2026 08:00:00' }), BLANK_REASONS.PTC_SAU_NGAY_DO_KIEM);
    // both "after the day" and "no ward target": the first rule wins
    assert.equal(classifyBlankEvaluation({ ...base, thoi_gian_chi_tieu_2026: null, thoi_gian_ptc: '08/10/2026 13:19:16' }), BLANK_REASONS.PTC_SAU_NGAY_DO_KIEM);
    assert.equal(classifyBlankEvaluation({ ...base, thoi_gian_chi_tieu_2026: null, thoi_gian_ptc: '07/10/2026 09:00:00' }), BLANK_REASONS.THIEU_CHI_TIEU_PHUONG);
    assert.equal(classifyBlankEvaluation({ ...base, thoi_gian_ptc: '07/10/2026 09:00:00' }), BLANK_REASONS.KHAC);
    assert.equal(classifyBlankEvaluation({ ...base, danh_gia_2026: '  ' }), BLANK_REASONS.CHUA_PTC);
});

// ---------------------------------------------------------------------------------------------
// Real-file baseline (PO file, git-ignored under Data DKCL): skipped when the file is absent.
// Parses the unmodified workbook, loads it into a TEMPORARY database and reproduces
// measurement.md section 6. The live database is never touched.
// ---------------------------------------------------------------------------------------------
const REAL_FILE = process.env.F11_REAL_FILE
    || path.resolve(__dirname, '../../../Data DKCL/F1.1-2026.10.07.xlsx');
const haveRealFile = fs.existsSync(REAL_FILE);

const EXPECTED_UNITS = {
    '533140': { rows: 1801, dat: 1713, khongDat: 73, blank: 15 },
    '535470': { rows: 273, dat: 205, khongDat: 53, blank: 15 },
    '536250': { rows: 248, dat: 183, khongDat: 64, blank: 1 },
    '535790': { rows: 84, dat: 74, khongDat: 10, blank: 0 },
    '537220': { rows: 132, dat: 96, khongDat: 35, blank: 1 },
    '537015': { rows: 73, dat: 67, khongDat: 5, blank: 1 },
    '531110': { rows: 9, dat: 9, khongDat: 0, blank: 0 },
    '531120': { rows: 1, dat: 1, khongDat: 0, blank: 0 },
};
const CANONICAL_SIX = ['533140', '535470', '536250', '535790', '537220', '537015'];

function sqliteAll(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows))));
}
function sqliteRun(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, (e) => (e ? reject(e) : resolve())));
}

test('real file F1.1-2026.10.07.xlsx reproduces the measurement.md baseline', { skip: haveRealFile ? false : 'PO file not present on this machine' }, async () => {
    const buffer = fs.readFileSync(REAL_FILE);
    const result = parseF11HueExcel(buffer, 'F1.1-2026.10.07.xlsx');
    assert.equal(result.totalParsed, 2621);
    assert.equal(result.columnCount, 55);
    assert.equal(new Set(result.parsedData.map((r) => r.ma_bg)).size, 2621, 'no duplicate parcel numbers');

    // blank-evaluation split derived from the parsed rows (13 / 1 / 19)
    const split = {};
    for (const row of result.parsedData) {
        const reason = classifyBlankEvaluation(row);
        if (reason) split[reason] = (split[reason] || 0) + 1;
    }
    assert.deepEqual(split, {
        [BLANK_REASONS.PTC_SAU_NGAY_DO_KIEM]: 13,
        [BLANK_REASONS.THIEU_CHI_TIEU_PHUONG]: 1,
        [BLANK_REASONS.CHUA_PTC]: 19,
    });

    const dbPath = path.join(os.tmpdir(), `f11-baseline-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    try {
        await applyF11Phase1Schema(dbPath);
        const db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
        try {
            const columns = result.dbColumns;
            const sql = `INSERT INTO fact_f11 (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
            await sqliteRun(db, 'BEGIN');
            for (const item of result.parsedData) await sqliteRun(db, sql, columns.map((c) => item[c]));
            await sqliteRun(db, 'COMMIT');

            const units = await sqliteAll(db, `SELECT ma_bc_phat AS unit, COUNT(*) AS n,
                SUM(danh_gia_2026 = 'Đạt') AS dat, SUM(danh_gia_2026 = 'Không đạt') AS kd,
                SUM(danh_gia_2026 IS NULL) AS blank
                FROM fact_f11 WHERE ngay_do_kiem = '2026-10-07' GROUP BY ma_bc_phat`);
            assert.equal(units.length, 8);
            for (const u of units) {
                const exp = EXPECTED_UNITS[u.unit];
                assert.ok(exp, `unexpected unit ${u.unit}`);
                assert.deepEqual({ rows: u.n, dat: u.dat, khongDat: u.kd, blank: u.blank }, exp, u.unit);
            }

            const total = (await sqliteAll(db, `SELECT COUNT(*) AS n, SUM(danh_gia_2026 = 'Đạt') AS dat FROM fact_f11`))[0];
            assert.deepEqual({ n: total.n, dat: total.dat }, { n: 2621, dat: 2348 });
            assert.equal(((total.dat / total.n) * 100).toFixed(2), '89.58'); // F11_001, NOT 90.73 (evaluated rows only)

            const six = (await sqliteAll(db, `SELECT COUNT(*) AS n, SUM(danh_gia_2026 = 'Đạt') AS dat FROM fact_f11
                WHERE ma_bc_phat IN (${CANONICAL_SIX.map(() => '?').join(',')})`, CANONICAL_SIX))[0];
            assert.deepEqual({ n: six.n, dat: six.dat }, { n: 2611, dat: 2338 });
            assert.equal(((six.dat / six.n) * 100).toFixed(2), '89.54'); // F11_002

            // pair grid (accepting office x delivering unit): every cell sums back to its unit and to the total
            const grid = await sqliteAll(db, `SELECT ma_bc_chap_nhan AS acc, ma_bc_phat AS unit, COUNT(*) AS n,
                SUM(danh_gia_2026 = 'Đạt') AS dat FROM fact_f11 GROUP BY ma_bc_chap_nhan, ma_bc_phat`);
            assert.equal(grid.reduce((a, c) => a + c.n, 0), 2621);
            assert.equal(grid.reduce((a, c) => a + c.dat, 0), 2348);
            const gridByUnit = {};
            for (const cell of grid) gridByUnit[cell.unit] = (gridByUnit[cell.unit] || 0) + cell.n;
            for (const [unit, exp] of Object.entries(EXPECTED_UNITS)) assert.equal(gridByUnit[unit], exp.rows, unit);

            // the evaluated-rows view the portal publishes is a different, labelled figure
            const evaluated = (await sqliteAll(db, `SELECT COUNT(*) AS n FROM fact_f11 WHERE danh_gia_2026 IS NOT NULL`))[0].n;
            assert.equal(evaluated, 2588);
        } finally {
            await new Promise((resolve) => db.close(resolve));
        }
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});
