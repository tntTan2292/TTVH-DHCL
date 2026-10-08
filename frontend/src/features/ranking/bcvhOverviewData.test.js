import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BCVH_COLORS,
  CANONICAL_NAMES,
  DASH,
  formatOverviewNumber,
  formatOverviewRate,
  getMonthlyTrendSeriesData,
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

  // The standalone MTD summary was removed (PO 2026-10-07): its figures live in the weekly/monthly comparison table
  assert.equal(processed.mtdRows, undefined);
  assert.equal(processed.mtdTotalRow, undefined);

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

  // Order of blocks: Weekly Comparison & Trend -> Monthly Trend -> Widget -> Table -> MTD -> Route Capacity.
  // F13-BCVH-WEEKLY-TREND-01 (Việc 2): Biểu đồ xu hướng tháng được đưa lên nằm ngay dưới biểu đồ tuần.
  const posWeekly = pageSource.indexOf('<BcvhWeeklyComparisonBlock />');
  const posMonthly = pageSource.indexOf('<BcvhMonthlyTrendBlock');
  const posWidget = pageSource.indexOf('<KPICard {...summaryCards[0]} />');
  const posTable = pageSource.indexOf('<UnifiedBcvhAnalysisTable');
  const posRoute = pageSource.indexOf('<BcvhRouteCapacityBlock');

  assert.doesNotMatch(pageSource, /BcvhDailyTrendBlock/);
  assert.doesNotMatch(blocksSource, /Diễn biến theo ngày/);
  assert.ok(posWeekly > 0, 'Weekly comparison block exists');
  assert.ok(posMonthly > posWeekly, 'Monthly trend block directly follows weekly block');
  assert.ok(posWidget > posMonthly, 'Widget follows Monthly trend block');
  assert.ok(posTable > posWidget, 'Table follows Widget');
  assert.ok(posRoute > posTable, 'Route block follows Table');
  assert.doesNotMatch(pageSource, /BcvhMtdSummaryBlock/);
  assert.doesNotMatch(blocksSource, /Chất lượng tổng quan MTD/);

  // Monthly heatmap is kept but collapsed by default (<details> without the open attribute)
  assert.match(blocksSource, /<details className="group border-t border-gray-100 pt-3/);
  assert.match(blocksSource, /Xem ma trận 6 BCVH × tháng/);
  assert.doesNotMatch(blocksSource, />Đạt KPI</);

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

test('processOverviewData calculates monthly total as summed passed / summed volume and preserves units', () => {
  const rawData = {
    monthly: [
      { month: '2026-01', ma_bcvh: '533140', volume: 1000, passed: 600, rate: 60.0, days_with_data: 31, days_in_period: 31 },
      { month: '2026-01', ma_bcvh: '535470', volume: 800, passed: 560, rate: 70.0, days_with_data: 31, days_in_period: 31 },
      // Month 2026-02 only has unit 533140
      { month: '2026-02', ma_bcvh: '533140', volume: 1200, passed: 744, rate: 62.0, days_with_data: 24, days_in_period: 26 },
      // Month 2026-03 has no volume (empty month)
      { month: '2026-03', ma_bcvh: '533140', volume: 0, passed: 0, rate: null, days_with_data: 0, days_in_period: 31 },
    ],
    daily: [],
    mtd: [],
    routes: [],
  };

  const processed = processOverviewData(rawData);
  const m1 = processed.monthlyChartData.find((r) => r.month === '2026-01');
  const m2 = processed.monthlyChartData.find((r) => r.month === '2026-02');
  const m3 = processed.monthlyChartData.find((r) => r.month === '2026-03');

  // Month 1: Total volume = 1000 + 800 = 1800. Passed = 600 + 560 = 1160. Rate = (1160/1800)*100 = 64.44%
  assert.equal(m1.total.total_volume, 1800);
  assert.equal(m1.total.passed, 1160);
  assert.equal(m1.total.failed, 640);
  assert.equal(m1.total.quality_rate, 64.44);
  assert.equal(m1.total.target_variance, -25.56);

  // Month 2: Total volume = 1200, Passed = 744, Rate = 62.0
  assert.equal(m2.total.total_volume, 1200);
  assert.equal(m2.total.passed, 744);
  assert.equal(m2.total.quality_rate, 62.0);

  // Month 3: Empty month -> null values, no fake 0
  assert.equal(m3.total.total_volume, null);
  assert.equal(m3.total.quality_rate, null);

  // getMonthlyTrendSeriesData for total
  const totalSeries = getMonthlyTrendSeriesData(processed.monthlyChartData, 'total');
  assert.equal(totalSeries.length, 3);
  assert.equal(totalSeries[0].total_volume, 1800);
  assert.equal(totalSeries[0].quality_rate, 64.44);
  assert.equal(totalSeries[2].total_volume, null);
  assert.equal(totalSeries[2].quality_rate, null);

  // getMonthlyTrendSeriesData for unit 533140
  const unitSeries = getMonthlyTrendSeriesData(processed.monthlyChartData, '533140');
  assert.equal(unitSeries[0].total_volume, 1000);
  assert.equal(unitSeries[0].quality_rate, 60.0);
  assert.equal(unitSeries[1].total_volume, 1200);
  assert.equal(unitSeries[1].quality_rate, 62.0);
});
