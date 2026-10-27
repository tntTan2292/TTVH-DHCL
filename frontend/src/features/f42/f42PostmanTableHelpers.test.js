import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveAttentionPostmen,
  formatPeriodHeader,
  matchesPostmanSearch,
  processPostmanList,
  removeDiacritics,
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
