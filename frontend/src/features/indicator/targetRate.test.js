import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_TARGET_RATE,
  F11_INDICATOR,
  F13_INDICATOR,
  F41_INDICATOR,
  indicatorTargetRate,
} from './indicatorConfig.js';
import { normalizeComboTrendlineItems, QUALITY_TARGET_RATE } from '../dashboard/components/comboTrendlineData.js';
import {
  buildIntegratedTrendRows,
  buildSevenDayComparisonRows,
  summarizeRiskEvidence,
  withTrendSemantics,
} from '../dashboard/components/integratedTrendRiskData.js';
import { getMonthlyTrendSeriesData } from '../ranking/bcvhOverviewData.js';
import { getWeeklyTrendSeriesData } from '../ranking/bcvhWeeklyComparisonData.js';

// PO decision 2026-10-10: the chart target line is 95 % for F1.1; F1.3 and F4.1 keep 90 %.
test('target rate per indicator: F1.3 and F4.1 90, F1.1 95; unknown indicators fall back to 90', () => {
  assert.equal(DEFAULT_TARGET_RATE, 90);
  assert.equal(QUALITY_TARGET_RATE, 90);
  assert.equal(F13_INDICATOR.targetRate, 90);
  assert.equal(F41_INDICATOR.targetRate, 90);
  assert.equal(F11_INDICATOR.targetRate, 95);
  assert.equal(indicatorTargetRate(F11_INDICATOR), 95);
  assert.equal(indicatorTargetRate(F13_INDICATOR), 90);
  assert.equal(indicatorTargetRate(F41_INDICATOR), 90);
  assert.equal(indicatorTargetRate(), 90);
  assert.equal(indicatorTargetRate({ id: 'x' }), 90);
});

test('daily trend rows: target and variance follow the given target; the default stays 90', () => {
  const items = [{ date: '2026-10-07', data_available: true, total_volume: 100, passed: 92, failed: 8, quality_rate: 92 }];
  assert.deepEqual([normalizeComboTrendlineItems(items)[0].target_rate, normalizeComboTrendlineItems(items)[0].target_variance], [90, 2]);
  const f11 = normalizeComboTrendlineItems(items, 95)[0];
  assert.deepEqual([f11.target_rate, f11.target_variance], [95, -3]);
});

test('below-target flags and risk text follow the indicator target (92 % is on target at 90, below at 95)', () => {
  const point = { data_available: true, total_volume: 100, failed: 8, quality_rate: 92 };
  assert.equal(withTrendSemantics(point).below_target, false);
  assert.equal(withTrendSemantics(point, 95).below_target, true);
  assert.equal(withTrendSemantics(point, 95).target_rate, 95);
  assert.equal(buildIntegratedTrendRows({ mode: '30-days', items: [point] })[0].target_rate, 90);
  assert.equal(buildIntegratedTrendRows({ mode: '30-days', items: [point], targetRate: 95 })[0].target_rate, 95);
  assert.equal(buildSevenDayComparisonRows([], '2026-10-07', 95).length, 7);
  const risks = summarizeRiskEvidence([{ ...point, date: '2026-10-07' }], null, null, 95);
  assert.match(risks.find((risk) => risk.id === 'below-target-days').evidence, /mục tiêu 95%/);
});

test('weekly and monthly chart series carry the indicator target', () => {
  const weekly = [{ week_id: 'W1', label: 'Tuần 1', total: { volume: 100, passed: 92, failed: 8, rate: 92 }, units: {} }];
  assert.deepEqual([getWeeklyTrendSeriesData(weekly)[0].target_rate, getWeeklyTrendSeriesData(weekly)[0].target_variance], [90, 2]);
  assert.deepEqual([getWeeklyTrendSeriesData(weekly, 'TOTAL', 95)[0].target_rate, getWeeklyTrendSeriesData(weekly, 'TOTAL', 95)[0].target_variance], [95, -3]);

  const monthly = [{ month: '2026-10', label: 'T10', isCurrentMonth: true, total: { total_volume: 100, passed: 92, failed: 8, quality_rate: 92, target_rate: 90, target_variance: 2 }, units: {} }];
  assert.deepEqual([getMonthlyTrendSeriesData(monthly)[0].target_rate, getMonthlyTrendSeriesData(monthly)[0].target_variance], [90, 2]);
  assert.deepEqual([getMonthlyTrendSeriesData(monthly, 'total', 95)[0].target_rate, getMonthlyTrendSeriesData(monthly, 'total', 95)[0].target_variance], [95, -3]);
  const empty = [{ month: '2026-09', label: 'T9', total: { total_volume: null, quality_rate: null, target_rate: 90, target_variance: null }, units: {} }];
  assert.equal(getMonthlyTrendSeriesData(empty, 'total', 95)[0].target_variance, null);
});

test('live charts and blocks read the target from the indicator instead of a fixed 90', () => {
  const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  for (const path of [
    '../dashboard/components/IntegratedTrendRiskWorkspace.jsx',
    '../ranking/BcvhMonthlyComboTrendChart.jsx',
    '../ranking/BcvhWeeklyComboTrendChart.jsx',
    '../ranking/BcvhRankingOverviewBlocks.jsx',
    '../ranking/BcvhWeeklyTrendBlock.jsx',
  ]) {
    const source = read(path);
    assert.match(source, /indicatorTargetRate/, path);
    assert.doesNotMatch(source, /Mục tiêu 90%/, path);
    assert.doesNotMatch(source, /QUALITY_TARGET_RATE/, path);
  }
  assert.match(read('../dashboard/DashboardPage.jsx'), /normalizeComboTrendlineItems\(response\.data\?\.data\?\.items \|\| \[\], indicatorTargetRate\(indicator\)\)/);
  // each file that calls the helper must also import it (a missing import compiles but fails at run time)
  for (const path of ['../dashboard/DashboardPage.jsx', '../dashboard/components/IntegratedTrendRiskWorkspace.jsx', '../ranking/BcvhMonthlyComboTrendChart.jsx', '../ranking/BcvhWeeklyComboTrendChart.jsx', '../ranking/BcvhRankingOverviewBlocks.jsx', '../ranking/BcvhWeeklyTrendBlock.jsx']) {
    assert.match(read(path), /import \{[^}]*indicatorTargetRate[^}]*\} from '[^']*indicatorConfig\.js'/, path);
  }
});
