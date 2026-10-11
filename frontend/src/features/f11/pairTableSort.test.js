import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describePairSort, orderPairColumns, pairRowValue } from './components/f11PairTableSort.js';
import { sortRowsBy } from '../../components/common/tableSort.js';

const columns = [
  { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' },
  { ma_bcvh: '537220', ten_bcvh: 'BCVH Phú Lộc' },
  { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' },
  { ma_bcvh: 'OTHER', ten_bcvh: 'Khác' },
];
const cell = (volume, passed) => (volume ? { volume, passed, failed: volume - passed, blank: 0, rate: Number(((passed / volume) * 100).toFixed(2)) } : null);
const rows = [
  { ma_chap_nhan: '1', ten_chap_nhan: 'Phú Bài', cells: { 533140: cell(100, 90), 537220: cell(10, 10), 535790: null }, total: cell(110, 100) },
  { ma_chap_nhan: '2', ten_chap_nhan: 'An Cựu', cells: { 533140: cell(300, 200), 537220: null, 535790: cell(40, 20) }, total: cell(340, 220) },
  { ma_chap_nhan: '3', ten_chap_nhan: 'Thuận An', cells: { 533140: cell(50, 49), 537220: cell(5, 0), 535790: cell(1, 1) }, total: cell(56, 50) },
];
const totalRow = { cells: { 533140: cell(450, 339), 537220: cell(15, 10), 535790: cell(41, 21), OTHER: cell(2, 2) }, total: cell(508, 372) };
const ids = (field, direction) => sortRowsBy(rows, field, direction, pairRowValue).map((r) => r.ma_chap_nhan);

test('rows order by name, by total volume and by total rate', () => {
  assert.deepEqual(ids('name', 'asc'), ['2', '1', '3']);
  assert.deepEqual(ids('total:volume', 'desc'), ['2', '1', '3']);
  assert.deepEqual(ids('total:rate', 'desc'), ['1', '3', '2']); // 90.9 %, 89.3 %, 64.7 %
  assert.deepEqual(ids('total:rate', 'asc'), ['2', '3', '1']);
});

test('order by a unit column: empty cells never lead; a 0 % cell with parcels is a real, lowest value', () => {
  assert.deepEqual(ids('537220:rate', 'asc'), ['3', '1', '2']); // 0 %, 100 %, empty last
  assert.deepEqual(ids('537220:rate', 'desc'), ['1', '3', '2']);
  assert.deepEqual(ids('535790:volume', 'desc'), ['2', '3', '1']); // 40, 1, empty
});

test('columns order by their volume or rate over the period; "Khác" stays last; default keeps the server order', () => {
  const codes = (order) => orderPairColumns(columns, totalRow, order).map((c) => c.ma_bcvh);
  assert.deepEqual(codes(null), ['533140', '537220', '535790', 'OTHER']);
  assert.deepEqual(codes({ metric: 'volume', direction: 'desc' }), ['533140', '535790', '537220', 'OTHER']);
  assert.deepEqual(codes({ metric: 'volume', direction: 'asc' }), ['537220', '535790', '533140', 'OTHER']);
  assert.deepEqual(codes({ metric: 'rate', direction: 'desc' }), ['533140', '537220', '535790', 'OTHER']); // 75.3, 66.7, 51.2
  assert.deepEqual(codes({ metric: 'rate', direction: 'asc' }), ['535790', '537220', '533140', 'OTHER']);
});

test('the caption names the active order in plain words', () => {
  assert.equal(describePairSort(null, columns), '');
  assert.equal(describePairSort({ field: 'name', direction: 'asc' }, columns), 'tên bưu cục (A → Z)');
  assert.equal(describePairSort({ field: 'total:volume', direction: 'desc' }, columns), 'sản lượng tổng cộng (cao → thấp)');
  assert.equal(describePairSort({ field: '537220:rate', direction: 'asc' }, columns), 'tỷ lệ đạt của BCVH Phú Lộc (thấp → cao)');
});

test('the block wires the headers, the column-order buttons and the indicator theme', () => {
  const source = fs.readFileSync(new URL('./components/F11PairTableBlock.jsx', import.meta.url), 'utf8');
  assert.match(source, /<SortableTh[\s\S]*field="name"/);
  assert.match(source, /MiniSort field=\{`\$\{col\.ma_bcvh\}:volume`\}/);
  assert.match(source, /MiniSort field=\{`\$\{col\.ma_bcvh\}:rate`\}/);
  assert.match(source, /orderedColumns\.map\(\(col\)/);
  assert.match(source, /from '\.\/f11PairTableSort\.js'/);
  assert.doesNotMatch(source, /#003E7E/); // no fixed dark blue: the colour comes from the indicator theme
  assert.match(source, /indicatorTheme/);
});

test('the picture of the table takes only the top N rows in the chosen order, without the controls (PO 2026-10-10)', () => {
  const source = fs.readFileSync(new URL('./components/F11PairTableBlock.jsx', import.meta.url), 'utf8');
  assert.match(source, /captureTop/);
  assert.match(source, /filteredAndSortedRows\.slice\(0, captureTop\)/);
  assert.match(source, /\{visibleRows\.map\(\(row\)/);
  assert.match(source, /beforeCapture=\{async \(\) => \{ setCapturing\(true\); await waitForNextPaint\(\); \}\}/);
  assert.match(source, /afterCapture=\{\(\) => setCapturing\(false\)\}/);
  assert.match(source, /Ảnh chụp: top \$\{visibleRows\.length\} \/ \$\{filteredAndSortedRows\.length\}/);
  // controls, period buttons, the SL/TL mini buttons and the hint stay out of the picture
  assert.ok((source.match(/data-no-capture="true"/g) || []).length >= 6);
  assert.match(source, /\[15, 20, 25, 30\]/);
});

test('while the picture is taken the table is laid out for reading: big text, even columns, narrow frame, no controls (PO 2026-10-11)', async () => {
  const source = fs.readFileSync(new URL('./components/F11PairTableBlock.jsx', import.meta.url), 'utf8');
  const css = source.slice(source.indexOf('export const PAIR_CAPTURE_CSS'), source.indexOf('export default function F11PairTableBlock'));
  assert.match(css, /\.pair-capturing \{ width: fit-content/);
  assert.match(css, /\.pair-name \{ display: inline-block; font-size: 21px/); // about twice the 11-12 px of the screen layout
  assert.match(css, /\.pair-rate \{ font-size: 21px/);
  assert.match(css, /thead th \{ width: 150px/); // one even width for every delivering-unit column
  assert.match(css, /\.pair-cell \{ flex-direction: row/); // rate and volume of a cell on one line: low rows, wide columns (near-square picture)
  assert.match(css, /\.pair-code \{ display: inline-block/); // office name and code on one line
  assert.match(css, /\[data-no-capture="true"\] \{ display: none !important; \}/); // controls take no room while the frame is measured
  assert.match(css, /\.pair-legend, \.pair-capturing \.pair-foot \{ width: 0; min-width: 100%; \}/); // long one-line texts do not widen the frame
  assert.match(source, /useState\(20\); \/\/ number \| 'all'/); // default top 20
  assert.match(source, /captionFontSize=\{17\}/);
  // a delivering-unit column with no parcel at all is left out of the picture
  assert.match(source, /capturing\s*\?\s*sortedColumns\.filter/);
});
