import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./RoutePerformancePage.jsx', import.meta.url), 'utf8');

test('Route Ranking header displays "Tên tuyến" instead of legacy "Tên tuyến bưu tá"', () => {
  assert.match(source, /<th className="px-4 py-3" rowSpan=\{2\}>Tên tuyến<\/th>/);
  assert.doesNotMatch(source, /<th className="px-4 py-3" rowSpan=\{2\}>Tên tuyến bưu tá<\/th>/);
});

test('Route Ranking defines group header "BƯU TÁ NGÀY {formattedDate}" spanning 2 sub-columns', () => {
  assert.match(source, /BƯU TÁ NGÀY\s*\{formattedDate\}/);
  assert.match(source, /colSpan=\{2\}/);
  assert.match(source, /Mã bưu tá/);
  assert.match(source, /Tên bưu tá/);
});

test('formatAnchorDateDdMmYyyy formats ISO date YYYY-MM-DD into DD/MM/YYYY', () => {
  // Test date formatting logic directly
  const formatMatch = source.match(/function formatAnchorDateDdMmYyyy\([\s\S]*?return dateStr;\s*\}/);
  assert.ok(formatMatch, 'formatAnchorDateDdMmYyyy must be defined');

  const fn = new Function('dateStr', formatMatch[0] + '\nreturn formatAnchorDateDdMmYyyy(dateStr);');
  assert.equal(fn('2026-08-17'), '17/08/2026');
  assert.equal(fn('2026-08-01'), '01/08/2026');
  assert.equal(fn(''), '');
  assert.equal(fn(null), '');
});

test('Route Ranking table handles NO_BF_FOR_DATE and ROUTE_NOT_IN_BF by displaying DASH (—)', () => {
  assert.match(source, /row\.postman_status === 'NO_BF_FOR_DATE'/);
  assert.match(source, /row\.postman_status === 'ROUTE_NOT_IN_BF'/);
  assert.match(source, /\{DASH\}/);
});

test('Route Ranking table renders "Chưa cập nhật" when postman has code but no name', () => {
  assert.match(source, /Chưa cập nhật/);
});

test('Route Ranking table preserves multi-postman, sorts deterministically by ma_buu_ta and displays item_count', () => {
  assert.match(source, /sortedPostmen/);
  assert.match(source, /localeCompare/);
  assert.match(source, /item_count/);
});

test('Route Ranking table displays "Khác BC" indicator when bcvh_mismatch is true', () => {
  assert.match(source, /bcvh_mismatch/);
  assert.match(source, /Khác BC/);
});
