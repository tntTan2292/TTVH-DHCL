import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BCVH_COLORS,
  CANONICAL_NAMES,
  DASH,
  formatOverviewNumber,
  formatOverviewRate,
  processOverviewData,
} from './bcvhOverviewData.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('formatOverviewRate returns dash for null/undefined/empty and formats numbers with 1 decimal place', () => {
  assert.equal(formatOverviewRate(null), DASH);
  assert.equal(formatOverviewRate(undefined), DASH);
  assert.equal(formatOverviewRate(''), DASH);
  assert.equal(formatOverviewRate(61.263), '61,3%');
  assert.equal(formatOverviewRate(0), '0,0%');
});

test('formatOverviewNumber returns dash for null and formats integers', () => {
  assert.equal(formatOverviewNumber(null), DASH);
  assert.equal(formatOverviewNumber(12345), '12.345');
  assert.equal(formatOverviewNumber(0), '0');
});

test('processOverviewData pivots monthly & daily data for 6 canonical BCVHs', () => {
  const rawData = {
    monthly: [
      { month: '2026-01', ma_bcvh: '533140', volume: 1000, passed: 600, rate: 60.0, days_with_data: 31, days_in_period: 31 },
      { month: '2026-01', ma_bcvh: '535470', volume: 800, passed: 560, rate: 70.0, days_with_data: 31, days_in_period: 31 },
      { month: '2026-02', ma_bcvh: '533140', volume: 1200, passed: 744, rate: 62.0, days_with_data: 24, days_in_period: 26 },
    ],
    daily: [
      { date: '2026-08-01', ma_bcvh: '533140', volume: 50, passed: 30, rate: 60.0 },
      { date: '2026-08-01', ma_bcvh: '535470', volume: 40, passed: 28, rate: 70.0 },
    ],
    mtd: [
      { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', volume: 1000, passed: 620, failed: 380, rate: 62.0, rank: 1, previous_month_to_date: { volume: 900, passed: 540, rate: 60.0 } },
      { ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà', volume: 800, passed: 560, failed: 240, rate: 70.0, rank: 2, previous_month_to_date: { volume: 750, passed: 525, rate: 70.0 } },
    ],
    routes: [
      { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', participating_route_count: 10, green: 4, pink: 3, yellow: 2, red: 1 },
      { ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà', participating_route_count: 8, green: 5, pink: 2, yellow: 1, red: 0 },
    ],
  };

  const processed = processOverviewData(rawData, { anchor_date: '2026-08-27' });

  assert.deepEqual(processed.months, ['2026-01', '2026-02']);
  assert.equal(processed.latestMonth, '2026-02');
  assert.equal(processed.monthlyChartData.length, 2);

  // Check 533140 data in 2026-02
  const febRow = processed.monthlyChartData.find((r) => r.month === '2026-02');
  assert.equal(febRow['533140'], 62.0);
  assert.equal(febRow.isCurrentMonth, true);

  // Check partial coverage month (24/26) retains calculated rate
  const thRow = processed.monthlyTableRows.find((r) => r.ma_bcvh === '533140');
  const febStat = thRow.months.find((m) => m.month === '2026-02');
  assert.equal(febStat.days_with_data, 24);
  assert.equal(febStat.days_in_period, 26);
  assert.equal(febStat.rate, 62.0);

  // Check MTD total row
  assert.equal(processed.mtdTotalRow.volume, 1800);
  assert.equal(processed.mtdTotalRow.passed, 1180);
  assert.equal(processed.mtdTotalRow.failed, 620);
  assert.equal(Math.round(processed.mtdTotalRow.rate * 10) / 10, 65.6);

  // Check Routes total row
  assert.equal(processed.routeTotalRow.participating_route_count, 18);
  assert.equal(processed.routeTotalRow.green, 9);
  assert.equal(processed.routeTotalRow.pink, 5);
  assert.equal(processed.routeTotalRow.yellow, 3);
  assert.equal(processed.routeTotalRow.red, 1);
});

test('processOverviewData handles null rates without coercing to 0', () => {
  const rawData = {
    monthly: [
      { month: '2026-01', ma_bcvh: '533140', volume: 0, passed: 0, rate: null, days_with_data: 0, days_in_period: 31 },
    ],
    daily: [],
    mtd: [
      { ma_bcvh: '533140', volume: 0, passed: 0, failed: 0, rate: null, rank: null },
    ],
    routes: [],
  };

  const processed = processOverviewData(rawData);
  const chartRow = processed.monthlyChartData[0];
  assert.equal(chartRow['533140'], null);
  assert.equal(formatOverviewRate(chartRow['533140']), DASH);
  assert.equal(processed.mtdRows[0].rate, null);
  assert.equal(formatOverviewRate(processed.mtdRows[0].rate), DASH);
});

test('verifies frontend source code contract for Phase F1', () => {
  const pageSource = read('./BcvhRankingPage.jsx');
  const fetcherSource = read('./bcvhOverviewFetcher.js');
  const blocksSource = read('./BcvhRankingOverviewBlocks.jsx');
  const chartSource = read('./BcvhMultiSeriesTrendChart.jsx');

  // Overview endpoint call
  assert.match(fetcherSource, /apiClient\.get\('\/f13\/ranking\/bcvh\/overview'/);
  assert.match(fetcherSource, /anchor_date:\s*toDate/);

  // Error & Retry
  assert.match(fetcherSource, /Không thể tải dữ liệu tổng quan BCVH/);
  assert.match(pageSource, /setOverviewRetrySeq/);

  // Order of blocks: MTD Summary -> Monthly Trend -> Route Capacity -> Daily Trend
  const posMtd = pageSource.indexOf('<BcvhMtdSummaryBlock');
  const posMonthly = pageSource.indexOf('<BcvhMonthlyTrendBlock');
  const posRoute = pageSource.indexOf('<BcvhRouteCapacityBlock');
  const posDaily = pageSource.indexOf('<BcvhDailyTrendBlock');

  assert.ok(posMtd > 0, 'BcvhMtdSummaryBlock exists');
  assert.ok(posMonthly > posMtd, 'Monthly block follows MTD block');
  assert.ok(posRoute > posMonthly, 'Route block follows Monthly block');
  assert.ok(posDaily > posRoute, 'Daily block follows Route block');

  // Daily collapsed details (UI state only, no fetch)
  assert.match(blocksSource, /<details className="group/);
  assert.match(blocksSource, /Diễn biến theo ngày/);
  assert.match(blocksSource, /connectNulls=\{false\}/);

  // Route capacity label
  assert.match(blocksSource, /Tuyến có phát sinh trong kỳ/);
  assert.match(blocksSource, /Năng lực và chất lượng tuyến/);

  // 6 canonical colors & Recharts line
  assert.equal(Object.keys(BCVH_COLORS).length, 6);
  assert.equal(Object.keys(CANONICAL_NAMES).length, 6);
  assert.match(chartSource, /LineChart/);
  assert.match(chartSource, /connectNulls=\{connectNulls\}/);
  assert.doesNotMatch(chartSource, /ReferenceLine/);
});
