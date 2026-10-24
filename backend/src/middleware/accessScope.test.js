const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qis-scope-')), 'scope_test.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = tmpDb;

const { db } = require('../config/db');
const { cachedRead, clearResponseCache } = require('./responseCache');
const { requireAuth } = require('./authMiddleware');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const {
    requireModule, requireAdminAccess, effectiveBcvh, scopedBcvhList, scopeKey, OutOfScopeError,
} = require('./accessScope');

function makeRes() {
    return {
        statusCode: 200, headers: {}, body: undefined,
        set(k, v) { this.headers[k] = v; return this; },
        status(c) { this.statusCode = c; return this; },
        type() { return this; },
        send(b) { this.body = JSON.parse(b); return this; },
        json(b) { this.body = b; return this; },
    };
}

function sessionFor(user) {
    const access = resolveAccess({ tier: user.tier, bcvh: user.bcvh, indicators: user.indicators });
    return authSessionStore.createSession({ id: undefined, username: user.username, role: user.tier === 'ADMIN' ? 'admin' : 'viewer', must_change_password: false, access });
}

// Runs requireAuth -> requireModule -> cachedRead -> handler exactly as the routes are mounted.
async function request(user, url, moduleKey, handler) {
    const req = {
        method: 'GET', originalUrl: url, path: url.split('?')[0],
        header: (name) => (name.toLowerCase() === 'x-session-id' ? user.sessionId : undefined),
    };
    const res = makeRes();
    const cache = cachedRead();
    const steps = [requireAuth, requireModule(moduleKey), cache];
    let handled = false;
    const run = async (i) => {
        if (i === steps.length) { handled = true; handler(req, res); return; }
        await steps[i](req, res, () => run(i + 1));
    };
    await run(0);
    return { req, res, handled };
}

const thuanHoa = { tier: 'STAFF', username: 'thuanhoa', bcvh: ['533140'] };
const huongThuy = { tier: 'STAFF', username: 'huongthuy', bcvh: ['536250'] };
const leader = { tier: 'LEADER', username: 'leader' };
const f12only = { tier: 'STAFF', username: 'dung', indicators: ['F1.2'] };

test.beforeEach(() => {
    authSessionStore.clear();
    clearResponseCache();
    for (const user of [thuanHoa, huongThuy, leader, f12only]) user.sessionId = sessionFor(user);
});
test.after(() => db.close());

test('requireModule: BCVH users get 403 on F1.2, F1.2 specialist and leader get through, others on their own modules', async () => {
    const ok = (req, res) => res.json({ success: true });
    assert.equal((await request(thuanHoa, '/x', 'f12', ok)).res.statusCode, 403);
    assert.equal((await request(thuanHoa, '/x', 'f13', ok)).res.statusCode, 200);
    assert.equal((await request(f12only, '/x', 'f12', ok)).res.statusCode, 200);
    assert.equal((await request(f12only, '/x', 'f13', ok)).res.statusCode, 403);
    assert.equal((await request(leader, '/x', 'f12', ok)).res.statusCode, 200);
});

test('requireModule rejects sessions without a resolved access object and unknown module names', async () => {
    const legacy = { sessionId: authSessionStore.createSession({ username: 'old', role: 'viewer' }) };
    const res = (await request(legacy, '/x', 'f13', () => {})).res;
    assert.equal(res.statusCode, 401);
    assert.throws(() => requireModule('f99'));
});

test('cache isolation: two scopes requesting the same URL never share an entry', async () => {
    const url = '/dashboard/kpi?from_date=2026-10-01';
    const handlerFor = (label) => (req, res) => res.json({ success: true, scope: req.scope.bcvh, by: label });

    const a1 = await request(thuanHoa, url, 'f13', handlerFor('A'));
    assert.equal(a1.res.headers['X-QIS-Cache'], 'MISS');
    assert.deepEqual(a1.res.body.scope, ['533140']);

    const b1 = await request(huongThuy, url, 'f13', handlerFor('B'));
    assert.equal(b1.handled, true, 'second scope must run its own handler, not read the first scope cache');
    assert.equal(b1.res.headers['X-QIS-Cache'], 'MISS');
    assert.deepEqual(b1.res.body.scope, ['536250']);

    const l1 = await request(leader, url, 'f13', handlerFor('L'));
    assert.equal(l1.handled, true);
    assert.equal(l1.res.headers['X-QIS-Cache'], 'MISS');

    const a2 = await request(thuanHoa, url, 'f13', handlerFor('A2'));
    assert.equal(a2.handled, false);
    assert.equal(a2.res.headers['X-QIS-Cache'], 'HIT');
    assert.equal(a2.res.body.by, 'A');
    assert.deepEqual(a2.res.body.scope, ['533140']);

    const b2 = await request(huongThuy, url, 'f13', handlerFor('B2'));
    assert.equal(b2.res.headers['X-QIS-Cache'], 'HIT');
    assert.equal(b2.res.body.by, 'B');
});

test('scopeKey: unscoped route is empty, all-mode is "all", bcvh-mode is the sorted code list', () => {
    assert.equal(scopeKey({}), '');
    assert.equal(scopeKey({ scope: { mode: 'all', bcvh: [] } }), 'all');
    assert.equal(scopeKey({ scope: { mode: 'bcvh', bcvh: ['537220', '535790'] } }), 'b:535790,537220');
});

test('effectiveBcvh: clients can narrow the scope, never widen it, and never get a merged view', () => {
    const multi = { scope: { mode: 'bcvh', bcvh: ['535790', '537220'] } };
    assert.equal(effectiveBcvh(multi, '537220'), '537220');
    assert.equal(effectiveBcvh(multi, undefined), '535790', 'absent -> first code of the scope, not an aggregate');
    assert.equal(effectiveBcvh(multi, 'all'), '535790', '"all" must not widen a BCVH user');
    assert.throws(() => effectiveBcvh(multi, '533140'), OutOfScopeError);
    assert.throws(() => effectiveBcvh(multi, "537220' OR 1=1"), OutOfScopeError);

    const all = { scope: { mode: 'all', bcvh: [] } };
    assert.equal(effectiveBcvh(all, '533140'), '533140');
    assert.equal(effectiveBcvh(all, 'all'), null);
    assert.equal(effectiveBcvh(all, ''), null);

    assert.deepEqual(scopedBcvhList(multi), ['535790', '537220']);
    assert.equal(scopedBcvhList(all), null);
    assert.throws(() => effectiveBcvh({}, '1'));
});

test('requireAdminAccess admits only ADMIN access', async () => {
    const admin = { tier: 'ADMIN', username: 'root' };
    admin.sessionId = sessionFor(admin);
    const call = async (user) => {
        const req = { auth: { user: { username: user.username } }, access: authSessionStore.getSession(user.sessionId).user.access };
        const res = makeRes();
        let passed = false;
        requireAdminAccess(req, res, () => { passed = true; });
        return { passed, status: res.statusCode };
    };
    assert.equal((await call(admin)).passed, true);
    assert.equal((await call(leader)).status, 403);
    assert.equal((await call(thuanHoa)).status, 403);
});

test('route wiring: F1.2 gates by module before the cache, and no /import GET is left on requireAuth alone', () => {
    const f12 = fs.readFileSync(path.join(__dirname, '../routes/f12Routes.js'), 'utf8');
    assert.match(f12, /requireModule\('f12'\), cachedRead\(\)/);
    const imports = fs.readFileSync(path.join(__dirname, '../routes/importRoutes.js'), 'utf8');
    assert.doesNotMatch(imports, /router\.get\([^\n]*, requireAuth,/);
    const getLines = imports.split('\n').filter((line) => line.startsWith('router.get('));
    assert.ok(getLines.length >= 15);
    assert.ok(getLines.every((line) => line.includes('...adminOnly')), 'every /import GET must be adminOnly');
});
