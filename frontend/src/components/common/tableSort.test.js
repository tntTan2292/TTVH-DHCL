import test from 'node:test';
import assert from 'node:assert/strict';
import { cellFieldValue, compareSortValues, nextSortState, sortRowsBy } from './tableSort.js';

test('numbers sort numerically in both directions; a missing value is always last', () => {
  const rows = [{ id: 'a', v: 5 }, { id: 'b', v: null }, { id: 'c', v: 20 }, { id: 'd', v: 1 }, { id: 'e', v: undefined }, { id: 'f', v: '—' }];
  assert.deepEqual(sortRowsBy(rows, 'v', 'desc').map((r) => r.id), ['c', 'a', 'd', 'b', 'e', 'f']);
  assert.deepEqual(sortRowsBy(rows, 'v', 'asc').map((r) => r.id), ['d', 'a', 'c', 'b', 'e', 'f']);
});

test('text sorts with the Vietnamese collation and equal values keep their order (stable)', () => {
  const rows = [{ id: 1, n: 'Thuận An' }, { id: 2, n: 'A Lưới' }, { id: 3, n: 'Phú Lộc' }, { id: 4, n: 'A Lưới' }];
  assert.deepEqual(sortRowsBy(rows, 'n', 'asc').map((r) => r.id), [2, 4, 3, 1]);
  assert.deepEqual(sortRowsBy(rows, 'n', 'desc').map((r) => r.id), [1, 3, 2, 4]);
});

test('numeric strings compare as numbers and 0 is a real value, not missing', () => {
  assert.ok(compareSortValues('9', '10', 'asc') < 0);
  assert.ok(compareSortValues(0, 3, 'asc') < 0);
  assert.ok(compareSortValues(null, 0, 'asc') > 0);
  assert.equal(compareSortValues(null, undefined), 0);
});

test('sorting never mutates the input and tolerates bad input', () => {
  const rows = [{ v: 2 }, { v: 1 }];
  const sorted = sortRowsBy(rows, 'v', 'asc');
  assert.deepEqual(rows, [{ v: 2 }, { v: 1 }]);
  assert.notEqual(sorted, rows);
  assert.deepEqual(sortRowsBy(undefined, 'v'), []);
  assert.equal(sortRowsBy(rows, null), rows);
  assert.deepEqual(sortRowsBy(rows, 'v', 'asc', (row) => -row.v).map((r) => r.v), [2, 1]);
});

test('clicking a title: same column flips, a new numeric column starts biggest-first, a text column A-Z', () => {
  let state = { field: 'daily_rate', direction: 'desc' };
  state = nextSortState(state, 'daily_rate');
  assert.deepEqual(state, { field: 'daily_rate', direction: 'asc' });
  state = nextSortState(state, 'daily_volume');
  assert.deepEqual(state, { field: 'daily_volume', direction: 'desc' });
  state = nextSortState(state, 'ten_bcvh', { textFields: ['ten_bcvh'] });
  assert.deepEqual(state, { field: 'ten_bcvh', direction: 'asc' });
  assert.deepEqual(nextSortState(null, 'x'), { field: 'x', direction: 'desc' });
});

test('cell metrics: an empty cell has no value, a 0 % cell with parcels does', () => {
  assert.equal(cellFieldValue(null, 'rate'), null);
  assert.equal(cellFieldValue({ volume: 0, rate: null }, 'volume'), null);
  assert.equal(cellFieldValue({ volume: 12, rate: 0 }, 'rate'), 0);
  assert.equal(cellFieldValue({ volume: 12, rate: 75.5 }, 'volume'), 12);
});
