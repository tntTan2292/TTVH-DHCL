'use strict';

// F13-WHY-AGG-01 Phase 2: /api/f13/v2/why/* end to end through the real routers, middleware order and scope rules, on an isolated
// fixture database with three BCVH, and against the official F1.3 readers (getBcvhRanking, getRouteRanking). Checks
//   (1) a BCVH-mode account gets its own unit only: no other unit, no city total, no share of a city; another unit is refused,
//   (2) a city-wide account sees everything including the total,
//   (3) the figures equal the official ranking readers on the same rows (BCVH and route level, the confirmed non-postman list applied),
//   (4) bad requests are 400, no session 401, no F1.3 access 403.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13v2-why-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f13v2_why.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { clearResponseCache } = require('../middleware/responseCache');
const f13v2Routes = require('./f13v2Routes');
const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const { CONFIRMED_NON_POSTMAN_ROUTES } = require('../config/f13RouteClassificationCatalog');
const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../migrate_f13_why_agg_01_schema');
const { weekIdFromDate } = require('../services/bcvhWeeklyComparisonService');

const OWN = '537015'; // BCVH Thuận An
const SECOND = '535790'; // BCVH A Lưới
const OTHER = '533140'; // BCVH Thuận Hóa
const NAMES = { 537015: 'BCVH Thuận An', 535790: 'BCVH A Lưới', 533140: 'BCVH Thuận Hóa' };
const DAYS = ['2026-10-19', '2026-10-20'];
const NON_POSTMAN_CODES = CONFIRMED_NON_POSTMAN_ROUTES.map((route) => route.ma_tuyen);
const NON_POSTMAN_ROUTE = '53314018'; // a confirmed non-postman code (Thuận Hóa)

let server;
let baseUrl;

const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));

async function insertFact(date, code, i, { route, verdict, ptc = true }) {
    await run(
        `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_tinh_phat, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, thoi_gian_ptc, thoi_gian_nop_tien, danh_gia_2026, ket_qua_f13)
         VALUES (?, ?, '53', ?, ?, ?, ?, 'Tuyến phát xã', ?, NULL, ?, ?)`,
        [date, `BG${code}${date}${i}`, code, NAMES[code] || 'Mã lạ', route, `Tuyến ${route}`, ptc ? `${date} 10:00:00` : null, verdict, verdict],
    );
}

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await exec('CREATE TABLE IF NOT EXISTS fact_bf_phat (ngay_bf TEXT, lading_code TEXT, ma_lo TEXT)');
    await exec(F13_WHY_AGG_01_SCHEMA_SQL);
    await run('BEGIN');
    for (const date of DAYS) {
        for (const [index, code] of [OWN, SECOND, OTHER].entries()) {
            for (let i = 0; i < 12; i += 1) {
                const verdict = i % 4 === 0 ? null : (i % 4 === 1 ? 'Không đạt' : 'Đạt'); // unrated, failed, passed, passed
                await insertFact(date, code, i, { route: `${code}0${(i + index) % 3}`, verdict, ptc: Boolean(verdict) });
            }
        }
        for (let i = 0; i < 5; i += 1) await insertFact(date, OTHER, 100 + i, { route: NON_POSTMAN_ROUTE, verdict: i % 2 ? 'Đạt' : null, ptc: i % 2 === 1 });
        await insertFact(date, OTHER, 200, { route: '', verdict: 'Đạt' }); // a route-less row: scope OTHER
        await insertFact(date, '531120', 300, { route: '53112000', verdict: 'Đạt' }); // not one of the six: the table (JourneyService) never has it
    }
    // The derived table, filled from the fact rows by a plain statement (the builder itself is P1's business and tested there).
    const nonPostman = NON_POSTMAN_CODES.map((code) => `'${code}'`).join(', ');
    await run(
        `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown, danh_gia,
            cause_code, cause_status, cause_step, flags, hints, ma_lo, khong_tron_lo, limit_ms, tct_ms, l_ms, r_ms, built_at, classifier_version)
         SELECT ngay_do_kiem, ma_bg, ma_bcvh, NULLIF(ma_tuyen, ''),
                CASE WHEN ma_tuyen IN (${nonPostman}) THEN 'NON_POSTMAN' WHEN ma_tuyen LIKE '53%' THEN 'POSTMAN' ELSE 'OTHER' END,
                CASE WHEN id % 5 = 0 THEN NULL ELSE 'PM' || (id % 3) END, CASE WHEN id % 5 = 0 THEN NULL ELSE 'Bưu tá ' || (id % 3) END, NULL, NULL,
                NULLIF(danh_gia_2026, ''), CASE WHEN danh_gia_2026 = 'Không đạt' AND id % 2 = 0 THEN 'PHAT_MUON' END,
                CASE WHEN danh_gia_2026 = 'Không đạt' THEN (CASE WHEN id % 2 = 0 THEN 'CAUSE' ELSE 'CHUA_DU_CAN_CU' END) ELSE 'KHONG_PHAN_TICH' END,
                CASE WHEN danh_gia_2026 = 'Không đạt' AND id % 2 = 1 THEN 'T-A' END, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, '2026-11-05T00:00:00.000Z', 'v1'
         FROM fact_f13 WHERE ma_bcvh IN ('${OWN}', '${SECOND}', '${OTHER}')`,
    );
    for (const date of DAYS) await run("INSERT INTO f13_cause_day (ngay_do_kiem, input_signature, classifier_version, state, built_at, row_count) VALUES (?, 's', 'v1', 'FRESH', '2026-11-05T00:00:00.000Z', 0)", [date]);
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

function session(tier, { bcvh = [], indicators = [] } = {}) {
    const access = resolveAccess({ tier, bcvh, indicators });
    return authSessionStore.createSession({ username: `${tier}-${bcvh.join('-')}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function get(sessionId, pathAndQuery) {
    const response = await fetch(`${baseUrl}${pathAndQuery}`, { headers: { 'x-session-id': sessionId } });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not json */ }
    return { status: response.status, text, body };
}

function foreignHits(text, allowedCodes) {
    const hits = [];
    for (const code of Object.keys(NAMES)) {
        if (allowedCodes.includes(code)) continue;
        if (text.includes(`"${code}"`) || text.includes(NAMES[code])) hits.push(code);
    }
    return hits;
}

const PERIOD = `from=${DAYS[0]}&to=${DAYS[1]}`;
const ENDPOINTS = [`/why/summary?${PERIOD}`, `/why/bcvh?${PERIOD}`, `/why/routes?${PERIOD}`, `/why/postmen?${PERIOD}`, `/why/parcels?${PERIOD}&page_size=200`];

test('no session -> 401, an account without F1.3 access -> 403, a missing or bad period -> 400', async () => {
    assert.equal((await fetch(`${baseUrl}/why/summary?${PERIOD}`)).status, 401);
    assert.equal((await get(session('STAFF', { bcvh: [] }), `/why/summary?${PERIOD}`)).status, 403);
    const sid = session('LEADER');
    for (const url of ['/why/summary', '/why/summary?from=2026-10-19', '/why/bcvh?from=2026-10-20&to=2026-10-19', '/why/routes?month=2026-13', '/why/parcels?from=2026-10-19&to=2026-10-20&cause=nope', '/why/routes?from=2025-01-01&to=2026-10-01']) {
        assert.equal((await get(sid, url)).status, 400, url);
    }
});

test('(f) BCVH-mode account: its own unit on every endpoint, no other unit, no city total, no share of a city; another unit is refused', async () => {
    const sid = session('STAFF', { bcvh: [OWN] });
    for (const url of ENDPOINTS) {
        for (const suffix of ['', '&bcvh=all', `&bcvh=${OWN}`, `&ma_bcvh=${OWN}`]) {
            const { status, body, text } = await get(sid, url + suffix);
            assert.equal(status, 200, url + suffix);
            assert.deepEqual(foreignHits(text, [OWN]), [], url + suffix);
            assert.equal(body.data.total, undefined, url + suffix);
        }
    }
    const bcvh = (await get(sid, `/why/bcvh?${PERIOD}`)).body.data;
    assert.deepEqual(bcvh.rows.map((row) => row.ma_bcvh), [OWN]);
    assert.equal(bcvh.rows[0].share_of_parent_shortfall, null);
    const parcels = (await get(sid, `/why/parcels?${PERIOD}&page_size=200`)).body.data;
    assert.ok(parcels.parcels.length > 0);
    assert.ok(parcels.parcels.every((p) => p.ma_bcvh === OWN));
    for (const code of [OTHER, SECOND]) {
        const refused = await get(sid, `/why/summary?${PERIOD}&bcvh=${code}`);
        assert.equal(refused.status, 403, code);
        assert.equal(refused.body.error.code, 'OUT_OF_SCOPE');
    }
});

test('(2) a city-wide account sees the three units, the total, the stray code stays out, and every level adds up to the BCVH', async () => {
    const sid = session('LEADER');
    const bcvh = (await get(sid, `/why/bcvh?${PERIOD}`)).body.data;
    assert.deepEqual(bcvh.rows.map((row) => row.ma_bcvh).sort(), [OTHER, SECOND, OWN].sort());
    assert.ok(bcvh.total.volume > 0);
    assert.equal(bcvh.rows.reduce((total, row) => total + row.volume, 0), bcvh.total.volume);
    assert.equal(bcvh.meta.freshness.complete, true);
    assert.equal(bcvh.meta.basis, 'BG_DAY_ROWS');
    for (const row of bcvh.rows) {
        const routes = (await get(sid, `/why/routes?${PERIOD}&bcvh=${row.ma_bcvh}`)).body.data;
        const postmen = (await get(sid, `/why/postmen?${PERIOD}&bcvh=${row.ma_bcvh}`)).body.data;
        for (const field of ['volume', 'passed', 'failed', 'unrated', 'shortfall_x10']) {
            assert.equal(routes.rows.reduce((total, r) => total + r[field], 0), row[field], `${row.ma_bcvh} routes ${field}`);
            assert.equal(postmen.rows.reduce((total, r) => total + r[field], 0), row[field], `${row.ma_bcvh} postmen ${field}`);
        }
        const mix = row.cause_mix;
        assert.equal(mix.lines.reduce((total, line) => total + line.count, 0) + mix.chua_du_can_cu.count + mix.unclassified, row.failed);
    }
    // the same figures through a week id and a month id (the 19th and 20th of October 2026 both lie in October)
    const monthly = (await get(sid, '/why/summary?month=2026-10')).body.data.totals;
    assert.equal(monthly.volume, bcvh.total.volume);
    const weekId = weekIdFromDate(DAYS[1]).weekId;
    const weekly = await get(sid, `/why/summary?week=${weekId}`);
    assert.equal(weekly.status, 200);
    assert.equal(weekly.body.data.meta.period.kind, 'week');
    assert.ok(weekly.body.data.totals.volume > 0 && weekly.body.data.totals.volume <= bcvh.total.volume);
});

test('(3) equality with the official readers: getBcvhRanking for the BCVH, getRouteRanking (confirmed non-postman list applied) for the routes', async () => {
    const sid = session('LEADER');
    const bcvh = (await get(sid, `/why/bcvh?${PERIOD}`)).body.data;
    const official = (await factBuuGuiRepo.getBcvhRanking(DAYS[0], DAYS[1], 1, 50, 'total_bg', 'desc')).data.filter((row) => [OWN, SECOND, OTHER].includes(row.ma_bcvh));
    assert.equal(official.length, 3);
    for (const row of bcvh.rows) {
        const reference = official.find((r) => r.ma_bcvh === row.ma_bcvh);
        assert.deepEqual([row.volume, row.passed, row.failed], [reference.total_bg, reference.total_passed, reference.total_failed], row.ma_bcvh);
        assert.equal(row.rate, Math.round((reference.total_passed / reference.total_bg) * 1000) / 10);
    }
    for (const date of DAYS) {
        for (const code of [OWN, SECOND, OTHER]) {
            const routes = (await get(sid, `/why/routes?from=${date}&to=${date}&bcvh=${code}`)).body.data.rows.filter((r) => r.route_scope === 'POSTMAN');
            const ranking = (await factBuuGuiRepo.getRouteRanking(date, code, 1, 1000, 'total_bg', 'desc', { confirmedNonPostmanRouteCodes: NON_POSTMAN_CODES })).data;
            assert.equal(routes.length, ranking.length, `${date} ${code}`);
            for (const reference of ranking) {
                const row = routes.find((r) => r.ma_tuyen === reference.ma_tuyen);
                assert.deepEqual([row.volume, row.passed, row.failed, row.unrated], [reference.total_bg, reference.total_passed, reference.total_failed, reference.total_returned], `${date} ${code} ${reference.ma_tuyen}`);
            }
        }
    }
    // the rows the route ranking leaves out are in the buckets, so the BCVH still adds up (Thuận Hóa has non-postman and route-less rows)
    const buckets = (await get(sid, `/why/routes?${PERIOD}&bcvh=${OTHER}`)).body.data.rows.filter((r) => r.route_scope !== 'POSTMAN');
    assert.deepEqual(buckets.map((r) => r.route_scope).sort(), ['NON_POSTMAN', 'OTHER']);
    assert.equal(buckets.find((r) => r.route_scope === 'NON_POSTMAN').volume, 10); // 5 rows a day, 2 days
});

test('(c) over HTTP: the parcels of a route row equal the row; the figures are not cached between scopes', async () => {
    const leader = session('LEADER');
    const staff = session('STAFF', { bcvh: [OWN] });
    const routes = (await get(leader, `/why/routes?${PERIOD}&bcvh=${OTHER}`)).body.data.rows;
    for (const row of routes) {
        const query = new URLSearchParams(Object.fromEntries(Object.entries(row.filter).map(([key, value]) => [key, String(value)]))).toString();
        const list = (await get(leader, `/why/parcels?${query}&page_size=200`)).body.data;
        assert.equal(list.meta.total, row.volume, row.key);
    }
    const own = (await get(staff, `/why/summary?${PERIOD}`)).body.data;
    const city = (await get(leader, `/why/summary?${PERIOD}`)).body.data;
    assert.ok(city.totals.volume > own.totals.volume);
    assert.deepEqual(foreignHits(JSON.stringify(own), [OWN]), []);
});
