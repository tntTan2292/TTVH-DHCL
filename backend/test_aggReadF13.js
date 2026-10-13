/**
 * test_aggReadF13.js - PERF-LOAD-01 Phase 2 (P2.2): F1.3 read path over agg_f13_day.
 *
 * Synthetic data in an isolated temp SQLite database. Every aggregate read method of
 * FactBuuGuiRepository must return byte-identical results from the detail table (mode off) and from the
 * aggregate (mode on); the fuse and shadow mode are exercised separately.
 *
 * Run: node --experimental-sqlite --test test_aggReadF13.js
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSandbox, initSchema, destroySandbox } = require('./test/importTestSandbox');

const sandbox = createSandbox('qis-agg-read-f13-test-');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = sandbox.dbPath;
delete process.env.QIS_AGG_READ;
delete process.env.QIS_AGG_READ_F13;

const { db, run, all } = require('./src/config/db');
const { DB_COLUMNS } = require('./src/services/excelParser');
const { importParsedData } = require('./src/services/importProcessor');
const repo = require('./src/repositories/FactBuuGuiRepository');
const policy = require('./src/services/aggReadPolicy');
const { compareIndicator, addDays } = require('./scripts/agg_compare');

const UNITS = ['B1', 'B2', 'B3', 'B4', 'B5'];
const EVALS = ['Đạt', 'Đạt', 'Đạt', 'Không đạt', null, '  '];
const ROUTES = ['53001', '53002', '53003', '54001', null, ''];
const START = '2000-01-20';
const DAYS = 80;

function row(values) {
    const r = {};
    for (const column of DB_COLUMNS) r[column] = null;
    return Object.assign(r, values);
}

let dates = [];

test.before(async () => {
    await initSchema(db);
    for (let d = 0; d < DAYS; d += 1) {
        if (d % 11 === 5) continue; // gaps in the series
        const date = addDays(START, d);
        const rows = [];
        for (let u = 0; u < UNITS.length; u += 1) {
            if ((d + u) % 13 === 0) continue; // a unit missing on some days
            const count = 4 + ((d * 7 + u * 5) % 10);
            for (let k = 0; k < count; k += 1) {
                rows.push(row({
                    ma_bg: `${date}-${u}-${k}`,
                    ma_bcvh: UNITS[u],
                    ten_bcvh: `Unit ${u}${d % 17 === 0 ? ' (renamed)' : ''}`,
                    ma_tuyen: ROUTES[(d + u + k) % ROUTES.length],
                    ten_tuyen: `Route ${(d + u + k) % ROUTES.length}`,
                    loai_tuyen_phat: k % 3 === 0 ? 'T1' : 'T2',
                    danh_gia_2026: EVALS[(d + u + k) % EVALS.length],
                    thoi_gian_nop_tien: k % 4 === 0 ? `${date} 10:00` : (k % 4 === 1 ? '   ' : null),
                }));
            }
        }
        await importParsedData({ ngay_do_kiem: date, filename: `F1.3-${date}.xlsx`, parsedData: rows });
        if (d % 9 === 0) { // supplementary partial import (INSERT OR IGNORE path)
            await importParsedData({
                ngay_do_kiem: date, filename: `F1.3-${date}-b.xlsx`,
                parsedData: [row({ ma_bg: `${date}-late`, ma_bcvh: 'B1', ten_bcvh: 'Unit 0', ma_tuyen: '53001', danh_gia_2026: 'Không đạt' })],
            });
        }
    }
    dates = (await all('SELECT DISTINCT ngay_do_kiem AS d FROM fact_f13 ORDER BY d')).map((r) => r.d);
});

test.after(async () => {
    await new Promise((resolve) => db.close(resolve));
    destroySandbox(sandbox);
});

test.beforeEach(() => {
    delete process.env.QIS_AGG_READ_F13;
    policy.resetForTests();
});

test('every F1.3 aggregate read method returns identical results from detail and aggregate', async () => {
    const report = await compareIndicator(repo, 'F1.3', { dates, codes: UNITS, unitFor: 'B3' }, { heavy: 14, light: 20 });
    assert.ok(report.compared > 600, `expected a broad matrix, got ${report.compared}`);
    assert.deepEqual(report.mismatches, []);
});

test('the aggregate really answers in mode on (sentinel on the aggregate shows in the answer)', async () => {
    await run(`UPDATE agg_f13_day SET n_nop_tien = n_nop_tien + 500 WHERE ma_bcvh = 'B1' AND ngay_do_kiem = ?
               AND rowid = (SELECT MIN(rowid) FROM agg_f13_day WHERE ma_bcvh = 'B1' AND ngay_do_kiem = ?)`, [dates[10], dates[10]]);
    try {
        process.env.QIS_AGG_READ_F13 = 'on';
        const onRows = await repo.getBcvhOperationMetricsByDate(dates[10]);
        process.env.QIS_AGG_READ_F13 = 'off';
        const offRows = await repo.getBcvhOperationMetricsByDate(dates[10]);
        const pick = (rows) => rows.find((r) => r.ma_bcvh === 'B1').sl_ptc_nop_tien;
        assert.equal(pick(onRows), pick(offRows) + 500);
    } finally {
        await run(`UPDATE agg_f13_day SET n_nop_tien = n_nop_tien - 500 WHERE ma_bcvh = 'B1' AND ngay_do_kiem = ?
                   AND rowid = (SELECT MIN(rowid) FROM agg_f13_day WHERE ma_bcvh = 'B1' AND ngay_do_kiem = ?)`, [dates[10], dates[10]]);
    }
});

test('fuse: an aggregate whose row total differs from the detail table is never used', async () => {
    process.env.QIS_AGG_READ_F13 = 'on';
    await run(`INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026) VALUES (?, 'BYPASS', 'B1', 'Unit 0', 'Đạt')`, [dates[5]]);
    try {
        policy.resetForTests();
        const after = await repo.getBcvhOperationMetricsBetween(dates[0], dates[20]);
        process.env.QIS_AGG_READ_F13 = 'off';
        const detail = await repo.getBcvhOperationMetricsBetween(dates[0], dates[20]);
        assert.deepEqual(after, detail, 'fell back to the detail table, which includes the bypass row');
        assert.equal(policy.stats.fuseTrips, 1);
    } finally {
        await run(`DELETE FROM fact_f13 WHERE ma_bg = 'BYPASS'`);
    }
});

test('fuse: a missing aggregate table falls back to the detail table', async () => {
    process.env.QIS_AGG_READ_F13 = 'off';
    const expected = await repo.getBcvhMonthsList(UNITS);
    await run('ALTER TABLE agg_f13_day RENAME TO agg_f13_day_hidden');
    try {
        process.env.QIS_AGG_READ_F13 = 'on';
        policy.resetForTests();
        assert.deepEqual(await repo.getBcvhMonthsList(UNITS), expected);
    } finally {
        await run('ALTER TABLE agg_f13_day_hidden RENAME TO agg_f13_day');
    }
});

test('shadow mode answers from the detail table and reports aggregate differences', async () => {
    process.env.QIS_AGG_READ_F13 = 'shadow';
    const target = `rowid = (SELECT MIN(rowid) FROM agg_f13_day WHERE ma_bcvh = 'B2' AND ngay_do_kiem = '${dates[12]}')`;
    const other = `rowid = (SELECT MIN(rowid) FROM agg_f13_day WHERE ma_bcvh = 'B2' AND ngay_do_kiem = '${dates[13]}')`;
    // totals stay equal (the fuse passes) but one counter moves between two days
    await run(`UPDATE agg_f13_day SET n_rows = n_rows + 1, n_bg = n_bg + 1, n_blank = n_blank + 1 WHERE ${target}`);
    await run(`UPDATE agg_f13_day SET n_rows = n_rows - 1, n_bg = n_bg - 1, n_blank = n_blank - 1 WHERE ${other}`);
    const warn = console.warn;
    const warnings = [];
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
        const answer = await repo.getBcvhOperationMetricsBetween(dates[12], dates[12], ['B2']);
        await new Promise((resolve) => setTimeout(resolve, 150));
        process.env.QIS_AGG_READ_F13 = 'off';
        const detail = await repo.getBcvhOperationMetricsBetween(dates[12], dates[12], ['B2']);
        assert.deepEqual(answer, detail);
        assert.ok(policy.stats.shadowMismatches >= 1, JSON.stringify(policy.stats));
        assert.ok(warnings.some((w) => w.includes('[agg-shadow] MISMATCH')));
    } finally {
        console.warn = warn;
        await run(`UPDATE agg_f13_day SET n_rows = n_rows - 1, n_bg = n_bg - 1, n_blank = n_blank - 1 WHERE ${target}`);
        await run(`UPDATE agg_f13_day SET n_rows = n_rows + 1, n_bg = n_bg + 1, n_blank = n_blank + 1 WHERE ${other}`);
    }
});
