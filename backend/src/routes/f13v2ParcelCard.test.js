'use strict';

// F13-PARCEL-CARD-01 B1: the evidence list carries the journey facts of /journey/parcels (one shared mapping), filters by route + postman over a
// week / month / day, sorts by milestone and leg, and GET /evidence/parcel returns the whole card in one call. Over HTTP, through the real routers.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-card-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f13_card.sqlite');
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
// 2026-W42 = 15..21 Oct; the rest of October is outside the week
const DAYS = ['2026-10-15', '2026-10-17', '2026-10-21', '2026-10-24', '2026-10-30'];
const WEEK = '2026-W42';
const MONTH = '2026-10';
const BUILT_AT = '2026-11-05T00:00:00.000Z';
const JOURNEY_KEYS = ['ma_lo', 'khong_tron_lo', 'limit_ms', 'tct_ms', 'l_ms', 'r_ms', 'legs', 'milestones'];

let server;
let baseUrl;
let sequence = 0;

const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
const bgOf = (day, code, index) => `BG${code}${day.slice(8)}${String(index).padStart(2, '0')}`;

// block of 12 parcels per (day, unit): route and postman vary, a few parcels have no postman, a few have no milestones
function shape(index) {
    return {
        route: `${index % 2 === 0 ? 'R1' : 'R2'}`,
        postman: index % 4 === 3 ? null : `PM${index % 3}`,
        verdict: index % 5 === 4 ? 'Không đạt' : (index % 7 === 6 ? null : 'Đạt'),
        withMilestones: index % 6 !== 5,
    };
}

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await exec('CREATE TABLE IF NOT EXISTS fact_bf_phat (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_bf TEXT, lading_code TEXT, ma_lo TEXT, mabc_phat TEXT, xac_nhan_den_bcp TEXT)');
    await exec(F13_WHY_AGG_01_SCHEMA_SQL);
    await applyF13Evidence01Schema(process.env.QIS_TEST_DB_PATH);
    await run('BEGIN');
    for (const day of DAYS) {
        const base = Date.parse(`${day}T00:00:00Z`);
        for (const code of [A, B]) {
            for (let index = 0; index < 12; index += 1) {
                const s = shape(index);
                const route = `${code}${s.route}`;
                const ms = s.withMilestones ? {
                    tms: base + 7 * HOUR + index * 60000, depart: base + 9 * HOUR, arrive: base + 11 * HOUR + index * 120000,
                    gbt: base + 13 * HOUR + index * 90000, gbt_first: base + 12 * HOUR + index * 90000, ptc: base + (15 + (index % 5)) * HOUR,
                } : { tms: null, depart: null, arrive: null, gbt: null, gbt_first: null, ptc: null };
                const leg = (from, to) => (from !== null && to !== null ? to - from : null);
                await run(
                    `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown, danh_gia,
                        cause_code, cause_status, ma_lo, khong_tron_lo, limit_ms, tct_ms, built_at, classifier_version,
                        ms_tms, ms_depart, ms_arrive, ms_gbt, ms_gbt_first, ms_ptc, ms_arrive_source,
                        leg_tms_depart_ms, leg_depart_arrive_ms, leg_tms_arrive_ms, leg_arrive_gbt_ms, leg_gbt_ptc_ms, leg_tms_ptc_ms)
                     VALUES (?, ?, ?, ?, 'POSTMAN', ?, ?, ?, ?, ?, ?, ?, ?, ?, 28800000, 36720000, ?, 'v-test', ?, ?, ?, ?, ?, ?, 'F41', ?, ?, ?, ?, ?, ?)`,
                    [day, bgOf(day, code, index), code, route, s.postman, s.postman ? `Bưu tá ${s.postman}` : null, s.postman, s.postman ? `Bưu tá ${s.postman}` : null, s.verdict,
                        s.verdict === 'Không đạt' ? 'KHAI_THAC' : null, s.verdict === 'Không đạt' ? 'CAUSE' : 'KHONG_PHAN_TICH',
                        index % 4 === 0 ? `LO${day.slice(8)}${code}` : null, index % 8 === 0 ? 1 : 0, BUILT_AT,
                        ms.tms, ms.depart, ms.arrive, ms.gbt, ms.gbt_first, ms.ptc,
                        leg(ms.tms, ms.depart), leg(ms.depart, ms.arrive), leg(ms.tms, ms.arrive), leg(ms.arrive, ms.gbt), leg(ms.gbt, ms.ptc), leg(ms.tms, ms.ptc)],
                );
            }
        }
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
    const tier = POSITIONS[position].tier;
    sequence += 1;
    const access = resolveAccess({ tier, bcvh, indicators: [], position });
    return authSessionStore.createSession({ id: 7000 + sequence, username: `${position}-${bcvh.join('-')}-${sequence}`, display_name: `Người ${position}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function get_(sessionId, pathAndQuery) {
    const response = await fetch(`${baseUrl}${pathAndQuery}`, { headers: { 'x-session-id': sessionId } });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: response.status, body: json, text };
}

const qs = (params) => Object.entries(params).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');

/** Every parcel of the evidence list (view=journey) of a filter, all pages. */
async function evidenceItems(sid, period, filter) {
    const items = [];
    let total = null;
    for (let page = 1; ; page += 1) {
        const res = await get_(sid, `/evidence/list?${qs({ ...period, view: 'journey', ...filter, page, page_size: 100 })}`);
        assert.equal(res.status, 200, res.text);
        total = res.body.data.meta.total;
        items.push(...res.body.data.items);
        if (page >= res.body.data.meta.total_pages) break;
    }
    return { items, total };
}

async function journeyParcels(sid, period, filter) {
    const parcels = [];
    for (let page = 1; ; page += 1) {
        const res = await get_(sid, `/journey/parcels?${qs({ ...period, ...filter, page, page_size: 200 })}`);
        assert.equal(res.status, 200, res.text);
        parcels.push(...res.body.data.parcels);
        if (page >= res.body.data.meta.total_pages) break;
    }
    return parcels;
}

const pick = (source) => Object.fromEntries(JOURNEY_KEYS.map((key) => [key, source[key]]));

for (const [label, period] of [['week', { week: WEEK }], ['month', { month: MONTH }]]) {
    test(`parity over a ${label}: route + postman list count and journey fields equal /journey/routes and /journey/parcels`, async () => {
        const admin = session('ADMIN');
        const routes = (await get_(admin, `/journey/routes?${qs(period)}`)).body.data.routes;
        assert.ok(routes.length >= 6, 'postman rows exist');
        const routeVolumes = new Map();
        let checkedParcels = 0;
        for (const row of routes) {
            routeVolumes.set(row.route_key, row.route_volume);
            const filter = { bcvh: row.ma_bcvh, route: row.filter.route, postman: row.filter.postman };
            const evidence = await evidenceItems(admin, period, filter);
            assert.equal(evidence.total, row.volume, `${row.key}: list total = row volume`);
            assert.equal(evidence.items.length, row.volume);
            const journey = new Map((await journeyParcels(admin, period, { ma_bcvh: row.ma_bcvh, route: row.filter.route, postman: row.filter.postman })).map((p) => [p.ma_bg, p]));
            assert.equal(journey.size, row.volume);
            for (const item of evidence.items) {
                const other = journey.get(item.ma_bg);
                assert.ok(other, `${item.ma_bg} is in /journey/parcels`);
                assert.deepEqual(item.journey, pick(other), item.ma_bg);
                checkedParcels += 1;
            }
        }
        // the route alone: the list count is the route_volume shown on every postman row of the route
        for (const [routeKey, volume] of routeVolumes) {
            const [bcvh, route] = routeKey.split('|');
            const evidence = await evidenceItems(admin, period, { bcvh, route });
            assert.equal(evidence.total, volume, `${routeKey}: list total = route_volume`);
        }
        assert.ok(checkedParcels > 0);
    });
}

test('the period forms: date (one day) and the 93-day limit of view=journey; the old limit stays without it', async () => {
    const admin = session('ADMIN');
    const day = await get_(admin, `/evidence/list?${qs({ date: '2026-10-17', bcvh: A })}`);
    assert.equal(day.status, 200, day.text);
    assert.equal(day.body.data.meta.total, 12);
    assert.equal(day.body.data.meta.period.from, '2026-10-17');
    const mixed = await get_(admin, `/evidence/list?${qs({ date: '2026-10-17', week: WEEK })}`);
    assert.equal(mixed.status, 400);
    const long = await get_(admin, `/evidence/list?${qs({ from: '2026-01-01', to: '2026-06-01', view: 'journey' })}`);
    assert.deepEqual([long.status, long.body.error.code], [400, 'RANGE_TOO_LONG']);
    const old = await get_(admin, `/evidence/list?${qs({ from: '2026-01-01', to: '2026-06-01' })}&page_size=1`);
    assert.equal(old.status, 200, 'without view=journey the evidence page keeps its limit');
});

test('sort keys of the journey fields: milestones and legs order the whole filter, missing values last', async () => {
    const admin = session('ADMIN');
    for (const [sort, read] of [['tms', (i) => i.journey.milestones.tms], ['ptc', (i) => i.journey.milestones.ptc], ['tms_ptc', (i) => i.journey.legs.tms_ptc], ['arrive_gbt', (i) => i.journey.legs.arrive_gbt]]) {
        for (const order of ['asc', 'desc']) {
            const res = await get_(admin, `/evidence/list?${qs({ month: MONTH, view: 'journey', bcvh: A, sort, order, page_size: 100 })}`);
            assert.equal(res.status, 200, res.text);
            const values = res.body.data.items.map(read);
            const firstMissing = values.findIndex((v) => v === null);
            const present = firstMissing === -1 ? values : values.slice(0, firstMissing);
            assert.ok(firstMissing === -1 || values.slice(firstMissing).every((v) => v === null), `${sort} ${order}: missing last`);
            const sorted = [...present].sort((a, b) => (a < b ? -1 : (a > b ? 1 : 0)));
            assert.deepEqual(present, order === 'asc' ? sorted : sorted.reverse(), `${sort} ${order}`);
            assert.equal(res.body.data.meta.order, 'SORT');
        }
    }
    const unknown = await get_(admin, `/evidence/list?${qs({ month: MONTH, bcvh: A, sort: 'not_a_key' })}`);
    assert.equal(unknown.body.data.meta.order, 'PRIORITY', 'an unknown key keeps the default order');
});

test('the export accepts the journey filters too', async () => {
    const admin = session('ADMIN');
    const response = await fetch(`${baseUrl}/evidence/export?${qs({ week: WEEK, view: 'journey', bcvh: A, route: `${A}R1`, postman: 'PM0' })}`, { headers: { 'x-session-id': admin } });
    assert.equal(response.status, 200);
    const list = await evidenceItems(admin, { week: WEEK }, { bcvh: A, route: `${A}R1`, postman: 'PM0' });
    assert.equal(Number(response.headers.get('x-export-rows')), list.total);
    await response.arrayBuffer();
});

test('GET /evidence/parcel: the whole card in one call, equal to the list and /journey/parcels', async () => {
    const admin = session('ADMIN');
    const key = { ngay_do_kiem: '2026-10-17', ma_bg: bgOf('2026-10-17', A, 4) }; // failed, with milestones
    const card = await get_(admin, `/evidence/parcel?${qs(key)}`);
    assert.equal(card.status, 200, card.text);
    const data = card.body.data;
    assert.deepEqual(Object.keys(data).sort(), ['analysis', 'can_analyse', 'danh_gia', 'history', 'journey', 'ma_bcvh', 'ma_bg', 'ma_tuyen', 'ngay_do_kiem', 'postman', 'route_scope', 'system', 'tct', 'ten_bcvh', 'ten_tuyen'].sort());
    assert.equal(data.danh_gia, 'Không đạt');
    assert.equal(data.can_analyse, true);
    assert.equal(data.system.status, 'CAUSE');
    assert.equal(data.system.line, 'KHAI_THAC');
    assert.ok(Array.isArray(data.system.flags) && Array.isArray(data.system.hints));
    assert.deepEqual(data.history.entries, []);
    assert.equal(data.analysis, null);
    const other = (await journeyParcels(admin, { date: key.ngay_do_kiem }, { ma_bcvh: A, search: key.ma_bg })).find((p) => p.ma_bg === key.ma_bg);
    assert.deepEqual(data.journey, pick(other));
    const listed = (await evidenceItems(admin, { date: key.ngay_do_kiem }, { bcvh: A })).items.find((i) => i.ma_bg === key.ma_bg);
    assert.deepEqual(data.journey, listed.journey);
    // after an analysis the card carries it, with the history
    const written = await fetch(`${baseUrl}/evidence/analyses`, { method: 'POST', headers: { 'x-session-id': admin, 'content-type': 'application/json' }, body: JSON.stringify({ ...key, cause: 'KHAI_THAC', note: 'Đúng kết luận hệ thống' }) });
    assert.equal(written.status, 201);
    clearResponseCache();
    const again = (await get_(admin, `/evidence/parcel?${qs(key)}`)).body.data;
    assert.equal(again.analysis.cause, 'KHAI_THAC');
    assert.equal(again.history.entries.length, 1);
    assert.equal(again.history.entries[0].current, true);
});

test('the card of a parcel without milestones keeps null facts; a missing parcel is 404, missing parameters 400', async () => {
    const admin = session('ADMIN');
    const day = '2026-10-17';
    const card = (await get_(admin, `/evidence/parcel?${qs({ ngay_do_kiem: day, ma_bg: bgOf(day, A, 5) })}`)).body.data; // index 5: no milestones
    assert.equal(card.journey.milestones.tms, null);
    assert.equal(card.journey.legs.tms_ptc, null);
    const missing = await get_(admin, `/evidence/parcel?${qs({ ngay_do_kiem: day, ma_bg: 'NOPE' })}`);
    assert.deepEqual([missing.status, missing.body.error.code], [404, 'PARCEL_NOT_FOUND']);
    const noParams = await get_(admin, '/evidence/parcel');
    assert.deepEqual([noParams.status, noParams.body.error.code], [400, 'MISSING_PARAM']);
});

test('unit scope: a Chuyên quản reads the card of its own unit and cannot read another unit; the list carries no foreign journey facts; no capability -> 403', async () => {
    const cq = session('CHUYEN_QUAN', { bcvh: [A] });
    const own = await get_(cq, `/evidence/parcel?${qs({ ngay_do_kiem: '2026-10-15', ma_bg: bgOf('2026-10-15', A, 1) })}`);
    assert.equal(own.status, 200, own.text);
    const foreign = await get_(cq, `/evidence/parcel?${qs({ ngay_do_kiem: '2026-10-15', ma_bg: bgOf('2026-10-15', B, 1) })}`);
    assert.equal(foreign.status, 403);
    assert.equal(foreign.body.error.code, 'OUT_OF_SCOPE');
    assert.ok(!foreign.text.includes('milestones'));
    const list = await get_(cq, `/evidence/list?${qs({ week: WEEK, view: 'journey', page_size: 100 })}`);
    assert.ok(list.body.data.items.every((item) => item.ma_bcvh === A));
    assert.equal((await get_(cq, `/evidence/list?${qs({ week: WEEK, view: 'journey', bcvh: B })}`)).status, 403);
    const noModule = session('STAFF', { bcvh: [] });
    assert.equal((await get_(noModule, `/evidence/parcel?${qs({ ngay_do_kiem: '2026-10-15', ma_bg: bgOf('2026-10-15', A, 1) })}`)).status, 403);
    assert.equal((await fetch(`${baseUrl}/evidence/parcel?ngay_do_kiem=2026-10-15&ma_bg=x`)).status, 401);
});
