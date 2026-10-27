// RBAC-01 review: the admin user API is reachable by ADMIN only, through the real router and gates.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-admin-routes-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'admin_routes.sqlite');
process.env.QIS_INITIAL_PASSWORD = 'Initial#Pass1';

const { applyRbac01Schema } = require('../../migrate_rbac_01_schema');
const { db } = require('../config/db');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const userStore = require('../services/auth/userStore');
const adminUserRoutes = require('./adminUserRoutes');

let server;
let baseUrl;

test.before(async () => {
    await applyRbac01Schema(process.env.QIS_TEST_DB_PATH);
    await userStore.upsertUser({ username: 'ADMIN1', displayName: 'Admin', tier: 'ADMIN', initialPassword: 'Initial#Pass1' });
    await userStore.upsertUser({ username: 'U1', displayName: 'U1', tier: 'STAFF', bcvh: ['537015'], initialPassword: 'Initial#Pass1' });
    const app = express();
    app.use(express.json());
    app.use('/api/admin/users', adminUserRoutes);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/admin/users`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

const session = (tier, bcvh = []) => authSessionStore.createSession({
    username: `${tier}-${bcvh.join('')}`, role: tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false,
    access: resolveAccess({ tier, bcvh }),
});

async function call(sessionId, method, suffix = '', body) {
    const response = await fetch(`${baseUrl}${suffix}`, {
        method, headers: { 'x-session-id': sessionId || '', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json().catch(() => null) };
}

test('LEADER, STAFF and anonymous callers get 403/401 on every admin-user endpoint; ADMIN gets through', async () => {
    const target = await userStore.findByUsername('U1');
    const calls = [
        ['GET', ''], ['POST', '', { username: 'X', tier: 'ADMIN' }], ['PUT', `/${target.id}`, { tier: 'ADMIN' }],
        ['POST', `/${target.id}/reset-password`], ['POST', `/${target.id}/unlock`],
    ];
    for (const [method, suffix, body] of calls) {
        assert.equal((await call(session('LEADER'), method, suffix, body)).status, 403, `LEADER ${method} ${suffix}`);
        assert.equal((await call(session('STAFF', ['537015']), method, suffix, body)).status, 403, `STAFF ${method} ${suffix}`);
        assert.equal((await call(null, method, suffix, body)).status, 401, `anonymous ${method} ${suffix}`);
    }
    assert.equal((await call(session('ADMIN'), 'GET')).status, 200);
    const unchanged = await userStore.findByUsername('U1');
    assert.equal(unchanged.tier, 'STAFF', 'a non-admin attempt must not have changed anything');
});

test('is_active must be a real boolean (the string "false" is rejected, not read as true)', async () => {
    const target = await userStore.findByUsername('U1');
    const admin = session('ADMIN');
    const bad = await call(admin, 'PUT', `/${target.id}`, { is_active: 'false' });
    assert.equal(bad.status, 400);
    assert.equal((await userStore.findByUsername('U1')).is_active, 1);
    const good = await call(admin, 'PUT', `/${target.id}`, { is_active: false });
    assert.equal(good.status, 200);
    assert.equal((await userStore.findByUsername('U1')).is_active, 0);
});

test('HANGTON-HANDLING-01: positions are set through the admin API, must fit the tier, and reach the access object', async () => {
    const admin = session('ADMIN');
    const created = await call(admin, 'POST', '', { username: 'GD1', display_name: 'GD', tier: 'STAFF', position: 'GD_BCVH', bcvh: ['533140'] });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const row = await userStore.findByUsername('GD1');
    assert.equal(row.position, 'GD_BCVH');
    const sessionUser = await userStore.toSessionUser(row);
    assert.equal(sessionUser.position, 'GD_BCVH');
    assert.ok(sessionUser.access.capabilities.includes('hangton.handling.write'));
    assert.ok(!sessionUser.access.capabilities.includes('hangton.handling.approve'));

    // a position of another tier is refused
    assert.equal((await call(admin, 'POST', '', { username: 'BAD1', tier: 'STAFF', position: 'LD_BDTP', bcvh: ['533140'] })).status, 400);
    assert.equal((await call(admin, 'PUT', `/${row.id}`, { position: 'IT_BDTP' })).status, 400);

    // promote to chuyên quản: approval right appears
    assert.equal((await call(admin, 'PUT', `/${row.id}`, { position: 'CHUYEN_QUAN' })).status, 200);
    const promoted = await userStore.toSessionUser(await userStore.findByUsername('GD1'));
    assert.ok(promoted.access.capabilities.includes('hangton.handling.approve'));

    // changing the tier without a new position drops the old one (a leader never keeps a director's rights)
    assert.equal((await call(admin, 'PUT', `/${row.id}`, { tier: 'LEADER', bcvh: [], indicators: [] })).status, 200);
    const asLeader = await userStore.toSessionUser(await userStore.findByUsername('GD1'));
    assert.equal(asLeader.access.position, 'LD_TTVH', 'default of a leader = the lower leader group');
    assert.deepEqual(asLeader.access.capabilities, ['hangton.handling.view']);

    // the two leader groups
    assert.equal((await call(admin, 'PUT', `/${row.id}`, { position: 'LD_BDTP' })).status, 200);
    assert.equal((await userStore.toSessionUser(await userStore.findByUsername('GD1'))).access.group, 'LEADER_BDTP');

    const listed = (await call(admin, 'GET')).body.data;
    assert.equal(listed.find((u) => u.username === 'GD1').position, 'LD_BDTP');
});
