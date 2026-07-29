import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('viewer navigation hides unfinished top-level modules and system administration', () => {
  const source = fs.readFileSync(new URL('./appNavigation.jsx', import.meta.url), 'utf8');

  assert.match(source, /path: '\/f11'.*roles: \[ROLE_ADMIN\]/s);
  assert.match(source, /path: '\/f12'.*roles: \[ROLE_ADMIN\]/s);
  assert.match(source, /path: '\/f41'.*roles: \[ROLE_ADMIN\]/s);
  assert.match(source, /title: 'System Administration'.*roles: \[ROLE_ADMIN\]/s);
  assert.match(source, /path: '\/f13\/dashboard'/);
  assert.match(source, /path: '\/f13\/ranking\/bcvh'/);
  assert.match(source, /path: '\/f13\/ranking\/route'/);
});

test('dashboard quick links preserve import access for admin only', () => {
  const source = fs.readFileSync(new URL('./appNavigation.jsx', import.meta.url), 'utf8');

  assert.match(source, /label: 'Data Import Center'.*roles: \[ROLE_ADMIN\]/s);
});
