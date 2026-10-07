import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEEKLY_TREND_TOTAL_KEY,
  buildMonthOptions,
  buildWeeklyTrendChartData,
  checkMonthsDaysMismatch,
  formatMonthLabel,
  getWeeklyTrendSeriesData,
  previousMonthId,
} from './bcvhWeeklyComparisonData.js';
import fs from 'node:fs';
import {
  createMonthlyComparisonFetcher,
  createMonthsListFetcher,
  createWeeklyTrendFetcher,
} from './bcvhWeeklyComparisonFetcher.js';

const SEP = { month_id: '2026-09', year: 2026, month: 9, month_start: '2026-09-01', display_start_date: '2026-09-01', display_end_date: '2026-09-30', days_with_data: 30 };
const OCT = { month_id: '2026-10', year: 2026, month: 10, month_start: '2026-10-01', display_start_date: '2026-10-01', display_end_date: '2026-10-05', days_with_data: 5 };

test('buildMonthOptions: newest first, label carries month/year and real data range', () => {
  const options = buildMonthOptions([SEP, OCT]);
  assert.deepEqual(options.map((o) => o.value), ['2026-10', '2026-09']);
  assert.equal(options[0].label, 'Tháng 10/2026: 01/10–05/10/2026');
  assert.equal(formatMonthLabel(SEP), 'Tháng 9/2026');
  assert.deepEqual(buildMonthOptions([]), []);
});

test('checkMonthsDaysMismatch: warns with a cùng kỳ suggestion; silent once cùng kỳ is on', () => {
  const result = checkMonthsDaysMismatch(OCT, SEP, false);
  assert.equal(result.isMismatch, true);
  assert.equal(result.message, 'Lưu ý: Hai tháng có số ngày dữ liệu khác nhau');
  assert.match(result.suggestion, /So sánh cùng kỳ/);
  assert.equal(checkMonthsDaysMismatch(OCT, SEP, true).isMismatch, false);
  assert.equal(checkMonthsDaysMismatch(SEP, { ...SEP, month_id: '2026-08' }, false).isMismatch, false);
});

test('monthly fetchers: one request each, same_period only sent when ticked', async () => {
  const calls = [];
  const client = {
    get: async (url, config) => {
      calls.push({ url, params: config?.params });
      return { data: { success: true, data: url.endsWith('/months') ? { months: [SEP] } : { rows: [] } } };
    },
  };
  let listState;
  await createMonthsListFetcher(client, (u) => { listState = typeof u === 'function' ? u({}) : u; })();
  assert.equal(calls[0].url, '/f13/ranking/bcvh/months');
  assert.equal(listState.months.length, 1);

  let cmpState;
  const fetchCmp = createMonthlyComparisonFetcher(client, (u) => { cmpState = typeof u === 'function' ? u({}) : u; });
  await fetchCmp('2026-10', '2026-09', false);
  await fetchCmp('2026-10', '2026-09', true);
  assert.equal(calls[1].url, '/f13/ranking/bcvh/monthly-comparison');
  assert.deepEqual(calls[1].params, { month: '2026-10', compare_month: '2026-09' });
  assert.deepEqual(calls[2].params, { month: '2026-10', compare_month: '2026-09', same_period: 1 });
  assert.equal(cmpState.status, 'success');
});

test('previousMonthId: wraps January to December of the previous year, rejects malformed ids', () => {
  assert.equal(previousMonthId('2026-10'), '2026-09');
  assert.equal(previousMonthId('2026-01'), '2025-12');
  assert.equal(previousMonthId('2026-13'), '');
  assert.equal(previousMonthId(''), '');
});

const TREND_WEEKS = [
  { week_id: '2026-W52', iso_year: 2026, iso_week: 52, display_start_date: '2026-12-24', display_end_date: '2026-12-30', is_in_progress: false, units: { 533140: { rate: 61.5, volume: 100, passed: 61 } }, total: { rate: 60, volume: 600, passed: 360 } },
  { week_id: '2027-W01', iso_year: 2027, iso_week: 1, display_start_date: '2026-12-31', display_end_date: '2027-01-06', is_in_progress: false, units: { 533140: { rate: null, volume: null, passed: null } }, total: { rate: null, volume: null, passed: null } },
  { week_id: '2027-W02', iso_year: 2027, iso_week: 2, display_start_date: '2027-01-07', display_end_date: '2027-01-09', is_in_progress: true, last_data_date: '2027-01-09', units: { 533140: { rate: 70, volume: 200, passed: 140 } }, total: { rate: 66.6667, volume: 1200, passed: 800 } },
];

test('buildWeeklyTrendChartData: oldest first, year suffix only for older years, gaps stay null, in-progress note', () => {
  const rows = buildWeeklyTrendChartData(TREND_WEEKS);
  assert.deepEqual(rows.map((r) => r.label), ['Tuần 52/26', 'Tuần 1', 'Tuần 2']);
  assert.equal(rows[0]['533140'], 61.5);
  assert.equal(rows[1]['533140'], null, 'no data -> null, never a fake 0');
  assert.equal(rows[1][WEEKLY_TREND_TOTAL_KEY], null);
  assert.equal(rows[2][WEEKLY_TREND_TOTAL_KEY], 66.6667);
  assert.equal(rows[2].dataThroughNote, 'Dữ liệu đến ngày 09/01/2027');
  assert.equal(rows[0].dataThroughNote, null);
  assert.deepEqual(buildWeeklyTrendChartData([]), []);
});

test('getWeeklyTrendSeriesData: extracts normalized series for TOTAL or a specific BCVH code', () => {
  const chartRows = buildWeeklyTrendChartData(TREND_WEEKS);
  const totalSeries = getWeeklyTrendSeriesData(chartRows, WEEKLY_TREND_TOTAL_KEY);
  assert.equal(totalSeries.length, 3);
  assert.equal(totalSeries[0].total_volume, 600);
  assert.equal(totalSeries[0].passed, 360);
  assert.equal(totalSeries[0].failed, 240);
  assert.equal(totalSeries[0].quality_rate, 60);
  assert.equal(totalSeries[0].target_variance, -30);

  // gap stays null
  assert.equal(totalSeries[1].total_volume, null);
  assert.equal(totalSeries[1].quality_rate, null);

  const unitSeries = getWeeklyTrendSeriesData(chartRows, '533140');
  assert.equal(unitSeries[0].total_volume, 100);
  assert.equal(unitSeries[0].passed, 61);
  assert.equal(unitSeries[0].quality_rate, 61.5);
  assert.equal(unitSeries[1].total_volume, null);
  assert.equal(unitSeries[2].total_volume, 200);
});

test('createWeeklyTrendFetcher: one request with the anchor week only', async () => {
  const calls = [];
  const client = { get: async (url, config) => { calls.push({ url, params: config?.params }); return { data: { success: true, data: { weeks: TREND_WEEKS } } }; } };
  let state;
  const fetchTrend = createWeeklyTrendFetcher(client, (u) => { state = typeof u === 'function' ? u({}) : u; });
  await fetchTrend('');
  assert.equal(calls.length, 0, 'no anchor -> no request');
  await fetchTrend('2027-W02');
  assert.deepEqual(calls, [{ url: '/f13/ranking/bcvh/weekly-trend', params: { week: '2027-W02' } }]);
  assert.equal(state.status, 'success');
  assert.equal(state.weeks.length, 3);
});

test('weekly trend block contract: under the weekly table, anchor-week driven, combo bar/line chart with zoom', () => {
  const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
  const comparison = read('./BcvhWeeklyComparisonBlock.jsx');
  const trend = read('./BcvhWeeklyTrendBlock.jsx');
  const comboChart = read('./BcvhWeeklyComboTrendChart.jsx');
  const page = read('./BcvhRankingPage.jsx');

  // placed right below the weekly comparison table and fed only by the anchor week
  assert.ok(comparison.indexOf('</section>') < comparison.indexOf('<BcvhWeeklyTrendBlock'), 'trend is below the table card');
  assert.match(comparison, /<BcvhWeeklyTrendBlock anchorWeekId={selection.current}/);
  assert.doesNotMatch(trend, /useSearchParams|GlobalFilterBar/);
  assert.match(trend, /Xem theo đơn vị/);
  assert.match(trend, /Tổng cộng 6 BCVH/);

  // default unit is TOTAL
  assert.match(trend, /useState\(WEEKLY_TREND_TOTAL_KEY\)/);

  // combo chart structure: volume bar + quality rate line + 90% target + ChartZoomFrame
  assert.match(comboChart, /ChartZoomFrame/);
  assert.match(comboChart, /ComposedChart/);
  assert.match(comboChart, /QUALITY_TARGET_RATE/);
  assert.match(comboChart, /renderVolumeBarLabel/);
  assert.match(comboChart, /renderRateLabel/);
  assert.match(comboChart, /SmallMultiplesGrid/);

  // old daily block is gone from the page
  assert.doesNotMatch(page, /BcvhDailyTrendBlock/);
});

test('monthly trend block contract: combo bar/line chart with unit filter, small multiples, and MTD note', () => {
  const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
  const blocks = read('./BcvhRankingOverviewBlocks.jsx');
  const monthlyChart = read('./BcvhMonthlyComboTrendChart.jsx');

  // Uses BcvhMonthlyComboTrendChart
  assert.match(blocks, /<BcvhMonthlyComboTrendChart/);

  // Unit filter with default total
  assert.match(blocks, /Xem theo đơn vị/);
  assert.match(blocks, /useState\(MONTHLY_TREND_TOTAL_KEY\)/);
  assert.match(blocks, /Tổng cộng 6 BCVH/);
  assert.match(blocks, /Tất cả 6 BCVH/);

  // MTD anchor note
  assert.match(blocks, /Tháng hiện tại lũy kế đến/);

  // Monthly combo chart features
  assert.match(monthlyChart, /ComposedChart/);
  assert.match(monthlyChart, /QUALITY_TARGET_RATE/);
  assert.match(monthlyChart, /renderVolumeBarLabel/);
  assert.match(monthlyChart, /renderRateLabel/);
  assert.match(monthlyChart, /SmallMultiplesMonthlyGrid/);
  assert.match(monthlyChart, /classifyF13HeatmapRate/);
  assert.match(monthlyChart, /isCurrentMonth/);
});

