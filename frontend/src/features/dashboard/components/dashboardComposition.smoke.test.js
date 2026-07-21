import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Dashboard composition keeps accepted operational surfaces', () => {
  const dashboard = read('../DashboardPage.jsx');
  const adapter = read('./BcvhOperationTableAdapter.jsx');
  const operatingPatterns = read('./OperatingPatternTabsCard.jsx');
  const actionCenter = read('./UnifiedActionCenter.jsx');

  assert.match(dashboard, /<OperatingPatternTabsCard/);
  assert.match(dashboard, /<UnifiedActionCenter/);
  assert.match(adapter, /<UnifiedBcvhAnalysisTable/);
  assert.match(operatingPatterns, /Quy luật vận hành/);
  assert.doesNotMatch(dashboard, /TopListAdapter|Top 2 BCVH/);
  assert.doesNotMatch(actionCenter, /MessageDraft|message_templates/);
});
