import test from 'node:test';
import assert from 'node:assert/strict';
import authClient from './authClient.js';
import httpClient, { SESSION_KEY } from './httpClient.js';

const originalPost = httpClient.post;

function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test.beforeEach(() => {
  installLocalStorage();
});

test.afterEach(() => {
  httpClient.post = originalPost;
  globalThis.localStorage.clear();
});

test('auth client stores the returned session after a valid login response', async () => {
  httpClient.post = async (endpoint, body) => {
    assert.equal(endpoint, '/auth/login');
    return {
      success: true,
      data: {
        session_id: 'session-for-test',
        user: {
          username: body.username,
          role: 'admin',
        },
      },
    };
  };

  const response = await authClient.login('runtime-user', 'runtime-password');

  assert.equal(response.success, true);
  assert.equal(globalThis.localStorage.getItem(SESSION_KEY), 'session-for-test');
});

test('auth client rejects malformed login success payloads and removes stale session state', async () => {
  globalThis.localStorage.setItem(SESSION_KEY, 'stale-session');
  httpClient.post = async () => ({
    success: true,
    data: {
      user: {
        username: 'runtime-user',
      },
    },
  });

  await assert.rejects(
    () => authClient.login('runtime-user', 'runtime-password'),
    { code: 'AUTH_CONTRACT_INVALID' },
  );

  assert.equal(globalThis.localStorage.getItem(SESSION_KEY), null);
});

test('auth client logout always removes stored session state', async () => {
  globalThis.localStorage.setItem(SESSION_KEY, 'session-for-test');
  httpClient.post = async () => {
    throw {
      status: 0,
      code: 'NETWORK_UNREACHABLE',
      message: 'network unavailable',
    };
  };

  await assert.rejects(() => authClient.logout(), { code: 'NETWORK_UNREACHABLE' });

  assert.equal(globalThis.localStorage.getItem(SESSION_KEY), null);
});
