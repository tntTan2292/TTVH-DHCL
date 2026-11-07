'use strict';

// F13-WHY-AGG-01 Phase 1: builder, signature, run log, verify. Every test uses its own temporary SQLite file, never the operational database.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const { applyF13WhyAgg01Schema } = require('../../../migrate_f13_why_agg_01_schema');
const { applyPerfLoad01AggSchema } = require('../../../migrate_perf_load_01_agg_schema');
const { rebuildAggForDate } = require('../aggMaintenance');
const { F13JourneyRepository } = require('../../repositories/F13JourneyRepository');
const { CANONICAL_BCVH_UNITS } = require('../../config/canonicalBcvhUnits');
const { JourneyService, DAYS_BEFORE, DAYS_AFTER, BF_EXTRA_DAYS, shiftIsoDate } = require('./JourneyService');
const builderModule = require('./CauseAggBuilder');
const { verifyRange } = require('../../../scripts/f13_cause_tool');

const { CauseAggBuilder, routeScopeOf, windowFor, computeClassifierVersion, ROW_COLUMNS } = builderModule;

const DATE = '2026-10-28';
const HUONG_THUY = '536250';
const THUAN_HOA = '533140';
const HUONG_TRA = '535470';
const CODES = CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh);
const FIXED_NOW = () => new Date('2026-11-05T08:00:00.000Z');

const SOURCE_SCHEMA = `
CREATE TABLE fact_f13 (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_do_kiem TEXT, ma_bg TEXT, ma_bcvh TEXT, ten_bcvh TEXT, ma_tuyen TEXT, ten_tuyen TEXT,
    loai_tuyen_phat TEXT, danh_gia_2026 TEXT, thoi_gian_bd10_quet_tms TEXT, thoi_gian_ptc TEXT, thoi_gian_thuc_hien_thuc_te_gio TEXT, thoi_gian_chi_tieu TEXT, thoi_gian_nop_tien TEXT);
CREATE UNIQUE INDEX uq_fact_f13 ON fact_f13(ngay_do_kiem, ma_bg);
CREATE TABLE fact_f41 (id INTEGER PRIMARY KEY AUTOINCREMENT, ma_bg TEXT, ngay_do_kiem TEXT, ma_bc_phat TEXT, so_hieu_bd10_xnd_bcp TEXT, thoi_gian_xnd_bd1 TEXT);
CREATE INDEX idx_f41_day ON fact_f41(ngay_do_kiem);
CREATE TABLE fact_f42 (id INTEGER PRIMARY KEY AUTOINCREMENT, ma_bg TEXT, ngay_do_kiem TEXT, ma_buu_ta TEXT, ten_buu_ta TEXT, thoi_gian_gbt TEXT, thoi_gian_ptc TEXT);
CREATE INDEX idx_f42_day ON fact_f42(ngay_do_kiem);
CREATE TABLE fact_f11 (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_do_kiem TEXT, so_bd10_dong_di_kttinh TEXT, thoi_gian_bd10_dong_di_kttinh TEXT);
CREATE INDEX idx_f11_day ON fact_f11(ngay_do_kiem);
CREATE TABLE fact_bf_phat (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_bf TEXT, lading_code TEXT, ma_lo TEXT, mabc_phat TEXT, xac_nhan_den_bcp TEXT);
CREATE INDEX idx_bf_day ON fact_bf_phat(ngay_bf);
`;

function open(file) {
    return new Promise((resolve, reject) => { const database = new sqlite3.Database(file, (e) => (e ? reject(e) : resolve(database))); });
}

function helpersOf(database) {
    return {
        run: (sql, params = []) => new Promise((resolve, reject) => database.run(sql, params, function onRun(e) { return e ? reject(e) : resolve(this); })),
        get: (sql, params = []) => new Promise((resolve, reject) => database.get(sql, params, (e, row) => (e ? reject(e) : resolve(row)))),
        all: (sql, params = []) => new Promise((resolve, reject) => database.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows)))),
    };
}

function f13Row(day, ma_bg, overrides = {}) {
    return {
        ngay_do_kiem: day, ma_bg, ma_bcvh: HUONG_THUY, ten_bcvh: 'BCVH Hương Thủy', ma_tuyen: '53625001', ten_tuyen: 'Tuyến 1', loai_tuyen_phat: null,
        danh_gia_2026: 'Đạt', thoi_gian_bd10_quet_tms: '28/10/2026 07:00:00', thoi_gian_ptc: '28/10/2026 17:12:41',
        thoi_gian_thuc_hien_thuc_te_gio: '10:12', thoi_gian_chi_tieu: '8', thoi_gian_nop_tien: null, ...overrides,
    };
}

async function insert(h, table, row) {
    const columns = Object.keys(row);
    await h.run(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, columns.map((c) => row[c]));
}

/** Parcels: Đạt; failed without F4.1; failed with late F4.1 and two F4.2 handovers; blank verdict on a confirmed non-postman route; empty route; non-canonical unit. */
async function seed(h, day = DATE) {
    await insert(h, 'fact_f13', f13Row(day, 'BG_DAT'));
    await insert(h, 'fact_f13', f13Row(day, 'BG_NOF41', { danh_gia_2026: 'Không đạt' }));
    await insert(h, 'fact_f13', f13Row(day, 'BG_LATE', { danh_gia_2026: 'Không đạt', ma_bcvh: THUAN_HOA, ten_bcvh: 'BCVH Thuận Hóa', ma_tuyen: '53314001' }));
    await insert(h, 'fact_f13', f13Row(day, 'BG_PICKUP', { danh_gia_2026: null, ma_bcvh: THUAN_HOA, ten_bcvh: 'BCVH Thuận Hóa', ma_tuyen: '53314018' }));
    await insert(h, 'fact_f13', f13Row(day, 'BG_NOROUTE', { ma_bcvh: THUAN_HOA, ten_bcvh: 'BCVH Thuận Hóa', ma_tuyen: '' }));
    await insert(h, 'fact_f13', f13Row(day, 'BG_OTHERUNIT', { ma_bcvh: '531120', ten_bcvh: 'Khách hàng lớn', ma_tuyen: '5311203' }));
    await insert(h, 'fact_f41', { ma_bg: 'BG_LATE', ngay_do_kiem: day, ma_bc_phat: THUAN_HOA, so_hieu_bd10_xnd_bcp: '`1', thoi_gian_xnd_bd1: '28/10/2026 16:00:00' });
    await insert(h, 'fact_f42', { ma_bg: 'BG_LATE', ngay_do_kiem: day, ma_buu_ta: 'PT_A', ten_buu_ta: 'Postman A', thoi_gian_gbt: '2026-10-28 16:30:00', thoi_gian_ptc: null });
    await insert(h, 'fact_f42', { ma_bg: 'BG_LATE', ngay_do_kiem: day, ma_buu_ta: 'PT_B', ten_buu_ta: 'Postman B', thoi_gian_gbt: '2026-10-28 17:00:00', thoi_gian_ptc: '2026-10-28 17:12:41' });
    await insert(h, 'fact_bf_phat', { ngay_bf: day, lading_code: 'BG_LATE', ma_lo: 'LOT1' });
}

async function makeEnv({ seedDay = true } = {}) {
    const file = path.join(os.tmpdir(), `f13-cause-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    const setup = await open(file);
    await new Promise((resolve, reject) => setup.exec(SOURCE_SCHEMA, (e) => (e ? reject(e) : resolve())));
    await new Promise((resolve) => setup.close(resolve));
    await applyF13WhyAgg01Schema(file);
    await applyPerfLoad01AggSchema(file);
    const writer = await open(file);
    const reader = await open(file);
    const w = helpersOf(writer);
    if (seedDay) await seed(w);
    const service = new JourneyService({ repository: new F13JourneyRepository(reader) });
    const quiet = { log() {} };
    const builder = new CauseAggBuilder({ db: writer, journeyService: service, now: FIXED_NOW, sleep: async () => {}, logger: quiet });
    return {
        file, w, writer, reader, service, builder, quiet,
        async close() {
            await new Promise((resolve) => writer.close(resolve));
            await new Promise((resolve) => reader.close(resolve));
            for (const suffix of ['', '-wal', '-shm', '-journal']) fs.rmSync(file + suffix, { force: true });
        },
    };
}

const rowsOf = (env, day = DATE) => env.w.all('SELECT * FROM f13_cause_parcel WHERE ngay_do_kiem = ? ORDER BY ma_bg', [day]);

// ---- (a) schema ----------------------------------------------------------------------------------------------------------------------

test('(a) the schema is idempotent and additive: a second application changes nothing and keeps data and other tables', async () => {
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        await env.w.run('CREATE TABLE unrelated_marker (x INTEGER)');
        await env.w.run('INSERT INTO unrelated_marker VALUES (7)');
        const before = await env.w.all(`SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name`);
        const rows = await rowsOf(env);
        await applyF13WhyAgg01Schema(env.file);
        await applyF13WhyAgg01Schema(env.file);
        assert.deepEqual(await env.w.all(`SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name`), before);
        assert.deepEqual(await rowsOf(env), rows);
        assert.deepEqual(await env.w.all('SELECT x FROM unrelated_marker'), [{ x: 7 }]);
        const indexes = (await env.w.all(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'f13_cause_parcel'`)).map((r) => r.name);
        for (const name of ['uq_f13_cause_parcel', 'idx_f13_cause_parcel_bcvh', 'idx_f13_cause_parcel_route', 'idx_f13_cause_parcel_postman', 'idx_f13_cause_parcel_bg']) {
            assert.ok(indexes.includes(name), `missing index ${name}`);
        }
    } finally { await env.close(); }
});

test('(a) the key (ngay_do_kiem, ma_bg) is unique', async () => {
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        await assert.rejects(env.w.run(`INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, route_scope, cause_status, built_at, classifier_version)
            VALUES (?, 'BG_DAT', ?, 'POSTMAN', 'KHONG_PHAN_TICH', 'x', 'y')`, [DATE, HUONG_THUY]), /UNIQUE/);
    } finally { await env.close(); }
});

// ---- (b) rows equal the service output -------------------------------------------------------------------------------------------------

test('(b) every stored field equals the JourneyService parcel; scopes and both postmen are right; other units are not in the table', async () => {
    const env = await makeEnv();
    try {
        const parcels = await env.service._parcels(DATE);
        const result = await env.builder.buildDay(DATE);
        const rows = await rowsOf(env);
        assert.equal(result.rows, 5);
        assert.equal(rows.length, parcels.length);
        assert.ok(!rows.some((r) => r.ma_bg === 'BG_OTHERUNIT'), 'a non-canonical unit reached the table');
        const byBg = new Map(rows.map((r) => [r.ma_bg, r]));
        for (const p of parcels) {
            const r = byBg.get(p.ma_bg);
            assert.ok(r, `row of ${p.ma_bg}`);
            assert.equal(r.ma_bcvh, p.ma_bcvh);
            assert.equal(r.ma_tuyen, p.ma_tuyen);
            assert.equal(r.danh_gia, p.danh_gia);
            assert.equal(r.cause_code, p.cause ? p.cause.code : null);
            assert.equal(r.cause_status, p.cause_status);
            assert.equal(r.cause_step, p.cause_step);
            assert.equal(r.flags, p.flags.length ? p.flags.join(',') : null);
            assert.equal(r.hints, p.hints.length ? p.hints.join(',') : null);
            assert.equal(r.ma_lo, p.ma_lo);
            assert.equal(r.khong_tron_lo, p.khong_tron_lo ? 1 : 0);
            assert.equal(r.limit_ms, p.cause_detail.limit_ms);
            assert.equal(r.tct_ms, p.cause_detail.tct_ms);
            assert.equal(r.l_ms, p.cause_detail.l_ms);
            assert.equal(r.r_ms, p.cause_detail.r_ms);
            assert.equal(r.ma_buu_ta_shown, p.ma_buu_ta);
            assert.equal(r.ten_buu_ta_shown, p.ten_buu_ta);
            assert.equal(r.ma_buu_ta_first, p.ma_buu_ta_first);
            assert.equal(r.ten_buu_ta_first, p.ten_buu_ta_first);
            // F13-WHY-DATA-02 R2: the v5 fields are stored as the service gives them
            assert.equal(r.cause_detail, p.cause ? (p.cause.detail ?? null) : null);
            assert.equal(r.cause_reason, p.cause_reason ?? null);
            assert.equal(r.remaining_at_arrival_ms, p.remaining_at_arrival_ms ?? null);
            assert.equal(r.a_source, p.a_source ?? null);
            assert.equal(r.basis, p.cause_basis ?? null);
            assert.equal(r.classifier_version, env.builder.classifierVersion);
            assert.equal(r.built_at, FIXED_NOW().toISOString());
        }
        // first handover = earliest time (Postman A), shown = the one with the delivery time (Postman B)
        assert.equal(byBg.get('BG_LATE').ma_buu_ta_first, 'PT_A');
        assert.equal(byBg.get('BG_LATE').ma_buu_ta_shown, 'PT_B');
        assert.equal(byBg.get('BG_LATE').ma_lo, 'LOT1');
        assert.equal(byBg.get('BG_NOF41').ma_buu_ta_first, null);
        assert.equal(byBg.get('BG_NOF41').cause_status, 'CHO_CHUYEN_QUAN'); // no arrival anywhere and no handover: left to the Chuyên quản (E5)
        assert.equal(byBg.get('BG_NOF41').cause_reason, 'THIEU_MOC_G');
        assert.equal(byBg.get('BG_DAT').cause_status, 'KHONG_PHAN_TICH');
        assert.equal(byBg.get('BG_DAT').cause_code, null);
        assert.equal(byBg.get('BG_LATE').cause_status, 'CAUSE');
        assert.ok(byBg.get('BG_LATE').cause_code);
        assert.equal(byBg.get('BG_DAT').route_scope, 'POSTMAN');
        assert.equal(byBg.get('BG_LATE').route_scope, 'POSTMAN');
        assert.equal(byBg.get('BG_PICKUP').route_scope, 'NON_POSTMAN');
        assert.equal(byBg.get('BG_NOROUTE').route_scope, 'OTHER');
        assert.equal(byBg.get('BG_PICKUP').danh_gia, null);
        const state = await env.w.get('SELECT * FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE]);
        assert.equal(state.state, 'FRESH');
        assert.equal(state.row_count, 5);
        assert.equal(state.classifier_version, env.builder.classifierVersion);
        assert.equal(state.input_signature, await env.builder.computeSignature(DATE));
        assert.equal(state.error, null);
    } finally { await env.close(); }
});

test('route scope: Huế route not on the confirmed list = POSTMAN; confirmed code = NON_POSTMAN; empty or not 53 = OTHER', () => {
    assert.equal(routeScopeOf('53625001'), 'POSTMAN');
    assert.equal(routeScopeOf('53314018'), 'NON_POSTMAN');
    assert.equal(routeScopeOf('5370155'), 'NON_POSTMAN');
    assert.equal(routeScopeOf(''), 'OTHER');
    assert.equal(routeScopeOf(null), 'OTHER');
    assert.equal(routeScopeOf('99999'), 'OTHER');
});

test('T3: the builder asks the service for the day without any scope', async () => {
    const env = await makeEnv();
    try {
        const calls = [];
        const original = env.service._parcels.bind(env.service);
        env.service._parcels = (...args) => { calls.push(args); return original(...args); };
        await env.builder.buildDay(DATE);
        assert.deepEqual(calls, [[DATE]]);
    } finally { await env.close(); }
});

// ---- (c) idempotent rebuild -----------------------------------------------------------------------------------------------------------

test('(c) a day rebuilt twice gives identical rows and the same state', async () => {
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        const first = await rowsOf(env);
        const firstState = await env.w.get('SELECT * FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE]);
        await env.builder.buildDay(DATE);
        assert.deepEqual(await rowsOf(env), first);
        assert.deepEqual(await env.w.get('SELECT * FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE]), firstState);
        assert.equal((await env.w.get('SELECT COUNT(*) AS c FROM f13_cause_parcel')).c, 5);
    } finally { await env.close(); }
});

// ---- (d) failure keeps old rows ---------------------------------------------------------------------------------------------------------

test('(d) a failing day keeps its old rows, is marked STALE with the error, and the run goes on with the next day', async () => {
    const env = await makeEnv();
    try {
        const nextDay = '2026-10-29';
        await seed(env.w, nextDay);
        await env.builder.run({ from: DATE, to: nextDay, mode: 'build' });
        const before = await rowsOf(env);
        const nextBefore = await rowsOf(env, nextDay);
        assert.equal(before.length, 5);

        const original = env.service._parcels.bind(env.service);
        env.service._parcels = async (date, ...rest) => {
            if (date === DATE) throw new Error('boom on the 28th');
            return original(date, ...rest);
        };
        await assert.rejects(env.builder.buildDay(DATE), /boom on the 28th/);
        assert.deepEqual(await rowsOf(env), before, 'the old rows were lost');
        const state = await env.w.get('SELECT * FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE]);
        assert.equal(state.state, 'STALE');
        assert.match(state.error, /boom on the 28th/);
        assert.equal(state.row_count, 5);

        const outcome = await env.builder.run({ from: DATE, to: nextDay, mode: 'rebuild' });
        assert.equal(outcome.status, 'PARTIAL');
        assert.equal(outcome.daysDone, 1);
        assert.equal(outcome.daysFailed, 1);
        assert.deepEqual(await rowsOf(env), before);
        assert.deepEqual(await rowsOf(env, nextDay), nextBefore.map((r) => ({ ...r })));
        const log = await env.w.get('SELECT * FROM f13_cause_run ORDER BY id DESC LIMIT 1');
        assert.equal(log.status, 'PARTIAL');
        assert.equal(log.days_done, 1);
        assert.equal(log.days_failed, 1);
        assert.match(log.last_error, /2026-10-28: boom/);
        assert.ok(log.ended_at);
    } finally { await env.close(); }
});

test('(d) a failure inside the write transaction rolls the whole day back', async () => {
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        const before = await rowsOf(env);
        await env.w.run('INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, danh_gia_2026) VALUES (?, ?, ?, ?, ?, ?)', [DATE, 'BG_NEW', HUONG_TRA, 'BCVH Hương Trà', '53547001', 'Đạt']);
        // a trigger that makes the third inserted row fail, after the day's rows were already deleted
        await env.w.run(`CREATE TRIGGER fail_third BEFORE INSERT ON f13_cause_parcel WHEN NEW.ma_bg = 'BG_NOROUTE' BEGIN SELECT RAISE(ABORT, 'insert refused'); END`);
        await assert.rejects(env.builder.buildDay(DATE), /insert refused/);
        await env.w.run('DROP TRIGGER fail_third');
        assert.deepEqual(await rowsOf(env), before);
        assert.equal((await env.w.get('SELECT state FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE])).state, 'STALE');
    } finally { await env.close(); }
});

// ---- (f) re-import ----------------------------------------------------------------------------------------------------------------------

test('(f) a re-imported day with a parcel that changed BCVH and route, one that disappeared and a new one leaves no orphan row', async () => {
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        const signatureBefore = (await env.w.get('SELECT input_signature FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE])).input_signature;
        // the import replaces the day's rows (delete + insert)
        await env.w.run('DELETE FROM fact_f13 WHERE ngay_do_kiem = ?', [DATE]);
        await insert(env.w, 'fact_f13', f13Row(DATE, 'BG_DAT', { ma_bcvh: HUONG_TRA, ten_bcvh: 'BCVH Hương Trà', ma_tuyen: '53547010' })); // BCVH and route changed, now a confirmed code
        await insert(env.w, 'fact_f13', f13Row(DATE, 'BG_NOF41', { danh_gia_2026: 'Không đạt' }));
        await insert(env.w, 'fact_f13', f13Row(DATE, 'BG_BRAND_NEW'));
        // BG_LATE, BG_PICKUP, BG_NOROUTE disappeared

        const selected = await env.builder.selectDays(DATE, DATE, 'build');
        assert.deepEqual(selected, [DATE], 'the changed signature must mark the day for a rebuild');

        await env.builder.buildDay(DATE);
        const rows = await rowsOf(env);
        assert.deepEqual(rows.map((r) => r.ma_bg), ['BG_BRAND_NEW', 'BG_DAT', 'BG_NOF41']);
        const moved = rows.find((r) => r.ma_bg === 'BG_DAT');
        assert.equal(moved.ma_bcvh, HUONG_TRA);
        assert.equal(moved.route_scope, 'NON_POSTMAN');
        assert.equal((await env.w.get(`SELECT COUNT(*) AS c FROM f13_cause_parcel WHERE ngay_do_kiem = ? AND ma_bcvh = ?`, [DATE, HUONG_THUY])).c, 2);
        assert.equal((await env.w.get('SELECT COUNT(*) AS c FROM f13_cause_parcel')).c, 3);
        assert.notEqual((await env.w.get('SELECT input_signature FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE])).input_signature, signatureBefore);
        assert.deepEqual(await env.builder.selectDays(DATE, DATE, 'build'), [], 'a fresh day must not be selected again');
    } finally { await env.close(); }
});

test('(f) a day whose F1.3 rows are all gone is rebuilt to zero rows', async () => {
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        await env.w.run('DELETE FROM fact_f13 WHERE ngay_do_kiem = ?', [DATE]);
        const outcome = await env.builder.run({ from: DATE, to: DATE, mode: 'build' });
        assert.equal(outcome.status, 'DONE');
        assert.deepEqual(await rowsOf(env), []);
        assert.equal((await env.w.get('SELECT row_count FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE])).row_count, 0);
    } finally { await env.close(); }
});

// ---- windows and signature --------------------------------------------------------------------------------------------------------------

test('the builder takes its window from the constants exported by JourneyService, and they are the ones the service reads', async () => {
    assert.equal(builderModule.DAYS_BEFORE, DAYS_BEFORE);
    assert.equal(builderModule.DAYS_AFTER, DAYS_AFTER);
    assert.equal(builderModule.BF_EXTRA_DAYS, BF_EXTRA_DAYS);
    assert.deepEqual(windowFor(DATE), { from: shiftIsoDate(DATE, -DAYS_BEFORE), to: shiftIsoDate(DATE, DAYS_AFTER), bfTo: shiftIsoDate(DATE, DAYS_AFTER + BF_EXTRA_DAYS) });

    const seen = {};
    const service = new JourneyService({
        repository: {
            getF13Parcels: async () => [], getF11Departures: async () => [],
            getF41Arrivals: async (from, to) => { seen.f41 = [from, to]; return []; },
            getF42Handovers: async (from, to) => { seen.f42 = [from, to]; return []; },
            getBfLots: async (from, to) => { seen.bf = [from, to]; return []; },
            getF13LotScans: async (from, to) => { seen.f13 = [from, to]; return []; },
        },
    });
    await service._parcels(DATE);
    const window = windowFor(DATE);
    assert.deepEqual(seen.f41, [window.from, window.to]);
    assert.deepEqual(seen.f42, [window.from, window.to]);
    assert.deepEqual(seen.f13, [window.from, window.to]);
    assert.deepEqual(seen.bf, [window.from, window.bfTo]);
});

test('signature: moves with an insert, a delete and a delete-and-reinsert inside the window; ignores rows outside it', async () => {
    const env = await makeEnv();
    try {
        const sign = () => env.builder.computeSignature(DATE);
        const base = await sign();
        assert.equal(await sign(), base);
        const w = windowFor(DATE);

        // F4.2 at the edges of the window: inside moves it, one day outside does not
        await insert(env.w, 'fact_f42', { ma_bg: 'X1', ngay_do_kiem: shiftIsoDate(w.to, 1), ma_buu_ta: 'P', ten_buu_ta: 'P', thoi_gian_gbt: '2026-10-30 10:00:00' });
        assert.equal(await sign(), base, 'a row one day after the window moved the signature');
        await insert(env.w, 'fact_f42', { ma_bg: 'X2', ngay_do_kiem: w.to, ma_buu_ta: 'P', ten_buu_ta: 'P', thoi_gian_gbt: '2026-10-30 10:00:00' });
        const afterInsert = await sign();
        assert.notEqual(afterInsert, base);
        await insert(env.w, 'fact_f42', { ma_bg: 'X3', ngay_do_kiem: shiftIsoDate(w.from, -1), ma_buu_ta: 'P', ten_buu_ta: 'P', thoi_gian_gbt: '2026-10-17 10:00:00' });
        assert.equal(await sign(), afterInsert, 'a row one day before the window moved the signature');

        // BF Phát reaches one day further (D+6)
        await insert(env.w, 'fact_bf_phat', { ngay_bf: shiftIsoDate(w.bfTo, 1), lading_code: 'Y', ma_lo: 'L' });
        assert.equal(await sign(), afterInsert);
        await insert(env.w, 'fact_bf_phat', { ngay_bf: w.bfTo, lading_code: 'Y', ma_lo: 'L' });
        const afterBf = await sign();
        assert.notEqual(afterBf, afterInsert);

        // delete + reinsert with the same count changes MAX(id)
        const one = await env.w.get('SELECT * FROM fact_f41 LIMIT 1');
        await env.w.run('DELETE FROM fact_f41 WHERE id = ?', [one.id]);
        const { id, ...rest } = one;
        await insert(env.w, 'fact_f41', rest);
        assert.notEqual(await sign(), afterBf);

        // F1.3 and F1.1 are covered too
        const beforeF11 = await sign();
        await insert(env.w, 'fact_f11', { ngay_do_kiem: DATE, so_bd10_dong_di_kttinh: 'B1', thoi_gian_bd10_dong_di_kttinh: '2026-10-28 06:00:00' });
        assert.notEqual(await sign(), beforeF11);
        const beforeF13 = await sign();
        await insert(env.w, 'fact_f13', f13Row(shiftIsoDate(DATE, -3), 'OLDER')); // another day's lot scan inside the window
        assert.notEqual(await sign(), beforeF13);
    } finally { await env.close(); }
});

test('classifier version: stable SHA-256; a different version makes a fresh day selected again', async () => {
    const version = computeClassifierVersion();
    assert.match(version, /^[0-9a-f]{64}$/);
    assert.equal(computeClassifierVersion(), version);
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        assert.deepEqual(await env.builder.selectDays(DATE, DATE, 'build'), []);
        const other = new CauseAggBuilder({ db: env.writer, journeyService: env.service, classifierVersion: 'another-version', now: FIXED_NOW, logger: env.quiet });
        assert.deepEqual(await other.selectDays(DATE, DATE, 'build'), [DATE]);
    } finally { await env.close(); }
});

// ---- run log, lock ---------------------------------------------------------------------------------------------------------------------

test('build takes only missing or stale days; rebuild takes all; the run is logged with heartbeat and counts', async () => {
    const env = await makeEnv();
    try {
        const d2 = '2026-10-29';
        await seed(env.w, d2);
        const first = await env.builder.run({ from: DATE, to: d2, mode: 'build', trigger: 'test' });
        assert.equal(first.status, 'DONE');
        assert.equal(first.daysDone, 2);
        assert.deepEqual((await env.builder.run({ from: DATE, to: d2, mode: 'build' })).results, []);
        const all = await env.builder.run({ from: DATE, to: d2, mode: 'rebuild' });
        assert.equal(all.daysDone, 2);
        const log = await env.w.all('SELECT * FROM f13_cause_run ORDER BY id');
        assert.equal(log.length, 3);
        assert.equal(log[0].trigger_source, 'test');
        assert.equal(log[0].from_day, DATE);
        assert.equal(log[0].to_day, d2);
        assert.ok(log[0].started_at && log[0].heartbeat_at && log[0].ended_at);
        assert.deepEqual(log.map((r) => r.status), ['DONE', 'DONE', 'DONE']);
    } finally { await env.close(); }
});

test('a day that keeps failing is retried three times and the run ends FAILED', async () => {
    const env = await makeEnv();
    try {
        let attempts = 0;
        env.service._parcels = async () => { attempts += 1; throw new Error('always'); };
        const outcome = await env.builder.run({ from: DATE, to: DATE, mode: 'build' });
        assert.equal(attempts, 3);
        assert.equal(outcome.status, 'FAILED');
        assert.equal((await env.w.get('SELECT state FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE])).state, 'STALE');
    } finally { await env.close(); }
});

test('a run whose heartbeat is older than 15 minutes is marked ABANDONED by the next run', async () => {
    const env = await makeEnv();
    try {
        await env.w.run(`INSERT INTO f13_cause_run (trigger_source, from_day, to_day, started_at, heartbeat_at, status) VALUES ('old', ?, ?, '2026-11-05T06:00:00.000Z', '2026-11-05T06:30:00.000Z', 'RUNNING')`, [DATE, DATE]);
        await env.w.run(`INSERT INTO f13_cause_run (trigger_source, from_day, to_day, started_at, heartbeat_at, status) VALUES ('recent', ?, ?, '2026-11-05T07:50:00.000Z', '2026-11-05T07:55:00.000Z', 'RUNNING')`, [DATE, DATE]);
        await env.builder.run({ from: DATE, to: DATE, mode: 'build' });
        const statuses = (await env.w.all('SELECT trigger_source, status FROM f13_cause_run ORDER BY id')).map((r) => `${r.trigger_source}:${r.status}`);
        assert.deepEqual(statuses.slice(0, 2), ['old:ABANDONED', 'recent:RUNNING']);
    } finally { await env.close(); }
});

test('a second request while a run is active joins it: builds never overlap and the extra days are built', async () => {
    const env = await makeEnv();
    try {
        const d2 = '2026-10-29';
        await seed(env.w, d2);
        let inside = 0;
        let maxInside = 0;
        const original = env.service._parcels.bind(env.service);
        env.service._parcels = async (...args) => {
            inside += 1;
            maxInside = Math.max(maxInside, inside);
            await new Promise((resolve) => setTimeout(resolve, 20));
            try { return await original(...args); } finally { inside -= 1; }
        };
        const first = env.builder.run({ from: DATE, to: DATE, mode: 'build' });
        const second = env.builder.run({ from: d2, to: d2, mode: 'build' });
        const [a, b] = await Promise.all([first, second]);
        assert.equal(maxInside, 1);
        assert.equal(b.joined, true);
        assert.equal(a.runId, b.runId);
        assert.equal((await env.w.get('SELECT COUNT(*) AS c FROM f13_cause_run')).c, 1);
        assert.equal((await env.w.get(`SELECT COUNT(*) AS c FROM f13_cause_day WHERE state = 'FRESH'`)).c, 2);
    } finally { await env.close(); }
});

// ---- (e) verify ------------------------------------------------------------------------------------------------------------------------

async function fillAgg(env, days) {
    await env.w.run('BEGIN IMMEDIATE');
    for (const day of days) await rebuildAggForDate(env.w.run, env.w.get, 'F1.3', day);
    await env.w.run('COMMIT');
}

test('(e) verify reports 0 differences after a build; the non-canonical unit is reported apart, never as a difference', async () => {
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        await fillAgg(env, [DATE]);
        const result = await verifyRange(env.w, { from: DATE, to: DATE, canonicalCodes: CODES });
        assert.deepEqual(result.differences, []);
        assert.equal(result.ok, true);
        assert.deepEqual(result.totals.table, { n_rows: 5, n_dat: 2, n_khong_dat: 2, n_blank: 1 });
        assert.deepEqual(result.totals.table, result.totals.fact);
        assert.deepEqual(result.totals.table, result.totals.agg);
        assert.deepEqual(result.otherUnits, { rows: 1, days: 1 });
        assert.equal(result.aggChecked, true);
    } finally { await env.close(); }
});

test('(e) verify reports a difference per day and BCVH when the table, fact or agg disagree, and changes nothing', async () => {
    const env = await makeEnv();
    try {
        await env.builder.buildDay(DATE);
        await fillAgg(env, [DATE]);
        const before = await rowsOf(env);

        await env.w.run(`DELETE FROM f13_cause_parcel WHERE ma_bg = 'BG_DAT'`);
        let result = await verifyRange(env.w, { from: DATE, to: DATE, canonicalCodes: CODES });
        assert.equal(result.ok, false);
        assert.ok(result.differences.some((line) => line.startsWith(`${DATE}|${HUONG_THUY}:`) && line.includes('fact_f13')));
        assert.ok(result.differences.some((line) => line.includes('agg_f13_day')));
        assert.equal((await rowsOf(env)).length, before.length - 1, 'verify must not correct anything');

        await env.builder.buildDay(DATE);
        await env.w.run(`UPDATE agg_f13_day SET n_dat = n_dat + 1 WHERE ma_bcvh = ?`, [THUAN_HOA]);
        result = await verifyRange(env.w, { from: DATE, to: DATE, canonicalCodes: CODES });
        assert.equal(result.ok, false);
        assert.ok(result.differences.every((line) => line.includes(THUAN_HOA) && line.includes('agg_f13_day')));

        await env.w.run(`UPDATE agg_f13_day SET n_dat = n_dat - 1 WHERE ma_bcvh = ?`, [THUAN_HOA]);
        await env.w.run(`UPDATE fact_f13 SET danh_gia_2026 = 'Không đạt' WHERE ma_bg = 'BG_DAT'`);
        result = await verifyRange(env.w, { from: DATE, to: DATE, canonicalCodes: CODES });
        assert.equal(result.ok, false);
    } finally { await env.close(); }
});

test('(e) a day that has fact rows but was never built is a difference; a day not FRESH is listed', async () => {
    const env = await makeEnv();
    try {
        await fillAgg(env, [DATE]);
        let result = await verifyRange(env.w, { from: DATE, to: DATE, canonicalCodes: CODES });
        assert.equal(result.ok, false);
        assert.ok(result.differences.every((line) => line.includes('table none')));
        await env.builder.buildDay(DATE);
        await env.w.run(`UPDATE f13_cause_day SET state = 'STALE' WHERE ngay_do_kiem = ?`, [DATE]);
        result = await verifyRange(env.w, { from: DATE, to: DATE, canonicalCodes: CODES });
        assert.equal(result.ok, true);
        assert.deepEqual(result.notFresh, [DATE]);
    } finally { await env.close(); }
});

test('the table has exactly the columns of the Design of Record section 5 (plus provenance)', () => {
    assert.deepEqual(ROW_COLUMNS, [
        'ngay_do_kiem', 'ma_bg', 'ma_bcvh', 'ma_tuyen', 'route_scope', 'ma_buu_ta_first', 'ten_buu_ta_first', 'ma_buu_ta_shown', 'ten_buu_ta_shown',
        'danh_gia', 'cause_code', 'cause_status', 'cause_step', 'flags', 'hints', 'ma_lo', 'khong_tron_lo', 'limit_ms', 'tct_ms', 'l_ms', 'r_ms',
        'built_at', 'classifier_version', 'cause_detail', 'cause_reason', 'remaining_at_arrival_ms', 'a_source', 'basis',
        'leg_tms_depart_ms', 'leg_depart_arrive_ms', 'leg_tms_arrive_ms', 'leg_arrive_gbt_ms', 'leg_gbt_ptc_ms', 'leg_tms_ptc_ms',
    ]);
});
