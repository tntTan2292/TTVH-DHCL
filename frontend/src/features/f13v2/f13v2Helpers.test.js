import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBlockVisible,
  formatVolume,
  formatRate,
  formatRateDelta,
  formatVolumeDelta,
  getNestedValue,
  sortDaySummaryRows,
  classifyRateTone,
  classifyDeltaTone,
  resolveTargetPageParams,
  HEADER_VOLUME,
  HEADER_COMPARE_N1,
  HEADER_COMPARE_N7,
  NOTE_N_DAY,
  rateHeader,
} from './f13v2Helpers.js';

test('columnHeaders integration: standard vocabulary for F1.3 report tables', () => {
  assert.equal(HEADER_VOLUME, 'Sản lượng');
  assert.equal(HEADER_COMPARE_N1, 'So sánh (N-1)');
  assert.equal(HEADER_COMPARE_N7, 'So sánh (N-7)');
  assert.equal(NOTE_N_DAY, 'N: ngày đo kiểm.');
  assert.equal(rateHeader({ id: 'f13' }), 'Tỷ lệ (2026)');
  assert.equal(rateHeader({ id: 'f41' }), 'Tỷ lệ');
});

test('isBlockVisible correctly filters blocks per page according to layout contract', () => {
  const layout = {
    pages: [
      {
        id: 'ngay',
        blocks: [
          { id: 'day.overview', title: 'Tổng quan điều hành' },
          { id: 'day.table', title: 'Bảng BCVH theo ngày' },
        ],
      },
      {
        id: 'tuan',
        blocks: [
          { id: 'week.compare', title: 'So sánh BCVH theo tuần' },
        ],
      },
    ],
  };

  assert.equal(isBlockVisible(layout, 'ngay', 'day.overview'), true);
  assert.equal(isBlockVisible(layout, 'ngay', 'day.table'), true);
  assert.equal(isBlockVisible(layout, 'ngay', 'day.actions'), false); // not in layout
  assert.equal(isBlockVisible(layout, 'tuan', 'week.compare'), true);
  assert.equal(isBlockVisible(layout, 'tuan', 'day.overview'), false);
  assert.equal(isBlockVisible(null, 'ngay', 'day.overview'), false);
});

test('formatVolume, formatRate, formatRateDelta, formatVolumeDelta format numbers deterministically', () => {
  assert.equal(formatVolume(12345), '12.345');
  assert.equal(formatVolume(0), '0');
  assert.equal(formatVolume(null), '—');

  assert.equal(formatRate(89.54), '89.5%');
  assert.equal(formatRate(null), '—');

  assert.equal(formatRateDelta(1.5), '+1.5%');
  assert.equal(formatRateDelta(-2.3), '-2.3%');
  assert.equal(formatRateDelta(0), '0.0%');
  assert.equal(formatRateDelta(null), null);

  assert.equal(formatVolumeDelta(500), '+500');
  assert.equal(formatVolumeDelta(-300), '-300');
  assert.equal(formatVolumeDelta(null), null);
});

test('getNestedValue reads deep properties safely', () => {
  const sample = {
    ma_bcvh: '533140',
    compare: {
      n1: { rate_delta: 2.5 },
      n7: null,
    },
  };

  assert.equal(getNestedValue(sample, 'ma_bcvh'), '533140');
  assert.equal(getNestedValue(sample, 'compare.n1.rate_delta'), 2.5);
  assert.equal(getNestedValue(sample, 'compare.n7.rate_delta'), undefined);
  assert.equal(getNestedValue(sample, 'nonexistent.field'), undefined);
  assert.equal(getNestedValue(null, 'ma_bcvh'), undefined);
});

test('sortDaySummaryRows orders numeric and string columns and sends nulls to the end', () => {
  const rows = [
    { ma_bcvh: '533140', ten_bcvh: 'BCVH Hương Thủy', rate: 91.2, rank: 2, compare: { n1: { rate_delta: -0.5 } } },
    { ma_bcvh: '530000', ten_bcvh: 'BCVH Huế', rate: 94.0, rank: 1, compare: { n1: { rate_delta: 1.2 } } },
    { ma_bcvh: '532800', ten_bcvh: 'BCVH Phong Điền', rate: 88.0, rank: 3, compare: { n1: { rate_delta: null } } },
  ];

  // Sort by rate desc
  const sortedRateDesc = sortDaySummaryRows(rows, 'rate', 'desc');
  assert.deepEqual(sortedRateDesc.map((r) => r.ma_bcvh), ['530000', '533140', '532800']);

  // Sort by ten_bcvh asc
  const sortedNameAsc = sortDaySummaryRows(rows, 'ten_bcvh', 'asc');
  assert.deepEqual(sortedNameAsc.map((r) => r.ten_bcvh), ['BCVH Huế', 'BCVH Hương Thủy', 'BCVH Phong Điền']);

  // Sort by nested field compare.n1.rate_delta desc: missing values go last!
  const sortedDeltaDesc = sortDaySummaryRows(rows, 'compare.n1.rate_delta', 'desc');
  assert.deepEqual(sortedDeltaDesc.map((r) => r.ma_bcvh), ['530000', '533140', '532800']);

  // Sort by nested field compare.n1.rate_delta asc: missing values STILL go last!
  const sortedDeltaAsc = sortDaySummaryRows(rows, 'compare.n1.rate_delta', 'asc');
  assert.deepEqual(sortedDeltaAsc.map((r) => r.ma_bcvh), ['533140', '530000', '532800']);
});

test('classifyRateTone and classifyDeltaTone assign semantic tones', () => {
  assert.equal(classifyRateTone(92), 'success');
  assert.equal(classifyRateTone(87), 'warning');
  assert.equal(classifyRateTone(75), 'danger');
  assert.equal(classifyRateTone(null), 'neutral');

  assert.equal(classifyDeltaTone(1.2), 'success');
  assert.equal(classifyDeltaTone(-0.8), 'danger');
  assert.equal(classifyDeltaTone(0), 'neutral');
  assert.equal(classifyDeltaTone(null), 'neutral');
});

test('resolveTargetPageParams preserves bcvh and maps resolved anchors correctly', () => {
  const currentParams = new URLSearchParams('from=2026-07-10&to=2026-07-15&bcvh=533140');
  const resolveData = {
    day: '2026-07-15',
    week: { week_id: '2026-W29' },
    month: { month_id: '2026-07' },
  };

  const toWeek = resolveTargetPageParams({
    currentPage: 'ngay',
    targetPage: 'tuan',
    currentParams,
    resolveData,
  });
  assert.equal(toWeek.path, '/f13/v2/tuan');
  assert.match(toWeek.search, /bcvh=533140/);
  assert.match(toWeek.search, /week=2026-W29/);

  const toMonth = resolveTargetPageParams({
    currentPage: 'ngay',
    targetPage: 'thang',
    currentParams,
    resolveData,
  });
  assert.equal(toMonth.path, '/f13/v2/thang');
  assert.match(toMonth.search, /bcvh=533140/);
  assert.match(toMonth.search, /month=2026-07/);

  const toDay = resolveTargetPageParams({
    currentPage: 'tuan',
    targetPage: 'ngay',
    currentParams: new URLSearchParams('week=2026-W29&bcvh=all'),
    resolveData,
  });
  assert.equal(toDay.path, '/f13/v2/ngay');
  assert.match(toDay.search, /from=2026-07-15/);
  assert.match(toDay.search, /to=2026-07-15/);
  assert.equal(toDay.search.includes('bcvh='), false); // 'all' is dropped from query for cleanliness
});
