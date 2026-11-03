// F13-V2-STRUCTURE-01: end-to-end test of /api/f13/v2 through the real routers, middleware order and response cache, on an
// isolated fixture database with three BCVH. Checks (1) a BCVH-mode account never receives another BCVH, a city block, a
// total or a rank, (2) a city-wide account sees all of it, (3) the new day table matches the old ranking for one day.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f13v2-scope-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f13v2_scope.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db, run } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { clearResponseCache } = require('../middleware/responseCache');
const f13Routes = require('./f13Routes');
const f13v2Routes = require('./f13v2Routes');

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
    // A code outside the six canonical BCVH: the old ranking gives it a place, the new table must ignore it.
    await run(
        `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_tinh_phat, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, thoi_gian_ptc, thoi_gian_nop_tien, danh_gia_2026, ket_qua_f13)
         VALUES (?, 'BGSTRAY', '53', '531120', 'Mã lạ', '53112000', 'Tuyến lạ', 'Tuyến phát xã', ?, ?, 'Đạt', 'Đạt')`,
        [ANCHOR, `${ANCHOR} 10:00:00`, `${ANCHOR} 11:00:00`],
    );
    await run('COMMIT');

    const app = express();
    app.use('/api/f13/v2', f13v2Routes);
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

function foreignHits(text, allowedCodes) {
    const hits = [];
    for (const code of Object.keys(NAMES)) {
        if (allowedCodes.includes(code)) continue;
        if (text.includes(code)) hits.push(code);
        if (text.includes(NAMES[code])) hits.push(NAMES[code]);
    }
    return hits;
}

function rankKeys(value, found = []) {
    if (Array.isArray(value)) value.forEach((item) => rankKeys(item, found));
    else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            if (/rank/i.test(key) && child !== null) found.push(key);
            rankKeys(child, found);
        }
    }
    return found;
}

const DAY = `/v2/day/summary?from=${ANCHOR}&to=${ANCHOR}`;
const RANGE = '/v2/day/summary?from=2026-10-10&to=2026-10-16';

test('no session -> 401, an account without F1.3 access -> 403', async () => {
    const anonymous = await fetch(`${baseUrl}/v2/layout`);
    assert.equal(anonymous.status, 401);
    const none = session('STAFF', { bcvh: [] });
    assert.equal((await get(none, '/v2/layout')).status, 403);
});

test('BCVH-mode account: layout has no city block and only its own unit', async () => {
    const sid = session('STAFF', { bcvh: [OWN] });
    const { status, body } = await get(sid, '/v2/layout');
    assert.equal(status, 200);
    const blocks = body.data.pages.flatMap((p) => p.blocks);
    assert.ok(blocks.length > 0);
    assert.ok(blocks.every((b) => b.scope !== 'city'));
    assert.equal(body.data.units.allow_all, false);
    assert.deepEqual(body.data.units.bcvh, [OWN]);
});

test('city-wide account: layout holds every block including the city ones', async () => {
    const sid = session('LEADER');
    const { body } = await get(sid, '/v2/layout');
    const blocks = body.data.pages.flatMap((p) => p.blocks);
    assert.ok(blocks.some((b) => b.id === 'day.operation' && b.scope === 'city'));
    assert.equal(body.data.units.allow_all, true);
});

test('BCVH-mode account: day table (one day and a range) has its own row only, no total, no rank', async () => {
    const sid = session('STAFF', { bcvh: [OWN] });
    for (const url of [DAY, RANGE, `${DAY}&ma_bcvh=all`]) {
        const { status, body, text } = await get(sid, url);
        assert.equal(status, 200, url);
        assert.deepEqual(body.data.rows.map((r) => r.ma_bcvh), [OWN], url);
        assert.deepEqual(foreignHits(text, [OWN]), [], url);
        assert.equal(body.data.meta.total_row, undefined, url);
        assert.deepEqual(rankKeys(body), [], url);
    }
});

test('journey: a BCVH-mode account gets its own routes, parcels and figures only; another unit is refused', async () => {
    const sid = session('STAFF', { bcvh: [OWN] });
    const routes = await get(sid, `/v2/journey/routes?date=${ANCHOR}`);
    assert.equal(routes.status, 200);
    assert.ok(routes.body.data.routes.length > 0);
    assert.ok(routes.body.data.routes.every((r) => r.ma_bcvh === OWN));
    assert.equal(routes.body.data.meta.coverage.parcels, 6);
    assert.deepEqual(foreignHits(routes.text, [OWN]), []);
    const parcels = await get(sid, `/v2/journey/parcels?date=${ANCHOR}&ma_bcvh=all`);
    assert.equal(parcels.body.data.meta.total, 6);
    assert.deepEqual(foreignHits(parcels.text, [OWN]), []);
    const refused = await get(sid, `/v2/journey/routes?date=${ANCHOR}&ma_bcvh=${OTHER}`);
    assert.equal(refused.status, 403);
});

test('journey: a city-wide account sees every canonical unit and the stray code is left out; date is required', async () => {
    const sid = session('LEADER');
    const { body } = await get(sid, `/v2/journey/routes?date=${ANCHOR}`);
    assert.deepEqual([...new Set(body.data.routes.map((r) => r.ma_bcvh))].sort(), [OTHER, SECOND, OWN].sort());
    assert.equal(body.data.meta.coverage.parcels, 18);
    assert.equal((await get(sid, '/v2/journey/routes')).status, 400);
});

test('BCVH-mode account asking for another unit is refused', async () => {
    const sid = session('STAFF', { bcvh: [OWN] });
    const { status, body } = await get(sid, `${DAY}&ma_bcvh=${OTHER}`);
    assert.equal(status, 403);
    assert.equal(body.error.code, 'OUT_OF_SCOPE');
});

test('city-wide account: all units, a total row and ranks', async () => {
    const sid = session('LEADER');
    const { body } = await get(sid, DAY);
    assert.deepEqual(body.data.rows.map((r) => r.ma_bcvh).sort(), [OTHER, SECOND, OWN].sort());
    assert.ok(body.data.meta.total_row.volume > 0);
    assert.ok(body.data.rows.every((r) => Number.isInteger(r.rank)));
});

test('cache keeps the scopes apart: a city-wide read does not leak into a later BCVH read', async () => {
    const leader = session('LEADER');
    const staff = session('STAFF', { bcvh: [OWN] });
    await get(leader, DAY);
    const { body, text } = await get(staff, DAY);
    assert.deepEqual(body.data.rows.map((r) => r.ma_bcvh), [OWN]);
    assert.deepEqual(foreignHits(text, [OWN]), []);
});

test('period/resolve answers for any account and rejects bad input', async () => {
    const sid = session('STAFF', { bcvh: [OWN] });
    const ok = await get(sid, `/v2/period/resolve?kind=day&value=${ANCHOR}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.month.month_id, '2026-10');
    assert.equal((await get(sid, '/v2/period/resolve?kind=day&value=2026-13-40')).status, 400);
    assert.equal((await get(sid, '/v2/period/resolve?kind=day')).status, 400);
    const latest = await get(sid, '/v2/period/resolve?kind=latest');
    assert.equal(latest.status, 200);
    assert.equal(latest.body.data.day, ANCHOR);
    assert.equal(latest.body.data.month.month_id, '2026-10');
});

test('day table, one day: same figures as the old /ranking/bcvh (volume, rate, N-1, N-7, late cash, rank)', async () => {
    const sid = session('LEADER');
    const oldBody = (await get(sid, `/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
    const oldRows = new Map(oldBody.data.map((r) => [r.ma_bcvh, r]));
    const rows = (await get(sid, DAY)).body.data.rows;
    assert.ok(rows.length >= 3);
    assert.equal(rows.some((r) => r.ma_bcvh === '531120'), false, 'a non-canonical code reached the table');
    // Ranks are among the canonical BCVH only (the old ranking lets a stray code take a place): 1.. in rate order.
    const ordered = [...rows].sort((a, b) => a.rank - b.rank);
    assert.equal(ordered[0].rank, 1);
    for (let i = 1; i < ordered.length; i += 1) assert.ok(ordered[i - 1].rate >= ordered[i].rate - 0.05, 'rank order follows the rate');
    for (const row of rows) {
        const old = oldRows.get(row.ma_bcvh);
        assert.ok(old, row.ma_bcvh);
        assert.equal(row.volume, old.sl_bg_ptc, `volume ${row.ma_bcvh}`);
        assert.equal(row.rate, old.kpi_2026, `rate ${row.ma_bcvh}`);
        assert.equal(row.late_cash.count, old.delayed_cash_handover_count, `late count ${row.ma_bcvh}`);
        assert.equal(row.late_cash.rate, old.f13_303_rate, `late rate ${row.ma_bcvh}`);
        assert.equal(row.compare.n1.volume, old.comparisons.d1.volume, `n1 volume ${row.ma_bcvh}`);
        assert.equal(row.compare.n1.rate, old.comparisons.d1.f1_3_rate, `n1 rate ${row.ma_bcvh}`);
        assert.equal(row.compare.n1.volume_delta, old.comparisons.d1.volume_delta, `n1 delta ${row.ma_bcvh}`);
        assert.equal(row.compare.n7.volume, old.comparisons.d7.volume, `n7 volume ${row.ma_bcvh}`);
        assert.equal(row.compare.n7.rate, old.comparisons.d7.f1_3_rate, `n7 rate ${row.ma_bcvh}`);
        assert.equal(row.compare.n1.rate_delta, old.kpi_2026_dod, `n1 rate delta ${row.ma_bcvh}`);
        assert.equal(row.compare.n7.rate_delta, old.kpi_2026_swc, `n7 rate delta ${row.ma_bcvh}`);
    }
});

test('day table, one day: the TỔNG CỘNG row equals the old total row (volume, rate, late cash)', async () => {
    const sid = session('LEADER');
    const oldTotal = (await get(sid, `/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body.meta.total_row;
    const total = (await get(sid, DAY)).body.data.meta.total_row;
    assert.equal(total.volume, oldTotal.sl_bg_ptc);
    assert.equal(total.rate, oldTotal.kpi_2026);
    assert.equal(total.late_cash.count, oldTotal.delayed_cash_handover_count);
    assert.equal(total.late_cash.rate, oldTotal.f13_303_rate);
});

test('day table, range: current figures equal the old ranking for the same range', async () => {
    const sid = session('LEADER');
    const oldRows = new Map((await get(sid, '/ranking/bcvh?from_date=2026-10-10&to_date=2026-10-16')).body.data.map((r) => [r.ma_bcvh, r]));
    // 10..16 Oct: N-1 = 3..9 Oct, N-7 = 3..9 Oct as well (a 7-day range is its own week)
    const n1Rows = new Map((await get(sid, '/ranking/bcvh?from_date=2026-10-03&to_date=2026-10-09')).body.data.map((r) => [r.ma_bcvh, r]));
    const n7Rows = n1Rows;
    const { rows, meta } = (await get(sid, RANGE)).body.data;
    assert.equal(meta.days, 7);
    assert.deepEqual(meta.compare.n1, { from_date: '2026-10-03', to_date: '2026-10-09' });
    for (const row of rows) {
        assert.equal(row.volume, oldRows.get(row.ma_bcvh).sl_bg_ptc);
        assert.equal(row.rate, oldRows.get(row.ma_bcvh).kpi_2026);
        assert.ok(row.compare.n1.volume > 0 && row.compare.n7.volume > 0);
        // each window is read back through the old ranking for exactly that window
        assert.equal(row.compare.n1.volume, n1Rows.get(row.ma_bcvh).sl_bg_ptc);
        assert.equal(row.compare.n1.rate, n1Rows.get(row.ma_bcvh).kpi_2026);
        assert.equal(row.compare.n7.volume, n7Rows.get(row.ma_bcvh).sl_bg_ptc);
        assert.equal(row.compare.n7.rate, n7Rows.get(row.ma_bcvh).kpi_2026);
    }
});
