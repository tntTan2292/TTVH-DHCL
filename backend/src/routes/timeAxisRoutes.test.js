// TIME-AXIS-TEMPLATE-01: the template endpoints of the other indicators, through the real auth and scope middleware.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-time-axis-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'time_axis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');

const { db } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const { clearResponseCache } = require('../middleware/responseCache');
const { createTimeAxisRoutes } = require('./timeAxisRoutes');

const OWN = '537015';
const OTHER = '533140';
const calls = [];
const service = {
    compareSamePeriod: async (from, to, options) => {
        calls.push({ from, to, ...options });
        return {
            rows: [{ ma_bcvh: OWN, ten_bcvh: 'BCVH Thuận An' }, { ma_bcvh: OTHER, ten_bcvh: 'BCVH Thuận Hóa' }],
            meta: { from_date: from, to_date: to, total_row: { volume: 9 } },
        };
    },
};

let server;
let baseUrl;

test.before(async () => {
    const app = express();
    app.use('/api/f41/v2', createTimeAxisRoutes({ indicatorId: 'f41', service, getLatestDate: async () => '2026-11-01' }));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/f41/v2`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

test.beforeEach(() => { clearResponseCache(); calls.length = 0; });

function session(tier, { bcvh = [], indicators = [] } = {}) {
    const access = resolveAccess({ tier, bcvh, indicators });
    return authSessionStore.createSession({ username: `${tier}-${bcvh.join('-')}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

async function get(sid, url) {
    const response = await fetch(`${baseUrl}${url}`, { headers: sid ? { 'x-session-id': sid } : {} });
    return { status: response.status, body: await response.json().catch(() => null) };
}

test('no session is refused', async () => {
    assert.equal((await get(null, '/layout')).status, 401);
});

test('layout of F4.1: the three time pages, its own blocks, no Chuyên đề and no operating pattern', async () => {
    const { body } = await get(session('LEADER'), '/layout');
    assert.deepEqual(body.data.pages.map((p) => p.id), ['ngay', 'tuan', 'thang']);
    const ids = body.data.pages.flatMap((p) => p.blocks).map((b) => b.id);
    assert.ok(ids.includes('day.operation'));
    assert.ok(!ids.some((id) => id.startsWith('topic.') || id.endsWith('.pattern') || id === 'day.table'));
    assert.equal(body.data.indicator, 'f41');
    assert.equal(body.data.units.allow_all, true);
});

test('a BCVH-mode account: no operation table in the layout, own row only, no total, another unit refused', async () => {
    const sid = session('STAFF', { bcvh: [OWN] });
    const layout = await get(sid, '/layout');
    const ids = layout.body.data.pages.flatMap((p) => p.blocks).map((b) => b.id);
    assert.ok(!ids.includes('day.operation'));
    assert.equal(layout.body.data.units.allow_all, false);

    const summary = await get(sid, '/day/summary?from=2026-10-01&to=2026-10-15');
    assert.equal(summary.status, 200);
    assert.deepEqual(summary.body.data.rows.map((r) => r.ma_bcvh), [OWN]);
    assert.equal(summary.body.data.meta.total_row, undefined);
    assert.equal((await get(sid, `/day/summary?from=2026-10-01&to=2026-10-15&ma_bcvh=${OTHER}`)).status, 403);
});

test('a city-wide account gets the total and can narrow to one unit; missing or too long ranges are refused', async () => {
    const sid = session('LEADER');
    const all = await get(sid, '/day/summary?from=2026-10-01&to=2026-10-15&ma_bcvh=all');
    assert.equal(all.body.data.meta.total_row.volume, 9);
    assert.equal(calls[0].bcvhId, null);
    await get(sid, `/day/summary?from=2026-10-01&to=2026-10-15&ma_bcvh=${OTHER}`);
    assert.equal(calls[1].bcvhId, OTHER);
    assert.equal((await get(sid, '/day/summary?from=2026-10-01')).status, 400);
    assert.equal((await get(sid, '/day/summary?from=2024-01-01&to=2026-10-15')).status, 400);
});

test('period resolve uses the latest day of this indicator', async () => {
    const { body } = await get(session('LEADER'), '/period/resolve?kind=latest');
    assert.equal(body.data.day, '2026-11-01');
    assert.equal(body.data.month.month_id, '2026-11');
    assert.equal((await get(session('LEADER'), '/period/resolve')).status, 400);
});
