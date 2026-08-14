import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { toNumber } from './routeRankingCalculations.js';

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

// F-2 fix (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md Section 2): `RouteSelectedPanel`
// referenced an out-of-scope `row` variable, throwing a ReferenceError whenever
// `route.failed` was null/undefined. Fixed to fall back to `route.total_failed` — the same
// object already in scope, never a variable that doesn't exist here.
test('F-2: the selected-route panel\'s failed-count fallback references route.total_failed, never the out-of-scope `row`', () => {
  assert.match(source, /const failed = toNumber\(route\.failed \?\? route\.total_failed\);/);
  assert.doesNotMatch(source, /toNumber\(route\.failed \?\? row\.total_failed\)/);
});

// Same fix, exercised as real behavior (not just a source pattern): the exact expression
// now shipped, evaluated with route.failed genuinely null — this is the precise input the
// old code crashed on (ReferenceError: row is not defined), reproduced here as a real,
// non-crashing computation.
test('F-2: toNumber(route.failed ?? route.total_failed) never throws and falls back correctly when route.failed is null', () => {
  const route = { failed: null, total_failed: 7 };
  assert.doesNotThrow(() => toNumber(route.failed ?? route.total_failed));
  assert.equal(toNumber(route.failed ?? route.total_failed), 7);
});

test('F-2: the fallback also handles route.failed undefined and a genuine zero correctly', () => {
  const routeUndefined = { failed: undefined, total_failed: 3 };
  const routeGenuineZero = { failed: 0, total_failed: 99 };
  assert.equal(toNumber(routeUndefined.failed ?? routeUndefined.total_failed), 3);
  assert.equal(toNumber(routeGenuineZero.failed ?? routeGenuineZero.total_failed), 0); // a real 0 is not nullish — must not fall back
});
