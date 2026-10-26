// RBAC-01 for F4.2: end-to-end leak test through the real /api/f42 router, session store and response cache on an
// isolated fixture database (the F1.1 / F4.1 test, with the postman table added).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f42-scope-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f42_scope.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { clearResponseCache } = require('../middleware/responseCache');
const f42Routes = require('./f42Routes');

const OWN = '537015'; // BCVH Thuận An
const SECOND = '535790'; // BCVH A Lưới
const OTHER = '533140'; // BCVH Thuận Hóa
const NAMES = { 537015: 'BCVH Thuận An', 535790: 'BCVH A Lưới', 533140: 'BCVH Thuận Hóa' };
const ANCHOR = '2026-10-20';

let server;
let baseUrl;
const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    const days = [];
    for (let d = 1; d <= 20; d += 1) days.push(`2026-10-${String(d).padStart(2, '0')}`);
    for (let d = 1; d <= 30; d += 1) days.push(`2026-09-${String(d).padStart(2, '0')}`);
    await run('BEGIN');
    let n = 0;
    for (const [index, date] of days.entries()) {
        for (const office of Object.keys(NAMES)) {
            for (const postman of [`${office}P1`, `${office}P2`]) {
                for (let i = 0; i < 4; i += 1) {
                    n += 1;
                    const verdict = (i + index + n) % 4 === 0 ? null : ((i + index + n) % 3 !== 0 ? 'Đạt' : 'Không đạt');
                    await run(
                        `INSERT INTO fact_f42 (ngay_do_kiem, ma_bg, ma_bc_phat, ten_bc_phat, ma_buu_ta, ten_buu_ta, thoi_gian_gbt, danh_gia)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [date, `BG${n}`, office, NAMES[office], postman, `Postman ${postman}`, `${date} 08:00:00`, verdict],
                    );
                }
            }
        }
    }
    await run('COMMIT');

    const app = express();
    app.use('/api/f42', f42Routes);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.beforeEach(() => clearResponseCache());

function session(tier, { bcvh = [], indicators = [] } = {}) {
    const access = resolveAccess({ tier, bcvh, indicators });
    return authSessionStore.createSession({ username: `${tier}-${bcvh.join('-')}-${indicators.join('-')}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function get(sessionId, pathAndQuery) {
    const response = await fetch(`${baseUrl}${pathAndQuery}`, { headers: sessionId ? { 'x-session-id': sessionId } : {} });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not json */ }
    return { status: response.status, text, body };
}

function foreignHits(text, allowedCodes) {
    const hits = [];
    for (const code of Object.keys(NAMES)) {
        if (allowedCodes.includes(code)) continue;
        if (text.includes(code)) hits.push(code);
        if (text.includes(NAMES[code])) hits.push(NAMES[code]);
    }
    return hits;
}

function rankKeys(value, found = [], inPostmen = false) {
    if (Array.isArray(value)) value.forEach((item) => rankKeys(item, found, inPostmen));
    else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            // the rank of a postman inside the user's own BCVH is the one rank allowed
            if (/rank/i.test(key) && !/period/i.test(key) && child !== null && !(inPostmen && key === 'rank')) found.push(key);
            rankKeys(child, found, inPostmen || key === 'postmen');
        }
    }
    return found;
}

async function ids(sessionId) {
    const weeks = (await get(sessionId, '/f42/ranking/bcvh/weeks')).body.data.weeks;
    const months = (await get(sessionId, '/f42/ranking/bcvh/months')).body.data.months;
    return { week: weeks[weeks.length - 2]?.week_id, compareWeek: weeks[weeks.length - 3]?.week_id, month: months[months.length - 1]?.month_id, compareMonth: months[months.length - 2]?.month_id };
}

function endpoints(id) {
    const prefix = '/f42';
    return [
        `${prefix}/dashboard/summary?from_date=2026-10-01&to_date=${ANCHOR}`,
        `${prefix}/dashboard/summary?from_date=2026-10-01&to_date=${ANCHOR}&ma_bcvh=all`,
        `${prefix}/dashboard/daily-trend?from_date=2026-10-10&to_date=${ANCHOR}`,
        `${prefix}/dashboard/meta`,
        `${prefix}/dashboard/postman-table?period=day&anchor_date=${ANCHOR}`,
        `${prefix}/dashboard/postman-table?period=month&anchor_date=${ANCHOR}&ma_bcvh=all`,
        `${prefix}/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`,
        `${prefix}/ranking/bcvh/overview?anchor_date=${ANCHOR}`,
        `${prefix}/ranking/bcvh/weeks`,
        `${prefix}/ranking/bcvh/months`,
        `${prefix}/ranking/bcvh/weekly-comparison?week=${id.week}&compare_week=${id.compareWeek}`,
        `${prefix}/ranking/bcvh/weekly-trend?week=${id.week}`,
        `${prefix}/ranking/bcvh/monthly-comparison?month=${id.month}&compare_month=${id.compareMonth}`,
        `${prefix}/ranking/bcvh/window-comparison?to_date=${ANCHOR}`,
    ];
}

test('F4.2 BCVH user: no endpoint returns another BCVH, a rank or a city total, cached copies included', async () => {
    const sessionId = session('STAFF', { bcvh: [OWN] });
    const id = await ids(sessionId);
    assert.ok(id.week && id.month, 'fixture must produce week and month ids');

    let nonEmpty = 0;
    for (const endpoint of endpoints(id)) {
        const first = await get(sessionId, endpoint);
        assert.equal(first.status, 200, `${endpoint} -> ${first.status} ${first.text.slice(0, 200)}`);
        const hits = foreignHits(first.text, [OWN]);
        assert.deepEqual(hits, [], `LEAK in ${endpoint}: ...${hits.length ? first.text.slice(Math.max(0, first.text.indexOf(hits[0]) - 80), first.text.indexOf(hits[0]) + 80) : ''}...`);
        assert.deepEqual(rankKeys(first.body), [], `rank key in ${endpoint}`);
        const second = await get(sessionId, endpoint); // served from the scoped cache
        assert.deepEqual(second.body, first.body, `cached copy differs for ${endpoint}`);
        if (first.text.includes(OWN) || first.text.includes(NAMES[OWN])) nonEmpty += 1;
    }
    assert.ok(nonEmpty >= 7, `test must not be vacuous: only ${nonEmpty} responses mention the own BCVH`);
});

test('F4.2 BCVH user: the postman table holds only the own block, own postmen and no TỔNG CỘNG row', async () => {
    const sessionId = session('STAFF', { bcvh: [OWN] });
    const table = (await get(sessionId, `/f42/dashboard/postman-table?period=day&anchor_date=${ANCHOR}`)).body.data;
    assert.deepEqual(table.units.map((unit) => unit.ma_bcvh), [OWN]);
    assert.ok(table.units[0].postmen.length === 2 && table.units[0].postmen.every((p) => String(p.ma_buu_ta).startsWith(OWN)));
    assert.equal('total_row' in table, false);
    const meta = (await get(sessionId, '/f42/dashboard/meta')).body.data;
    assert.deepEqual(meta.bcvh_units.map((unit) => unit.ma_bcvh), [OWN]);
    assert.equal('kpi_scope_note' in meta, false);
    assert.equal(meta.target_rate, 90);
    const ranking = (await get(sessionId, `/f42/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
    assert.deepEqual(ranking.data.map((row) => row.ma_bcvh), [OWN]);
});

test('F4.2 BCVH user cannot widen the scope: a foreign BCVH is 403, the national table too, caches never mix', async () => {
    const sessionId = session('STAFF', { bcvh: [OWN] });
    for (const endpoint of [
        `/f42/dashboard/summary?from_date=2026-10-01&to_date=${ANCHOR}&ma_bcvh=${OTHER}`,
        `/f42/dashboard/daily-trend?from_date=2026-10-10&to_date=${ANCHOR}&ma_bcvh=${OTHER}`,
        `/f42/dashboard/postman-table?period=day&anchor_date=${ANCHOR}&ma_bcvh=${OTHER}`,
        '/f42/dashboard/national-ranking?from_date=2026-10-01&to_date=2026-10-20',
    ]) {
        const result = await get(sessionId, endpoint);
        assert.equal(result.status, 403, endpoint);
    }
    const city = session('ADMIN');
    const cityTable = (await get(city, `/f42/dashboard/postman-table?period=day&anchor_date=${ANCHOR}`)).body.data;
    assert.equal(cityTable.units.length, 6, 'city-wide user sees all six blocks');
    assert.ok(cityTable.total_row.volume > 0);
    const again = (await get(sessionId, `/f42/dashboard/postman-table?period=day&anchor_date=${ANCHOR}`)).body.data;
    assert.deepEqual(again.units.map((unit) => unit.ma_bcvh), [OWN], 'the scoped cache never serves the city body');
});

test('F4.2 users without the module are refused; two-BCVH and F4.2-specialist scopes behave', async () => {
    assert.equal((await get(null, `/f42/dashboard/meta`)).status, 401);
    const none = session('STAFF', { indicators: ['F1.2'] });
    assert.equal((await get(none, '/f42/dashboard/meta')).status, 403, 'a STAFF user of another indicator has no F4.2');
    const specialist = session('STAFF', { indicators: ['F4.2'] });
    const all = await get(specialist, `/f42/dashboard/postman-table?period=day&anchor_date=${ANCHOR}`);
    assert.equal(all.status, 200);
    assert.equal(all.body.data.units.length, 6, 'the F4.2 specialist sees the whole indicator');
    const leader = session('LEADER');
    assert.equal((await get(leader, '/f42/dashboard/national-ranking?from_date=2026-10-01&to_date=2026-10-20')).status, 200);
    const two = session('STAFF', { bcvh: [OWN, SECOND] });
    const own = await get(two, `/f42/dashboard/meta`);
    assert.deepEqual(own.body.data.bcvh_units.map((u) => u.ma_bcvh).sort(), [SECOND, OWN].sort());
});

test('review (Opus): a BCVH user cannot read their own rank from the position of their row by paging', async () => {
    const sessionId = session('STAFF', { bcvh: [OWN] });
    const city = session('ADMIN');
    let ownRowPages = 0;
    for (let page = 1; page <= 6; page += 1) {
        const scoped = await get(sessionId, `/f42/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}&page=${page}&page_size=1`);
        assert.equal(scoped.status, 200);
        if (scoped.body.data.length > 0) ownRowPages += 1;
        assert.deepEqual(scoped.body.data.map((row) => row.ma_bcvh), [OWN], `page ${page}`);
        assert.deepEqual(rankKeys(scoped.body), []);
    }
    assert.equal(ownRowPages, 6, 'every page gives the same own row: the page number carries no rank information');
    const wide = await get(city, `/f42/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}&page=2&page_size=1`);
    assert.equal(wide.body.data.length, 1, 'a city-wide user still pages normally');
});

test('wiring: requireModule(f42) is mounted before cachedRead() so the cache key carries the scope', () => {
    const source = fs.readFileSync(path.join(__dirname, 'f42Routes.js'), 'utf8');
    const module = source.indexOf("requireModule('f42')");
    const cache = source.indexOf('cachedRead()');
    assert.ok(module > 0 && cache > 0 && module < cache);
    assert.ok(source.indexOf('router.use(scopeBcvhResponse())') > cache, 'the router-level sanitiser follows the cache');
});
