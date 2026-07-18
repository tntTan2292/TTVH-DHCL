import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildIntegratedTrendRows,
  getFailedRate,
  summarizeRiskEvidence,
  TREND_MODES,
} from './integratedTrendRiskData.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

const sampleTrend = [
  { date: '2026-07-08', total_volume: 100, passed: 80, failed: 20, quality_rate: 80, data_available: true },
  { date: '2026-07-09', total_volume: 0, passed: 0, failed: 0, quality_rate: null, data_available: false },
  { date: '2026-07-15', total_volume: 200, passed: 130, failed: 70, quality_rate: 65, data_available: true },
];

test('integrated trend exposes the three approved modes', () => {
  assert.deepEqual(TREND_MODES.map((mode) => mode.label), ['30 ngày', '7 ngày so sánh', 'Theo BCVH']);
});

test('failed rate and risk markers are derived from existing trend values', () => {
  assert.equal(getFailedRate(sampleTrend[0]), 20);
  assert.equal(getFailedRate(sampleTrend[1]), null);

  const rows = buildIntegratedTrendRows({ mode: '30-days', items: sampleTrend, toDate: '2026-07-15' });
  assert.equal(rows[0].below_target, true);
  assert.equal(rows[0].abnormal_day, false);
  assert.equal(rows[2].failed_rate, 35);
  assert.equal(rows[2].abnormal_day, true);
});

test('7-day mode preserves current and comparison periods without changing API contract', () => {
  const rows = buildIntegratedTrendRows({ mode: '7-days', items: sampleTrend, toDate: '2026-07-15' });
  assert.equal(rows.length, 7);
  assert.equal(rows[6].current_date, '2026-07-15');
  assert.equal(rows[6].previous_date, '2026-07-08');
  assert.equal(rows[6].previous_quality_rate, 80);
});

test('risk panel uses confirmed values and labels unknown causes explicitly', () => {
  const risks = summarizeRiskEvidence(sampleTrend, { total_failed: 1037, failed_rate: 28.2 }, { text: 'Nhịp chất lượng giảm so với kỳ trước.', color: 'yellow' });
  assert.match(risks[0].evidence, /1\.037/);
  assert.match(risks[0].note, /chưa xác định/i);
  assert.ok(risks.some((risk) => risk.id === 'abnormal-failed-rate'));
  assert.ok(risks.some((risk) => risk.id === 'quality-pulse'));
});

test('dashboard renders one integrated trend workspace instead of duplicate trend widgets', () => {
  const dashboardSource = read('../DashboardPage.jsx');
  assert.match(dashboardSource, /IntegratedTrendRiskWorkspace/);
  assert.doesNotMatch(dashboardSource, /QualityVolumeComboTrendlineAdapter/);
  assert.doesNotMatch(dashboardSource, /SamePeriodComparisonTrendlineAdapter/);
  assert.doesNotMatch(dashboardSource, /QualityTimelineAdapter/);
});
