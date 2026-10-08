import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { F13_INDICATOR, F41_INDICATOR } from '../indicator/indicatorConfig.js';
import { mapBcvhRankingResponse } from '../dashboard/components/unifiedBcvhAnalysisTableData.js';

test('T4: F41DashboardPage wraps DashboardPage in IndicatorProvider with F41_INDICATOR', () => {
  const source = fs.readFileSync(new URL('./F41DashboardPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import DashboardPage from '\.\.\/dashboard\/DashboardPage'/);
  assert.match(source, /IndicatorProvider indicator=\{F41_INDICATOR\}/);
  assert.match(source, /<DashboardPage \/>/);
});

test('T5: F41BcvhRankingPage wraps BcvhRankingPage in IndicatorProvider with F41_INDICATOR', () => {
  const source = fs.readFileSync(new URL('./F41BcvhRankingPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import BcvhRankingPage from '\.\.\/ranking\/BcvhRankingPage'/);
  assert.match(source, /IndicatorProvider indicator=\{F41_INDICATOR\}/);
  assert.match(source, /<BcvhRankingPage \/>/);
});

test('App.jsx registers f41/dashboard and f41/ranking/bcvh for admin and viewer and /f41 redirects to the dashboard (T6)', () => {
  const appSource = fs.readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
  assert.match(appSource, /import F41DashboardPage from '\.\/features\/f41\/F41DashboardPage'/);
  assert.match(appSource, /import F41BcvhRankingPage from '\.\/features\/f41\/F41BcvhRankingPage'/);

  // The old placeholder route now redirects (F41-DASHBOARD-RANKING-01 T6)
  assert.match(appSource, /<Route path="f41" element=\{<Navigate to="\/f41\/dashboard" replace \/>\} \/>/);

  // New F4.1 routes registered for admin and viewer
  assert.match(appSource, /<Route path="f41\/dashboard" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><F41DashboardPage \/><\/ProtectedRoute>\} \/>/);
  assert.match(appSource, /<Route path="f41\/ranking\/bcvh" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><F41BcvhRankingPage \/><\/ProtectedRoute>\} \/>/);
});

test('T8-F41-NB1: Shared report blocks avoid hardcoded KPI 2026 and use indicator-aware labels', () => {
  const bcvhOpTableSource = fs.readFileSync(new URL('../../components/f13/BcvhOperationTable.jsx', import.meta.url), 'utf8');
  assert.match(bcvhOpTableSource, /indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}`/);
  assert.doesNotMatch(bcvhOpTableSource, />\s*Tỷ lệ đạt KPI 2026\s*</);

  const weeklyComparisonSource = fs.readFileSync(new URL('../ranking/BcvhWeeklyComparisonBlock.jsx', import.meta.url), 'utf8');
  assert.match(weeklyComparisonSource, /renderSortableTh\('current_rate',\s*indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}`/);
  assert.match(weeklyComparisonSource, /renderSortableTh\('compare_rate',\s*indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}`/);

  const weeklyTrendSource = fs.readFileSync(new URL('../ranking/BcvhWeeklyTrendBlock.jsx', import.meta.url), 'utf8');
  assert.match(weeklyTrendSource, /Sản lượng đo kiểm \(cột\) và \{indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}`\} \(đường\)/);
  assert.match(weeklyTrendSource, /\{indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}`\} \(%\), trục phải/);

  const rankingOverviewSource = fs.readFileSync(new URL('../ranking/BcvhRankingOverviewBlocks.jsx', import.meta.url), 'utf8');
  assert.match(rankingOverviewSource, /Sản lượng đo kiểm \(cột\) và \{indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}`\} \(đường\)/);
  assert.match(rankingOverviewSource, /\{indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}`\} \(%\), trục phải/);

  const weeklyComboChartSource = fs.readFileSync(new URL('../ranking/BcvhWeeklyComboTrendChart.jsx', import.meta.url), 'utf8');
  assert.match(weeklyComboChartSource, /indicator\.id === 'f13' \? 'Mục tiêu KPI 2026:' : `Mục tiêu \$\{indicator\.moduleLabel\}:`/);
  assert.match(weeklyComboChartSource, /indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI:' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}:`/);

  const monthlyComboChartSource = fs.readFileSync(new URL('../ranking/BcvhMonthlyComboTrendChart.jsx', import.meta.url), 'utf8');
  assert.match(monthlyComboChartSource, /indicator\.id === 'f13' \? 'Mục tiêu KPI 2026:' : `Mục tiêu \$\{indicator\.moduleLabel\}:`/);
  assert.match(monthlyComboChartSource, /name=\{indicator\.id === 'f13' \? 'Tỷ lệ đạt KPI 2026' : `Tỷ lệ đạt \$\{indicator\.moduleLabel\}`\}/);
});

test('T8-F41-NB2: Expanded-row analysis text for F4.1 strips late-cash and route wording and disables route action', () => {
  const samplePayload = {
    data: [
      {
        ma_bcvh: '533140',
        ten_bcvh: 'BCVH Thuận Hóa',
        rank: 1,
        total_bg: 1000,
        dat_kpi_2026: 850,
        total_failed: 150,
        kpi_2026: 85.0,
        kpi_2026_dod: 1.5,
        kpi_2026_swc: -0.5,
        delayed_cash_handover_count: null,
        f13_303_rate: null,
        route_distribution: null,
        comparisons: {
          d1: { volume: 950, kpi_2026: 83.5, kpi_2026_dod: 1.5, comparison_rank: 2, rank_movement: { direction: 'up', delta: 1, signal: { label: 'Tăng 1 bậc' } } },
          d7: { volume: 1050, kpi_2026: 85.5, kpi_2026_swc: -0.5, comparison_rank: 1, rank_movement: { direction: 'same', delta: 0, signal: { label: 'Giữ hạng' } } },
        },
      },
    ],
  };

  // 1. When mapped under F4.1:
  const f41Mapped = mapBcvhRankingResponse(samplePayload, {
    fromDate: '2026-08-01',
    toDate: '2026-08-01',
    indicator: F41_INDICATOR,
  });
  const f41Row = f41Mapped.rows[0];
  assert.ok(f41Row.analysis, 'analysis text exists');
  assert.match(f41Row.analysis, /Tỷ lệ F4\.1 ngày 85,0%/);
  assert.match(f41Row.analysis, /D-1 \+1,50 điểm %/);
  assert.match(f41Row.analysis, /D-7 -0,50 điểm %/);
  // Must NOT leak late-cash or route text:
  assert.doesNotMatch(f41Row.analysis, /Chậm nộp tiền/);
  assert.doesNotMatch(f41Row.analysis, /Tuyến tham gia/);
  // Route action must be null:
  assert.equal(f41Row.action, null);

  // 2. When mapped under F1.3 (or default):
  const f13Mapped = mapBcvhRankingResponse(samplePayload, {
    fromDate: '2026-08-01',
    toDate: '2026-08-01',
    indicator: F13_INDICATOR,
  });
  const f13Row = f13Mapped.rows[0];
  assert.ok(f13Row.analysis, 'analysis text exists');
  assert.match(f13Row.analysis, /KPI ngày 85,0%/);
  assert.match(f13Row.analysis, /Chậm nộp tiền/);
  assert.match(f13Row.analysis, /Tuyến tham gia/);
  assert.deepEqual(f13Row.action, {
    route: '/f13/ranking/route',
    params: {
      from_date: '2026-08-01',
      to_date: '2026-08-01',
      interval: 'daily',
      bcvh_id: '533140',
      bcvh_name: 'BCVH Thuận Hóa',
    },
  });
});

test('BcvhRankingPage gates "Xem chi tiết tuyến" badge with features.routes', () => {
  const rankingPageSource = fs.readFileSync(new URL('../ranking/BcvhRankingPage.jsx', import.meta.url), 'utf8');
  assert.match(rankingPageSource, /\{features\.routes \? <StatusBadge label="Xem chi tiết tuyến" tone="info" \/> : null\}/);
});
