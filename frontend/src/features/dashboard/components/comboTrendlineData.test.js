import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRate,
  formatVariance,
  getVolumeAxisMax,
  normalizeComboTrendlineItems,
  QUALITY_TARGET_RATE,
  VOLUME_AXIS_HEADROOM_RATE,
} from './comboTrendlineData.js';

test('combo trendline normalization sorts dates and computes target variance', () => {
  const result = normalizeComboTrendlineItems([
    {
      date: '2026-07-15',
      total_volume: 3677,
      passed: 2471,
      failed: 1037,
      quality_rate: 67.2015,
      data_available: true,
    },
    {
      date: '2026-07-14',
      total_volume: 3134,
      passed: 1893,
      failed: 1068,
      quality_rate: 60.402,
      data_available: true,
    },
  ]);

  assert.equal(result[0].date, '2026-07-14');
  assert.equal(result[1].date, '2026-07-15');
  assert.equal(result[1].total_volume, 3677);
  assert.equal(result[1].quality_rate, 67.2015);
  assert.equal(result[1].target_rate, QUALITY_TARGET_RATE);
  assert.equal(result[1].target_variance, -22.7985);
});

test('combo trendline normalization keeps missing dates as chart gaps', () => {
  const result = normalizeComboTrendlineItems([
    {
      date: '2026-07-10',
      total_volume: 0,
      passed: 0,
      failed: 0,
      quality_rate: null,
      data_available: false,
    },
  ]);

  assert.equal(result[0].total_volume, null);
  assert.equal(result[0].passed, null);
  assert.equal(result[0].failed, null);
  assert.equal(result[0].quality_rate, null);
  assert.equal(result[0].target_variance, null);
});

test('combo trendline formatting exposes Vietnamese tooltip values with two decimals', () => {
  assert.equal(formatRate(67.2015), '67.20%');
  assert.equal(formatRate(null), 'Không có dữ liệu');
  assert.equal(formatVariance(-22.7985), '-22.80 điểm %');
  assert.equal(formatVariance(1.2345), '+1.23 điểm %');
  assert.equal(formatVariance(null), 'Không có dữ liệu');
});

test('combo trendline volume axis keeps zero anchor and adds visual headroom', () => {
  const result = normalizeComboTrendlineItems([
    { date: '2026-07-14', total_volume: 100, passed: 90, failed: 10, quality_rate: 90, data_available: true },
    { date: '2026-07-15', total_volume: 200, passed: 160, failed: 40, quality_rate: 80, data_available: true },
    { date: '2026-07-16', total_volume: 0, passed: 0, failed: 0, quality_rate: null, data_available: false },
  ]);

  assert.equal(getVolumeAxisMax(result), Math.ceil(200 * (1 + VOLUME_AXIS_HEADROOM_RATE)));
});
