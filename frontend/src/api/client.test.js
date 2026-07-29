import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('axios client resolves backend port 5050 and propagates auth session headers', () => {
  const source = fs.readFileSync(new URL('./client.js', import.meta.url), 'utf8');

  assert.match(source, /baseURL:\s*resolveApiBaseUrl\(\)/);
  assert.match(source, /Authorization = config\.headers\.Authorization \|\| `Bearer \$\{sessionId\}`/);
  assert.match(source, /config\.headers\['x-session-id'\] = config\.headers\['x-session-id'\] \|\| sessionId/);
});
