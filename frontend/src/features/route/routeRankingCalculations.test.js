import test from 'node:test';
import assert from 'node:assert/strict';

import {
  toNumber,
  formatRate,
  applyRouteFilters,
  sortRouteRows,
  computeRouteKpiStats,
  resolveDefaultRouteDate,
} from './routeRankingCalculations.js';

const ROWS = [
  { ma_tuyen: '53100001', name: 'Tuyến A', total_bg: 100, passed: 90, failed: 10, total_failed: 10, unevaluated: 0, passed_rate: 90 },
  { ma_tuyen: '53100002', name: 'Tuyến B', total_bg: 50, passed: 20, failed: 30, total_failed: 30, unevaluated: 0, passed_rate: 40 },
  { ma_tuyen: '53100003', name: 'Tuyến C', total_bg: 87, passed: 1, failed: 2, total_failed: 2, unevaluated: 84, passed_rate: 1.1 },
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
