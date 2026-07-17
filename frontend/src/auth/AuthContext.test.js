import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('auth context clears in-memory user state even when logout request fails', () => {
  const source = fs.readFileSync(new URL('./AuthContext.jsx', import.meta.url), 'utf8');

  assert.match(source, /const logout = async \(\) => \{/);
  assert.match(source, /finally\s*\{\s*setUser\(null\);\s*\}/);
});
