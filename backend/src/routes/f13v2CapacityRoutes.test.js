'use strict';

// F13-ROUTE-CAPACITY-01 B1: /api/f13/v2/capacity/* through the real routers on an isolated database.
// Checks the rule end to end (volume, rate, capacity of the day, load, band, postmen), NON_POSTMAN / OTHER without capacity,
// the BCVH-mode scope (own unit only, another unit refused) and bad requests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13v2-capacity-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'capacity.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { clearResponseCache } = require('../middleware/responseCache');
const f13v2Routes = require('./f13v2Routes');
const { F13_WHY_AGG_01_SCHEMA_SQL } = require('../../migrate_f13_why_agg_01_schema');

const OWN = '537015';
const OTHER = '533140';
const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
const dayOf = (offset) => new Date(Date.parse('2026-09-01T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);

let server;
let baseUrl;
let counter = 0;

async function addDay(date, bcvh, route, scope, volume, passed, postmen = 1) {
    for (let i = 0; i < volume; i += 1) {
        counter += 1;
        await run(
            `INSERT INTO f13_cause_parcel (ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, danh_gia, cause_status, khong_tron_lo, built_at, classifier_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'KHONG_PHAN_TICH', 0, '2026-11-05T00:00:00.000Z', 'v1')`,
            [date, `BG${counter}`, bcvh, route, scope, `PM${i % postmen}`, i < passed ? 'Đạt' : 'Không đạt'],
        );
    }
    if (route && scope === 'POSTMAN') {
        await run(
            `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen) VALUES (?, ?, ?, 'BCVH', ?, ?)`,
            [date, `F${counter}`, bcvh, route, `Tuyến ${route}`],
        );
    }
}

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await exec(F13_WHY_AGG_01_SCHEMA_SQL);
    await run('BEGIN');
    // route R1 of OWN: 6 good days of 10..60 parcels (days 0-5), then day 8 = 60 parcels with 3 postmen (over), day 9 = 20 (under)
    for (let i = 0; i < 6; i += 1) await addDay(dayOf(i), OWN, 'R1', 'POSTMAN', 10 * (i + 1), 10 * (i + 1));
    await addDay(dayOf(8), OWN, 'R1', 'POSTMAN', 60, 60, 3);
    await addDay(dayOf(9), OWN, 'R1', 'POSTMAN', 20, 20);
    // route R2 of OWN: only 2 days of history -> no capacity
    await addDay(dayOf(8), OWN, 'R2', 'POSTMAN', 12, 12);
    await addDay(dayOf(9), OWN, 'R2', 'POSTMAN', 14, 14);
    // OWN: the counter and the unknown routes
    await addDay(dayOf(8), OWN, null, 'NON_POSTMAN', 7, 7);
    await addDay(dayOf(8), OWN, null, 'OTHER', 3, 1);
    // another unit with the same route code
    for (let i = 0; i < 6; i += 1) await addDay(dayOf(i), OTHER, 'R1', 'POSTMAN', 5, 5);
    await addDay(dayOf(8), OTHER, 'R1', 'POSTMAN', 5, 5);
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

function session(tier, { bcvh = [] } = {}) {
    const access = resolveAccess({ tier, bcvh, indicators: [] });
    return authSessionStore.createSession({ username: `${tier}-${bcvh.join('-')}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function get(sessionId, pathAndQuery) {
    const response = await fetch(`${baseUrl}${pathAndQuery}`, sessionId ? { headers: { 'x-session-id': sessionId } } : {});
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not json */ }
    return { status: response.status, text, body };
}

const PERIOD = `from=${dayOf(8)}&to=${dayOf(9)}`;

test('route-days: capacity of each day, load, band, per-postman volume', async () => {
    const result = await get(session('LEADER'), `/capacity/route-days?${PERIOD}&ma_tuyen=R1&bcvh=${OWN}`);
    assert.equal(result.status, 200);
    const days = result.body.data.days;
    assert.deepEqual(days.map((d) => d.date), [dayOf(8), dayOf(9)]);
    assert.equal(days[0].capacity, 47.5); // day 8 sees the six good days 10..60: P75 = position 3.75 = 40 + 0.75 * 10... = 47.5
    assert.equal(days[0].band, 'QUA_TAI'); // 60 / 47.5
    assert.equal(days[0].postmen, 3);
    assert.equal(days[0].volume_per_postman, 20);
    assert.equal(days[1].band, 'CON_DU_SUC'); // day 8 (60 of 60) joins the history: P75 of 10..60,60 = 55; 20 / 55 = 36 %
    assert.equal(result.body.data.route.ten_tuyen, 'Tuyến R1');
});

test('routes: one row per route, the counter and unknown routes have no capacity, C5 reference present', async () => {
    const result = await get(session('LEADER'), `/capacity/routes?${PERIOD}&bcvh=${OWN}`);
    assert.equal(result.status, 200);
    const byKey = Object.fromEntries(result.body.data.rows.map((row) => [row.ma_tuyen, row]));
    assert.deepEqual(Object.keys(byKey).sort(), ['@NON_POSTMAN', '@OTHER', 'R1', 'R2']);
    assert.equal(byKey.R1.days, 2);
    assert.equal(byKey.R1.days_over, 1);
    assert.equal(byKey.R1.days_under, 1);
    assert.equal(byKey.R1.state, 'CO_NANG_LUC');
    assert.ok(byKey.R1.capacity > 0);
    assert.equal(byKey.R2.capacity, null);
    assert.equal(byKey.R2.state, 'CHUA_DU_DU_LIEU');
    for (const key of ['@NON_POSTMAN', '@OTHER']) {
        assert.equal(byKey[key].capacity, null);
        assert.equal(byKey[key].load_avg, null);
        assert.equal(byKey[key].state, 'KHONG_AP_DUNG');
    }
    assert.equal(byKey['@NON_POSTMAN'].ten_tuyen, 'Phát tại quầy');
    assert.equal(byKey['@OTHER'].rate, 33.3);
    assert.ok(byKey.R1.bcvh_avg_per_route > 0);
});

test('scope: a BCVH-mode account sees its own unit only; another unit is refused', async () => {
    const sid = session('STAFF', { bcvh: [OWN] });
    const own = await get(sid, `/capacity/routes?${PERIOD}`);
    assert.equal(own.status, 200);
    assert.ok(own.body.data.rows.length > 0);
    assert.ok(own.body.data.rows.every((row) => row.ma_bcvh === OWN));
    assert.equal(own.text.includes(`"${OTHER}"`), false);
    assert.equal((await get(sid, `/capacity/routes?${PERIOD}&bcvh=${OTHER}`)).status, 403);
    assert.equal((await get(sid, `/capacity/route-days?${PERIOD}&ma_tuyen=R1&bcvh=${OTHER}`)).status, 403);
    const days = await get(sid, `/capacity/route-days?${PERIOD}&ma_tuyen=R1`); // R1 exists in two units: the scope picks its own
    assert.equal(days.status, 200);
    assert.equal(days.body.data.route.ma_bcvh, OWN);
});

test('a city-wide account asking a route code shared by two units must name the unit', async () => {
    const result = await get(session('LEADER'), `/capacity/route-days?${PERIOD}&ma_tuyen=R1`);
    assert.equal(result.status, 400);
});

test('401 without session, 400 for a missing period, a missing route or a bad month', async () => {
    assert.equal((await get(null, `/capacity/routes?${PERIOD}`)).status, 401);
    const sid = session('LEADER');
    for (const url of ['/capacity/routes', '/capacity/routes?month=2026-13', '/capacity/route-days?from=2026-09-01&to=2026-09-09', `/capacity/route-days?${PERIOD}&ma_tuyen=@OTHER`]) {
        assert.equal((await get(sid, url)).status, 400, url);
    }
});
