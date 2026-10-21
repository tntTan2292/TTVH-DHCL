'use strict';

// F12-PHASE-2/4 - F1.2 HUE and TCT Import through the shared pipeline, entirely inside a temporary sandbox
// (own database, own Data tree). The production database and Data DKCL tree are never touched.
// Run per file: node --test --experimental-sqlite test_f12ImportPipeline.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f12-pipeline-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F12 = path.join(sandbox, 'F1.2');

const { db, run, get } = require('./src/config/db');
const { executeImport } = require('./src/services/importPipeline');
const { getIndicatorConfig, getLaneConfig, validateIndicatorRegistry, INDICATORS } = require('./src/services/importIndicatorRegistry');
const { F12_REQUIRED_COLUMNS, F12_OPTIONAL_COLUMNS } = require('./src/services/f12HueExcelParser');
const { applyF12Schema } = require('./migrate_f12_schema');
const { initSchema } = require('./test/importTestSandbox');
const { f12TctBuffer, population } = require('./test/f12TctFixture');

const HEADERS = [...Object.keys(F12_REQUIRED_COLUMNS), ...Object.keys(F12_OPTIONAL_COLUMNS)];
const TMS = 'Thời gian BĐ10 quét lên xe tại KT tỉnh chấp nhận TMS/ quét xuống đối với tỉnh có HUB';
const REAL_FILE = path.resolve(__dirname, '../Data DKCL/F1.2-2026.10.10.xlsx');
const REAL_TCT = path.resolve(__dirname, '../Data DKCL/F1.2-TCT-2026.10.10.xlsx');
const incoming = (lane) => path.join(process.env.QIS_TEST_DATA_ROOT_F12, 'Incoming', lane);

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function buildSmallFile(filePath, { ratings = ['Đạt', 'Đạt', 'Không đạt'], day = '10/10/2026' } = {}) {
    const rows = ratings.map((rating, i) => HEADERS.map((h) => ({
        'Số hiệu bưu gửi': `F12-${i + 1}`,
        'Mã tỉnh chấp nhận': 53,
        'Mã BC nhận tin/chấp nhận': i < 2 ? 531120 : 533250,
        'Mã Huyện': i < 2 ? 5375 : 5306,
        'Thời gian chấp nhận': '09/10/2026 18:21:42',
        [TMS]: `${day} 05:32:36`,
        'Thời gian thực hiện thực tế (giờ)': rating === 'Đạt' ? '1:11' : '11:8',
        'Đánh giá (Đạt/Không đạt)': rating,
    }[h] ?? null)));
    const ws = xlsx.utils.aoa_to_sheet([HEADERS, ...rows]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Worksheet');
    xlsx.writeFile(wb, filePath);
}

test('registry: F1.2 is a valid ACTIVE indicator with automatic HUE and TCT lanes, a 2-day refresh window and its own tables', () => {
    validateIndicatorRegistry();
    assert.equal(INDICATORS['F1.2'].status, 'ACTIVE');
    assert.equal(INDICATORS['F1.2'].refreshWindowDays, 2);
    assert.equal(getLaneConfig('F1.2', 'HUE').targetTable, 'fact_f12');
    assert.equal(getLaneConfig('F1.2', 'TCT').targetTable, 'fact_f12_national');
    assert.equal(getLaneConfig('F1.2', 'HUE').automationMode, 'AUTOMATED');
    assert.equal(getLaneConfig('F1.2', 'TCT').automationMode, 'AUTOMATED');
    assert.equal(INDICATORS['F1.2'].filenamePattern.test('F1.2-2026.10.10.xlsx'), true);
    assert.equal(INDICATORS['F1.2'].filenamePattern.test('F1.1-2026.10.10.xlsx'), false);
    assert.equal(INDICATORS['F1.2'].formatFilename('2026-10-10'), 'F1.2-2026.10.10.xlsx');
    assert.ok(getIndicatorConfig('F1.2').incomingDir.startsWith(process.env.QIS_TEST_DATA_ROOT_F12));
});

test('HUE lane imports in isolation, asks confirmation on retry, replaces on force, leaves other tables alone', async () => {
    await initSchema(db); // schema.sql (incl. the fact_f12 mirror) -- the migration must then be a no-op on top of it
    await applyF12Schema(process.env.QIS_TEST_DB_PATH);
    await run("INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026) VALUES ('2026-10-10', 'F13-SENTINEL', '533140', 'BCVH Thuận Hóa', 'Đạt')");

    ensureDir(incoming('HUE'));
    const file = path.join(incoming('HUE'), 'F1.2-2026.10.10.xlsx');
    buildSmallFile(file);
    const first = await executeImport({ filePath: file, indicator: 'F1.2', lane: 'HUE', source: 'MANUAL' });
    assert.equal(first.inserted, 3);
    assert.equal(first.ngay_do_kiem, '2026-10-10');
    const stored = await get("SELECT ma_tinh_chap_nhan AS acc, ma_huyen AS unit, typeof(ma_bc_chap_nhan) AS t FROM fact_f12 WHERE ma_bg = 'F12-1'");
    assert.deepEqual({ ...stored }, { acc: '53', unit: '5375', t: 'text' });
    assert.ok(fs.existsSync(path.join(process.env.QIS_TEST_DATA_ROOT_F12, 'Processed', 'HUE', 'F1.2-2026.10.10.xlsx')));

    buildSmallFile(file);
    const retry = await executeImport({ filePath: file, indicator: 'F1.2', lane: 'HUE', source: 'MANUAL' });
    assert.equal(retry.requiresConfirmation, true);
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f12')).n, 3);

    buildSmallFile(file, { ratings: ['Đạt', 'Đạt', 'Đạt', 'Không đạt'] });
    const forced = await executeImport({ filePath: file, indicator: 'F1.2', lane: 'HUE', source: 'MANUAL', forceReimport: true });
    assert.equal(forced.inserted, 4);
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f12')).n, 4);
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f13')).n, 1, 'F1.3 table untouched');
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f11')).n, 0, 'F1.1 table untouched');
    const logs = await get("SELECT SUM(indicator='F1.2' AND source_lane='HUE' AND status='SUCCESS') AS ok, SUM(indicator<>'F1.2') AS other FROM import_log");
    assert.deepEqual({ ...logs }, { ok: 2, other: 0 });
});

test('HUE lane: a file renamed to the wrong day fails, goes to Error, writes a FAILED log and no rows', async () => {
    ensureDir(incoming('HUE'));
    const file = path.join(incoming('HUE'), 'F1.2-2026.10.12.xlsx');
    buildSmallFile(file); // BĐ10 on 10/10
    await assert.rejects(executeImport({ filePath: file, indicator: 'F1.2', lane: 'HUE', source: 'MANUAL' }), /file name date does not match/);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f12 WHERE ngay_do_kiem = '2026-10-12'")).n, 0);
    assert.ok(fs.existsSync(path.join(process.env.QIS_TEST_DATA_ROOT_F12, 'Error', 'HUE', 'F1.2-2026.10.12.xlsx')));
    assert.equal((await get("SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'F1.2' AND ngay_do_kiem = '2026-10-12' AND status = 'FAILED'")).n, 1);
});

test('TCT lane imports one row per accepting province into fact_f12_national only', async () => {
    ensureDir(incoming('TCT'));
    const file = path.join(incoming('TCT'), 'F1.2-2026.10.10.xlsx');
    fs.writeFileSync(file, f12TctBuffer(population({}, [{ code: '01', den: 500, ok: 450 }])));
    const result = await executeImport({ filePath: file, indicator: 'F1.2', lane: 'TCT', source: 'MANUAL' });
    assert.equal(result.inserted, 35);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f12_national WHERE ngay_do_kiem = '2026-10-10'")).n, 35);
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f12')).n, 4, 'HUE rows untouched');
    assert.equal((await get("SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'F1.2' AND source_lane = 'TCT' AND status = 'SUCCESS'")).n, 1);
});

test('real files 10/10/2026 import through both lanes and reconcile: Huế detail = national row 53', { skip: fs.existsSync(REAL_FILE) && fs.existsSync(REAL_TCT) ? false : 'PO files not present on this machine' }, async () => {
    await run("DELETE FROM fact_f12 WHERE ngay_do_kiem = '2026-10-10'");
    await run("DELETE FROM fact_f12_national WHERE ngay_do_kiem = '2026-10-10'");
    await run("DELETE FROM import_log WHERE indicator = 'F1.2' AND ngay_do_kiem = '2026-10-10'");
    ensureDir(incoming('HUE'));
    ensureDir(incoming('TCT'));
    const hueFile = path.join(incoming('HUE'), 'F1.2-2026.10.10.xlsx');
    const tctFile = path.join(incoming('TCT'), 'F1.2-2026.10.10.xlsx');
    fs.copyFileSync(REAL_FILE, hueFile); // COPY: the PO's files are never moved or changed
    fs.copyFileSync(REAL_TCT, tctFile);

    const hue = await executeImport({ filePath: hueFile, indicator: 'F1.2', lane: 'HUE', source: 'MANUAL', forceReimport: true });
    const tct = await executeImport({ filePath: tctFile, indicator: 'F1.2', lane: 'TCT', source: 'MANUAL', forceReimport: true });
    assert.deepEqual([hue.total, hue.inserted, tct.total, tct.inserted], [1758, 1758, 53, 53]);

    const detail = await get(`
        SELECT COUNT(*) AS n, SUM(danh_gia = 'Đạt') AS dat, SUM(danh_gia = 'Không đạt') AS kd,
               COUNT(DISTINCT ma_bc_chap_nhan) AS offices, COUNT(DISTINCT ma_huyen) AS units
        FROM fact_f12 WHERE ngay_do_kiem = '2026-10-10'`);
    assert.deepEqual({ ...detail }, { n: 1758, dat: 1620, kd: 138, offices: 73, units: 37 });
    const national = await get("SELECT sl_bd10_dong_di AS n, sl_dung_qd AS dat, sl_qua_qd AS kd FROM fact_f12_national WHERE ngay_do_kiem = '2026-10-10' AND ma_tinh_chap_nhan = '53'");
    assert.deepEqual({ ...national }, { n: detail.n, dat: detail.dat, kd: detail.kd });
    assert.equal(((detail.dat / detail.n) * 100).toFixed(2), '92.15');
    assert.ok(fs.existsSync(REAL_FILE) && fs.existsSync(REAL_TCT), 'source files still in place');
});

test('cleanup', async () => {
    await new Promise((resolve) => db.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
});
