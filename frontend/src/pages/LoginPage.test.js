import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('login page does not expose runtime credentials in default form state', () => {
  const source = fs.readFileSync(new URL('./LoginPage.jsx', import.meta.url), 'utf8');

  assert.match(source, /const \[username,\s*setUsername\] = useState\(''\);/);
  assert.match(source, /const \[password,\s*setPassword\] = useState\(''\);/);
  assert.doesNotMatch(source, /const \[username,\s*setUsername\] = useState\('[^']+'\);/);
  assert.doesNotMatch(source, /const \[password,\s*setPassword\] = useState\('[^']+'\);/);
});

test('login page preserves redirected search and hash context after login', () => {
  const source = fs.readFileSync(new URL('./LoginPage.jsx', import.meta.url), 'utf8');

  assert.match(source, /fromLocation\.search/);
  assert.match(source, /fromLocation\.hash/);
});
