const test = require('node:test');
const assert = require('node:assert/strict');
const authSessionStore = require('./AuthSessionStore');

test.beforeEach(() => {
    authSessionStore.clear();
});

test('auth session store returns active sessions', () => {
    const sessionId = authSessionStore.createSession({
        username: 'runtime-user',
        display_name: 'Runtime User',
        role: 'admin',
    });

    const session = authSessionStore.getSession(sessionId);

    assert.equal(session.user.username, 'runtime-user');
    assert.equal(session.user.role, 'admin');
});

test('auth session store expires sessions deterministically', () => {
    const sessionId = authSessionStore.createSession({
        username: 'runtime-user',
        role: 'admin',
    }, { ttlMs: -1 });

    assert.equal(authSessionStore.getSession(sessionId), null);
    assert.equal(authSessionStore.getSession(sessionId), null);
});

test('auth session store deletes sessions on logout', () => {
    const sessionId = authSessionStore.createSession({
        username: 'runtime-user',
        role: 'admin',
    });

    authSessionStore.deleteSession(sessionId);

    assert.equal(authSessionStore.getSession(sessionId), null);
});
