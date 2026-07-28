import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('dashboard initial load keeps one metadata gate and five surface requests', () => {
  const dashboardSource = read('../DashboardPage.jsx');
  const bcvhSource = read('./UnifiedBcvhAnalysisTable.jsx');
  const operatingSource = read('./OperatingPatternTabsCard.jsx');
  const actionSource = read('./UnifiedActionCenter.jsx');

  const requests = [
    ...dashboardSource.matchAll(/api\.get\('([^']+)'/g),
    ...bcvhSource.matchAll(/api\.get\('([^']+)'/g),
    ...operatingSource.matchAll(/api\.get\('([^']+)'/g),
    ...actionSource.matchAll(/api\.get\('([^']+)'/g),
  ].map((match) => match[1]);

  assert.deepEqual(requests.sort(), [
    '/f13/dashboard/daily-trend',
    '/f13/dashboard/kpi',
    '/f13/dashboard/meta',
    '/f13/dashboard/quality-timeline',
    '/f13/ranking/bcvh',
    '/f13/recommendations',
  ].sort());
  assert.equal(requests.length, 6);
  assert.equal((dashboardSource.match(/dashboardReady/g) || []).length > 0, true);
});

test('operating patterns lazy-loads inactive tabs through compatible timeline mode', () => {
  const componentSource = read('./OperatingPatternTabsCard.jsx');
  const controllerSource = read('../../../../../backend/src/controllers/DashboardController.js');
  const serviceSource = read('../../../../../backend/src/services/timelineService.js');

  assert.match(componentSource, /mode:\s*activeTab/);
  assert.match(componentSource, /\[activeTab, maBcvh, toDate\]/);
  assert.match(controllerSource, /const \{ toDate, ma_bcvh, mode, include_national_rank \} = req\.query/);
  assert.match(controllerSource, /getQualityTimeline\(toDate, ma_bcvh, \{/);
  assert.match(serviceSource, /_normalizeTimelineMode/);
  assert.match(serviceSource, /const includeDaily = mode === 'all'/);
  assert.match(serviceSource, /const includeWeekly = mode === 'all' \|\| mode === 'weekday'/);
  assert.match(serviceSource, /const includeMonthly = mode === 'all' \|\| mode === 'month'/);
  assert.match(serviceSource, /const includeHeatmap = mode === 'all' \|\| mode === 'heatmap'/);
});

test('nationwide rank enrichment keeps initial request count unchanged and uses lazy Heatmap opt-in', () => {
  const dashboardSource = read('../DashboardPage.jsx');
  const operatingSource = read('./OperatingPatternTabsCard.jsx');
  const controllerSource = read('../../../../../backend/src/controllers/DashboardController.js');

  assert.equal((dashboardSource.match(/\/f13\/dashboard\/daily-trend/g) || []).length, 1);
  assert.equal((operatingSource.match(/\/f13\/dashboard\/quality-timeline/g) || []).length, 1);
  assert.match(operatingSource, /include_national_rank: activeTab === 'heatmap' && maBcvh === 'all' \? '1' : undefined/);
  assert.match(controllerSource, /includeNationalRank: include_national_rank === '1' \|\| include_national_rank === 'true'/);
});

test('Heatmap renders same national rank detail for hover and focus without inline badge', () => {
  const operatingSource = read('./OperatingPatternTabsCard.jsx');
  const mapperSource = read('./operatingPatternTabsData.js');

  assert.match(mapperSource, /Xếp hạng toàn quốc: Hạng/);
  assert.match(operatingSource, /title=\{getDayTitle\(day\)\}/);
  assert.match(operatingSource, /aria-label=\{getDayTitle\(day\) \|\| undefined\}/);
  assert.match(operatingSource, /group-hover:block group-focus:block/);
  assert.doesNotMatch(operatingSource, /#\{day\.nationalRank|nationalRankLabel\}<\/span>/);
});

test('nationwide rank is not added to BCVH row ranking surfaces', () => {
  const bcvhTableSource = read('./UnifiedBcvhAnalysisTable.jsx');
  const bcvhDataSource = read('./unifiedBcvhAnalysisTableData.js');

  assert.doesNotMatch(bcvhTableSource, /national_rank|nationalRank|Xếp hạng toàn quốc Huế/);
  assert.doesNotMatch(bcvhDataSource, /national_rank|nationalRank|Xếp hạng toàn quốc Huế/);
});
