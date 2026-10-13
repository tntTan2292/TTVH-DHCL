/**
 * test_aggReadF12.js - PERF-LOAD-01 Phase 2 (P2.4): F1.2 read path over agg_f12_day.
 *
 * Synthetic data in an isolated temp SQLite database. Every aggregate read method of
 * FactF12Repository must return byte-identical results from the detail table (mode off) and from the
 * aggregate (mode on); the fuse and shadow mode are exercised separately.
 *
 * Run: node --experimental-sqlite --test test_aggReadF12.js
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSandbox, initSchema, destroySandbox } = require('./test/importTestSandbox');

const sandbox = createSandbox('qis-agg-read-f12-test-');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = sandbox.dbPath;
delete process.env.QIS_AGG_READ;
delete process.env.QIS_AGG_READ_F12;

const { db, run, all } = require('./src/config/db');
const { F12_DB_COLUMNS } = require('./src/services/f12HueExcelParser');
const { importF12ParsedData } = require('./src/services/importProcessor');
const { FactF12Repository } = require('./src/repositories/FactF12Repository');
const policy = require('./src/services/aggReadPolicy');
const { compareIndicator, addDays } = require('./scripts/agg_compare');

const repo = new FactF12Repository(db);
const UNITS = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'];
const EVALS = ['Đạt', 'Đạt', 'Đạt', 'Không đạt', null, '  ', 'Chưa xác định'];
const OFFICES = ['C1', 'C2', 'C3', '531120', null, ''];
const START = '2000-01-20';
const DAYS = 80; // spans four calendar months, several Thursday-Wednesday weeks

function row(values) {
    const r = {};
    for (const column of F12_DB_COLUMNS) r[column] = null;
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
                    ma_huyen: UNITS[u],
                    ma_bc_chap_nhan: OFFICES[(d + k) % OFFICES.length],
                    ten_bc_chap_nhan: `Office ${(d + k) % OFFICES.length}`,
                    ten_huyen: `Unit ${u}${d % 17 === 0 ? ' (renamed)' : ''}`,
                    danh_gia: EVALS[(d + u + k) % EVALS.length],
                }));
            }
        }
        // rows with no unit, a non-canonical unit and an empty-string unit
        rows.push(row({ ma_bg: `${date}-n0`, ma_huyen: null, ten_huyen: null, danh_gia: 'Đạt' }));
        rows.push(row({ ma_bg: `${date}-x0`, ma_huyen: 'OTHER', ten_huyen: 'Other', danh_gia: 'Không đạt' }));
        rows.push(row({ ma_bg: `${date}-e0`, ma_huyen: '', ten_huyen: '', danh_gia: 'Đạt' }));
        await importF12ParsedData({ ngay_do_kiem: date, filename: `F1.2-${date}.xlsx`, parsedData: rows });
        // a supplementary partial import on some days (INSERT OR IGNORE path)
        if (d % 9 === 0) {
            await importF12ParsedData({
                ngay_do_kiem: date, filename: `F1.2-${date}-b.xlsx`,
                parsedData: [row({ ma_bg: `${date}-late`, ma_huyen: 'U1', ten_huyen: 'Unit 1', danh_gia: 'Không đạt' })],
            });
        }
    }
    dates = (await all('SELECT DISTINCT ngay_do_kiem AS d FROM fact_f12 ORDER BY d')).map((r) => r.d);
});

test.after(async () => {
    await new Promise((resolve) => db.close(resolve));
    destroySandbox(sandbox);
});

test.beforeEach(() => {
    delete process.env.QIS_AGG_READ_F12;
    policy.resetForTests();
});

test('every F1.2 aggregate read method returns identical results from detail and aggregate', async () => {
    const officeCodes = (await all(`SELECT DISTINCT ma_bc_chap_nhan AS c FROM fact_f12 WHERE ma_bc_chap_nhan IS NOT NULL AND TRIM(ma_bc_chap_nhan) <> ''`)).map((r) => r.c);
    const report = await compareIndicator(repo, 'F1.2', { dates, codes: UNITS, unitFor: 'U3', officeCodes }, { heavy: 14, light: 20 });
    assert.ok(report.compared > 500, `expected a broad matrix, got ${report.compared}`);
    assert.deepEqual(report.mismatches, []);
});

test('the aggregate really answers in mode on (not a silent fall back to the detail table)', async () => {
    process.env.QIS_AGG_READ_F12 = 'on';
    // sentinel: change the aggregate only; the answer must follow the aggregate
    await run(`UPDATE agg_f12_day SET n_dat = n_dat + 1000 WHERE ma_huyen = 'U1' AND ngay_do_kiem = ?
               AND rowid = (SELECT MIN(rowid) FROM agg_f12_day WHERE ma_huyen = 'U1' AND ngay_do_kiem = ? AND COALESCE(ma_bc_chap_nhan, '') <> '531120')`, [dates[10], dates[10]]);
    try {
        const rows = await repo.getBcvhOperationMetricsBetween(dates[10], dates[10], ['U1']);
        process.env.QIS_AGG_READ_F12 = 'off';
        const detail = await repo.getBcvhOperationMetricsBetween(dates[10], dates[10], ['U1']);
        assert.equal(rows[0].dat_kpi_2026, detail[0].dat_kpi_2026 + 1000);
    } finally {
        await run(`UPDATE agg_f12_day SET n_dat = n_dat - 1000 WHERE ma_huyen = 'U1' AND ngay_do_kiem = ?
                   AND rowid = (SELECT MIN(rowid) FROM agg_f12_day WHERE ma_huyen = 'U1' AND ngay_do_kiem = ? AND COALESCE(ma_bc_chap_nhan, '') <> '531120')`, [dates[10], dates[10]]);
    }
});

test('fuse: an aggregate whose row total differs from the detail table is never used', async () => {
    process.env.QIS_AGG_READ_F12 = 'on';
    const before = await repo.getBcvhOperationMetricsBetween(dates[0], dates[20], UNITS);
    // simulate an import that bypassed the maintenance (one extra detail row, aggregate not refreshed)
    await run(`INSERT INTO fact_f12 (ngay_do_kiem, ma_bg, ma_huyen, danh_gia) VALUES (?, 'BYPASS', 'U1', 'Đạt')`, [dates[5]]);
    try {
        policy.resetForTests();
        const after = await repo.getBcvhOperationMetricsBetween(dates[0], dates[20], UNITS);
        process.env.QIS_AGG_READ_F12 = 'off';
        const detail = await repo.getBcvhOperationMetricsBetween(dates[0], dates[20], UNITS);
        assert.deepEqual(after, detail, 'fell back to the detail table, which includes the bypass row');
        assert.notDeepEqual(after, before);
        assert.equal(policy.stats.fuseTrips, 1);
    } finally {
        await run(`DELETE FROM fact_f12 WHERE ma_bg = 'BYPASS'`);
    }
});

test('fuse: a missing aggregate table falls back to the detail table', async () => {
    process.env.QIS_AGG_READ_F12 = 'off';
    const expected = await repo.getBcvhMonthsList(UNITS);
    await run('ALTER TABLE agg_f12_day RENAME TO agg_f12_day_hidden');
    try {
        process.env.QIS_AGG_READ_F12 = 'on';
        policy.resetForTests();
        assert.deepEqual(await repo.getBcvhMonthsList(UNITS), expected);
    } finally {
        await run('ALTER TABLE agg_f12_day_hidden RENAME TO agg_f12_day');
    }
});

test('shadow mode answers from the detail table and reports aggregate differences', async () => {
    process.env.QIS_AGG_READ_F12 = 'shadow';
    // the fuse compares SUM(n_rows): move one Đạt between two days so the totals stay equal
    await run(`UPDATE agg_f12_day SET n_dat = n_dat + 1 WHERE ma_huyen = 'U2' AND ngay_do_kiem = ?
               AND rowid = (SELECT MIN(rowid) FROM agg_f12_day WHERE ma_huyen = 'U2' AND ngay_do_kiem = ? AND COALESCE(ma_bc_chap_nhan, '') <> '531120')`, [dates[12], dates[12]]);
    await run(`UPDATE agg_f12_day SET n_dat = n_dat - 1 WHERE ma_huyen = 'U2' AND ngay_do_kiem = ?
               AND rowid = (SELECT MIN(rowid) FROM agg_f12_day WHERE ma_huyen = 'U2' AND ngay_do_kiem = ? AND COALESCE(ma_bc_chap_nhan, '') <> '531120')`, [dates[13], dates[13]]);
    const warn = console.warn;
    const warnings = [];
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
        const shadowAnswer = await repo.getBcvhOperationMetricsBetween(dates[12], dates[12], ['U2']);
        await new Promise((resolve) => setTimeout(resolve, 150));
        process.env.QIS_AGG_READ_F12 = 'off';
        const detail = await repo.getBcvhOperationMetricsBetween(dates[12], dates[12], ['U2']);
        assert.deepEqual(shadowAnswer, detail, 'shadow returns the detail answer');
        assert.ok(policy.stats.shadowMismatches >= 1, `mismatch reported (stats ${JSON.stringify(policy.stats)})`);
        assert.ok(warnings.some((w) => w.includes('[agg-shadow] MISMATCH')));
    } finally {
        console.warn = warn;
        await run(`UPDATE agg_f12_day SET n_dat = n_dat - 1 WHERE ma_huyen = 'U2' AND ngay_do_kiem = ?
                   AND rowid = (SELECT MIN(rowid) FROM agg_f12_day WHERE ma_huyen = 'U2' AND ngay_do_kiem = ? AND COALESCE(ma_bc_chap_nhan, '') <> '531120')`, [dates[12], dates[12]]);
        await run(`UPDATE agg_f12_day SET n_dat = n_dat + 1 WHERE ma_huyen = 'U2' AND ngay_do_kiem = ?
                   AND rowid = (SELECT MIN(rowid) FROM agg_f12_day WHERE ma_huyen = 'U2' AND ngay_do_kiem = ? AND COALESCE(ma_bc_chap_nhan, '') <> '531120')`, [dates[13], dates[13]]);
    }
});

test('mode defaults to off and ignores unknown values', () => {
    delete process.env.QIS_AGG_READ;
    delete process.env.QIS_AGG_READ_F12;
    assert.equal(policy.modeFor('F1.2'), 'off');
    process.env.QIS_AGG_READ_F12 = 'banana';
    assert.equal(policy.modeFor('F1.2'), 'off');
    process.env.QIS_AGG_READ = 'on';
    delete process.env.QIS_AGG_READ_F12;
    assert.equal(policy.modeFor('F1.2'), 'on');
    process.env.QIS_AGG_READ_F12 = 'shadow';
    assert.equal(policy.modeFor('F1.2'), 'shadow', 'indicator setting wins over the global one');
    delete process.env.QIS_AGG_READ;
});
