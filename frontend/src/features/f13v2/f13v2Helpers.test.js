import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBlockVisible,
  isDateRange,
  buildRangeCompareModel,
  formatVolume,
  formatRate,
  formatRateDelta,
  formatVolumeDelta,
  getNestedValue,
  sortDaySummaryRows,
  classifyRateTone,
  classifyDeltaTone,
  resolveTargetPageParams,
  findPrecedingOption,
  buildScopedUnitOptions,
  HEADER_VOLUME,
  HEADER_COMPARE_N1,
  HEADER_COMPARE_N7,
  NOTE_N_DAY,
  rateHeader,
} from './f13v2Helpers.js';

test('isDateRange: only two different days make a range', () => {
  assert.equal(isDateRange('2026-11-01', '2026-11-15'), true);
  assert.equal(isDateRange('2026-11-01', '2026-11-01'), false);
  assert.equal(isDateRange('', '2026-11-01'), false);
  assert.equal(isDateRange(null, null), false);
});

test('buildRangeCompareModel: same-period columns, best rate first, missing values last, total apart', () => {
  const compare = (volume, rate, rate_delta) => ({ same_period: { volume, rate, rate_delta, volume_delta: 0 } });
  const data = {
    rows: [
      { ma_bcvh: 'A', ten_bcvh: 'BCVH A', volume: 10, rate: 50, compare: compare(20, 40, 10) },
      { ma_bcvh: 'B', ten_bcvh: 'BCVH B', volume: 30, rate: 90, compare: compare(null, null, null) },
    ],
    meta: {
      total_row: { ten_bcvh: 'TỔNG CỘNG', volume: 40, rate: 80, compare: compare(20, 40, 40) },
      compare: { same_period: { from_date: '2026-10-01', to_date: '2026-10-15' } },
    },
  };
  const model = buildRangeCompareModel(data);
  assert.deepEqual(model.rows.map((r) => [r.stt, r.ma_bcvh]), [[1, 'B'], [2, 'A']]);
  assert.equal(model.rows[1].same_period_rate, 40);
  assert.equal(model.rows[1].same_period_delta, 10);
  assert.equal(model.totalRow.same_period_volume, 20);
  assert.deepEqual(model.samePeriod, { from_date: '2026-10-01', to_date: '2026-10-15' });

  const byDelta = buildRangeCompareModel(data, { field: 'same_period_delta', direction: 'asc' });
  assert.deepEqual(byDelta.rows.map((r) => r.ma_bcvh), ['A', 'B']); // no value goes last in either direction
  const byDeltaDesc = buildRangeCompareModel(data, { field: 'same_period_delta', direction: 'desc' });
  assert.deepEqual(byDeltaDesc.rows.map((r) => r.ma_bcvh), ['A', 'B']);

  assert.equal(buildRangeCompareModel({ rows: [], meta: {} }).totalRow, null); // a BCVH-mode account has no total
  assert.deepEqual(buildRangeCompareModel(null).rows, []);
});

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

test('sortDaySummaryRows orders numeric and string columns with canonical units and sends nulls to the end', () => {
  const rows = [
    { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', rate: 91.2, rank: 2, compare: { n1: { rate_delta: -0.5 } } },
    { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới', rate: 94.0, rank: 1, compare: { n1: { rate_delta: 1.2 } } },
    { ma_bcvh: '536250', ten_bcvh: 'BCVH Hương Thủy', rate: 88.0, rank: 3, compare: { n1: { rate_delta: null } } },
  ];

  // Sort by rate desc
  const sortedRateDesc = sortDaySummaryRows(rows, 'rate', 'desc');
  assert.deepEqual(sortedRateDesc.map((r) => r.ma_bcvh), ['535790', '533140', '536250']);

  // Sort by ten_bcvh asc
  const sortedNameAsc = sortDaySummaryRows(rows, 'ten_bcvh', 'asc');
  assert.deepEqual(sortedNameAsc.map((r) => r.ten_bcvh), ['BCVH A Lưới', 'BCVH Hương Thủy', 'BCVH Thuận Hóa']);

  // Sort by nested field compare.n1.rate_delta desc: missing values go last!
  const sortedDeltaDesc = sortDaySummaryRows(rows, 'compare.n1.rate_delta', 'desc');
  assert.deepEqual(sortedDeltaDesc.map((r) => r.ma_bcvh), ['535790', '533140', '536250']);

  // Sort by nested field compare.n1.rate_delta asc: missing values STILL go last!
  const sortedDeltaAsc = sortDaySummaryRows(rows, 'compare.n1.rate_delta', 'asc');
  assert.deepEqual(sortedDeltaAsc.map((r) => r.ma_bcvh), ['533140', '535790', '536250']);
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

test('resolveTargetPageParams preserves bcvh and drops cross-period params per PO rule', () => {
  const currentParams = new URLSearchParams('from=2026-07-10&to=2026-07-15&bcvh=533140');

  const toWeek = resolveTargetPageParams({
    currentPage: 'ngay',
    targetPage: 'tuan',
    currentParams,
  });
  assert.equal(toWeek.path, '/f13/v2/tuan');
  assert.equal(toWeek.search, '?bcvh=533140');

  const toMonth = resolveTargetPageParams({
    currentPage: 'ngay',
    targetPage: 'thang',
    currentParams,
  });
  assert.equal(toMonth.path, '/f13/v2/thang');
  assert.equal(toMonth.search, '?bcvh=533140');

  const toDayFromWeek = resolveTargetPageParams({
    currentPage: 'tuan',
    targetPage: 'ngay',
    currentParams: new URLSearchParams('week=2026-W29&bcvh=all'),
  });
  assert.equal(toDayFromWeek.path, '/f13/v2/ngay');
  assert.equal(toDayFromWeek.search, ''); // 'all' is not set in query
});

test('findPrecedingOption identifies the immediately preceding period', () => {
  const options = [
    { value: '2026-W38', label: 'Tuần 38' },
    { value: '2026-W37', label: 'Tuần 37' },
    { value: '2026-W36', label: 'Tuần 36' },
  ];

  // For W38, preceding is W37
  assert.equal(findPrecedingOption(options, '2026-W38')?.value, '2026-W37');
  // For W37, preceding is W36
  assert.equal(findPrecedingOption(options, '2026-W37')?.value, '2026-W36');
  // For oldest W36, falls back to itself
  assert.equal(findPrecedingOption(options, '2026-W36')?.value, '2026-W36');
  // If not found in list, falls back to options[1] (or options[0])
  assert.equal(findPrecedingOption(options, '2026-W99')?.value, '2026-W37');
});

test('buildScopedUnitOptions respects layout scope contract', () => {
  const metaUnits = [
    { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' },
    { ma_bcvh: '536250', ten_bcvh: 'BCVH Hương Thủy' },
    { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' },
  ];

  // Scoped layout: allow_all = false, bcvh = ['533140']
  const scopedLayout = { units: { allow_all: false, bcvh: ['533140'] } };
  const scopedOptions = buildScopedUnitOptions({ layout: scopedLayout, metaUnits });
  assert.equal(scopedOptions.length, 1);
  assert.equal(scopedOptions[0].value, '533140');
  assert.equal(scopedOptions[0].ten_bcvh, 'BCVH Thuận Hóa');

  // Full layout: allow_all = true
  const fullLayout = { units: { allow_all: true, bcvh: [] } };
  const fullOptions = buildScopedUnitOptions({ layout: fullLayout, metaUnits });
  assert.equal(fullOptions.length, 3);

  // Failed layout (null): must NOT default to allow_all!
  const failedOptions = buildScopedUnitOptions({ layout: null, metaUnits });
  assert.equal(failedOptions.length, 0);
});
