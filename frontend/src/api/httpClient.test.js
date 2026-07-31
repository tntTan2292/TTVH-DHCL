import test from 'node:test';
import assert from 'node:assert/strict';
import httpClient, { SESSION_KEY, isOfficialSessionValidationEndpoint, SESSION_VALIDATION_PATH } from './httpClient.js';
import { resolveApiBaseUrl } from './apiBaseUrl.js';

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
    assert.match(url, /:5050\/api\/auth\/me$/);
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

test('http client keeps stored session when a business API returns unauthorized', async () => {
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

  await assert.rejects(() => httpClient.post('/import/dkcl/session/preflight', { source: 'HUE' }), { status: 401, code: 'UNAUTHORIZED' });

  assert.equal(globalThis.localStorage.getItem(SESSION_KEY), 'session-for-test');
});

test('http client clears stored session only when official session validation returns unauthorized', async () => {
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

test('official session validation matcher accepts only the me endpoint', () => {
  assert.equal(isOfficialSessionValidationEndpoint(SESSION_VALIDATION_PATH), true);
  assert.equal(isOfficialSessionValidationEndpoint('/auth/login'), false);
  assert.equal(isOfficialSessionValidationEndpoint('/import/dkcl/session/preflight'), false);
  assert.equal(isOfficialSessionValidationEndpoint('http://127.0.0.1:5050/api/auth/me'), true);
});

test('http client default api base keeps frontend 5178 separate from backend 5050', () => {
  assert.equal(
    resolveApiBaseUrl({ hostname: '10.47.33.24', protocol: 'http:' }, {}),
    'http://10.47.33.24:5050/api',
  );
});
