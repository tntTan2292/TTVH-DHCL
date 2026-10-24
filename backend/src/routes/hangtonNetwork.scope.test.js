// RBAC-01 step 3 (Hang ton and Quan ly mang luoi): end-to-end leak test through the real routers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-hangton-scope-'));
const dbFile = path.join(tmpDir, 'hangton_scope.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbFile;
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');
process.env.QIS_TEST_NETWORK_ARCHIVE_ROOT = path.join(tmpDir, 'network-archive');

const { db, run } = require('../config/db');
const { applyHangtonInventory01Schema } = require('../../migrate_hangton_inventory_01_schema');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const createHangtonRouter = require('./hangtonRoutes');
const networkMapRoutes = require('./networkMapRoutes');

const OFFICES = {
    537015: 'BCVH Thuận An', 535790: 'BCVH A Lưới', 535710: 'KT A Lưới', 533140: 'BCVH Thuận Hóa',
    536250: 'BCVH Hương Thủy', 530100: 'KTC1 Huế 1', 531110: 'Trung tâm Hành chính công',
};
let server;
let baseUrl;

const exec = (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));

async function addSnapshot(id, date, itemsPerOffice, offsetFor) {
    await run(
        `INSERT INTO hangton_snapshot (id, business_date, slot, captured_at, source_row_count, kept_row_count, is_stale, trigger)
         VALUES (?, ?, '0730', ?, 9999, 7777, 0, 'SCHEDULE')`,
        [id, date, `${date}T07:30:00`],
    );
    for (const [code, name] of Object.entries(OFFICES)) {
        for (let i = 0; i < itemsPerOffice; i += 1) {
            const n = i + offsetFor;
            await run(
                `INSERT INTO hangton_snapshot_item (snapshot_id, item_code, status_name, ton_level, ton_rank, office, office_code, district, cod, parcel_type, customer_class, postman_code, postman_name, reason, weight)
                 VALUES (?, ?, 'Đã xác nhận đến', ?, ?, ?, ?, 'Huế', ?, 'BG KO COD', 'KH Thường', NULL, NULL, NULL, 1)`,
                [id, `ZZ${code.slice(2)}Q${String(n).padStart(3, '0')}`, n % 2 ? '≥5 ngày' : '<1 ngày', n % 2 ? 5 : 0, name, code, n * 1000],
            );
        }
    }
}

test.before(async () => {
    await applyHangtonInventory01Schema(dbFile);
    await exec(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await addSnapshot(1, '2026-10-19', 6, 0);
    await addSnapshot(2, '2026-10-20', 6, 2); // overlaps 4 items per office, 2 resolved, 2 new

    const app = express();
    app.use(express.json());
    app.use('/api/hangton', createHangtonRouter({ db: require('../config/db') }));
    app.use('/api/network-map', networkMapRoutes);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

function session(tier, { bcvh = [], indicators = [] } = {}) {
    const access = resolveAccess({ tier, bcvh, indicators });
    return authSessionStore.createSession({ username: `${tier}-${bcvh.join('-')}-${indicators.join('-')}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function get(sessionId, pathAndQuery) {
    const response = await fetch(`${baseUrl}${pathAndQuery}`, { headers: { 'x-session-id': sessionId } });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* csv */ }
    return { status: response.status, text, body };
}

// Foreign office codes and names (the parcel codes embed the office code on purpose).
function foreignHits(text, allowedCodes) {
    const hits = [];
    for (const [code, name] of Object.entries(OFFICES)) {
        if (allowedCodes.includes(code)) continue;
        if (text.includes(code)) hits.push(code);
        if (text.includes(name)) hits.push(name);
    }
    return hits;
}

const hangtonUrls = [
    '/hangton/snapshots',
    '/hangton/overview?date=2026-10-20',
    '/hangton/overview?date=2026-10-20&customers=KH Thường',
    '/hangton/items?date=2026-10-20&limit=500',
    '/hangton/items?date=2026-10-20&min_rank=5&sort=office&dir=asc',
    '/hangton/items/export?date=2026-10-20&format=csv',
    '/hangton/compare?date=2026-10-20&detail=1',
];

test('BCVH user: Hang ton returns only the own office, in every endpoint (including export and compare details)', async () => {
    const sessionId = session('STAFF', { bcvh: ['537015'] });
    for (const url of hangtonUrls) {
        const response = await get(sessionId, url);
        assert.equal(response.status, 200, `${url} -> ${response.status} ${response.text.slice(0, 160)}`);
        const hits = foreignHits(response.text, ['537015']);
        assert.deepEqual(hits, [], `LEAK in ${url}: ${hits.join(',')}`);
        assert.ok(response.text.includes('537015') || response.text.includes('Thuận An') || url.includes('snapshots'), `vacuous ${url}`);
    }

    const overview = (await get(sessionId, '/hangton/overview?date=2026-10-20')).body.data;
    assert.equal(overview.total, 6, 'totals count only the own office');
    assert.deepEqual(overview.by_office.map((row) => row.office), ['BCVH Thuận An']);
    assert.equal('source_row_count' in overview.snapshot, false, 'extract size of the whole portal stays hidden');

    const items = (await get(sessionId, '/hangton/items?date=2026-10-20&limit=500')).body.data;
    assert.equal(items.total, 6);
    assert.ok(items.rows.every((row) => row.office === 'BCVH Thuận An'));

    const compare = (await get(sessionId, '/hangton/compare?date=2026-10-20&detail=1')).body.data;
    assert.deepEqual(compare.summary, { resolved: 2, aged_up: compare.summary.aged_up, aged_down: compare.summary.aged_down, new: 2, unchanged: compare.summary.unchanged });
    assert.equal(Object.values(compare.summary).reduce((a, b) => a + b, 0), 8, 'own office only: 6 + 2 new');
    assert.ok(compare.by_office.every((row) => row.office === 'BCVH Thuận An'));

    const snapshots = (await get(sessionId, '/hangton/snapshots')).body.data;
    assert.ok(snapshots.length === 2 && snapshots.every((snapshot) => !('source_row_count' in snapshot) && !('kept_row_count' in snapshot)));
});

test('BCVH user cannot widen the office scope through the office filter', async () => {
    const sessionId = session('STAFF', { bcvh: ['537015'] });
    const other = await get(sessionId, `/hangton/items?date=2026-10-20&office=${encodeURIComponent('BCVH Thuận Hóa')}`);
    assert.equal(other.status, 200);
    assert.equal(other.body.data.total, 0);
    assert.deepEqual(foreignHits(other.text, ['537015']), []);
});

test('A Lưới user also owns KT A Lưới (535710); the F1.2 specialist sees only KTC1 (530100)', async () => {
    const aluoi = session('STAFF', { bcvh: ['535790'] });
    const overview = (await get(aluoi, '/hangton/overview?date=2026-10-20')).body.data;
    assert.deepEqual(overview.by_office.map((row) => row.office).sort(), ['BCVH A Lưới', 'KT A Lưới']);
    assert.equal(overview.total, 12);
    assert.deepEqual(foreignHits(JSON.stringify(overview), ['535790', '535710']), []);

    const f12 = session('STAFF', { indicators: ['F1.2'] });
    const response = await get(f12, '/hangton/overview?date=2026-10-20');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.by_office.map((row) => row.office), ['KTC1 Huế 1']);
    assert.deepEqual(foreignHits(response.text, ['530100']), []);
});

test('leader and admin see every office; a user with no Hang ton access gets 403', async () => {
    for (const who of [session('LEADER'), session('ADMIN')]) {
        const overview = (await get(who, '/hangton/overview?date=2026-10-20')).body.data;
        assert.equal(overview.total, 6 * Object.keys(OFFICES).length);
        assert.equal(overview.by_office.length, Object.keys(OFFICES).length);
        assert.equal(overview.snapshot.source_row_count, 9999);
    }
    const f13only = session('STAFF', { indicators: ['F1.3'] });
    for (const url of hangtonUrls) assert.equal((await get(f13only, url)).status, 403, url);
});

test('manual snapshot run stays admin-only', async () => {
    const post = (sessionId) => fetch(`${baseUrl}/hangton/snapshots/run`, {
        method: 'POST', headers: { 'x-session-id': sessionId, 'content-type': 'application/json' }, body: JSON.stringify({ slot: 'bad' }),
    }).then((response) => response.status);
    assert.equal(await post(session('LEADER')), 403);
    assert.equal(await post(session('STAFF', { bcvh: ['537015'] })), 403);
    assert.equal(await post(session('ADMIN')), 400); // reaches the handler, rejected for the bad slot
});

test('Quan ly mang luoi: BCVH users and the F1.2 specialist get 403 on every read; leader and admin get through', async () => {
    const reads = [
        '/network-map/service-points', '/network-map/level2-routes', '/network-map/delivery-routes/meta',
        '/network-map/delivery-routes/points?date=2026-10-20&bcvh=537015&postman=x',
        '/network-map/postman-catalog', '/network-map/postman-catalog/unnamed', '/network-map/postman-catalog/conflicts',
        '/network-map/postman-catalog/history', '/network-map/import/history/service-points',
    ];
    const bcvh = session('STAFF', { bcvh: ['537015'] });
    const f12 = session('STAFF', { indicators: ['F1.2'] });
    const f13 = session('STAFF', { indicators: ['F1.3'] });
    for (const url of reads) {
        for (const who of [bcvh, f12, f13]) assert.equal((await get(who, url)).status, 403, url);
    }
    const leader = session('LEADER');
    const admin = session('ADMIN');
    for (const url of ['/network-map/service-points', '/network-map/level2-routes', '/network-map/postman-catalog']) {
        assert.equal((await get(leader, url)).status, 200, url);
        assert.equal((await get(admin, url)).status, 200, url);
    }
    // writes remain admin-only: a leader is let through the module gate and stopped by the admin gate
    assert.equal((await get(leader, '/network-map/postman-catalog/history')).status, 403);
    assert.equal((await get(admin, '/network-map/postman-catalog/history')).status, 200);
});

test('route wiring: Hang ton reads declare their screen, the network router is gated before any route', () => {
    const hangton = fs.readFileSync(path.join(__dirname, 'hangtonRoutes.js'), 'utf8');
    for (const route of ['/snapshots', '/overview', '/items', '/items/export', '/compare']) {
        assert.match(hangton, new RegExp(`router\\.get\\('${route.replace('/', '\\/')}', \\.\\.\\.read, requireHangton\\(`), route);
    }
    const network = fs.readFileSync(path.join(__dirname, 'networkMapRoutes.js'), 'utf8');
    assert.ok(network.indexOf('router.use(requireAuth, requireNetworkAccess)') > 0);
    assert.ok(network.indexOf('router.use(requireAuth, requireNetworkAccess)') < network.indexOf("router.get('/service-points'"));
});
