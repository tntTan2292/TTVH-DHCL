import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./RoutePerformancePage.jsx', import.meta.url), 'utf8');

// Bug: Route Ranking used `from_date` as its authoritative single date while Dashboard
// and BCVH Ranking (the two live entry points that drill into Route Ranking) both treat
// `to_date` as authoritative. A URL carrying a genuine date range landed Route Ranking on
// the wrong date. `analysisDate` must resolve `to_date` first, matching those two screens.
test('Route Ranking resolves its query date from to_date first, matching Dashboard/BCVH Ranking', () => {
  assert.match(source, /resolveDefaultRouteDate\(\{ param: toDateParam \|\| fromDateParam, metaMaxDate \}\)/);
  assert.match(source, /getRouteRanking\(analysisDate, bcvhId/);
  assert.doesNotMatch(source, /getRouteRanking\(fromDate, bcvhId/);
});

test('Route Ranking exposes a violation drill-down link that preserves date, BCVH, and route context', () => {
  assert.match(source, /buildViolationEvidenceLink/);
  assert.match(source, /Xem bưu gửi vi phạm/);
});
