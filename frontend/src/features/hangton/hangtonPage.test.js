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
