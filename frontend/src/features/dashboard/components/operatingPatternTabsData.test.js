import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  DEFAULT_OPERATING_PATTERN_TAB,
  OPERATING_PATTERN_TABS,
  buildHeatmapCellLines,
  buildHeatmapDayDetailText,
  buildHeatmapDetailLayerModel,
  buildHeatmapMonthStats,
  buildMonthlyRankDetail,
  buildGroundedOperatingPatternSummary,
  HEATMAP_WEEKDAY_LABELS,
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
    { month: '2026-02', label: 'T2', total_volume: 2000, passed: 1800, pass_rate: 90, from_date: '2026-02-01', to_date: '2026-02-28', national_rank: { available: true, rank: 12, total: 34, movement: null, period_start: '2026-02-01', period_end: '2026-02-28' } },
    { month: '2026-07', label: 'T7', total_volume: 1500, passed: 1200, pass_rate: 80, from_date: '2026-07-01', to_date: '2026-07-16', is_current_month: true, national_rank: { available: true, rank: 9, total: 34, movement: 3, movement_label: '↑ 3 hạng', period_start: '2026-07-01', period_end: '2026-07-16' } },
  ],
  heatmap: [[
    null,
    { date: '2026-07-15', kpi_rate: 93.2, dod: 1.15 },
    { date: '2026-07-16', kpi_rate: 87.4, dod: -2.1 },
  ]],
  pulse: {
    text: 'Dá»¯ liá»‡u nhá»‹p cháº¥t lÆ°á»£ng tá»« API.',
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
  assert.equal(model.month[1].nationalRankLabel, 'Hạng 12/34');
  assert.equal(model.month[2].nationalRankLabel, 'Hạng 9/34');
  assert.equal(model.month[2].rankMovementLabel, '↑ 3 hạng');
  assert.match(model.month[2].monthlyRankDetail, /T7: Hạng 9\/34/);
  assert.equal(model.heatmap[0].days[1].date, '2026-07-15');
  assert.equal(model.heatmap[0].days[1].dayLabel, '15/07');
  assert.equal(model.pulse.text, 'Dá»¯ liá»‡u nhá»‹p cháº¥t lÆ°á»£ng tá»« API.');
});

test('maps monthly nationwide rank movement labels and missing-month wording from backend payload', () => {
  const model = mapOperatingPatternResponse({
    monthly_ytd: [
      { month: '2026-06', label: 'T6', total_volume: 1000, passed: 700, pass_rate: 70, national_rank: { available: true, rank: 9, total: 34, movement: null, period_start: '2026-06-01', period_end: '2026-06-30' } },
      { month: '2026-07', label: 'T7', total_volume: 1100, passed: 720, pass_rate: 65.45, national_rank: { available: true, rank: 14, total: 34, movement: -5, movement_label: '↓ 5 hạng', period_start: '2026-07-01', period_end: '2026-07-19' } },
      { month: '2026-08', label: 'T8', total_volume: 0, passed: 0, pass_rate: null, national_rank: { available: false, message: 'Chưa có dữ liệu xếp hạng tháng T8', period_start: '2026-08-01', period_end: '2026-08-16' } },
    ],
  });

  assert.equal(model.month[0].rankMovementLabel, null);
  assert.equal(model.month[1].nationalRankLabel, 'Hạng 14/34');
  assert.equal(model.month[1].rankMovementLabel, '↓ 5 hạng');
  assert.match(model.month[1].monthlyRankDetail, /Kỳ xếp hạng: 01\/07\/2026 đến 19\/07\/2026/);
  assert.equal(model.month[2].nationalRankLabel, 'Chưa có dữ liệu xếp hạng tháng T8');
  assert.equal(model.month[2].rankMovementLabel, null);
  assert.equal(buildMonthlyRankDetail(model.month[2]), model.month[2].monthlyRankDetail);
});

test('monthly rank is absent when backend suppresses province-level rank metadata', () => {
  const model = mapOperatingPatternResponse({
    monthly_ytd: [
      { month: '2026-07', label: 'T7', total_volume: 1500, passed: 1200, pass_rate: 80 },
    ],
  });

  assert.equal(model.month[0].nationalRank, null);
  assert.equal(model.month[0].nationalRankLabel, null);
  assert.equal(model.month[0].monthlyRankDetail, null);
});

test('maps Heatmap backend nationwide rank for tooltip and focus text', () => {
  const model = mapOperatingPatternResponse({
    heatmap: [[
      {
        date: '2026-07-19',
        kpi_rate: 52.56,
        dod: 0,
        color: 'red',
        national_rank: { available: true, rank: 24, total: 34, period: '2026-07-19' },
      },
    ]],
  }, { toDate: '2026-07-19' });

  const day = model.heatmap[0].days[0];
  assert.equal(day.nationalRank.rank, 24);
  assert.equal(day.nationalRankLabel, 'Xếp hạng toàn quốc: Hạng 24/34');
  assert.equal(day.compactNationalRankLabel, 'H24/34');
  assert.deepEqual(
    buildHeatmapCellLines(day).map((line) => line.label),
    ['19/07', '52.56%', 'H24/34'],
  );
});

test('maps Heatmap unavailable nationwide rank using backend message', () => {
  const model = mapOperatingPatternResponse({
    heatmap: [[
      {
        date: '2026-07-20',
        kpi_rate: 52.56,
        dod: 0,
        color: 'red',
        national_rank: { available: false, message: 'Chưa có dữ liệu xếp hạng toàn quốc cho ngày 2026-07-20' },
      },
    ]],
  }, { toDate: '2026-07-20' });

  assert.equal(model.heatmap[0].days[0].nationalRankLabel, 'Chưa có dữ liệu xếp hạng toàn quốc cho ngày 2026-07-20');
  assert.equal(model.heatmap[0].days[0].compactNationalRankLabel, 'H–');
  assert.deepEqual(
    buildHeatmapCellLines(model.heatmap[0].days[0]).map((line) => line.label),
    ['20/07', '52.56%', 'H–'],
  );
});

test('Heatmap cell rendering model suppresses inline province rank when backend rank is absent', () => {
  const day = mapOperatingPatternResponse({
    heatmap: [[
      {
        date: '2026-07-19',
        kpi_rate: 52.56,
        dod: 0,
        color: 'red',
      },
    ]],
  }, { toDate: '2026-07-19' }).heatmap[0].days[0];

  assert.equal(day.nationalRank, null);
  assert.equal(day.compactNationalRankLabel, null);
  assert.deepEqual(
    buildHeatmapCellLines(day).map((line) => line.label),
    ['19/07', '52.56%'],
  );
});

test('Heatmap rank detail layer becomes visible from runtime hover or focus geometry', () => {
  const model = mapOperatingPatternResponse({
    heatmap: [[
      {
        date: '2026-07-19',
        kpi_rate: 52.56,
        dod: 0,
        color: 'red',
        national_rank: { available: true, rank: 21, total: 34, period: '2026-07-19' },
      },
    ]],
  }, { toDate: '2026-07-19' });

  const day = model.heatmap[0].days[0];
  const rectFromHoverOrFocus = { left: 994.92, top: 359.62, width: 54.86, height: 56 };
  const detail = buildHeatmapDetailLayerModel(day, rectFromHoverOrFocus);

  assert.equal(buildHeatmapDayDetailText(day), '0.00 so với TB | Xếp hạng toàn quốc: Hạng 21/34');
  assert.equal(detail.label, '0.00 so với TB | Xếp hạng toàn quốc: Hạng 21/34');
  assert.equal(detail.position, 'fixed');
  assert.equal(detail.placement, 'viewport-fixed');
  assert.equal(detail.zIndex, 1000);
  assert.equal(Number(detail.left.toFixed(2)), 1022.35);
  assert.equal(detail.top, 351.62);
});

test('Heatmap unavailable rank detail uses backend wording in the visible layer model', () => {
  const day = mapOperatingPatternResponse({
    heatmap: [[
      {
        date: '2026-07-20',
        kpi_rate: 52.56,
        color: 'red',
        national_rank: { available: false, message: 'Chưa có dữ liệu xếp hạng toàn quốc cho ngày 2026-07-20' },
      },
    ]],
  }, { toDate: '2026-07-20' }).heatmap[0].days[0];

  const detail = buildHeatmapDetailLayerModel(day, { left: 100, top: 200, width: 40, height: 56 });

  assert.equal(detail.label, '0.00 so với TB | Chưa có dữ liệu xếp hạng toàn quốc cho ngày 2026-07-20');
  assert.equal(detail.position, 'fixed');
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

test('heatmap month average is still computed for tooltips/stats, but day cell color uses the absolute classifier', () => {
  const heatmap = [[
    { date: '2026-07-01', kpi_rate: 80 },
    { date: '2026-07-02', kpi_rate: 74 },
    { date: '2026-07-03', kpi_rate: 70 },
    { date: '2026-07-04', kpi_rate: 66 },
    { date: '2026-07-05', kpi_rate: 60 },
  ]];

  // Analytical average/delta data (PO decision 2026-08-28: kept, no longer decides color).
  const stats = buildHeatmapMonthStats(heatmap, '2026-07');
  assert.equal(stats.average, 70);
  assert.deepEqual(stats.best, { date: '2026-07-01', rate: 80, deltaFromMonthAverage: 10 });
  assert.deepEqual(stats.worst, { date: '2026-07-05', rate: 60, deltaFromMonthAverage: -10 });
  assert.equal(stats.aboveAverageCount, 2);
  assert.equal(stats.belowAverageCount, 2);

  const model = mapOperatingPatternResponse({ heatmap }, { toDate: '2026-07-05' });

  // Cell color: absolute F1.3 Heatmap SSOT (green >=70 / pink 60-70 / yellow 50-60 / red <50),
  // classified from each day's own rate — 80/74/70 are all >=70 (green) even though 70 sits
  // exactly at the monthly average; 66/60 are both in [60,70) (pink).
  assert.deepEqual(
    model.heatmap[0].days.map((day) => day.targetTone),
    ['band-green', 'band-green', 'band-green', 'band-pink', 'band-pink'],
  );
  assert.deepEqual(
    model.heatmap[0].days.map((day) => day.bandLabel),
    ['Xanh', 'Xanh', 'Xanh', 'Hồng', 'Hồng'],
  );

  // deltaFromMonthAverage is still present on every day (for the tooltip), even though it no
  // longer drives targetTone/bandLabel.
  assert.deepEqual(
    model.heatmap[0].days.map((day) => day.deltaFromMonthAverage),
    [10, 4, 0, -4, -10],
  );

  // getHeatmapRelativeBand()/HEATMAP_RELATIVE_BANDS remain valid, standalone analytical
  // helpers — they are simply no longer wired into day.targetTone/bandLabel above.
  assert.deepEqual(
    [10, 4, 0, -4, -10].map((delta) => getHeatmapRelativeBand(delta).id),
    ['significantly-above', 'above', 'near-average', 'below', 'significantly-below'],
  );

  assert.equal(model.heatmap[0].days[0].valueLabel, '80.00%');
  assert.equal(model.heatmap[0].days[0].dayLabel, '01/07');
  assert.equal(model.heatmapMonths[0].label, 'Tháng 07/2026');
  assert.equal(model.heatmapMonths[0].rangeLabel, 'Từ 01/07/2026 đến 05/07/2026');
});

test('two days with the same rate get the same Heatmap color even when their monthly averages differ', () => {
  const lowAverageMonth = mapOperatingPatternResponse({
    heatmap: [[
      { date: '2026-02-01', kpi_rate: 65 },
      { date: '2026-02-02', kpi_rate: 40 },
    ]],
  }, { toDate: '2026-02-02' });

  const highAverageMonth = mapOperatingPatternResponse({
    heatmap: [[
      { date: '2026-03-01', kpi_rate: 65 },
      { date: '2026-03-02', kpi_rate: 95 },
    ]],
  }, { toDate: '2026-03-02' });

  const dayA = lowAverageMonth.heatmap[0].days[0]; // rate 65, month average 52.5
  const dayB = highAverageMonth.heatmap[0].days[0]; // rate 65, month average 80
  assert.equal(dayA.rate, 65);
  assert.equal(dayB.rate, 65);
  assert.notEqual(dayA.deltaFromMonthAverage, dayB.deltaFromMonthAverage);
  assert.equal(dayA.targetTone, dayB.targetTone);
  assert.equal(dayA.targetTone, 'band-pink');
});

test('heatmap groups complete previous month and current month through cutoff with unknown days preserved', () => {
  const heatmap = [
    [
      { date: '2026-06-01', kpi_rate: 80 },
      { date: '2026-06-02', kpi_rate: 0, is_empty: true, color: 'gray' },
      { date: '2026-06-03', kpi_rate: 70 },
      { date: '2026-06-04', kpi_rate: 66 },
      { date: '2026-06-05', kpi_rate: 60 },
      { date: '2026-06-06', kpi_rate: 75 },
      { date: '2026-06-07', kpi_rate: 74 },
    ],
    [
      { date: '2026-06-30', kpi_rate: 90 },
      { date: '2026-07-01', kpi_rate: 82 },
      { date: '2026-07-02', kpi_rate: 81 },
      { date: '2026-07-03', kpi_rate: 80 },
      { date: '2026-07-04', kpi_rate: 79 },
      { date: '2026-07-05', kpi_rate: 78 },
      { date: '2026-07-06', kpi_rate: 77 },
    ],
    [
      { date: '2026-07-16', kpi_rate: 76 },
      null,
      null,
      null,
      null,
      null,
      null,
    ],
  ];

  const model = mapOperatingPatternResponse({ heatmap }, { toDate: '2026-07-16' });
  assert.deepEqual(model.heatmapMonths.map((month) => month.month), ['2026-06', '2026-07']);
  assert.equal(model.heatmapMonths[0].days[0].date, '2026-06-01');
  assert.equal(model.heatmapMonths[0].days.at(-1).date, '2026-06-30');
  assert.equal(model.heatmapMonths[0].rangeLabel, 'Từ 01/06/2026 đến 30/06/2026');
  assert.equal(model.heatmapMonths[1].days.at(-1).date, '2026-07-16');
  assert.equal(model.heatmapMonths[1].rangeLabel, 'Từ 01/07/2026 đến 16/07/2026');

  const unknownDay = model.heatmapMonths[0].days.find((day) => day.date === '2026-06-02');
  assert.equal(unknownDay.available, false);
  assert.equal(unknownDay.valueLabel, 'Chưa có dữ liệu');
  assert.equal(unknownDay.targetTone, 'unavailable');
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
  assert.match(source, /mode:\s*activeTab/);
  assert.match(source, /\[activeTab, maBcvh, toDate\]/);
  assert.doesNotMatch(source, /from_date:\s*fromDate/);
  assert.match(source, /<ComboChartPanel rows=\{rows\} mode="month" \/>/);
  assert.match(source, /<ComboChartPanel rows=\{rows\} mode="weekday" \/>/);
  assert.doesNotMatch(source, /renderWeekly\(.*renderMonthly\(.*renderHeatmap/s);
});

test('component source exposes required legends labels and heatmap month separation', () => {
  const source = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');

  // Heatmap absolute color SSOT (2026-08-28): both the "Theo thứ" and "Heatmap" tabs use
  // the same absolute band legend body, only the heading differs per tab.
  assert.match(source, /Màu điểm KPI theo ngưỡng chất lượng/);
  assert.match(source, /Màu Heatmap theo ngưỡng chất lượng/);
  assert.doesNotMatch(source, /Chú giải màu theo ngưỡng cảnh báo đã phê duyệt/);
  assert.doesNotMatch(source, /So sánh với KPI trung bình tháng/);
  assert.match(source, /Tốt nhất/);
  assert.match(source, /Thấp nhất/);
  assert.match(source, /Tháng hiện tại/);
  assert.match(source, /month\.rangeLabel/);
  assert.match(source, /HEATMAP_WEEKDAY_LABELS\.map/);
  assert.match(source, /min-w-\[420px\]/);
  assert.match(source, /data-testid="heatmap-rank-detail-layer"/);
  assert.match(source, /role="tooltip"/);
  assert.match(source, /className="pointer-events-none fixed/);
  assert.match(source, /buildHeatmapCellLines\(day\)/);
  assert.match(source, /h-14/);
  assert.doesNotMatch(source, /group-hover:block|group-focus:block/);
  assert.deepEqual(HEATMAP_WEEKDAY_LABELS, ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
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

test('the weekday AND heatmap tabs both use the single absolute F1.3 Heatmap threshold catalog, not a relative-to-monthly-average one', () => {
  const componentSource = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');
  const mapperSource = fs.readFileSync(new URL('./operatingPatternTabsData.js', import.meta.url), 'utf8');
  const catalogSource = fs.readFileSync(
    new URL('../../../components/f13/f13HeatmapBandCatalog.js', import.meta.url),
    'utf8',
  );

  // The 70/60/50 thresholds live in exactly one place: the shared catalog module. Neither
  // this mapper nor the card re-declares them.
  assert.match(catalogSource, /min: 70/);
  assert.match(catalogSource, /min: 60/);
  assert.match(catalogSource, /min: 50/);
  assert.doesNotMatch(mapperSource, /min:\s*70/);
  assert.doesNotMatch(componentSource, /min:\s*70/);

  // The old "relative to monthly average" heatmap legend heading is gone; both tabs now
  // read from the same absolute band legend body (AbsoluteBandLegendBody).
  assert.doesNotMatch(componentSource, /So sánh với KPI trung bình tháng/);
  assert.match(componentSource, /function AbsoluteBandLegendBody/);
  assert.match(componentSource, /<AbsoluteBandLegendBody \/>/);

  // day.targetTone (Heatmap tab) is classified from the rate, not from deltaFromMonthAverage.
  assert.match(mapperSource, /classifyF13HeatmapRate\(rate\)/);
  assert.doesNotMatch(mapperSource, /targetTone:\s*relativeBand\.tone/);

  assert.doesNotMatch(componentSource, /TCT/);
});

test('timeline service heatmap uses previous month through latest available date without API contract change', () => {
  const serviceSource = fs.readFileSync(new URL('../../../../../backend/src/services/timelineService.js', import.meta.url), 'utf8');

  assert.match(serviceSource, /_getHeatmapWindowBounds/);
  assert.match(serviceSource, /Date\.UTC/);
  assert.match(serviceSource, /latestBusinessDate/);
  assert.match(serviceSource, /_buildHeatmapCalendar\(fullData, latestBusinessDate\)/);
  assert.match(serviceSource, /is_empty: Boolean\(d\.isEmpty\)/);
  assert.doesNotMatch(serviceSource, /const last30 = fullData\.slice\(-30\);\s*let currentWeek/s);
});

test('weekday backend color is never trusted for classification — only rate decides', () => {
  // A backend `color: 'green'` deliberately disagreeing with a low rate must not win: the
  // day still classifies red, because rate is the sole classification input (SSOT decision,
  // 2026-08-28, Section 5: never trust a backend `color` that could disagree with the
  // frontend catalog).
  const model = mapOperatingPatternResponse({
    weekly: [{ day: 'T2', avg_kpi: 30, pass_rate: 30, total_volume: 10, color: 'green' }],
  });

  assert.equal(model.weekday[0].targetTone, 'band-red');
  assert.equal(model.weekday[0].bandLabel, 'Đỏ');
});

test('"Theo thứ" tab source uses the absolute classifier per KPI point, a neutral line stroke, and keeps the volume bar its own color', () => {
  const source = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');

  // Per-point KPI dot color comes from classifyF13HeatmapRate(), not a single fixed stroke.
  assert.match(source, /function KpiQualityDot/);
  assert.match(source, /classifyF13HeatmapRate\(payload\?\.rate\)/);
  assert.match(source, /dot=\{<KpiQualityDot \/>\}/);
  assert.match(source, /activeDot=\{<KpiQualityDot r=\{9\} \/>\}/);

  // The weekday line itself is neutral (slate), not hardcoded emerald — it must not default
  // to reading as "good" regardless of the data.
  assert.match(source, /isWeekday[\s\S]{0,400}stroke="#64748B"/);

  // Volume bar keeps its own blue fill in both modes — never recolored by KPI quality.
  assert.match(source, /<Bar yAxisId="volume" dataKey="totalVolume" name="Sản lượng" fill="url\(#patternVolumeGradient\)"/);
  const barMatches = source.match(/<Bar yAxisId="volume"/g) || [];
  assert.equal(barMatches.length, 1, 'exactly one <Bar> element, shared by both modes, never re-colored per KPI band');

  // Month tab's line is untouched — still the fixed emerald stroke/dot it always had.
  assert.match(source, /stroke="#059669" strokeWidth=\{3\} dot=\{\{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#059669' \}\}/);
});

test('ComboTooltip shows the KPI quality group only when the point provides one (weekday rows), never inventing it for month rows', () => {
  const source = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');
  assert.match(source, /Nhóm màu\/chất lượng/);
  assert.match(source, /point\.bandLabel/);

  const model = mapOperatingPatternResponse(sampleTimeline, { toDate: '2026-07-16' });
  assert.equal(model.weekday[0].bandLabel, 'Xanh');
  assert.equal(model.month[0].bandLabel, undefined);
});

test('the ">TB"/"<TB" heatmap management stats use a neutral color, not a Heatmap band color', () => {
  const source = fs.readFileSync(new URL('./OperatingPatternTabsCard.jsx', import.meta.url), 'utf8');
  const aboveBelowBlock = source.slice(
    source.indexOf('&gt; TB') - 200,
    source.indexOf('&lt; TB') + 200,
  );
  assert.doesNotMatch(aboveBelowBlock, /border-emerald-200|bg-emerald-50|text-emerald-950/);
  assert.doesNotMatch(aboveBelowBlock, /border-amber-200|bg-amber-50|text-amber-950/);
  assert.match(aboveBelowBlock, /border-slate-200/);
});
