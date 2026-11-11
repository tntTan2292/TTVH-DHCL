'use strict';

// F13-PARCEL-CARD-01 B3 (C6): the evidence of the conclusion (the classifier's own numbers, re-run at read time) and the TMS batches of the lot.
// Over HTTP, through the real routers. The expected causes are derived by hand from the journey below, not from the code's output.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-evid-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f13_evid.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { POSITIONS } = require('../services/auth/access/roles');
const { clearResponseCache } = require('../middleware/responseCache');
const f13v2Routes = require('./f13v2Routes');
const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../migrate_f13_why_agg_01_schema');
const { applyF13Evidence01Schema } = require('../../migrate_f13_evidence_01_schema');

const A = '537015';
const B = '535790';
const HOUR = 3600000;
const DAY = '2026-10-21';
const at = (text) => Date.parse(`${text.replace(' ', 'T')}:00Z`);
// Journey of the CLAUDE tests: T 20/10 10:00, D 16:00, A 21/10 12:00, G 14:00, E 20:00; one night (10 h): net T->A 16 h, T->G 18 h, T->E 24 h, TCT 24:00.
const journey = (over = {}) => ({ tms: at('2026-10-20 10:00'), depart: at('2026-10-20 16:00'), arrive: at('2026-10-21 12:00'), gbt: at('2026-10-21 14:00'), ptc: at('2026-10-21 20:00'), ...over });

// one parcel per cause (limit 12 h unless said); `stored` is what the build would have stored, written by hand
const CASES = [
    { key: 'VAN_CHUYEN', stored: ['CAUSE', 'VAN_CHUYEN', null, null], rule: 'DEN_BCVH_QUA_HAN', stage: 't_a', split: 'D_A_LON_HON_T_D' },
    { key: 'KHAI_THAC', ms: { depart: at('2026-10-20 23:00') }, stored: ['CAUSE', 'KHAI_THAC', null, null], rule: 'DEN_BCVH_QUA_HAN', stage: 't_a', split: 'T_D_LON_HON_D_A' },
    { key: 'CHUA_PHAN_BIET', ms: { depart: null }, stored: ['CAUSE', 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', null, null], rule: 'DEN_BCVH_QUA_HAN', stage: 't_a', split: 'THIEU_MOC_D' },
    { key: 'GIAO_BUU_TA', limit: 17, stored: ['CAUSE', 'PHAT', 'CHAM_GIAO_BUU_TA', null], rule: 'PHAT_CHAM_GIAO_BUU_TA', stage: 't_g', via: 'T_G_QUA_HAN' },
    { key: 'PHAT_SAU_GIAO', limit: 18, stored: ['CAUSE', 'PHAT', 'PHAT_CHAM_SAU_GIAO', null], rule: 'PHAT_SAU_GIAO', stage: 't_g', via: 'T_G_TRONG_HAN' },
    { key: 'KHONG_TRON_LO', lot: 'LOT-NEW', stored: ['CAUSE', 'KHONG_TRON_LO', null, null], rule: 'KHONG_TRON_LO', stage: 't_a' },
    { key: 'CHO_CHUYEN_QUAN', limit: 17, ms: { arrive: null }, source: null, flags: 'KHONG_XAC_NHAN_DEN,THIEU_F41', stored: ['CHO_CHUYEN_QUAN', null, null, 'CHAM_DEN_HAY_CHAM_GIAO'], rule: 'CHAM_DEN_HAY_CHAM_GIAO', stage: 't_g' },
    { key: 'CHUA_DU_CAN_CU', limit: null, stored: ['CHUA_DU_CAN_CU', null, null, 'CHI_TIEU'], rule: 'CHI_TIEU', stage: null },
];

let server;
let baseUrl;
let sequence = 0;
const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
const all = (query, params = []) => new Promise((resolve, reject) => db.all(query, params, (e, rows) => (e ? reject(e) : resolve(rows))));

async function insert(r) {
    await run(
        `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown, danh_gia,
            cause_code, cause_status, cause_detail, cause_reason, flags, ma_lo, khong_tron_lo, limit_ms, tct_ms, built_at, classifier_version,
            ms_tms, ms_depart, ms_arrive, ms_gbt, ms_gbt_first, ms_ptc, ms_arrive_source)
         VALUES (?, ?, ?, ?, 'POSTMAN', 'PM0', 'Bưu tá PM0', 'PM0', 'Bưu tá PM0', ?, ?, ?, ?, ?, ?, ?, ?, ?, 86400000, '2026-11-05T00:00:00.000Z', 'v-test', ?, ?, ?, ?, ?, ?, ?)`,
        [DAY, r.bg, r.bcvh, `${r.bcvh}R1`, r.danh_gia, r.cause, r.status, r.detail, r.reason, r.flags ?? null, r.lot ?? null, r.khongTron ? 1 : 0, r.limitMs,
            r.ms.tms, r.ms.depart, r.ms.arrive, r.ms.gbt, r.ms.gbt, r.ms.ptc, r.source],
    );
}

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await exec('CREATE TABLE IF NOT EXISTS fact_bf_phat (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_bf TEXT, lading_code TEXT, ma_lo TEXT, mabc_phat TEXT, xac_nhan_den_bcp TEXT)');
    await exec(F13_WHY_AGG_01_SCHEMA_SQL);
    await applyF13Evidence01Schema(process.env.QIS_TEST_DB_PATH);
    await run('BEGIN');
    for (const c of CASES) {
        const limit = c.limit === undefined ? 12 : c.limit;
        await insert({
            bg: `BG-${c.key}`, bcvh: A, danh_gia: 'Không đạt', cause: c.stored[1], status: c.stored[0], detail: c.stored[2], reason: c.stored[3], flags: c.flags,
            lot: c.lot ?? null, khongTron: c.key === 'KHONG_TRON_LO', limitMs: limit === null ? null : limit * HOUR, ms: journey(c.ms), source: c.source === undefined ? 'F41' : c.source,
        });
    }
    // a passed parcel: no evidence
    await insert({ bg: 'BG-PASSED', bcvh: A, danh_gia: 'Đạt', cause: null, status: 'KHONG_PHAN_TICH', detail: null, reason: null, lot: null, khongTron: false, limitMs: 12 * HOUR, ms: journey(), source: 'F41' });
    // a lot of 7 parcels in 3 TMS batches over two units: T1 = 10:00 (A x2, B x1), T2 = 12:30 (A x1 failed, B x1), T3 = 15:00 (B x2)
    const lotParcels = [['LA1', A, '10:00'], ['LA2', A, '10:00'], ['LB1', B, '10:00'], ['LA3', A, '12:30'], ['LB2', B, '12:30'], ['LB3', B, '15:00'], ['LB4', B, '15:00']];
    let index = 0;
    for (const [bg, bcvh, time] of lotParcels) {
        index += 1;
        await insert({
            bg: `BG-${bg}`, bcvh, danh_gia: bg === 'LA3' || bg === 'LB4' ? 'Không đạt' : 'Đạt', cause: null, status: bg === 'LA3' || bg === 'LB4' ? 'CHUA_DU_CAN_CU' : 'KHONG_PHAN_TICH', detail: null, reason: null,
            lot: 'LOT-1', khongTron: false, limitMs: 12 * HOUR, source: 'F41',
            ms: { tms: at(`2026-10-20 ${time}`), depart: null, arrive: at('2026-10-21 08:00') + index * 60000, gbt: null, ptc: null },
        });
    }
    await run('COMMIT');
    const app = express();
    app.use('/api/f13/v2', f13v2Routes);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/f13/v2`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.beforeEach(() => clearResponseCache());

function session(position, { bcvh = [] } = {}) {
    sequence += 1;
    const tier = POSITIONS[position].tier;
    const access = resolveAccess({ tier, bcvh, indicators: [], position });
    return authSessionStore.createSession({ id: 9000 + sequence, username: `${position}-${sequence}`, display_name: position, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function get_(sid, pathAndQuery) {
    const response = await fetch(`${baseUrl}${pathAndQuery}`, { headers: { 'x-session-id': sid } });
    const text = await response.text();
    return { status: response.status, body: JSON.parse(text), text };
}
const card = async (sid, bg) => (await get_(sid, `/evidence/parcel?ngay_do_kiem=${DAY}&ma_bg=${encodeURIComponent(bg)}`)).body.data;

test('the re-run reaches the stored cause_code / cause_detail / cause_status for every cause, and the decision names the branch', async () => {
    const admin = session('ADMIN');
    for (const c of CASES) {
        const data = await card(admin, `BG-${c.key}`);
        const e = data.evidence;
        assert.ok(e, c.key);
        assert.equal(e.matches_stored, true, `${c.key} matches the stored conclusion`);
        assert.deepEqual([e.status, e.cause_code, e.detail, e.reason], c.stored, c.key);
        assert.equal(e.decision.rule, c.rule, `${c.key} rule`);
        if (c.stage !== null) assert.equal(e.decision.stage, c.stage, `${c.key} stage`);
        if (c.split) assert.equal(e.decision.split.why, c.split, `${c.key} split`);
        if (c.via) assert.equal(e.decision.via, c.via, `${c.key} via`);
    }
});

test('evidence values of the arrival-over-limit causes: limit, clock and net hours, interval bounds, remaining time, milestones used', async () => {
    const admin = session('ADMIN');
    const e = (await card(admin, 'BG-VAN_CHUYEN')).evidence;
    assert.equal(e.basis, 'INTERVAL');
    assert.equal(e.limit_ms, 12 * HOUR);
    assert.equal(e.tct_ms, 24 * HOUR);
    assert.equal(e.milestones.tms, at('2026-10-20 10:00'));
    assert.equal(e.milestones.arrive, at('2026-10-21 12:00'));
    assert.deepEqual(e.missing, []);
    assert.equal(e.stages.t_a.clock_ms, 26 * HOUR);
    assert.equal(e.stages.t_a.net_ms, 16 * HOUR);
    assert.equal(e.stages.t_a.night_ms, 10 * HOUR);
    assert.equal(e.stages.t_a.over_ms, 4 * HOUR);
    assert.equal(e.stages.t_a.verdict, 'QUA_HAN');
    assert.ok(e.stages.t_d && e.stages.d_a, 'both legs are judged');
    assert.equal(e.decisive.stage, 't_a');
    assert.equal(e.decisive.limit_ms, 12 * HOUR);
    assert.equal(e.remaining_at_arrival_ms, -4 * HOUR);
    assert.equal(e.clock_ms.depart_arrive, 20 * HOUR);
    const chua = (await card(admin, 'BG-CHUA_PHAN_BIET')).evidence;
    assert.deepEqual(chua.missing, ['depart']);
    assert.equal(chua.stages.t_d, undefined);
});

test('evidence of the Phát and waiting causes: handover against the limit, the missing milestone and the reason', async () => {
    const admin = session('ADMIN');
    const late = (await card(admin, 'BG-GIAO_BUU_TA')).evidence;
    assert.equal(late.stages.t_g.net_ms, 18 * HOUR);
    assert.equal(late.stages.t_g.over_ms, 1 * HOUR);
    assert.equal(late.remaining_at_arrival_ms, 1 * HOUR); // 17 h - 16 h
    const after = (await card(admin, 'BG-PHAT_SAU_GIAO')).evidence;
    assert.equal(after.stages.t_g.over_ms, 0);
    assert.equal(after.decision.next_day, false);
    const wait = (await card(admin, 'BG-CHO_CHUYEN_QUAN')).evidence;
    assert.deepEqual(wait.missing, ['arrive']);
    assert.equal(wait.milestones.arrive, null);
    assert.equal(wait.reason, 'CHAM_DEN_HAY_CHAM_GIAO');
    const none = (await card(admin, 'BG-CHUA_DU_CAN_CU')).evidence;
    assert.equal(none.limit_ms, null);
    assert.equal(none.decisive, null);
});

test('a parcel that is not Không đạt has no evidence; a parcel without a lot has no lot', async () => {
    const admin = session('ADMIN');
    const passed = await card(admin, 'BG-PASSED');
    assert.equal(passed.evidence, null);
    assert.equal(passed.lot, null);
    assert.equal((await card(admin, 'BG-VAN_CHUYEN')).lot, null);
});

test('lot batches: counts equal a direct count, the own batch is marked, the batch list total equals its count (admin)', async () => {
    const admin = session('ADMIN');
    const data = await card(admin, 'BG-LA3');
    const lot = data.lot;
    const [direct] = await all("SELECT COUNT(*) AS n, SUM(danh_gia = 'Không đạt') AS failed FROM f13_cause_parcel WHERE ma_lo = 'LOT-1'");
    assert.equal(lot.volume, direct.n);
    assert.equal(lot.failed, direct.failed);
    assert.equal(lot.volume, 7);
    assert.equal(lot.tms_batches, 3);
    assert.equal(lot.incomplete, true);
    assert.equal(lot.scope_hidden, false);
    assert.deepEqual(lot.batches.map((b) => [b.tms, b.volume, b.failed, b.is_own]), [
        ['2026-10-20 10:00:00', 3, 0, false], ['2026-10-20 12:30:00', 2, 1, true], ['2026-10-20 15:00:00', 2, 1, false],
    ]);
    for (const b of lot.batches) {
        const [count] = await all("SELECT COUNT(*) AS n, SUM(danh_gia = 'Không đạt') AS failed, MIN(ms_arrive) AS first, MAX(ms_arrive) AS last FROM f13_cause_parcel WHERE ma_lo = 'LOT-1' AND ms_tms = ?", [Date.parse(`${b.tms.replace(' ', 'T')}Z`)]);
        assert.equal(b.volume, count.n);
        assert.equal(b.failed, count.failed);
        assert.equal(b.arrive_first, new Date(count.first).toISOString().slice(0, 19).replace('T', ' '));
        assert.equal(b.arrive_last, new Date(count.last).toISOString().slice(0, 19).replace('T', ' '));
        const list = await get_(admin, `/evidence/list?from=${lot.period.from}&to=${lot.period.to}&ma_lo=LOT-1&tms_batch=${encodeURIComponent(b.tms)}&page_size=50`);
        assert.equal(list.status, 200, list.text);
        assert.equal(list.body.data.meta.total, b.volume, `${b.tms}: list total = batch count`);
        assert.ok(list.body.data.items.every((item) => item.ma_lo === 'LOT-1'));
    }
    assert.equal(lot.complete_at, '2026-10-21 08:07:00'); // the last parcel of the lot arrives at 08:00 + 7 min
    assert.equal((await get_(admin, `/evidence/list?from=${lot.period.from}&to=${lot.period.to}&ma_lo=LOT-1&page_size=50`)).body.data.meta.total, 7);
    assert.equal((await get_(admin, `/evidence/list?from=${lot.period.from}&to=${lot.period.to}&tms_batch=bad`)).status, 400);
});

test('a Chuyên quản sees whole-lot counts but only its own unit in the list, and no code of another unit', async () => {
    const cq = session('CHUYEN_QUAN', { bcvh: [A] });
    const data = await card(cq, 'BG-LA3');
    const lot = data.lot;
    assert.equal(lot.volume, 7);
    assert.equal(lot.volume_in_scope, 3);
    assert.equal(lot.failed_in_scope, 1);
    assert.equal(lot.scope_hidden, true);
    assert.deepEqual(lot.batches.map((b) => b.volume_in_scope), [2, 1, 0]);
    for (const b of lot.batches) {
        const list = await get_(cq, `/evidence/list?from=${lot.period.from}&to=${lot.period.to}&ma_lo=LOT-1&tms_batch=${encodeURIComponent(b.tms)}&page_size=50`);
        assert.equal(list.body.data.meta.total, b.volume_in_scope, `${b.tms}: list total = in-scope count`);
        assert.ok(list.body.data.items.every((item) => item.ma_bcvh === A));
        assert.ok(!list.text.includes('BG-LB'), 'no parcel code of the other unit');
    }
    assert.ok(!JSON.stringify(data).includes('BG-LB'), 'the card carries no parcel code of the other unit');
    assert.equal((await get_(cq, `/evidence/parcel?ngay_do_kiem=${DAY}&ma_bg=BG-LB1`)).status, 403);
});
