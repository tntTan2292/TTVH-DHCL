'use strict';

// F13-WHY-AGG-01 Phase 3: refresh runner, import hook, resume, read-time freshness, shadow comparison (helpers copied from the P1 suite). Every test uses its own temporary SQLite file, never the operational database.

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
const { CauseRefresh, affectedRange, isEnabled, openWriter, notifySourceImported, SWITCH_ENV, SOURCE_TABLES } = require('./CauseRefresh');
const { CauseAggQueryService } = require('./CauseAggQueryService');

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
const quiet = { log() {}, error() {} };
const ON = { [SWITCH_ENV]: 'on' };
const OFF = {};

async function makeRefresh(env, { env: switchEnv = ON, sharedDb = { shared: true }, openWriterFn = (file) => openWriter(file) } = {}) {
    let writerSeen = null;
    const refresh = new CauseRefresh({
        dbPath: env.file, sharedDb, openWriterFn, env: switchEnv, debounceMs: 5, sleep: async () => {}, now: FIXED_NOW, logger: quiet,
        isImportActive: () => false,
        makeBuilder: ({ writer, quietGate }) => {
            writerSeen = writer;
            return new CauseAggBuilder({ db: writer, journeyService: env.service, now: FIXED_NOW, sleep: async () => {}, logger: quiet, quietGate });
        },
    });
    return { refresh, writerSeen: () => writerSeen };
}

// ---- (a) window arithmetic -------------------------------------------------------------------------------------------------------------

test('(a) the window constants are the ones of JourneyService, with the values the Design records (5, 10, BF +1)', () => {
    assert.equal(DAYS_BEFORE, 10);
    assert.equal(DAYS_AFTER, 5);
    assert.equal(BF_EXTRA_DAYS, 1);
    assert.deepEqual(affectedRange('2026-10-25', 'fact_f13'), { from: '2026-10-20', to: '2026-11-04' });
    assert.deepEqual(affectedRange('2026-10-25', 'fact_bf_phat'), { from: '2026-10-19', to: '2026-11-04' });
    for (const table of ['fact_f13', 'fact_f41', 'fact_f42', 'fact_f11']) {
        assert.deepEqual(affectedRange('2026-03-01', table), { from: shiftIsoDate('2026-03-01', -DAYS_AFTER), to: shiftIsoDate('2026-03-01', DAYS_BEFORE) });
    }
    assert.deepEqual(SOURCE_TABLES, ['fact_f13', 'fact_f41', 'fact_f42', 'fact_f11', 'fact_bf_phat']);
});

test('(a) the marked days are exactly the days whose signature moves when a source row of day X changes (every source table)', async () => {
    const env = await makeEnv({ seedDay: false });
    try {
        const X = '2026-10-25';
        const days = [];
        for (let offset = -25; offset <= 25; offset += 1) days.push(shiftIsoDate(X, offset));
        const cases = [
            ['fact_f13', { ngay_do_kiem: X, ma_bg: 'N1', ma_bcvh: HUONG_THUY, danh_gia_2026: 'Đạt' }],
            ['fact_f41', { ma_bg: 'N1', ngay_do_kiem: X }],
            ['fact_f42', { ma_bg: 'N1', ngay_do_kiem: X }],
            ['fact_f11', { ngay_do_kiem: X }],
            ['fact_bf_phat', { ngay_bf: X, lading_code: 'N1', ma_lo: 'L' }],
        ];
        for (const [table, row] of cases) {
            const before = new Map();
            for (const day of days) before.set(day, await env.builder.computeSignature(day));
            await insert(env.w, table, row);
            const moved = [];
            for (const day of days) if (await env.builder.computeSignature(day) !== before.get(day)) moved.push(day);
            const range = affectedRange(X, table);
            assert.deepEqual([moved[0], moved[moved.length - 1], moved.length], [range.from, range.to, 16 + (table === 'fact_bf_phat' ? 1 : 0)], table);
        }
    } finally { await env.close(); }
});

test('(a) an import of day X marks X-5..X+10 STALE and a run rebuilds the stale and the new days (log: trigger import)', async () => {
    const env = await makeEnv();
    try {
        for (const day of ['2026-10-26', '2026-11-20']) await seed(env.w, day);
        await env.builder.run({ from: '2026-10-20', to: '2026-11-30', mode: 'build' });
        assert.equal((await env.w.get("SELECT COUNT(*) AS n FROM f13_cause_day WHERE state = 'FRESH'")).n, 3);
        // the import of 26/10: a delete-and-reinsert of one F1.3 row
        await env.w.run("DELETE FROM fact_f13 WHERE ngay_do_kiem = '2026-10-26' AND ma_bg = 'BG_DAT'");
        await insert(env.w, 'fact_f13', f13Row('2026-10-26', 'BG_DAT', { danh_gia_2026: 'Không đạt' }));
        const { refresh } = await makeRefresh(env);
        const hook = refresh.afterImport({ table: 'fact_f13', date: '2026-10-26' });
        assert.deepEqual([hook.enqueued, hook.from, hook.to], [true, '2026-10-21', '2026-11-05']);
        const outcome = await refresh.flush();
        assert.equal(outcome.status, 'DONE');
        assert.deepEqual(outcome.results.map((r) => r.date).sort(), ['2026-10-26', '2026-10-28']); // days with data in the window whose signature moved
        const run = await env.w.get("SELECT * FROM f13_cause_run WHERE trigger_source = 'import'");
        assert.deepEqual([run.from_day, run.to_day, run.status, run.days_done], ['2026-10-21', '2026-11-05', 'DONE', 2]);
        assert.equal((await env.w.get("SELECT COUNT(*) AS n FROM f13_cause_day WHERE state = 'FRESH'")).n, 3); // 20/11 untouched
        await refresh.close();
    } finally { await env.close(); }
});

test('several imports inside the debounce are merged into one range and one run', async () => {
    const env = await makeEnv();
    try {
        const { refresh } = await makeRefresh(env);
        refresh.afterImport({ table: 'fact_f13', date: '2026-10-28' });
        refresh.afterImport({ table: 'fact_bf_phat', date: '2026-10-26' });
        refresh.afterImport({ table: 'fact_f41', date: '2026-10-30' });
        assert.deepEqual(refresh.pending, { from: '2026-10-20', to: '2026-11-09', sources: 3 });
        clearTimeout(refresh.timer);
        refresh.timer = null;
        await refresh.flush();
        assert.equal((await env.w.get('SELECT COUNT(*) AS n FROM f13_cause_run')).n, 1);
        await refresh.close();
    } finally { await env.close(); }
});

// ---- (b) single run, joined days logged ---------------------------------------------------------------------------------------------------

test('(b) a request while a run is active joins it (never parallel) and the run log records the joined days (P1-R2)', async () => {
    const env = await makeEnv();
    try {
        const extra = '2026-10-29';
        await seed(env.w, extra);
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        let concurrent = 0;
        let maxConcurrent = 0;
        const original = env.service._parcels.bind(env.service);
        env.service._parcels = async (date) => { concurrent += 1; maxConcurrent = Math.max(maxConcurrent, concurrent); await gate; try { return await original(date); } finally { concurrent -= 1; } };
        const first = env.builder.run({ from: DATE, to: DATE, mode: 'build', trigger: 'import' });
        await new Promise((resolve) => setTimeout(resolve, 30));
        const second = env.builder.run({ from: extra, to: extra, mode: 'build', trigger: 'import' });
        await new Promise((resolve) => setTimeout(resolve, 30));
        release();
        const [a, b] = await Promise.all([first, second]);
        assert.equal(maxConcurrent, 1);
        assert.equal(b.joined, true);
        assert.equal(a.runId, b.runId);
        assert.deepEqual([a.daysDone, a.daysJoined], [2, 1]);
        const runs = await env.w.all('SELECT * FROM f13_cause_run');
        assert.equal(runs.length, 1);
        assert.deepEqual([runs[0].days_done, runs[0].days_joined, runs[0].from_day, runs[0].to_day], [2, 1, DATE, DATE]);
    } finally { await env.close(); }
});

test('the schema migration adds days_joined to a run table created before P3, additively and idempotently', async () => {
    const file = path.join(os.tmpdir(), `f13-cause-mig-${Date.now()}.sqlite`);
    try {
        const db = await open(file);
        const h = helpersOf(db);
        await h.run(`CREATE TABLE f13_cause_run (id INTEGER PRIMARY KEY AUTOINCREMENT, trigger_source TEXT NOT NULL, from_day TEXT, to_day TEXT, days_done INTEGER NOT NULL DEFAULT 0,
            days_failed INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL, heartbeat_at TEXT NOT NULL, ended_at TEXT, status TEXT NOT NULL, last_error TEXT)`);
        await h.run("INSERT INTO f13_cause_run (trigger_source, started_at, heartbeat_at, status) VALUES ('manual', 'a', 'a', 'DONE')");
        await new Promise((resolve) => db.close(resolve));
        await applyF13WhyAgg01Schema(file);
        await applyF13WhyAgg01Schema(file);
        const check = await open(file);
        const rows = await helpersOf(check).all('SELECT * FROM f13_cause_run');
        await new Promise((resolve) => check.close(resolve));
        assert.equal(rows.length, 1);
        assert.equal(rows[0].days_joined, 0);
    } finally { for (const suffix of ['', '-wal', '-shm', '-journal']) fs.rmSync(file + suffix, { force: true }); }
});

// ---- (c) crash and restart resume ----------------------------------------------------------------------------------------------------------

test('(c) after a crash (a BUILDING day, a STALE day, a day never built, a run left RUNNING) the startup resume builds all of them', async () => {
    const env = await makeEnv();
    try {
        for (const day of ['2026-10-26', '2026-10-27']) await seed(env.w, day);
        await env.builder.run({ from: DATE, to: DATE, mode: 'build' });
        // crash picture: 28/10 was being rebuilt, 27/10 failed earlier, 26/10 was never built, a run is left RUNNING with an old heartbeat
        await env.w.run("UPDATE f13_cause_day SET state = 'BUILDING' WHERE ngay_do_kiem = ?", [DATE]);
        await env.builder._upsertDay('2026-10-27', { state: 'STALE', error: 'boom', keepSignature: true });
        await env.w.run("INSERT INTO f13_cause_run (trigger_source, from_day, to_day, started_at, heartbeat_at, status) VALUES ('import', ?, ?, '2026-11-05T06:00:00.000Z', '2026-11-05T06:00:00.000Z', 'RUNNING')", [DATE, DATE]);
        const restarted = await makeRefresh(env); // a new process: new refresh, new writer, new builder
        const result = await restarted.refresh.resumeOnStartup();
        assert.equal(result.started, true);
        assert.equal(result.status, 'DONE');
        const states = await env.w.all('SELECT ngay_do_kiem AS d, state FROM f13_cause_day ORDER BY 1');
        assert.deepEqual(states.map((row) => [row.d, row.state]), [['2026-10-26', 'FRESH'], ['2026-10-27', 'FRESH'], [DATE, 'FRESH']]);
        assert.equal((await env.w.get("SELECT status FROM f13_cause_run WHERE trigger_source = 'import'")).status, 'ABANDONED');
        assert.equal((await env.w.get("SELECT trigger_source FROM f13_cause_run WHERE trigger_source = 'startup'")).trigger_source, 'startup');
        await restarted.refresh.close();
    } finally { await env.close(); }
});

// ---- (d) read-time freshness ---------------------------------------------------------------------------------------------------------------

test('(d) freshness is computed at read time: a moved signature or an old classifier version is stale, never complete; the signature is cached 60 s', async () => {
    const env = await makeEnv();
    try {
        await env.builder.run({ from: DATE, to: DATE, mode: 'build' });
        let clock = 1_000_000;
        const reader = new CauseAggQueryService({ db: env.reader, classifierVersion: env.builder.classifierVersion, now: () => clock });
        const period = { from: DATE, to: DATE };
        let freshness = await reader.freshness(period);
        assert.deepEqual([freshness.complete, freshness.stale_days, freshness.check], [true, [], 'SIGNATURE']);
        // an import lands (delete + reinsert): the stored FRESH flag is still there, the answer is cached for 60 s ...
        await env.w.run("DELETE FROM fact_f13 WHERE ma_bg = 'BG_DAT'");
        await insert(env.w, 'fact_f13', f13Row(DATE, 'BG_DAT'));
        clock += 30_000;
        assert.equal((await reader.freshness(period)).complete, true, 'inside the 60 s cache the previous answer stands');
        clock += 31_000;
        freshness = await reader.freshness(period);
        assert.deepEqual([freshness.complete, freshness.stale_days, freshness.stale_reasons[DATE]], [false, [DATE], 'SIGNATURE_MOVED']);
        // the day is rebuilt: complete again
        await env.builder.run({ from: DATE, to: DATE, mode: 'build' });
        clock += 61_000;
        assert.equal((await reader.freshness(period)).complete, true);
        // a source row inside the day's window but on another day also moves it
        await insert(env.w, 'fact_f41', { ma_bg: 'LATER', ngay_do_kiem: shiftIsoDate(DATE, 4) });
        clock += 61_000;
        freshness = await reader.freshness(period);
        assert.deepEqual([freshness.complete, freshness.stale_reasons[DATE]], [false, 'SIGNATURE_MOVED']);
    } finally { await env.close(); }
});

test('(d) a stale (stored), a building and a never-built day are reported, never as complete', async () => {
    const env = await makeEnv();
    try {
        await seed(env.w, '2026-10-27');
        await seed(env.w, '2026-10-26');
        await env.builder.run({ from: '2026-10-26', to: DATE, mode: 'build' });
        await env.builder._upsertDay('2026-10-26', { state: 'STALE', error: 'boom', keepSignature: true });
        await env.w.run("UPDATE f13_cause_day SET state = 'BUILDING' WHERE ngay_do_kiem = '2026-10-27'");
        await env.w.run('DELETE FROM f13_cause_day WHERE ngay_do_kiem = ?', [DATE]);
        const reader = new CauseAggQueryService({ db: env.reader, classifierVersion: env.builder.classifierVersion });
        const f = await reader.freshness({ from: '2026-10-26', to: DATE });
        assert.deepEqual([f.complete, f.stale_days, f.building_days, f.missing_days], [false, ['2026-10-26'], ['2026-10-27'], [DATE]]);
        assert.equal(f.stale_reasons['2026-10-26'], 'STORED_STALE');
    } finally { await env.close(); }
});

// ---- (e) classifier version ----------------------------------------------------------------------------------------------------------------

test('(e) a classifier-version change marks every built day stale for the reader and selects every day for the next build', async () => {
    const env = await makeEnv();
    try {
        await seed(env.w, '2026-10-27');
        await env.builder.run({ from: '2026-10-27', to: DATE, mode: 'build' });
        const same = new CauseAggQueryService({ db: env.reader, classifierVersion: env.builder.classifierVersion });
        assert.equal((await same.freshness({ from: '2026-10-27', to: DATE })).complete, true);
        const changed = new CauseAggQueryService({ db: env.reader, classifierVersion: 'a-new-version' });
        const f = await changed.freshness({ from: '2026-10-27', to: DATE });
        assert.deepEqual([f.complete, f.stale_days, Object.values(f.stale_reasons)], [false, ['2026-10-27', DATE], ['CLASSIFIER_VERSION', 'CLASSIFIER_VERSION']]);
        const next = new CauseAggBuilder({ db: env.writer, journeyService: env.service, classifierVersion: 'a-new-version', now: FIXED_NOW, sleep: async () => {}, logger: quiet });
        assert.deepEqual(await next.selectDays('2026-10-27', DATE, 'build'), ['2026-10-27', DATE]);
        assert.deepEqual(await env.builder.selectDays('2026-10-27', DATE, 'build'), []);
    } finally { await env.close(); }
});

// ---- (f) shadow comparison ----------------------------------------------------------------------------------------------------------------

test('(f) the shadow comparison against the on-the-fly path finds 0 differences after a build and sees a tampered, missing or extra row', async () => {
    const env = await makeEnv();
    try {
        await env.builder.run({ from: DATE, to: DATE, mode: 'build' });
        const clean = await env.builder.compareDay(DATE);
        assert.deepEqual([clean.differences.length, clean.rows, clean.stored], [0, 5, 5]);
        await env.w.run("UPDATE f13_cause_parcel SET cause_code = 'KHAI_THAC' WHERE ma_bg = 'BG_LATE'");
        await env.w.run("DELETE FROM f13_cause_parcel WHERE ma_bg = 'BG_DAT'");
        await env.w.run("INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, route_scope, cause_status, built_at, classifier_version) VALUES (?, 'GHOST', ?, 'OTHER', 'KHONG_PHAN_TICH', 'x', 'x')", [DATE, HUONG_THUY]);
        const dirty = await env.builder.compareDay(DATE);
        assert.deepEqual(dirty.differences.map((d) => `${d.ma_bg}:${d.field}`).sort(), ['BG_DAT:(missing row)', 'BG_LATE:cause_code', 'GHOST:(extra row)']);
    } finally { await env.close(); }
});

// ---- P1-R1: its own writer connection ------------------------------------------------------------------------------------------------------

test('P1-R1: the builder runs on its own writer connection with busy_timeout, never the shared connection or the reader', async () => {
    const env = await makeEnv();
    try {
        const shared = env.reader; // plays the shared config/db connection
        const { refresh, writerSeen } = await makeRefresh(env, { sharedDb: shared });
        assert.equal(await refresh.flush(), null); // nothing pending: no connection opened
        assert.equal(writerSeen(), null);
        refresh.afterImport({ table: 'fact_f13', date: DATE });
        clearTimeout(refresh.timer);
        refresh.timer = null;
        await refresh.flush();
        const writer = writerSeen();
        assert.ok(writer && writer !== shared && writer !== env.writer && writer !== env.reader);
        assert.equal((await helpersOf(writer).get('PRAGMA busy_timeout')).timeout, 60000);
        await refresh.close();
        // an opener that hands back the shared connection is refused
        const bad = (await makeRefresh(env, { sharedDb: shared, openWriterFn: async () => shared })).refresh;
        bad.afterImport({ table: 'fact_f13', date: DATE });
        clearTimeout(bad.timer);
        bad.timer = null;
        await assert.rejects(() => bad.flush(), /must not use the shared/);
    } finally { await env.close(); }
});

test('the default writer opener returns a new Database with busy_timeout each call', async () => {
    const env = await makeEnv({ seedDay: false });
    try {
        const one = await openWriter(env.file);
        const two = await openWriter(env.file);
        assert.notEqual(one, two);
        assert.equal((await helpersOf(one).get('PRAGMA busy_timeout')).timeout, 60000);
        await new Promise((resolve) => one.close(resolve));
        await new Promise((resolve) => two.close(resolve));
    } finally { await env.close(); }
});

test('the builder waits for the quiet gate (no import transaction open) before every day', async () => {
    const env = await makeEnv();
    try {
        await seed(env.w, '2026-10-27');
        let calls = 0;
        const gated = new CauseAggBuilder({ db: env.writer, journeyService: env.service, now: FIXED_NOW, sleep: async () => {}, logger: quiet, quietGate: async () => { calls += 1; } });
        await gated.run({ from: '2026-10-27', to: DATE, mode: 'rebuild' });
        assert.equal(calls, 2);
    } finally { await env.close(); }
});

// ---- the switch ----------------------------------------------------------------------------------------------------------------------------

test('the switch is OFF by default and only on/1/true/yes turn it on', () => {
    assert.equal(isEnabled({}), false);
    for (const value of ['', 'off', '0', 'false', 'no', 'maybe']) assert.equal(isEnabled({ [SWITCH_ENV]: value }), false, value);
    for (const value of ['on', 'ON', '1', 'true', 'yes']) assert.equal(isEnabled({ [SWITCH_ENV]: value }), true, value);
});

test('switch off: the import hook and the startup resume build nothing, open no connection, write no row, start no timer', async () => {
    const env = await makeEnv();
    try {
        let opened = 0;
        const { refresh } = await makeRefresh(env, { env: OFF, openWriterFn: async (file) => { opened += 1; return openWriter(file); } });
        for (const table of SOURCE_TABLES) assert.deepEqual(refresh.afterImport({ table, date: DATE }), { enqueued: false, reason: 'DISABLED' });
        assert.equal(refresh.pending, null);
        assert.equal(refresh.timer, null);
        assert.deepEqual(await refresh.resumeOnStartup(), { started: false, reason: 'DISABLED' });
        assert.equal(await refresh.flush(), null);
        await new Promise((resolve) => setTimeout(resolve, 30));
        assert.equal(opened, 0);
        for (const table of ['f13_cause_parcel', 'f13_cause_day', 'f13_cause_run']) assert.equal((await env.w.get(`SELECT COUNT(*) AS n FROM ${table}`)).n, 0, table);
        // the module-level hook used by the import code is a no-op as well, and never throws
        const saved = process.env[SWITCH_ENV];
        delete process.env[SWITCH_ENV];
        try { assert.deepEqual(notifySourceImported('fact_f13', DATE), { enqueued: false, reason: 'DISABLED' }); } finally { if (saved !== undefined) process.env[SWITCH_ENV] = saved; }
    } finally { await env.close(); }
});

test('switch on: the same hook builds (so the off test above is about the switch, not a broken hook)', async () => {
    const env = await makeEnv();
    try {
        const { refresh } = await makeRefresh(env, { env: ON });
        assert.equal(refresh.afterImport({ table: 'fact_f13', date: DATE }).enqueued, true);
        await new Promise((resolve) => setTimeout(resolve, 600));
        await refresh.idle;
        await refresh.close();
        assert.equal((await env.w.get('SELECT COUNT(*) AS n FROM f13_cause_parcel')).n, 5);
    } finally { await env.close(); }
});

test('every import hook and the startup resume sit behind the switch (source check of the import paths and server.js)', () => {
    const root = path.join(__dirname, '../..');
    const files = {
        'services/importProcessor.js': 4,
        'repositories/FactF41Repository.js': 1,
        'services/bfPhat/bfPhatImportService.js': 1,
        '../server.js': 1,
    };
    for (const [file, hooks] of Object.entries(files)) {
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        assert.ok(text.includes('QIS_F13_CAUSE_REFRESH'), `${file} reads the switch`);
        const calls = (text.match(/notifyCauseRefresh\('|notifySourceImported\('|resumeOnStartup\(/g) || []).length;
        assert.ok(calls >= hooks, `${file} has ${hooks} hook call(s), found ${calls}`);
    }
    assert.match(fs.readFileSync(path.join(root, 'services/importProcessor.js'), 'utf8'), /function notifyCauseRefresh[\s\S]{0,300}QIS_F13_CAUSE_REFRESH/);
});

// ---- P3-R1: one grouped query per source, windows derived in memory ------------------------------------------------------------------------

test('P3-R1: the grouped signatures equal the per-day signatures for every day of a range (gaps, deletes, reinserts, BF window, empty days)', async () => {
    const { computeDaySignature, computeSignaturesForDays, wrapDb } = builderModule;
    const env = await makeEnv({ seedDay: false });
    try {
        for (const day of ['2026-10-03', '2026-10-05', '2026-10-12', '2026-10-13', '2026-10-28']) await seed(env.w, day);
        await insert(env.w, 'fact_f11', { ngay_do_kiem: '2026-10-09' });
        await insert(env.w, 'fact_f13', f13Row('2026-10-12', 'EXTRA1'));
        await env.w.run("DELETE FROM fact_f41 WHERE ngay_do_kiem = '2026-10-05'");
        await insert(env.w, 'fact_f41', { ma_bg: 'RE', ngay_do_kiem: '2026-10-05' }); // delete + reinsert: a higher max id
        await insert(env.w, 'fact_bf_phat', { ngay_bf: '2026-10-20', lading_code: 'X', ma_lo: 'L' });
        const days = [];
        for (let offset = -12; offset <= 40; offset += 1) days.push(shiftIsoDate('2026-09-25', offset));
        const db = wrapDb(env.reader);
        const grouped = await computeSignaturesForDays(db, days);
        for (const day of days) assert.equal(grouped.get(day), await computeDaySignature(db, day), day);
        // a sparse subset (what the reader asks for) gives the same values
        const subset = ['2026-10-05', '2026-10-28', '2026-11-20'];
        const some = await computeSignaturesForDays(db, subset);
        for (const day of subset) assert.equal(some.get(day), grouped.get(day) ?? await computeDaySignature(db, day));
        assert.equal((await computeSignaturesForDays(db, [])).size, 0);
    } finally { await env.close(); }
});
