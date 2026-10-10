import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { F11_INDICATOR, F13_INDICATOR, F41_INDICATOR, INDICATOR_THEMES, indicatorTheme } from './indicatorConfig.js';

// docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md: the functions every report block must have.
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

const REPORT_BLOCKS = [
  '../../components/f13/BcvhOperationTable.jsx',
  '../dashboard/components/UnifiedBcvhAnalysisTable.jsx',
  '../dashboard/components/UnifiedCommandSummary.jsx',
  '../dashboard/components/IntegratedTrendRiskWorkspace.jsx',
  '../ranking/BcvhRankingOverviewBlocks.jsx',
  '../ranking/BcvhWeeklyComparisonBlock.jsx',
  '../f11/components/F11PairTableBlock.jsx',
];
const TABLES = [
  '../../components/f13/BcvhOperationTable.jsx',
  '../dashboard/components/UnifiedBcvhAnalysisTable.jsx',
  '../ranking/BcvhRankingOverviewBlocks.jsx',
  '../f11/components/F11PairTableBlock.jsx',
];
const THEMED = [...REPORT_BLOCKS, '../ranking/BcvhMonthlyComboTrendChart.jsx', '../ranking/BcvhWeeklyComboTrendChart.jsx', '../ranking/BcvhWeeklyTrendBlock.jsx', '../dashboard/DashboardPage.jsx', '../ranking/BcvhRankingPage.jsx'];

test('standard 1: every report block has the camera button', () => {
  for (const path of REPORT_BLOCKS) assert.match(read(path), /BlockCaptureButton/, path);
});

test('standard 2/3: every report table orders its rows from the column titles (BcvhWeeklyComparisonBlock has its own sortable titles)', () => {
  for (const path of TABLES) assert.match(read(path), /SortableTh/, path);
  assert.match(read('../ranking/BcvhWeeklyComparisonBlock.jsx'), /renderSortableTh\('current_rate'/);
  assert.match(read('../f11/components/F11PairTableBlock.jsx'), /Cột bưu cục phát/);
});

test('standard 5: report components read the indicator theme and carry no fixed dark blue', () => {
  for (const path of THEMED) {
    const source = read(path);
    assert.match(source, /indicatorTheme/, path);
    assert.doesNotMatch(source, /#003E7E/i, path);
  }
});

test('standard 5: three light families, none purple or dark; the page shows its family', () => {
  assert.equal(F13_INDICATOR.theme, INDICATOR_THEMES.blue);
  assert.equal(F41_INDICATOR.theme, INDICATOR_THEMES.orange);
  assert.equal(F11_INDICATOR.theme, INDICATOR_THEMES.green);
  assert.equal(new Set([F13_INDICATOR.theme.primary, F41_INDICATOR.theme.primary, F11_INDICATOR.theme.primary]).size, 3);
  for (const theme of Object.values(INDICATOR_THEMES)) {
    assert.doesNotMatch(JSON.stringify(theme), /purple|violet|indigo|fuchsia|slate-900|gray-900|zinc-900|black/i);
    for (const key of ['accentBar', 'chip', 'soft', 'headerBg', 'headerText', 'headerBorder', 'header2Bg', 'header2Text', 'sortActive', 'button', 'ring', 'text']) {
      assert.ok(typeof theme[key] === 'string' && theme[key].length > 0, `${theme.id}.${key}`);
    }
    // every class is written out in full so Tailwind generates it (no template building)
    assert.doesNotMatch(JSON.stringify(theme), /\$\{/);
  }
  assert.equal(indicatorTheme(), INDICATOR_THEMES.blue);
  assert.equal(indicatorTheme({ id: 'x' }), INDICATOR_THEMES.blue);
  const dashboard = read('../dashboard/DashboardPage.jsx');
  const ranking = read('../ranking/BcvhRankingPage.jsx');
  for (const source of [dashboard, ranking]) {
    assert.match(source, /accentClassName=\{indicatorTheme\(indicator\)\.accentBar\}/);
    assert.match(source, /badge=\{/);
  }
});

test('standard 6: the operations table follows the dashboard date filter', () => {
  assert.match(read('../../components/f13/BcvhOperationTable.jsx'), /anchor_date: effectiveAnchor/);
});

test('the standard document exists and lists the ten functions', () => {
  const doc = fs.readFileSync(new URL('../../../../docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md', import.meta.url), 'utf8');
  for (const label of ['Camera button', 'Click-to-order column titles', 'Ordering of units shown side by side', 'Target line per indicator', 'Colour family per indicator', 'Follow the date filter']) {
    assert.ok(doc.includes(label), label);
  }
});
