import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseF13Timestamp,
  calculateDelayHours,
  stripVietnameseDiacritics,
  matchesSearchQuery,
  formatSearchResultSummary,
  groupRowsByRoute,
  mapEvidenceApiRow,
  buildSearchRouteGroups,
  resolveContextTotal,
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

// --- mapEvidenceApiRow: single source of row-mapping truth for both the main page fetch and
// a per-route expand fetch (ITR-EV-BLOCK-01 remediation, 2026-09-07) --------------------------

test('mapEvidenceApiRow maps status_group and preserves null violation_reason/delay for non-failed rows', () => {
  const row = mapEvidenceApiRow(
    { ma_bg: 'BG1', ma_tuyen: '531001', ten_tuyen: 'Tuyến A', danh_gia_2026: 'Đạt', status_group: 'passed', do_tre_gio: null, violation_reason: null },
    { bcvhId: '533140', bcvhName: 'BCVH X', routeIdParam: '', routeName: '', analysisDate: '2026-09-01' },
  );
  assert.equal(row.shipmentId, 'BG1');
  assert.equal(row.routeId, '531001');
  assert.equal(row.status, 'Đạt');
  assert.equal(row.statusGroup, 'passed');
  assert.equal(row.violationReason, null);
  assert.equal(row.delayLabel, 'Chưa đủ dữ liệu');
});

test('mapEvidenceApiRow falls back to context bcvh/route when the API row omits them', () => {
  const row = mapEvidenceApiRow(
    { ma_bg: 'BG2', danh_gia_2026: 'Không đạt', status_group: 'failed', do_tre_gio: 5.25 },
    { bcvhId: '533140', bcvhName: 'BCVH X', routeIdParam: '531002', routeName: 'Tuyến B', analysisDate: '2026-09-01' },
  );
  assert.equal(row.bcvhId, '533140');
  assert.equal(row.routeId, '531002');
  assert.equal(row.routeName, 'Tuyến B');
  assert.equal(row.delayLabel, '5.3h');
});

// --- buildSearchRouteGroups: ITR-EV-BLOCK-01 remediation (Independent Technical Review,
// 2026-09-07) — the direct fix for "search route grouping is page-limited" -------------------

test('buildSearchRouteGroups includes every matched route from matched_route_list, not only routes with fetched rows', () => {
  const matchedRouteList = [
    { ma_tuyen: '531001', ten_tuyen: 'Tuyến A', count: 3 },
    { ma_tuyen: '531002', ten_tuyen: 'Tuyến B', count: 1 },
  ];
  const routeRowsByRoute = { '531001': { status: 'ready', rows: [{ id: 1 }, { id: 2 }, { id: 3 }] } };
  const groups = buildSearchRouteGroups({ matchedRouteList, routeRowsByRoute });

  assert.equal(groups.length, 2);
  const routeA = groups.find((g) => g.routeId === '531001');
  const routeB = groups.find((g) => g.routeId === '531002');
  assert.equal(routeA.rows.length, 3);
  assert.equal(routeA.status, 'ready');
  assert.equal(routeB.rows.length, 0, 'unfetched route must render with zero rows, never crash or vanish');
  assert.equal(routeB.status, 'idle');
  assert.equal(routeB.count, 1, 'the count is the server-computed real total, independent of whether rows were fetched');
});

test('buildSearchRouteGroups carries loading/error status through so the caller can render it', () => {
  const matchedRouteList = [{ ma_tuyen: '531001', ten_tuyen: 'Tuyến A', count: 5 }];
  const loading = buildSearchRouteGroups({ matchedRouteList, routeRowsByRoute: { '531001': { status: 'loading', rows: [] } } });
  assert.equal(loading[0].status, 'loading');
  const errored = buildSearchRouteGroups({ matchedRouteList, routeRowsByRoute: { '531001': { status: 'error', rows: [] } } });
  assert.equal(errored[0].status, 'error');
});

test('buildSearchRouteGroups falls back to grouping the given rows when matched_route_list is missing/empty', () => {
  const fallbackRows = [
    { shipmentId: 'BG1', routeId: '531001', routeName: 'Tuyến A' },
    { shipmentId: 'BG2', routeId: '531002', routeName: 'Tuyến B' },
  ];
  assert.equal(buildSearchRouteGroups({ matchedRouteList: null, fallbackRows }).length, 2);
  assert.equal(buildSearchRouteGroups({ matchedRouteList: [], fallbackRows }).length, 2);
});

// --- resolveContextTotal: ITR-EV-NB-02 remediation (Independent Technical Review,
// 2026-09-07) — "Tổng Evidence (bối cảnh)" must stay independent of the search keyword -------

test('resolveContextTotal reflects the status/reason scope, never the search-narrowed matched count', () => {
  const statusSummary = { all: 500, passed: 300, failed: 150, returned: 50 };
  const violationSummary = { delayed_cash_count: 40, other_failed_count: 60, unknown_count: 50 };
  assert.equal(resolveContextTotal({ status: 'all', reason: 'all', statusSummary, violationSummary }), 500);
  assert.equal(resolveContextTotal({ status: 'passed', reason: 'all', statusSummary, violationSummary }), 300);
  assert.equal(resolveContextTotal({ status: 'returned', reason: 'all', statusSummary, violationSummary }), 50);
  assert.equal(resolveContextTotal({ status: 'failed', reason: 'all', statusSummary, violationSummary }), 150);
  assert.equal(resolveContextTotal({ status: 'failed', reason: 'delayed_cash', statusSummary, violationSummary }), 40);
  assert.equal(resolveContextTotal({ status: 'failed', reason: 'other', statusSummary, violationSummary }), 60);
  assert.equal(resolveContextTotal({ status: 'failed', reason: 'unknown', statusSummary, violationSummary }), 50);
});
