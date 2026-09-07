import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseF13Timestamp,
  calculateDelayHours,
  stripVietnameseDiacritics,
  matchesSearchQuery,
  formatSearchResultSummary,
  groupRowsByRoute,
} from './shipmentPerformanceData.js';

// P0-05: fact_f13 timestamps are 'dd/MM/yyyy HH:mm:ss' TEXT, which `new Date(string)`
// cannot parse (returns Invalid Date in this runtime).
test('parseF13Timestamp parses dd/MM/yyyy HH:mm:ss into a valid Date', () => {
  const date = parseF13Timestamp('14/06/2026 09:05:16');
  assert.ok(date instanceof Date);
  assert.equal(Number.isNaN(date.getTime()), false);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 5); // 0-indexed: June
  assert.equal(date.getDate(), 14);
  assert.equal(date.getHours(), 9);
  assert.equal(date.getMinutes(), 5);
  assert.equal(date.getSeconds(), 16);
});

test('parseF13Timestamp returns null for unparseable input', () => {
  assert.equal(parseF13Timestamp('not-a-date'), null);
  assert.equal(parseF13Timestamp(null), null);
  assert.equal(parseF13Timestamp(undefined), null);
  assert.equal(parseF13Timestamp('2026-06-14 09:05:16'), null); // ISO, not dd/MM/yyyy
});

test('calculateDelayHours computes a real number for well-formed dd/MM/yyyy timestamps', () => {
  const hours = calculateDelayHours('14/06/2026 09:00:00', '14/06/2026 12:30:00', null);
  assert.equal(hours, 3.5);
});

test('calculateDelayHours returns null (not NaN) when timestamps are unparseable', () => {
  const hours = calculateDelayHours('invalid', '14/06/2026 12:30:00', null);
  assert.equal(hours, null);
});

test('calculateDelayHours prefers extended_data delay when present', () => {
  const hours = calculateDelayHours('14/06/2026 09:00:00', '14/06/2026 12:30:00', { do_tre_gio: 7.2 });
  assert.equal(hours, 7.2);
});



// --- DEFECT A remediation: Vietnamese diacritic-insensitive search fallback --------

test('stripVietnameseDiacritics removes diacritics and normalizes đ/Đ, leaving plain text untouched', () => {
  assert.equal(stripVietnameseDiacritics('Hương Phong'), 'Huong Phong');
  assert.equal(stripVietnameseDiacritics('Đường Thư'), 'Duong Thu');
  assert.equal(stripVietnameseDiacritics('535790'), '535790');
  assert.equal(stripVietnameseDiacritics('Phía Nam Thị trấn'), 'Phia Nam Thi tran');
});

test('matchesSearchQuery matches a real Vietnamese name typed with correct diacritics (exact path)', () => {
  assert.equal(matchesSearchQuery(['535790 - Hương Phong'], 'hương phong'), true);
});

test('matchesSearchQuery also matches the same name typed without diacritics (fallback path)', () => {
  assert.equal(matchesSearchQuery(['535790 - Hương Phong'], 'huong phong'), true);
  assert.equal(matchesSearchQuery(['535790 - Hương Phong'], 'Huong'), true);
});

test('matchesSearchQuery never breaks exact route-code search — codes are digits, diacritic-stripping is a no-op on them', () => {
  assert.equal(matchesSearchQuery(['53579015'], '53579015'), true);
  assert.equal(matchesSearchQuery(['53579015'], '5357901'), true);
  // A code query must not spuriously match an unrelated code via the diacritic path.
  assert.equal(matchesSearchQuery(['53579015'], '99999999'), false);
});

test('matchesSearchQuery returns true for every row when the query is empty/whitespace-only (no filter applied)', () => {
  assert.equal(matchesSearchQuery(['anything'], ''), true);
  assert.equal(matchesSearchQuery(['anything'], '   '), true);
  assert.equal(matchesSearchQuery([], ''), true);
});

test('matchesSearchQuery returns false when no field matches, with or without diacritics', () => {
  assert.equal(matchesSearchQuery(['535790 - Hương Phong', 'BG001'], 'khong ton tai'), false);
});

test('matchesSearchQuery skips null/undefined/empty fields without throwing', () => {
  assert.equal(matchesSearchQuery([null, undefined, '', '535790 - Hương Phong'], 'phong'), true);
});

// --- Phase 2: search-result-presentation contract (AC-16, AC-17/18, AC-22) ---------

test('formatSearchResultSummary produces the exact required wording', () => {
  assert.equal(
    formatSearchResultSummary({ count: 9, routeCount: 3, keyword: 'hồng th' }),
    "Tìm thấy 9 bưu gửi thuộc 3 tuyến cho 'hồng th'."
  );
});

test('formatSearchResultSummary handles the zero-result case explicitly, not as a missing value', () => {
  assert.equal(
    formatSearchResultSummary({ count: 0, routeCount: 0, keyword: 'khong ton tai' }),
    "Tìm thấy 0 bưu gửi thuộc 0 tuyến cho 'khong ton tai'."
  );
});

test('groupRowsByRoute groups by real ma_tuyen (routeId), never by route-name text alone', () => {
  const rows = [
    { shipmentId: 'BG1', routeId: '53579001', routeName: 'Hương Phong' },
    { shipmentId: 'BG2', routeId: '53579002', routeName: 'Hương Phong' }, // same display name, different real route
    { shipmentId: 'BG3', routeId: '53579001', routeName: 'Hương Phong' },
  ];
  const groups = groupRowsByRoute(rows);

  assert.equal(groups.length, 2, 'two distinct ma_tuyen values must never merge into one group, even with identical names');
  const byId = Object.fromEntries(groups.map((g) => [g.routeId, g]));
  assert.equal(byId['53579001'].count, 2);
  assert.equal(byId['53579002'].count, 1);
});

test('groupRowsByRoute surfaces every matching route, not only the first', () => {
  const rows = [
    { shipmentId: 'BG1', routeId: '535790A', routeName: 'Hồng Thái' },
    { shipmentId: 'BG2', routeId: '535790B', routeName: 'Hồng Thủy' },
    { shipmentId: 'BG3', routeId: '535790C', routeName: 'Hồng Tiến' },
  ];
  const groups = groupRowsByRoute(rows);
  assert.equal(groups.length, 3);
  assert.deepEqual(new Set(groups.map((g) => g.routeId)), new Set(['535790A', '535790B', '535790C']));
});

test('groupRowsByRoute never drops a row: total across all groups equals the input length', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    shipmentId: `BG${i}`,
    routeId: `R${i % 4}`,
    routeName: `Route ${i % 4}`,
  }));
  const groups = groupRowsByRoute(rows);
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  assert.equal(total, 12);
  assert.equal(groups.length, 4);
});
