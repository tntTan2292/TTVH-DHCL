import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCumulativeRate,
  formatVolume,
  formatNationalRank,
  formatRateDelta,
  formatVolumeDelta,
  formatRankDelta,
  formatDateRange,
  buildSevenDayWindowComparisonModel,
} from './sevenDayRollingComparisonData.js';

test('formatCumulativeRate formats valid rates and handles null/undefined/NaN with dash', () => {
  assert.equal(formatCumulativeRate(59.0912), '59.09%');
  assert.equal(formatCumulativeRate(80), '80.00%');
  assert.equal(formatCumulativeRate(0), '0.00%');
  assert.equal(formatCumulativeRate(null), '—');
  assert.equal(formatCumulativeRate(undefined), '—');
  assert.equal(formatCumulativeRate(NaN), '—');
});

test('formatVolume formats number to vi-VN locale and handles null/undefined with dash', () => {
  assert.equal(formatVolume(12345), '12.345');
  assert.equal(formatVolume(0), '0');
  assert.equal(formatVolume(null), '—');
  assert.equal(formatVolume(undefined), '—');
});

test('formatNationalRank formats rank as x/total and handles missing data with dash', () => {
  assert.equal(formatNationalRank({ rank: 19, total: 34 }), '19/34');
  assert.equal(formatNationalRank({ rank: 1, total: 34 }), '1/34');
  assert.equal(formatNationalRank(null), '—');
  assert.equal(formatNationalRank({ rank: null, total: 34 }), '—');
  assert.equal(formatNationalRank({ rank: 19, total: null }), '—');
});

test('formatRateDelta handles positive, negative, zero, and missing cases', () => {
  const pos = formatRateDelta(2.2612);
  assert.equal(pos.text, '+2.26%');
  assert.equal(pos.tone, 'success');
  assert.equal(pos.value, 2.2612);

  const neg = formatRateDelta(-0.78);
  assert.equal(neg.text, '-0.78%');
  assert.equal(neg.tone, 'danger');

  const zero = formatRateDelta(0);
  assert.equal(zero.text, '0.00%');
  assert.equal(zero.tone, 'neutral');

  const missing = formatRateDelta(null);
  assert.equal(missing.text, '—');
  assert.equal(missing.tone, 'neutral');
  assert.equal(missing.value, null);
});

test('formatVolumeDelta handles positive, negative, zero, and missing cases', () => {
  const pos = formatVolumeDelta(1200);
  assert.equal(pos.text, '+1.200');
  assert.equal(pos.tone, 'info');

  const neg = formatVolumeDelta(-500);
  assert.equal(neg.text, '-500');

  const missing = formatVolumeDelta(null);
  assert.equal(missing.text, '—');
  assert.equal(missing.tone, 'neutral');
});

test('formatRankDelta computes upward, downward, unchanged, and missing rank movements', () => {
  // Better rank: from 24 to 19 -> up 5 spots
  const up = formatRankDelta({ rank: 19, total: 34 }, { rank: 24, total: 34 });
  assert.equal(up.text, '↑ 5 hạng');
  assert.equal(up.tone, 'success');
  assert.equal(up.movement, 5);

  // Worse rank: from 19 to 24 -> down 5 spots
  const down = formatRankDelta({ rank: 24, total: 34 }, { rank: 19, total: 34 });
  assert.equal(down.text, '↓ 5 hạng');
  assert.equal(down.tone, 'danger');
  assert.equal(down.movement, -5);

  // Unchanged rank
  const same = formatRankDelta({ rank: 19, total: 34 }, { rank: 19, total: 34 });
  assert.equal(same.text, 'Giữ hạng');
  assert.equal(same.tone, 'neutral');
  assert.equal(same.movement, 0);

  // Missing rank (e.g. single BCVH scope or no national data)
  const missing = formatRankDelta(null, { rank: 24, total: 34 });
  assert.equal(missing.text, '—');
  assert.equal(missing.tone, 'neutral');
  assert.equal(missing.movement, null);

  const missingBoth = formatRankDelta(null, null);
  assert.equal(missingBoth.text, '—');
  assert.equal(missingBoth.movement, null);
});

test('formatDateRange formats ISO date range into dd/mm–dd/mm', () => {
  assert.equal(
    formatDateRange({ from: '2026-10-14', to: '2026-10-20' }),
    '14/10–20/10'
  );
  assert.equal(
    formatDateRange({ from: '2026-10-07', to: '2026-10-13' }),
    '07/10–13/10'
  );
  assert.equal(formatDateRange(null), '');
  assert.equal(formatDateRange({ from: null, to: '2026-10-20' }), '');
});

test('buildSevenDayWindowComparisonModel transforms full API response into view model', () => {
  const apiData = {
    window_days: 7,
    current_range: { from: '2026-10-14', to: '2026-10-20' },
    compare_range: { from: '2026-10-07', to: '2026-10-13' },
    scope: { type: 'all' },
    summary: {
      current: { volume: 15400, passed: 9100, failed: 6300, rate: 59.0909 },
      compare: { volume: 14200, passed: 8070, failed: 6130, rate: 56.831 },
      rate_delta: 2.2599,
      volume_delta: 1200,
    },
    national_rank: {
      current: { rank: 19, total: 34 },
      compare: { rank: 24, total: 34 },
    },
  };

  const model = buildSevenDayWindowComparisonModel(apiData);
  assert.equal(model.available, true);
  assert.equal(model.currentRangeLabel, 'Giai đoạn này (14/10–20/10)');
  assert.equal(model.compareRangeLabel, 'Giai đoạn so sánh (07/10–13/10)');
  assert.equal(model.current.rate, '59.09%');
  assert.equal(model.current.volume, '15.400');
  assert.equal(model.current.rank, '19/34');
  assert.equal(model.compare.rate, '56.83%');
  assert.equal(model.compare.volume, '14.200');
  assert.equal(model.compare.rank, '24/34');
  assert.equal(model.delta.rate.text, '+2.26%');
  assert.equal(model.delta.rate.tone, 'success');
  assert.equal(model.delta.volume.text, '+1.200');
  assert.equal(model.delta.rank.text, '↑ 5 hạng');
  assert.equal(model.delta.rank.tone, 'success');
});

test('buildSevenDayWindowComparisonModel handles null data and single-BCVH scope cleanly with dashes', () => {
  const singleBcvhData = {
    window_days: 7,
    current_range: { from: '2026-10-14', to: '2026-10-20' },
    compare_range: { from: '2026-10-07', to: '2026-10-13' },
    scope: { type: 'bcvh', ma_bcvh: '535790' },
    summary: {
      current: { volume: 3000, passed: 2700, failed: 300, rate: 90.0 },
      compare: { volume: 2800, passed: 2450, failed: 350, rate: 87.5 },
      rate_delta: 2.5,
      volume_delta: 200,
    },
    national_rank: null,
  };

  const model = buildSevenDayWindowComparisonModel(singleBcvhData);
  assert.equal(model.available, true);
  assert.equal(model.current.rank, '—');
  assert.equal(model.compare.rank, '—');
  assert.equal(model.delta.rank.text, '—');

  const emptyModel = buildSevenDayWindowComparisonModel(null);
  assert.equal(emptyModel.available, false);
  assert.equal(emptyModel.currentRangeLabel, 'Giai đoạn này');
  assert.equal(emptyModel.compareRangeLabel, 'Giai đoạn so sánh');
  assert.equal(emptyModel.current.rate, '—');
  assert.equal(emptyModel.current.volume, '—');
  assert.equal(emptyModel.current.rank, '—');
  assert.equal(emptyModel.compare.rate, '—');
  assert.equal(emptyModel.compare.volume, '—');
  assert.equal(emptyModel.compare.rank, '—');
  assert.equal(emptyModel.delta.rate.text, '—');
  assert.equal(emptyModel.delta.volume.text, '—');
  assert.equal(emptyModel.delta.rank.text, '—');
});
