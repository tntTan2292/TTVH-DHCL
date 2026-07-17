import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSamePeriodComparisonRows, formatComparisonDelta } from './samePeriodComparisonData.js';

test('same-period comparison builds the current and previous 7-day ranges', () => {
  const items = [
    { date: '2026-06-30', total_volume: 30, passed: 27, failed: 3, quality_rate: 90, data_available: true },
    { date: '2026-07-07', total_volume: 40, passed: 38, failed: 2, quality_rate: 95, data_available: true },
    { date: '2026-07-14', total_volume: 50, passed: 45, failed: 5, quality_rate: 90, data_available: true },
    { date: '2026-07-15', total_volume: 60, passed: 54, failed: 6, quality_rate: 90, data_available: true },
  ];

  const rows = buildSamePeriodComparisonRows(items, '2026-07-15');
  assert.equal(rows.length, 7);
  assert.equal(rows[0].current_date, '2026-07-09');
  assert.equal(rows[6].current_date, '2026-07-15');
  assert.equal(rows[0].previous_date, '2026-07-02');
  assert.equal(rows[6].previous_date, '2026-07-08');
});

test('same-period comparison aligns weekday labels', () => {
  const rows = buildSamePeriodComparisonRows([], '2026-07-15');
  assert.deepEqual(rows.map((row) => row.dayLabel), ['T5', 'T6', 'T7', 'CN', 'T2', 'T3', 'T4']);
});

test('same-period comparison preserves missing dates as null', () => {
  const rows = buildSamePeriodComparisonRows([{ date: '2026-07-15', total_volume: 10, passed: 9, failed: 1, quality_rate: 90, data_available: true }], '2026-07-15');
  assert.equal(rows[0].current_volume, null);
  assert.equal(rows[0].previous_volume, null);
  assert.equal(rows[6].current_volume, 10);
  assert.equal(rows[6].previous_volume, null);
});

test('same-period comparison computes deltas only when both periods are available', () => {
  const rows = buildSamePeriodComparisonRows([
    { date: '2026-07-08', total_volume: 40, passed: 38, failed: 2, quality_rate: 95, data_available: true },
    { date: '2026-07-15', total_volume: 60, passed: 54, failed: 6, quality_rate: 90, data_available: true },
  ], '2026-07-15');

  assert.equal(rows[6].current_volume_delta, 20);
  assert.equal(rows[6].current_quality_delta, -5);
});

test('quality delta is rendered in percentage points with two decimals', () => {
  assert.equal(formatComparisonDelta(1.2345, ' điểm %'), '+1.23 điểm %');
  assert.equal(formatComparisonDelta(-2.3456, ' điểm %'), '-2.35 điểm %');
});
