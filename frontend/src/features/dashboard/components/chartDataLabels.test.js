import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampWindow,
  formatRateLabel,
  formatVolumeLabel,
  fullWindow,
  isFullWindow,
  LABEL_ALL_MAX_POINTS,
  LABEL_STYLE,
  MIN_ZOOM_SPAN,
  panWindow,
  selectLabelIndexes,
  selectLastIndex,
  sliceWindow,
  stackEndLabelOffsets,
  zoomWindow,
} from './chartDataLabels.js';

const makeRows = (values) => values.map((rate, index) => ({ rate, below: rate !== null && rate < 90, index }));

test('formatters return empty string for missing values and vi-VN / 2-decimal output otherwise', () => {
  assert.equal(formatVolumeLabel(null), '');
  assert.equal(formatVolumeLabel(undefined), '');
  assert.equal(formatVolumeLabel(4133), (4133).toLocaleString('vi-VN'));
  assert.equal(formatRateLabel(null), '');
  assert.equal(formatRateLabel(63.5), '63.50%');
  assert.equal(formatRateLabel(63.456, 1), '63.5%');
});

test('selectLabelIndexes labels every valued point when the view is small', () => {
  const rows = makeRows([60, null, 70, 80]);
  assert.deepEqual([...selectLabelIndexes(rows, 'rate')].sort(), [0, 2, 3]);
});

test('selectLabelIndexes on a dense view keeps min, max and last only', () => {
  const values = Array.from({ length: 30 }, (_, i) => 70 + (i % 7));
  values[4] = 40;
  values[12] = 99;
  const rows = makeRows(values);
  assert.ok(rows.length > LABEL_ALL_MAX_POINTS);
  assert.deepEqual([...selectLabelIndexes(rows, 'rate')].sort((a, b) => a - b), [4, 12, 29]);
});

test('selectLabelIndexes ignores trailing null as "last" and caps extra highlights', () => {
  const values = Array.from({ length: 20 }, (_, i) => 60 + i);
  values[19] = null;
  const rows = makeRows(values);
  const picked = selectLabelIndexes(rows, 'rate', { alwaysLabel: (row) => row.below, maxExtra: 2 });
  assert.ok(picked.has(18), 'last valued point');
  assert.ok(picked.has(0) && picked.has(18), 'min and max');
  // min(0), max/last(18) + the 2 lowest below-target points (0 again, then 1)
  assert.deepEqual([...picked].sort((a, b) => a - b), [0, 1, 18]);
});

test('selectLabelIndexes returns empty set when no valued points', () => {
  assert.equal(selectLabelIndexes(makeRows([null, null]), 'rate').size, 0);
  assert.equal(selectLabelIndexes([], 'rate').size, 0);
});

test('selectLastIndex finds the last valued point', () => {
  assert.deepEqual([...selectLastIndex(makeRows([1, 2, null]), 'rate')], [1]);
  assert.equal(selectLastIndex(makeRows([null]), 'rate').size, 0);
});

test('zoomWindow zooms in toward the cursor and never drops below the minimum span', () => {
  let win = fullWindow(30);
  win = zoomWindow(win, 30, { anchorRatio: 1, zoomIn: true });
  assert.ok(win.end - win.start + 1 < 30);
  assert.equal(win.end, 29, 'anchored on the right edge keeps the right edge');
  for (let i = 0; i < 40; i += 1) win = zoomWindow(win, 30, { anchorRatio: 0.5, zoomIn: true });
  assert.equal(win.end - win.start + 1, MIN_ZOOM_SPAN);
});

test('zoomWindow zooms out back to the full window', () => {
  let win = { start: 10, end: 14 };
  for (let i = 0; i < 40; i += 1) win = zoomWindow(win, 30, { anchorRatio: 0.5, zoomIn: false });
  assert.deepEqual(win, fullWindow(30));
  assert.ok(isFullWindow(win, 30));
});

test('zoomWindow step is never swallowed by rounding on small spans', () => {
  const win = zoomWindow({ start: 0, end: 5 }, 30, { zoomIn: true });
  assert.equal(win.end - win.start + 1, MIN_ZOOM_SPAN);
  const out = zoomWindow({ start: 0, end: 5 }, 30, { zoomIn: false, factor: 0.99 });
  assert.equal(out.end - out.start + 1, 7);
});

test('panWindow keeps the span and clamps at both ends', () => {
  const win = { start: 5, end: 9 };
  assert.deepEqual(panWindow(win, 30, 3), { start: 8, end: 12 });
  assert.deepEqual(panWindow(win, 30, -100), { start: 0, end: 4 });
  assert.deepEqual(panWindow(win, 30, 100), { start: 25, end: 29 });
});

test('clampWindow handles tiny datasets and empty data', () => {
  assert.deepEqual(clampWindow(0, 10, 3), { start: 0, end: 2 });
  assert.deepEqual(clampWindow(0, 0, 0), { start: 0, end: 0 });
});

test('sliceWindow returns the original array when not zoomed', () => {
  const rows = [1, 2, 3, 4, 5, 6];
  assert.equal(sliceWindow(rows, fullWindow(6)), rows);
  assert.equal(sliceWindow(rows, null), rows);
  assert.deepEqual(sliceWindow(rows, { start: 1, end: 3 }), [2, 3, 4]);
});

test('stackEndLabelOffsets separates series that end close together and ignores empty series', () => {
  const rows = [
    { a: 80, b: 70, c: 69, d: 68.5, e: null },
    { a: 90, b: 71, c: 70, d: 40, e: null },
  ];
  const offsets = stackEndLabelOffsets(rows, ['a', 'b', 'c', 'd', 'e']);
  assert.equal(offsets.a, 0);
  assert.equal(offsets.b, 0, 'b is 19 points below a');
  assert.equal(offsets.c, 12, 'c is within the gap of b');
  assert.equal(offsets.d, 0, 'd is far below c');
  assert.equal('e' in offsets, false);
});

test('LABEL_STYLE defines insideBottom volume positioning and tuned width/height thresholds', () => {
  assert.equal(LABEL_STYLE.volumePosition, 'insideBottom');
  assert.equal(LABEL_STYLE.minBarWidthForHorizontal, 28);
  assert.equal(LABEL_STYLE.minBarHeightForInside, 20);
  assert.equal(LABEL_STYLE.haloColor, '#FFFFFF');
});
