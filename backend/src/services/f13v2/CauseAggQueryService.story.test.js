'use strict';

// F13-WHY-NARRATIVE-02 B1: the `story` object on every row of /why/routes, on a small fixture added up by hand.
//   Thuận Hóa (A), 22/10:
//     R1  11 parcels: 9 failed Không trọn lô, all in lot LOT1 (PO example, 90 % of 10 rated); 1 Đạt; 1 unrated (stock).
//         2 failed carry DEN_BCVH_CON_IT_GIO; 2 parcels have a return in F4.2. LOT1 has 12 parcels in BF Phát: 9 scanned 07:00, 3 scanned 15:40 -> 2 batches, last 15:40.
//     R2  10 parcels: 5 failed = 3 Khai thác + 2 Phát (Phát chậm sau giao): main 60 %, second 40 %.
//     R3  10 parcels: 10 failed = 8 Khai thác + 2 Phát: second exactly 20 %.   R4  10 failed = 9 Khai thác + 1 Vận chuyển: no second.
//   Hương Thủy (B), 22/10: R5 4 parcels, 2 failed Khai thác, 1 return.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../../migrate_f13_why_agg_01_schema');
const { CauseAggQueryService } = require('./CauseAggQueryService');

const A = '533140';
const B = '536250';
const DAY = '2026-10-22';
const CITY = { bcvhId: null, allowedCodes: null, canSeeCity: true };
const ownScope = (code) => ({ bcvhId: code, allowedCodes: [code], canSeeCity: false });

let tmpDir;
let database;
let bareDatabase;
let service;
let seq = 0;

const open = (file) => new Promise((resolve, reject) => { const d = new sqlite3.Database(file, (e) => (e ? reject(e) : resolve(d))); });
const run = (db, sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, (e) => (e ? reject(e) : resolve())));
const exec = (db, sql) => new Promise((resolve, reject) => db.exec(sql, (e) => (e ? reject(e) : resolve())));

async function add(db, bcvh, route, o = {}) {
    seq += 1;
    const bg = o.bg || `BG${String(seq).padStart(5, '0')}`;
    await run(
        db,
        `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown,
            danh_gia, cause_code, cause_status, cause_step, flags, hints, ma_lo, khong_tron_lo, limit_ms, tct_ms, l_ms, r_ms, built_at, classifier_version, cause_detail)
         VALUES (?, ?, ?, ?, 'POSTMAN', 'P1', 'Tên P1', 'P1', 'Tên P1', ?, ?, ?, NULL, NULL, ?, ?, ?, 3600000, 7200000, 7200000, 0, '2026-11-05T00:00:00.000Z', 'v1', ?)`,
        [DAY, bg, bcvh, route, 'verdict' in o ? o.verdict : 'Đạt', o.cause ?? null, o.cause ? 'CAUSE' : 'KHONG_PHAN_TICH', o.hints ?? null, o.lot ?? null, o.cause === 'KHONG_TRON_LO' ? 1 : 0, o.detail ?? null],
    );
    return bg;
}
const failed = (cause, o = {}) => ({ verdict: 'Không đạt', cause, ...o });

async function createSchema(db, { withSources }) {
    await exec(db, `${F13_WHY_AGG_01_SCHEMA_SQL}
        CREATE TABLE fact_f13 (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_do_kiem TEXT, ma_bg TEXT, ma_bcvh TEXT, thoi_gian_bd10_quet_tms TEXT);
        CREATE TABLE agg_f13_day (ngay_do_kiem TEXT, ma_bcvh TEXT, ma_tuyen TEXT, ten_tuyen TEXT);`);
    if (withSources) {
        await exec(db, `CREATE TABLE fact_bf_phat (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_bf TEXT, lading_code TEXT, ma_lo TEXT);
            CREATE TABLE fact_f42 (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_do_kiem TEXT, ma_bg TEXT, thoi_gian_chuyen_hoan TEXT);`);
    }
}

test.before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-story-'));
    database = await open(path.join(tmpDir, 'story.sqlite'));
    await createSchema(database, { withSources: true });
    await run(database, 'BEGIN');
    // R1: the PO example
    const lotBgs = [];
    for (let i = 0; i < 9; i += 1) lotBgs.push(await add(database, A, 'R1', failed('KHONG_TRON_LO', { lot: 'LOT1', hints: i < 2 ? 'DEN_BCVH_CON_IT_GIO' : null })));
    await add(database, A, 'R1', {}); // Đạt
    await add(database, A, 'R1', { verdict: null }); // unrated: stock
    // three more parcels of LOT1 delivered by other routes, scanned in the later batch
    const lateBgs = [];
    for (let i = 0; i < 3; i += 1) lateBgs.push(await add(database, A, 'RX', { lot: 'LOT1' }));
    for (const bg of lotBgs) {
        await run(database, 'INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, thoi_gian_bd10_quet_tms) VALUES (?, ?, ?, ?)', [DAY, bg, A, '22/10/2026 07:00:00']);
        await run(database, 'INSERT INTO fact_bf_phat (ngay_bf, lading_code, ma_lo) VALUES (?, ?, ?)', [DAY, bg, 'LOT1']);
    }
    for (const bg of lateBgs) {
        await run(database, 'INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, thoi_gian_bd10_quet_tms) VALUES (?, ?, ?, ?)', [DAY, bg, A, '22/10/2026 15:40:00']);
        await run(database, 'INSERT INTO fact_bf_phat (ngay_bf, lading_code, ma_lo) VALUES (?, ?, ?)', [DAY, bg, 'LOT1']);
    }
    await run(database, 'INSERT INTO fact_f42 (ngay_do_kiem, ma_bg, thoi_gian_chuyen_hoan) VALUES (?, ?, ?)', [DAY, lotBgs[0], '2026-10-23 09:00:00']);
    await run(database, 'INSERT INTO fact_f42 (ngay_do_kiem, ma_bg, thoi_gian_chuyen_hoan) VALUES (?, ?, ?)', [DAY, lotBgs[1], '2026-10-24 09:00:00']);
    await run(database, "INSERT INTO fact_f42 (ngay_do_kiem, ma_bg, thoi_gian_chuyen_hoan) VALUES (?, ?, '')", [DAY, lotBgs[2]]); // an empty return time is not a return
    // R2, R3, R4
    for (let i = 0; i < 3; i += 1) await add(database, A, 'R2', failed('KHAI_THAC'));
    for (let i = 0; i < 2; i += 1) await add(database, A, 'R2', failed('PHAT', { detail: 'PHAT_CHAM_SAU_GIAO' }));
    for (let i = 0; i < 5; i += 1) await add(database, A, 'R2', {});
    for (let i = 0; i < 8; i += 1) await add(database, A, 'R3', failed('KHAI_THAC'));
    for (let i = 0; i < 2; i += 1) await add(database, A, 'R3', failed('PHAT', { detail: 'PHAT_CHAM_SAU_GIAO' }));
    for (let i = 0; i < 9; i += 1) await add(database, A, 'R4', failed('KHAI_THAC'));
    await add(database, A, 'R4', failed('VAN_CHUYEN'));
    // B
    const bBgs = [];
    for (let i = 0; i < 2; i += 1) bBgs.push(await add(database, B, 'R5', failed('KHAI_THAC')));
    for (let i = 0; i < 2; i += 1) bBgs.push(await add(database, B, 'R5', {}));
    await run(database, 'INSERT INTO fact_f42 (ngay_do_kiem, ma_bg, thoi_gian_chuyen_hoan) VALUES (?, ?, ?)', [DAY, bBgs[0], '2026-10-23 09:00:00']);
    await run(database, 'COMMIT');
    service = new CauseAggQueryService({ db: database, classifierVersion: 'v1' });

    // a database without BF Phát / F4.2 (an older one): the page must still answer
    bareDatabase = await open(path.join(tmpDir, 'bare.sqlite'));
    await createSchema(bareDatabase, { withSources: false });
    await add(bareDatabase, A, 'R1', failed('KHONG_TRON_LO', { lot: 'LOT1' }));
});

test.after(async () => {
    await new Promise((resolve) => database.close(resolve));
    await new Promise((resolve) => bareDatabase.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

const rowsOf = async (scope = CITY, svc = () => service) => {
    const result = await svc().routes({ from: DAY, to: DAY }, scope);
    return Object.fromEntries(result.rows.map((row) => [`${row.ma_bcvh}|${row.ma_tuyen}`, row]));
};

test('PO example: 9 of 10 rated parcels in one incomplete lot -> main Không trọn lô 100 % of failed, lot with 2 batches and the last batch time', async () => {
    const r1 = (await rowsOf())[`${A}|R1`];
    assert.equal(r1.failed, 9);
    assert.equal(r1.story.main.code, 'KHONG_TRON_LO');
    assert.equal(r1.story.main.count, 9);
    assert.equal(r1.story.main.share, 1);
    assert.equal(r1.story.second, null);
    assert.equal(r1.story.lot.length, 1);
    assert.deepEqual(
        { ma_lo: r1.story.lot[0].ma_lo, failed: r1.story.lot[0].failed, tms_batches: r1.story.lot[0].tms_batches, last_tms: r1.story.lot[0].last_tms },
        { ma_lo: 'LOT1', failed: 9, tms_batches: 2, last_tms: '2026-10-22 15:40:00' },
    );
});

test('second cause at 20 % exactly, none at 10 %', async () => {
    const rows = await rowsOf();
    assert.equal(rows[`${A}|R2`].story.main.code, 'KHAI_THAC');
    assert.equal(rows[`${A}|R2`].story.main.share, 0.6);
    assert.equal(rows[`${A}|R2`].story.second.code, 'PHAT_MUON'); // Phát chậm sau giao
    assert.equal(rows[`${A}|R2`].story.second.share, 0.4);
    assert.equal(rows[`${A}|R3`].story.second.count, 2); // exactly 20 %
    assert.equal(rows[`${A}|R4`].story.second, null); // 10 %
    assert.equal(rows[`${A}|R2`].story.lot, null); // the lot only comes with Không trọn lô as main cause
});

test('little time: failed parcels with DEN_BCVH_CON_IT_GIO and their share', async () => {
    const story = (await rowsOf())[`${A}|R1`].story;
    assert.equal(story.little_time.count, 2);
    assert.equal(story.little_time.share, 2 / 9);
    assert.equal((await rowsOf())[`${A}|R2`].story.little_time.count, 0);
});

test('return and stock: parcels with a return time in F4.2 (empty is not a return), parcels never rated; BCVH share is the sum of its routes', async () => {
    const rows = await rowsOf();
    const r1 = rows[`${A}|R1`].story;
    assert.equal(r1.return_hint.count, 2);
    assert.equal(r1.return_hint.parcels, 11);
    assert.equal(r1.stock_hint.count, 1);
    assert.equal(rows[`${A}|R2`].story.return_hint.count, 0);
    // BCVH A: parcels of its routes R1 11 + R2 10 + R3 10 + R4 10 + RX 3 (the three late LOT1 parcels, Đạt)
    assert.equal(r1.return_hint.bcvh_share, 2 / 44);
    assert.equal(r1.stock_hint.bcvh_share, 1 / 44);
    assert.equal(r1.return_hint.ratio, (2 / 11) / (2 / 44));
});

test('counts add up to the row: causes, lots, little time never exceed the failed parcels of the row; parcels equal the row distinct count', async () => {
    const result = await service.routes({ from: DAY, to: DAY }, CITY);
    for (const row of result.rows) {
        const { story } = row;
        assert.ok(row.failed > 0 ? story.main.count <= row.failed : story.main === null, row.key);
        assert.ok(story.little_time.count <= row.failed, row.key);
        assert.equal(story.return_hint.parcels, row.distinct_bg, row.key);
        assert.ok(story.return_hint.count <= row.distinct_bg, row.key);
        assert.ok(story.stock_hint.count <= row.distinct_bg, row.key);
        if (story.lot) assert.ok(story.lot.reduce((total, lot) => total + lot.failed, 0) <= story.main.count, row.key);
        const lines = row.cause_mix.lines.reduce((total, l) => total + l.count, 0);
        assert.ok((story.main ? story.main.count : 0) <= lines);
    }
});

test('scope: a BCVH account gets the stories of its own routes only, no other unit appears', async () => {
    const result = await service.routes({ from: DAY, to: DAY }, ownScope(B));
    assert.ok(result.rows.length > 0);
    assert.ok(result.rows.every((row) => row.ma_bcvh === B && row.story));
    const text = JSON.stringify(result);
    assert.equal(text.includes(A), false);
    const r5 = result.rows.find((row) => row.ma_tuyen === 'R5').story;
    assert.equal(r5.return_hint.count, 1);
    assert.equal(r5.return_hint.bcvh_share, 1 / 4); // the BCVH's own share, not the city's
});

test('a database without BF Phát and F4.2: the story still comes, with unknown batches and no return', async () => {
    const bare = new CauseAggQueryService({ db: bareDatabase, classifierVersion: 'v1' });
    const r1 = (await rowsOf(CITY, () => bare))[`${A}|R1`];
    assert.equal(r1.story.main.code, 'KHONG_TRON_LO');
    assert.equal(r1.story.lot[0].ma_lo, 'LOT1');
    assert.equal(r1.story.lot[0].tms_batches, 0);
    assert.equal(r1.story.lot[0].last_tms, null);
    assert.equal(r1.story.return_hint.count, 0);
});
