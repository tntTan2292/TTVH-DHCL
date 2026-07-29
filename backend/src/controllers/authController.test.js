const test = require('node:test');
const assert = require('node:assert/strict');
const authController = require('./authController');
const authSessionStore = require('../services/auth/AuthSessionStore');
const {
    DEFAULT_ADMIN,
    DEFAULT_VIEWER_USERNAME,
    getViewerConfigStatus,
} = require('../services/auth/runtimeUsers');
const { hashPassword } = require('../services/auth/passwordHash');

const ORIGINAL_ENV = {
    QIS_ADMIN_USERNAME: process.env.QIS_ADMIN_USERNAME,
    QIS_ADMIN_PASSWORD: process.env.QIS_ADMIN_PASSWORD,
    QIS_VIEWER_USERNAME: process.env.QIS_VIEWER_USERNAME,
    QIS_VIEWER_PASSWORD_HASH: process.env.QIS_VIEWER_PASSWORD_HASH,
};

function createRequest({ body = {}, headers = {} } = {}) {
    const normalizedHeaders = Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );

    return {
        body,
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

test.beforeEach(() => {
    authSessionStore.clear();
    process.env.QIS_ADMIN_USERNAME = DEFAULT_ADMIN.username;
    process.env.QIS_ADMIN_PASSWORD = DEFAULT_ADMIN.password;
    process.env.QIS_VIEWER_USERNAME = DEFAULT_VIEWER_USERNAME;
    delete process.env.QIS_VIEWER_PASSWORD_HASH;
});

test.after(() => {
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

test('login returns a session for the configured runtime user without returning a password', () => {
    const credentials = {
        username: process.env.QIS_ADMIN_USERNAME,
        password: process.env.QIS_ADMIN_PASSWORD,
    };
    const res = createResponse();

    authController.login(createRequest({ body: credentials }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.session_id);
    assert.equal(res.body.data.user.username, credentials.username);
    assert.equal(res.body.data.user.role, 'admin');
    assert.equal(Object.hasOwn(res.body.data.user, 'password'), false);
});

test('login supports env-configured viewer credentials without hardcoding a password', () => {
    process.env.QIS_VIEWER_PASSWORD_HASH = hashPassword('Viewer#2026!');
    const res = createResponse();

    authController.login(createRequest({
        body: {
            username: process.env.QIS_VIEWER_USERNAME,
            password: 'Viewer#2026!',
        },
    }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.username, DEFAULT_VIEWER_USERNAME);
    assert.equal(res.body.data.user.role, 'viewer');
    assert.equal(Object.hasOwn(res.body.data.user, 'password'), false);
});

test('login rejects missing or invalid credentials', () => {
    const missing = createResponse();
    authController.login(createRequest({ body: {} }), missing);

    assert.equal(missing.statusCode, 400);
    assert.equal(missing.body.success, false);
    assert.equal(missing.body.error.code, 'MISSING_CREDENTIALS');

    const invalid = createResponse();
    authController.login(createRequest({
        body: {
            username: 'invalid-user',
            password: 'invalid-password',
        },
    }), invalid);

    assert.equal(invalid.statusCode, 401);
    assert.equal(invalid.body.success, false);
    assert.equal(invalid.body.error.code, 'UNAUTHORIZED');
});

test('viewer config status distinguishes missing and malformed hashes without exposing secrets', () => {
    let status = getViewerConfigStatus();
    assert.equal(status.viewerUsername, DEFAULT_VIEWER_USERNAME);
    assert.equal(status.viewerEnabled, false);
    assert.equal(status.hashFormatValid, false);

    process.env.QIS_VIEWER_USERNAME = 'ttvhhue';
    process.env.QIS_VIEWER_PASSWORD_HASH = 'ttvh@2026';
    status = getViewerConfigStatus();
    assert.equal(status.viewerUsername, 'ttvhhue');
    assert.equal(status.viewerEnabled, true);
    assert.equal(status.hashFormatValid, false);

    process.env.QIS_VIEWER_PASSWORD_HASH = hashPassword('Viewer#2026!');
    status = getViewerConfigStatus();
    assert.equal(status.viewerUsername, 'ttvhhue');
    assert.equal(status.viewerEnabled, true);
    assert.equal(status.hashFormatValid, true);
});

test('me restores authenticated user from bearer or x-session-id headers', () => {
    const sessionId = authSessionStore.createSession({
        username: 'runtime-user',
        display_name: 'Runtime User',
        role: 'admin',
    });

    const bearer = createResponse();
    authController.me(createRequest({
        headers: {
            authorization: `Bearer ${sessionId}`,
        },
    }), bearer);

    assert.equal(bearer.statusCode, 200);
    assert.equal(bearer.body.data.session_id, sessionId);
    assert.equal(bearer.body.data.user.username, 'runtime-user');

    const header = createResponse();
    authController.me(createRequest({
        headers: {
            'x-session-id': sessionId,
        },
    }), header);

    assert.equal(header.statusCode, 200);
    assert.equal(header.body.data.session_id, sessionId);
});

test('me rejects missing, invalid, and expired sessions', () => {
    const missing = createResponse();
    authController.me(createRequest(), missing);
    assert.equal(missing.statusCode, 401);

    const invalid = createResponse();
    authController.me(createRequest({
        headers: {
            'x-session-id': 'not-a-valid-session',
        },
    }), invalid);
    assert.equal(invalid.statusCode, 401);

    const expiredSessionId = authSessionStore.createSession({
        username: 'runtime-user',
        role: 'admin',
    }, { ttlMs: -1 });

    const expired = createResponse();
    authController.me(createRequest({
        headers: {
            'x-session-id': expiredSessionId,
        },
    }), expired);
    assert.equal(expired.statusCode, 401);
});

test('logout deletes authenticated state for the provided session', () => {
    const sessionId = authSessionStore.createSession({
        username: 'runtime-user',
        role: 'admin',
    });

    const logout = createResponse();
    authController.logout(createRequest({
        headers: {
            'x-session-id': sessionId,
        },
    }), logout);

    assert.equal(logout.statusCode, 200);
    assert.equal(logout.body.success, true);
    assert.equal(authSessionStore.getSession(sessionId), null);

    const me = createResponse();
    authController.me(createRequest({
        headers: {
            'x-session-id': sessionId,
        },
    }), me);
    assert.equal(me.statusCode, 401);
});
