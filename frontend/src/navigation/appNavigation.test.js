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
  assert.match(source, /path: '\/network-map\/service-points'/);
  assert.match(source, /path: '\/network-map\/level2-routes'/);
  assert.match(source, /path: '\/network-map\/delivery-routes'/);
});

test('Quản lý mạng lưới group has no role restriction — admin and viewer both see it', () => {
  const source = fs.readFileSync(new URL('./appNavigation.jsx', import.meta.url), 'utf8');

  assert.match(source, /title: 'Quản lý mạng lưới',\s*icon: <MapPin[^,]*,\s*subItems: \[/);
});

test('dashboard quick links preserve import access for admin only', () => {
  const source = fs.readFileSync(new URL('./appNavigation.jsx', import.meta.url), 'utf8');

  assert.match(source, /label: 'Data Import Center'.*roles: \[ROLE_ADMIN\]/s);
});

test('F1.3 navigation only displays complete surfaces (Operation Dashboard, BCVH Ranking, Tuyến Ranking, Evidence) and hides incomplete Pareto / RCA and Message Center', () => {
  const source = fs.readFileSync(new URL('./appNavigation.jsx', import.meta.url), 'utf8');

  const f13GroupMatch = source.match(/const F13_GROUP = \{[\s\S]*?title:\s*'F1.3 Quality Management'[\s\S]*?subItems:\s*\[([\s\S]*?)\]/);
  assert.ok(f13GroupMatch, 'F13_GROUP must be defined with subItems');
  const f13SubItemsText = f13GroupMatch[1];

  assert.match(f13SubItemsText, /name: 'Operation Dashboard',\s*path: '\/f13\/dashboard'/);
  assert.match(f13SubItemsText, /name: 'BCVH Ranking',\s*path: '\/f13\/ranking\/bcvh'/);
  assert.match(f13SubItemsText, /name: 'Tuyến Ranking',\s*path: '\/f13\/ranking\/route'/);
  assert.match(f13SubItemsText, /name: 'Evidence',\s*path: '\/f13\/evidence'/);

  assert.equal(f13SubItemsText.includes('/f13/pareto'), false, 'Pareto / RCA must be hidden from F1.3 navigation');
  assert.equal(f13SubItemsText.includes('/f13/message'), false, 'Message Center must be hidden from F1.3 navigation');
});

test('Sidebar.jsx also keeps F1.3 navigation aligned by hiding Pareto / RCA and Message Center', () => {
  const source = fs.readFileSync(new URL('../components/Sidebar.jsx', import.meta.url), 'utf8');

  const f13Match = source.match(/title: 'F1.3 Quality Management'[\s\S]*?subItems: \[([\s\S]*?)\]/);
  assert.ok(f13Match, 'F1.3 Quality Management group must be defined in Sidebar.jsx');
  const subItemsText = f13Match[1];

  assert.match(subItemsText, /name: 'Operation Dashboard',\s*path: '\/f13\/dashboard'/);
  assert.match(subItemsText, /name: 'BCVH Ranking',\s*path: '\/f13\/ranking\/bcvh'/);
  assert.match(subItemsText, /name: 'Tuyến Ranking',\s*path: '\/f13\/ranking\/route'/);
  assert.match(subItemsText, /name: 'Evidence',\s*path: '\/f13\/evidence'/);

  assert.equal(subItemsText.includes('/f13/pareto'), false, 'Pareto / RCA must be hidden from Sidebar.jsx');
  assert.equal(subItemsText.includes('/f13/message'), false, 'Message Center must be hidden from Sidebar.jsx');
});
