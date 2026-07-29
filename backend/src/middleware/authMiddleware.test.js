const test = require('node:test');
const assert = require('node:assert/strict');

const authSessionStore = require('../services/auth/AuthSessionStore');
const { requireAuth, requireRole } = require('./authMiddleware');

function createRequest(headers = {}) {
    const normalizedHeaders = Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );

    return {
        auth: null,
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
});

test('requireAuth restores authenticated session from request headers', () => {
    const sessionId = authSessionStore.createSession({
        username: 'viewer-user',
        role: 'viewer',
    });
    const req = createRequest({
        authorization: `Bearer ${sessionId}`,
    });
    const res = createResponse();
    let nextCalled = false;

    requireAuth(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.auth.sessionId, sessionId);
    assert.equal(req.auth.user.role, 'viewer');
});

test('requireAuth rejects missing session state', () => {
    const req = createRequest();
    const res = createResponse();

    requireAuth(req, res, () => {
        throw new Error('next should not be called');
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('requireRole rejects unauthorized roles', () => {
    const middleware = requireRole(['admin']);
    const req = {
        auth: {
            user: {
                role: 'viewer',
            },
        },
    };
    const res = createResponse();

    middleware(req, res, () => {
        throw new Error('next should not be called');
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
});

test('requireRole allows viewer access to approved read-only endpoints', () => {
    const middleware = requireRole(['admin', 'viewer']);
    const req = {
        auth: {
            user: {
                role: 'viewer',
            },
        },
    };
    const res = createResponse();
    let nextCalled = false;

    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
});
