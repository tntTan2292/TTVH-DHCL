import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRankMovement,
  formatRateChange,
  formatGap,
  computeTrendYDomain,
  sortNationalRanking,
  filterProvincesByMode,
  sortLowestUnits,
  INDICATOR_FULL_NAMES,
} from './homeTableSort.js';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../components/f13/f13HeatmapBandCatalog.js';
import {
  F11_INDICATOR,
  F12_INDICATOR,
  F13_INDICATOR,
  F41_INDICATOR,
} from '../indicator/indicatorConfig.js';

test('Defect 1: INDICATOR_FULL_NAMES matches the exact official system names', () => {
  assert.equal(INDICATOR_FULL_NAMES.f11, 'Toàn trình nội tỉnh');
  assert.equal(INDICATOR_FULL_NAMES.f12, 'Thu gom liên tỉnh');
  assert.equal(INDICATOR_FULL_NAMES.f13, 'Phát liên tỉnh');
  assert.equal(INDICATOR_FULL_NAMES.f41, 'Phát thành công bưu cục');
});

test('Defect 4: formatRankMovement distinguishes null (missing data = "—") from real 0 ("0")', () => {
  assert.equal(formatRankMovement(3), '+3');
  assert.equal(formatRankMovement(-2), '-2');
  assert.equal(formatRankMovement(0), '0'); // real 0 means no change, not missing
  assert.equal(formatRankMovement(null), '—');
  assert.equal(formatRankMovement(undefined), '—');
});

test('Defect 4: formatRateChange distinguishes null (missing data = "—") from real 0.0 ("0.0%")', () => {
  assert.equal(formatRateChange(1.5), '+1.5%');
  assert.equal(formatRateChange(-0.8), '-0.8%');
  assert.equal(formatRateChange(0), '0.0%');
  assert.equal(formatRateChange(null), '—');
  assert.equal(formatRateChange(undefined), '—');
});

test('Defect 2: computeTrendYDomain never clips low data points (e.g. F4.1 22.2%, F1.1 38.1%, F1.3 39.3%)', () => {
  // Low real data point from F4.1: 22.2%
  const domainF41 = computeTrendYDomain([{ rate: 22.2 }, { rate: 65.0 }], 90);
  assert.equal(domainF41[1], 100);
  assert.ok(domainF41[0] <= 20, `Floor ${domainF41[0]} must be <= 20 to avoid clipping 22.2%`);

  // Low real data point from F1.1: 38.1%
  const domainF11 = computeTrendYDomain([{ rate: 38.1 }, { rate: 80.0 }], 95);
  assert.equal(domainF11[1], 100);
  assert.ok(domainF11[0] <= 30, `Floor ${domainF11[0]} must be <= 30 to avoid clipping 38.1%`);

  // Extremely low data point (5%)
  const domainExtreme = computeTrendYDomain([{ rate: 5.0 }], 90);
  assert.equal(domainExtreme[0], 0);
  assert.equal(domainExtreme[1], 100);

  // Normal high data points: sensible non-zero floor
  const domainNormal = computeTrendYDomain([{ rate: 85.0 }, { rate: 92.5 }], 90);
  assert.equal(domainNormal[1], 100);
  assert.ok(domainNormal[0] >= 70 && domainNormal[0] <= 80);
});

test('Defect 3: Rate colours use shared catalogue with indicator-specific bands (F1.x: 70/60/50, F4.1: 80/70/60)', () => {
  // F1.1, F1.2, F1.3 bands: 70 / 60 / 50
  for (const ind of [F11_INDICATOR, F12_INDICATOR, F13_INDICATOR]) {
    assert.equal(classifyF13HeatmapRate(75.0, ind.heatmapBands).tone, 'band-green');
    assert.equal(classifyF13HeatmapRate(65.0, ind.heatmapBands).tone, 'band-pink');
    assert.equal(classifyF13HeatmapRate(55.0, ind.heatmapBands).tone, 'band-yellow');
    assert.equal(classifyF13HeatmapRate(45.0, ind.heatmapBands).tone, 'band-red');
    assert.equal(classifyF13HeatmapRate(null, ind.heatmapBands).tone, 'unavailable');
  }

  // F4.1 bands: 80 / 70 / 60 (75.0% is yellow/pink in F4.1 but green in F1.x!)
  assert.equal(classifyF13HeatmapRate(85.0, F41_INDICATOR.heatmapBands).tone, 'band-green');
  assert.equal(classifyF13HeatmapRate(75.0, F41_INDICATOR.heatmapBands).tone, 'band-pink');
  assert.equal(classifyF13HeatmapRate(65.0, F41_INDICATOR.heatmapBands).tone, 'band-yellow');
  assert.equal(classifyF13HeatmapRate(55.0, F41_INDICATOR.heatmapBands).tone, 'band-red');

  // Verify tone class mappings exist in F13_HEATMAP_TONE_CLASS
  assert.ok(F13_HEATMAP_TONE_CLASS['band-green'].includes('emerald'));
  assert.ok(F13_HEATMAP_TONE_CLASS['band-pink'].includes('pink'));
  assert.ok(F13_HEATMAP_TONE_CLASS['band-yellow'].includes('amber'));
  assert.ok(F13_HEATMAP_TONE_CLASS['band-red'].includes('red'));
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
