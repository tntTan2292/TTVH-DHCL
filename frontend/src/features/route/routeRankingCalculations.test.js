import test from 'node:test';
import assert from 'node:assert/strict';

import {
  toNumber,
  formatRate,
  formatDelayedCashRate,
  applyRouteFilters,
  sortRouteRows,
  computeRouteKpiStats,
  computeDelayedCashWidget,
  resolveDefaultRouteDate,
} from './routeRankingCalculations.js';

const ROWS = [
  { ma_tuyen: '53100001', name: 'Tuyến A', total_bg: 100, passed: 90, failed: 10, total_failed: 10, returned: 0, passed_rate: 90 },
  { ma_tuyen: '53100002', name: 'Tuyến B', total_bg: 50, passed: 20, failed: 30, total_failed: 30, returned: 0, passed_rate: 40 },
  { ma_tuyen: '53100003', name: 'Tuyến C', total_bg: 87, passed: 1, failed: 2, total_failed: 2, returned: 84, passed_rate: 1.1 },
];

test('default sort is Tỷ lệ đạt DESC', () => {
  const sorted = sortRouteRows(ROWS, { key: 'passed_rate', dir: 'desc' });
  assert.deepEqual(sorted.map((r) => r.ma_tuyen), ['53100001', '53100002', '53100003']);
});

test('sort direction toggles for any sortable column, e.g. Không đạt ASC', () => {
  const sorted = sortRouteRows(ROWS, { key: 'failed', dir: 'asc' });
  assert.deepEqual(sorted.map((r) => r.ma_tuyen), ['53100003', '53100001', '53100002']);
});

test('sort by failed reads the total_failed alias when failed is absent', () => {
  const rows = [
    { ma_tuyen: 'X', total_failed: 5 },
    { ma_tuyen: 'Y', total_failed: 1 },
  ];
  const sorted = sortRouteRows(rows, { key: 'failed', dir: 'asc' });
  assert.deepEqual(sorted.map((r) => r.ma_tuyen), ['Y', 'X']);
});

// ITR-BLOCK-02 (F13-ROUTE-RANKING-PERIOD-01 Independent Technical Review): a route absent on
// the anchor day (day_rate/passed_rate: null) must never be sorted ahead of a route that
// genuinely ran, including one that genuinely scored 0% — Design of Record §4.4 explicitly says
// the two are "khác hoàn toàn" (completely different). Fixture mirrors the real BCVH 535470
// reproduction: a genuine 0%, a genuine low-but-real 14.3%, and a no-data route.
const NULL_RATE_ROWS = [
  { ma_tuyen: 'NO_DATA', day_rate: null, passed_rate: null, failed: 0 },
  { ma_tuyen: 'REAL_ZERO', day_rate: 0, passed_rate: 0, failed: 5 },
  { ma_tuyen: 'REAL_14_3', day_rate: 14.3, passed_rate: 14.3, failed: 30 },
];

test('ITR-BLOCK-02: default "Tỷ lệ ngày" ASC sort — real 0% first, then real rates ascending, no-data route always last', () => {
  const sorted = sortRouteRows(NULL_RATE_ROWS, { key: 'day_rate', dir: 'asc' });
  assert.deepEqual(sorted.map((r) => r.ma_tuyen), ['REAL_ZERO', 'REAL_14_3', 'NO_DATA']);
});

test('ITR-BLOCK-02: "Tỷ lệ ngày" DESC sort — no-data route still last, never first', () => {
  const sorted = sortRouteRows(NULL_RATE_ROWS, { key: 'day_rate', dir: 'desc' });
  assert.deepEqual(sorted.map((r) => r.ma_tuyen), ['REAL_14_3', 'REAL_ZERO', 'NO_DATA']);
});

test('ITR-BLOCK-02: the same null-last rule applies to passed_rate (the shipped default sort key)', () => {
  const asc = sortRouteRows(NULL_RATE_ROWS, { key: 'passed_rate', dir: 'asc' });
  assert.deepEqual(asc.map((r) => r.ma_tuyen), ['REAL_ZERO', 'REAL_14_3', 'NO_DATA']);
  const desc = sortRouteRows(NULL_RATE_ROWS, { key: 'passed_rate', dir: 'desc' });
  assert.deepEqual(desc.map((r) => r.ma_tuyen), ['REAL_14_3', 'REAL_ZERO', 'NO_DATA']);
});

test('ITR-BLOCK-02: multiple no-data routes all sort after every real rate, in both directions', () => {
  const rows = [
    { ma_tuyen: 'NO_DATA_1', day_rate: null, failed: 0 },
    { ma_tuyen: 'REAL_14_3', day_rate: 14.3, failed: 30 },
    { ma_tuyen: 'NO_DATA_2', day_rate: null, failed: 0 },
  ];
  const asc = sortRouteRows(rows, { key: 'day_rate', dir: 'asc' });
  assert.equal(asc[0].ma_tuyen, 'REAL_14_3');
  assert.deepEqual(new Set(asc.slice(1).map((r) => r.ma_tuyen)), new Set(['NO_DATA_1', 'NO_DATA_2']));
  const desc = sortRouteRows(rows, { key: 'day_rate', dir: 'desc' });
  assert.equal(desc[0].ma_tuyen, 'REAL_14_3');
  assert.deepEqual(new Set(desc.slice(1).map((r) => r.ma_tuyen)), new Set(['NO_DATA_1', 'NO_DATA_2']));
});

test('ITR-BLOCK-02: other nullable fields (month_rate) are unaffected — out of this remediation\'s scope', () => {
  const rows = [
    { ma_tuyen: 'A', month_rate: null, failed: 0 },
    { ma_tuyen: 'B', month_rate: 50, failed: 0 },
  ];
  // month_rate is not in the null-safe allowlist — null still coerces via toNumber() to 0,
  // unchanged pre-existing behavior, since this remediation is scoped to "Tỷ lệ ngày" only.
  const sorted = sortRouteRows(rows, { key: 'month_rate', dir: 'asc' });
  assert.deepEqual(sorted.map((r) => r.ma_tuyen), ['A', 'B']);
});

test('KPI formula: BCVH passed rate is Sum(passed) / Sum(total_bg), not an average of per-route rates', () => {
  const stats = computeRouteKpiStats(ROWS);
  // Sum passed = 90+20+1 = 111; Sum total_bg = 100+50+87 = 237
  assert.equal(stats.bcvhPassedRate, (111 / 237) * 100);
  assert.notEqual(stats.bcvhPassedRate, (90 + 40 + 1.1) / 3); // must not equal a naive average of passed_rate
});

test('KPI: failed-route count and total failed BG are computed over the full fetched set', () => {
  const stats = computeRouteKpiStats(ROWS);
  assert.equal(stats.failedRouteCount, 3); // all three fixture routes have total_failed > 0
  assert.equal(stats.totalRoutes, 3);
  assert.equal(stats.totalFailed, 10 + 30 + 2);
});

test('KPI: routes with zero failures are excluded from the failed-route count', () => {
  const rows = [
    { total_bg: 10, passed: 10, failed: 0, total_failed: 0 },
    { total_bg: 10, passed: 5, failed: 5, total_failed: 5 },
  ];
  const stats = computeRouteKpiStats(rows);
  assert.equal(stats.failedRouteCount, 1);
});

test('KPI: empty dataset yields zeroed stats without division by zero', () => {
  const stats = computeRouteKpiStats([]);
  assert.deepEqual(stats, { failedRouteCount: 0, bcvhPassedRate: 0, totalFailed: 0, totalRoutes: 0 });
});

test('filter: Chỉ tuyến có bưu gửi không đạt keeps only routes with total_failed > 0', () => {
  const rows = [
    { name: 'Sạch', failed: 0, total_failed: 0 },
    { name: 'Có lỗi', failed: 3, total_failed: 3 },
  ];
  const filtered = applyRouteFilters(rows, { onlyFailed: true });
  assert.deepEqual(filtered.map((r) => r.name), ['Có lỗi']);
});

test('filter: search and only-failed compose without mutating the source array', () => {
  const filtered = applyRouteFilters(ROWS, { search: 'tuyến', onlyFailed: true });
  assert.equal(filtered.length, 3);
  assert.equal(ROWS.length, 3); // source untouched
});

test('date default: explicit URL param wins over the latest valid date', () => {
  assert.equal(resolveDefaultRouteDate({ param: '2026-07-01', metaMaxDate: '2026-08-02' }), '2026-07-01');
});

test('date default: falls back to the latest valid date when no URL param is present', () => {
  assert.equal(resolveDefaultRouteDate({ param: '', metaMaxDate: '2026-08-02' }), '2026-08-02');
});

test('date default: resolves to empty when neither a param nor a latest valid date exists (missing-data state)', () => {
  assert.equal(resolveDefaultRouteDate({ param: '', metaMaxDate: null }), '');
});

test('toNumber/formatRate treat missing or non-numeric values as zero, never as a fabricated rate', () => {
  assert.equal(toNumber(undefined), 0);
  assert.equal(toNumber(null), 0);
  assert.equal(toNumber('abc'), 0);
  assert.equal(formatRate(undefined), '0.0%');
});

test('formatDelayedCashRate renders a genuine 0% as valid data, not as unavailable', () => {
  assert.equal(formatDelayedCashRate(0), '0.0%');
});

test('formatDelayedCashRate renders "—" only when the backend contract marks the rate unavailable (null/undefined)', () => {
  assert.equal(formatDelayedCashRate(null), '—');
  assert.equal(formatDelayedCashRate(undefined), '—');
});

test('formatDelayedCashRate renders a normal rate the same way as formatRate', () => {
  assert.equal(formatDelayedCashRate(21.7), formatRate(21.7));
});

test('BG CHẬM NỘP TIỀN widget binds only to meta.delayed_cash_handover_summary and shows count/rate/eligible', () => {
  const widget = computeDelayedCashWidget({
    delayed_cash_handover_count: 229,
    delayed_cash_handover_eligible_count: 806,
    f13_303_rate: 28.4,
  });
  assert.equal(widget.value, '229');
  assert.equal(widget.delta, '28.4% / 806 BG thuộc mẫu');
});

test('widget renders a genuine zero-denominator summary as 0 / 0.0%, not as unavailable', () => {
  const widget = computeDelayedCashWidget({
    delayed_cash_handover_count: 0,
    delayed_cash_handover_eligible_count: 0,
    f13_303_rate: 0,
  });
  assert.equal(widget.value, '0');
  assert.equal(widget.delta, '0.0% / 0 BG thuộc mẫu');
});

test('widget renders "—" when the aggregate contract is missing entirely, never a fabricated 0', () => {
  assert.deepEqual(computeDelayedCashWidget(undefined), { value: '—', delta: '—' });
  assert.deepEqual(computeDelayedCashWidget(null), { value: '—', delta: '—' });
  assert.deepEqual(computeDelayedCashWidget({}), { value: '—', delta: '—' });
});

test('widget never averages, never recomputes from page rows, and never divides by total_bg', () => {
  // Only the three declared summary fields are read; nothing derived from an extra "rows"/"total_bg" argument.
  const widget = computeDelayedCashWidget({
    delayed_cash_handover_count: 10,
    delayed_cash_handover_eligible_count: 40,
    f13_303_rate: 25,
    total_bg: 999999, // must be ignored even if present alongside the contract fields
  });
  assert.equal(widget.value, '10');
  assert.equal(widget.delta, '25.0% / 40 BG thuộc mẫu');
});
