import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('dashboard page clears stale KPI payloads before scoped requests resolve', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');
  const summarySource = fs.readFileSync(new URL('./ExecutiveSummaryAdapter.jsx', import.meta.url), 'utf8');
  const dailyBriefSource = fs.readFileSync(new URL('./ExecutiveDailyBriefAdapter.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /data:\s*null/);
  assert.match(dashboardSource, /const kpiRequestSeqRef = useRef\(0\);/);
  assert.match(dashboardSource, /const kpiActiveKeyRef = useRef\(''\);/);
  assert.match(dashboardSource, /const dashboardReady = metadataState\.status === 'success' && range\.ready && !range\.normalized/);
  assert.match(dashboardSource, /if \(!dashboardReady\) \{[\s\S]*?kpiRequestSeqRef\.current \+= 1;/);
  assert.match(dashboardSource, /\}, \[dashboardReady, fromDate, maBcvh, toDate\]\);/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.equal((dashboardSource.match(/api\.get\('\/f13\/dashboard\/kpi'/g) || []).length, 1);
  assert.doesNotMatch(summarySource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.doesNotMatch(dailyBriefSource, /api\.get\('\/f13\/dashboard\/kpi'/);
});

test('dashboard page restores the timeline and executive summary surfaces', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');
  const timelineSource = fs.readFileSync(new URL('../../../components/f13/QualityTimelinePanel.jsx', import.meta.url), 'utf8');
  const summarySource = fs.readFileSync(new URL('./ExecutiveSummaryAdapter.jsx', import.meta.url), 'utf8');
  const executiveSummarySource = fs.readFileSync(new URL('../../../components/f13/ExecutiveSummary.jsx', import.meta.url), 'utf8');
  const dailyBriefSource = fs.readFileSync(new URL('./ExecutiveDailyBriefAdapter.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /IntegratedTrendRiskWorkspace/);
  assert.match(dashboardSource, /BcvhOperationTableAdapter/);
  assert.match(dashboardSource, /UnifiedCommandSummary/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/daily-trend'/);
  assert.equal((dashboardSource.match(/api\.get\('\/f13\/dashboard\/kpi'/g) || []).length, 1);
  assert.doesNotMatch(summarySource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.doesNotMatch(dailyBriefSource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.doesNotMatch(dashboardSource, /ExecutiveSummaryAdapter/);
  assert.doesNotMatch(dashboardSource, /<KPICard/);
  assert.match(timelineSource, /TimelineStateCard/);
  assert.match(timelineSource, /tone="loading"/);
  assert.match(timelineSource, /tone="error"/);
  assert.match(timelineSource, /tone="empty"/);
  assert.doesNotMatch(timelineSource, /return null/);
  assert.match(timelineSource, /Heatmap lịch chất lượng/);
  assert.match(timelineSource, /Quy luật theo thứ/);
  assert.match(timelineSource, /Không có dữ liệu diễn biến chất lượng/);
  assert.doesNotMatch(dashboardSource, /f13_303_rate.*Xếp hạng/s);
  assert.doesNotMatch(executiveSummarySource, /Xếp hạng/i);
  assert.doesNotMatch(executiveSummarySource, /Award/);
});

test('operation dashboard uses one normalized date range for selected-period widgets', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');
  const trendWindowSource = fs.readFileSync(new URL('./qualityTrendlineWindow.js', import.meta.url), 'utf8');
  const compactTableSource = fs.readFileSync(new URL('../../../components/f13/BcvhOperationTable.jsx', import.meta.url), 'utf8');
  const actionCenterSource = fs.readFileSync(new URL('./UnifiedActionCenter.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /resolveDashboardDateRange/);
  assert.match(dashboardSource, /rawFromDate:\s*searchParams\.get\('from_date'\)/);
  assert.match(dashboardSource, /rawToDate:\s*searchParams\.get\('to_date'\)/);
  assert.match(dashboardSource, /params\.set\('from_date',\s*range\.fromDate\)/);
  assert.match(dashboardSource, /params\.set\('to_date',\s*range\.toDate\)/);
  assert.match(dashboardSource, /const showWidgets = dashboardReady/);
  assert.match(dashboardSource, /\{showWidgets \? \(/);
  assert.match(trendWindowSource, /buildTrendlineRequestParams/);
  assert.match(trendWindowSource, /mode === '7-days'/);
  assert.match(trendWindowSource, /mode === 'by-bcvh'/);
  assert.match(trendWindowSource, /trendFromDate[\s\S]*?trendToDate/);
  assert.match(compactTableSource, /fromDate: globalFilter\.dateRange\[0\]/);
  assert.match(compactTableSource, /toDate: globalFilter\.dateRange\[1\]/);
  assert.match(actionCenterSource, /params:\s*\{\s*fromDate,\s*toDate\s*\}/);
});

test('operation dashboard atomically normalizes stale URL state before widget fetches', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /recoverDashboardDateState\(\)/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/meta',\s*\{/);
  assert.match(dashboardSource, /'Cache-Control': 'no-cache'/);
  assert.match(dashboardSource, /if \(range\.ready && range\.normalized\) \{[\s\S]*?params\.set\('from_date', range\.fromDate\);[\s\S]*?params\.set\('to_date', range\.toDate\);/);
  assert.match(dashboardSource, /if \(params\.has\('kpi'\)\) \{[\s\S]*?params\.delete\('kpi'\);/);
  assert.match(dashboardSource, /if \(!isCanonicalBcvhCode\(maBcvh\)\) \{[\s\S]*?params\.set\('ma_bcvh', 'all'\);/);
  assert.equal((dashboardSource.match(/setSearchParams\(params, \{ replace: true \}\);/g) || []).length, 1);
  assert.match(dashboardSource, /if \(!dashboardReady\) \{[\s\S]*?trendRequestSeqRef\.current \+= 1;/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/daily-trend', \{ params, signal: controller\.signal \}\)/);
  assert.match(dashboardSource, /const \[trendMode,\s*setTrendMode\] = useState\('30-days'\);/);
  assert.match(dashboardSource, /const trendActiveKeyRef = useRef\(''\);/);
  assert.match(dashboardSource, /trendActiveKeyRef\.current = requestKey;/);
  assert.match(dashboardSource, /trendActiveKeyRef\.current === requestKey/);
  assert.match(dashboardSource, /mode:\s*trendMode/);
  assert.match(dashboardSource, /\}, \[dashboardReady, fromDate, latestDate, maBcvh, toDate, trendMode\]\);/);
  assert.match(dashboardSource, /mode=\{trendMode\}/);
  assert.match(dashboardSource, /onModeChange=\{setTrendMode\}/);
});

test('dashboard keeps compact BCVH table while ranking keeps redesigned table', () => {
  const dashboardAdapterSource = fs.readFileSync(new URL('./BcvhOperationTableAdapter.jsx', import.meta.url), 'utf8');
  const compactTableSource = fs.readFileSync(new URL('../../../components/f13/BcvhOperationTable.jsx', import.meta.url), 'utf8');
  const rankingTableSource = fs.readFileSync(new URL('./UnifiedBcvhAnalysisTable.jsx', import.meta.url), 'utf8');

  assert.match(dashboardAdapterSource, /useMemo/);
  assert.match(dashboardAdapterSource, /dateRange:\s*\[fromDate,\s*toDate\]/);
  assert.match(dashboardAdapterSource, /<BcvhOperationTable/);
  assert.doesNotMatch(dashboardAdapterSource, /<UnifiedBcvhAnalysisTable/);

  assert.match(compactTableSource, /Bảng điều hành BCVH/);
  assert.match(compactTableSource, /SL PTC\/NT\/CH/);
  assert.doesNotMatch(compactTableSource, /Doughnut|Phân tích BCVH|So sánh D-1|So sánh D-7|Xem chi tiết tuyến/);

  assert.match(rankingTableSource, /AnalysisPanel/);
  assert.match(rankingTableSource, /DoughnutCell/);
  assert.match(rankingTableSource, /So sánh D-1/);
  assert.match(rankingTableSource, /So sánh D-7/);
  assert.match(rankingTableSource, /Xem chi tiết tuyến/);
});
