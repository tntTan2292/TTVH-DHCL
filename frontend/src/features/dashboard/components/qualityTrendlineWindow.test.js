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

test('trendline request includes BCVH filter without changing the rolling window', () => {
  const params = buildTrendlineRequestParams({
    reportingToDate: '2026-07-15',
    latestDate: '2026-07-15',
    maBcvh: '535790',
  });

  assert.deepEqual(params, {
    from_date: '2026-06-16',
    to_date: '2026-07-15',
    ma_bcvh: '535790',
  });
});

test('trendline request omits BCVH filter when set to all', () => {
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
