import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildDayOverDayComparison,
  buildIntegratedTrendRows,
  buildLeadershipComparison,
  buildLeadershipComparisonWidgets,
  buildSevenDayVisibleComparisonEvidence,
  buildWeekOverWeekComparison,
  getFailedRate,
  summarizeRiskEvidence,
  TREND_MODES,
} from './integratedTrendRiskData.js';
import { buildTrendlineRequestParams } from './qualityTrendlineWindow.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

const sampleTrend = [
  { date: '2026-07-07', total_volume: 90, passed: 82, failed: 8, quality_rate: 91.11, data_available: true },
  { date: '2026-07-08', total_volume: 100, passed: 80, failed: 20, quality_rate: 80, data_available: true },
  { date: '2026-07-09', total_volume: 0, passed: 0, failed: 0, quality_rate: null, data_available: false },
  { date: '2026-07-14', total_volume: 180, passed: 150, failed: 30, quality_rate: 83.33, data_available: true },
  { date: '2026-07-15', total_volume: 200, passed: 130, failed: 70, quality_rate: 65, data_available: true },
];

test('integrated trend exposes the three approved modes', () => {
  assert.deepEqual(TREND_MODES.map((mode) => mode.label), ['30 ngày', '7 ngày so sánh', 'Theo BCVH']);
});

test('failed rate remains derived data only and does not create unauthorized abnormal-day threshold', () => {
  const july8 = sampleTrend.find((item) => item.date === '2026-07-08');
  const july9 = sampleTrend.find((item) => item.date === '2026-07-09');

  assert.equal(getFailedRate(july8), 20);
  assert.equal(getFailedRate(july9), null);

  const rows = buildIntegratedTrendRows({ mode: '30-days', items: sampleTrend, toDate: '2026-07-15' });
  const july8Row = rows.find((item) => item.date === '2026-07-08');
  const july15Row = rows.find((item) => item.date === '2026-07-15');
  assert.equal(july8Row.below_target, true);
  assert.equal(july8Row.abnormal_day, false);
  assert.equal(july15Row.failed_rate, 35);
  assert.equal(july15Row.abnormal_day, false);
});

test('7-day mode preserves current and comparison periods without changing API contract', () => {
  const rows = buildIntegratedTrendRows({ mode: '7-days', items: sampleTrend, toDate: '2026-07-15' });
  assert.equal(rows.length, 7);
  assert.equal(rows[6].current_date, '2026-07-15');
  assert.equal(rows[6].previous_date, '2026-07-08');
  assert.equal(rows[6].previous_quality_rate, 80);
});

test('D-1 comparison uses latest available selected-range date and previous calendar day', () => {
  const comparison = buildDayOverDayComparison({
    items: sampleTrend,
    fromDate: '2026-07-14',
    toDate: '2026-07-15',
  });

  assert.equal(comparison.available, true);
  assert.equal(comparison.current_date, '2026-07-15');
  assert.equal(comparison.previous_date, '2026-07-14');
  assert.deepEqual(comparison.total_volume, { current: 200, previous: 180, delta: 20 });
  assert.deepEqual(comparison.pass_rate, { current: 65, previous: 83.33, delta: -18.33 });
  assert.deepEqual(comparison.failed_count, { current: 70, previous: 30, delta: 40 });
});

test('D-1 comparison falls back to latest available date inside selected range', () => {
  const comparison = buildDayOverDayComparison({
    items: sampleTrend,
    fromDate: '2026-07-08',
    toDate: '2026-07-09',
  });

  assert.equal(comparison.available, true);
  assert.equal(comparison.current_date, '2026-07-08');
  assert.equal(comparison.previous_date, '2026-07-07');
});

test('D-1 comparison reports unavailable when previous calendar day is missing', () => {
  const comparison = buildDayOverDayComparison({
    items: sampleTrend,
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
  });
  const withoutPreviousDay = buildDayOverDayComparison({
    items: sampleTrend.filter((item) => item.date !== '2026-07-14'),
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
  });

  assert.equal(comparison.available, true);
  assert.equal(withoutPreviousDay.available, false);
  assert.equal(withoutPreviousDay.current_date, '2026-07-15');
  assert.equal(withoutPreviousDay.previous_date, '2026-07-14');
});

test('trendline request preserves aggregate and canonical BCVH context for D-1 source data', () => {
  assert.deepEqual(
    buildTrendlineRequestParams({ reportingFromDate: '2026-07-10', reportingToDate: '2026-07-15', latestDate: '2026-07-15', maBcvh: 'all' }),
    { from_date: '2026-07-10', to_date: '2026-07-15' },
  );
  assert.deepEqual(
    buildTrendlineRequestParams({ reportingFromDate: '2026-07-10', reportingToDate: '2026-07-15', latestDate: '2026-07-15', maBcvh: '533140' }),
    { from_date: '2026-07-10', to_date: '2026-07-15', ma_bcvh: '533140' },
  );
});

test('leadership comparison switches between D-1 and D-7 values', () => {
  const d1 = buildLeadershipComparison({
    items: sampleTrend,
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
    comparisonMode: 'd-1',
  });
  const d7 = buildLeadershipComparison({
    items: sampleTrend,
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
    comparisonMode: 'd-7',
  });

  assert.equal(d1.previous_date, '2026-07-14');
  assert.equal(d7.previous_date, '2026-07-08');
  assert.deepEqual(d7.total_volume, { current: 200, previous: 100, delta: 100 });
  assert.deepEqual(d7.pass_rate, { current: 65, previous: 80, delta: -15 });
  assert.deepEqual(d7.failed_count, { current: 70, previous: 20, delta: 50 });
});

test('leadership comparison widgets expose D-1 and D-7 simultaneously', () => {
  const widgets = buildLeadershipComparisonWidgets({
    items: sampleTrend,
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
  });

  assert.deepEqual(widgets.map((item) => item.id), ['d-1', 'd-7']);
  assert.deepEqual(widgets.map((item) => item.title), ['So với hôm qua', 'So với cùng kỳ tuần trước']);
  assert.equal(widgets[0].previous_date, '2026-07-14');
  assert.equal(widgets[1].previous_date, '2026-07-08');
});

test('leadership comparison widget data exposes only pass rate and volume', () => {
  const widgets = buildLeadershipComparisonWidgets({
    items: sampleTrend,
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
  });

  for (const widget of widgets) {
    assert.deepEqual(Object.keys(widget).sort(), [
      'available',
      'comparison_label',
      'current_date',
      'id',
      'pass_rate',
      'previous_date',
      'title',
      'total_volume',
    ]);
    assert.ok(!Object.hasOwn(widget, 'failed_count'));
    assert.ok(!Object.hasOwn(widget, 'failed_rate'));
  }
});

test('D-7 comparison reports unavailable when same weekday previous week is missing', () => {
  const comparison = buildWeekOverWeekComparison({
    items: sampleTrend.filter((item) => item.date !== '2026-07-08'),
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
  });

  assert.equal(comparison.available, false);
  assert.equal(comparison.current_date, '2026-07-15');
  assert.equal(comparison.previous_date, '2026-07-08');
});

test('leadership comparison widgets keep separate missing-data states for D-1 and D-7', () => {
  const widgets = buildLeadershipComparisonWidgets({
    items: sampleTrend.filter((item) => !['2026-07-14', '2026-07-08'].includes(item.date)),
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
  });

  assert.equal(widgets.length, 2);
  assert.equal(widgets[0].available, false);
  assert.equal(widgets[0].previous_date, '2026-07-14');
  assert.equal(widgets[1].available, false);
  assert.equal(widgets[1].previous_date, '2026-07-08');
});

test('leadership comparison widgets use shared contract when both comparisons are available', () => {
  const widgets = buildLeadershipComparisonWidgets({
    items: sampleTrend.filter((item) => item.date === '2026-07-15'),
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
    comparisonContract: {
      current_date: '2026-07-15',
      d1: {
        available: true,
        current_date: '2026-07-15',
        previous_date: '2026-07-14',
        pass_rate: { current: 65, previous: 83.33, delta: -18.33 },
        total_volume: { current: 200, previous: 180, delta: 20 },
      },
      d7: {
        available: true,
        current_date: '2026-07-15',
        previous_date: '2026-07-08',
        pass_rate: { current: 65, previous: 80, delta: -15 },
        total_volume: { current: 200, previous: 100, delta: 100 },
      },
    },
  });

  assert.equal(widgets[0].available, true);
  assert.equal(widgets[0].previous_date, '2026-07-14');
  assert.equal(widgets[0].pass_rate.delta, -18.33);
  assert.equal(widgets[1].available, true);
  assert.equal(widgets[1].previous_date, '2026-07-08');
  assert.equal(widgets[1].pass_rate.delta, -15);
});

test('leadership comparison contract reports D-1 missing without deriving fallback deltas', () => {
  const widgets = buildLeadershipComparisonWidgets({
    comparisonContract: {
      current_date: '2026-07-15',
      d1: { available: false, current_date: '2026-07-15', previous_date: '2026-07-14', pass_rate: null, total_volume: null },
      d7: {
        available: true,
        current_date: '2026-07-15',
        previous_date: '2026-07-08',
        pass_rate: { current: 65, previous: 80, delta: -15 },
        total_volume: { current: 200, previous: 100, delta: 100 },
      },
    },
  });

  assert.equal(widgets[0].available, false);
  assert.equal(widgets[0].pass_rate, null);
  assert.equal(widgets[1].available, true);
});

test('leadership comparison contract reports D-7 missing without deriving fallback deltas', () => {
  const widgets = buildLeadershipComparisonWidgets({
    comparisonContract: {
      current_date: '2026-07-15',
      d1: {
        available: true,
        current_date: '2026-07-15',
        previous_date: '2026-07-14',
        pass_rate: { current: 65, previous: 83.33, delta: -18.33 },
        total_volume: { current: 200, previous: 180, delta: 20 },
      },
      d7: { available: false, current_date: '2026-07-15', previous_date: '2026-07-08', pass_rate: null, total_volume: null },
    },
  });

  assert.equal(widgets[0].available, true);
  assert.equal(widgets[1].available, false);
  assert.equal(widgets[1].total_volume, null);
});

test('leadership comparison contract reports both comparisons missing', () => {
  const widgets = buildLeadershipComparisonWidgets({
    comparisonContract: {
      current_date: '2026-07-15',
      d1: { available: false, current_date: '2026-07-15', previous_date: '2026-07-14', pass_rate: null, total_volume: null },
      d7: { available: false, current_date: '2026-07-15', previous_date: '2026-07-08', pass_rate: null, total_volume: null },
    },
  });

  assert.deepEqual(widgets.map((item) => item.available), [false, false]);
  assert.deepEqual(widgets.map((item) => item.pass_rate), [null, null]);
});

test('summary widgets and BCVH total row share D-1 and D-7 pass-rate deltas', () => {
  const widgets = buildLeadershipComparisonWidgets({
    comparisonContract: {
      current_date: '2026-07-22',
      d1: {
        available: true,
        current_date: '2026-07-22',
        previous_date: '2026-07-21',
        pass_rate: { current: 88.8, previous: 64.4, delta: 24.4 },
        total_volume: { current: 3508, previous: 2581, delta: 927 },
      },
      d7: {
        available: true,
        current_date: '2026-07-22',
        previous_date: '2026-07-15',
        pass_rate: { current: 88.8, previous: 82.9, delta: 5.9 },
        total_volume: { current: 3508, previous: 2200, delta: 1308 },
      },
    },
  });
  const bcvhTotalRow = {
    prior_periods: {
      d1: { delta: 24.4 },
      d7: { delta: 5.9 },
    },
  };

  assert.equal(widgets[0].pass_rate.delta, bcvhTotalRow.prior_periods.d1.delta);
  assert.equal(widgets[1].pass_rate.delta, bcvhTotalRow.prior_periods.d7.delta);
});

test('7-day visible evidence exposes per-day D-7 deltas without tooltip dependency', () => {
  const rows = buildSevenDayVisibleComparisonEvidence(sampleTrend, '2026-07-15');
  const latest = rows.find((item) => item.current_date === '2026-07-15');

  assert.equal(rows.length, 7);
  assert.equal(latest.available, true);
  assert.equal(latest.previous_date, '2026-07-08');
  assert.equal(latest.total_volume_delta, 100);
  assert.equal(latest.pass_rate_delta, -15);
  assert.equal(latest.failed_count_delta, 50);
});

test('integrated workspace source contains visible leadership comparison labels', () => {
  const source = read('./IntegratedTrendRiskWorkspace.jsx');
  const dataSource = read('./integratedTrendRiskData.js');
  const comparisonSource = source.slice(
    source.indexOf('function LeadershipComparisonCard'),
    source.indexOf('function SevenDayComparisonEvidenceTable'),
  );
  assert.match(source, /So sánh điều hành/);
  assert.match(dataSource, /So với hôm qua/);
  assert.match(dataSource, /So với cùng kỳ tuần trước/);
  assert.match(source, /Hôm nay/);
  assert.match(dataSource, /Hôm qua/);
  assert.match(dataSource, /Cùng kỳ tuần trước/);
  assert.match(source, /Bằng chứng so cùng kỳ 7 ngày/);
  assert.doesNotMatch(source, /dataKey="failed_rate"/);
  assert.doesNotMatch(source, /label="Tỷ lệ không đạt, trục phải"/);
  assert.doesNotMatch(source, /DASHBOARD_LABELS\.failedRate/);
  assert.doesNotMatch(comparisonSource, /role="tab"|aria-selected|onModeChange|comparisonMode/);
  assert.doesNotMatch(comparisonSource, /failed_count|failed-rate|Không đạt|Tỷ lệ không đạt/);
});

test('risk panel uses confirmed values and labels unknown causes explicitly', () => {
  const risks = summarizeRiskEvidence(sampleTrend, { total_failed: 1037, failed_rate: 28.2 }, { text: 'Nhịp chất lượng giảm so với kỳ trước.', color: 'yellow' });
  assert.match(risks[0].evidence, /1\.037/);
  assert.match(risks[0].note, /chưa xác định/i);
  assert.ok(!risks.some((risk) => risk.evidence.includes('25%')));
  assert.ok(risks.some((risk) => risk.id === 'quality-pulse'));
});

test('high-risk wording only comes from existing Quality Pulse evidence', () => {
  const risks = summarizeRiskEvidence(sampleTrend, { total_failed: 1037, failed_rate: 28.2 }, { text: 'Nhịp chất lượng giảm mạnh.', color: 'red' });
  assert.equal(risks[0].severity, 'Cần xử lý');
  assert.ok(risks.some((risk) => risk.id === 'quality-pulse' && risk.severity === 'Rủi ro cao'));
});

test('dashboard renders one integrated trend workspace instead of duplicate trend widgets', () => {
  const dashboardSource = read('../DashboardPage.jsx');
  assert.match(dashboardSource, /IntegratedTrendRiskWorkspace/);
  assert.doesNotMatch(dashboardSource, /QualityVolumeComboTrendlineAdapter/);
  assert.doesNotMatch(dashboardSource, /SamePeriodComparisonTrendlineAdapter/);
  assert.doesNotMatch(dashboardSource, /QualityTimelineAdapter/);
});
