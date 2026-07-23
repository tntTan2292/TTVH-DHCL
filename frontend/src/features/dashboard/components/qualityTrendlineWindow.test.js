import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrendlineRequestParams, resolveRollingTrendlineWindow } from './qualityTrendlineWindow.js';

test('rolling window anchors on a selected end date', () => {
  const result = resolveRollingTrendlineWindow({ reportingToDate: '2026-07-15' });
  assert.equal(result.trendFromDate, '2026-06-16');
  assert.equal(result.trendToDate, '2026-07-15');
  assert.equal(result.trendWindowDays, 30);
});

test('rolling window falls back to latest date when no end date is selected', () => {
  const result = resolveRollingTrendlineWindow({ latestDate: '2026-07-15' });
  assert.equal(result.trendFromDate, '2026-06-16');
  assert.equal(result.trendToDate, '2026-07-15');
});

test('single-day reporting filter still produces a 30-day trend request', () => {
  const params = buildTrendlineRequestParams({
    reportingFromDate: '2026-07-22',
    reportingToDate: '2026-07-22',
    latestDate: '2026-07-22',
    maBcvh: 'all',
    mode: '30-days',
  });

  assert.deepEqual(params, {
    from_date: '2026-06-23',
    to_date: '2026-07-22',
  });
});

test('30-day trend request uses selected end date minus 29 calendar days', () => {
  const params = buildTrendlineRequestParams({
    reportingFromDate: '2026-07-10',
    reportingToDate: '2026-07-22',
    latestDate: '2026-07-22',
    maBcvh: '535790',
    mode: '30-days',
  });

  assert.deepEqual(params, {
    from_date: '2026-06-23',
    to_date: '2026-07-22',
    ma_bcvh: '535790',
  });
});

test('7-day trend request includes BCVH filter without changing the reporting window', () => {
  const params = buildTrendlineRequestParams({
    reportingFromDate: '2026-07-10',
    reportingToDate: '2026-07-15',
    latestDate: '2026-07-15',
    maBcvh: '535790',
    mode: '7-days',
  });

  assert.deepEqual(params, {
    from_date: '2026-07-10',
    to_date: '2026-07-15',
    ma_bcvh: '535790',
  });
});

test('BCVH trend request omits BCVH filter when set to all and preserves reporting window', () => {
  const params = buildTrendlineRequestParams({
    reportingFromDate: '2026-07-10',
    reportingToDate: '2026-07-15',
    latestDate: '2026-07-15',
    maBcvh: 'all',
    mode: 'by-bcvh',
  });

  assert.deepEqual(params, {
    from_date: '2026-07-10',
    to_date: '2026-07-15',
  });
});

test('trendline request falls back to rolling latest only without a valid selected range', () => {
  const params = buildTrendlineRequestParams({
    reportingToDate: '2026-07-15',
    latestDate: '2026-07-15',
    maBcvh: 'all',
  });

  assert.deepEqual(params, {
    from_date: '2026-06-16',
    to_date: '2026-07-15',
  });
});
