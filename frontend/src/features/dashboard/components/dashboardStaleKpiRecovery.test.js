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
