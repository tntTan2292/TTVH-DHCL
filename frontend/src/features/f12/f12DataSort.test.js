import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterCumulativeUnits,
  formatMonthShort,
  sortCumulativeUnits,
} from './components/f12Cumulative12Sort.js';

test('f12Cumulative12Sort: formatMonthShort formats month key correctly', () => {
  assert.equal(formatMonthShort('2026-10'), 'T10/26');
  assert.equal(formatMonthShort('2025-03'), 'T3/25');
  assert.equal(formatMonthShort('2026-01'), 'T1/26');
  assert.equal(formatMonthShort(null), '');
  assert.equal(formatMonthShort('invalid'), 'invalid');
});

test('f12Cumulative12Sort: sorts units by overall rate, volume and individual month rates', () => {
  const units = [
    {
      ma_bcvh: '5304',
      ten_bcvh: 'Bưu điện Thuận Hóa',
      volume: 120,
      rate: 88,
      rank: 2,
      months: {
        '2026-09': { volume: 50, rate: 90 },
        '2026-10': { volume: 70, rate: 85 },
      },
    },
    {
      ma_bcvh: '5340',
      ten_bcvh: 'Bưu điện Phú Xuân',
      volume: 80,
      rate: 94,
      rank: 1,
      months: {
        '2026-09': null,
        '2026-10': { volume: 80, rate: 94 },
      },
    },
  ];

  // Sort by overall 12-month rate desc
  const byRateDesc = sortCumulativeUnits(units, 'rate', 'desc');
  assert.equal(byRateDesc[0].ma_bcvh, '5340');

  // Sort by month '2026-09' desc (5340 is null, so it goes last)
  const bySepDesc = sortCumulativeUnits(units, 'month_2026-09', 'desc');
  assert.equal(bySepDesc[0].ma_bcvh, '5304');
  assert.equal(bySepDesc[1].ma_bcvh, '5340');

  // Filter units by search
  assert.equal(filterCumulativeUnits(units, 'Phú Xuân').length, 1);
  assert.equal(filterCumulativeUnits(units, '5304').length, 1);
  assert.equal(filterCumulativeUnits(units, '').length, 2);
});
