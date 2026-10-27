import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveAttentionPostmen,
  extractDailyBcvhUnits,
  computePostmanTrendDateRange,
  normalizePostmanTrendDays,
  formatPeriodHeader,
  formatSortCaption,
  getBcvhStripTitle,
  getNextPostmanSort,
  isFullSixBcvhStrip,
  matchesPostmanSearch,
  processPostmanList,
  removeDiacritics,
  sliceUnitsForCapture,
} from './components/f42PostmanTableHelpers.js';

test('removeDiacritics strips accents and normalizes to lower case', () => {
  assert.equal(removeDiacritics('Nguyễn Văn Tuấn'), 'nguyen van tuan');
  assert.equal(removeDiacritics('Đoàn Đình Đạt'), 'doan dinh dat');
  assert.equal(removeDiacritics(''), '');
  assert.equal(removeDiacritics(null), '');
});

test('matchesPostmanSearch matches by postman code and name with or without diacritics', () => {
  const postman = { ma_buu_ta: 'BT533140_01', ten_buu_ta: 'Trần Văn Dũng' };
  assert.equal(matchesPostmanSearch(postman, 'BT533140'), true);
  assert.equal(matchesPostmanSearch(postman, 'Dũng'), true);
  assert.equal(matchesPostmanSearch(postman, 'dung'), true);
  assert.equal(matchesPostmanSearch(postman, 'Tran'), true);
  assert.equal(matchesPostmanSearch(postman, 'Hoàng'), false);
  assert.equal(matchesPostmanSearch(postman, ''), true);
});

test('processPostmanList applies search, belowTargetOnly filter, and sorting', () => {
  const postmen = [
    { ma_buu_ta: 'BT01', ten_buu_ta: 'Nguyễn Văn A', volume: 100, passed: 95, failed: 5, rate: 95.0, rank: 1 },
    { ma_buu_ta: 'BT02', ten_buu_ta: 'Lê Văn B', volume: 80, passed: 68, failed: 12, rate: 85.0, rank: 2 },
    { ma_buu_ta: 'BT03', ten_buu_ta: 'Phạm Văn C', volume: 50, passed: 35, failed: 15, rate: 70.0, rank: 3 },
  ];

  // 1. Search filter
  const searched = processPostmanList(postmen, { search: 'Lê' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].ma_buu_ta, 'BT02');

  // 2. belowTargetOnly filter (targetRate 90)
  const below = processPostmanList(postmen, { belowTargetOnly: true, targetRate: 90 });
  assert.equal(below.length, 2);
  assert.deepEqual(below.map((p) => p.ma_buu_ta), ['BT02', 'BT03']);

  // 3. Sorting by rate ascending
  const sorted = processPostmanList(postmen, { sort: { field: 'rate', direction: 'asc' } });
  assert.deepEqual(sorted.map((p) => p.ma_buu_ta), ['BT03', 'BT02', 'BT01']);

  // 4. Sorting by name A-Z
  const sortedByName = processPostmanList(postmen, { sort: { field: 'ten_buu_ta', direction: 'asc' } });
  assert.deepEqual(sortedByName.map((p) => p.ma_buu_ta), ['BT02', 'BT01', 'BT03']);
});

test('deriveAttentionPostmen sorts postmen under target by failed parcels desc, limits to top 10', () => {
  const units = [
    {
      ma_bcvh: '533140',
      ten_bcvh: 'BCVH Thuận Hóa',
      postmen: [
        { ma_buu_ta: 'BT1', ten_buu_ta: 'Anh A', volume: 100, passed: 95, failed: 5, blank: 2, rate: 95.0, rank: 1 },
        { ma_buu_ta: 'BT2', ten_buu_ta: 'Anh B', volume: 100, passed: 80, failed: 20, blank: 5, rate: 80.0, rank: 2 },
      ],
    },
    {
      ma_bcvh: '536250',
      ten_bcvh: 'BCVH Hương Thủy',
      postmen: [
        { ma_buu_ta: 'BT3', ten_buu_ta: 'Anh C', volume: 150, passed: 100, failed: 50, blank: 10, rate: 66.67, rank: 2 },
        { ma_buu_ta: 'BT4', ten_buu_ta: 'Anh D', volume: 50, passed: 30, failed: 20, blank: 0, rate: 60.0, rank: 1 },
      ],
    },
  ];

  const attention = deriveAttentionPostmen(units, { targetRate: 90, limit: 10 });

  // BT1 is excluded because rate 95 >= 90
  // Remaining: BT3 (failed 50), BT4 (failed 20, rate 60), BT2 (failed 20, rate 80)
  assert.equal(attention.length, 3);
  assert.equal(attention[0].ma_buu_ta, 'BT3');
  assert.equal(attention[0].failed, 50);

  // Tie-breaker on failed (20): BT4 has lower rate (60.0) than BT2 (80.0)
  assert.equal(attention[1].ma_buu_ta, 'BT4');
  assert.equal(attention[2].ma_buu_ta, 'BT2');
});

test('deriveAttentionPostmen handles empty period and postmen with zero volume', () => {
  assert.deepEqual(deriveAttentionPostmen([]), []);
  assert.deepEqual(deriveAttentionPostmen([{ ma_bcvh: '533140', postmen: [] }]), []);

  const withZeroVol = [
    {
      ma_bcvh: '533140',
      postmen: [
        { ma_buu_ta: 'BT0', ten_buu_ta: 'Nghỉ phép', volume: 0, passed: 0, failed: 0, rate: null },
      ],
    },
  ];
  assert.deepEqual(deriveAttentionPostmen(withZeroVol), []);
});

test('deriveAttentionPostmen supports single BCVH scope without total_row or cross-BCVH calculations', () => {
  const units = [
    {
      ma_bcvh: '533140',
      ten_bcvh: 'BCVH Thuận Hóa',
      postmen: [
        { ma_buu_ta: 'BT1', ten_buu_ta: 'Bưu tá Thuận Hóa', volume: 60, passed: 45, failed: 15, blank: 3, rate: 75.0, rank: 1 },
      ],
    },
    {
      ma_bcvh: '536250',
      ten_bcvh: 'BCVH Hương Thủy',
      postmen: [
        { ma_buu_ta: 'BT2', ten_buu_ta: 'Bưu tá Hương Thủy', volume: 80, passed: 50, failed: 30, blank: 5, rate: 62.5, rank: 1 },
      ],
    },
  ];

  // A scoped user restricted to 533140 only gets their postmen
  const scoped = deriveAttentionPostmen(units, { targetRate: 90, maBcvh: '533140' });
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].ma_buu_ta, 'BT1');
  assert.equal(scoped[0].ma_bcvh, '533140');
});

test('formatPeriodHeader formats day, week, month accurately', () => {
  assert.equal(formatPeriodHeader('day', { anchorDate: '2026-10-10' }), 'Ngày 10/10/2026');
  assert.equal(
    formatPeriodHeader('week', { fromDate: '2026-10-08', toDate: '2026-10-14' }),
    'Tuần (08/10 – 14/10/2026)'
  );
  assert.equal(formatPeriodHeader('month', { anchorDate: '2026-10-10' }), 'Tháng 10/2026');
});

test('formatSortCaption formats Vietnamese sort caption without printing raw field names and defaults to Hạng', () => {
  assert.equal(formatSortCaption({ field: 'volume', direction: 'desc' }), 'sắp xếp theo Sản lượng, giảm dần');
  assert.equal(formatSortCaption({ field: 'rate', direction: 'asc' }), 'sắp xếp theo Tỷ lệ, tăng dần');
  assert.equal(formatSortCaption({ field: 'rank', direction: 'asc' }), 'sắp xếp theo Hạng, tăng dần');
  assert.equal(formatSortCaption({ field: 'ma_buu_ta', direction: 'asc' }), 'sắp xếp theo Mã bưu tá, tăng dần');
  assert.equal(formatSortCaption(null), 'sắp xếp theo Hạng');
  assert.equal(formatSortCaption({}), 'sắp xếp theo Hạng');
});

test('getNextPostmanSort starts rank and text fields with asc, numbers with desc, and toggles active column', () => {
  // 1. First click on rank starts asc (rank 1, 2, 3...)
  assert.deepEqual(getNextPostmanSort(null, 'rank'), { field: 'rank', direction: 'asc' });
  // Second click on rank toggles to desc
  assert.deepEqual(getNextPostmanSort({ field: 'rank', direction: 'asc' }, 'rank'), { field: 'rank', direction: 'desc' });

  // 2. Text fields start asc (A-Z)
  assert.deepEqual(getNextPostmanSort(null, 'ten_buu_ta'), { field: 'ten_buu_ta', direction: 'asc' });
  assert.deepEqual(getNextPostmanSort(null, 'ma_buu_ta'), { field: 'ma_buu_ta', direction: 'asc' });

  // 3. Numeric metric fields start desc (highest volume/rate first)
  assert.deepEqual(getNextPostmanSort(null, 'volume'), { field: 'volume', direction: 'desc' });
  assert.deepEqual(getNextPostmanSort(null, 'rate'), { field: 'rate', direction: 'desc' });
  assert.deepEqual(getNextPostmanSort({ field: 'volume', direction: 'desc' }, 'volume'), { field: 'volume', direction: 'asc' });
});

test('sliceUnitsForCapture limits total postmen rows across entire table to <= captureLimit', () => {
  const units = [
    {
      ma_bcvh: '533140',
      filteredPostmen: [
        { ma_buu_ta: 'BT01' },
        { ma_buu_ta: 'BT02' },
        { ma_buu_ta: 'BT03' },
      ],
    },
    {
      ma_bcvh: '536250',
      filteredPostmen: [
        { ma_buu_ta: 'BT04' },
        { ma_buu_ta: 'BT05' },
        { ma_buu_ta: 'BT06' },
      ],
    },
    {
      ma_bcvh: '536000',
      filteredPostmen: [
        { ma_buu_ta: 'BT07' },
      ],
    },
  ];

  // Limit to 4 across whole table: unit 1 gets 3, unit 2 gets 1, unit 3 is omitted
  const sliced = sliceUnitsForCapture(units, 4);
  const total = sliced.reduce((sum, u) => sum + u.filteredPostmen.length, 0);
  assert.equal(total, 4);
  assert.equal(sliced.length, 2);
  assert.equal(sliced[0].filteredPostmen.length, 3);
  assert.equal(sliced[1].filteredPostmen.length, 1);

  // 'all' returns untouched units
  assert.deepEqual(sliceUnitsForCapture(units, 'all'), units);
  assert.deepEqual(sliceUnitsForCapture([]), []);
});

test('sliceUnitsForCapture omits BCVHs with exhausted quota but keeps truly empty BCVHs', () => {
  const units = [
    {
      ma_bcvh: '533140',
      filteredPostmen: [{ ma_buu_ta: 'BT01' }, { ma_buu_ta: 'BT02' }],
    },
    {
      ma_bcvh: '536250',
      filteredPostmen: [], // Truly empty unit (no postmen in period)
    },
    {
      ma_bcvh: '536000',
      filteredPostmen: [{ ma_buu_ta: 'BT03' }],
    },
    {
      ma_bcvh: '537000',
      filteredPostmen: [{ ma_buu_ta: 'BT04' }],
    },
  ];

  // Limit 3:
  // unit 533140 takes 2 (remaining: 1)
  // unit 536250 has 0 postmen -> kept to display "BCVH này không có phát sinh...", remaining still 1
  // unit 536000 takes 1 (remaining: 0)
  // unit 537000 quota exhausted -> omitted from capture entirely so it doesn't falsely show empty notice
  const sliced = sliceUnitsForCapture(units, 3);
  assert.equal(sliced.length, 3);
  assert.equal(sliced[0].ma_bcvh, '533140');
  assert.equal(sliced[0].filteredPostmen.length, 2);
  assert.equal(sliced[1].ma_bcvh, '536250');
  assert.equal(sliced[1].filteredPostmen.length, 0);
  assert.equal(sliced[2].ma_bcvh, '536000');
  assert.equal(sliced[2].filteredPostmen.length, 1);
  assert.equal(sliced.some((u) => u.ma_bcvh === '537000'), false);
});

test('isFullSixBcvhStrip and getBcvhStripTitle distinguish 6 BCVHs vs 1-5 BCVHs', () => {
  const sixUnits = [
    { ma_bcvh: '533140' },
    { ma_bcvh: '536250' },
    { ma_bcvh: '536000' },
    { ma_bcvh: '537000' },
    { ma_bcvh: '538000' },
    { ma_bcvh: '539000' },
  ];
  const fourUnits = sixUnits.slice(0, 4);

  // isFullSixBcvhStrip
  assert.equal(isFullSixBcvhStrip(sixUnits), true);
  assert.equal(isFullSixBcvhStrip(fourUnits), false);
  assert.equal(isFullSixBcvhStrip([]), false);
  assert.equal(isFullSixBcvhStrip(null), false);

  // getBcvhStripTitle
  assert.equal(getBcvhStripTitle(sixUnits, '27/10/2026'), '6 BCVH hôm nay – Ngày 27/10/2026');
  assert.equal(getBcvhStripTitle(sixUnits), '6 BCVH hôm nay');
  assert.equal(getBcvhStripTitle(fourUnits, '27/10/2026'), 'BCVH hôm nay – Ngày 27/10/2026');
  assert.equal(getBcvhStripTitle(fourUnits), 'BCVH hôm nay');
  assert.equal(getBcvhStripTitle([]), 'BCVH hôm nay');
});

test('extractDailyBcvhUnits extracts only rows returned by backend and does not synthesize missing canonical units', () => {
  const dailyRows = [
    { ma_bcvh: '533140', volume: 100, passed: 92, failed: 8, rate: 92.0 },
  ];

  const extracted = extractDailyBcvhUnits(dailyRows);
  // Only 1 unit returned, NOT 6!
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].ma_bcvh, '533140');
  assert.equal(extracted[0].ten_bcvh, 'BCVH Thuận Hóa');
  assert.equal(extracted[0].rate, 92.0);

  // Empty rows returns empty array
  assert.deepEqual(extractDailyBcvhUnits([]), []);
  assert.deepEqual(extractDailyBcvhUnits(null), []);
});

test('computePostmanTrendDateRange calculates accurate ISO date ranges ending on anchorDate', () => {
  // 30 days default: 2026-10-27 minus 29 days = 2026-09-28
  const r30 = computePostmanTrendDateRange('2026-10-27', 30);
  assert.equal(r30.toDate, '2026-10-27');
  assert.equal(r30.fromDate, '2026-09-28');

  // 7 days: 2026-10-27 minus 6 days = 2026-10-21
  const r7 = computePostmanTrendDateRange('2026-10-27', 7);
  assert.equal(r7.toDate, '2026-10-27');
  assert.equal(r7.fromDate, '2026-10-21');

  // 14 days: 2026-10-27 minus 13 days = 2026-10-14
  const r14 = computePostmanTrendDateRange('2026-10-27', 14);
  assert.equal(r14.toDate, '2026-10-27');
  assert.equal(r14.fromDate, '2026-10-14');

  // 90 days: 2026-10-27 minus 89 days = 2026-07-30
  const r90 = computePostmanTrendDateRange('2026-10-27', 90);
  assert.equal(r90.toDate, '2026-10-27');
  assert.equal(r90.fromDate, '2026-07-30');

  // Month boundary across leap/non-leap years (e.g., 2024 leap year Feb 29)
  const leap = computePostmanTrendDateRange('2024-03-01', 2);
  assert.equal(leap.toDate, '2024-03-01');
  assert.equal(leap.fromDate, '2024-02-29');
});

test('normalizePostmanTrendDays leaves missing days as null (not 0, not connected), formats labels, and sorts', () => {
  const rawDays = [
    { date: '2026-10-27', data_available: true, volume: 50, passed: 48, failed: 2, blank: 0, rate: 96.0 },
    { date: '2026-10-25', data_available: true, volume: 40, passed: 32, failed: 8, blank: 2, rate: 80.0 },
    // Missing day: no parcels delivered
    { date: '2026-10-26', data_available: false, volume: 0, passed: 0, failed: 0, blank: 0, rate: null },
  ];

  const normalized = normalizePostmanTrendDays(rawDays);

  // 1. Sorted chronologically
  assert.deepEqual(normalized.map((d) => d.date), ['2026-10-25', '2026-10-26', '2026-10-27']);

  // 2. Labels formatted DD/MM
  assert.equal(normalized[0].label, '25/10');
  assert.equal(normalized[1].label, '26/10');
  assert.equal(normalized[2].label, '27/10');

  // 3. Critical requirement: missing day has rate = null (not 0!)
  assert.equal(normalized[0].rate, 80.0);
  assert.equal(normalized[0].data_available, true);

  assert.equal(normalized[1].rate, null, 'Date without parcels must have rate: null so chart creates an empty gap');
  assert.equal(normalized[1].data_available, false);
  assert.notEqual(normalized[1].rate, 0, 'Must NOT be 0%');

  assert.equal(normalized[2].rate, 96.0);
  assert.equal(normalized[2].data_available, true);

  // 4. Empty / null input handling
  assert.deepEqual(normalizePostmanTrendDays([]), []);
  assert.deepEqual(normalizePostmanTrendDays(null), []);
});

