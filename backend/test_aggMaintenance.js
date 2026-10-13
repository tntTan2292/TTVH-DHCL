/**
 * test_aggMaintenance.js - PERF-LOAD-01 Phase 2 (P2.0): write path and tooling of the agg_*_day tables.
 *
 * Isolated temp SQLite database only (never the operational database.sqlite).
 * Run: node --experimental-sqlite --test test_aggMaintenance.js
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSandbox, initSchema, destroySandbox } = require('./test/importTestSandbox');

const sandbox = createSandbox('qis-agg-maintenance-test-');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = sandbox.dbPath;

const { db, run, all, get } = require('./src/config/db');
const sqlite3 = require('sqlite3');
const { DB_COLUMNS } = require('./src/services/excelParser');
const { F41_HUE_DB_COLUMNS } = require('./src/services/f41HueExcelParser');
const { F11_DB_COLUMNS } = require('./src/services/f11HueExcelParser');
const { F12_DB_COLUMNS } = require('./src/services/f12HueExcelParser');
const {
    importParsedData,
    importF41ParsedData,
    importF11ParsedData,
    importF12ParsedData,
} = require('./src/services/importProcessor');
const { AGG_DEFINITIONS, aggColumnList, buildAggSelectSql } = require('./src/services/aggMaintenance');
const { verifyIndicator, makeHelpers } = require('./scripts/agg_tool');
const { applyPerfLoad01AggSchema } = require('./migrate_perf_load_01_agg_schema');
const { FactF41Repository } = require('./src/repositories/FactF41Repository');

const D1 = '2000-02-01';
const D2 = '2000-02-02';

function blank(columns, values) {
    const row = {};
    for (const column of columns) row[column] = null;
    return Object.assign(row, values);
}
const f13 = (v) => blank(DB_COLUMNS, v);
const f41 = (v) => blank(F41_HUE_DB_COLUMNS, v);
const f11 = (v) => blank(F11_DB_COLUMNS, v);
const f12 = (v) => blank(F12_DB_COLUMNS, v);

// The aggregate must equal a fresh GROUP BY of the detail table, in both directions.
async function assertAggEqualsFact(indicator) {
    const def = AGG_DEFINITIONS[indicator];
    const columns = aggColumnList(indicator).join(', ');
    const factSql = `SELECT ${columns} FROM (${buildAggSelectSql(indicator, '1 = 1')})`;
    const aggSql = `SELECT ${columns} FROM ${def.aggTable}`;
    const a = await all(`${factSql} EXCEPT ${aggSql}`);
    const b = await all(`${aggSql} EXCEPT ${factSql}`);
    assert.deepEqual(a, [], `${indicator}: detail groups missing or different in agg`);
    assert.deepEqual(b, [], `${indicator}: agg groups without an equal detail group`);
    const totals = await get(`SELECT (SELECT COUNT(*) FROM ${def.factTable}) AS f, (SELECT COALESCE(SUM(n_rows), 0) FROM ${def.aggTable}) AS a`);
    assert.equal(totals.a, totals.f, `${indicator}: SUM(n_rows) must equal detail COUNT(*)`);
}

async function wipe() {
    for (const table of ['fact_f13', 'fact_f41', 'fact_f11', 'fact_f12', 'agg_f13_day', 'agg_f41_day', 'agg_f11_day', 'agg_f12_day', 'import_log']) {
        await run(`DELETE FROM ${table}`);
    }
}

test.before(async () => { await initSchema(db); });
test.after(async () => {
    await new Promise((resolve) => db.close(resolve));
    destroySandbox(sandbox);
});
test.beforeEach(async () => { await wipe(); });

test('migration creates the agg tables and is idempotent', async () => {
    const first = await applyPerfLoad01AggSchema(sandbox.dbPath);
    const second = await applyPerfLoad01AggSchema(sandbox.dbPath);
    assert.deepEqual(first, ['agg_f11_day', 'agg_f12_day', 'agg_f13_day', 'agg_f41_day', 'agg_state']);
    assert.deepEqual(second, first);
});

test('F4.1 import stores the raw counters per day and unit', async () => {
    await importF41ParsedData({
        ngay_do_kiem: D1, filename: 'F4.1-2000.02.01.xlsx',
        parsedData: [
            f41({ ma_bg: 'A1', ma_bc_phat: 'U1', ten_bc_phat: 'Unit 1', danh_gia_co_tms_ptc_8h: 'Đạt' }),
            f41({ ma_bg: 'A2', ma_bc_phat: 'U1', ten_bc_phat: 'Unit 1', danh_gia_co_tms_ptc_8h: 'Không đạt' }),
            f41({ ma_bg: 'A3', ma_bc_phat: 'U1', ten_bc_phat: 'Unit 1', danh_gia_co_tms_ptc_8h: null }),
            f41({ ma_bg: 'A4', ma_bc_phat: 'U1', ten_bc_phat: 'Unit 1', danh_gia_co_tms_ptc_8h: '  ' }),
            f41({ ma_bg: 'B1', ma_bc_phat: 'U2', ten_bc_phat: 'Unit 2', danh_gia_co_tms_ptc_8h: 'Đạt' }),
            f41({ ma_bg: 'C1', ma_bc_phat: null, ten_bc_phat: null, danh_gia_co_tms_ptc_8h: 'Đạt' }),
        ],
    });
    const rows = await all('SELECT * FROM agg_f41_day ORDER BY ma_bc_phat');
    assert.equal(rows.length, 3);
    const u1 = rows.find((r) => r.ma_bc_phat === 'U1');
    assert.deepEqual(
        { rows: u1.n_rows, dat: u1.n_dat, kd: u1.n_khong_dat, blank: u1.n_blank, name: u1.ten_bc_phat },
        { rows: 4, dat: 1, kd: 1, blank: 2, name: 'Unit 1' }
    );
    assert.ok(rows.some((r) => r.ma_bc_phat === null && r.n_rows === 1), 'a NULL unit keeps its own row');
    await assertAggEqualsFact('F4.1');
});

test('supplementary import (no force) and forced reimport keep the agg equal to the detail', async () => {
    await importF41ParsedData({
        ngay_do_kiem: D1, filename: 'a.xlsx',
        parsedData: [f41({ ma_bg: 'A1', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Đạt' })],
    });
    // new parcel + a duplicate of A1 (ignored by INSERT OR IGNORE)
    await importF41ParsedData({
        ngay_do_kiem: D1, filename: 'b.xlsx',
        parsedData: [
            f41({ ma_bg: 'A1', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Không đạt' }),
            f41({ ma_bg: 'A2', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Không đạt' }),
        ],
    });
    let u1 = await get(`SELECT n_rows, n_dat, n_khong_dat FROM agg_f41_day WHERE ngay_do_kiem = ? AND ma_bc_phat = 'U1'`, [D1]);
    assert.deepEqual(u1, { n_rows: 2, n_dat: 1, n_khong_dat: 1 });
    await assertAggEqualsFact('F4.1');

    await importF41ParsedData({
        ngay_do_kiem: D1, filename: 'c.xlsx', forceReimport: true,
        parsedData: [f41({ ma_bg: 'Z1', ma_bc_phat: 'U9', danh_gia_co_tms_ptc_8h: 'Đạt' })],
    });
    const rows = await all('SELECT ma_bc_phat, n_rows FROM agg_f41_day WHERE ngay_do_kiem = ?', [D1]);
    assert.deepEqual(rows, [{ ma_bc_phat: 'U9', n_rows: 1 }], 'the replaced day no longer shows the old unit');
    await assertAggEqualsFact('F4.1');
});

test('other days are never touched by a rebuild', async () => {
    await importF41ParsedData({ ngay_do_kiem: D1, filename: 'a.xlsx', parsedData: [f41({ ma_bg: 'A1', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Đạt' })] });
    await importF41ParsedData({ ngay_do_kiem: D2, filename: 'b.xlsx', parsedData: [f41({ ma_bg: 'B1', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Không đạt' })] });
    await run(`UPDATE agg_f41_day SET n_dat = 99 WHERE ngay_do_kiem = ?`, [D1]); // sentinel
    await importF41ParsedData({ ngay_do_kiem: D2, filename: 'c.xlsx', forceReimport: true, parsedData: [f41({ ma_bg: 'B2', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Đạt' })] });
    const d1 = await get(`SELECT n_dat FROM agg_f41_day WHERE ngay_do_kiem = ?`, [D1]);
    assert.equal(d1.n_dat, 99, 'day D1 untouched by the D2 rebuild');
});

test('a failure while building the aggregate rolls the whole import back', async () => {
    await importF41ParsedData({ ngay_do_kiem: D1, filename: 'seed.xlsx', parsedData: [f41({ ma_bg: 'S1', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Đạt' })] });
    const factBefore = await all('SELECT ma_bg FROM fact_f41 ORDER BY ma_bg');
    const aggBefore = await all('SELECT * FROM agg_f41_day ORDER BY ma_bc_phat');
    await run(`CREATE TRIGGER trg_test_agg_boom BEFORE INSERT ON agg_f41_day BEGIN SELECT RAISE(ABORT, 'agg boom'); END`);
    try {
        await assert.rejects(
            () => importF41ParsedData({ ngay_do_kiem: D1, filename: 'boom.xlsx', forceReimport: true, parsedData: [f41({ ma_bg: 'N1', ma_bc_phat: 'U2', danh_gia_co_tms_ptc_8h: 'Đạt' })] }),
            /agg boom/
        );
    } finally {
        await run('DROP TRIGGER trg_test_agg_boom');
    }
    assert.deepEqual(await all('SELECT ma_bg FROM fact_f41 ORDER BY ma_bg'), factBefore, 'detail rows restored');
    assert.deepEqual(await all('SELECT * FROM agg_f41_day ORDER BY ma_bc_phat'), aggBefore, 'aggregate rows restored');
});

test('F1.3 counters: COUNT(ma_bg), blank evaluation, payment time, NULL vs empty route', async () => {
    await importParsedData({
        ngay_do_kiem: D1, filename: 'F1.3-2000.02.01.xlsx',
        parsedData: [
            f13({ ma_bg: 'G1', ma_bcvh: 'B1', ten_bcvh: 'B 1', ma_tuyen: '53R1', ten_tuyen: 'R1', danh_gia_2026: 'Đạt', thoi_gian_nop_tien: '2000-02-01 10:00' }),
            f13({ ma_bg: 'G2', ma_bcvh: 'B1', ten_bcvh: 'B 1', ma_tuyen: '53R1', ten_tuyen: 'R1', danh_gia_2026: 'Không đạt', thoi_gian_nop_tien: '  ' }),
            f13({ ma_bg: 'G3', ma_bcvh: 'B1', ten_bcvh: 'B 1', ma_tuyen: null, danh_gia_2026: null }),
            f13({ ma_bg: 'G4', ma_bcvh: 'B1', ten_bcvh: 'B 1', ma_tuyen: '', danh_gia_2026: 'Đạt' }),
        ],
    });
    const rows = await all('SELECT ma_tuyen, n_rows, n_bg, n_dat, n_khong_dat, n_blank, n_nop_tien FROM agg_f13_day ORDER BY ma_tuyen');
    assert.equal(rows.length, 3, 'NULL route and empty route are two different groups');
    const r1 = rows.find((r) => r.ma_tuyen === '53R1');
    assert.deepEqual(r1, { ma_tuyen: '53R1', n_rows: 2, n_bg: 2, n_dat: 1, n_khong_dat: 1, n_blank: 0, n_nop_tien: 1 });
    await assertAggEqualsFact('F1.3');
});

test('F1.1 and F1.2 imports maintain their aggregates', async () => {
    await importF11ParsedData({
        ngay_do_kiem: D1, filename: 'F1.1-2000.02.01.xlsx',
        parsedData: [
            f11({ ma_bg: 'P1', ma_bc_chap_nhan: 'C1', ma_bc_phat: 'D1', ten_bc_chap_nhan: 'C one', ten_bc_phat: 'D one', danh_gia_2026: 'Đạt' }),
            f11({ ma_bg: 'P2', ma_bc_chap_nhan: 'C1', ma_bc_phat: 'D1', ten_bc_chap_nhan: 'C one', ten_bc_phat: 'D one', danh_gia_2026: 'Không đạt' }),
            f11({ ma_bg: 'P3', ma_bc_chap_nhan: 'C2', ma_bc_phat: 'D1', ten_bc_chap_nhan: 'C two', ten_bc_phat: 'D one', danh_gia_2026: null }),
        ],
    });
    const pair = await get(`SELECT n_rows, n_dat, n_khong_dat, n_blank FROM agg_f11_day WHERE ma_bc_chap_nhan = 'C1' AND ma_bc_phat = 'D1'`);
    assert.deepEqual(pair, { n_rows: 2, n_dat: 1, n_khong_dat: 1, n_blank: 0 });
    await assertAggEqualsFact('F1.1');

    await importF12ParsedData({
        ngay_do_kiem: D1, filename: 'F1.2-2000.02.01.xlsx',
        parsedData: [
            f12({ ma_bg: 'Q1', ma_huyen: 'H1', ten_huyen: 'H one', ma_bc_chap_nhan: '531120', ten_bc_chap_nhan: 'Large', danh_gia: 'Đạt' }),
            f12({ ma_bg: 'Q2', ma_huyen: 'H1', ten_huyen: 'H one', ma_bc_chap_nhan: '530100', ten_bc_chap_nhan: 'Office', danh_gia: 'Không đạt' }),
        ],
    });
    const huyen = await all(`SELECT ma_bc_chap_nhan, n_rows FROM agg_f12_day WHERE ma_huyen = 'H1' ORDER BY ma_bc_chap_nhan`);
    assert.deepEqual(huyen, [{ ma_bc_chap_nhan: '530100', n_rows: 1 }, { ma_bc_chap_nhan: '531120', n_rows: 1 }]);
    await assertAggEqualsFact('F1.2');
});

test('verify passes on a consistent aggregate and fails after tampering', async () => {
    await importF41ParsedData({ ngay_do_kiem: D1, filename: 'a.xlsx', parsedData: [f41({ ma_bg: 'A1', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Đạt' })] });
    const connection = await new Promise((resolve, reject) => {
        const c = new sqlite3.Database(sandbox.dbPath, (err) => (err ? reject(err) : resolve(c)));
    });
    try {
        const helpers = makeHelpers(connection);
        await helpers.run('CREATE TABLE IF NOT EXISTS agg_state (indicator TEXT PRIMARY KEY, last_full_build_at TEXT, last_verified_at TEXT, last_verify_ok INTEGER)');
        const originalLog = console.log;
        console.log = () => {};
        try {
            assert.equal(await verifyIndicator(helpers, 'F4.1'), true);
            await helpers.run(`UPDATE agg_f41_day SET n_dat = n_dat + 1`);
            assert.equal(await verifyIndicator(helpers, 'F4.1'), false);
            await helpers.run(`UPDATE agg_f41_day SET n_dat = n_dat - 1`);
            await helpers.run(`DELETE FROM agg_f41_day`);
            assert.equal(await verifyIndicator(helpers, 'F4.1'), false, 'a missing day is detected');
        } finally {
            console.log = originalLog;
        }
    } finally {
        await new Promise((resolve) => connection.close(resolve));
    }
});

test('legacy FactF41Repository.overwriteImport also refreshes the aggregate', async () => {
    const repository = new FactF41Repository(db);
    await repository.overwriteImport(D1, [f41({ ma_bg: 'L1', ma_bc_phat: 'U1', danh_gia_co_tms_ptc_8h: 'Đạt' })]);
    await assertAggEqualsFact('F4.1');
    const row = await get(`SELECT n_rows FROM agg_f41_day WHERE ngay_do_kiem = ?`, [D1]);
    assert.equal(row.n_rows, 1);
});

test('an unmigrated database (no agg table) is skipped by the rebuild instead of failing', async () => {
    await run('DROP TABLE agg_f41_day');
    // module-level cache remembers "provisioned"; a fresh process would see the table missing.
    delete require.cache[require.resolve('./src/services/aggMaintenance')];
    const { rebuildAggForDate } = require('./src/services/aggMaintenance');
    const result = await rebuildAggForDate(run, get, 'F4.1', D1);
    assert.deepEqual(result, { skipped: true });
    await applyPerfLoad01AggSchema(sandbox.dbPath);
});
