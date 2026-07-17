import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('dashboard page clears stale KPI payloads before scoped requests resolve', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');
  const summarySource = fs.readFileSync(new URL('./ExecutiveSummaryAdapter.jsx', import.meta.url), 'utf8');
  const dailyBriefSource = fs.readFileSync(new URL('./ExecutiveDailyBriefAdapter.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /data:\s*null,\s*\n\s*cards:\s*mapDashboardKpiToCards\(\{\}\),/);
  assert.match(dashboardSource, /const kpiRequestSeqRef = useRef\(0\);/);
  assert.match(dashboardSource, /const kpiActiveKeyRef = useRef\(''\);/);
  assert.match(dashboardSource, /useEffect\(\(\) => \{\n\s+if \(!fromDate \|\| !toDate\) return undefined;/);
  assert.match(dashboardSource, /\}, \[fromDate, maBcvh, toDate\]\);/);
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

  assert.match(dashboardSource, /QualityTimelineAdapter/);
  assert.match(dashboardSource, /BcvhOperationTableAdapter/);
  assert.match(dashboardSource, /mapDashboardKpiToCards/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/daily-trend'/);
  assert.equal((dashboardSource.match(/api\.get\('\/f13\/dashboard\/kpi'/g) || []).length, 1);
  assert.doesNotMatch(summarySource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.doesNotMatch(dailyBriefSource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.match(timelineSource, /TimelineStateCard/);
  assert.match(timelineSource, /tone="loading"/);
  assert.match(timelineSource, /tone="error"/);
  assert.match(timelineSource, /tone="empty"/);
  assert.doesNotMatch(timelineSource, /return null/);
  assert.match(timelineSource, /Heatmap Lịch Chất Lượng/);
  assert.match(timelineSource, /Quy luật Tuần/);
  assert.match(timelineSource, /Không có dữ liệu timeline/);
  assert.doesNotMatch(dashboardSource, /f13_303_rate.*Xáº¿p háº¡ng/s);
  assert.doesNotMatch(executiveSummarySource, /Xáº¿p háº¡ng/i);
  assert.doesNotMatch(executiveSummarySource, /Award/);
});
