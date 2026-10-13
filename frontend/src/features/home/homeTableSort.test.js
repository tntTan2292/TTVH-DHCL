import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRankMovement,
  formatGap,
  sortNationalRanking,
  filterProvincesByMode,
  sortLowestUnits,
  RANKING_TEXT_FIELDS,
} from './homeTableSort.js';

test('formatRankMovement formats positive, negative, zero and null correctly', () => {
  assert.equal(formatRankMovement(3), '+3');
  assert.equal(formatRankMovement(-2), '-2');
  assert.equal(formatRankMovement(0), '—');
  assert.equal(formatRankMovement(null), '—');
  assert.equal(formatRankMovement(undefined), '—');
});

test('formatGap formats positive, negative, zero and null correctly', () => {
  assert.equal(formatGap(2.5), '+2.5%');
  assert.equal(formatGap(-1.2), '-1.2%');
  assert.equal(formatGap(0), '0.0%');
  assert.equal(formatGap(null), '—');
  assert.equal(formatGap(undefined), '—');
});

test('sortNationalRanking sorts numeric columns numerically and respects direction', () => {
  const items = [
    { rank: 2, ten_tinh: 'Đà Nẵng', rate: 92.5, volume: 1000 },
    { rank: 1, ten_tinh: 'Hà Nội', rate: 95.0, volume: 5000 },
    { rank: 3, ten_tinh: 'Huế', rate: 89.1, volume: 2000 },
  ];

  const sortedByRankAsc = sortNationalRanking(items, { field: 'rank', direction: 'asc' });
  assert.equal(sortedByRankAsc[0].rank, 1);
  assert.equal(sortedByRankAsc[1].rank, 2);
  assert.equal(sortedByRankAsc[2].rank, 3);

  const sortedByRateDesc = sortNationalRanking(items, { field: 'rate', direction: 'desc' });
  assert.equal(sortedByRateDesc[0].rate, 95.0);
  assert.equal(sortedByRateDesc[2].rate, 89.1);
});

test('sortNationalRanking sorts Vietnamese text columns with locale collation', () => {
  const items = [
    { rank: 1, ten_tinh: 'Hà Nội' },
    { rank: 2, ten_tinh: 'An Giang' },
    { rank: 3, ten_tinh: 'Bình Định' },
  ];
  const sortedTextAsc = sortNationalRanking(items, { field: 'ten_tinh', direction: 'asc' });
  assert.equal(sortedTextAsc[0].ten_tinh, 'An Giang');
  assert.equal(sortedTextAsc[1].ten_tinh, 'Bình Định');
  assert.equal(sortedTextAsc[2].ten_tinh, 'Hà Nội');
});

test('filterProvincesByMode returns all provinces when mode is all', () => {
  const items = Array.from({ length: 34 }, (_, i) => ({
    rank: i + 1,
    ma_tinh: `T${i + 1}`,
    is_hue: i === 15,
  }));

  const all = filterProvincesByMode(items, 'all');
  assert.equal(all.length, 34);
});

test('filterProvincesByMode returns top 3, neighbours around Hue, and bottom 3 in hue_focus mode', () => {
  const items = Array.from({ length: 34 }, (_, i) => ({
    rank: i + 1,
    ma_tinh: `T${i + 1}`,
    is_hue: i === 15, // rank 16 (0-indexed 15)
  }));

  const focused = filterProvincesByMode(items, 'hue_focus');
  // Top 3 (ranks 1, 2, 3), Hue neighbours (ranks 14, 15, 16, 17, 18), Bottom 3 (ranks 32, 33, 34)
  assert.ok(focused.length <= 11);
  assert.ok(focused.some((p) => p.is_hue));
  assert.ok(focused.some((p) => p.rank === 1));
  assert.ok(focused.some((p) => p.rank === 34));
});

test('sortLowestUnits sorts lowest units correctly by rate', () => {
  const units = [
    { ma_bcvh: 'B1', rate: 75.0, failed: 20 },
    { ma_bcvh: 'B2', rate: 60.5, failed: 50 },
    { ma_bcvh: 'B3', rate: 82.0, failed: 10 },
  ];
  const sortedAsc = sortLowestUnits(units, { field: 'rate', direction: 'asc' });
  assert.equal(sortedAsc[0].ma_bcvh, 'B2');
  assert.equal(sortedAsc[2].ma_bcvh, 'B3');
});
