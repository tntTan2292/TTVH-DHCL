import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('axios client uses relative api base and propagates auth session headers', () => {
  const source = fs.readFileSync(new URL('./client.js', import.meta.url), 'utf8');

  assert.match(source, /baseURL:\s*import\.meta\.env\.VITE_API_BASE_URL \|\| import\.meta\.env\.VITE_API_URL \|\| '\/api'/);
  assert.match(source, /Authorization = config\.headers\.Authorization \|\| `Bearer \$\{sessionId\}`/);
  assert.match(source, /config\.headers\['x-session-id'\] = config\.headers\['x-session-id'\] \|\| sessionId/);
});
