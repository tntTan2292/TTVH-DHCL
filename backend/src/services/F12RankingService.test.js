'use strict';

// F12-DASHBOARD-RANKING-01: temp-SQLite tests of the F1.2 read stack (FactF12Repository, F12RankingService
// incl. the reused F4.1/F1.3 logic over a data-driven unit list, the office table, the rolling 12 months
// and the controller). Never touches the operational database. The real 10/10/2026 file (PO) is the
// known answer for the unit/office split.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF12Schema } = require('../../migrate_f12_schema');
const { FactF12Repository } = require('../repositories/FactF12Repository');
const { F12NationalRankService } = require('./F12NationalRankService');
const { F12RankingService, resolvePeriod, rollingMonths } = require('./F12RankingService');
const { createController } = require('../controllers/F12RankingController');
const { parseF12HueExcel } = require('./f12HueExcelParser');

const NOW = () => new Date('2026-10-09T05:00:00Z');

const U_TH = ['5304', 'Bưu điện phường Thuận Hóa'];
const U_PX = ['5340', 'Bưu điện phường Phú Xuân'];
const U_KHL = ['5375', 'BCVH Thuận Hóa'];

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, (err) => (err ? reject(err) : resolve())));
}

// one fact_f12 row per evaluation: office = [code, name], unit = [code, name]
async function seed(db, date, office, unit, evaluations) {
    for (let i = 0; i < evaluations.length; i++) {
        await run(db,
            `INSERT INTO fact_f12 (ngay_do_kiem, ma_bg, ma_tinh_chap_nhan, ma_bc_chap_nhan, ten_bc_chap_nhan, ma_huyen, ten_huyen, danh_gia)
             VALUES (?, ?, '53', ?, ?, ?, ?, ?)`,
            [date, `${date}-${office[0]}-${i}`, office[0], office[1], unit[0], unit[1], evaluations[i]]);
    }
}

async function openDb(dbPath) {
    await applyF12Schema(dbPath);
    return new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
}

async function withStack(fn) {
    const dbPath = path.join(os.tmpdir(), `f12-ranking-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    let db;
    try {
        db = await openDb(dbPath);
        // 2026-10-06 (Tue), 2026-10-07 (Wed) end the Thu 10-01 .. Wed 10-07 week; 2026-10-08 (Thu) starts the next
        await seed(db, '2026-10-06', ['100001', 'BĐ Thuận Hóa 1'], U_TH, ['Đạt', 'Đạt', 'Đạt', 'Không đạt']);
        await seed(db, '2026-10-06', ['100002', 'BĐ Thuận Hóa 2'], U_TH, ['Đạt', 'Không đạt']);
        await seed(db, '2026-10-06', ['200001', 'BĐ Phú Xuân 1'], U_PX, ['Đạt', 'Đạt']);
        await seed(db, '2026-10-06', ['531120', 'Khách hàng lớn'], U_KHL, ['Đạt', 'Đạt', 'Đạt']);
        await seed(db, '2026-10-07', ['100001', 'BĐ Thuận Hóa 1'], U_TH, ['Đạt', 'Đạt', 'Không đạt']);
        await seed(db, '2026-10-07', ['200001', 'BĐ Phú Xuân 1'], U_PX, ['Không đạt', 'Không đạt']);
        await seed(db, '2026-10-07', ['531120', 'Khách hàng lớn'], U_KHL, ['Đạt']);
        await seed(db, '2026-10-08', ['100001', 'BĐ Thuận Hóa 1'], U_TH, ['Đạt']);
        const repository = new FactF12Repository(db);
        const service = new F12RankingService({ repository, nationalRankService: new F12NationalRankService(db), now: NOW });
        await fn({ db, repository, service, dbPath });
    } finally {
        await new Promise((resolve) => (db ? db.close(() => resolve()) : resolve()));
        fs.rmSync(dbPath, { force: true });
    }
}

test('ranked units come from the data and exclude the unit that only holds the large-customer office', async () => {
    await withStack(async ({ repository, service }) => {
        assert.deepEqual(await repository.getRankedUnits(), [
            { ma_bcvh: '5340', ten_bcvh: 'Bưu điện phường Phú Xuân' },
            { ma_bcvh: '5304', ten_bcvh: 'Bưu điện phường Thuận Hóa' },
        ]);
        const meta = await service.getDashboardMeta();
        assert.equal(meta.bcvh_units.length, 2);
        assert.equal(meta.target_rate, 95);
        assert.equal(meta.kpi_includes_large_customer, true);
        assert.equal(meta.min_date, '2026-10-06');
        assert.equal(meta.max_date, '2026-10-08');
    });
});

test('summary: module total covers every row (incl. large customer); unit filter rejects an unranked unit', async () => {
    await withStack(async ({ service }) => {
        const summary = await service.getSummary('2026-10-07', '2026-10-07');
        assert.equal(summary.total_bg, 6); // 3 + 2 + 1
        assert.equal(summary.total_passed, 3); // 2 + 0 + 1
        assert.equal(summary.passed_rate, 50);
        const unit = await service.getSummary('2026-10-07', '2026-10-07', { bcvhId: '5304' });
        assert.equal(unit.total_bg, 3);
        await assert.rejects(service.getSummary('2026-10-07', '2026-10-07', { bcvhId: '5375' }), (e) => e.code === 'INVALID_BCVH');
    });
});

test('ranking (day): ranked units only, large customer in neither rows nor total row; rank by rate', async () => {
    await withStack(async ({ service }) => {
        const result = await service.getBcvhRanking('2026-10-06', '2026-10-06');
        assert.deepEqual(result.data.map((r) => [r.ma_bcvh, r.sl_bg_ptc, r.dat_kpi_2026, r.rank]), [
            ['5340', 2, 2, 1],
            ['5304', 6, 4, 2],
        ]);
        assert.equal(result.meta.total_row.sl_bg_ptc, 8); // 6 + 2, without the 3 large-customer parcels
        assert.equal(result.meta.total_row.dat_kpi_2026, 6);
    });
});

test('overview, weeks and months run over the data-driven units', async () => {
    await withStack(async ({ service }) => {
        const overview = await service.getOverview('2026-10-09');
        assert.equal(overview.meta.canonical_bcvh_count, 2);
        assert.equal(overview.mtd.length, 2);
        const mtdTh = overview.mtd.find((u) => u.ma_bcvh === '5304');
        assert.equal(mtdTh.volume, 6 + 3 + 1); // 06/10 + 07/10 + 08/10, no 531120
        const weeks = await service.listWeeks();
        assert.equal(weeks.length >= 2, true);
        const months = await service.listMonths();
        assert.equal(months.length, 1);
    });
});

test('office table (day): unit -> offices, rank, large customer shown apart, total row = module total', async () => {
    await withStack(async ({ service }) => {
        const table = await service.getOfficeTable({ period: 'day', anchorDate: '2026-10-06' });
        assert.deepEqual(table.meta, { period: 'day', from_date: '2026-10-06', to_date: '2026-10-06', period_end: '2026-10-06', days_with_data: 1, has_data: true, unit_count: 2, office_count: 4, target_rate: 95 });
        assert.deepEqual(table.rows.map((r) => [r.ma_huyen, r.volume, r.passed, r.rank]), [['5340', 2, 2, 1], ['5304', 6, 4, 2]]);
        const th = table.rows.find((r) => r.ma_huyen === '5304');
        assert.deepEqual(th.offices.map((o) => [o.ma_chap_nhan, o.volume, o.passed, o.rate]), [['100001', 4, 3, 75], ['100002', 2, 1, 50]]);
        assert.equal(table.unranked.length, 1);
        assert.deepEqual([table.unranked[0].ma_huyen, table.unranked[0].volume, table.unranked[0].offices[0].large_customer], ['5375', 3, true]);
        assert.deepEqual(table.total_row, { ten_huyen: 'TỔNG CỘNG', volume: 11, passed: 9, failed: 2, rate: 81.82 });
        const summary = await service.getSummary('2026-10-06', '2026-10-06');
        assert.equal(table.total_row.volume, summary.total_bg);
        assert.equal(table.total_row.passed, summary.total_passed);
    });
});

test('office table week/month and invalid or empty periods', async () => {
    await withStack(async ({ service }) => {
        const week = await service.getOfficeTable({ period: 'week', anchorDate: '2026-10-07' });
        assert.deepEqual([week.meta.from_date, week.meta.to_date, week.meta.days_with_data], ['2026-10-01', '2026-10-07', 2]);
        assert.equal(week.total_row.volume, 11 + 6);
        // week / month are "to date": never past the selected day (review N2)
        const month = await service.getOfficeTable({ period: 'month', anchorDate: '2026-10-20' });
        assert.deepEqual([month.meta.from_date, month.meta.to_date, month.meta.period_end], ['2026-10-01', '2026-10-20', '2026-10-31']);
        assert.equal(month.total_row.volume, 11 + 6 + 1);
        const midWeek = await service.getOfficeTable({ period: 'week', anchorDate: '2026-10-06' });
        assert.deepEqual([midWeek.meta.from_date, midWeek.meta.to_date, midWeek.meta.period_end], ['2026-10-01', '2026-10-06', '2026-10-07']);
        assert.equal(midWeek.total_row.volume, 11); // 07/10 (6 parcels) is after the selected day
        const empty = await service.getOfficeTable({ period: 'day', anchorDate: '2026-09-01' });
        assert.equal(empty.meta.has_data, false);
        assert.deepEqual(empty.rows, []);
        assert.equal(empty.total_row.rate, null);
        await assert.rejects(service.getOfficeTable({ period: 'year', anchorDate: '2026-10-07' }), (e) => e.code === 'MISSING_PARAM');
        await assert.rejects(service.getOfficeTable({ period: 'day', anchorDate: '2026-13-40' }), (e) => e.code === 'INVALID_DATE');
        assert.deepEqual(resolvePeriod({ fromDate: '2026-10-01', toDate: '2026-10-03' }), { period: 'range', from: '2026-10-01', to: '2026-10-03' });
        assert.throws(() => resolvePeriod({ fromDate: '2026-10-05', toDate: '2026-10-03' }), (e) => e.code === 'INVALID_RANGE');
    });
});

test('cumulative 12: rolling months across a year boundary are sums of daily rows, units ranked, large customer only in the total', async () => {
    assert.deepEqual(rollingMonths('2026-02'), ['2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
    await withStack(async ({ db, service }) => {
        await seed(db, '2025-12-15', ['100001', 'BĐ Thuận Hóa 1'], U_TH, ['Đạt', 'Đạt']);
        await seed(db, '2025-12-15', ['531120', 'Khách hàng lớn'], U_KHL, ['Đạt']);
        await seed(db, '2026-01-10', ['200001', 'BĐ Phú Xuân 1'], U_PX, ['Đạt', 'Không đạt']);
        const result = await service.getCumulative12('2026-10');
        assert.equal(result.meta.months.length, 12);
        assert.equal(result.meta.months[0], '2025-11');
        const dec = result.months.find((m) => m.month === '2025-12');
        assert.deepEqual([dec.volume, dec.passed, dec.rate, dec.days_with_data], [3, 3, 100, 1]);
        const oct = result.months.find((m) => m.month === '2026-10');
        assert.deepEqual([oct.volume, oct.passed], [11 + 6 + 1, 9 + 3 + 1]);
        const nov = result.months.find((m) => m.month === '2025-11');
        assert.deepEqual([nov.volume, nov.data_available], [0, false]);
        // cumulative = every month, large customer included; units = ranked units only
        assert.equal(result.cumulative.volume, 3 + 2 + 18);
        const unitSum = result.units.reduce((s, u) => s + u.volume, 0);
        const khlParcels = 1 + 3 + 1; // 531120 rows of Dec-2025, 06/10 and 07/10
        assert.equal(unitSum, result.cumulative.volume - khlParcels);
        const th = result.units.find((u) => u.ma_bcvh === '5304');
        assert.deepEqual(th.months['2025-12'], { volume: 2, passed: 2, rate: 100 });
        assert.equal(th.months['2025-11'], null);
        assert.equal(result.units[0].rank, 1);
        await assert.rejects(service.getCumulative12('2026-13'), (e) => e.code === 'INVALID_MONTH_ID');
    });
});

test('controller: office-table and cumulative-12 shapes, 400 for bad parameters, no-store', async () => {
    await withStack(async ({ service }) => {
        const controller = createController(service);
        const call = async (handler, query) => {
            const out = { headers: {} };
            const res = {
                set(k, v) { out.headers[k] = v; return res; },
                status(code) { out.status = code; return res; },
                json(body) { out.body = body; return res; },
            };
            await handler({ query }, res);
            return out;
        };
        const ok = await call(controller.getOfficeTable, { period: 'day', anchor_date: '2026-10-06' });
        assert.equal(ok.status, 200);
        assert.equal(ok.body.data.rows.length, 2);
        assert.match(ok.headers['Cache-Control'], /no-store/);
        assert.equal((await call(controller.getOfficeTable, { period: 'day' })).status, 400);
        assert.equal((await call(controller.getCumulative12, {})).status, 400);
        assert.equal((await call(controller.getCumulative12, { month: '2026-10' })).status, 200);
        assert.equal((await call(controller.getCumulative12, { month: 'abc' })).status, 400);
        const meta = await call(controller.getMeta, {});
        assert.equal(meta.body.data.bcvh_units.length, 2);
    });
});

// ---- the PO's real 10/10/2026 file as the known answer ------------------------------------------
const REAL_HUE = path.resolve(__dirname, '../../../Data DKCL/F1.2-2026.10.10.xlsx');

test('real 10/10/2026 file: 1.758 / 1.620 / 92,15 %; large customer 550 parcels counted in the total, not ranked', { skip: fs.existsSync(REAL_HUE) ? false : 'PO file not present' }, async () => {
    await withStack(async ({ db, service }) => {
        await run(db, "DELETE FROM fact_f12");
        const parsed = parseF12HueExcel(fs.readFileSync(REAL_HUE), 'F1.2-2026.10.10.xlsx');
        const columns = parsed.dbColumns;
        await run(db, 'BEGIN');
        for (const row of parsed.parsedData) {
            await run(db, `INSERT INTO fact_f12 (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, columns.map((c) => row[c] ?? null));
        }
        await run(db, 'COMMIT');

        const summary = await service.getSummary('2026-10-10', '2026-10-10');
        assert.deepEqual([summary.total_bg, summary.total_passed, summary.total_failed, summary.passed_rate], [1758, 1620, 138, 92.15]);

        const table = await service.getOfficeTable({ period: 'day', anchorDate: '2026-10-10' });
        assert.equal(table.total_row.volume, 1758);
        assert.equal(table.total_row.passed, 1620);
        assert.equal(table.meta.office_count, 73);
        assert.equal(table.unranked.length, 1);
        assert.deepEqual([table.unranked[0].volume, table.unranked[0].passed], [550, 549]);
        assert.equal(table.rows.reduce((s, u) => s + u.volume, 0), 1758 - 550);
        // the ranked units plus the large-customer unit are the 37 units of the file
        assert.equal(table.rows.length + table.unranked.length, 37);

        const ranking = await service.getBcvhRanking('2026-10-10', '2026-10-10', 1, 100);
        assert.equal(ranking.data.length, table.rows.length);
        assert.equal(ranking.meta.total_row.sl_bg_ptc, 1758 - 550);
    });
});

test('a unit filter never includes the large-customer office, even when the unit holds it (review N3)', async () => {
  await withStack(async ({ db, service }) => {
    // a unit that holds both a normal office and the large-customer office
    await seed(db, '2026-10-09', ['300001', 'BĐ Hỗn hợp'], ['5399', 'Đơn vị hỗn hợp'], ['Đạt', 'Không đạt']);
    await seed(db, '2026-10-09', ['531120', 'Khách hàng lớn'], ['5399', 'Đơn vị hỗn hợp'], ['Đạt', 'Đạt', 'Đạt']);
    const unit = await service.getSummary('2026-10-09', '2026-10-09', { bcvhId: '5399' });
    assert.equal(unit.total_bg, 2);
    const trend = await service.getDailyTrend('2026-10-09', '2026-10-09', { bcvhId: '5399' });
    assert.equal(trend.items[0].total_volume, 2);
    const module = await service.getSummary('2026-10-09', '2026-10-09');
    assert.equal(module.total_bg, 5);
  });
});

test('office overview: every accepting office (large customer included) as a row, totals equal the module total', async () => {
  await withStack(async ({ service }) => {
    const overview = await service.getOfficeOverview('2026-10-07');
    assert.equal(overview.meta.anchor_date, '2026-10-07');
    assert.equal(overview.meta.canonical_bcvh_count, 4); // 100001, 100002, 200001, 531120
    assert.deepEqual(overview.monthly, []);
    assert.deepEqual(overview.routes, []);

    const byCode = Object.fromEntries(overview.mtd.map((row) => [row.ma_bcvh, row]));
    assert.deepEqual(Object.keys(byCode).sort(), ['100001', '100002', '200001', '531120']);
    assert.equal(byCode['100001'].ten_bcvh, 'BĐ Thuận Hóa 1');
    // month to date 07/10: 100001 = 4 + 3 = 7 (5 Đạt), 531120 = 3 + 1 = 4 (all Đạt)
    assert.deepEqual([byCode['100001'].volume, byCode['100001'].passed], [7, 5]);
    assert.deepEqual([byCode['531120'].volume, byCode['531120'].passed], [4, 4]);
    const mtdTotal = overview.mtd.reduce((sum, row) => sum + row.volume, 0);
    const summary = await service.getSummary('2026-10-01', '2026-10-07');
    assert.equal(mtdTotal, summary.total_bg);

    // the anchor day and the previous day with data are present for the daily columns
    const day = overview.daily.filter((row) => row.date === '2026-10-07');
    assert.equal(day.reduce((sum, row) => sum + row.volume, 0), 6);
    assert.equal(overview.meta.previous_fact_date, '2026-10-06');
    assert.ok(overview.daily.some((row) => row.date === '2026-10-06' && row.ma_bcvh === '531120' && row.volume === 3));
  });
});

test('office ranking: accepting offices ranked by rate, large customer not ranked, totals add up', async () => {
  await withStack(async ({ service }) => {
    const result = await service.getOfficeRanking('2026-10-06', '2026-10-06');
    // 06/10: 100001 4 parcels / 3 Đạt, 100002 2 / 1, 200001 2 / 2; 531120 (3 / 3) is not ranked
    assert.deepEqual(
      result.data.map((row) => [row.ma_bcvh, row.ten_bcvh, row.sl_bg_ptc, row.dat_kpi_2026, row.rank]),
      [['200001', 'BĐ Phú Xuân 1', 2, 2, 1], ['100001', 'BĐ Thuận Hóa 1', 4, 3, 2], ['100002', 'BĐ Thuận Hóa 2', 2, 1, 3]],
    );
    assert.deepEqual(result.data.map((row) => row.ma_huyen), ['5340', '5304', '5304']);
    assert.equal(result.meta.total_row.sl_bg_ptc, 8);
    assert.equal(result.meta.total_row.dat_kpi_2026, 6);
    // the unit ranking of the same day is unaffected (offices are a different service state)
    const units = await service.getBcvhRanking('2026-10-06', '2026-10-06');
    assert.deepEqual(units.data.map((row) => row.ma_bcvh), ['5340', '5304']);
  });
});
