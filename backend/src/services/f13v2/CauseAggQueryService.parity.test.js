'use strict';

// F13-GOLIVE-CHECK-01 P2: /why/routes, /why/bcvh and /why/summary read the period in ONE scan at a fine grain and fold the coarser levels from it.
// Parity over a seeded month and a week:
//   1. every figure (counters, distinct, cause mix, hints, time left at arrival, arrival source, basis) equals an independent JS aggregation of the table rows;
//   2. the same data with a parcel repeated inside the period (which takes the distinct-count path and the parcel-pass path) gives the same figures and stories
//      for every route of the other units.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../../migrate_f13_why_agg_01_schema');
const { CauseAggQueryService, lineOf } = require('./CauseAggQueryService');

const CITY = { bcvhId: null, allowedCodes: null, canSeeCity: true };
const UNITS = ['533140', '536250', '535790'];
const HOUR = 3600000;
const MONTH = { month: '2026-10' };
const WEEK = { week: '2026-W42' }; // Thursday-Wednesday: 15..21 Oct

const CAUSES = [
    ['CAUSE', 'KHONG_TRON_LO', null], ['CAUSE', 'KHAI_THAC', null], ['CAUSE', 'VAN_CHUYEN', null], ['CAUSE', 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', null],
    ['CAUSE', 'PHAT', 'CHAM_GIAO_BUU_TA'], ['CAUSE', 'PHAT', 'PHAT_CHAM_SAU_GIAO'], ['CAUSE', 'PHAT', null], ['CHO_CHUYEN_QUAN', null, null], ['CHUA_DU_CAN_CU', null, null],
];
const HINTS = [null, null, 'DAU_HIEU_CHAM_TAI_BCVH', 'DEN_BCVH_CON_IT_GIO', 'DEN_BCVH_CON_IT_GIO,DAU_HIEU_CHAM_TAI_BCVH'];
const REMAINING = [null, -2 * HOUR, 1 * HOUR, 4 * HOUR, 8 * HOUR, 0, 3 * HOUR, 6 * HOUR];

let tmpDir;
const opened = [];

const open = (name) => new Promise((resolve, reject) => { const d = new sqlite3.Database(path.join(tmpDir, name), (e) => (e ? reject(e) : resolve(d))); });
const all = (database, sql, params = []) => new Promise((resolve, reject) => database.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows))));
const run = (database, sql, params = []) => new Promise((resolve, reject) => database.run(sql, params, (e) => (e ? reject(e) : resolve())));
const exec = (database, sql) => new Promise((resolve, reject) => database.exec(sql, (e) => (e ? reject(e) : resolve())));

/** The month of data: 3 units x (3 postman routes + the two other scopes) x 31 days x 6 parcels, deterministic. `withRepeat` adds a parcel measured on two days in unit 999999. */
async function seed(name, { withRepeat }) {
    const database = await open(name);
    opened.push(database);
    await exec(database, `${F13_WHY_AGG_01_SCHEMA_SQL}
        CREATE TABLE fact_f13 (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_do_kiem TEXT, ma_bg TEXT, ma_bcvh TEXT);
        CREATE TABLE fact_f42 (ngay_do_kiem TEXT, ma_bg TEXT, thoi_gian_chuyen_hoan TEXT);
        CREATE TABLE agg_f13_day (ngay_do_kiem TEXT, ma_bcvh TEXT, ma_tuyen TEXT, ten_tuyen TEXT);`);
    await run(database, 'BEGIN');
    let n = 0;
    const insert = (day, bg, bcvh, scope, route, postman, verdict, index) => {
        const cause = verdict === 'Không đạt' ? CAUSES[index % CAUSES.length] : [verdict ? 'KHONG_PHAN_TICH' : 'KHONG_PHAN_TICH', null, null];
        const remaining = verdict === 'Không đạt' ? REMAINING[index % REMAINING.length] : (index % 3 === 0 ? 2 * HOUR : null);
        return run(
            database,
            `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown, danh_gia,
                cause_code, cause_status, cause_detail, cause_step, cause_reason, flags, hints, ma_lo, khong_tron_lo, limit_ms, tct_ms, l_ms, r_ms, remaining_at_arrival_ms, a_source, basis, built_at, classifier_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 3600000, 7200000, 7200000, 0, ?, ?, ?, '2026-11-05T00:00:00.000Z', 'v1')`,
            [day, bg, bcvh, route, scope, postman, postman ? `Tên ${postman}` : null, postman, postman ? `Tên ${postman}` : null, verdict, cause[1], cause[0], cause[2],
                cause[0] === 'CHUA_DU_CAN_CU' ? 'T-A' : null, cause[0] === 'CHO_CHUYEN_QUAN' ? 'CHAM_DEN_HAY_CHAM_GIAO' : null, cause[0] === 'CHUA_DU_CAN_CU' ? 'THIEU_F41' : null,
                HINTS[index % HINTS.length], cause[1] === 'KHONG_TRON_LO' ? `LO${index % 4}` : null, remaining, index % 2 ? 'F41' : (index % 5 === 0 ? 'BF' : null), index % 3 ? 'INTERVAL' : 'MILESTONES'],
        );
    };
    for (let day = 1; day <= 31; day += 1) {
        const date = `2026-10-${String(day).padStart(2, '0')}`;
        for (const unit of UNITS) {
            const layouts = [['POSTMAN', `${unit}01`, 'PA'], ['POSTMAN', `${unit}02`, 'PB'], ['POSTMAN', `${unit}03`, null], ['NON_POSTMAN', `${unit}18`, null], ['OTHER', null, null]];
            for (const [scope, route, postman] of layouts) {
                for (let k = 0; k < 6; k += 1) {
                    n += 1;
                    const verdicts = ['Đạt', 'Đạt', 'Đạt', 'Không đạt', 'Không đạt', null];
                    await insert(date, `BG${String(n).padStart(6, '0')}`, unit, scope, route, postman, verdicts[(k + day) % 6], n);
                    if (n % 7 === 0) await run(database, "INSERT INTO fact_f42 (ngay_do_kiem, ma_bg, thoi_gian_chuyen_hoan) VALUES (?, ?, '2026-10-30 10:00:00')", [date, `BG${String(n).padStart(6, '0')}`]);
                }
            }
        }
    }
    if (withRepeat) {
        await insert('2026-10-16', 'BGREPEAT', '999999', 'POSTMAN', '99999901', 'PZ', 'Đạt', 1);
        await insert('2026-10-17', 'BGREPEAT', '999999', 'POSTMAN', '99999901', 'PZ', 'Không đạt', 2);
    }
    await run(database, "INSERT INTO agg_f13_day (ngay_do_kiem, ma_bcvh, ma_tuyen, ten_tuyen) VALUES ('2026-10-01', '533140', '53314001', 'Tuyến Một')");
    await run(database, 'COMMIT');
    return database;
}

test.before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-why-parity-')); });
test.after(async () => {
    for (const database of opened) await new Promise((resolve) => database.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Independent aggregation of the rows of one group, in plain JS. */
function expectedOf(rows) {
    const failed = rows.filter((row) => row.danh_gia === 'Không đạt');
    const lines = {};
    let cho = 0;
    let chua = 0;
    for (const row of failed) {
        if (row.cause_status === 'CAUSE' && row.cause_code) lines[lineOf(row.cause_code, row.cause_detail)] = (lines[lineOf(row.cause_code, row.cause_detail)] || 0) + 1;
        else if (row.cause_status === 'CHO_CHUYEN_QUAN') cho += 1;
        else if (row.cause_status === 'CHUA_DU_CAN_CU') chua += 1;
    }
    const hints = {};
    for (const row of rows) if (row.hints) for (const hint of row.hints.split(',')) hints[hint] = (hints[hint] || 0) + 1;
    const withArrival = failed.filter((row) => row.remaining_at_arrival_ms !== null);
    return {
        volume: rows.length,
        passed: rows.filter((row) => row.danh_gia === 'Đạt').length,
        failed: failed.length,
        unrated: rows.filter((row) => row.danh_gia === null).length,
        distinct_bg: new Set(rows.map((row) => row.ma_bg)).size,
        lines,
        cho,
        chua,
        hints,
        arrival: {
            with_arrival: withArrival.length,
            over_limit: withArrival.filter((row) => row.remaining_at_arrival_ms < 0).length,
            lt_3h: withArrival.filter((row) => row.remaining_at_arrival_ms >= 0 && row.remaining_at_arrival_ms < 3 * HOUR).length,
            h3_6: withArrival.filter((row) => row.remaining_at_arrival_ms >= 3 * HOUR && row.remaining_at_arrival_ms < 6 * HOUR).length,
            ge_6h: withArrival.filter((row) => row.remaining_at_arrival_ms >= 6 * HOUR).length,
        },
        source: { F41: failed.filter((row) => row.a_source === 'F41').length, BF: failed.filter((row) => row.a_source === 'BF').length },
        basis: { INTERVAL: failed.filter((row) => row.basis === 'INTERVAL').length, MILESTONES: failed.filter((row) => row.basis === 'MILESTONES').length },
    };
}

function actualOf(row) {
    const lines = Object.fromEntries(row.cause_mix.lines.filter((line) => line.count > 0).map((line) => [line.code, line.count]));
    return {
        volume: row.volume, passed: row.passed, failed: row.failed, unrated: row.unrated, distinct_bg: row.distinct_bg,
        lines, cho: row.cause_mix.cho_chuyen_quan.count, chua: row.cause_mix.chua_du_can_cu.count, hints: row.hints,
        arrival: { with_arrival: row.arrival_remaining.with_arrival, over_limit: row.arrival_remaining.over_limit, lt_3h: row.arrival_remaining.lt_3h, h3_6: row.arrival_remaining.h3_6, ge_6h: row.arrival_remaining.ge_6h },
        source: { F41: row.arrival_source.F41, BF: row.arrival_source.BF },
        basis: row.basis,
    };
}

for (const [label, period, from, to] of [['month', MONTH, '2026-10-01', '2026-10-31'], ['week', WEEK, '2026-10-15', '2026-10-21']]) {
    test(`/why/routes, /why/bcvh and /why/summary over a ${label} equal an independent aggregation of the table`, async () => {
        const database = await seed(`parity-${label}.sqlite`, { withRepeat: false });
        const service = new CauseAggQueryService({ db: database, classifierVersion: 'v1' });
        const rows = await all(database, 'SELECT * FROM f13_cause_parcel WHERE ngay_do_kiem BETWEEN ? AND ?', [from, to]);
        const routeKey = (row) => `${row.ma_bcvh}|${row.route_scope === 'POSTMAN' ? row.ma_tuyen : `@${row.route_scope}`}`;

        const routes = await service.routes(period, CITY);
        assert.equal(routes.rows.length, UNITS.length * 5);
        for (const row of routes.rows) {
            assert.deepEqual(actualOf(row), expectedOf(rows.filter((r) => routeKey(r) === row.key)), `route ${row.key}`);
        }
        const bcvh = await service.bcvh(period, CITY);
        assert.equal(bcvh.rows.length, UNITS.length);
        for (const row of bcvh.rows) assert.deepEqual(actualOf(row), expectedOf(rows.filter((r) => r.ma_bcvh === row.ma_bcvh)), `bcvh ${row.ma_bcvh}`);
        assert.deepEqual(actualOf(bcvh.total), expectedOf(rows), 'the whole-city total folds from the BCVH rows');
        const summary = await service.summary(period, CITY);
        assert.deepEqual(actualOf(summary.totals), expectedOf(rows));
        // the parent of a route row is its BCVH (folded from the same scan)
        for (const unit of UNITS) assert.deepEqual(actualOf(routes.parents[unit]), expectedOf(rows.filter((r) => r.ma_bcvh === unit)));
        const postmen = await service.postmen(period, CITY);
        assert.ok(postmen.rows.length >= UNITS.length * 3);
        assert.equal(postmen.rows.reduce((sum, row) => sum + row.volume, 0), rows.length);
        assert.equal(postmen.rows.find((row) => row.ma_buu_ta === 'PA' && row.ma_bcvh === UNITS[0]).ten_buu_ta, 'Tên PA');
    });

    test(`a parcel repeated inside a ${label} takes the exact distinct path: figures and stories of the other units do not change`, async () => {
        const plain = new CauseAggQueryService({ db: await seed(`plain-${label}.sqlite`, { withRepeat: false }), classifierVersion: 'v1' });
        const repeated = new CauseAggQueryService({ db: await seed(`repeat-${label}.sqlite`, { withRepeat: true }), classifierVersion: 'v1' });
        const a = await plain.routes(period, CITY);
        const b = await repeated.routes(period, CITY);
        const ofUnits = (result) => result.rows.filter((row) => UNITS.includes(row.ma_bcvh));
        assert.deepEqual(ofUnits(b), ofUnits(a), 'routes (figures and stories)');
        const repeatedRow = b.rows.find((row) => row.ma_bcvh === '999999');
        assert.equal(repeatedRow.volume, label === 'month' || label === 'week' ? 2 : 0);
        assert.equal(repeatedRow.distinct_bg, 1);
        assert.equal(repeatedRow.repeat, 1);
        const bcvhA = await plain.bcvh(period, CITY);
        const bcvhB = await repeated.bcvh(period, CITY);
        const withoutShares = (list) => list.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith('share_')))); // the shares move with the extra unit
        assert.deepEqual(withoutShares(bcvhB.rows.filter((row) => UNITS.includes(row.ma_bcvh))), withoutShares(bcvhA.rows));
        const total = bcvhB.total;
        assert.equal(total.volume, bcvhA.total.volume + 2);
        assert.equal(total.distinct_bg, bcvhA.total.distinct_bg + 1, 'the whole-city distinct count is exact, not a sum of the BCVH counts');
        for (const unit of UNITS) assert.deepEqual(b.parents[unit], a.parents[unit]);
    });
}
