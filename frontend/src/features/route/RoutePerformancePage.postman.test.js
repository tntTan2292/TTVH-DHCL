import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./RoutePerformancePage.jsx', import.meta.url), 'utf8');

test('SHOW_POSTMAN_COLUMNS toggle is defined and set to false per PO decision', () => {
  assert.match(source, /export const SHOW_POSTMAN_COLUMNS = false;/);
});

test('Route Ranking table header restores "Tên tuyến bưu tá" and hides postman columns when paused', () => {
  // Verifies conditional header rendering based on SHOW_POSTMAN_COLUMNS
  assert.match(source, /\{SHOW_POSTMAN_COLUMNS \? 'Tên tuyến' : 'Tên tuyến bưu tá'\}/);
  assert.match(source, /\{SHOW_POSTMAN_COLUMNS && \(\s*<th className="border-l border-slate-200 px-3 py-2 text-center bg-indigo-50\/70 text-indigo-900 font-bold"/);
  assert.match(source, /\{SHOW_POSTMAN_COLUMNS && \(\s*<>\s*<th className="border-l border-slate-200 px-3 py-2\.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 bg-indigo-50\/40">Mã bưu tá<\/th>/);
});

test('Route Ranking table body postman cells are guarded by SHOW_POSTMAN_COLUMNS', () => {
  assert.match(source, /\{SHOW_POSTMAN_COLUMNS && \(\(\) => \{/);
});

test('formatAnchorDateDdMmYyyy formats ISO date YYYY-MM-DD into DD/MM/YYYY', () => {
  const formatMatch = source.match(/function formatAnchorDateDdMmYyyy\([\s\S]*?return dateStr;\s*\}/);
  assert.ok(formatMatch, 'formatAnchorDateDdMmYyyy must be defined');

  const fn = new Function('dateStr', formatMatch[0] + '\nreturn formatAnchorDateDdMmYyyy(dateStr);');
  assert.equal(fn('2026-08-17'), '17/08/2026');
  assert.equal(fn('2026-08-01'), '01/08/2026');
  assert.equal(fn(''), '');
  assert.equal(fn(null), '');
});

test('Preserved postman logic: handles NO_BF_FOR_DATE and ROUTE_NOT_IN_BF with DASH (—)', () => {
  assert.match(source, /row\.postman_status === 'NO_BF_FOR_DATE'/);
  assert.match(source, /row\.postman_status === 'ROUTE_NOT_IN_BF'/);
  assert.match(source, /\{DASH\}/);
});

test('Preserved postman logic: renders "Chưa cập nhật" when postman has code but no name', () => {
  assert.match(source, /Chưa cập nhật/);
});

test('Preserved postman logic: preserves multi-postman, sorts deterministically and displays item_count', () => {
  assert.match(source, /sortedPostmen/);
  assert.match(source, /localeCompare/);
  assert.match(source, /item_count/);
});

test('Preserved postman logic: displays "Khác BC" indicator when bcvh_mismatch is true', () => {
  assert.match(source, /bcvh_mismatch/);
  assert.match(source, /Khác BC/);
});
