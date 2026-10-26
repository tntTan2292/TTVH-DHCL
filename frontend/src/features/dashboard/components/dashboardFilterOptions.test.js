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
      reportingFromDate: '2026-07-10',
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
  assert.match(sharedLayoutSource, /showKpiFilter = false/);
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
    total_failed: 20,
    passed_rate: 80,
    failed_rate: 20,
    f13_303_rate: 1.5,
    national_rank: {
      available: true,
      rank: 14,
      total: 34,
      period: '2026-06-28',
      metric_label: 'Tỷ lệ PTC/nộp tiền đúng QĐ theo chỉ tiêu 2026',
    },
  });

  assert.deepEqual(cards.map((card) => card.label), ['Tỷ lệ đạt', 'Xếp hạng toàn quốc', 'Sản lượng', 'Bưu gửi cần xử lý']);
  assert.deepEqual(cards.map((card) => card.value), ['80.00%', '14/34', '100', '20']);
  assert.ok(cards.every((card) => card.value !== '--'));
  assert.match(cards[3].support, /Số bưu gửi không đạt cần xử lý/);
  assert.doesNotMatch(JSON.stringify(cards), /f13_303_rate/);
});

test('dashboard page renders current command, trend, action, and BCVH surfaces', () => {
  const dashboardSource = fs.readFileSync(new URL('../DashboardPage.jsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /IntegratedTrendRiskWorkspace/);
  assert.match(dashboardSource, /BcvhOperationTableAdapter/);
  assert.match(dashboardSource, /UnifiedActionCenter/);
  assert.match(dashboardSource, /UnifiedCommandSummary/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/kpi'/);
  assert.match(dashboardSource, /api\.get\('\/f13\/dashboard\/daily-trend'/);
  assert.equal((dashboardSource.match(/api\.get\('\/f13\/dashboard\/kpi'/g) || []).length, 1);
  assert.doesNotMatch(dashboardSource, /RuleRecommendationAdapter/);
  assert.doesNotMatch(dashboardSource, /ExecutiveDailyBriefAdapter/);
  assert.doesNotMatch(dashboardSource, /MessageGenerationAdapter/);
  assert.doesNotMatch(dashboardSource, /TopListAdapter/);
  assert.doesNotMatch(dashboardSource, /f13_303_rate.*Xếp hạng/s);
});

test('buildBcvhOptions with allowedCodes filters units and omits allOption', () => {
  const options = buildBcvhOptions(canonicalBcvhUnits, { allowedCodes: ['533140', '535470'] });
  assert.equal(options.length, 2);
  assert.deepEqual(options, [
    { value: '535470', label: 'BCVH Hương Trà' },
    { value: '533140', label: 'BCVH Thuận Hóa' },
  ]);
  assert.ok(!options.some((opt) => opt.value === 'all'));
});


test('a user limited to some BCVH gets a short unit list from the backend and it is valid (RBAC-01)', () => {
  const own = [{ ma_bcvh: '535470', ten_bcvh: 'BCVH Hương Trà' }];
  assert.equal(validateBcvhUnits(own).ok, false, 'without a scope the strict six-unit rule still applies');
  assert.equal(validateBcvhUnits(own, { allowedCodes: ['535470'] }).ok, true);
  assert.deepEqual(buildBcvhOptions(own, { allowedCodes: ['535470'] }), [{ value: '535470', label: 'BCVH Hương Trà' }]);

  const two = [{ ma_bcvh: '537220', ten_bcvh: 'BCVH Phú Lộc' }, { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' }];
  assert.equal(validateBcvhUnits(two, { allowedCodes: ['537220', '535790'] }).ok, true);
  assert.equal(buildBcvhOptions(two, { allowedCodes: ['537220', '535790'] }).length, 2);

  assert.equal(validateBcvhUnits([], { allowedCodes: ['535470'] }).ok, false);
  assert.equal(validateBcvhUnits(own, { allowedCodes: ['535470', '537015'] }).ok, false, 'an allowed unit that is missing is an error');
  assert.equal(validateBcvhUnits([{ ma_bcvh: '999999', ten_bcvh: 'X' }], { allowedCodes: ['999999'] }).ok, false, 'only canonical codes');
});
