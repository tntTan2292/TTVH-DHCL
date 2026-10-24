// RBAC-01 step 3 (F1.1 and F4.1): end-to-end leak test through the real /api/f11 and /api/f41 routers,
// session store and response cache on an isolated fixture database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-f11f41-scope-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'f11f41_scope.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.1');

const { db, run } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { restrictPairTable } = require('../services/auth/access/scopeResponse');
const { clearResponseCache } = require('../middleware/responseCache');
const f11Routes = require('./f11Routes');
const f41Routes = require('./f41Routes');

const OWN = '537015'; // BCVH Thuận An
const SECOND = '535790'; // BCVH A Lưới
const OTHER = '533140'; // BCVH Thuận Hóa
const NON_CANONICAL = '531110'; // delivering unit that is not one of the six BCVH ("Khác" column)
const NAMES = { 537015: 'BCVH Thuận An', 535790: 'BCVH A Lưới', 533140: 'BCVH Thuận Hóa', 531110: 'Trung tâm Hành chính công' };
const ANCHOR = '2026-10-20';
const ACCEPTING = [['533140', 'BCVH Thuận Hóa'], ['540001', 'Đơn vị chấp nhận X'], ['540002', 'Đơn vị chấp nhận Y']];

let server;
let baseUrl;
const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));

async function insertDay(date, index) {
    let n = 0;
    for (const delivering of Object.keys(NAMES)) {
        for (const [acceptCode, acceptName] of ACCEPTING) {
            for (let i = 0; i < 4; i += 1) {
                n += 1;
                const passed = (i + index + n) % 3 !== 0;
                const verdict = passed ? 'Đạt' : 'Không đạt';
                const id = `BG${date}${delivering}${acceptCode}${i}`;
                await run(
                    `INSERT INTO fact_f11 (ngay_do_kiem, ma_bg, ma_bc_chap_nhan, ten_bc_chap_nhan, ma_bc_phat, ten_bc_phat, danh_gia_2026)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [date, id, acceptCode, acceptName, delivering, NAMES[delivering], verdict],
                );
                await run(
                    `INSERT INTO fact_f41 (ngay_do_kiem, ma_bg, ma_bc_phat, ten_bc_phat, danh_gia_12_5h, danh_gia_72h,
                                           danh_gia_khong_tms_ptc_8h, danh_gia_co_tms_ptc_8h, danh_gia_khong_tms_ptc_lan_dau_8h, danh_gia_co_tms_ptc_lan_dau_8h)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [date, id, delivering, NAMES[delivering], verdict, verdict, verdict, verdict, verdict, verdict],
                );
            }
        }
    }
}

test.before(async () => {
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    const days = [];
    for (let d = 1; d <= 20; d += 1) days.push(`2026-10-${String(d).padStart(2, '0')}`);
    for (let d = 1; d <= 30; d += 1) days.push(`2026-09-${String(d).padStart(2, '0')}`);
    await run('BEGIN');
    for (const [index, date] of days.entries()) await insertDay(date, index);
    await run('COMMIT');

    const app = express();
    app.use('/api/f11', f11Routes);
    app.use('/api/f41', f41Routes);
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

// Keys that only exist to rank a BCVH against the others (or the province against the country).
function rankKeys(value, found = []) {
    if (Array.isArray(value)) value.forEach((item) => rankKeys(item, found));
    else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            if (/rank/i.test(key) && !/period/i.test(key) && child !== null) found.push(key); // a null rank (not computed for a single BCVH) holds no number
            rankKeys(child, found);
        }
    }
    return found;
}

async function ids(sessionId, prefix) {
    const weeks = (await get(sessionId, `${prefix}/ranking/bcvh/weeks`)).body.data.weeks;
    const months = (await get(sessionId, `${prefix}/ranking/bcvh/months`)).body.data.months;
    return { week: weeks[weeks.length - 2]?.week_id, compareWeek: weeks[weeks.length - 3]?.week_id, month: months[months.length - 1]?.month_id, compareMonth: months[months.length - 2]?.month_id };
}

function endpoints(prefix, id, { f11 }) {
    const list = [
        `${prefix}/dashboard/summary?from_date=2026-10-01&to_date=${ANCHOR}`,
        `${prefix}/dashboard/summary?from_date=2026-10-01&to_date=${ANCHOR}&ma_bcvh=all`,
        `${prefix}/dashboard/daily-trend?from_date=2026-10-10&to_date=${ANCHOR}`,
        `${prefix}/dashboard/meta`,
        `${prefix}/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`,
        `${prefix}/ranking/bcvh/overview?anchor_date=${ANCHOR}`,
        `${prefix}/ranking/bcvh/weeks`,
        `${prefix}/ranking/bcvh/months`,
        `${prefix}/ranking/bcvh/weekly-comparison?week=${id.week}&compare_week=${id.compareWeek}`,
        `${prefix}/ranking/bcvh/weekly-trend?week=${id.week}`,
        `${prefix}/ranking/bcvh/monthly-comparison?month=${id.month}&compare_month=${id.compareMonth}`,
        `${prefix}/ranking/bcvh/window-comparison?to_date=${ANCHOR}`,
    ];
    if (f11) list.push(`${prefix}/dashboard/pair-table?period=day&anchor_date=${ANCHOR}`);
    else list.push(`${prefix}/dashboard/kpi?from_date=2026-10-01&to_date=${ANCHOR}`, `${prefix}/dashboard/kpi?from_date=2026-10-01&to_date=${ANCHOR}&ma_bcvh=all`);
    return list;
}

for (const [label, prefix, f11] of [['F1.1', '/f11', true], ['F4.1', '/f41', false]]) {
    test(`${label} BCVH user: no endpoint returns another BCVH, a rank or a city total`, async () => {
        const sessionId = session('STAFF', { bcvh: [OWN] });
        const id = await ids(sessionId, prefix);
        assert.ok(id.week && id.month, 'fixture must produce week and month ids');

        let nonEmpty = 0;
        for (const endpoint of endpoints(prefix, id, { f11 })) {
            const first = await get(sessionId, endpoint);
            assert.equal(first.status, 200, `${endpoint} -> ${first.status} ${first.text.slice(0, 200)}`);
            // Pair-table accepting rows are complete by design (PO rule 2): mask their labels, scan everything else.
            const scanText = endpoint.includes('pair-table')
                ? JSON.stringify(first.body, (key, value) => (key === 'ma_chap_nhan' || key === 'ten_chap_nhan' ? undefined : value))
                : first.text;
            const hits = foreignHits(scanText, [OWN]);
            assert.deepEqual(hits, [], `LEAK in ${endpoint}: ...${hits.length ? scanText.slice(Math.max(0, scanText.indexOf(hits[0]) - 80), scanText.indexOf(hits[0]) + 80) : ''}...`);
            assert.deepEqual(rankKeys(first.body), [], `rank key in ${endpoint}`);
            const second = await get(sessionId, endpoint); // served from the scoped cache
            // identical to the first (already scanned) body, so the cached copy is as clean as the first answer
            if (!endpoint.includes('pair-table')) assert.deepEqual(foreignHits(second.text, [OWN]), [], `LEAK in cached ${endpoint}`);
            assert.deepEqual(second.body, first.body, `cached copy differs for ${endpoint}`);
            if (first.text.includes(OWN) || first.text.includes(NAMES[OWN])) nonEmpty += 1;
        }
        assert.ok(nonEmpty >= 7, `test must not be vacuous: only ${nonEmpty} responses mention the own BCVH`);
    });

    test(`${label} BCVH user: tables hold only the own rows and no TỔNG CỘNG row`, async () => {
        const sessionId = session('STAFF', { bcvh: [OWN] });
        const id = await ids(sessionId, prefix);
        const ranking = (await get(sessionId, `${prefix}/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
        assert.deepEqual(ranking.data.map((row) => row.ma_bcvh), [OWN]);
        assert.equal('total_row' in ranking.meta, false);

        const overview = (await get(sessionId, `${prefix}/ranking/bcvh/overview?anchor_date=${ANCHOR}`)).body.data;
        assert.deepEqual(overview.mtd.map((row) => row.ma_bcvh), [OWN]);
        assert.ok(overview.monthly.every((row) => row.ma_bcvh === OWN) && overview.daily.every((row) => row.ma_bcvh === OWN));

        const weekly = (await get(sessionId, `${prefix}/ranking/bcvh/weekly-comparison?week=${id.week}&compare_week=${id.compareWeek}`)).body.data;
        assert.deepEqual(weekly.rows.map((row) => row.ma_bcvh), [OWN]);
        assert.equal('total_row' in weekly, false);

        const monthly = (await get(sessionId, `${prefix}/ranking/bcvh/monthly-comparison?month=${id.month}&compare_month=${id.compareMonth}`)).body.data;
        assert.deepEqual(monthly.rows.map((row) => row.ma_bcvh), [OWN]);

        const meta = (await get(sessionId, `${prefix}/dashboard/meta`)).body.data;
        assert.deepEqual(meta.bcvh_units.map((unit) => unit.ma_bcvh), [OWN], 'selector source limited to the scope');
        assert.equal('kpi_scope_note' in meta, false);
    });

    test(`${label} BCVH user cannot widen the scope: foreign BCVH is 403, all stays pinned, caches never mix`, async () => {
        const sessionId = session('STAFF', { bcvh: [OWN] });
        const forbidden = [
            `${prefix}/dashboard/summary?from_date=2026-10-01&to_date=${ANCHOR}&ma_bcvh=${OTHER}`,
            `${prefix}/dashboard/daily-trend?from_date=2026-10-10&to_date=${ANCHOR}&ma_bcvh=${OTHER}`,
            `${prefix}/dashboard/daily-trend?from_date=2026-10-10&to_date=${ANCHOR}&bcvh_id=${OTHER}`,
            `${prefix}/ranking/bcvh/window-comparison?to_date=${ANCHOR}&ma_bcvh=${OTHER}`,
            `${prefix}/ranking/bcvh/window-comparison?to_date=${ANCHOR}&ma_bcvh=${NON_CANONICAL}`,
        ];
        if (!f11) forbidden.push(`${prefix}/dashboard/kpi?from_date=2026-10-01&to_date=${ANCHOR}&ma_bcvh=${OTHER}`);
        for (const endpoint of forbidden) {
            const response = await get(sessionId, endpoint);
            assert.equal(response.status, 403, `${endpoint} -> ${response.status}`);
            assert.equal(response.body.error.code, 'OUT_OF_SCOPE');
            assert.deepEqual(foreignHits(response.text, [OWN]), []);
        }

        const leader = session('LEADER');
        const url = `${prefix}/dashboard/summary?from_date=2026-10-01&to_date=${ANCHOR}`;
        const leaderBody = (await get(leader, url)).body.data;
        const userBody = (await get(sessionId, url)).body.data;
        const ownSummary = (await get(leader, `${url}&ma_bcvh=${OWN}`)).body.data;
        assert.notDeepEqual(leaderBody, userBody, 'BCVH user must not receive the city-wide summary');
        const stripNational = ({ national_rank, ...rest }) => rest;
        assert.deepEqual(stripNational(userBody), stripNational(ownSummary));
    });

    test(`${label} multi-BCVH user: separate rows, never merged`, async () => {
        const sessionId = session('STAFF', { bcvh: [OWN, SECOND] });
        const ranking = (await get(sessionId, `${prefix}/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
        assert.deepEqual(ranking.data.map((row) => row.ma_bcvh).sort(), [SECOND, OWN].sort());
        assert.deepEqual(foreignHits(JSON.stringify(ranking), [OWN, SECOND]), []);
    });

    test(`${label} leader and the indicator specialist see the whole city with totals; others get 403`, async () => {
        const indicator = f11 ? 'F1.1' : 'F4.1';
        for (const who of [session('LEADER'), session('STAFF', { indicators: [indicator] })]) {
            const ranking = (await get(who, `${prefix}/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).body;
            assert.ok(ranking.data.length >= 3);
            assert.ok('total_row' in ranking.meta);
        }
        const otherSpecialist = session('STAFF', { indicators: [f11 ? 'F4.1' : 'F1.1'] });
        assert.equal((await get(otherSpecialist, `${prefix}/ranking/bcvh?from_date=${ANCHOR}&to_date=${ANCHOR}`)).status, 403);
        assert.equal((await get(session('STAFF', { indicators: ['F1.2'] }), `${prefix}/dashboard/meta`)).status, 403);
    });
}

test('F1.1 national ranking and F4.1 BCVH reconciliation are city-wide only', async () => {
    const own = session('STAFF', { bcvh: [OWN] });
    assert.equal((await get(own, `/f11/dashboard/national-ranking?from_date=2026-10-01&to_date=${ANCHOR}`)).status, 403);
    assert.equal((await get(own, `/f41/dashboard/bcvh-reconciliation?date=${ANCHOR}`)).status, 403);
    const leader = session('LEADER');
    assert.equal((await get(leader, `/f41/dashboard/bcvh-reconciliation?date=${ANCHOR}`)).status, 200);
    const specialist = session('STAFF', { indicators: ['F4.1'] });
    assert.equal((await get(specialist, `/f41/dashboard/bcvh-reconciliation?date=${ANCHOR}`)).status, 200);
});

test('F1.1 pair-table matrix: every accepting row stays, only own delivering columns, totals recomputed', async () => {
    const own = session('STAFF', { bcvh: [OWN] });
    const leader = session('LEADER');
    const url = `/f11/dashboard/pair-table?period=day&anchor_date=${ANCHOR}`;
    const full = (await get(leader, url)).body.data;
    const scoped = (await get(own, url)).body.data;

    assert.ok(Object.keys(full.rows[0].cells).length >= 4, 'leader sees all delivering columns incl. non-canonical');
    assert.equal(scoped.rows.length, full.rows.length, 'all accepting directions stay');
    assert.deepEqual(scoped.rows.map((row) => row.ma_chap_nhan), full.rows.map((row) => row.ma_chap_nhan));
    assert.deepEqual(scoped.columns.map((column) => column.ma_bcvh), [OWN]);
    for (const [index, row] of scoped.rows.entries()) {
        assert.deepEqual(Object.keys(row.cells), Object.keys(full.rows[index].cells).includes(OWN) ? [OWN] : []);
        const source = full.rows[index].cells[OWN];
        if (source) {
            assert.equal(row.total.volume, source.volume);
            assert.equal(row.total.passed, source.passed);
            assert.equal(row.total.rate, source.rate);
        }
    }
    assert.deepEqual(Object.keys(scoped.total_row.cells), [OWN]);
    assert.equal(scoped.total_row.total.volume, full.total_row.cells[OWN].volume);
    // The accepting side is deliberately complete (PO rule 2): the Thuận Hóa office may appear as an accepting
    // row, but never as a delivering column, and no other delivering unit may appear at all.
    assert.deepEqual(foreignHits(JSON.stringify(scoped), [OWN, OTHER]), []);
    assert.ok(!JSON.stringify(scoped.columns).includes(OTHER));
});

test('restrictPairTable total recomputation reproduces the service totals when nothing is removed', async () => {
    const leader = session('LEADER');
    const full = (await get(leader, `/f11/dashboard/pair-table?period=day&anchor_date=${ANCHOR}`)).body.data;
    const everyCode = Object.keys(full.rows[0].cells);
    const again = restrictPairTable(full, everyCode);
    for (const [index, row] of full.rows.entries()) {
        assert.deepEqual(again.rows[index].total, row.total, `row ${row.ma_chap_nhan}`);
    }
    assert.deepEqual(again.total_row.total, full.total_row.total);
});

test('route wiring: requireModule precedes cachedRead in f11 and f41', () => {
    for (const [file, module] of [['f11Routes.js', 'f11'], ['f41Routes.js', 'f41']]) {
        const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
        assert.match(source, new RegExp(`requireModule\\('${module}'\\), cachedRead\\(\\)`));
    }
});
