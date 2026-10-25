const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-auth-rbac-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);
process.env.QIS_INITIAL_PASSWORD = 'Initial#Pass1';

const { applyRbac01Schema } = require('../../migrate_rbac_01_schema');
const authController = require('./authController');
const adminUserController = require('./adminUserController');
const authSessionStore = require('../services/auth/AuthSessionStore');
const sessionPersistence = require('../services/auth/sessionPersistence');
const userStore = require('../services/auth/userStore');
const { requireAuth } = require('../middleware/authMiddleware');
const throttle = require('../services/auth/loginThrottle');
const { run, all, db } = require('../config/db');

const INITIAL = 'Initial#Pass1';

function createRequest({ body = {}, headers = {}, params = {}, auth = null, ip = null } = {}) {
    const normalizedHeaders = Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );

    return {
        body,
        params,
        auth,
        ip,
        header(name) {
            return normalizedHeaders[String(name).toLowerCase()];
        },
    };
}

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
}

async function seed() {
    await run('DELETE FROM qis_session');
    await run('DELETE FROM qis_user_bcvh');
    await run('DELETE FROM qis_user_indicator');
    await run('DELETE FROM qis_auth_event');
    await run('DELETE FROM qis_user');
    await userStore.upsertUser({ username: 'ADMIN1', displayName: 'Quản trị', tier: 'ADMIN', initialPassword: INITIAL });
    await userStore.upsertUser({ username: '00062571', displayName: 'Chuyên quản Thuận An', tier: 'STAFF', bcvh: ['537015'], initialPassword: INITIAL });
    await userStore.upsertUser({ username: '00061914', displayName: 'Lãnh đạo', tier: 'LEADER', initialPassword: INITIAL });
}

async function login(username, password, ip = null) {
    const res = createResponse();
    await authController.login(createRequest({ body: { username, password }, ip }), res);
    return res;
}

test.before(async () => {
    await applyRbac01Schema(process.env.QIS_TEST_DB_PATH);
});

test.beforeEach(async () => {
    throttle.reset();
    authSessionStore.clear();
    authSessionStore.attachPersistence(null);
    await seed();
});

test.after(async () => {
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(testDbDir, { recursive: true, force: true });
});

test('login with the initial password returns the user, access and must_change_password, never a hash', async () => {
    const res = await login('00062571', INITIAL);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.data.session_id);
    const { user } = res.body.data;
    assert.equal(user.username, '00062571');
    assert.equal(user.must_change_password, true);
    assert.equal(user.access.modules.f13.mode, 'bcvh');
    assert.deepEqual(user.access.modules.f13.bcvh, ['537015']);
    assert.equal(Object.hasOwn(user, 'password_hash'), false);
    assert.equal(Object.hasOwn(user, 'password'), false);
});

test('login rejects missing, wrong and unknown credentials with one generic message', async () => {
    const missing = createResponse();
    await authController.login(createRequest({ body: {} }), missing);
    assert.equal(missing.statusCode, 400);
    assert.equal(missing.body.error.code, 'MISSING_CREDENTIALS');

    const wrong = await login('00062571', 'nope');
    const unknown = await login('99999999', 'nope');
    assert.equal(wrong.statusCode, 401);
    assert.equal(unknown.statusCode, 401);
    assert.equal(wrong.body.error.message, unknown.body.error.message);
});

test('five wrong passwords lock the account; the right password is then refused until unlocked', async () => {
    for (let i = 0; i < 5; i += 1) await login('00062571', 'wrong');
    assert.equal((await login('00062571', INITIAL)).statusCode, 401);

    const row = await userStore.findByUsername('00062571');
    await userStore.unlock(row.id, 'test');
    assert.equal((await login('00062571', INITIAL)).statusCode, 200);
});

test('lockout is per (username, IP): a person guessing from one computer cannot lock the account for everyone else', async () => {
    for (let i = 0; i < 5; i += 1) await login('ADMIN1', 'guess', '10.0.0.66');
    assert.equal((await login('ADMIN1', INITIAL, '10.0.0.66')).statusCode, 401, 'the guessing computer is locked out');
    assert.equal((await login('ADMIN1', INITIAL, '10.0.0.5')).statusCode, 200, 'the real admin on another computer still gets in');
    assert.equal((await login('00062571', INITIAL, '10.0.0.66')).statusCode, 200, 'the same computer can still sign in as someone else');

    const admin = await userStore.findByUsername('ADMIN1');
    assert.equal(admin.locked_until, null, 'no database lock for a single-source attack');
    await userStore.unlock(admin.id, 'test');
    assert.equal((await login('ADMIN1', INITIAL, '10.0.0.66')).statusCode, 200, 'admin unlock clears the pair lock');
});

test('guessing spread over many computers hits the account threshold (25 wrong secrets) and locks the account for all', async () => {
    for (let i = 0; i < 25; i += 1) await login('ADMIN1', 'guess', `10.1.0.${i}`);
    const row = await userStore.findByUsername('ADMIN1');
    assert.ok(row.locked_until > Date.now(), 'account lock stored in the database');
    assert.equal((await login('ADMIN1', INITIAL, '10.9.9.9')).statusCode, 401, 'even a new computer is refused while locked');
    await userStore.unlock(row.id, 'test');
    assert.equal((await login('ADMIN1', INITIAL, '10.9.9.9')).statusCode, 200);
});

test('inactive users cannot log in', async () => {
    const row = await userStore.findByUsername('00062571');
    await userStore.setActive(row.id, false);
    assert.equal((await login('00062571', INITIAL)).statusCode, 401);
});

test('requireAuth blocks every route with PASSWORD_CHANGE_REQUIRED until the password is changed', async () => {
    const res = await login('00062571', INITIAL);
    const sessionId = res.body.data.session_id;

    const blocked = createResponse();
    let reached = false;
    requireAuth(createRequest({ headers: { 'x-session-id': sessionId } }), blocked, () => { reached = true; });
    assert.equal(reached, false);
    assert.equal(blocked.statusCode, 403);
    assert.equal(blocked.body.error.code, 'PASSWORD_CHANGE_REQUIRED');

    const me = createResponse();
    authController.me(createRequest({ headers: { 'x-session-id': sessionId } }), me);
    assert.equal(me.statusCode, 200);
    assert.equal(me.body.data.user.must_change_password, true);
});

test('change-password enforces the policy, drops old sessions and issues a working session', async () => {
    const first = await login('00062571', INITIAL);
    const oldSession = first.body.data.session_id;
    const headers = { 'x-session-id': oldSession };

    const wrongCurrent = createResponse();
    await authController.changePassword(createRequest({ headers, body: { current_password: 'bad', new_password: 'Hue#2026x' } }), wrongCurrent);
    assert.equal(wrongCurrent.body.error.code, 'WRONG_CURRENT_PASSWORD');

    const weak = createResponse();
    await authController.changePassword(createRequest({ headers, body: { current_password: INITIAL, new_password: 'abcdefgh' } }), weak);
    assert.equal(weak.body.error.code, 'WEAK_PASSWORD');

    const same = createResponse();
    await authController.changePassword(createRequest({ headers, body: { current_password: INITIAL, new_password: INITIAL } }), same);
    assert.equal(same.body.error.code, 'WEAK_PASSWORD');

    const ok = createResponse();
    await authController.changePassword(createRequest({ headers, body: { current_password: INITIAL, new_password: 'Hue#2026x' } }), ok);
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.data.user.must_change_password, false);
    assert.equal(authSessionStore.getSession(oldSession), null);

    const allowed = createResponse();
    let reached = false;
    requireAuth(createRequest({ headers: { 'x-session-id': ok.body.data.session_id } }), allowed, () => { reached = true; });
    assert.equal(reached, true);

    assert.equal((await login('00062571', INITIAL)).statusCode, 401);
    assert.equal((await login('00062571', 'Hue#2026x')).statusCode, 200);
});

test('wrong current passwords on change-password count toward the lockout (stolen session cannot guess)', async () => {
    const first = await login('00062571', INITIAL);
    const headers = { 'x-session-id': first.body.data.session_id };
    for (let i = 0; i < 5; i += 1) {
        const res = createResponse();
        await authController.changePassword(createRequest({ headers, body: { current_password: 'nope', new_password: 'Hue#2026x' } }), res);
        assert.equal(res.body.error.code, 'WRONG_CURRENT_PASSWORD');
    }
    const locked = createResponse();
    await authController.changePassword(createRequest({ headers, body: { current_password: INITIAL, new_password: 'Hue#2026x' } }), locked);
    assert.equal(locked.statusCode, 429);
    assert.equal(locked.body.error.code, 'ACCOUNT_LOCKED');
    assert.equal((await login('00062571', INITIAL)).statusCode, 401, 'the account is locked for logins too');
});

test('unknown, inactive and locked accounts still pay the scrypt cost (no timing oracle)', async () => {
    const timeOf = async (username) => { const t = process.hrtime.bigint(); await login(username, 'whatever'); return Number(process.hrtime.bigint() - t) / 1e6; };
    const wrong = await timeOf('00062571');
    const unknown = await timeOf('99999999');
    assert.ok(unknown > wrong / 4, `unknown user answered in ${unknown}ms vs ${wrong}ms for a wrong password`);
});

test('sessions of stored users persist and are restored after a restart, without storing the raw id', async () => {
    authSessionStore.attachPersistence(sessionPersistence);
    const res = await login('00061914', INITIAL);
    const sessionId = res.body.data.session_id;
    await new Promise((resolve) => setTimeout(resolve, 100));

    const rows = await all('SELECT session_hash FROM qis_session');
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].session_hash, sessionId);

    authSessionStore.clear(); // simulates the restart: memory lost
    assert.equal(authSessionStore.getSession(sessionId), null);
    assert.equal(await authSessionStore.restore(), 1);
    const restored = authSessionStore.getSession(sessionId);
    assert.equal(restored.user.username, '00061914');
    assert.equal(restored.user.access.network, true);

    authSessionStore.deleteSession(sessionId);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal((await all('SELECT session_hash FROM qis_session')).length, 0);
});

test('admin API creates users with the initial password, protects the last admin and revokes sessions on edit', async () => {
    const adminAuth = { user: { username: 'ADMIN1' } };
    const create = createResponse();
    await adminUserController.create(createRequest({ auth: adminAuth, body: { username: '00061945', display_name: 'GĐ A Lưới', tier: 'STAFF', bcvh: ['535790'] } }), create);
    assert.equal(create.statusCode, 201);
    assert.equal((await login('00061945', INITIAL)).statusCode, 200);

    const badScope = createResponse();
    await adminUserController.create(createRequest({ auth: adminAuth, body: { username: 'X1', tier: 'STAFF', bcvh: ['000000'] } }), badScope);
    assert.equal(badScope.statusCode, 400);

    const target = await userStore.findByUsername('00062571');
    const session = (await login('00062571', INITIAL)).body.data.session_id;
    const update = createResponse();
    await adminUserController.update(createRequest({ auth: adminAuth, params: { id: String(target.id) }, body: { bcvh: ['533140'] } }), update);
    assert.equal(update.statusCode, 200);
    assert.equal(authSessionStore.getSession(session), null, 'scope edit must force a re-login');

    const admin = await userStore.findByUsername('ADMIN1');
    const demote = createResponse();
    await adminUserController.update(createRequest({ auth: adminAuth, params: { id: String(admin.id) }, body: { tier: 'LEADER' } }), demote);
    assert.equal(demote.statusCode, 409);
    assert.equal(demote.body.error.code, 'LAST_ADMIN');
});

test('admin reset sets the initial password again and forces a change', async () => {
    const target = await userStore.findByUsername('00062571');
    await userStore.setPassword(target.id, 'Hue#2026x', { mustChange: false });
    assert.equal((await login('00062571', INITIAL)).statusCode, 401);

    const reset = createResponse();
    await adminUserController.resetPassword(createRequest({ auth: { user: { username: 'ADMIN1' } }, params: { id: String(target.id) } }), reset);
    assert.equal(reset.statusCode, 200);
    const res = await login('00062571', INITIAL);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.user.must_change_password, true);
});

test('me restores authenticated user from bearer or x-session-id headers', () => {
    const sessionId = authSessionStore.createSession({
        username: 'runtime-user',
        display_name: 'Runtime User',
        role: 'admin',
    });

    const bearer = createResponse();
    authController.me(createRequest({ headers: { authorization: `Bearer ${sessionId}` } }), bearer);
    assert.equal(bearer.statusCode, 200);
    assert.equal(bearer.body.data.session_id, sessionId);
    assert.equal(bearer.body.data.user.username, 'runtime-user');

    const header = createResponse();
    authController.me(createRequest({ headers: { 'x-session-id': sessionId } }), header);
    assert.equal(header.statusCode, 200);
});

test('me rejects missing, invalid, and expired sessions', () => {
    const missing = createResponse();
    authController.me(createRequest(), missing);
    assert.equal(missing.statusCode, 401);

    const invalid = createResponse();
    authController.me(createRequest({ headers: { 'x-session-id': 'not-a-valid-session' } }), invalid);
    assert.equal(invalid.statusCode, 401);

    const expiredSessionId = authSessionStore.createSession({ username: 'runtime-user', role: 'admin' }, { ttlMs: -1 });
    const expired = createResponse();
    authController.me(createRequest({ headers: { 'x-session-id': expiredSessionId } }), expired);
    assert.equal(expired.statusCode, 401);
});

test('logout deletes authenticated state for the provided session', () => {
    const sessionId = authSessionStore.createSession({ username: 'runtime-user', role: 'admin' });

    const logout = createResponse();
    authController.logout(createRequest({ headers: { 'x-session-id': sessionId } }), logout);
    assert.equal(logout.statusCode, 200);
    assert.equal(authSessionStore.getSession(sessionId), null);

    const me = createResponse();
    authController.me(createRequest({ headers: { 'x-session-id': sessionId } }), me);
    assert.equal(me.statusCode, 401);
});
