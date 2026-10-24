// RBAC-01 step 3 (F1.3): end-to-end leak test through the real /api/f13 router, middleware order
// and response cache, on an isolated fixture database with three BCVH.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13-scope-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f13_scope.sqlite');
// Importing the F1.3 router loads the Import registry, which insists on an isolated sandbox root in tests.
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { clearResponseCache } = require('../middleware/responseCache');
const f13Routes = require('./f13Routes');

const OWN = '537015'; // BCVH Thuận An
const SECOND = '535790'; // BCVH A Lưới
const OTHER = '533140'; // BCVH Thuận Hóa
const NAMES = { 537015: 'BCVH Thuận An', 535790: 'BCVH A Lưới', 533140: 'BCVH Thuận Hóa' };
const ANCHOR = '2026-10-20';

let server;
let baseUrl;

const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));

async function insertDay(date, code, index) {
    for (let i = 0; i < 6; i += 1) {
        const passed = i < 3 + (index % 3);
        await run(
            `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_tinh_phat, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat,
                                   thoi_gian_ptc, thoi_gian_nop_tien, danh_gia_2026, ket_qua_f13)
             VALUES (?, ?, '53', ?, ?, ?, ?, 'Tuyến phát xã', ?, ?, ?, ?)`,
            [date, `BG${code}${date}${i}`, code, NAMES[code], `${code}0${i % 3}`, `Tuyến ${code} ${i % 3}`,
                `${date} 10:00:00`, `${date} 15:00:00`, passed ? 'Đạt' : 'Không đạt', passed ? 'Đạt' : 'Không đạt'],
        );
    }
}

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    const codes = [OWN, SECOND, OTHER];
    const days = [];
    for (let d = 1; d <= 20; d += 1) days.push(`2026-10-${String(d).padStart(2, '0')}`);
    for (let d = 1; d <= 30; d += 1) days.push(`2026-09-${String(d).padStart(2, '0')}`);
    await run('BEGIN');
    for (const date of days) for (const [index, code] of codes.entries()) await insertDay(date, code, index + Number(date.slice(-2)));
    await run('COMMIT');

    const app = express();
    app.use('/api/f13', f13Routes);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/f13`;
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

// A BCVH code or name that is not allowed anywhere in the payload (keys and values) is a leak.
function foreignHits(text, allowedCodes) {
    const hits = [];
    for (const code of Object.keys(NAMES)) {
        if (allowedCodes.includes(code)) continue;
        if (text.includes(code)) hits.push(code);
        if (text.includes(NAMES[code])) hits.push(NAMES[code]);
    }
    return hits;
}

async function weekAndMonthIds(sessionId) {
    const weeks = (await get(sessionId, '/ranking/bcvh/weeks')).body.data.weeks;
    const months = (await get(sessionId, '/ranking/bcvh/months')).body.data.months;
    return {
        week: weeks[weeks.length - 2]?.week_id, compareWeek: weeks[weeks.length - 3]?.week_id,
        month: months[months.length - 1]?.month_id, compareMonth: months[months.length - 2]?.month_id,
    };
}

function scopedEndpoints(ids, code = OWN) {
    return [
        `/dashboard/kpi?from_date=2026-10-01&to_date=${ANCHOR}`,
        `/dashboard/kpi?from_date=2026-10-01&to_date=${ANCHOR}&ma_bcvh=all`,
        `/dashboard/daily-trend?from_date=2026-10-10&to_date=${ANCHOR}`,
        `/dashboard/quality-timeline?toDate=${ANCHOR}&include_national_rank=1`,
        `/dashboard/quality-timeline?toDate=${ANCHOR}&mode=heatmap&include_national_rank=1`,
        `/dashboard/top?fromDate=2026-10-01&toDate=${ANCHOR}`,
        '/dashboard/meta',
        `/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`,
        `/ranking/bcvh/overview?anchor_date=${ANCHOR}`,
        '/ranking/bcvh/weeks',
        '/ranking/bcvh/months',
        `/ranking/bcvh/weekly-comparison?week=${ids.week}&compare_week=${ids.compareWeek}`,
        `/ranking/bcvh/weekly-trend?week=${ids.week}`,
        `/ranking/bcvh/monthly-comparison?month=${ids.month}&compare_month=${ids.compareMonth}`,
        `/ranking/bcvh/window-comparison?to_date=${ANCHOR}`,
        `/ranking/route?date=${ANCHOR}&bcvh=${code}&route_type=all`,
        `/ranking/route/periods?bcvh=${code}&anchor_date=${ANCHOR}&route_type=all`,
        `/recommendations?fromDate=2026-10-01&toDate=${ANCHOR}`,
        `/evidence-list?date=${ANCHOR}&bcvh=${code}`,
        `/evidence?date=${ANCHOR}&bcvh=${code}`,
    ];
}

test('BCVH user: no F1.3 endpoint ever returns another BCVH (codes or names, keys or values)', async () => {
    const sessionId = session('STAFF', { bcvh: [OWN] });
    const ids = await weekAndMonthIds(sessionId);
    assert.ok(ids.week && ids.month, 'fixture must produce week and month ids');

    let nonEmpty = 0;
    for (const endpoint of scopedEndpoints(ids)) {
        const first = await get(sessionId, endpoint);
        assert.equal(first.status, 200, `${endpoint} -> ${first.status} ${first.text.slice(0, 200)}`);
        const hits = foreignHits(first.text, [OWN]);
        assert.deepEqual(hits, [], `LEAK in ${endpoint}: ...${hits.length ? first.text.slice(Math.max(0, first.text.indexOf(hits[0]) - 80), first.text.indexOf(hits[0]) + 80) : ''}...`);
        // the cached copy must be just as clean
        const second = await get(sessionId, endpoint);
        assert.deepEqual(foreignHits(second.text, [OWN]), [], `LEAK in cached ${endpoint}`);
        if (first.text.includes(OWN) || first.text.includes(NAMES[OWN])) nonEmpty += 1;
    }
    assert.ok(nonEmpty >= 12, `test must not be vacuous: only ${nonEmpty} responses mention the own BCVH`);
});

test('BCVH user: city totals, ranks and province ranks are removed from the all-BCVH tables', async () => {
    const sessionId = session('STAFF', { bcvh: [OWN] });
    const ids = await weekAndMonthIds(sessionId);

    const ranking = (await get(sessionId, `/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
    assert.equal(ranking.data.length, 1);
    assert.equal(ranking.data[0].ma_bcvh, OWN);
    assert.equal('rank' in ranking.data[0], false);
    assert.equal('total_row' in ranking.meta, false);
    assert.equal('national_rank' in ranking.meta, false);

    const overview = (await get(sessionId, `/ranking/bcvh/overview?anchor_date=${ANCHOR}`)).body.data;
    assert.ok(overview.mtd.every((row) => row.ma_bcvh === OWN) && overview.mtd.length === 1);
    assert.ok(overview.mtd.every((row) => !('rank' in row)));
    assert.equal('national_rank' in overview.meta, false);

    const weekly = (await get(sessionId, `/ranking/bcvh/weekly-comparison?week=${ids.week}&compare_week=${ids.compareWeek}`)).body.data;
    assert.equal(weekly.rows.length, 1);
    assert.equal('total_row' in weekly, false);

    const trend = (await get(sessionId, `/ranking/bcvh/weekly-trend?week=${ids.week}`)).body.data;
    assert.ok(trend.weeks.every((week) => Object.keys(week.units || {}).every((code) => code === OWN) && !('total' in week) && !('national_rank' in week)));

    const monthly = (await get(sessionId, `/ranking/bcvh/monthly-comparison?month=${ids.month}&compare_month=${ids.compareMonth}`)).body.data;
    assert.equal(monthly.rows.length, 1);
    assert.equal('total_row' in monthly, false);
});

test('BCVH user cannot widen the scope: other BCVH in any BCVH parameter is a 403, "all" stays pinned', async () => {
    const sessionId = session('STAFF', { bcvh: [OWN] });
    const forbidden = [
        `/dashboard/kpi?from_date=2026-10-01&to_date=${ANCHOR}&ma_bcvh=${OTHER}`,
        `/dashboard/daily-trend?from_date=2026-10-10&to_date=${ANCHOR}&ma_bcvh=${OTHER}`,
        `/dashboard/daily-trend?from_date=2026-10-10&to_date=${ANCHOR}&bcvh_id=${OTHER}`,
        `/dashboard/quality-timeline?toDate=${ANCHOR}&ma_bcvh=${OTHER}`,
        `/ranking/bcvh/window-comparison?to_date=${ANCHOR}&ma_bcvh=${OTHER}`,
        `/ranking/route?date=${ANCHOR}&bcvh=${OTHER}`,
        `/ranking/route/periods?bcvh=${OTHER}&anchor_date=${ANCHOR}`,
        `/evidence-list?date=${ANCHOR}&bcvh=${OTHER}`,
        `/evidence?date=${ANCHOR}&bcvh=${OTHER}`,
    ];
    for (const endpoint of forbidden) {
        const response = await get(sessionId, endpoint);
        assert.equal(response.status, 403, `${endpoint} -> ${response.status}`);
        assert.equal(response.body.error.code, 'OUT_OF_SCOPE');
        assert.deepEqual(foreignHits(response.text, [OWN]), [], `error body leaks in ${endpoint}`);
    }

    // The same URL asked by a leader is NOT cached for the BCVH user and vice versa.
    const leader = session('LEADER');
    const url = `/dashboard/kpi?from_date=2026-10-01&to_date=${ANCHOR}`;
    const leaderBody = (await get(leader, url)).body.data;
    const userBody = (await get(sessionId, url)).body.data;
    const ownKpi = (await get(leader, `${url}&ma_bcvh=${OWN}`)).body.data;
    assert.notDeepEqual(leaderBody, userBody, 'BCVH user must not receive the city-wide KPI');
    assert.deepEqual(userBody, ownKpi, 'BCVH user without ma_bcvh gets exactly their own BCVH KPI');
});

test('multi-BCVH user: separate rows, no merged view, first BCVH is the default for single-unit endpoints', async () => {
    const sessionId = session('STAFF', { bcvh: [OWN, SECOND] });
    const ranking = (await get(sessionId, `/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
    assert.deepEqual(ranking.data.map((row) => row.ma_bcvh).sort(), [SECOND, OWN].sort());
    assert.deepEqual(foreignHits(JSON.stringify(ranking), [OWN, SECOND]), []);

    const leader = session('LEADER');
    const url = `/dashboard/kpi?from_date=2026-10-01&to_date=${ANCHOR}`;
    const defaultKpi = (await get(sessionId, url)).body.data;
    const firstKpi = (await get(leader, `${url}&ma_bcvh=${SECOND}`)).body.data; // sorted scope -> 535790 first
    assert.deepEqual(defaultKpi, firstKpi);
    const secondKpi = (await get(sessionId, `${url}&ma_bcvh=${OWN}`)).body.data;
    assert.deepEqual(secondKpi, (await get(leader, `${url}&ma_bcvh=${OWN}`)).body.data);
});

test('leader sees every BCVH and the totals; user without F1.3 gets 403 everywhere; admin-only routes stay admin-only', async () => {
    const leader = session('LEADER');
    const ranking = (await get(leader, `/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
    assert.ok(ranking.data.length >= 3);
    assert.ok('total_row' in ranking.meta);

    const f12only = session('STAFF', { indicators: ['F1.2'] });
    const ids = await weekAndMonthIds(leader);
    for (const endpoint of scopedEndpoints(ids)) {
        assert.equal((await get(f12only, endpoint)).status, 403, endpoint);
    }

    const staff = session('STAFF', { bcvh: [OWN] });
    assert.equal((await get(staff, `/rca/pareto?date=${ANCHOR}`)).status, 403);
    assert.equal((await get(session('ADMIN'), `/rca/pareto?date=${ANCHOR}`)).status, 200);
});

test('F1.3 specialist (indicator scope) sees the whole city, same as a leader', async () => {
    const specialist = session('STAFF', { indicators: ['F1.3'] });
    const ranking = (await get(specialist, `/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
    assert.ok(ranking.data.length >= 3);
    assert.ok('total_row' in ranking.meta);
});

test('route wiring: requireModule(f13) is mounted before cachedRead', () => {
    const source = fs.readFileSync(path.join(__dirname, 'f13Routes.js'), 'utf8');
    assert.match(source, /requireModule\('f13'\), cachedRead\(/);
});
