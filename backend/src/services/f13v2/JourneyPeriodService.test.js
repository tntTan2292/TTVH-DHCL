'use strict';

// F13-JOURNEY-ROUTE-02 B1 + B2 + B4 (one row per BCVH + route + postman): the journey over a period, read from the table f13_cause_parcel. Invoke with: node --experimental-sqlite --test JourneyPeriodService.test.js
// The fixture is small enough to be added up by hand (see the comments); the table is filled from JourneyService items through the builder's toRow, and
// the cause layer is the REAL CauseAggQueryService over the same temporary SQLite file, so "equal to /why" compares the two public paths.
//   OWN 536250, route R1 53625001: D1 28/10: P1 Đạt (T 07:00 A 08:00 G 09:00 E 10:00, BT1), P2 Đạt (A 09:00 G 10:00 E 11:00, BT1), F1 Không đạt (A 14:00 G 15:00 E 16:00, limit 5 h, BT2)
//                                  D2 29/10: F2 Không đạt (A 08:00 G 15:00 E 16:00, BT1)
//     BT1: 3 parcels, 2 Đạt, 1 KĐ; passed legs tms_arrive median(1, 2) = 1.5, arrive_gbt 1, gbt_ptc 1; failed (F2) tms_arrive 1, arrive_gbt 7, gbt_ptc 1
//          gaps -0.5 / 6 / 0 -> slowest_leg arrive_gbt; shortfall_x10 = 9*3 - 10*2 = 7 -> own_shortfall 0.7
//     BT2: 1 parcel, KĐ: 9*1 - 0 = 9 -> 0.9, no passed parcel -> no slowest leg;  route R1: 4 parcels, 2 Đạt -> route_rate 50
//   OWN route R2 53625002: Z1 Đạt on D1 with no handover (no postman) -> a row with ma_buu_ta null
//   OTHER 533140: R 53314001 (1 Đạt), 53314018 customer pickup (NON_POSTMAN, 1 Đạt + 1 Không đạt), 99999 (OTHER scope, 1 Đạt)

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../../migrate_f13_why_agg_01_schema');
const { weekIdFromDate } = require('../bcvhWeeklyComparisonService');
const { CauseAggQueryService, metricsOf } = require('./CauseAggQueryService');
const { JourneyService } = require('./JourneyService');
const { toRow, ROW_COLUMNS } = require('./CauseAggBuilder');
const { JourneyPeriodService, resolveJourneyPeriod, mainCauseOf, slowestLegOf, MAX_DAYS } = require('./JourneyPeriodService');

const OWN = '536250';
const OTHER = '533140';
const D1 = '2026-10-28';
const D2 = '2026-10-29';
const R1 = '53625001';
const NP = '53314018';
const CITY = { bcvhId: null, allowedCodes: null };

const dmy = (day, time) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)} ${time}:00`;
const iso = (day, time) => `${day} ${time}:00`;

const rows = { parcels: [], f41: [], f42: [] };
function parcel(day, bg, { bcvh = OWN, route = R1, passed = true, t = '07:00', a, g, e, limit = '5', tct = '9:00', postman = 'BT1', teBcvh = 'BCVH' } = {}) {
    rows.parcels.push({
        ngay_do_kiem: day, ma_bg: bg, ma_bcvh: bcvh, ten_bcvh: teBcvh, ma_tuyen: route, ten_tuyen: `Tuyến ${route}`, danh_gia_2026: passed ? 'Đạt' : 'Không đạt',
        thoi_gian_bd10_quet_tms: dmy(day, t), thoi_gian_ptc: dmy(day, e), thoi_gian_thuc_hien_thuc_te_gio: tct, thoi_gian_chi_tieu: limit,
    });
    if (a) rows.f41.push({ ma_bg: bg, ngay_do_kiem: day, ma_bc_phat: bcvh, so_hieu_bd10_xnd_bcp: `BAG-${bg}`, thoi_gian_xnd_bd1: dmy(day, a) });
    if (g) rows.f42.push({ ma_bg: bg, ngay_do_kiem: day, ma_buu_ta: postman, ten_buu_ta: `Tên ${postman}`, thoi_gian_gbt: iso(day, g), thoi_gian_ptc: null });
}

parcel(D1, 'P1', { a: '08:00', g: '09:00', e: '10:00', tct: '3:00', postman: 'BT1' });
parcel(D1, 'P2', { a: '09:00', g: '10:00', e: '11:00', tct: '4:00', postman: 'BT1' });
parcel(D1, 'F1', { passed: false, a: '14:00', g: '15:00', e: '16:00', postman: 'BT2' });
parcel(D2, 'F2', { passed: false, a: '08:00', g: '15:00', e: '16:00', postman: 'BT1' });
parcel(D1, 'Z1', { route: '53625002', a: '08:30', e: '10:30', tct: '4:00' }); // no handover: no postman
parcel(D1, 'O1', { bcvh: OTHER, route: '53314001', a: '08:00', g: '09:00', e: '10:00', tct: '3:00', postman: 'BX' });
parcel(D1, 'N1', { bcvh: OTHER, route: NP, a: '08:00', g: '09:00', e: '10:00', tct: '3:00', postman: 'BX' });
parcel(D1, 'N2', { bcvh: OTHER, route: NP, passed: false, a: '14:00', g: '15:00', e: '16:00', postman: 'BX' });
parcel(D1, 'X1', { bcvh: OTHER, route: '99999', a: '08:00', g: '09:00', e: '10:00', tct: '3:00', postman: 'BX' });

const repository = {
    getF13Parcels: async (date) => rows.parcels.filter((row) => row.ngay_do_kiem === date),
    getF41Arrivals: async (from, to) => rows.f41.filter((row) => row.ngay_do_kiem >= from && row.ngay_do_kiem <= to),
    getF42Handovers: async (from, to) => rows.f42.filter((row) => row.ngay_do_kiem >= from && row.ngay_do_kiem <= to),
    getF11Departures: async () => [],
    getBfLots: async () => [],
    getF13LotScans: async () => rows.parcels.map((row) => ({ ma_bg: row.ma_bg, ma_bcvh: row.ma_bcvh, danh_gia_2026: row.danh_gia_2026, thoi_gian_bd10_quet_tms: row.thoi_gian_bd10_quet_tms })),
};

let tmpDir;
let database;
let causeAgg;
let service;
const run = (sql, params = []) => new Promise((resolve, reject) => database.run(sql, params, (e) => (e ? reject(e) : resolve())));
const exec = (sql) => new Promise((resolve, reject) => database.exec(sql, (e) => (e ? reject(e) : resolve())));

test.before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-journey-period-'));
    database = await new Promise((resolve, reject) => { const d = new sqlite3.Database(path.join(tmpDir, 'j.sqlite'), (e) => (e ? reject(e) : resolve(d))); });
    await exec(`${F13_WHY_AGG_01_SCHEMA_SQL}
        CREATE TABLE fact_f13 (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_do_kiem TEXT, ma_bg TEXT, ma_bcvh TEXT);
        CREATE TABLE agg_f13_day (ngay_do_kiem TEXT, ma_bcvh TEXT, ma_tuyen TEXT, ten_tuyen TEXT);`);
    // the cause table, filled from the journey items through the builder's own row mapping (so the stored legs are the legs JourneyService computes)
    const inner = new JourneyService({ repository });
    for (const day of [D1, D2]) {
        for (const item of await inner._parcels(day, {})) {
            const row = toRow(day, item, '2026-11-05T00:00:00.000Z', 'v1');
            await run(`INSERT INTO f13_cause_parcel (${ROW_COLUMNS.join(', ')}) VALUES (${ROW_COLUMNS.map(() => '?').join(', ')})`, ROW_COLUMNS.map((column) => row[column]));
        }
    }
    // a day built before the leg columns existed: rows, no legs
    await run(`INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, danh_gia, cause_status, built_at, classifier_version)
               VALUES ('2026-10-30', 'OLD1', '${OWN}', '${R1}', 'POSTMAN', 'Đạt', 'KHONG_PHAN_TICH', 'x', 'v1')`);
    causeAgg = new CauseAggQueryService({ db: database, classifierVersion: 'v1' });
    service = new JourneyPeriodService({ db: database, causeAgg });
});

test.after(async () => {
    await new Promise((resolve) => database.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

const routeOf = (data, bcvh, key, postman) => data.routes.find((r) => r.ma_bcvh === bcvh && (r.ma_tuyen === key || r.filter.route === key) && (postman === undefined || r.filter.postman === postman));
const sum = (list, field) => list.reduce((total, item) => total + item[field], 0);
// the cause mixes of several rows added up line by line (the shape of causeMixOf)
function addMixes(mixes) {
    const lines = new Map();
    const out = { failed: 0, cho: 0, chua: 0, unclassified: 0, phat: 0 };
    for (const mix of mixes) {
        out.failed += mix.failed;
        out.cho += mix.cho_chuyen_quan.count;
        out.chua += mix.chua_du_can_cu.count;
        out.unclassified += mix.unclassified;
        out.phat += mix.phat.count;
        for (const line of mix.lines) lines.set(line.code, (lines.get(line.code) || 0) + line.count);
    }
    return { ...out, lines: Object.fromEntries([...lines].sort()) };
}

test('period resolution: date keeps working, from+to / week / month like the other endpoints, one selector only, guards', () => {
    assert.deepEqual(resolveJourneyPeriod({ date: D1 }), { kind: 'day', from: D1, to: D1, days: 1 });
    assert.deepEqual(resolveJourneyPeriod({ from: D1, to: D2 }), { kind: 'range', from: D1, to: D2, days: 2 });
    const week = resolveJourneyPeriod({ week: weekIdFromDate(D1).weekId });
    assert.equal(week.kind, 'week');
    assert.equal(week.days, 7);
    assert.deepEqual(resolveJourneyPeriod({ month: '2026-10' }), { kind: 'month', from: '2026-10-01', to: '2026-10-31', month_id: '2026-10', days: 31 });
    for (const [query, code] of [
        [{}, 'MISSING_PARAM'], [{ date: '2026-13-40' }, 'INVALID_DATE'], [{ from: D1 }, 'MISSING_PARAM'], [{ from: D2, to: D1 }, 'INVALID_RANGE'],
        [{ date: D1, from: D1, to: D2 }, 'MISSING_PARAM'], [{ from: D1, to: D2, month: '2026-10' }, 'MISSING_PARAM'], [{ month: '2026-99' }, 'INVALID_MONTH_ID'],
        [{ week: 'nope' }, 'INVALID_WEEK_ID'], [{ from: '2026-01-01', to: '2026-12-31' }, 'RANGE_TOO_LONG'],
    ]) assert.throws(() => resolveJourneyPeriod(query), { code }, JSON.stringify(query));
    assert.equal(MAX_DAYS, 93);
});

test('one day (date=): the postman rows add up to the JourneyService route (volume, Đạt, Không đạt), each postman has the volume JourneyService gave, coverage and lots equal', async () => {
    const old = await new JourneyService({ repository }).getRoutes(D1, {});
    const neu = await service.getRoutes({ date: D1 }, {});
    assert.deepEqual(neu.meta.coverage, old.meta.coverage);
    assert.deepEqual(neu.meta.lots, { ...old.meta.lots, khong_tron_lo_lots: old.meta.lots.khong_tron_lo_lots });
    assert.equal(neu.meta.date, D1);
    for (const row of old.routes) {
        const key = row.ma_tuyen === NP ? '@NON_POSTMAN' : row.ma_tuyen === '99999' ? '@OTHER' : row.ma_tuyen;
        const mine = neu.routes.filter((r) => r.ma_bcvh === row.ma_bcvh && r.filter.route === key);
        assert.ok(mine.length > 0, row.ma_tuyen);
        assert.deepEqual([sum(mine, 'volume'), sum(mine, 'passed'), mine.every((r) => r.route_volume === row.volume)], [row.volume, row.passed, true]);
        for (const postman of row.postmen) {
            const mineRow = mine.find((r) => r.ma_buu_ta === postman.ma_buu_ta);
            assert.equal(mineRow.volume, postman.volume, `${row.ma_tuyen} ${postman.ma_buu_ta}`);
            assert.equal(mineRow.ten_buu_ta, postman.ten_buu_ta);
        }
    }
});

test('a period: one row per postman with its own figures, failed and passed medians side by side, slowest leg, own_shortfall, route totals', async () => {
    const data = await service.getRoutes({ from: D1, to: D2 }, CITY);
    const bt1 = routeOf(data, OWN, R1, 'BT1');
    const bt2 = routeOf(data, OWN, R1, 'BT2');
    assert.deepEqual([bt1.ma_buu_ta, bt1.ten_buu_ta, bt1.volume, bt1.passed, bt1.failed, bt1.rate], ['BT1', 'Tên BT1', 3, 2, 1, 66.7]);
    assert.deepEqual([bt1.route_volume, bt1.route_rate, bt2.route_volume, bt2.route_rate], [4, 50, 4, 50]);
    assert.deepEqual([bt1.legs_passed.tms_arrive, bt1.legs_passed.arrive_gbt, bt1.legs_passed.gbt_ptc], [1.5, 1, 1]);
    assert.deepEqual([bt1.legs_failed.tms_arrive, bt1.legs_failed.arrive_gbt, bt1.legs_failed.gbt_ptc], [1, 7, 1]);
    assert.equal(bt1.slowest_leg, 'arrive_gbt');
    assert.deepEqual([bt1.own_shortfall, bt1.own_shortfall_x10], [0.7, 7]);
    assert.deepEqual([bt2.volume, bt2.passed, bt2.failed, bt2.rate, bt2.own_shortfall], [1, 0, 1, 0, 0.9]);
    assert.equal(bt2.slowest_leg, null); // no passed parcel to compare with
    assert.deepEqual(bt1.filter, { route: R1, postman: 'BT1', ma_bcvh: OWN });
    assert.deepEqual(bt1.postmen, [{ ma_buu_ta: 'BT1', ten_buu_ta: 'Tên BT1', volume: 3 }]);
    assert.ok(bt1.legs.tms_ptc !== undefined, '`legs` (all parcels of the row) is kept for compatibility');
    // the parcels without a postman are a row of their own
    const none = routeOf(data, OWN, '53625002', '@NONE');
    assert.deepEqual([none.ma_buu_ta, none.ten_buu_ta, none.volume, none.route_volume, none.postmen], [null, null, 1, 1, []]);
    assert.equal(data.meta.period.kind, 'range');
    assert.equal(data.meta.date, null);
    assert.equal(data.meta.coverage.parcels, 9);
});

test('route_scope groups: customer pickup and unidentified routes are one group each per BCVH, with their labels, after the postman routes', async () => {
    const data = await service.getRoutes({ from: D1, to: D2 }, CITY);
    const other = data.routes.filter((r) => r.ma_bcvh === OTHER);
    assert.deepEqual(other.map((r) => r.route_scope), ['POSTMAN', 'NON_POSTMAN', 'OTHER']);
    const np = other[1];
    assert.deepEqual([np.key, np.route_key, np.ma_tuyen, np.ten_tuyen, np.filter.route, np.filter.postman, np.volume, np.failed], [`${OTHER}|@NON_POSTMAN|BX`, `${OTHER}|@NON_POSTMAN`, null, 'Phát tại quầy (khách đến nhận)', '@NON_POSTMAN', 'BX', 2, 1]);
    assert.deepEqual([other[2].key, other[2].ten_tuyen], [`${OTHER}|@OTHER|BX`, 'Tuyến chưa xác định']);
    assert.equal(np.own_shortfall, 0.8); // 9*2 - 10*1 = 8 tenths
});

test('for every route the postman rows add up to the /why route row: volume, Đạt, Không đạt, cause mix; own shortfall from the summed counters', async () => {
    const data = await service.getRoutes({ from: D1, to: D2 }, CITY);
    const why = await causeAgg.routes({ from: D1, to: D2 }, CITY);
    const routeKeys = new Set(data.routes.map((r) => r.route_key));
    assert.equal(routeKeys.size, why.rows.length);
    for (const same of why.rows) {
        const rows = data.routes.filter((r) => r.route_key === same.key);
        assert.ok(rows.length > 0, same.key);
        assert.deepEqual([sum(rows, 'volume'), sum(rows, 'passed'), sum(rows, 'failed')], [same.volume, same.passed, same.failed], same.key);
        assert.deepEqual(addMixes(rows.map((r) => r.cause_mix)), addMixes([same.cause_mix]), same.key);
        assert.ok(rows.every((r) => r.route_volume === same.volume), same.key);
        // the route's own shortfall from the summed counters equals the /why one
        const routeMetrics = metricsOf({ n: sum(rows, 'volume'), passed: sum(rows, 'passed'), failed: sum(rows, 'failed'), unrated: 0, distinct: 0 });
        assert.equal(routeMetrics.own_shortfall_x10, same.own_shortfall_x10, same.key);
    }
    // each row's mix covers its own failed parcels only
    for (const row of data.routes) assert.equal(row.cause_mix.failed, row.failed, row.key);
    assert.equal(data.meta.cause_layer.available, true);
    assert.equal(data.meta.cause_layer.volume_mismatch_routes, 0);
    assert.ok(data.meta.cause_layer.freshness);
});

test('main cause: read from the cause mix like the Phân tích nguyên nhân screen; none when no failed parcel', async () => {
    const data = await service.getRoutes({ from: D1, to: D2 }, CITY);
    // BT1's only failed parcel is F2 (Phát / Chậm giao bưu tá); BT2's is F1 (Khai thác - Vận chuyển chưa phân biệt): each row reads its own parcels
    assert.deepEqual([routeOf(data, OWN, R1, 'BT1').main_cause.code, routeOf(data, OWN, R1, 'BT1').main_cause.count], ['PHAT', 1]);
    assert.deepEqual([routeOf(data, OWN, R1, 'BT2').main_cause.code, routeOf(data, OWN, R1, 'BT2').main_cause.count], ['KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', 1]);
    assert.equal(routeOf(data, OTHER, '53314001').main_cause, null);
    const mix = (lines, extra = {}) => ({ lines: lines.map(([code, count]) => ({ code, label: code, count, share: count / 10 })), phat: { count: 0, share: 0, by_detail: {} }, cho_chuyen_quan: { count: 0 }, ...extra });
    assert.equal(mainCauseOf(null, 3), null);
    assert.equal(mainCauseOf(mix([['KHAI_THAC', 0]]), 0), null);
    assert.equal(mainCauseOf(mix([['KHONG_TRON_LO', 4], ['KHAI_THAC', 2]], { phat: { count: 3, share: 0.3, by_detail: {} } }), 9).code, 'KHONG_TRON_LO');
    assert.equal(mainCauseOf(mix([['VAN_CHUYEN', 5], ['KHAI_THAC', 2]], { phat: { count: 3, share: 0.3, by_detail: {} } }), 10).code, 'VAN_CHUYEN');
    assert.equal(mainCauseOf(mix([['KHAI_THAC', 0]], { cho_chuyen_quan: { count: 2, share: 1, by_reason: { THIEU_MOC_G: 2 } } }), 2).code, 'CHO_CHUYEN_QUAN');
});

test('slowest_leg: the largest POSITIVE failed - passed gap among the three stages; null otherwise', () => {
    assert.equal(slowestLegOf({ tms_arrive: 5, arrive_gbt: 1, gbt_ptc: 2 }, { tms_arrive: 1, arrive_gbt: 1, gbt_ptc: 1 }), 'tms_arrive');
    assert.equal(slowestLegOf({ tms_arrive: null, arrive_gbt: 2, gbt_ptc: 9 }, { tms_arrive: 1, arrive_gbt: 1, gbt_ptc: null }), 'arrive_gbt');
    assert.equal(slowestLegOf({ tms_arrive: null, arrive_gbt: null, gbt_ptc: null }, { tms_arrive: 1, arrive_gbt: 1, gbt_ptc: 1 }), null);
    assert.equal(slowestLegOf({ tms_arrive: 1, arrive_gbt: 1, gbt_ptc: 1 }, { tms_arrive: null, arrive_gbt: null, gbt_ptc: null }), null);
});

test('scope: a BCVH account gets its own unit only, in the routes, the parcels and the cause layer', async () => {
    const scope = { bcvhId: OWN, allowedCodes: [OWN] };
    const routes = await service.getRoutes({ from: D1, to: D2 }, scope);
    assert.ok(routes.routes.length > 0);
    assert.ok(routes.routes.every((r) => r.ma_bcvh === OWN));
    assert.equal(routes.meta.coverage.parcels, 5);
    assert.equal(JSON.stringify(routes).includes(OTHER), false);
    const parcels = await service.getParcels({ from: D1, to: D2 }, scope);
    assert.equal(parcels.meta.total, 5);
    assert.equal(JSON.stringify(parcels).includes(OTHER), false);
    const asked = await service.getRoutes({ from: D1, to: D2 }, { bcvhId: OTHER, allowedCodes: [OWN] }); // the controller refuses this earlier (403); the service itself leaks nothing
    assert.deepEqual(asked.routes, []);
});

test('parcels over a period: day on each parcel, route and route_scope filters, order by day, pages', async () => {
    const all = await service.getParcels({ from: D1, to: D2 }, { ...CITY, sort: 'ngay_do_kiem', order: 'asc', pageSize: 3 });
    assert.equal(all.meta.total, 9);
    assert.equal(all.meta.total_pages, 3);
    assert.equal(all.parcels.length, 3);
    assert.ok(all.parcels.every((p) => p.ngay_do_kiem === D1));
    const own = await service.getParcels({ from: D1, to: D2 }, { ...CITY, route: R1, sort: 'ngay_do_kiem', order: 'desc' });
    assert.equal(own.meta.total, 4);
    assert.equal(own.parcels[0].ma_bg, 'F2');
    assert.equal(own.parcels[0].ngay_do_kiem, D2);
    assert.ok(own.parcels.every((p) => p.route_scope === 'POSTMAN'));
    const pickup = await service.getParcels({ from: D1, to: D2 }, { ...CITY, route: '@NON_POSTMAN' });
    assert.deepEqual(pickup.parcels.map((p) => p.ma_bg).sort(), ['N1', 'N2']);
    const failedOnly = await service.getParcels({ month: '2026-10' }, { ...CITY, search: 'f' });
    assert.deepEqual(failedOnly.parcels.map((p) => p.ma_bg).sort(), ['F1', 'F2']);
    await assert.rejects(service.getParcels({ from: D1, to: D2 }, { ...CITY, route: '@NOPE' }), { code: 'INVALID_FILTER' });
    // the postman filter: a code, or @NONE for the parcels without one; with a route it is that postman on that route
    assert.deepEqual((await service.getParcels({ from: D1, to: D2 }, { ...CITY, route: R1, postman: 'BT2' })).parcels.map((p) => p.ma_bg), ['F1']);
    assert.deepEqual((await service.getParcels({ from: D1, to: D2 }, { ...CITY, route: R1, postman: 'BT1' })).parcels.map((p) => p.ma_bg).sort(), ['F2', 'P1', 'P2']);
    assert.deepEqual((await service.getParcels({ from: D1, to: D2 }, { ...CITY, route: '53625002', postman: '@NONE' })).parcels.map((p) => p.ma_bg), ['Z1']);
    assert.equal((await service.getParcels({ from: D1, to: D2 }, { ...CITY, route: R1, postman: '@NONE' })).meta.total, 0);
    assert.equal((await service.getParcels({ from: D1, to: D2 }, { ...CITY, postman: 'BT1' })).meta.total, 3);
    const day = await service.getParcels({ date: D1 }, { ...CITY, route: R1 });
    assert.equal(day.meta.date, D1);
    assert.equal(day.meta.total, 3);
});

test('without a cause layer (or when it fails) the cause fields are empty and the hours still show', async () => {
    const bare = await new JourneyPeriodService({ db: database }).getRoutes({ from: D1, to: D2 }, CITY);
    const r1 = routeOf(bare, OWN, R1, 'BT1');
    // the row's own mix comes from the stored cause columns, so it exists even without the /why layer; only the route name and freshness need it
    assert.deepEqual([r1.main_cause.code, r1.ten_tuyen, bare.meta.cause_layer.available], ['PHAT', null, false]);
    assert.equal(r1.slowest_leg, 'arrive_gbt');
    const broken = await new JourneyPeriodService({ db: database, causeAgg: { routes: async () => { throw new Error('no table'); } } }).getRoutes({ date: D1 }, CITY);
    assert.equal(broken.meta.cause_layer.available, false);
    assert.equal(broken.routes.length > 0, true);
});

test('J-R2: only a positive gap names a leg', () => {
    assert.equal(slowestLegOf({ tms_arrive: 1, arrive_gbt: 1, gbt_ptc: 1 }, { tms_arrive: 1, arrive_gbt: 2, gbt_ptc: 1 }), null);
    assert.equal(slowestLegOf({ tms_arrive: 0.5, arrive_gbt: 1, gbt_ptc: 3 }, { tms_arrive: 1, arrive_gbt: 1.5, gbt_ptc: 2 }), 'gbt_ptc');
});

test('the builder row keeps the six legs of JourneyService in ms (null stays null) and the service gives them back as hours', async () => {
    const [f1] = (await new JourneyService({ repository }).getParcels(D1, { route: R1, search: 'F1' })).parcels;
    const row = toRow(D1, f1, 'x', 'v');
    assert.deepEqual([row.leg_tms_arrive_ms, row.leg_arrive_gbt_ms, row.leg_gbt_ptc_ms, row.leg_tms_ptc_ms], [7 * 3600000, 3600000, 3600000, 9 * 3600000]);
    assert.equal(row.leg_tms_depart_ms, null); // no F1.1 departure in the fixture
    assert.equal(row.leg_depart_arrive_ms, null);
    const own = await service.getParcels({ date: D1 }, { ...CITY, search: 'F1' });
    assert.deepEqual(own.parcels[0].legs, f1.legs);
});

test('days built before the leg columns are listed (meta.legs.days_without_legs); their rows still count in the figures', async () => {
    const data = await service.getRoutes({ from: D1, to: '2026-10-30' }, CITY);
    assert.deepEqual(data.meta.legs, { source: 'TABLE', days_without_legs: ['2026-10-30'], days_without_milestones: ['2026-10-30'] });
    assert.equal(routeOf(data, OWN, R1, '@NONE').volume, 1); // OLD1: a row without a postman, still counted
    assert.equal(routeOf(data, OWN, R1).route_volume, 5);
    assert.equal((await service.getRoutes({ from: D1, to: D2 }, CITY)).meta.legs.days_without_legs.length, 0);
});

test('parcels: order by a leg puts parcels without it last in both directions; an unknown order field falls back to the total hours', async () => {
    const desc = await service.getParcels({ from: D1, to: '2026-10-30' }, { ...CITY, route: R1, sort: 'arrive_gbt', order: 'desc' });
    assert.equal(desc.parcels[0].ma_bg, 'F2'); // arrive_gbt 7 h
    assert.equal(desc.parcels[desc.parcels.length - 1].ma_bg, 'OLD1');
    const asc = await service.getParcels({ from: D1, to: '2026-10-30' }, { ...CITY, route: R1, sort: 'arrive_gbt', order: 'asc' });
    assert.equal(asc.parcels[asc.parcels.length - 1].ma_bg, 'OLD1');
    assert.equal(asc.parcels[0].legs.arrive_gbt, 1);
    assert.equal((await service.getParcels({ from: D1, to: D2 }, { ...CITY, route: R1, sort: 'tms' })).meta.total, 4);
});

test('B3: the parcel list gives back the milestones exactly as JourneyService.getParcels did (string format, source), and the coverage counts real milestones', async () => {
    const inner = new JourneyService({ repository });
    for (const day of [D1, D2]) {
        const old = (await inner.getParcels(day, { pageSize: 200 })).parcels;
        const neu = (await service.getParcels({ date: day }, { ...CITY, pageSize: 200 })).parcels;
        assert.equal(neu.length, old.length);
        const byBg = new Map(neu.map((p) => [p.ma_bg, p]));
        for (const o of old) {
            const n = byBg.get(o.ma_bg);
            assert.deepEqual(n.milestones, o.milestones, o.ma_bg);
            assert.deepEqual(n.legs, o.legs, o.ma_bg);
            assert.deepEqual([n.ma_buu_ta, n.ten_buu_ta, n.danh_gia, n.cause_status], [o.ma_buu_ta, o.ten_buu_ta, o.danh_gia, o.cause_status], o.ma_bg);
        }
    }
    const old = await inner.getRoutes(D1, {});
    assert.deepEqual((await service.getRoutes({ date: D1 }, CITY)).meta.coverage, old.meta.coverage);
    const f1 = (await service.getParcels({ date: D1 }, { ...CITY, search: 'F1' })).parcels[0];
    assert.equal(f1.milestones.tms, '2026-10-28 07:00:00');
    assert.equal(f1.milestones.arrive, '2026-10-28 14:00:00');
    assert.equal(f1.milestones.gbt_first, '2026-10-28 15:00:00');
    assert.equal(f1.milestones.depart, null);
});

test('B3: a milestone of an old built day is missing (null, counted nowhere) and the day is listed; order by a milestone works with nulls last', async () => {
    const data = await service.getRoutes({ from: D1, to: '2026-10-30' }, CITY);
    assert.deepEqual(data.meta.legs.days_without_milestones, ['2026-10-30']);
    assert.equal(data.meta.coverage.parcels, 10);
    assert.equal(data.meta.coverage.tms, 9);
    const asc = await service.getParcels({ from: D1, to: '2026-10-30' }, { ...CITY, route: R1, sort: 'tms', order: 'asc' });
    assert.equal(asc.parcels[asc.parcels.length - 1].ma_bg, 'OLD1');
    assert.equal(asc.parcels[asc.parcels.length - 1].milestones.tms, null);
});
