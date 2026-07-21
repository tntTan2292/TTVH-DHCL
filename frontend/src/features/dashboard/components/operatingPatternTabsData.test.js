import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  DEFAULT_OPERATING_PATTERN_TAB,
  OPERATING_PATTERN_TABS,
  buildHeatmapMonthStats,
  buildGroundedOperatingPatternSummary,
  getApprovedWeekdayBand,
  getHeatmapRelativeBand,
  hasUsableModeData,
  mapOperatingPatternResponse,
} from './operatingPatternTabsData.js';

const sampleTimeline = {
  weekly: [
    { day: 'T2', avg_kpi: 91.25, total_volume: 1200, pass_rate: 91.25, color: 'green' },
    { day: 'T3', avg_kpi: 0, total_volume: 0, pass_rate: 0, color: 'red' },
  ],
  monthly_ytd: [
    { month: '2026-01', label: 'T1', total_volume: 1000, passed: 800, pass_rate: 80, from_date: '2026-01-01', to_date: '2026-01-31' },
    { month: '2026-02', label: 'T2', total_volume: 2000, passed: 1800, pass_rate: 90, from_date: '2026-02-01', to_date: '2026-02-28' },
    { month: '2026-07', label: 'T7', total_volume: 1500, passed: 1200, pass_rate: 80, from_date: '2026-07-01', to_date: '2026-07-16', is_current_month: true },
  ],
  heatmap: [[
    null,
    { date: '2026-07-15', kpi_rate: 93.2, dod: 1.15 },
    { date: '2026-07-16', kpi_rate: 87.4, dod: -2.1 },
  ]],
  pulse: {
    text: 'Dữ liệu nhịp chất lượng từ API.',
    color: 'blue',
  },
};

test('operating pattern tabs expose exact PO order and default to monthly', () => {
  assert.equal(DEFAULT_OPERATING_PATTERN_TAB, 'month');
  assert.deepEqual(OPERATING_PATTERN_TABS.map((tab) => tab.label), ['Theo tháng', 'Theo thứ', 'Heatmap']);
});

test('maps weekly monthly YTD and heatmap values from quality timeline response', () => {
  const model = mapOperatingPatternResponse(sampleTimeline, { toDate: '2026-07-16' });

  assert.equal(model.weekday[0].label, 'T2');
  assert.equal(model.weekday[0].rate, 91.25);
  assert.equal(model.weekday[0].totalVolume, 1200);
  assert.equal(model.weekday[0].sourceLabel, 'KPI trung bình theo thứ');
  assert.equal(model.month[0].label, 'T1');
  assert.equal(model.month[1].totalVolume, 2000);
  assert.equal(model.month[2].cumulativeLabel, 'Lũy kế đến ngày 16/07/2026');
  assert.equal(model.heatmap[0].days[1].date, '2026-07-15');
  assert.equal(model.heatmap[0].days[1].dayLabel, '15/07');
  assert.equal(model.pulse.text, 'Dữ liệu nhịp chất lượng từ API.');
});

test('monthly YTD combo data exposes management summary and current-month cutoff', () => {
  const model = mapOperatingPatternResponse(sampleTimeline, { toDate: '2026-07-19' });

  assert.deepEqual(model.month.map((row) => row.label), ['T1', 'T2', 'T7']);
  assert.equal(model.monthlySummary.highestVolumeMonth.label, 'T2');
  assert.equal(model.monthlySummary.lowestVolumeMonth.label, 'T1');
  assert.equal(model.monthlySummary.bestPassRateMonth.label, 'T2');
  assert.equal(model.monthlySummary.lowestPassRateMonth.label, 'T1');
  assert.equal(model.monthlySummary.currentMonth.label, 'T7');
  assert.equal(model.monthlySummary.currentMonth.volumeLabel, '1.500');
  assert.equal(model.monthlySummary.currentMonth.valueLabel, '80.00%');
  assert.equal(model.monthlySummary.currentMonth.cumulativeLabel, 'Lũy kế đến ngày 16/07/2026');
});

test('weekday combo data preserves approved F1.3 warning bands and volume pass-rate fields', () => {
  assert.equal(getApprovedWeekdayBand(75).id, 'green');
  assert.equal(getApprovedWeekdayBand(65).id, 'pink');
  assert.equal(getApprovedWeekdayBand(55).id, 'yellow');
  assert.equal(getApprovedWeekdayBand(49.99).id, 'red');

  const model = mapOperatingPatternResponse({
    weekly: [
      { day: 'T2', avg_kpi: 75, pass_rate: 75, total_volume: 10, color: 'green' },
      { day: 'T3', avg_kpi: 65, pass_rate: 65, total_volume: 10, color: 'pink' },
      { day: 'T4', avg_kpi: 55, pass_rate: 55, total_volume: 10, color: 'yellow' },
      { day: 'T5', avg_kpi: 45, pass_rate: 45, total_volume: 10, color: 'red' },
    ],
  });

  assert.deepEqual(model.weekday.map((row) => row.targetTone), ['band-green', 'band-pink', 'band-yellow', 'band-red']);
  assert.deepEqual(model.weekday.map((row) => row.bandLabel), ['Xanh', 'Hồng', 'Vàng', 'Đỏ']);
  assert.deepEqual(model.weekday.map((row) => row.totalVolume), [10, 10, 10, 10]);
});

test('heatmap month average relative classification uses displayed authoritative daily KPI values', () => {
  const heatmap = [[
    { date: '2026-07-01', kpi_rate: 80 },
    { date: '2026-07-02', kpi_rate: 74 },
    { date: '2026-07-03', kpi_rate: 70 },
    { date: '2026-07-04', kpi_rate: 66 },
    { date: '2026-07-05', kpi_rate: 60 },
  ]];

  const stats = buildHeatmapMonthStats(heatmap, '2026-07');
  assert.equal(stats.average, 70);
  assert.deepEqual(stats.best, { date: '2026-07-01', rate: 80, deltaFromMonthAverage: 10 });
  assert.deepEqual(stats.worst, { date: '2026-07-05', rate: 60, deltaFromMonthAverage: -10 });
  assert.equal(stats.aboveAverageCount, 2);
  assert.equal(stats.belowAverageCount, 2);

  const model = mapOperatingPatternResponse({ heatmap }, { toDate: '2026-07-05' });
  assert.deepEqual(
    model.heatmap[0].days.map((day) => day.targetTone),
    ['relative-high', 'relative-above', 'relative-average', 'relative-below', 'relative-low'],
  );
  assert.deepEqual(
    [10, 4, 0, -4, -10].map((delta) => getHeatmapRelativeBand(delta).id),
    ['significantly-above', 'above', 'near-average', 'below', 'significantly-below'],
  );
  assert.equal(model.heatmap[0].days[0].valueLabel, '80.00%');
  assert.equal(model.heatmap[0].days[0].dayLabel, '01/07');
  assert.equal(model.heatmapMonths[0].label, 'Tháng 07/2026');
  assert.equal(model.heatmapMonths[0].rangeLabel, 'Từ 01/07/2026 đến 05/07/2026');
});

test('loading empty partial and unavailable mode contracts keep missing values explicit', () => {
  const model = mapOperatingPatternResponse({
    weekly: [{ day: 'T2', avg_kpi: 0, total_volume: 0, pass_rate: 0 }],
    monthly_ytd: [],
    heatmap: [[null]],
  });

  assert.equal(model.hasAnyData, false);
  assert.equal(hasUsableModeData('weekday', model.weekday), false);
  assert.equal(model.weekday[0].valueLabel, '0.00%');
  assert.equal(model.heatmap[0].days[0].empty, true);
});

test('grounded summaries use monthly YTD and heatmap management evidence', () => {
  const model = mapOperatingPatternResponse(sampleTimeline, { toDate: '2026-07-19' });

  const monthSummary = buildGroundedOperatingPatternSummary({
    activeTab: 'month',
    model,
    fromDate: '2026-01-01',
    toDate: '2026-07-19',
    maBcvh: 'all',
  });
  assert.match(monthSummary, /Tháng hiện tại T7/);
  assert.match(monthSummary, /Lũy kế đến ngày 16\/07\/2026/);

  const heatmapSummary = buildGroundedOperatingPatternSummary({
    activeTab: 'heatmap',
    model,
    fromDate: '2026-07-01',
    toDate: '2026-07-19',
    maBcvh: '536250',
  });
  assert.match(heatmapSummary, /KPI trung bình tháng/);
  assert.match(heatmapSummary, /1 ngày cao hơn trung bình/);
  assert.match(heatmapSummary, /1 ngày thấp hơn trung bình/);
  assert.match(heatmapSummary, /BCVH 536250/);
});

test('component source supports one-mode rendering combo charts and filter propagation', () => {
  const source = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');

  assert.match(source, /useState\(DEFAULT_OPERATING_PATTERN_TAB\)/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /setActiveTab\(tab\.id\)/);
  assert.match(source, /toDate,\s*\n\s*ma_bcvh: maBcvh/);
  assert.doesNotMatch(source, /from_date:\s*fromDate/);
  assert.match(source, /<ComboChartPanel rows=\{rows\} mode="month" \/>/);
  assert.match(source, /<ComboChartPanel rows=\{rows\} mode="weekday" \/>/);
  assert.doesNotMatch(source, /renderWeekly\(.*renderMonthly\(.*renderHeatmap/s);
});

test('component source exposes required legends labels and heatmap month separation', () => {
  const source = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');

  assert.match(source, /Chú giải màu theo ngưỡng cảnh báo đã phê duyệt/);
  assert.match(source, /So sánh với KPI trung bình tháng/);
  assert.match(source, /KPI trung bình tháng/);
  assert.match(source, /Ngày tốt nhất/);
  assert.match(source, /Ngày thấp nhất/);
  assert.match(source, /Tháng hiện tại/);
  assert.match(source, /month\.rangeLabel/);
});

test('component source defines loading empty partial unavailable and API-error states', () => {
  const source = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');

  assert.match(source, /<LoadingState/);
  assert.match(source, /<ErrorState/);
  assert.match(source, /<EmptyState/);
  assert.match(source, /!hasUsableModeData\(activeTab, rows\)/);
  assert.match(source, /getApiErrorMessage/);
  assert.match(source, /Chưa có dữ liệu/);
});

test('operator-facing sources do not expose raw i18n or API keys', () => {
  const componentSource = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');
  const mapperSource = fs.readFileSync(new URL('./operatingPatternTabsData.js', import.meta.url), 'utf8');

  assert.doesNotMatch(componentSource, /quality-timeline\./);
  assert.doesNotMatch(componentSource, /avg_kpi/);
  assert.doesNotMatch(mapperSource, /source(Label)?:\s*['"]quality-timeline\./);
  assert.match(mapperSource, /KPI trung bình theo thứ/);
  assert.match(mapperSource, /Sản lượng và tỷ lệ đạt theo tháng/);
});

test('weekday cutoffs are approved while heatmap remains relative to monthly average', () => {
  const componentSource = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');
  const mapperSource = fs.readFileSync(new URL('./operatingPatternTabsData.js', import.meta.url), 'utf8');

  assert.match(mapperSource, /min: 70/);
  assert.match(mapperSource, /min: 60/);
  assert.match(mapperSource, /min: 50/);
  assert.match(componentSource, /So sánh với KPI trung bình tháng/);
  assert.doesNotMatch(componentSource, /TCT/);
});
