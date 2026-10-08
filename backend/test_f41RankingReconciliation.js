'use strict';

// F41-DASHBOARD-RANKING-01 - G1 backend reconciliation against the live database.
// READ-ONLY: the database is opened with OPEN_READONLY, nothing is written, and the
// fact_f41 / fact_f13 / fact_f41_national row counts are asserted unchanged at the end.
// Run per file (root test_*.js suites are not collected by the node --test sweep):
//     node backend/test_f41RankingReconciliation.js
//
// It exercises the F41RankingService stack directly (the same code the /api/f41 routes call),
// so it does not need a running server or a backend restart.

const path = require('node:path');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3').verbose();

const { FactF41Repository } = require('./src/repositories/FactF41Repository');
const { F41NationalRankService } = require('./src/services/F41NationalRankService');
const { F41RankingService, CANONICAL_CODES } = require('./src/services/F41RankingService');

const DB_PATH = path.resolve(__dirname, 'src/db/database.sqlite');

let passed = 0;
let failed = 0;
function check(name, fn) {
    return Promise.resolve().then(fn).then(
        () => { passed += 1; console.log(`  ok   ${name}`); },
        (error) => { failed += 1; console.log(`  FAIL ${name}\n       ${error.message.split('\n').join('\n       ')}`); },
    );
}

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
}

async function counts(db) {
    const [f41] = await all(db, 'SELECT COUNT(*) AS n FROM fact_f41');
    const [f13] = await all(db, 'SELECT COUNT(*) AS n FROM fact_f13');
    const [nat] = await all(db, 'SELECT COUNT(*) AS n FROM fact_f41_national');
    return { fact_f41: f41.n, fact_f13: f13.n, fact_f41_national: nat.n };
}

async function timed(label, fn) {
    const start = Date.now();
    const result = await fn();
    console.log(`       (${label}: ${Date.now() - start} ms)`);
    return result;
}

(async () => {
    const db = await new Promise((resolve, reject) => {
        const handle = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => (err ? reject(err) : resolve(handle)));
    });
    const repository = new FactF41Repository(db);
    const nationalRankService = new F41NationalRankService(db);
    const service = new F41RankingService({ repository, nationalRankService });
    const before = await counts(db);
    console.log('Row counts before:', before);

    const DAY = '2026-08-01';
    const EXPECTED_UNITS = {
        // module plan Section 8 (PO-locked): code -> [total, passed]
        '533140': [2184, 1494], '535470': [736, 390], '537220': [580, 62],
        '536250': [509, 347], '535790': [346, 268], '537015': [339, 301],
    };

    console.log('\n[1] Module KPI (summary) over ALL rows, PO-2');
    await check(`${DAY}: 2.863 / 4.695 = 60,98%, blank counted as Không đạt`, async () => {
        const summary = await timed('summary', () => service.getSummary(DAY, DAY));
        assert.equal(summary.total_bg, 4695);
        assert.equal(summary.total_passed, 2863);
        assert.equal(summary.passed_rate, 60.98);
        assert.equal(summary.total_failed, 4695 - 2863); // 1.581 Không đạt + 251 chưa có đánh giá
        assert.equal(summary.total_blank, 251);
        assert.equal(summary.national_rank.available, true);
    });

    console.log('\n[2] Six-unit ranking (531120 hidden, PO-6)');
    await check(`${DAY}: per-unit rows equal the locked baseline, six-unit total 2.862 / 4.694`, async () => {
        const ranking = await timed('ranking', () => service.getBcvhRanking(DAY, DAY));
        assert.equal(ranking.data.length, 6);
        for (const row of ranking.data) {
            const [total, ok] = EXPECTED_UNITS[row.ma_bcvh];
            assert.equal(row.sl_bg_ptc, total, `${row.ma_bcvh} volume`);
            assert.equal(row.dat_kpi_2026, ok, `${row.ma_bcvh} passed`);
            assert.equal(row.khong_dat_kpi_2026, total - ok, `${row.ma_bcvh} Không đạt = volume - passed`);
        }
        assert.equal(ranking.meta.total_row.sl_bg_ptc, 4694);
        assert.equal(ranking.meta.total_row.dat_kpi_2026, 2862);
        assert.deepEqual(ranking.data.map((row) => row.rank), [1, 2, 3, 4, 5, 6]);
        assert.ok(ranking.meta.national_rank && ranking.meta.national_rank.total === 34, 'national rank x/34');
    });

    console.log('\n[3] Multi-day additivity and daily trend');
    await check('2026-08-01..05: Σ daily-trend = range summary = 20.979 rows', async () => {
        const trend = await timed('daily-trend', () => service.getDailyTrend('2026-08-01', '2026-08-05'));
        const sum = trend.items.reduce((acc, item) => acc + item.total_volume, 0);
        const summary = await service.getSummary('2026-08-01', '2026-08-05');
        assert.equal(sum, summary.total_bg);
        assert.equal(sum, 20979);
        assert.equal(trend.items.reduce((acc, item) => acc + item.passed + item.failed, 0), sum);
    });

    console.log('\n[4] Source Excel parity (column AN = "Đánh giá (thời gian Có TMS PTC 8 giờ)")');
    await check('DB Đạt / Không đạt equal the Excel column AN counts on 3 sampled days', async () => {
        const expected = { '2026-07-01': [3898, 1198], '2026-08-01': [2863, 1581], '2026-09-05': [2533, 990] };
        for (const [date, [dat, khongDat]] of Object.entries(expected)) {
            const [row] = await all(db, `SELECT
                SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS dat,
                SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Không đạt' THEN 1 ELSE 0 END) AS kd
                FROM fact_f41 WHERE ngay_do_kiem = ?`, [date]);
            assert.equal(row.dat, dat, `${date} Đạt`);
            assert.equal(row.kd, khongDat, `${date} Không đạt`);
        }
    });

    console.log('\n[5] Overview (day/month-to-date/month) and weekly / monthly comparison');
    const overview = await timed('overview', () => service.getOverview());
    await check('overview: anchor date, six units, MTD ties to an independent SQL count', async () => {
        const anchor = overview.meta.anchor_date;
        assert.ok(anchor, 'anchor date resolved');
        assert.equal(overview.mtd.length, 6);
        const monthStart = `${anchor.slice(0, 7)}-01`;
        const [row] = await all(db, `SELECT COUNT(*) AS n, SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS p
            FROM fact_f41 WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bc_phat IN (${CANONICAL_CODES.map(() => '?').join(',')})`,
        [monthStart, anchor, ...CANONICAL_CODES]);
        assert.equal(overview.mtd.reduce((acc, unit) => acc + unit.volume, 0), row.n);
        assert.equal(overview.mtd.reduce((acc, unit) => acc + unit.passed, 0), row.p);
        assert.deepEqual(overview.routes.map((r) => r.participating_route_count).filter(Boolean), []);
        console.log(`       anchor ${anchor}, MTD ${row.n} rows, national rank (mtd) ${JSON.stringify(overview.meta.national_rank.mtd)}`);
    });

    await check('weekly comparison: TỔNG CỘNG = Σ six units = independent SQL count, weeks are Thursday-Wednesday', async () => {
        const weeks = await timed('weeks', () => service.listWeeks());
        assert.ok(weeks.length >= 9, `weeks listed (${weeks.length})`);
        weeks.forEach((week) => assert.equal(new Date(`${week.week_start}T00:00:00Z`).getUTCDay(), 4, `${week.week_id} starts on Thursday`));
        const current = weeks[weeks.length - 1];
        const compare = weeks[weeks.length - 2];
        const comparison = await timed('weekly-comparison', () => service.compareWeeks(current.week_id, compare.week_id));
        const unitsVolume = comparison.rows.reduce((acc, row) => acc + row.current.volume, 0);
        assert.equal(comparison.total_row.current.volume, unitsVolume);
        const [row] = await all(db, `SELECT COUNT(*) AS n, SUM(CASE WHEN danh_gia_co_tms_ptc_8h = 'Đạt' THEN 1 ELSE 0 END) AS p
            FROM fact_f41 WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bc_phat IN (${CANONICAL_CODES.map(() => '?').join(',')})`,
        [current.display_start_date, current.display_end_date, ...CANONICAL_CODES]);
        assert.equal(comparison.total_row.current.volume, row.n);
        assert.equal(comparison.total_row.current.passed, row.p);
        const expectedRate = Number(((row.p / row.n) * 100).toFixed(4));
        assert.equal(comparison.total_row.current.rate, expectedRate);
        console.log(`       ${current.label} ${current.display_start_date}..${current.display_end_date}: ${row.n} rows, ${expectedRate}% (rank ${JSON.stringify(comparison.meta.national_rank.current)})`);
        const trend = await timed('weekly-trend', () => service.trendWeeks(current.week_id, { limit: 40 }));
        assert.equal(trend.weeks[trend.weeks.length - 1].total.volume, row.n);
    });

    await check('monthly comparison: calendar months, same-period cut', async () => {
        const months = await timed('months', () => service.listMonths());
        assert.deepEqual(months.slice(0, 3).map((m) => m.month_start), ['2026-07-01', '2026-08-01', '2026-09-01']);
        const comparison = await timed('monthly-comparison', () => service.compareMonths(months[1].month_id, months[0].month_id));
        const [row] = await all(db, `SELECT COUNT(*) AS n FROM fact_f41 WHERE strftime('%Y-%m', ngay_do_kiem) = '2026-08'
            AND ma_bc_phat IN (${CANONICAL_CODES.map(() => '?').join(',')})`, CANONICAL_CODES);
        assert.equal(comparison.total_row.current.volume, row.n);
    });

    console.log('\n[6] National rank recomputed independently from fact_f41_national');
    await check(`${DAY}: Huế (53) rank and total equal an independent ORDER BY`, async () => {
        const rows = await all(db, `SELECT ma_don_vi, sl_ptc_8h_co_tms AS p, sl_ptc_nop_tien_ch AS v FROM fact_f41_national
            WHERE ngay_do_kiem = ? AND sl_ptc_nop_tien_ch > 0
            ORDER BY (sl_ptc_8h_co_tms * 1.0 / sl_ptc_nop_tien_ch) DESC, sl_ptc_nop_tien_ch DESC, ma_don_vi ASC`, [DAY]);
        const index = rows.findIndex((r) => String(r.ma_don_vi) === '53');
        const summary = await nationalRankService.getNationalRankSummary(DAY, DAY);
        assert.equal(summary.total, 34);
        assert.equal(summary.rank, index + 1);
        assert.equal(summary.passed, 2863);
        assert.equal(summary.volume, 4684); // published national denominator differs from the 4.695 row-level total (R-8)
        console.log(`       Huế ${summary.rank}/${summary.total}, national-report rate ${summary.metric_value}% (row-level 60,98%)`);
    });

    console.log('\n[7] Read-only: row counts unchanged');
    await check('fact_f41 / fact_f13 / fact_f41_national counts identical before and after', async () => {
        assert.deepEqual(await counts(db), before);
    });

    await new Promise((resolve) => db.close(resolve));
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
    console.error('Reconciliation aborted:', error);
    process.exit(2);
});
