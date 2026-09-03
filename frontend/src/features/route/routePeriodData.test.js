import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  DASH,
  formatPeriodRate,
  formatPeriodDelta,
  processRoutePeriods,
  mergeRouteData,
  buildReconciliationView,
  buildDailySeriesChartData,
} from './routePeriodData.js';

// F13-ROUTE-RANKING-PERIOD-01 Phase I1 remediation: RoutePerformancePage.jsx must call BOTH
// GET /f13/ranking/route (day-scoped: Tổng BG/Đạt/Không đạt/Chuyển hoàn/delayed-cash/
// classification/BG-summary) and GET /f13/ranking/route/periods (Hạng thật, Tỷ lệ ngày, Lũy kế
// tháng, Cùng kỳ tháng trước, Chênh lệch, Ngày có DL, Sản lượng, reconciliation), then merge by
// ma_tuyen — per Design of Record §7.3. These tests exercise mergeRouteData() directly against
// the real shape both endpoints actually return.

const PERIOD_ROUTE_WITH_DATA = {
  ma_tuyen: 'R1',
  ten_tuyen: 'Tuyến Một',
  loai_tuyen_phat: 'Tuyến phát xã (01 lần/ ngày)',
  day: { volume: 20, passed: 15, failed: 5, rate: 75 },
  month: { volume: 500, passed: 300, failed: 200, rate: 60, days_with_data: 25, days_in_period: 27 },
  previous_month: { volume: 480, passed: 250, failed: 230, rate: 52.08, days_with_data: 27, days_in_period: 27 },
  delta: 7.92,
  rank: 5,
  rank_previous_month: 8,
  rank_delta: 3,
  daily_series: [{ date: '2026-08-27', volume: 20, passed: 15, rate: 75 }],
};

// Present in the periods union (month) but had zero activity on the anchor day itself — the
// old endpoint's GROUP BY never produces a row for it that day (T-01 / RISK-DATA-01).
const PERIOD_ROUTE_ABSENT_ON_ANCHOR = {
  ma_tuyen: 'R2',
  ten_tuyen: 'Tuyến Hai',
  loai_tuyen_phat: 'Tuyến phát xã (01 lần/ ngày)',
  day: { volume: 0, passed: 0, failed: 0, rate: null },
  month: { volume: 90, passed: 40, failed: 50, rate: 44.44, days_with_data: 12, days_in_period: 27 },
  previous_month: { volume: 100, passed: 60, failed: 40, rate: 60, days_with_data: 20, days_in_period: 27 },
  delta: -15.56,
  rank: 20,
  rank_previous_month: 10,
  rank_delta: -10,
  daily_series: [],
};

const OLD_ROW_R1 = {
  ma_tuyen: 'R1', ten_tuyen: 'Tuyến Một', total_bg: 20, passed: 15, failed: 5, total_failed: 5,
  returned: 0, passed_rate: 75, delayed_cash_handover_count: 3, delayed_cash_handover_eligible_count: 5,
  f13_303_rate: 60, is_postman_delivery_route: true,
};

// Mirrors real usage exactly: RoutePerformancePage.jsx always pipes the raw
// GET /f13/ranking/route/periods payload through processRoutePeriods() first (deriving
// day_rate/month_rate/previous_month_rate/etc.) before calling mergeRouteData() — never the
// other way around.
function processedPeriodRoutes(...rawRoutes) {
  return processRoutePeriods({ routes: rawRoutes }).routes;
}

test('mergeRouteData: positive case — a route present in both endpoints gets every field populated, no undefined', () => {
  const [merged] = mergeRouteData([OLD_ROW_R1], processedPeriodRoutes(PERIOD_ROUTE_WITH_DATA), 'postman');
  assert.equal(merged.ma_tuyen, 'R1');
  assert.equal(merged.total_bg, 20);
  assert.equal(merged.passed, 15);
  assert.equal(merged.failed, 5);
  assert.equal(merged.returned, 0);
  assert.equal(merged.passed_rate, 75);
  assert.equal(merged.delayed_cash_handover_count, 3);
  assert.equal(merged.delayed_cash_handover_eligible_count, 5);
  assert.equal(merged.f13_303_rate, 60);
  assert.equal(merged.day_rate, 75);
  assert.equal(merged.month_rate, 60);
  assert.equal(merged.previous_month_rate, 52.08);
  assert.equal(merged.delta, 7.92);
  assert.equal(merged.rank, 5);
  assert.equal(merged.is_postman_delivery_route, true);
});

test('mergeRouteData: genuine real zero (old endpoint returns an actual 0, not absence) is preserved as 0, not coerced to null', () => {
  const oldRowGenuineZero = { ...OLD_ROW_R1, passed: 0, delayed_cash_handover_count: 0, f13_303_rate: 0, returned: 0 };
  const [merged] = mergeRouteData([oldRowGenuineZero], processedPeriodRoutes(PERIOD_ROUTE_WITH_DATA), 'postman');
  assert.equal(merged.passed, 0);
  assert.equal(merged.delayed_cash_handover_count, 0);
  assert.equal(merged.f13_303_rate, 0);
  assert.equal(merged.returned, 0);
  assert.notEqual(merged.passed, null);
});

test('mergeRouteData: a route absent on the anchor day (no old-endpoint row) gets null day-scoped fields, never a fabricated 0', () => {
  const [merged] = mergeRouteData([OLD_ROW_R1], processedPeriodRoutes(PERIOD_ROUTE_ABSENT_ON_ANCHOR), 'postman');
  assert.equal(merged.ma_tuyen, 'R2');
  assert.equal(merged.total_bg, null);
  assert.equal(merged.passed, null);
  assert.equal(merged.failed, null);
  assert.equal(merged.returned, null);
  assert.equal(merged.passed_rate, null);
  assert.equal(merged.delayed_cash_handover_count, null);
  assert.equal(merged.delayed_cash_handover_eligible_count, null);
  assert.equal(merged.f13_303_rate, null);
  // Period-side fields are untouched by the merge and already correctly null (C-04, proven
  // in Phase B1) — day_rate must still be null here, not coerced.
  assert.equal(merged.day_rate, null);
  assert.equal(merged.month_rate, 44.44);
});

test('mergeRouteData: missing old-endpoint response entirely (empty array, e.g. a transient failure) still returns every periods route, all day-scoped fields null', () => {
  const merged = mergeRouteData([], processedPeriodRoutes(PERIOD_ROUTE_WITH_DATA, PERIOD_ROUTE_ABSENT_ON_ANCHOR), 'postman');
  assert.equal(merged.length, 2);
  merged.forEach((row) => {
    assert.equal(row.total_bg, null);
    assert.equal(row.passed, null);
    assert.equal(row.delayed_cash_handover_count, null);
  });
});

test('mergeRouteData: the route set is always the periods union (T-01) — an old-endpoint row for a route absent from periods is not added', () => {
  const extraOldRow = { ...OLD_ROW_R1, ma_tuyen: 'GHOST' };
  const merged = mergeRouteData([OLD_ROW_R1, extraOldRow], processedPeriodRoutes(PERIOD_ROUTE_WITH_DATA), 'postman');
  assert.equal(merged.length, 1);
  assert.equal(merged[0].ma_tuyen, 'R1');
});

test('mergeRouteData: classification is always postman under the default filter, with no per-row lookup needed', () => {
  const merged = mergeRouteData([], processedPeriodRoutes(PERIOD_ROUTE_WITH_DATA, PERIOD_ROUTE_ABSENT_ON_ANCHOR), 'postman');
  merged.forEach((row) => assert.equal(row.is_postman_delivery_route, true));
});

test('mergeRouteData: under route_type=all, classification comes from the old endpoint when present, and is null (unknown) when the route had no old-endpoint row', () => {
  const oldPickupRow = { ...OLD_ROW_R1, is_postman_delivery_route: false };
  const withOld = mergeRouteData([oldPickupRow], processedPeriodRoutes(PERIOD_ROUTE_WITH_DATA), 'all');
  assert.equal(withOld[0].is_postman_delivery_route, false);

  const withoutOld = mergeRouteData([], processedPeriodRoutes(PERIOD_ROUTE_ABSENT_ON_ANCHOR), 'all');
  assert.equal(withoutOld[0].is_postman_delivery_route, null);
});

test('mergeRouteData: aliases id/code/name always resolve from the periods route (the authoritative route-set source)', () => {
  const [merged] = mergeRouteData([], processedPeriodRoutes(PERIOD_ROUTE_WITH_DATA), 'postman');
  assert.equal(merged.id, 'R1');
  assert.equal(merged.code, 'R1');
  assert.equal(merged.name, 'Tuyến Một');
});

test('mergeRouteData: `failed` falls back to old total_failed when `failed` itself is absent, matching the existing routeRankingCalculations convention', () => {
  const oldRowNoFailedAlias = { ma_tuyen: 'R1', total_bg: 20, passed: 15, total_failed: 5 };
  const [merged] = mergeRouteData([oldRowNoFailedAlias], processedPeriodRoutes(PERIOD_ROUTE_WITH_DATA), 'postman');
  assert.equal(merged.failed, 5);
});

test('buildReconciliationView: maps the real bucket shape and computes outsideRanked as the sum of the three non-ranked groups', () => {
  const view = buildReconciliationView({
    bcvh_total: 1980, ranked: 1911, pickup_at_office: 69, non_hue: 0, no_route: 0, identity_ok: true,
  });
  assert.equal(view.bcvhTotal, 1980);
  assert.equal(view.ranked, 1911);
  assert.equal(view.outsideRanked, 69);
  assert.equal(view.identityOk, true);
});

test('buildReconciliationView: identity_ok: false surfaces as identityOk: false, never silently swallowed', () => {
  const view = buildReconciliationView({
    bcvh_total: 100, ranked: 1, pickup_at_office: 1, non_hue: 1, no_route: 1, identity_ok: false,
  });
  assert.equal(view.identityOk, false);
});

test('buildReconciliationView: returns null for a missing bucket rather than fabricating zeros', () => {
  assert.equal(buildReconciliationView(null), null);
  assert.equal(buildReconciliationView(undefined), null);
});

test('formatPeriodRate/formatPeriodDelta/formatPeriodVolume: null/undefined render as the dash, never 0', () => {
  assert.equal(formatPeriodRate(null), DASH);
  assert.equal(formatPeriodRate(undefined), DASH);
  assert.equal(formatPeriodDelta(null), DASH);
  assert.equal(formatPeriodDelta(undefined), DASH);
});

test('formatPeriodRate: a genuine 0% renders as valid data, not as unavailable', () => {
  assert.equal(formatPeriodRate(0), '0.0%');
});

test('AC-14: no reference to the banned term "MTD" anywhere in this module, including comments', () => {
  const source = fs.readFileSync(new URL('./routePeriodData.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /MTD/);
});

// ITR-BLOCK-01 remediation: the above test alone was insufficient scope — the Independent
// Technical Review found the banned term still present in two backend files this ticket
// authored, which this one file's check could never have caught. Extends coverage to every
// other frontend file this ticket created or modified (per Design of Record §9.1/§9.2 and
// `git diff --name-only bfa1d515^..HEAD -- frontend/src`); the backend side has its own,
// equivalent guard in routePeriodService.test.js.
test('AC-14: banned term absent from every other frontend file this ticket created or modified, comments and test names included', () => {
  const ticketFiles = [
    '../../api/F13DashboardClient.js',
    './RoutePerformancePage.jsx',
    './routeRankingCalculations.js',
    './RoutePerformancePage.blackReturned.test.js',
    './RoutePerformancePage.dateResolution.test.js',
    './RoutePerformancePage.delayedCash.test.js',
    './RoutePerformancePage.delayedCashWidget.test.js',
    './RoutePerformancePage.volumeReconciliationTooltip.test.js',
    './routeRankingCalculations.test.js',
    './routeRankingFilters.test.js',
    // Not routePeriodData.test.js itself (this file) — its own name/regex above necessarily
    // quotes the term being checked for.
  ];
  for (const relPath of ticketFiles) {
    const source = fs.readFileSync(new URL(relPath, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /MTD/, `banned term found in ${relPath}`);
  }
});

test('processRoutePeriods: still correctly derives day_rate/month_rate/previous_month_rate as null-safe (regression guard, Phase B1 contract unchanged)', () => {
  const processed = processRoutePeriods({
    anchor_date: '2026-08-27',
    bcvh: { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' },
    periods: {},
    routes: [PERIOD_ROUTE_WITH_DATA, PERIOD_ROUTE_ABSENT_ON_ANCHOR],
    reconciliation: { day: {}, month: {} },
  });
  assert.equal(processed.routes.length, 2);
  assert.equal(processed.routes[1].day_rate, null);
  assert.equal(processed.routes[0].month_rate, 60);
});

// Independent Re-Review ITR2-BLOCK-01 remediation (checkpoint §19 / manifest §56): the backend's
// `daily_series` omits any day with zero activity entirely — it never carries a `rate: null`
// placeholder for it — so the chart's `connectNulls={false}` had nothing to break on and the
// line was drawn straight across missing days. `buildDailySeriesChartData` re-expands the array
// to one point per calendar day from `01` through the anchor day, restoring real gaps. Real
// fixture below is the actual `daily_series` `routePeriodService.getRoutePeriods('533140')`
// returned for route `533140137` at anchor `2026-08-31` (days_with_data 25 / days_in_period 31),
// captured read-only against the operational database — not a synthetic fixture.
const REAL_GAPPED_DAILY_SERIES = [
  { date: '2026-08-02', volume: 1, passed: 0, rate: 0 },
  { date: '2026-08-03', volume: 3, passed: 0, rate: 0 },
  { date: '2026-08-04', volume: 33, passed: 0, rate: 0 },
  { date: '2026-08-05', volume: 25, passed: 0, rate: 0 },
  { date: '2026-08-06', volume: 11, passed: 3, rate: 27.2727 },
  { date: '2026-08-07', volume: 6, passed: 1, rate: 16.6667 },
  { date: '2026-08-08', volume: 6, passed: 1, rate: 16.6667 },
  { date: '2026-08-11', volume: 4, passed: 2, rate: 50 },
  { date: '2026-08-12', volume: 5, passed: 1, rate: 20 },
  { date: '2026-08-13', volume: 4, passed: 0, rate: 0 },
  { date: '2026-08-14', volume: 3, passed: 1, rate: 33.3333 },
  { date: '2026-08-16', volume: 2, passed: 1, rate: 50 },
  { date: '2026-08-18', volume: 4, passed: 2, rate: 50 },
  { date: '2026-08-19', volume: 3, passed: 1, rate: 33.3333 },
  { date: '2026-08-20', volume: 5, passed: 2, rate: 40 },
  { date: '2026-08-22', volume: 4, passed: 1, rate: 25 },
  { date: '2026-08-23', volume: 3, passed: 1, rate: 33.3333 },
  { date: '2026-08-24', volume: 4, passed: 2, rate: 50 },
  { date: '2026-08-25', volume: 3, passed: 1, rate: 33.3333 },
  { date: '2026-08-26', volume: 5, passed: 2, rate: 40 },
  { date: '2026-08-27', volume: 4, passed: 1, rate: 25 },
  { date: '2026-08-28', volume: 3, passed: 1, rate: 33.3333 },
  { date: '2026-08-29', volume: 4, passed: 2, rate: 50 },
  { date: '2026-08-30', volume: 5, passed: 2, rate: 40 },
  { date: '2026-08-31', volume: 4, passed: 1, rate: 25 },
];
const REAL_GAPPED_MISSING_DAYS = ['01', '09', '10', '15', '17', '21'];

test('buildDailySeriesChartData: a full month with data every day returns exactly one point per day, no gaps', () => {
  const fullSeries = [
    { date: '2026-08-01', volume: 10, passed: 5, rate: 50 },
    { date: '2026-08-02', volume: 8, passed: 8, rate: 100 },
    { date: '2026-08-03', volume: 4, passed: 0, rate: 0 },
  ];
  const points = buildDailySeriesChartData(fullSeries, '2026-08-03');
  assert.equal(points.length, 3);
  assert.deepEqual(points.map((p) => p.date), ['01', '02', '03']);
  assert.deepEqual(points.map((p) => p.rate), [50, 100, 0]);
  assert.equal(points.every((p) => p.rate !== null), true);
});

test('buildDailySeriesChartData: on the real gapped fixture (route 533140137, anchor 31), every missing day becomes a real null point at its correct calendar position, never dropped and never coerced to 0', () => {
  const points = buildDailySeriesChartData(REAL_GAPPED_DAILY_SERIES, '2026-08-31');
  // Design §7.5 "trục ngày 01 → ngày neo": one point for every calendar day in range, not one
  // point per daily_series element (25 elements in, 31 points out).
  assert.equal(points.length, 31);
  assert.deepEqual(points.map((p) => p.date), Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')));

  REAL_GAPPED_MISSING_DAYS.forEach((day) => {
    const point = points.find((p) => p.date === day);
    assert.equal(point.rate, null, `day ${day} should be a real gap (rate: null), not dropped or coerced to 0`);
    assert.equal(point.volume, null, `day ${day} should have volume: null, never a fabricated 0`);
  });

  const presentDays = points.filter((p) => !REAL_GAPPED_MISSING_DAYS.includes(p.date));
  assert.equal(presentDays.length, 25);
  assert.equal(presentDays.every((p) => p.rate !== null), true);
});

test('buildDailySeriesChartData: a genuine 0% day (real record, zero passes) is preserved as rate 0, never confused with a missing day', () => {
  const points = buildDailySeriesChartData(REAL_GAPPED_DAILY_SERIES, '2026-08-31');
  // 2026-08-02..05 are real records with rate 0 in the fixture above (volume > 0, passed 0).
  ['02', '03', '04', '05'].forEach((day) => {
    const point = points.find((p) => p.date === day);
    assert.equal(point.rate, 0);
    assert.notEqual(point.rate, null);
    assert.equal(point.volume > 0, true);
  });
});

test('buildDailySeriesChartData: does not interpolate a missing day to 0 — a gap is null, not 0, so a line renderer with connectNulls={false} actually breaks there', () => {
  const points = buildDailySeriesChartData(REAL_GAPPED_DAILY_SERIES, '2026-08-31');
  const day01 = points.find((p) => p.date === '01');
  assert.equal(day01.rate, null);
  assert.notEqual(day01.rate, 0);
});

test('buildDailySeriesChartData: anchor on the 1st of the month yields exactly one point (§4.3 edge case), never a crash or a negative range', () => {
  const points = buildDailySeriesChartData([], '2026-08-01');
  assert.equal(points.length, 1);
  assert.equal(points[0].date, '01');
  assert.equal(points[0].rate, null);
});

test('buildDailySeriesChartData: an empty daily_series still produces one null point per day in range, never an empty chart array', () => {
  const points = buildDailySeriesChartData([], '2026-08-05');
  assert.equal(points.length, 5);
  assert.equal(points.every((p) => p.rate === null && p.volume === null), true);
});

test('buildDailySeriesChartData: an invalid/missing anchor date falls back to a defensive 1:1 mapping rather than throwing', () => {
  assert.doesNotThrow(() => buildDailySeriesChartData(REAL_GAPPED_DAILY_SERIES, null));
  const points = buildDailySeriesChartData([{ date: '2026-08-05', volume: 3, passed: 1, rate: 33.33 }], undefined);
  assert.equal(points.length, 1);
  assert.equal(points[0].date, '05');
  assert.equal(points[0].rate, 33.33);
});

// Source-pattern regression guards (this codebase's established convention for RoutePerformancePage.jsx,
// see RoutePerformancePage.dateResolution.test.js — no React render harness is wired into this project).
// Lock the ITR-BLOCK-03 panel deliverables (checkpoint §17/§19) so a future edit cannot silently
// drop them, and lock that the chart now goes through the gap-restoring helper instead of the
// naive 1:1 map the Independent Re-Review found broken.
const routePerformancePageSource = fs.readFileSync(new URL('./RoutePerformancePage.jsx', import.meta.url), 'utf8');

test('ITR2-BLOCK-01 regression guard: RouteSelectedPanel builds chart data via buildDailySeriesChartData(route.daily_series, fromDate), not a naive 1:1 map of daily_series', () => {
  assert.match(routePerformancePageSource, /buildDailySeriesChartData\(route\.daily_series, fromDate\)/);
  assert.doesNotMatch(routePerformancePageSource, /route\.daily_series\.map\(d => \(\{\s*date: \(d\.date \|\| ''\)\.split\('-'\)\.pop\(\)/);
});

test('regression guard: the chart still declares connectNulls={false} — required so the real gaps buildDailySeriesChartData now produces actually render as blanks', () => {
  assert.match(routePerformancePageSource, /connectNulls=\{false\}/);
});

test('regression guard: RouteSelectedPanel still renders Hạng (rank) sourced from route.rank', () => {
  assert.match(routePerformancePageSource, /Hạng \{route\.rank \?\? DASH\}/);
});

test('regression guard: RouteSelectedPanel still renders days_with_data / days_in_period context for the month period', () => {
  assert.match(routePerformancePageSource, /route\.month_days_with_data\}\/\{route\.month_days_in_period\}/);
});

test('regression guard: RouteSelectedPanel still renders month_volume and previous_month volume via formatPeriodVolume', () => {
  assert.match(routePerformancePageSource, /formatPeriodVolume\(route\.month_volume\)/);
  assert.match(routePerformancePageSource, /formatPeriodVolume\(route\.previous_month\?\.volume\)/);
});
