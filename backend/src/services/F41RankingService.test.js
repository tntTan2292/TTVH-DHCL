'use strict';

// F41-DASHBOARD-RANKING-01 (T1/T2): real temp-SQLite tests of the F4.1 ranking
// stack (FactF41Repository overview/week/month queries, F41NationalRankService,
// F41RankingService incl. the reused F1.3 overview / weekly services).
// Never touches the operational database.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF41Phase1Schema } = require('../../migrate_f41_phase1_schema');
const { applyF41Phase2Schema } = require('../../migrate_f41_phase2_schema');
const { FactF41Repository } = require('../repositories/FactF41Repository');
const { F41NationalRankService } = require('./F41NationalRankService');
const { F41RankingService, CANONICAL_CODES } = require('./F41RankingService');

const NOW = () => new Date('2026-08-12T05:00:00Z'); // business "yesterday" ceiling = 2026-08-11

function tempDbPath() {
    return path.join(os.tmpdir(), `f41-ranking-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

function closeDb(db) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve();
        db.close((err) => (err ? reject(err) : resolve()));
    });
}

function runSql(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, (err) => (err ? reject(err) : resolve())));
}

// n rows for one BCVH/day: `passed` Đạt, `failed` Không đạt, remainder blank.
function rows(code, name, { total, passed, failed = 0 }, prefix) {
    return Array.from({ length: total }, (_, i) => ({
        ma_bg: `${prefix}-${code}-${i}`,
        ma_bc_phat: code,
        ten_bc_phat: name,
        danh_gia_co_tms_ptc_8h: i < passed ? 'Đạt' : (i < passed + failed ? 'Không đạt' : null),
    }));
}

async function seedFixture(db, repository) {
    // 2026-08-03 (Mon) .. 2026-08-11: only some days seeded; 531120 is non-canonical.
    const days = {
        '2026-07-30': [['533140', 'BCVH Thuận Hóa', { total: 10, passed: 5, failed: 4 }]],
        '2026-08-03': [
            ['533140', 'BCVH Thuận Hóa', { total: 10, passed: 6, failed: 3 }],
            ['537220', 'BCVH Phú Lộc', { total: 4, passed: 1, failed: 3 }],
            ['531120', 'Khách hàng lớn', { total: 1, passed: 1 }],
        ],
        '2026-08-04': [
            ['533140', 'BCVH Thuận Hóa', { total: 8, passed: 4, failed: 3 }],
            ['537220', 'BCVH Phú Lộc', { total: 2, passed: 2 }],
        ],
        '2026-08-10': [
            ['533140', 'BCVH Thuận Hóa', { total: 6, passed: 3, failed: 2 }],
            ['537220', 'BCVH Phú Lộc', { total: 5, passed: 1, failed: 4 }],
        ],
        '2026-08-11': [
            ['533140', 'BCVH Thuận Hóa', { total: 10, passed: 7, failed: 2 }],
            ['537220', 'BCVH Phú Lộc', { total: 4, passed: 0, failed: 3 }],
            ['531120', 'Khách hàng lớn', { total: 1, passed: 1 }],
        ],
    };
    for (const [date, units] of Object.entries(days)) {
        const data = units.flatMap(([code, name, spec]) => rows(code, name, spec, date));
        await repository.overwriteImport(date, data);
    }

    // National lane: 3 provinces, Huế = 53. 2026-08-11: 53 ranks 2nd of 3.
    const national = [
        ['2026-08-10', '10', 'HN', 100, 90],
        ['2026-08-10', '53', 'Huế', 100, 80],
        ['2026-08-10', '20', 'ĐN', 100, 70],
        ['2026-08-11', '10', 'HN', 100, 85],
        ['2026-08-11', '53', 'Huế', 100, 75],
        ['2026-08-11', '20', 'ĐN', 100, 60],
    ];
    for (const [date, code, name, den, num] of national) {
        await runSql(db,
            'INSERT INTO fact_f41_national (ngay_do_kiem, ma_don_vi, ten_don_vi, sl_ptc_nop_tien_ch, sl_ptc_8h_co_tms) VALUES (?, ?, ?, ?, ?)',
            [date, code, name, den, num]);
    }
}

async function withStack(fn) {
    const dbPath = tempDbPath();
    let db;
    try {
        await applyF41Phase1Schema(dbPath);
        await applyF41Phase2Schema(dbPath);
        db = new sqlite3.Database(dbPath);
        const repository = new FactF41Repository(db);
        await seedFixture(db, repository);
        const nationalRankService = new F41NationalRankService(db);
        const service = new F41RankingService({ repository, nationalRankService, now: NOW });
        await fn({ db, repository, nationalRankService, service });
    } finally {
        await closeDb(db);
        fs.rmSync(dbPath, { force: true });
    }
}

test('overview daily/monthly/mtd use all-rows denominator and only the 6 canonical BCVH', async () => {
    await withStack(async ({ service }) => {
        const overview = await service.getOverview();
        assert.equal(overview.meta.anchor_date, '2026-08-11');

        const aug11 = overview.daily.filter((row) => row.date === '2026-08-11');
        const hue = aug11.find((row) => row.ma_bcvh === '533140');
        assert.equal(hue.volume, 10);
        assert.equal(hue.passed, 7);
        assert.equal(hue.failed, 3); // blank evaluation counts as Không đạt (PO 2026-10-08)
        assert.equal(hue.rate, 70);
        // 531120 (non-canonical) is never exposed
        assert.equal(overview.daily.some((row) => row.ma_bcvh === '531120'), false);

        const monthlyHue = overview.monthly.find((row) => row.ma_bcvh === '533140' && row.month === '2026-08');
        assert.equal(monthlyHue.volume, 10 + 8 + 6 + 10);
        assert.equal(monthlyHue.failed, monthlyHue.volume - monthlyHue.passed); // blank counts as Không đạt
        const mtdHue = overview.mtd.find((row) => row.ma_bcvh === '533140');
        assert.equal(mtdHue.failed, mtdHue.volume - mtdHue.passed);
        assert.equal(mtdHue.volume, 10 + 8 + 6 + 10);
        assert.equal(mtdHue.passed, 6 + 4 + 3 + 7);
        // previous month window (July 1..July 11): only 2026-07-30 is outside it; same-period is empty
        assert.equal(mtdHue.previous_month_to_date.volume, 0);
        assert.equal(mtdHue.previous_full_month.volume, 10);
        assert.deepEqual(overview.routes.every((row) => row.participating_route_count === 0), true);
    });
});

test('overview national rank is wired to fact_f41_national (daily and month-to-date)', async () => {
    await withStack(async ({ service }) => {
        const overview = await service.getOverview();
        assert.deepEqual(overview.meta.national_rank.daily, { rank: 2, total: 3 });
        // MTD 2026-08-01..11: HN 175/200, Huế 155/200, ĐN 130/200 -> rank 2
        assert.deepEqual(overview.meta.national_rank.mtd, { rank: 2, total: 3 });
    });
});

test('weeks use Thursday-Wednesday and weekly comparison TỔNG CỘNG sums volume, not rates', async () => {
    await withStack(async ({ service }) => {
        const weeks = await service.listWeeks();
        // 2026-07-30 (Thu) starts a week; 2026-08-06 (Thu) starts the next
        const starts = weeks.map((week) => week.week_start);
        assert.ok(starts.includes('2026-07-30'));
        assert.ok(starts.includes('2026-08-06'));
        const w1 = weeks.find((week) => week.week_start === '2026-07-30');
        const w2 = weeks.find((week) => week.week_start === '2026-08-06');
        assert.equal(w1.iso_week, 31);

        const comparison = await service.compareWeeks(w2.week_id, w1.week_id);
        const cur = comparison.total_row.current;
        // week of 2026-08-06: only 08-10 and 08-11 have data; volume = 6+5 + 10+4 + (531120 excluded)
        assert.equal(cur.volume, 6 + 5 + 10 + 4);
        assert.equal(cur.passed, 3 + 1 + 7 + 0);
        assert.deepEqual(comparison.meta.national_rank.current, { rank: 2, total: 3 });
    });
});

test('weekly trend and month list/comparison run on F4.1 data', async () => {
    await withStack(async ({ service }) => {
        const weeks = await service.listWeeks();
        const anchor = weeks[weeks.length - 1];
        const trend = await service.trendWeeks(anchor.week_id, { limit: 10 });
        assert.equal(trend.weeks.length, weeks.length);
        const lastPoint = trend.weeks[trend.weeks.length - 1];
        assert.equal(lastPoint.total.volume, 6 + 5 + 10 + 4);
        assert.deepEqual(lastPoint.national_rank, { rank: 2, total: 3 });

        const months = await service.listMonths();
        assert.deepEqual(months.map((month) => month.month_start), ['2026-07-01', '2026-08-01']);
        const comparison = await service.compareMonths(months[1].month_id, months[0].month_id);
        assert.equal(comparison.total_row.current.volume, 10 + 4 + 8 + 2 + 6 + 5 + 10 + 4);
    });
});

test('summary is the module KPI over ALL rows (incl. 531120) and carries the F1.3 card shape', async () => {
    await withStack(async ({ service }) => {
        const summary = await service.getSummary('2026-08-11', '2026-08-11');
        // 10 + 4 + 1 rows: Đạt 7+0+1 = 8 -> 53.33%
        assert.equal(summary.total_bg, 15);
        assert.equal(summary.total_passed, 8);
        assert.equal(summary.total_failed, 7); // 5 strict Không đạt + 2 blank evaluations
        assert.equal(summary.total_unknown, 0);
        assert.equal(summary.total_blank, 2);
        assert.equal(summary.passed_rate, 53.33);
        assert.equal(summary.national_rank.available, true);
        assert.equal(summary.national_rank.rank, 2);
        assert.equal(summary.comparisons.d1.previous_date, '2026-08-10');
        assert.equal(summary.comparisons.d1.available, true);
        assert.equal(summary.comparisons.d7.previous_date, '2026-08-04');

        const hueOnly = await service.getSummary('2026-08-11', '2026-08-11', { bcvhId: '533140' });
        assert.equal(hueOnly.total_bg, 10);
        assert.equal(hueOnly.national_rank, null);
        await assert.rejects(() => service.getSummary('2026-08-11', '2026-08-11', { bcvhId: '999999' }), { code: 'INVALID_BCVH' });
    });
});

test('single-day ranking: six-unit total differs from module KPI exactly by non-canonical rows (PO-6)', async () => {
    await withStack(async ({ service }) => {
        const ranking = await service.getBcvhRanking('2026-08-11', '2026-08-11');
        assert.equal(ranking.data.length, 2);
        assert.deepEqual(ranking.data.map((row) => row.ma_bcvh), ['533140', '537220']);
        assert.equal(ranking.data[0].rank, 1);
        assert.equal(ranking.data[0].sl_bg_ptc, 10);
        assert.equal(ranking.data[0].dat_kpi_2026, 7);
        assert.equal(ranking.data[0].khong_dat_kpi_2026, 3); // 2 Không đạt + 1 blank
        assert.equal(ranking.meta.total_row.sl_bg_ptc, 14); // 15 module rows minus the 531120 row
        assert.equal(ranking.meta.total_row.dat_kpi_2026, 7);
        assert.deepEqual(ranking.meta.national_rank, { rank: 2, total: 3 });
        assert.equal(ranking.meta.date_range.single_day, true);
        assert.equal(ranking.meta.pagination.total_items, 2);
        // comparison vs previous available date 2026-08-10 (rate 3/6=50.0 -> 70.0: +20.0)
        assert.equal(ranking.data[0].kpi_2026_dod, 20);
        assert.equal(ranking.data[0].comparisons.d7.volume, 8); // 2026-08-04
        // month-to-date
        assert.equal(ranking.data[0].month_to_date_sl_bg_ptc, 34);
    });
});

test('daily trend covers every date in range, flags gaps, ranks only dates with data, ignores BCVH filter rank', async () => {
    await withStack(async ({ service }) => {
        const trend = await service.getDailyTrend('2026-08-09', '2026-08-11');
        assert.deepEqual(trend.items.map((item) => item.date), ['2026-08-09', '2026-08-10', '2026-08-11']);
        assert.equal(trend.items[0].data_available, false);
        assert.equal(trend.items[0].quality_rate, null);
        assert.equal(trend.items[0].national_rank, null);
        assert.equal(trend.items[2].total_volume, 15);
        assert.equal(trend.items[2].quality_rate, 53.3333);
        // Không đạt = not Đạt, blank evaluations included (PO 2026-10-08): 15 rows - 8 Đạt
        assert.equal(trend.items[2].failed, 7);
        assert.equal(trend.items[1].failed, 11 - 4); // 2026-08-10: 11 rows, 4 Đạt
        assert.deepEqual([trend.items[1].national_rank.rank, trend.items[1].national_rank.total], [2, 3]);
        assert.equal(trend.meta.latest_import, '2026-08-11');

        const one = await service.getDailyTrend('2026-08-10', '2026-08-11', { bcvhId: '537220' });
        assert.equal(one.items[1].total_volume, 4);
        assert.equal('national_rank' in one.items[1], false);
        await assert.rejects(() => service.getDailyTrend('2026-08-12', '2026-08-11'), { code: 'INVALID_RANGE' });
        await assert.rejects(() => service.getDailyTrend('2026-02-30', '2026-03-01'), { code: 'INVALID_DATE' });
    });
});

test('national rank: range aggregation, tie-break by volume, missing province and missing date', async () => {
    await withStack(async ({ db, nationalRankService }) => {
        const range = await nationalRankService.getNationalRankSummary('2026-08-10', '2026-08-11');
        assert.equal(range.available, true);
        assert.equal(range.rank, 2);
        assert.equal(range.total, 3);
        assert.equal(range.metric_value, 77.5);
        assert.equal(range.volume, 200);
        assert.equal(range.previous_period, null);

        // the single-day summary knows the previous available date and the movement
        const day = await nationalRankService.getNationalRankSummary('2026-08-11', '2026-08-11');
        assert.equal(day.previous_period, '2026-08-10');
        assert.equal(day.previous_rank, 2);
        assert.equal(day.movement, 0);

        // equal rate: larger volume ranks higher
        await runSql(db, 'INSERT INTO fact_f41_national (ngay_do_kiem, ma_don_vi, ten_don_vi, sl_ptc_nop_tien_ch, sl_ptc_8h_co_tms) VALUES (?, ?, ?, ?, ?)', ['2026-08-12', '10', 'HN', 200, 150]);
        await runSql(db, 'INSERT INTO fact_f41_national (ngay_do_kiem, ma_don_vi, ten_don_vi, sl_ptc_nop_tien_ch, sl_ptc_8h_co_tms) VALUES (?, ?, ?, ?, ?)', ['2026-08-12', '53', 'Huế', 100, 75]);
        const tie = await nationalRankService.getNationalRankSummary('2026-08-12', '2026-08-12');
        assert.equal(tie.rank, 2);

        // province absent from a date -> unavailable, never an exception
        await runSql(db, 'INSERT INTO fact_f41_national (ngay_do_kiem, ma_don_vi, ten_don_vi, sl_ptc_nop_tien_ch, sl_ptc_8h_co_tms) VALUES (?, ?, ?, ?, ?)', ['2026-08-13', '10', 'HN', 100, 50]);
        const missingProvince = await nationalRankService.getNationalRanksForDates(['2026-08-13', '2026-08-20']);
        assert.equal(missingProvince['2026-08-13'].available, false);
        assert.equal(missingProvince['2026-08-20'].available, false);

        const none = await nationalRankService.getNationalRankSummary('2026-09-01', '2026-09-02');
        assert.equal(none.available, false);
        const bad = await nationalRankService.getNationalRankSummary('2026-09-02', '2026-09-01');
        assert.equal(bad.available, false);
    });
});

test('repository exposes no route dimension and only canonical codes reach ranking queries', async () => {
    await withStack(async ({ repository }) => {
        assert.deepEqual(await repository.getBcvhOverviewRoutes(), []);
        assert.deepEqual(await repository.getBcvhWeeksList([]), []);
        assert.equal(CANONICAL_CODES.length, 6);
        assert.equal(CANONICAL_CODES.includes('531120'), false);
        const metrics = await repository.getBcvhOperationMetricsBetween('2026-08-03', '2026-08-03', CANONICAL_CODES);
        assert.deepEqual(metrics.map((row) => row.ma_bcvh).sort(), ['533140', '537220']);
    });
});

test('ranking compares the exact ratio, not a 1-decimal rounding (T8-F41-NB3)', async () => {
    await withStack(async ({ db, repository, nationalRankService }) => {
        const mk = (code, name, total, passed, prefix) => rows(code, name, { total, passed }, prefix);
        await repository.overwriteImport('2026-08-12', [
            ...mk('533140', 'BCVH Thuận Hóa', 10000, 6844, 'A'), // 68.44 %
            ...mk('537220', 'BCVH Phú Lộc', 20000, 13672, 'B'), // 68.36 %, but 68.4 once rounded
        ]);
        const service = new F41RankingService({ repository, nationalRankService, now: NOW });
        const ranking = await service.getBcvhRanking('2026-08-12', '2026-08-12');
        assert.deepEqual(ranking.data.map((row) => [row.ma_bcvh, row.rank]), [['533140', 1], ['537220', 2]]);
        assert.ok(db);
    });
});

test('summary degrades to a null national rank when the rank query fails (T8-F41-NB4)', async () => {
    await withStack(async ({ repository }) => {
        const failingRank = { getNationalRankSummary: async () => { throw new Error('boom'); }, getNationalRanksForDates: async () => ({}), unavailableForDate: () => null };
        const service = new F41RankingService({ repository, nationalRankService: failingRank, now: NOW });
        const summary = await service.getSummary('2026-08-11', '2026-08-11');
        assert.equal(summary.total_bg, 15);
        assert.equal(summary.national_rank, null);
    });
});
