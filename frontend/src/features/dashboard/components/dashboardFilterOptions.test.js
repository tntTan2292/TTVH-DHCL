import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildBcvhOptions } from './dashboardFilterOptions.js';
import { buildTrendlineRequestParams } from './qualityTrendlineWindow.js';

const canonicalBcvhUnits = [
  { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' },
  { ma_bcvh: '536250', ten_bcvh: 'BCVH Hương Thủy' },
  { ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà' },
  { ma_bcvh: '537220', ten_bcvh: 'BCVH Phú Lộc' },
  { ma_bcvh: '537015', ten_bcvh: 'BCVH Thuận An' },
  { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' },
];

test('dashboard BCVH options expose exactly six SSOT units plus all', () => {
  const options = buildBcvhOptions(canonicalBcvhUnits);

  assert.equal(options.length, 7);
  assert.deepEqual(options[0], { value: 'all', label: 'Tất cả BCVH' });
  assert.deepEqual(options.slice(1).map((option) => option.value), [
    '535790',
    '536250',
    '535470',
    '537220',
    '537015',
    '533140',
  ]);
});

test('all six canonical BCVH values generate ma_bcvh without changing rolling range', () => {
  for (const unit of canonicalBcvhUnits) {
    const params = buildTrendlineRequestParams({
      reportingToDate: '2026-07-15',
      latestDate: '2026-07-15',
      maBcvh: unit.ma_bcvh,
    });

    assert.deepEqual(params, {
      from_date: '2026-06-16',
      to_date: '2026-07-15',
      ma_bcvh: unit.ma_bcvh,
    });
  }
});

test('operation dashboard hides status filter while shared filter keeps default capability', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');
  const sharedLayoutSource = fs.readFileSync(new URL('../../../components/shared/SharedLayout.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /showKpiFilter=\{false\}/);
  assert.match(sharedLayoutSource, /showKpiFilter = true/);
  assert.doesNotMatch(dashboardSource, /updateParam\('kpi'/);
});

test('combo trendline uses one daily request and keeps stable card states', () => {
  const source = fs.readFileSync(new URL('./QualityVolumeComboTrendlineAdapter.jsx', import.meta.url), 'utf8');

  assert.equal((source.match(/dashboard\/daily-trend/g) || []).length, 1);
  assert.match(source, /function ComboTrendlineCard/);
  assert.match(source, /<ComboTrendlineCard>\s*<LoadingState/s);
  assert.match(source, /<ComboTrendlineCard>\s*<EmptyState/s);
  assert.match(source, /<ComboTrendlineCard>\s*<ErrorState/s);
});
