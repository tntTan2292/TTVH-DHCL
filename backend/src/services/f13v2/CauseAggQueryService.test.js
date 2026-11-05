'use strict';

// F13-WHY-AGG-01 Phase 2: the query layer over f13_cause_parcel. Every test uses its own temporary SQLite file.
// The fixture is small enough to be added up by hand; the expected numbers below are derived from it on paper (comments), not from the code.
//   Thuận Hóa (A) 22/10: R1 25 rows, R2 24, NP 4 (confirmed non-postman), OT 1 (no route) = 54 rows, 39 Đạt, 10 KĐ, 5 unrated -> shortfall_x10 = 9*54 - 10*39 = 96
//   Thuận Hóa 23/10: 6 rows, 2 Đạt, 4 KĐ -> 9*6 - 20 = 34;  period 22-23/10: 60 rows, 41 Đạt, 14 KĐ, 5 unrated -> 130 (= 96 + 34)
//   Hương Thủy (B) 22/10: 12 rows, 6 Đạt, 6 KĐ -> 48;  A Lưới (C) 22/10: 10 rows, 10 Đạt -> 90 - 100 = -10;  city 22-23/10: 82 / 57 / 20 -> 168

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../../migrate_f13_why_agg_01_schema');
const { weekIdFromDate } = require('../bcvhWeeklyComparisonService');
const { CauseAggQueryService, resolvePeriod, CAUSE_ORDER } = require('./CauseAggQueryService');

const A = '533140';
const B = '536250';
const C = '535790';
const D1 = '2026-10-22';
const D2 = '2026-10-23';
const CITY = { bcvhId: null, allowedCodes: null, canSeeCity: true };
const ownScope = (code) => ({ bcvhId: code, allowedCodes: [code], canSeeCity: false });

let tmpDir;
let database;
let service;

const run = (sql, params = []) => new Promise((resolve, reject) => database.run(sql, params, (e) => (e ? reject(e) : resolve())));
const exec = (sql) => new Promise((resolve, reject) => database.exec(sql, (e) => (e ? reject(e) : resolve())));

let seq = 0;
async function add(day, bcvh, o) {
    const row = {
        ma_bg: o.bg || `BG${String(++seq).padStart(5, '0')}`, route: o.route ?? null, scope: o.scope || 'POSTMAN', postman: o.postman ?? null, verdict: o.verdict ?? 'Đạt',
        status: o.status || 'KHONG_PHAN_TICH', cause: o.cause ?? null, step: o.step ?? null, flags: o.flags ?? null, hints: o.hints ?? null,
    };
    await run(
        `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown,
            danh_gia, cause_code, cause_status, cause_step, flags, hints, ma_lo, khong_tron_lo, limit_ms, tct_ms, l_ms, r_ms, built_at, classifier_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 3600000, 7200000, 7200000, 0, '2026-11-05T00:00:00.000Z', 'v1')`,
        [day, row.ma_bg, bcvh, row.route, row.scope, row.postman, row.postman ? `Tên ${row.postman}` : null, row.postman, row.postman ? `Tên ${row.postman}` : null,
            row.verdict === 'BLANK' ? null : row.verdict, row.cause, row.status, row.step, row.flags, row.hints],
    );
}
const many = async (count, day, bcvh, o) => { for (let i = 0; i < count; i += 1) await add(day, bcvh, o); };
const fail = (status, cause, extra = {}) => ({ verdict: 'Không đạt', status, cause, ...extra });

test.before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-why-p2-'));
    database = await new Promise((resolve, reject) => { const d = new sqlite3.Database(path.join(tmpDir, 'p2.sqlite'), (e) => (e ? reject(e) : resolve(d))); });
    await exec(`${F13_WHY_AGG_01_SCHEMA_SQL}
        CREATE TABLE fact_f13 (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_do_kiem TEXT, ma_bg TEXT, ma_bcvh TEXT);
        CREATE TABLE agg_f13_day (ngay_do_kiem TEXT, ma_bcvh TEXT, ma_tuyen TEXT, ten_tuyen TEXT);`);
    service = new CauseAggQueryService({ db: database });

    const R1 = '53314001';
    const R2 = '53314002';
    const NP = '53314018';
    // ---- Thuận Hóa 22/10
    await add(D1, A, { bg: 'FLIP1', route: R1, postman: 'P1' }); // Đạt on 22/10, Không đạt on 23/10 (under another postman)
    await many(9, D1, A, { route: R1, postman: 'P1' });
    await add(D1, A, { bg: 'REPEAT1', route: R1, postman: 'P1', ...fail('CAUSE', 'PHAT_MUON') });
    await add(D1, A, { route: R1, postman: 'P1', ...fail('CAUSE', 'PHAT_MUON') });
    await add(D1, A, { route: R1, postman: 'P1', ...fail('CAUSE', 'KHONG_TRON_LO', { hints: 'DAU_HIEU_CHAM_TAI_BCVH' }) });
    await add(D1, A, { route: R1, postman: 'P1', ...fail('CHUA_DU_CAN_CU', null, { step: 'T-A', flags: 'THIEU_F41' }) });
    await add(D1, A, { route: R1, postman: 'P1', verdict: 'BLANK' });
    await many(5, D1, A, { route: R1, postman: 'P2' });
    await many(3, D1, A, { route: R1, postman: 'P2', ...fail('CAUSE', 'GIAO_BUU_TA_QUA_GIO') });
    await many(2, D1, A, { route: R1, postman: 'P2', ...fail('CAUSE', 'KHAI_THAC') });
    await many(20, D1, A, { route: R2, postman: 'P3' });
    await many(2, D1, A, { route: R2 });
    await add(D1, A, { route: R2, ...fail('CHUA_DU_CAN_CU', null, { step: 'T-G', flags: 'THIEU_MOC_G' }) });
    await add(D1, A, { route: R2, verdict: 'BLANK' });
    await add(D1, A, { route: NP, scope: 'NON_POSTMAN' });
    await many(3, D1, A, { route: NP, scope: 'NON_POSTMAN', verdict: 'BLANK' });
    await add(D1, A, { route: null, scope: 'OTHER' });
    // ---- Thuận Hóa 23/10
    await add(D2, A, { bg: 'REPEAT1', route: R1, postman: 'P1', ...fail('CAUSE', 'PHAT_MUON') });
    await many(2, D2, A, { route: R1, postman: 'P1' });
    await add(D2, A, { bg: 'FLIP1', route: R1, postman: 'P2', ...fail('CAUSE', 'GIAO_BUU_TA_QUA_GIO') });
    await many(2, D2, A, { route: R2, postman: 'P3', ...fail('CAUSE', 'PHAT_MUON') });
    // ---- Hương Thủy 22/10 and A Lưới 22/10
    await many(6, D1, B, { route: '53625001', postman: 'PB' });
    await many(5, D1, B, { route: '53625001', postman: 'PB', ...fail('CAUSE', 'VAN_CHUYEN') });
    await add(D1, B, { route: '53625001', postman: 'PB', ...fail('CAUSE', 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET') });
    await many(10, D1, C, { route: '53579001', postman: 'PC' });
    // ---- April: three parcels measured on both 09/04 and 10/04 (the real case of the Design, section 6A), one only on 09/04
    for (const day of ['2026-04-09', '2026-04-10']) {
        await add(day, B, { bg: 'X1', route: '53625001', postman: 'PB' });
        await add(day, B, { bg: 'X2', route: '53625001', postman: 'PB' });
        await add(day, B, { bg: 'X3', route: '53625001', postman: 'PB', ...fail('CAUSE', 'VAN_CHUYEN') });
    }
    await add('2026-04-09', B, { bg: 'X4', route: '53625001', postman: 'PB' });
    // ---- names and day states
    await run("INSERT INTO agg_f13_day (ngay_do_kiem, ma_bcvh, ma_tuyen, ten_tuyen) VALUES (?, ?, ?, 'Tuyến Một'), (?, ?, ?, 'Tuyến Một')", [D1, A, R1, D2, A, R1]);
    for (const day of [D1, D2, '2026-10-24', '2026-10-25', '2026-04-09', '2026-04-10']) await run('INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh) VALUES (?, ?, ?)', [day, `F-${day}`, A]);
    for (const [day, state, error] of [[D1, 'FRESH', null], [D2, 'FRESH', null], ['2026-10-25', 'BUILDING', null], ['2026-04-09', 'FRESH', null], ['2026-04-10', 'STALE', 'boom']]) {
        await run("INSERT INTO f13_cause_day (ngay_do_kiem, input_signature, classifier_version, state, built_at, error, row_count) VALUES (?, 's', 'v1', ?, '2026-11-05T00:00:00.000Z', ?, 0)", [day, state, error]);
    }
});

test.after(async () => {
    await new Promise((resolve) => database.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);

// ------------------------------------------------------------------ filter
test('period: from+to, week and month are accepted; missing, mixed, invalid, reversed and too long ranges are refused', () => {
    assert.deepEqual(resolvePeriod({ from: D1, to: D2 }), { kind: 'range', from: D1, to: D2, days: 2 });
    const week = resolvePeriod({ week: weekIdFromDate(D1).weekId });
    assert.equal(week.kind, 'week');
    assert.equal(week.days, 7);
    assert.ok(week.from <= D1 && D1 <= week.to);
    assert.deepEqual(resolvePeriod({ month: '2026-10' }), { kind: 'month', from: '2026-10-01', to: '2026-10-31', month_id: '2026-10', days: 31 });
    for (const [query, code] of [
        [{}, 'MISSING_PARAM'], [{ from: D1 }, 'MISSING_PARAM'], [{ from: D1, to: D2, month: '2026-10' }, 'MISSING_PARAM'],
        [{ from: '2026-02-30', to: D2 }, 'INVALID_DATE'], [{ from: D2, to: D1 }, 'INVALID_RANGE'], [{ from: '2025-01-01', to: '2026-10-01' }, 'RANGE_TOO_LONG'],
        [{ month: '2026-13' }, 'INVALID_MONTH_ID'], [{ week: 'nope' }, 'INVALID_WEEK_ID'],
    ]) assert.throws(() => resolvePeriod(query), { code }, JSON.stringify(query));
});

// ------------------------------------------------------------------ (a) partitions
test('(a) one day, Thuận Hóa: the figure, then routes (POSTMAN + NON_POSTMAN + OTHER) and postmen (+ Chưa có bưu tá) add up to it for every count and the shortfall', async () => {
    const query = { from: D1, to: D1 };
    const { totals } = await service.summary(query, ownScope(A));
    assert.deepEqual([totals.volume, totals.passed, totals.failed, totals.unrated], [54, 39, 10, 5]);
    assert.equal(totals.shortfall_x10, 96);
    assert.equal(totals.shortfall, 9.6);

    const routes = await service.routes(query, ownScope(A));
    assert.equal(routes.rows.length, 4);
    assert.deepEqual(routes.rows.map((row) => row.route_scope).sort(), ['NON_POSTMAN', 'OTHER', 'POSTMAN', 'POSTMAN']);
    const byRoute = Object.fromEntries(routes.rows.map((row) => [row.ma_tuyen || row.route_scope, row]));
    assert.deepEqual([byRoute['53314001'].volume, byRoute['53314001'].passed, byRoute['53314001'].shortfall_x10], [25, 15, 75]); // 9*25 - 150
    assert.deepEqual([byRoute['53314002'].volume, byRoute['53314002'].passed, byRoute['53314002'].shortfall_x10], [24, 22, -4]); // 216 - 220
    assert.deepEqual([byRoute.NON_POSTMAN.volume, byRoute.NON_POSTMAN.passed, byRoute.NON_POSTMAN.unrated, byRoute.NON_POSTMAN.shortfall_x10], [4, 1, 3, 26]);
    assert.deepEqual([byRoute.OTHER.volume, byRoute.OTHER.shortfall_x10], [1, -1]);
    for (const field of ['volume', 'passed', 'failed', 'unrated', 'shortfall_x10']) assert.equal(sum(routes.rows, field), totals[field], `routes: ${field}`);
    assert.equal(routes.parents[A].volume, 54);

    const postmen = await service.postmen(query, ownScope(A));
    const byPostman = Object.fromEntries(postmen.rows.map((row) => [row.ma_buu_ta || 'NONE', row]));
    assert.deepEqual(Object.keys(byPostman).sort(), ['NONE', 'P1', 'P2', 'P3']);
    assert.deepEqual([byPostman.P1.volume, byPostman.P1.shortfall_x10], [15, 35]);
    assert.deepEqual([byPostman.P2.volume, byPostman.P2.shortfall_x10], [10, 40]);
    assert.deepEqual([byPostman.P3.volume, byPostman.P3.shortfall_x10], [20, -20]);
    assert.deepEqual([byPostman.NONE.volume, byPostman.NONE.shortfall_x10, byPostman.NONE.ten_buu_ta], [9, 41, 'Chưa có bưu tá']);
    for (const field of ['volume', 'passed', 'failed', 'unrated', 'shortfall_x10']) assert.equal(sum(postmen.rows, field), totals[field], `postmen: ${field}`);
});

test('(a) a period: BCVH = routes = postmen for N, Đạt, KĐ, unrated and the shortfall; the city listing adds up too', async () => {
    const query = { from: D1, to: D2 };
    const { totals } = await service.summary(query, ownScope(A));
    assert.deepEqual([totals.volume, totals.passed, totals.failed, totals.unrated, totals.shortfall_x10], [60, 41, 14, 5, 130]);
    for (const level of ['routes', 'postmen']) {
        const result = await service[level](query, ownScope(A));
        for (const field of ['volume', 'passed', 'failed', 'unrated', 'shortfall_x10']) assert.equal(sum(result.rows, field), totals[field], `${level}: ${field}`);
    }
    const bcvh = await service.bcvh(query, CITY);
    assert.deepEqual(bcvh.rows.map((row) => row.ma_bcvh), [A, B, C]); // own shortfall: 130, 48, 0
    assert.deepEqual([bcvh.total.volume, bcvh.total.passed, bcvh.total.failed, bcvh.total.unrated, bcvh.total.shortfall_x10], [82, 57, 20, 5, 168]);
    for (const field of ['volume', 'passed', 'failed', 'unrated', 'shortfall_x10']) assert.equal(sum(bcvh.rows, field), bcvh.total[field], `bcvh: ${field}`);
});

// ------------------------------------------------------------------ (b) cause mix
test('(b) cause lines + "chưa đủ căn cứ" equal the failed parcels at every level; hints are beside, not inside', async () => {
    const query = { from: D1, to: D2 };
    const { totals } = await service.summary(query, ownScope(A));
    const mix = totals.cause_mix;
    const byCode = Object.fromEntries(mix.lines.map((line) => [line.code, line.count]));
    assert.deepEqual(byCode, { KHONG_TRON_LO: 1, KHAI_THAC: 2, VAN_CHUYEN: 0, KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET: 0, GIAO_BUU_TA_QUA_GIO: 4, PHAT_MUON: 5 });
    assert.equal(mix.chua_du_can_cu.count, 2);
    assert.deepEqual(mix.chua_du_can_cu.by_step, { 'T-A': 1, 'T-G': 1 });
    assert.deepEqual(mix.chua_du_can_cu.by_flag, { THIEU_F41: 1, THIEU_MOC_G: 1 });
    assert.equal(mix.unclassified, 0);
    close(mix.chua_du_can_cu.share, 2 / 14);
    assert.deepEqual(mix.lines.map((line) => line.code), CAUSE_ORDER);
    assert.deepEqual(totals.hints, { DAU_HIEU_CHAM_TAI_BCVH: 1 });

    const everyLevel = [
        ['summary', [totals]], ['bcvh', (await service.bcvh(query, CITY)).rows], ['routes', (await service.routes(query, CITY)).rows], ['postmen', (await service.postmen(query, CITY)).rows],
    ];
    for (const [level, rows] of everyLevel) {
        for (const row of rows) {
            const lines = row.cause_mix.lines.reduce((total, line) => total + line.count, 0) + row.cause_mix.chua_du_can_cu.count + row.cause_mix.unclassified;
            assert.equal(lines, row.failed, `${level} ${row.key ?? ''}`);
            assert.equal(row.cause_mix.failed, row.failed);
        }
    }
    // no Đạt / unrated parcel carries a cause: the lines never exceed the failed parcels
    assert.equal(Object.values(byCode).reduce((a, b) => a + b, 0) + mix.chua_du_can_cu.count, totals.failed);
});

// ------------------------------------------------------------------ (c) the list behind a figure
test('(c) the parcels behind every cell equal the cell: rows of each level, each cause line, unrated and the hint', async () => {
    const query = { from: D1, to: D2 };
    const scope = ownScope(A);
    const levels = [await service.routes(query, scope), await service.postmen(query, scope)];
    for (const result of levels) {
        for (const row of result.rows) {
            const list = await service.parcels({ ...row.filter, page_size: 200 }, scope);
            assert.equal(list.meta.total, row.volume, row.key);
            assert.equal(list.parcels.length, row.volume);
            assert.equal(list.parcels.filter((p) => p.danh_gia === 'Đạt').length, row.passed);
            assert.equal(list.parcels.filter((p) => p.danh_gia === 'Không đạt').length, row.failed);
            assert.equal(list.parcels.filter((p) => !p.danh_gia).length, row.unrated);
            for (const line of row.cause_mix.lines) {
                const part = await service.parcels({ ...row.filter, cause: line.code }, scope);
                assert.equal(part.meta.total, line.count, `${row.key} ${line.code}`);
            }
            assert.equal((await service.parcels({ ...row.filter, cause: 'CHUA_DU_CAN_CU' }, scope)).meta.total, row.cause_mix.chua_du_can_cu.count);
            assert.equal((await service.parcels({ ...row.filter, verdict: 'CHUA_DANH_GIA' }, scope)).meta.total, row.unrated);
        }
    }
    const hinted = await service.parcels({ from: D1, to: D2, hint: 'DAU_HIEU_CHAM_TAI_BCVH' }, CITY);
    assert.equal(hinted.meta.total, 1);
    const bcvh = await service.bcvh(query, CITY);
    for (const row of bcvh.rows) assert.equal((await service.parcels({ ...row.filter, page_size: 200 }, CITY)).meta.total, row.volume, row.key);
});

// ------------------------------------------------------------------ (d) formulas
test('(d) rate = sum of Đạt / sum of rows; shortfall in exact tenths; own shortfall and net contribution are different figures', async () => {
    const day = await service.routes({ from: D1, to: D1 }, ownScope(A));
    const r2 = day.rows.find((row) => row.ma_tuyen === '53314002');
    assert.equal(r2.rate, 91.7); // 22 / 24 = 91.666...: display rounding only
    assert.equal(r2.shortfall_x10, -4); // 0.4 of a parcel above the target
    assert.equal(r2.own_shortfall_x10, 0); // the route alone is on target
    assert.equal(r2.net_contribution_x10, -4); // but it lowers the BCVH shortfall by 0.4
    assert.equal(r2.net_contribution, -0.4);

    const period = await service.summary({ from: D1, to: D2 }, ownScope(A));
    assert.equal(period.totals.rate, 68.3); // 41 / 60, not the mean of the daily rates (72.2 and 33.3)
    const d1 = (await service.summary({ from: D1, to: D1 }, ownScope(A))).totals;
    const d2 = (await service.summary({ from: D2, to: D2 }, ownScope(A))).totals;
    assert.deepEqual([d1.rate, d2.rate], [72.2, 33.3]);
    assert.equal(period.totals.shortfall_x10, d1.shortfall_x10 + d2.shortfall_x10); // the shortfall in tenths adds up
});

test('(d) the own shortfall of a period is max(0, s) of the period, not the sum of the daily values', async () => {
    // route 53314002: 22/10 24 rows, 22 Đạt (s = -0.4); 23/10 2 rows, 0 Đạt (s = 1.8). Daily own shortfalls add to 1.8, the period's to 1.4.
    const route = async (from, to) => (await service.routes({ from, to }, ownScope(A))).rows.find((row) => row.ma_tuyen === '53314002');
    const d1 = await route(D1, D1);
    const d2 = await route(D2, D2);
    const period = await route(D1, D2);
    assert.deepEqual([d1.own_shortfall_x10, d2.own_shortfall_x10], [0, 18]);
    assert.equal(period.shortfall_x10, 14); // 9*26 - 220
    assert.equal(period.own_shortfall_x10, 14);
    assert.notEqual(period.own_shortfall_x10, d1.own_shortfall_x10 + d2.own_shortfall_x10);
});

test('(d) shares inside the parent: shortfall share can be negative for a surplus route, deficit shares add to 1, "không áp dụng" when the parent is on target', async () => {
    const routes = await service.routes({ from: D1, to: D2 }, ownScope(A)); // parent shortfall 130; own: R1 91, R2 14, NP 26, OT 0 -> 131
    const byRoute = Object.fromEntries(routes.rows.map((row) => [row.ma_tuyen || row.route_scope, row]));
    close(byRoute['53314001'].share_of_parent_shortfall, 91 / 130);
    close(byRoute.OTHER.share_of_parent_shortfall, -1 / 130); // a surplus route: negative net contribution
    close(sum(routes.rows.map((row) => ({ v: row.share_of_parent_shortfall })), 'v'), 1);
    close(byRoute['53314001'].share_of_parent_deficits, 91 / 131);
    close(sum(routes.rows.map((row) => ({ v: row.share_of_parent_deficits })), 'v'), 1);
    close(sum(routes.rows.map((row) => ({ v: row.share_of_parent_failed })), 'v'), 1);
    assert.equal(byRoute.OTHER.own_shortfall_x10, 0);

    const onTarget = await service.routes({ from: D1, to: D1 }, ownScope(C)); // 10 of 10 passed: parent shortfall -1.0
    assert.equal(onTarget.parents[C].shortfall_x10, -10);
    assert.equal(onTarget.rows[0].share_of_parent_shortfall, null);
    assert.equal(onTarget.rows[0].share_note, 'KHONG_AP_DUNG');
    assert.equal(onTarget.rows[0].share_of_parent_deficits, null);
});

test('(d) the city listing: shares of the total shortfall; sorted by own shortfall; other sort keys and order work', async () => {
    const bcvh = await service.bcvh({ from: D1, to: D2 }, CITY);
    assert.deepEqual(bcvh.rows.map((row) => row.ma_bcvh), [A, B, C]);
    close(bcvh.rows[0].share_of_parent_shortfall, 130 / 168);
    close(bcvh.rows[2].share_of_parent_shortfall, -10 / 168);
    close(sum(bcvh.rows.map((row) => ({ v: row.share_of_parent_shortfall })), 'v'), 1);
    const byVolume = await service.bcvh({ from: D1, to: D2, sort: 'volume', order: 'asc' }, CITY);
    assert.deepEqual(byVolume.rows.map((row) => row.ma_bcvh), [C, B, A]);
    const byRate = await service.bcvh({ from: D1, to: D2, sort: 'rate' }, CITY);
    assert.deepEqual(byRate.rows.map((row) => row.ma_bcvh), [C, A, B]); // 100 %, 68.3 %, 50 %
    assert.equal(bcvh.rows[0].ten_bcvh, 'BCVH Thuận Hóa');
});

// ------------------------------------------------------------------ (e) repeats and distinct parcels
test('(e) a parcel on two days is two rows; meta.repeats and distinct_bg say so; children are not summed for distinct parcels', async () => {
    const summary = await service.summary({ from: D1, to: D2 }, ownScope(A));
    assert.deepEqual(summary.meta.repeats, { rows: 60, distinct: 58, extra: 2 }); // REPEAT1 and FLIP1 are on both days
    assert.deepEqual([summary.totals.volume, summary.totals.distinct_bg, summary.totals.repeat], [60, 58, 2]);
    assert.equal(summary.meta.basis, 'BG_DAY_ROWS');

    const postmen = await service.postmen({ from: D1, to: D2 }, ownScope(A));
    assert.equal(sum(postmen.rows, 'volume'), 60); // rows add up
    // FLIP1 sits under P1 (22/10) and under P2 (23/10): the children's distinct parcels exceed the parent's by exactly that one
    assert.equal(sum(postmen.rows, 'distinct_bg'), postmen.parents[A].distinct_bg + 1);
    assert.equal(postmen.parents[A].distinct_bg, 58);

    const oneDay = await service.summary({ from: D1, to: D1 }, ownScope(A));
    assert.deepEqual(oneDay.meta.repeats, { rows: 54, distinct: 54, extra: 0 });
});

test('(e) the April case: parcels measured on 09/04 and 10/04 are counted on each day, the rate is on rows, distinct parcels are shown beside', async () => {
    const week = await service.summary({ from: '2026-04-09', to: '2026-04-15' }, ownScope(B));
    // 7 rows (X1 X2 X3 on both days + X4): 5 Đạt, 2 KĐ; 4 distinct parcels
    assert.deepEqual([week.totals.volume, week.totals.passed, week.totals.failed], [7, 5, 2]);
    assert.equal(week.totals.rate, 71.4);
    assert.deepEqual(week.meta.repeats, { rows: 7, distinct: 4, extra: 3 });
    assert.equal(week.totals.distinct_bg, 4);
    const list = await service.parcels({ from: '2026-04-09', to: '2026-04-15', page_size: 200 }, ownScope(B));
    assert.equal(list.meta.total, 7);
    assert.deepEqual(list.parcels.filter((p) => p.ma_bg === 'X3').map((p) => p.ngay_do_kiem).sort(), ['2026-04-09', '2026-04-10']); // once per day
    assert.deepEqual(Object.keys(week.totals).filter((key) => /unique|distinct/.test(key)), ['distinct_bg']); // no "unique-parcel rate" is offered
});

// ------------------------------------------------------------------ (f) scope
test('(f) a BCVH-mode account: its own unit, no city total, no shares of a city; another unit is refused', async () => {
    const own = await service.bcvh({ from: D1, to: D2 }, ownScope(B));
    assert.deepEqual(own.rows.map((row) => row.ma_bcvh), [B]);
    assert.equal(own.total, undefined);
    assert.equal(own.rows[0].share_of_parent_shortfall, null);
    assert.equal(own.rows[0].share_note, 'NGOAI_PHAM_VI');
    assert.deepEqual((await service.summary({ from: D1, to: D2 }, ownScope(B))).totals.volume, 12);
    assert.deepEqual([...new Set((await service.parcels({ from: D1, to: D2, page_size: 200 }, ownScope(B))).parcels.map((p) => p.ma_bcvh))], [B]);
    await assert.rejects(service.summary({ from: D1, to: D2 }, { bcvhId: A, allowedCodes: [B], canSeeCity: false }), { code: 'OUT_OF_SCOPE' });
    // an account with two units and no single unit chosen is limited to its list
    const two = await service.bcvh({ from: D1, to: D2 }, { bcvhId: null, allowedCodes: [B, C], canSeeCity: false });
    assert.deepEqual(two.rows.map((row) => row.ma_bcvh).sort(), [B, C].sort());
    assert.equal(await service.summary({ from: D1, to: D2 }, { bcvhId: null, allowedCodes: [], canSeeCity: false }).then((r) => r.totals.volume), 0);
});

test('filters: route, route_scope, postman (including none), verdict, cause and hint; a bad value is refused', async () => {
    const scope = ownScope(A);
    assert.equal((await service.parcels({ from: D1, to: D2, route: '53314001' }, scope)).meta.total, 29);
    assert.equal((await service.parcels({ from: D1, to: D2, route: '@NON_POSTMAN' }, scope)).meta.total, 4);
    assert.equal((await service.parcels({ from: D1, to: D2, route_scope: 'OTHER' }, scope)).meta.total, 1);
    assert.equal((await service.parcels({ from: D1, to: D2, postman: 'NONE' }, scope)).meta.total, 9);
    assert.equal((await service.parcels({ from: D1, to: D2, postman: 'P3' }, scope)).meta.total, 22);
    assert.equal((await service.parcels({ from: D1, to: D2, verdict: 'Không đạt' }, scope)).meta.total, 14);
    assert.equal((await service.parcels({ from: D1, to: D2, cause: 'PHAT_MUON' }, scope)).meta.total, 5);
    for (const bad of [{ route_scope: 'X' }, { route: '@X' }, { verdict: 'x' }, { cause: 'x' }]) await assert.rejects(service.parcels({ from: D1, to: D2, ...bad }, scope), { code: 'INVALID_FILTER' });
});

test('route names come from agg_f13_day when present; buckets get fixed names; postmen get their names', async () => {
    const routes = await service.routes({ from: D1, to: D1 }, ownScope(A));
    const byKey = Object.fromEntries(routes.rows.map((row) => [row.ma_tuyen || row.route_scope, row]));
    assert.equal(byKey['53314001'].ten_tuyen, 'Tuyến Một');
    assert.equal(byKey['53314002'].ten_tuyen, null);
    assert.equal(byKey.NON_POSTMAN.ten_tuyen, 'Tuyến không giao bưu tá');
    assert.equal(byKey.OTHER.ten_tuyen, 'Tuyến khác / không xác định');
    const postmen = await service.postmen({ from: D1, to: D1, route: '53314001' }, ownScope(A));
    assert.deepEqual(postmen.rows.map((row) => row.ten_buu_ta).sort(), ['Tên P1', 'Tên P2']);
    assert.equal(postmen.parents[A].volume, 25); // the parent is the filtered group (the route), shares are inside it
});

test('parcels: paging, sort whitelist, page size cap, fields; the answer also carries the period and freshness', async () => {
    const page = await service.parcels({ from: D1, to: D2, page: 2, page_size: 25, sort: 'ma_bg', order: 'asc' }, CITY);
    assert.equal(page.meta.total, 82);
    assert.equal(page.meta.page, 2);
    assert.equal(page.parcels.length, 25);
    assert.equal(page.meta.total_pages, 4);
    const ids = page.parcels.map((p) => p.ma_bg);
    assert.deepEqual(ids, [...ids].sort());
    assert.equal((await service.parcels({ from: D1, to: D2, page_size: 100000 }, CITY)).meta.page_size, 200);
    assert.equal((await service.parcels({ from: D1, to: D2, sort: 'DROP TABLE' }, CITY)).meta.total, 82); // unknown sort ignored
    const hinted = (await service.parcels({ from: D1, to: D2, cause: 'KHONG_TRON_LO' }, CITY)).parcels[0];
    assert.deepEqual([hinted.cause.code, hinted.hints, hinted.flags, hinted.khong_tron_lo], ['KHONG_TRON_LO', ['DAU_HIEU_CHAM_TAI_BCVH'], [], false]);
    assert.equal(hinted.limit_ms, 3600000);
    assert.equal(page.meta.period.kind, 'range');
});

// ------------------------------------------------------------------ freshness (stored state)
test('freshness reports the stored state of each day with data: complete, stale, building, missing', async () => {
    const complete = (await service.summary({ from: D1, to: D2 }, CITY)).meta.freshness;
    assert.equal(complete.complete, true);
    assert.deepEqual([complete.stale_days, complete.building_days, complete.missing_days], [[], [], []]);
    assert.equal(complete.check, 'STORED_STATE');
    const mixed = (await service.summary({ from: D1, to: '2026-10-25' }, CITY)).meta.freshness;
    assert.equal(mixed.complete, false);
    assert.deepEqual(mixed.missing_days, ['2026-10-24']); // fact_f13 has the day, the cause table does not
    assert.deepEqual(mixed.building_days, ['2026-10-25']);
    const stale = (await service.summary({ from: '2026-04-09', to: '2026-04-10' }, ownScope(B))).meta.freshness;
    assert.deepEqual([stale.complete, stale.stale_days], [false, ['2026-04-10']]);
    assert.equal(stale.built_to, '2026-10-23');
    // a day without any F1.3 data (no fact row, no day row) is not "missing"
    assert.deepEqual((await service.summary({ from: '2026-09-01', to: '2026-09-03' }, CITY)).meta.freshness.missing_days, []);
});

test('an empty period answers with zeros and null rates, never an error', async () => {
    const { totals } = await service.summary({ from: '2026-09-01', to: '2026-09-03' }, CITY);
    assert.deepEqual([totals.volume, totals.rate, totals.shortfall_x10, totals.cause_mix.failed], [0, null, 0, 0]);
    assert.deepEqual((await service.routes({ from: '2026-09-01', to: '2026-09-03' }, CITY)).rows, []);
});
