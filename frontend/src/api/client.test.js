import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import api from './client.js';
import { SESSION_KEY } from './httpClient.js';

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
  globalThis.localStorage.clear();
});

test('axios client resolves backend port 5050 and propagates auth session headers', () => {
  const source = fs.readFileSync(new URL('./client.js', import.meta.url), 'utf8');

  assert.match(source, /baseURL:\s*resolveApiBaseUrl\(\)/);
  assert.match(source, /Authorization = config\.headers\.Authorization \|\| `Bearer \$\{sessionId\}`/);
  assert.match(source, /config\.headers\['x-session-id'\] = config\.headers\['x-session-id'\] \|\| sessionId/);
});

test('axios client keeps stored session when a business API returns unauthorized', async () => {
  globalThis.localStorage.setItem(SESSION_KEY, 'session-for-test');

  const rejection = {
    response: { status: 401 },
    config: { url: '/import/dkcl/session/preflight' },
  };

  const handler = api.interceptors.response.handlers[0].rejected;
  await assert.rejects(() => handler(rejection), (error) => error === rejection);

  assert.equal(globalThis.localStorage.getItem(SESSION_KEY), 'session-for-test');
});

test('axios client clears stored session when the official session validation endpoint returns unauthorized', async () => {
  globalThis.localStorage.setItem(SESSION_KEY, 'session-for-test');

  const rejection = {
    response: { status: 401 },
    config: { url: '/auth/me' },
  };

  const handler = api.interceptors.response.handlers[0].rejected;
  await assert.rejects(() => handler(rejection), (error) => error === rejection);

  assert.equal(globalThis.localStorage.getItem(SESSION_KEY), null);
});
