import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildBcvhOptions,
  CANONICAL_BCVH_CODES,
  isCanonicalBcvhCode,
  validateBcvhUnits,
} from './dashboardFilterOptions.js';
import { mapDashboardKpiToCards } from './dashboardKpiCards.js';
import { buildTrendlineRequestParams } from './qualityTrendlineWindow.js';

const canonicalBcvhUnits = [
  { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' },
  { ma_bcvh: '536250', ten_bcvh: 'BCVH Hương Thủy' },
  { ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà' },
  { ma_bcvh: '537220', ten_bcvh: 'BCVH Phú Lộc' },
  { ma_bcvh: '537015', ten_bcvh: 'BCVH Thuận An' },
  { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' },
];

test('dashboard BCVH options expose exactly six canonical units plus all', () => {
  const options = buildBcvhOptions(canonicalBcvhUnits);

  assert.equal(CANONICAL_BCVH_CODES.length, 6);
  assert.equal(options.length, 7);
  assert.deepEqual(options[0], { value: 'all', label: 'Tất cả BCVH' });
  assert.deepEqual(options.slice(1).map((option) => option.value), CANONICAL_BCVH_CODES);
});

test('malformed or empty metadata does not silently produce a one-option filter', () => {
  assert.equal(validateBcvhUnits([]).ok, false);
  assert.deepEqual(buildBcvhOptions([]), []);
  assert.equal(validateBcvhUnits(canonicalBcvhUnits.slice(0, 5)).ok, false);
  assert.deepEqual(buildBcvhOptions(canonicalBcvhUnits.slice(0, 5)), []);
  assert.equal(validateBcvhUnits([...canonicalBcvhUnits, canonicalBcvhUnits[0]]).ok, false);
});

test('only canonical values remain selectable and preserved as ma_bcvh', () => {
  assert.equal(isCanonicalBcvhCode('all'), true);
  for (const unit of canonicalBcvhUnits) {
    assert.equal(isCanonicalBcvhCode(unit.ma_bcvh), true);
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
  assert.equal(isCanonicalBcvhCode('BC_HUE01'), false);
});

test('operation dashboard hides status filter and shows metadata error controls', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');
  const sharedLayoutSource = fs.readFileSync(new URL('../../../components/shared/SharedLayout.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /showKpiFilter=\{false\}/);
  assert.match(sharedLayoutSource, /showKpiFilter = true/);
  assert.match(sharedLayoutSource, /disabled=\{bcvhDisabled\}/);
  assert.match(dashboardSource, /Không thể tải danh sách BCVH/);
  assert.match(dashboardSource, /Thử lại/);
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

test('dashboard KPI mapping converts runtime values without placeholder strings', () => {
  const cards = mapDashboardKpiToCards({
    total_bg: 100,
    passed_rate: 80,
    failed_rate: 20,
    f13_303_rate: 1.5,
  });

  assert.deepEqual(cards.map((card) => card.label), ['KPI', 'Đạt', 'Không đạt', 'Tỷ lệ Không đạt']);
  assert.deepEqual(cards.map((card) => card.value), ['80.00%', '80', '20', '20.00%']);
  assert.ok(cards.every((card) => card.value !== '--'));
  assert.doesNotMatch(JSON.stringify(cards), /f13_303_rate/);
  assert.doesNotMatch(JSON.stringify(cards), /Xếp hạng/);
});

test('dashboard page restores the timeline and ranking surfaces', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');
  const timelineSource = fs.readFileSync(new URL('../../../components/f13/QualityTimelinePanel.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /QualityTimelineAdapter/);
  assert.match(dashboardSource, /BcvhOperationTableAdapter/);
  assert.match(dashboardSource, /mapDashboardKpiToCards/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.match(timelineSource, /TimelineStateCard/);
  assert.match(timelineSource, /tone="loading"/);
  assert.match(timelineSource, /tone="error"/);
  assert.match(timelineSource, /tone="empty"/);
  assert.doesNotMatch(timelineSource, /return null/);
  assert.match(timelineSource, /Heatmap Lịch Chất Lượng/);
  assert.match(timelineSource, /Quy luật Tuần/);
  assert.match(timelineSource, /Không có dữ liệu timeline/);
  assert.doesNotMatch(dashboardSource, /f13_303_rate.*Xếp hạng/s);
});
