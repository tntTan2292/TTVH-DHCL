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
