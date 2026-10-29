/**
 * test_aggReadF41.js - PERF-LOAD-01 Phase 2 (P2.1): F4.1 read path over agg_f41_day.
 *
 * Synthetic data in an isolated temp SQLite database. Every aggregate read method of
 * FactF41Repository must return byte-identical results from the detail table (mode off) and from the
 * aggregate (mode on); the fuse and shadow mode are exercised separately.
 *
 * Run: node --experimental-sqlite --test test_aggReadF41.js
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSandbox, initSchema, destroySandbox } = require('./test/importTestSandbox');

const sandbox = createSandbox('qis-agg-read-f41-test-');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = sandbox.dbPath;
delete process.env.QIS_AGG_READ;
delete process.env.QIS_AGG_READ_F41;

const { db, run, all } = require('./src/config/db');
const { F41_HUE_DB_COLUMNS } = require('./src/services/f41HueExcelParser');
const { importF41ParsedData } = require('./src/services/importProcessor');
const { FactF41Repository } = require('./src/repositories/FactF41Repository');
const policy = require('./src/services/aggReadPolicy');
const { compareIndicator, addDays } = require('./scripts/agg_compare');

const repo = new FactF41Repository(db);
const UNITS = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'];
const EVALS = ['Đạt', 'Đạt', 'Đạt', 'Không đạt', null, '  '];
// "Không đo TMS" column (F41-TMS-COMPARE-01): a different mix, so the new counter is told apart from n_dat
const NO_TMS_EVALS = ['Đạt', 'Không đạt', 'Đạt', null, 'Đạt', '  ', 'Không đạt'];
const START = '2000-01-20';
const DAYS = 80; // spans four calendar months, several Thursday-Wednesday weeks

function row(values) {
    const r = {};
    for (const column of F41_HUE_DB_COLUMNS) r[column] = null;
    return Object.assign(r, values);
}

let dates = [];

test.before(async () => {
    await initSchema(db);
    for (let d = 0; d < DAYS; d += 1) {
        const date = addDays(START, d);
        if (d % 11 === 5) continue; // a few days without any data (gaps in the series)
        const rows = [];
        let seq = 0;
        for (let u = 0; u < UNITS.length; u += 1) {
            if ((d + u) % 13 === 0) continue; // a unit missing on some days
            const count = 3 + ((d * 7 + u * 5) % 9);
            for (let k = 0; k < count; k += 1) {
                seq += 1;
                rows.push(row({
                    ma_bg: `${date}-${u}-${k}`,
                    ma_bc_phat: UNITS[u],
                    ten_bc_phat: `Unit ${u}${d % 17 === 0 ? ' (renamed)' : ''}`,
                    danh_gia_co_tms_ptc_8h: EVALS[(d + u + k) % EVALS.length],
                    danh_gia_khong_tms_ptc_8h: NO_TMS_EVALS[(d * 3 + u + k * 2) % NO_TMS_EVALS.length],
                }));
            }
        }
        // rows with no unit, a non-canonical unit and an empty-string unit
        rows.push(row({ ma_bg: `${date}-n0`, ma_bc_phat: null, ten_bc_phat: null, danh_gia_co_tms_ptc_8h: 'Đạt', danh_gia_khong_tms_ptc_8h: 'Đạt' }));
        rows.push(row({ ma_bg: `${date}-x0`, ma_bc_phat: 'OTHER', ten_bc_phat: 'Other', danh_gia_co_tms_ptc_8h: 'Không đạt', danh_gia_khong_tms_ptc_8h: 'Đạt' }));
        rows.push(row({ ma_bg: `${date}-e0`, ma_bc_phat: '', ten_bc_phat: '', danh_gia_co_tms_ptc_8h: 'Đạt' }));
        await importF41ParsedData({ ngay_do_kiem: date, filename: `F4.1-${date}.xlsx`, parsedData: rows });
        // a supplementary partial import on some days (INSERT OR IGNORE path)
        if (d % 9 === 0) {
            await importF41ParsedData({
                ngay_do_kiem: date, filename: `F4.1-${date}-b.xlsx`,
                parsedData: [row({ ma_bg: `${date}-late`, ma_bc_phat: 'U1', ten_bc_phat: 'Unit 1', danh_gia_co_tms_ptc_8h: 'Không đạt', danh_gia_khong_tms_ptc_8h: 'Đạt' })],
            });
        }
    }
    dates = (await all('SELECT DISTINCT ngay_do_kiem AS d FROM fact_f41 ORDER BY d')).map((r) => r.d);
});

test.after(async () => {
    await new Promise((resolve) => db.close(resolve));
    destroySandbox(sandbox);
});

test.beforeEach(() => {
    delete process.env.QIS_AGG_READ_F41;
    policy.resetForTests();
});

test('every F4.1 aggregate read method returns identical results from detail and aggregate', async () => {
    const report = await compareIndicator(repo, 'F4.1', { dates, codes: UNITS, unitFor: 'U3' }, { heavy: 14, light: 20 });
    assert.ok(report.compared > 500, `expected a broad matrix, got ${report.compared}`);
    assert.deepEqual(report.mismatches, []);
});

test('the "Không đo TMS" pass count and the Có TMS blank count are exact from detail and from aggregate', async () => {
    const expected = await all(
        `SELECT ma_bc_phat AS ma_bcvh,
                SUM(CASE WHEN danh_gia_khong_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS dat_khong_tms,
                SUM(CASE WHEN danh_gia_co_tms_ptc_8h IS NULL OR TRIM(danh_gia_co_tms_ptc_8h) = '' THEN 1 ELSE 0 END) AS trong_co_tms
         FROM fact_f41 WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bc_phat IN (${UNITS.map(() => '?').join(', ')})
         GROUP BY ma_bc_phat ORDER BY ma_bc_phat`,
        [dates[0], dates[40], ...UNITS]
    );
    assert.ok(expected.some((r) => r.dat_khong_tms > 0), 'fixture has Không đo TMS passes');
    for (const mode of ['off', 'on']) {
        process.env.QIS_AGG_READ_F41 = mode;
        policy.resetForTests();
        const rows = await repo.getBcvhOperationMetricsBetween(dates[0], dates[40], UNITS);
        const actual = rows
            .map((r) => ({ ma_bcvh: r.ma_bcvh, dat_khong_tms: r.dat_khong_tms, trong_co_tms: r.trong_co_tms }))
            .sort((a, b) => a.ma_bcvh.localeCompare(b.ma_bcvh));
        assert.deepEqual(actual, expected, `mode ${mode}`);
    }
});

test('the aggregate really answers in mode on (not a silent fall back to the detail table)', async () => {
    process.env.QIS_AGG_READ_F41 = 'on';
    // sentinel: change the aggregate only; the answer must follow the aggregate
    await run(`UPDATE agg_f41_day SET n_dat = n_dat + 1000 WHERE ma_bc_phat = 'U1' AND ngay_do_kiem = ?`, [dates[10]]);
    try {
        const rows = await repo.getBcvhOperationMetricsBetween(dates[10], dates[10], ['U1']);
        process.env.QIS_AGG_READ_F41 = 'off';
        const detail = await repo.getBcvhOperationMetricsBetween(dates[10], dates[10], ['U1']);
        assert.equal(rows[0].dat_kpi_2026, detail[0].dat_kpi_2026 + 1000);
    } finally {
        await run(`UPDATE agg_f41_day SET n_dat = n_dat - 1000 WHERE ma_bc_phat = 'U1' AND ngay_do_kiem = ?`, [dates[10]]);
    }
});

test('fuse: an aggregate whose row total differs from the detail table is never used', async () => {
    process.env.QIS_AGG_READ_F41 = 'on';
    const before = await repo.getBcvhOperationMetricsBetween(dates[0], dates[20], UNITS);
    // simulate an import that bypassed the maintenance (one extra detail row, aggregate not refreshed)
    await run(`INSERT INTO fact_f41 (ngay_do_kiem, ma_bg, ma_bc_phat, danh_gia_co_tms_ptc_8h) VALUES (?, 'BYPASS', 'U1', 'Đạt')`, [dates[5]]);
    try {
        policy.resetForTests();
        const after = await repo.getBcvhOperationMetricsBetween(dates[0], dates[20], UNITS);
        process.env.QIS_AGG_READ_F41 = 'off';
        const detail = await repo.getBcvhOperationMetricsBetween(dates[0], dates[20], UNITS);
        assert.deepEqual(after, detail, 'fell back to the detail table, which includes the bypass row');
        assert.notDeepEqual(after, before);
        assert.equal(policy.stats.fuseTrips, 1);
    } finally {
        await run(`DELETE FROM fact_f41 WHERE ma_bg = 'BYPASS'`);
    }
});

test('fuse: a missing aggregate table falls back to the detail table', async () => {
    process.env.QIS_AGG_READ_F41 = 'off';
    const expected = await repo.getBcvhMonthsList(UNITS);
    await run('ALTER TABLE agg_f41_day RENAME TO agg_f41_day_hidden');
    try {
        process.env.QIS_AGG_READ_F41 = 'on';
        policy.resetForTests();
        assert.deepEqual(await repo.getBcvhMonthsList(UNITS), expected);
    } finally {
        await run('ALTER TABLE agg_f41_day_hidden RENAME TO agg_f41_day');
    }
});

test('shadow mode answers from the detail table and reports aggregate differences', async () => {
    process.env.QIS_AGG_READ_F41 = 'shadow';
    await run(`UPDATE agg_f41_day SET n_rows = n_rows + 1, n_blank = n_blank + 1 WHERE ma_bc_phat = 'U2' AND ngay_do_kiem = ?`, [dates[12]]);
    // the fuse compares SUM(n_rows): keep the totals equal by removing one row elsewhere
    await run(`UPDATE agg_f41_day SET n_rows = n_rows - 1, n_blank = n_blank - 1 WHERE ma_bc_phat = 'U2' AND ngay_do_kiem = ?`, [dates[13]]);
    const warn = console.warn;
    const warnings = [];
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
        const shadowAnswer = await repo.getBcvhOperationMetricsBetween(dates[12], dates[12], ['U2']);
        await new Promise((resolve) => setTimeout(resolve, 150));
        process.env.QIS_AGG_READ_F41 = 'off';
        const detail = await repo.getBcvhOperationMetricsBetween(dates[12], dates[12], ['U2']);
        assert.deepEqual(shadowAnswer, detail, 'shadow returns the detail answer');
        assert.ok(policy.stats.shadowMismatches >= 1, `mismatch reported (stats ${JSON.stringify(policy.stats)})`);
        assert.ok(warnings.some((w) => w.includes('[agg-shadow] MISMATCH')));
    } finally {
        console.warn = warn;
        await run(`UPDATE agg_f41_day SET n_rows = n_rows - 1, n_blank = n_blank - 1 WHERE ma_bc_phat = 'U2' AND ngay_do_kiem = ?`, [dates[12]]);
        await run(`UPDATE agg_f41_day SET n_rows = n_rows + 1, n_blank = n_blank + 1 WHERE ma_bc_phat = 'U2' AND ngay_do_kiem = ?`, [dates[13]]);
    }
});

test('mode defaults to off and ignores unknown values', () => {
    delete process.env.QIS_AGG_READ;
    delete process.env.QIS_AGG_READ_F41;
    assert.equal(policy.modeFor('F4.1'), 'off');
    process.env.QIS_AGG_READ_F41 = 'banana';
    assert.equal(policy.modeFor('F4.1'), 'off');
    process.env.QIS_AGG_READ = 'on';
    delete process.env.QIS_AGG_READ_F41;
    assert.equal(policy.modeFor('F4.1'), 'on');
    process.env.QIS_AGG_READ_F41 = 'shadow';
    assert.equal(policy.modeFor('F4.1'), 'shadow', 'indicator setting wins over the global one');
    delete process.env.QIS_AGG_READ;
});

test('fuse: a day replaced with the SAME row count by a process that does not maintain the aggregate trips it', async () => {
    process.env.QIS_AGG_READ_F41 = 'on';
    const day = dates[15];
    const before = await all(`SELECT ma_bg, ma_bc_phat FROM fact_f41 WHERE ngay_do_kiem = ? ORDER BY ma_bg LIMIT 10`, [day]);
    assert.equal(before.length, 10);
    // an old process: delete 10 rows and insert 10 different ones (same count, other evaluations), no aggregate refresh
    for (const r of before) await run(`DELETE FROM fact_f41 WHERE ngay_do_kiem = ? AND ma_bg = ?`, [day, r.ma_bg]);
    for (const r of before) {
        await run(`INSERT INTO fact_f41 (ngay_do_kiem, ma_bg, ma_bc_phat, ten_bc_phat, danh_gia_co_tms_ptc_8h) VALUES (?, ?, ?, 'x', 'Không đạt')`, [day, `${r.ma_bg}-swap`, r.ma_bc_phat]);
    }
    policy.resetForTests();
    const on = await repo.getBcvhOperationMetricsBetween(day, day, UNITS);
    process.env.QIS_AGG_READ_F41 = 'off';
    const off = await repo.getBcvhOperationMetricsBetween(day, day, UNITS);
    assert.deepEqual(on, off, 'with the fuse open the answer comes from the detail table');
    assert.equal(policy.stats.fuseTrips, 1);
});

test('fuse state changes are announced (the response cache clears itself on them)', async () => {
    process.env.QIS_AGG_READ_F41 = 'on';
    const events = [];
    policy.onFuseChange((event) => events.push(event));
    policy.resetForTests();
    await repo.getBcvhMonthsList(UNITS); // first check: signature of dates[15] is stale from the previous test -> open
    // repair that day through the maintenance code, then force a re-check
    const { rebuildAggForDate } = require('./src/services/aggMaintenance');
    const get = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (e, r) => (e ? rej(e) : res(r))));
    await rebuildAggForDate(run, get, 'F4.1', dates[15]);
    await policy.aggUsable('F4.1', db, { force: true });
    assert.ok(events.some((e) => e.indicator === 'F4.1' && e.ok === true), JSON.stringify(events));
});

test('shadow comparisons that overlap an open import transaction are skipped, not reported', async () => {
    process.env.QIS_AGG_READ_F41 = 'shadow';
    policy.resetForTests();
    await policy.aggUsable('F4.1', db, { force: true });
    const warn = console.warn;
    const warnings = [];
    console.warn = (...a) => warnings.push(a.join(' '));
    try {
        await run('BEGIN TRANSACTION');
        // half-written day: detail changes, aggregate not yet refreshed
        await run(`INSERT INTO fact_f41 (ngay_do_kiem, ma_bg, ma_bc_phat, danh_gia_co_tms_ptc_8h) VALUES (?, 'HALF', 'U1', 'Đạt')`, [dates[2]]);
        await repo.getBcvhOperationMetricsBetween(dates[2], dates[2], ['U1']);
        await new Promise((resolve) => setTimeout(resolve, 150));
        await run('ROLLBACK');
        assert.equal(policy.stats.shadowMismatches, 0, JSON.stringify(policy.stats));
        assert.ok(policy.stats.shadowSkipped >= 1, JSON.stringify(policy.stats));
        assert.ok(!warnings.some((w) => w.includes('MISMATCH')));
    } finally {
        console.warn = warn;
    }
});
