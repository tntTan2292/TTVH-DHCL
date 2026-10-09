'use strict';

// F11-PHASE-2 - F1.1 / HUE Import through the shared pipeline, entirely inside a temporary sandbox
// (own database, own Data tree). The production database and Data DKCL tree are never touched.
// Run per file: node --test --experimental-sqlite test_f11ImportPipeline.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f11-pipeline-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F11 = path.join(sandbox, 'F1.1');

const { db, run, get, all } = require('./src/config/db');
const { executeImport } = require('./src/services/importPipeline');
const { getIndicatorConfig, getLaneConfig, validateIndicatorRegistry, INDICATORS } = require('./src/services/importIndicatorRegistry');
const { F11_REQUIRED_COLUMNS, F11_OPTIONAL_COLUMNS } = require('./src/services/f11HueExcelParser');
const { applyF11Phase1Schema } = require('./migrate_f11_phase1_schema');
const { initSchema } = require('./test/importTestSandbox');

const HEADERS = [...Object.keys(F11_REQUIRED_COLUMNS), ...Object.keys(F11_OPTIONAL_COLUMNS)];
const REAL_FILE = path.resolve(__dirname, '../Data DKCL/F1.1-2026.10.07.xlsx');

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function writeWorkbook(filePath, headers, rows) {
    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Worksheet');
    xlsx.writeFile(wb, filePath);
}

function row(values) {
    return HEADERS.map((h) => (h in values ? values[h] : null));
}

function buildSmallFile(filePath, { evaluation = ['Đạt', 'Đạt', 'Không đạt', null] } = {}) {
    const rows = evaluation.map((ev, i) => row({
        'STT': i + 1,
        'Số hiệu bưu gửi': `F11-${i + 1}`,
        'Mã tỉnh chấp nhận': 53,
        'Mã BC chấp nhận': 531120,
        'Mã BC phát': i < 3 ? 533140 : 535470,
        'Thời gian chỉ tiêu 2026': 24,
        'Đánh giá 2026': ev,
    }));
    writeWorkbook(filePath, HEADERS, rows);
}

test('registry: F1.1 is a valid PLANNED indicator with a manual HUE lane and its own table', () => {
    validateIndicatorRegistry();
    assert.equal(INDICATORS['F1.1'].status, 'PLANNED');
    const lane = getLaneConfig('F1.1', 'HUE');
    assert.equal(lane.targetTable, 'fact_f11');
    assert.equal(lane.automationMode, 'MANUAL_ONLY');
    assert.equal(INDICATORS['F1.1'].filenamePattern.test('F1.1-2026.10.07.xlsx'), true);
    assert.equal(INDICATORS['F1.1'].filenamePattern.test('F1.3-2026.10.07.xlsx'), false);
    assert.equal(INDICATORS['F1.1'].formatFilename('2026-10-07'), 'F1.1-2026.10.07.xlsx');
    assert.ok(getIndicatorConfig('F1.1').incomingDir.startsWith(process.env.QIS_TEST_DATA_ROOT_F11));
    assert.throws(() => getLaneConfig('F1.1', 'TCT'), /not registered/);
});

test('F1.1 pipeline imports HUE in isolation, asks confirmation on retry, replaces on force, leaves F1.3/F4.1 alone', async () => {
    try {
        await initSchema(db); // schema.sql (incl. the fact_f11 mirror) -- then the migration must be a no-op on top of it
        await applyF11Phase1Schema(process.env.QIS_TEST_DB_PATH);
        await run("INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026) VALUES ('2026-10-07', 'F13-SENTINEL', '533140', 'BCVH Thuận Hóa', 'Đạt')");

        const incoming = path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Incoming', 'HUE');
        ensureDir(incoming);
        const file = path.join(incoming, 'F1.1-2026.10.07.xlsx');
        buildSmallFile(file);

        const first = await executeImport({ filePath: file, indicator: 'F1.1', lane: 'HUE', source: 'MANUAL' });
        assert.equal(first.inserted, 4);
        assert.equal(first.ngay_do_kiem, '2026-10-07');
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f11')).n, 4);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f13')).n, 1, 'F1.3 table untouched');
        const stored = await get("SELECT ma_tinh_chap_nhan AS acc, ma_bc_phat AS unit, typeof(ma_bc_phat) AS t FROM fact_f11 WHERE ma_bg = 'F11-1'");
        assert.deepEqual({ acc: stored.acc, unit: stored.unit, t: stored.t }, { acc: '53', unit: '533140', t: 'text' });

        // the processed file moved under F1.1/Processed/HUE, the incoming one is gone
        assert.ok(fs.existsSync(path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Processed', 'HUE', 'F1.1-2026.10.07.xlsx')));
        assert.equal(fs.existsSync(file), false);

        // same date again without force -> confirmation required, nothing written
        buildSmallFile(file);
        const retry = await executeImport({ filePath: file, indicator: 'F1.1', lane: 'HUE', source: 'MANUAL' });
        assert.equal(retry.requiresConfirmation, true);
        assert.equal(retry.ngay_do_kiem, '2026-10-07');
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f11')).n, 4);

        // forced re-import replaces that date only
        buildSmallFile(file, { evaluation: ['Đạt', 'Đạt', 'Đạt', 'Đạt', 'Không đạt'] });
        const forced = await executeImport({ filePath: file, indicator: 'F1.1', lane: 'HUE', source: 'MANUAL', forceReimport: true });
        assert.equal(forced.inserted, 5);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f11')).n, 5);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f13')).n, 1);

        const logs = await get(`SELECT SUM(indicator='F1.1' AND source_lane='HUE' AND status='SUCCESS') AS ok FROM import_log`);
        assert.equal(logs.ok, 2);
        assert.equal((await get("SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'F1.3' OR indicator = 'F4.1'")).n, 0);
    } finally {
        // keep the sandbox for the next test; cleanup happens in the last test
    }
});

test('F1.1 pipeline: a file with a bad evaluation value fails, goes to Error, writes a FAILED log and no rows', async () => {
    const incoming = path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Incoming', 'HUE');
    ensureDir(incoming);
    const file = path.join(incoming, 'F1.1-2026.10.09.xlsx');
    buildSmallFile(file, { evaluation: ['Đạt', 'Dat'] });
    await assert.rejects(executeImport({ filePath: file, indicator: 'F1.1', lane: 'HUE', source: 'MANUAL' }), /unexpected value/);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f11 WHERE ngay_do_kiem = '2026-10-09'")).n, 0);
    assert.ok(fs.existsSync(path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Error', 'HUE', 'F1.1-2026.10.09.xlsx')));
    const failed = await get("SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'F1.1' AND ngay_do_kiem = '2026-10-09' AND status = 'FAILED'");
    assert.equal(failed.n, 1);
});

test('F1.1 pipeline: the F1.3 / F4.1 filename rules still reject an F1.1 file name and vice versa', async () => {
    const incoming = path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Incoming', 'HUE');
    ensureDir(incoming);
    const wrong = path.join(incoming, 'F1.3-2026.10.08.xlsx');
    buildSmallFile(wrong);
    await assert.rejects(executeImport({ filePath: wrong, indicator: 'F1.1', lane: 'HUE', source: 'MANUAL' }), /F1\.1/);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f11 WHERE ngay_do_kiem = '2026-10-08'")).n, 0);
});

test('real file F1.1-2026.10.07.xlsx imports through the pipeline into the sandbox and reproduces the baseline', { skip: fs.existsSync(REAL_FILE) ? false : 'PO file not present on this machine' }, async () => {
    // fresh date slot: copy the real file under the same name after clearing the small test rows
    await run("DELETE FROM fact_f11 WHERE ngay_do_kiem = '2026-10-07'");
    await run("DELETE FROM import_log WHERE indicator = 'F1.1' AND ngay_do_kiem = '2026-10-07'");
    const incoming = path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Incoming', 'HUE');
    ensureDir(incoming);
    const file = path.join(incoming, 'F1.1-2026.10.07.xlsx');
    fs.copyFileSync(REAL_FILE, file); // COPY: the PO's file is never moved or changed

    const result = await executeImport({ filePath: file, indicator: 'F1.1', lane: 'HUE', source: 'MANUAL', forceReimport: true });
    assert.equal(result.total, 2621);
    assert.equal(result.inserted, 2621);
    const totals = await get("SELECT COUNT(*) AS n, SUM(danh_gia_2026 = 'Đạt') AS dat, SUM(danh_gia_2026 = 'Không đạt') AS kd, SUM(danh_gia_2026 IS NULL) AS blank FROM fact_f11 WHERE ngay_do_kiem = '2026-10-07'");
    assert.deepEqual({ n: totals.n, dat: totals.dat, kd: totals.kd, blank: totals.blank }, { n: 2621, dat: 2348, kd: 240, blank: 33 });
    assert.equal(((totals.dat / totals.n) * 100).toFixed(2), '89.58');
    const six = await get("SELECT COUNT(*) AS n, SUM(danh_gia_2026 = 'Đạt') AS dat FROM fact_f11 WHERE ma_bc_phat IN ('533140','535470','536250','535790','537220','537015')");
    assert.deepEqual({ n: six.n, dat: six.dat }, { n: 2611, dat: 2338 });
    const pairs = await all('SELECT ma_bc_chap_nhan, ma_bc_phat, COUNT(*) AS n FROM fact_f11 GROUP BY ma_bc_chap_nhan, ma_bc_phat');
    assert.equal(pairs.reduce((a, p) => a + p.n, 0), 2621);
    assert.equal(fs.existsSync(REAL_FILE), true, 'source file still in place');
});

test('cleanup', async () => {
    await new Promise((resolve) => db.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
});
