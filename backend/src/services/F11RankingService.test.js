'use strict';

// F11-DASHBOARD-RANKING-01 (T1/T2): temp-SQLite tests of the F1.1 read stack (FactF11Repository,
// F11RankingService incl. the reused F4.1/F1.3 logic, the pair table and the controller). Never
// touches the operational database. The real 2026-10-07 figures are checked by
// F11RankingRealBaseline.test.js against the PO's file, not against the live database.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF11Phase1Schema } = require('../../migrate_f11_phase1_schema');
const { applyF11Phase4Schema } = require('../../migrate_f11_phase4_schema');
const { FactF11Repository } = require('../repositories/FactF11Repository');
const { F11NationalRankService } = require('./F11NationalRankService');
const { F11RankingService, resolvePeriod } = require('./F11RankingService');
const { createController } = require('../controllers/F11RankingController');

const NOW = () => new Date('2026-10-09T05:00:00Z');

const TH = ['533140', 'BCVH Thuận Hóa'];
const PL = ['537220', 'BCVH Phú Lộc'];
const KHL = ['531120', 'Khách hàng lớn']; // non-canonical delivering unit

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, (err) => (err ? reject(err) : resolve())));
}

// one fact_f11 row per entry: office = [code, name], unit = [code, name], evaluation = 'Đạt' | 'Không đạt' | null
async function seed(db, date, officeCode, officeName, unit, evaluations) {
    for (let i = 0; i < evaluations.length; i++) {
        await run(db,
            `INSERT INTO fact_f11 (ngay_do_kiem, ma_bg, ma_tinh_chap_nhan, ma_bc_chap_nhan, ten_bc_chap_nhan, ma_bc_phat, ten_bc_phat, danh_gia_2026)
             VALUES (?, ?, '53', ?, ?, ?, ?, ?)`,
            [date, `${date}-${officeCode}-${unit[0]}-${i}`, officeCode, officeName, unit[0], unit[1], evaluations[i]]);
    }
}

async function withStack(fn) {
    const dbPath = path.join(os.tmpdir(), `f11-ranking-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    let db;
    try {
        await applyF11Phase1Schema(dbPath);
        await applyF11Phase4Schema(dbPath);
        db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
        // 2026-10-06 (Tue) and 2026-10-07 (Wed) are the last days of the Thu 10-01 .. Wed 10-07 week;
        // 2026-10-08 (Thu) starts the next one.
        await seed(db, '2026-10-06', '100001', 'BC Alpha', TH, ['Đạt', 'Đạt', 'Đạt', null]);
        await seed(db, '2026-10-06', '100001', 'BC Alpha', PL, ['Đạt', 'Đạt']);
        await seed(db, '2026-10-06', '100002', 'BC Beta', TH, ['Đạt', 'Không đạt']);
        await seed(db, '2026-10-07', '100001', 'BC Alpha', TH, ['Đạt', 'Đạt', 'Không đạt']);
        await seed(db, '2026-10-07', '100001', 'BC Alpha', KHL, ['Đạt']);
        await seed(db, '2026-10-07', '100002', 'BC Beta', PL, [null, null]);
        await seed(db, '2026-10-08', '100001', 'BC Alpha', TH, ['Đạt']);
        const repository = new FactF11Repository(db);
        const service = new F11RankingService({ repository, nationalRankService: new F11NationalRankService(db), now: NOW });
        await fn({ db, repository, service });
    } finally {
        await new Promise((resolve) => (db ? db.close(() => resolve()) : resolve()));
        fs.rmSync(dbPath, { force: true });
    }
}

test('pair table (day): offices x six BCVH + Khác; blank counts as not passed; totals reconcile with the module total', async () => {
    await withStack(async ({ service }) => {
        const table = await service.getPairTable({ period: 'day', anchorDate: '2026-10-07' });
        assert.deepEqual(table.meta, { period: 'day', from_date: '2026-10-07', to_date: '2026-10-07', days_with_data: 1, has_data: true, office_count: 2 });
        assert.equal(table.columns.length, 7);
        assert.deepEqual(table.columns[6], { ma_bcvh: 'OTHER', ten_bcvh: 'Khác' });

        const alpha = table.rows.find((r) => r.ma_chap_nhan === '100001');
        assert.equal(alpha.ten_chap_nhan, 'BC Alpha');
        assert.equal(alpha.cells['533140'].volume, 3);
        assert.equal(alpha.cells['533140'].passed, 2);
        assert.equal(alpha.cells['533140'].failed, 1);
        assert.equal(alpha.cells['533140'].rate, 66.67);
        assert.equal(alpha.cells.OTHER.volume, 1); // 531120 lands in Khác
        assert.equal(alpha.cells['537220'], null); // no parcels = empty cell, not 0 %
        assert.deepEqual({ v: alpha.total.volume, p: alpha.total.passed }, { v: 4, p: 3 });

        const beta = table.rows.find((r) => r.ma_chap_nhan === '100002');
        assert.deepEqual({ v: beta.cells['537220'].volume, p: beta.cells['537220'].passed, b: beta.cells['537220'].blank, r: beta.cells['537220'].rate }, { v: 2, p: 0, b: 2, r: 0 });

        // grand total = module total of the same day
        const summary = await service.getSummary('2026-10-07', '2026-10-07');
        assert.equal(table.total_row.total.volume, summary.total_bg);
        assert.equal(table.total_row.total.passed, summary.total_passed);
        assert.equal(table.total_row.total.failed, summary.total_failed);
        assert.equal(table.total_row.total.rate, summary.passed_rate);
        // and column totals add up to the grand total
        const columnSum = Object.values(table.total_row.cells).reduce((s, c) => s + (c ? c.volume : 0), 0);
        assert.equal(columnSum, table.total_row.total.volume);
        // rows are ordered by volume, biggest first
        assert.deepEqual(table.rows.map((r) => r.ma_chap_nhan), ['100001', '100002']);
    });
});

test('pair table week/month cover the Thursday-Wednesday week and the calendar month and add days up', async () => {
    await withStack(async ({ service }) => {
        const week = await service.getPairTable({ period: 'week', anchorDate: '2026-10-07' });
        assert.equal(week.meta.from_date, '2026-10-01');
        assert.equal(week.meta.to_date, '2026-10-07');
        assert.equal(week.meta.days_with_data, 2);
        assert.equal(week.total_row.total.volume, 4 + 2 + 2 + 3 + 1 + 2); // 10-06 + 10-07 only
        assert.equal(week.total_row.total.passed, 3 + 2 + 1 + 2 + 1 + 0);

        const nextWeek = await service.getPairTable({ period: 'week', anchorDate: '2026-10-08' });
        assert.equal(nextWeek.meta.from_date, '2026-10-08');
        assert.equal(nextWeek.meta.to_date, '2026-10-14');
        assert.equal(nextWeek.total_row.total.volume, 1);

        const month = await service.getPairTable({ period: 'month', anchorDate: '2026-10-20' });
        assert.equal(month.meta.from_date, '2026-10-01');
        assert.equal(month.meta.to_date, '2026-10-31');
        assert.equal(month.total_row.total.volume, week.total_row.total.volume + 1);
        // volume-weighted: the rate comes from the summed counts, not the mean of the day rates
        assert.equal(month.total_row.total.rate, Number(((month.total_row.total.passed / month.total_row.total.volume) * 100).toFixed(2)));
    });
});

test('pair table: empty period, explicit range override and invalid input', async () => {
    await withStack(async ({ service }) => {
        const empty = await service.getPairTable({ period: 'day', anchorDate: '2026-10-15' });
        assert.equal(empty.meta.has_data, false);
        assert.deepEqual(empty.rows, []);
        assert.equal(empty.total_row.total.volume, 0);
        assert.equal(empty.total_row.total.rate, null);

        const range = await service.getPairTable({ fromDate: '2026-10-06', toDate: '2026-10-06' });
        assert.equal(range.meta.period, 'range');
        assert.equal(range.total_row.total.volume, 8);

        await assert.rejects(() => service.getPairTable({}), { code: 'MISSING_PARAM' });
        await assert.rejects(() => service.getPairTable({ period: 'year', anchorDate: '2026-10-07' }), { code: 'MISSING_PARAM' });
        await assert.rejects(() => service.getPairTable({ period: 'day', anchorDate: '2026-13-40' }), { code: 'INVALID_DATE' });
        await assert.rejects(() => service.getPairTable({ fromDate: '2026-10-08', toDate: '2026-10-01' }), { code: 'INVALID_RANGE' });
    });
});

test('resolvePeriod: week boundaries, month ends and leap handling', () => {
    assert.deepEqual(resolvePeriod({ period: 'week', anchorDate: '2026-10-01' }), { period: 'week', from: '2026-10-01', to: '2026-10-07' }); // Thursday
    assert.deepEqual(resolvePeriod({ period: 'week', anchorDate: '2026-10-07' }), { period: 'week', from: '2026-10-01', to: '2026-10-07' }); // Wednesday
    assert.deepEqual(resolvePeriod({ period: 'month', anchorDate: '2026-02-10' }), { period: 'month', from: '2026-02-01', to: '2026-02-28' });
    assert.deepEqual(resolvePeriod({ period: 'month', anchorDate: '2028-02-10' }), { period: 'month', from: '2028-02-01', to: '2028-02-29' });
    assert.deepEqual(resolvePeriod({ period: 'month', anchorDate: '2026-12-31' }), { period: 'month', from: '2026-12-01', to: '2026-12-31' });
});

test('summary is the module KPI over ALL rows (incl. the non-canonical unit); blank is not passed and reported apart', async () => {
    await withStack(async ({ service }) => {
        const summary = await service.getSummary('2026-10-06', '2026-10-07');
        assert.equal(summary.total_bg, 8 + 6);
        assert.equal(summary.total_passed, 6 + 3);
        assert.equal(summary.total_blank, 3); // 1 on 10-06 + 2 on 10-07
        assert.equal(summary.total_failed, summary.total_bg - summary.total_passed);
        assert.equal(summary.passed_rate, Number(((summary.total_passed / summary.total_bg) * 100).toFixed(2)));
    });
});

test('single-day ranking covers the six canonical BCVH only; the six-unit total excludes the non-canonical unit', async () => {
    await withStack(async ({ service }) => {
        const { data, meta } = await service.getBcvhRanking('2026-10-07', '2026-10-07', 1, 20);
        assert.equal(data.length, 2);
        assert.deepEqual(data.map((r) => r.ma_bcvh), ['533140', '537220']);
        assert.equal(data[0].rank, 1);
        assert.equal(data[0].sl_bg_ptc, 3);
        assert.equal(data[0].dat_kpi_2026, 2);
        assert.equal(meta.total_row.sl_bg_ptc, 5);
        const summary = await service.getSummary('2026-10-07', '2026-10-07');
        assert.equal(summary.total_bg - meta.total_row.sl_bg_ptc, 1); // exactly the 531120 parcel
    });
});

test('weeks and months lists, weekly comparison and overview run on F1.1 data', async () => {
    await withStack(async ({ service }) => {
        const weeks = await service.listWeeks();
        assert.ok(weeks.length >= 2);
        const months = await service.listMonths();
        assert.ok(months.length >= 1);
        const overview = await service.getOverview('2026-10-07');
        assert.ok(overview);
    });
});

test('controller: pair-table parameters, 400 on bad input and no-store header', async () => {
    const seen = [];
    const fake = {
        async getPairTable(args) {
            seen.push(args);
            if (args.period === 'bad') { const e = new Error('x'); e.code = 'MISSING_PARAM'; throw e; }
            return { ok: true };
        },
    };
    const controller = createController(fake);
    const makeRes = () => {
        const res = { headers: {}, statusCode: null, body: null };
        res.set = (k, v) => { res.headers[k] = v; return res; };
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (body) => { res.body = body; return res; };
        return res;
    };
    const ok = makeRes();
    await controller.getPairTable({ query: { period: 'week', anchor_date: '2026-10-07' } }, ok);
    assert.equal(ok.statusCode, 200);
    assert.deepEqual(seen[0], { period: 'week', anchorDate: '2026-10-07', fromDate: undefined, toDate: undefined });
    assert.match(ok.headers['Cache-Control'], /no-store/);
    const bad = makeRes();
    await controller.getPairTable({ query: { period: 'bad' } }, bad);
    assert.equal(bad.statusCode, 400);
    const missing = makeRes();
    await controller.getBcvhRanking({ query: {} }, missing);
    assert.equal(missing.statusCode, 400);
});
