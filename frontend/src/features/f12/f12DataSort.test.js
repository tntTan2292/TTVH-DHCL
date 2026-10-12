import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterOfficeTableRows,
  sortOfficeUnits,
  nextSortState,
} from './components/f12OfficeTableSort.js';
import {
  filterCumulativeUnits,
  formatMonthShort,
  sortCumulativeUnits,
} from './components/f12Cumulative12Sort.js';

test('f12OfficeTableSort: search filters by unit name, unit code, or child office name/code', () => {
  const sampleRows = [
    {
      ma_huyen: '5375',
      ten_huyen: 'BCVH Thuận Hóa',
      volume: 100,
      offices: [
        { ma_chap_nhan: '530000', ten_chap_nhan: 'Bưu cục Thuận Hóa', volume: 60 },
        { ma_chap_nhan: '530010', ten_chap_nhan: 'Bưu cục Đông Ba', volume: 40 },
      ],
    },
    {
      ma_huyen: '5340',
      ten_huyen: 'Bưu điện Phú Xuân',
      volume: 50,
      offices: [
        { ma_chap_nhan: '531000', ten_chap_nhan: 'Bưu cục Phú Xuân', volume: 50 },
      ],
    },
  ];

  const sampleUnranked = [
    {
      ma_huyen: '5375',
      ten_huyen: 'BCVH Thuận Hóa (KHL)',
      volume: 200,
      offices: [
        { ma_chap_nhan: '531120', ten_chap_nhan: 'Khách hàng lớn', volume: 200 },
      ],
    },
  ];

  // Empty query returns everything, no auto-expansion
  const emptyRes = filterOfficeTableRows(sampleRows, sampleUnranked, '');
  assert.equal(emptyRes.filteredRows.length, 2);
  assert.equal(emptyRes.filteredUnranked.length, 1);
  assert.equal(emptyRes.autoExpandedKeys.size, 0);

  // Search by unit name
  const unitMatch = filterOfficeTableRows(sampleRows, sampleUnranked, 'Phú Xuân');
  assert.equal(unitMatch.filteredRows.length, 1);
  assert.equal(unitMatch.filteredRows[0].ma_huyen, '5340');

  // Search by office code auto-expands the parent unit
  const officeMatch = filterOfficeTableRows(sampleRows, sampleUnranked, '530010');
  assert.equal(officeMatch.filteredRows.length, 1);
  assert.equal(officeMatch.filteredRows[0].ma_huyen, '5375');
  assert.ok(officeMatch.autoExpandedKeys.has('5375'));

  // Search for large customer
  const khlMatch = filterOfficeTableRows(sampleRows, sampleUnranked, 'Khách hàng lớn');
  assert.equal(khlMatch.filteredRows.length, 0);
  assert.equal(khlMatch.filteredUnranked.length, 1);
  assert.equal(khlMatch.filteredUnranked[0].ma_huyen, '5375');
});

test('f12OfficeTableSort: sorts unit rows numerically and alphabetically with nulls last', () => {
  const units = [
    { ma_huyen: 'B', ten_huyen: 'Đơn vị B', volume: 50, rate: 80, rank: 2 },
    { ma_huyen: 'A', ten_huyen: 'Đơn vị A', volume: 100, rate: 95, rank: 1 },
    { ma_huyen: 'C', ten_huyen: 'Đơn vị C', volume: 20, rate: null, rank: 3 },
  ];

  const byRateDesc = sortOfficeUnits(units, 'rate', 'desc');
  assert.deepEqual(byRateDesc.map((u) => u.ma_huyen), ['A', 'B', 'C']);

  const byVolumeAsc = sortOfficeUnits(units, 'volume', 'asc');
  assert.deepEqual(byVolumeAsc.map((u) => u.ma_huyen), ['C', 'B', 'A']);

  const byNameAsc = sortOfficeUnits(units, 'ten_huyen', 'asc');
  assert.deepEqual(byNameAsc.map((u) => u.ma_huyen), ['A', 'B', 'C']);

  // nextSortState toggles: numeric columns start desc, then flip to asc
  assert.deepEqual(nextSortState(null, 'rate'), { field: 'rate', direction: 'desc' });
  assert.deepEqual(nextSortState({ field: 'rate', direction: 'desc' }, 'rate'), { field: 'rate', direction: 'asc' });
  assert.deepEqual(nextSortState({ field: 'rate', direction: 'asc' }, 'rate'), { field: 'rate', direction: 'desc' });
});

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
