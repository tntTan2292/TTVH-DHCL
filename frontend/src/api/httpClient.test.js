import test from 'node:test';
import assert from 'node:assert/strict';
import httpClient, { SESSION_KEY } from './httpClient.js';

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
  delete globalThis.fetch;
  globalThis.localStorage.clear();
});

test('http client propagates stored session through bearer and x-session-id headers', async () => {
  globalThis.localStorage.setItem(SESSION_KEY, 'session-for-test');
  globalThis.fetch = async (url, config) => {
    assert.match(url, /\/api\/auth\/me$/);
    assert.equal(config.headers.Authorization, 'Bearer session-for-test');
    assert.equal(config.headers['x-session-id'], 'session-for-test');
    return new Response(JSON.stringify({
      success: true,
      data: {
        ok: true,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  const response = await httpClient.get('/auth/me');

  assert.equal(response.success, true);
});

test('http client clears stored session on unauthorized responses', async () => {
  globalThis.localStorage.setItem(SESSION_KEY, 'session-for-test');
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'unauthorized',
    },
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  await assert.rejects(() => httpClient.get('/auth/me'), { status: 401, code: 'UNAUTHORIZED' });

  assert.equal(globalThis.localStorage.getItem(SESSION_KEY), null);
});
