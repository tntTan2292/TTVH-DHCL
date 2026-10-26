'use strict';

// F42-PHASE-2/4 - F4.2 HUE and TCT Import through the shared pipeline, entirely inside a temporary sandbox
// (own database, own Data tree). The production database and Data DKCL tree are never touched.
// Run per file: node --test --experimental-sqlite test_f42ImportPipeline.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f42-pipeline-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F42 = path.join(sandbox, 'F4.2');

const { db, run, get } = require('./src/config/db');
const { executeImport } = require('./src/services/importPipeline');
const { getIndicatorConfig, getLaneConfig, validateIndicatorRegistry, INDICATORS } = require('./src/services/importIndicatorRegistry');
const { applyF42Schema } = require('./migrate_f42_schema');
const { initSchema } = require('./test/importTestSandbox');
const { hueCsvBuffer, defaultHueSpecs, tctBuffer, tctPopulation } = require('./test/f42Fixtures');

const REAL_HUE = path.resolve(__dirname, '../Data DKCL/F4.2-2026.10.10.csv');
const REAL_TCT = path.resolve(__dirname, '../Data DKCL/F4.2-TCT-2026.10.10.xlsx');
const incoming = (lane) => path.join(process.env.QIS_TEST_DATA_ROOT_F42, 'Incoming', lane);
const processed = (lane, name) => path.join(process.env.QIS_TEST_DATA_ROOT_F42, 'Processed', lane, name);

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

test('registry: F4.2 is a valid PLANNED indicator with manual HUE and TCT lanes and its own tables', () => {
    validateIndicatorRegistry();
    assert.equal(INDICATORS['F4.2'].status, 'PLANNED');
    assert.equal(getLaneConfig('F4.2', 'HUE').targetTable, 'fact_f42');
    assert.equal(getLaneConfig('F4.2', 'TCT').targetTable, 'fact_f42_national');
    assert.equal(getLaneConfig('F4.2', 'HUE').automationMode, 'MANUAL_ONLY');
    assert.equal(getLaneConfig('F4.2', 'TCT').automationMode, 'MANUAL_ONLY');
    for (const name of ['F4.2-2026.10.10.csv', 'F4.2-2026.10.10.xlsx']) assert.equal(INDICATORS['F4.2'].filenamePattern.test(name), true);
    for (const name of ['F4.1-2026.10.10.csv', 'F4.2-2026.10.10.txt']) assert.equal(INDICATORS['F4.2'].filenamePattern.test(name), false);
    assert.equal(INDICATORS['F4.2'].formatFilename('2026-10-10'), 'F4.2-2026.10.10.xlsx');
    assert.ok(getIndicatorConfig('F4.2').incomingDir.startsWith(process.env.QIS_TEST_DATA_ROOT_F42));
});

test('HUE lane imports a CSV in isolation, asks confirmation on retry, replaces on force, leaves other tables alone', async () => {
    await initSchema(db); // schema.sql (incl. the fact_f42 mirror) -- the migration must then be a no-op on top of it
    await applyF42Schema(process.env.QIS_TEST_DB_PATH);
    await run("INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026) VALUES ('2026-10-10', 'F13-SENTINEL', '533140', 'BCVH Thuận Hóa', 'Đạt')");

    ensureDir(incoming('HUE'));
    const file = path.join(incoming('HUE'), 'F4.2-2026.10.10.csv');
    fs.writeFileSync(file, hueCsvBuffer());
    const first = await executeImport({ filePath: file, indicator: 'F4.2', lane: 'HUE', source: 'MANUAL' });
    assert.equal(first.inserted, 4);
    assert.equal(first.ngay_do_kiem, '2026-10-10');
    const stored = await get("SELECT ma_buu_ta AS postman, ma_bc_phat AS office, typeof(ma_bc_phat) AS t, danh_gia AS rating FROM fact_f42 WHERE ma_bg = 'P2'");
    assert.deepEqual({ ...stored }, { postman: '53A002', office: '536250', t: 'text', rating: 'Đạt' });
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f42 WHERE danh_gia IS NULL")).n, 1, 'the blank rating stays NULL (it is in the denominator)');
    assert.ok(fs.existsSync(processed('HUE', 'F4.2-2026.10.10.csv')));

    fs.writeFileSync(file, hueCsvBuffer());
    const retry = await executeImport({ filePath: file, indicator: 'F4.2', lane: 'HUE', source: 'MANUAL' });
    assert.equal(retry.requiresConfirmation, true);
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f42')).n, 4);

    // a later export of the same day: the blank became Đạt; forced re-import replaces the day
    const later = defaultHueSpecs();
    later[3] = { parcel: 'P4', ptc: '2026-10-10 12:00:00.000', elapsed: '4:0', rating: 'Đạt' };
    fs.writeFileSync(file, hueCsvBuffer(later));
    const forced = await executeImport({ filePath: file, indicator: 'F4.2', lane: 'HUE', source: 'MANUAL', forceReimport: true });
    assert.equal(forced.inserted, 4);
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f42')).n, 4);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f42 WHERE danh_gia = 'Đạt'")).n, 3);
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f13')).n, 1, 'F1.3 table untouched');
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f12')).n, 0, 'F1.2 table untouched');
    const logs = await get("SELECT SUM(indicator='F4.2' AND source_lane='HUE' AND status='SUCCESS') AS ok, SUM(indicator<>'F4.2') AS other FROM import_log");
    assert.deepEqual({ ...logs }, { ok: 2, other: 0 });
});

test('HUE lane: a file renamed to the wrong day fails, goes to Error, writes a FAILED log and no rows', async () => {
    ensureDir(incoming('HUE'));
    const file = path.join(incoming('HUE'), 'F4.2-2026.10.12.csv');
    fs.writeFileSync(file, hueCsvBuffer()); // GBT on 10/10
    await assert.rejects(executeImport({ filePath: file, indicator: 'F4.2', lane: 'HUE', source: 'MANUAL' }), /file name date does not match/);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f42 WHERE ngay_do_kiem = '2026-10-12'")).n, 0);
    assert.ok(fs.existsSync(path.join(process.env.QIS_TEST_DATA_ROOT_F42, 'Error', 'HUE', 'F4.2-2026.10.12.csv')));
    assert.equal((await get("SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'F4.2' AND ngay_do_kiem = '2026-10-12' AND status = 'FAILED'")).n, 1);
});

test('TCT lane imports the 34 ranked provinces into fact_f42_national only', async () => {
    ensureDir(incoming('TCT'));
    const file = path.join(incoming('TCT'), 'F4.2-2026.10.10.xlsx');
    fs.writeFileSync(file, tctBuffer(tctPopulation({}, [{ code: '01', postman: 'EMS1', gbt: 500, ok: 450 }])));
    const result = await executeImport({ filePath: file, indicator: 'F4.2', lane: 'TCT', source: 'MANUAL' });
    assert.equal(result.inserted, 34);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f42_national WHERE ngay_do_kiem = '2026-10-10'")).n, 34);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f42_national WHERE ma_tinh_phat = '01'")).n, 0, 'EMS is not stored');
    assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f42')).n, 4, 'HUE rows untouched');
    assert.equal((await get("SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'F4.2' AND source_lane = 'TCT' AND status = 'SUCCESS'")).n, 1);
});

test('real files 10/10/2026 import through both lanes and reconcile: Huế detail = national row 53 = DKCL screen 4 475 / 6 466', { skip: fs.existsSync(REAL_HUE) && fs.existsSync(REAL_TCT) ? false : 'PO files not present on this machine' }, async () => {
    await run("DELETE FROM fact_f42 WHERE ngay_do_kiem = '2026-10-10'");
    await run("DELETE FROM fact_f42_national WHERE ngay_do_kiem = '2026-10-10'");
    await run("DELETE FROM import_log WHERE indicator = 'F4.2' AND ngay_do_kiem = '2026-10-10'");
    ensureDir(incoming('HUE'));
    ensureDir(incoming('TCT'));
    const hueFile = path.join(incoming('HUE'), 'F4.2-2026.10.10.csv');
    const tctFile = path.join(incoming('TCT'), 'F4.2-2026.10.10.xlsx');
    fs.copyFileSync(REAL_HUE, hueFile); // COPY: the PO's files are never moved or changed
    fs.copyFileSync(REAL_TCT, tctFile);

    const hue = await executeImport({ filePath: hueFile, indicator: 'F4.2', lane: 'HUE', source: 'MANUAL', forceReimport: true });
    const tct = await executeImport({ filePath: tctFile, indicator: 'F4.2', lane: 'TCT', source: 'MANUAL', forceReimport: true });
    assert.deepEqual([hue.total, hue.inserted, tct.total, tct.inserted], [6466, 6466, 34, 34]);

    const detail = await get(`
        SELECT COUNT(*) AS n, SUM(danh_gia = 'Đạt') AS dat, SUM(danh_gia = 'Không đạt') AS kd,
               SUM(danh_gia IS NULL) AS blank, COUNT(DISTINCT ma_buu_ta) AS postmen, COUNT(DISTINCT ma_bc_phat) AS offices
        FROM fact_f42 WHERE ngay_do_kiem = '2026-10-10'`);
    assert.deepEqual({ ...detail }, { n: 6466, dat: 4475, kd: 757, blank: 1234, postmen: 128, offices: 6 });
    const national = await get("SELECT sl_gbt AS n, sl_dung_qd AS dat, sl_qua_qd AS kd, so_buu_ta AS postmen FROM fact_f42_national WHERE ngay_do_kiem = '2026-10-10' AND ma_tinh_phat = '53'");
    assert.deepEqual({ ...national }, { n: detail.n, dat: detail.dat, kd: detail.kd, postmen: detail.postmen });
    assert.equal(((detail.dat / detail.n) * 100).toFixed(2), '69.21');
    assert.ok(fs.existsSync(REAL_HUE) && fs.existsSync(REAL_TCT), 'source files still in place');
});

test('cleanup', async () => {
    await new Promise((resolve) => db.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
});
