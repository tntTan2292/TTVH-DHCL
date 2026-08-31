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
