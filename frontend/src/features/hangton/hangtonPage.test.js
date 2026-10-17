import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (relPath) => fs.readFileSync(new URL(relPath, import.meta.url), 'utf8');

test('HangTonPage renders all 4 tabs with expected titles and icons', () => {
  const source = read('./HangTonPage.jsx');
  assert.match(source, /id:\s*'overview',\s*label:\s*'Tổng quan'/);
  assert.match(source, /id:\s*'office',\s*label:\s*'Theo bưu cục'/);
  assert.match(source, /id:\s*'compare',\s*label:\s*'So sánh hai mốc'/);
  assert.match(source, /id:\s*'items',\s*label:\s*'Chi tiết'/);
  assert.match(source, /title="Chỉ số rà soát Hàng tồn"/);
  assert.match(source, /SnapshotPicker/);
});

test('Quality gate: every HangTon tab block has the camera button', () => {
  const overview = read('./components/HangTonOverviewTab.jsx');
  const office = read('./components/HangTonByOfficeTab.jsx');
  const compare = read('./components/HangTonCompareTab.jsx');
  const items = read('./components/HangTonItemsTab.jsx');

  assert.match(overview, /BlockCaptureButton/, 'Overview tab must include BlockCaptureButton');
  assert.match(office, /BlockCaptureButton/, 'Office tab must include BlockCaptureButton');
  assert.match(compare, /BlockCaptureButton/, 'Compare tab must include BlockCaptureButton');
  assert.match(items, /BlockCaptureButton/, 'Items tab must include BlockCaptureButton');
});

test('Office table orders rows with SortableTh and click-to-order column headers', () => {
  const office = read('./components/HangTonByOfficeTab.jsx');
  assert.match(office, /SortableTh/);
  assert.match(office, /field="office"/);
  assert.match(office, /field="total"/);
  assert.match(office, /field="ge5"/);
  assert.match(office, /calculateOfficeTotals/);
  assert.match(office, /TỔNG CỘNG/);
});

test('Target 0 is enforced for stock aged >= 5 days (PO Decision D4)', () => {
  const overview = read('./components/HangTonOverviewTab.jsx');
  assert.match(overview, /0 bưu gửi/);
  assert.match(overview, /Mục tiêu/);

  const levels = read('./hangtonLevels.js');
  assert.match(levels, /TARGET_GE5\s*=\s*0/);
});

test('App.jsx configures /hangton route accessible to admin and viewer', () => {
  const appSource = read('../../App.jsx');
  assert.match(
    appSource,
    /path="hangton"\s+element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><HangTonPage \/><\/ProtectedRoute>\}/,
  );
});

test('No-base state: Overview, Office totals and Compare tab use the dash helpers, not raw zeros', () => {
  const overview = read('./components/HangTonOverviewTab.jsx');
  const office = read('./components/HangTonByOfficeTab.jsx');
  const compare = read('./components/HangTonCompareTab.jsx');
  assert.match(overview, /compareValue\(compare, 'resolved'\)/);
  assert.match(overview, /compareValue\(compare, 'aged_up'\)/);
  assert.match(overview, /compareValue\(compare, 'new'\)/);
  assert.match(overview, /NO_BASE_NOTE/);
  assert.match(office, /hasCompareBase/);
  assert.match(office, /hasBase \? formatNumber\(totals\.resolved\) : '—'/);
  assert.match(compare, /NO_BASE_NOTE/);
  assert.doesNotMatch(compare, /snapshots\[1\] \|\| snapshots\[0\]/, 'must not pretend a base snapshot exists');
});

test('Chi tiết table orders by clicking column titles (SortableTh) and sends sort + dir', () => {
  const items = read('./components/HangTonItemsTab.jsx');
  for (const field of ['item_code', 'office', 'status', 'rank', 'cod', 'postman']) {
    assert.match(items, new RegExp(`<SortableTh field="${field}"`), `column ${field} must be sortable`);
  }
  assert.match(items, /nextSortState/);
  assert.match(items, /sort: sort\.field,\s*dir: sort\.direction/);
  assert.doesNotMatch(items, /Sắp xếp: Loại tồn cao nhất/, 'the old sort drop-down is replaced by column titles');
});

test('Page does not reload twice: the resolved base is derived, never copied back into state', () => {
  const page = read('./HangTonPage.jsx');
  assert.doesNotMatch(page, /setBaseSnapshotId\(cmpData/);
  assert.match(page, /requestToken/);
  assert.match(page, /return compare\?\.from \|\| null/);
});
