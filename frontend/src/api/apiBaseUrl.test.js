import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from './apiBaseUrl.js';

test('api base url uses configured env override when present', () => {
  assert.equal(
    resolveApiBaseUrl({ hostname: '10.47.33.24', protocol: 'http:' }, { VITE_API_BASE_URL: 'http://10.47.33.24:5050/api/' }),
    'http://10.47.33.24:5050/api',
  );
});

test('api base url targets backend port 5050 on the active hostname for LAN frontend access', () => {
  assert.equal(
    resolveApiBaseUrl({ hostname: '10.47.33.24', protocol: 'http:' }, {}),
    'http://10.47.33.24:5050/api',
  );
});

test('api base url preserves localhost engineering access', () => {
  assert.equal(
    resolveApiBaseUrl({ hostname: 'localhost', protocol: 'http:' }, {}),
    'http://localhost:5050/api',
  );
});
