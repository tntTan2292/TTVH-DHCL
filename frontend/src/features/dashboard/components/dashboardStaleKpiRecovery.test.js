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

test('legacy dashboard adapters preserve stable filter identity between equivalent renders', () => {
  const qualityTimelineAdapterSource = fs.readFileSync(new URL('./QualityTimelineAdapter.jsx', import.meta.url), 'utf8');
  const messageGenerationAdapterSource = fs.readFileSync(new URL('./MessageGenerationAdapter.jsx', import.meta.url), 'utf8');
  const ruleRecommendationAdapterSource = fs.readFileSync(new URL('./RuleRecommendationAdapter.jsx', import.meta.url), 'utf8');
  const bcvhOperationTableAdapterSource = fs.readFileSync(new URL('./BcvhOperationTableAdapter.jsx', import.meta.url), 'utf8');

  [
    qualityTimelineAdapterSource,
    messageGenerationAdapterSource,
    ruleRecommendationAdapterSource,
    bcvhOperationTableAdapterSource,
  ].forEach((source) => {
    assert.match(source, /useMemo/);
    assert.match(source, /dateRange:\s*\[fromDate,\s*toDate\]/);
  });

  assert.match(qualityTimelineAdapterSource, /\[fromDate,\s*interval,\s*maBcvh,\s*toDate\]/);
  assert.match(messageGenerationAdapterSource, /\[fromDate,\s*toDate\]/);
  assert.match(ruleRecommendationAdapterSource, /\[fromDate,\s*interval,\s*maBcvh,\s*toDate\]/);
  assert.match(bcvhOperationTableAdapterSource, /\[fromDate,\s*interval,\s*maBcvh,\s*toDate\]/);
});
