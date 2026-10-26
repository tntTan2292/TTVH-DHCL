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
    /path="hangton\/:tab"\s+element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><HangTonPage \/><\/ProtectedRoute>\}/,
  );
  assert.match(appSource, /path="hangton"\s+element=\{<Navigate to="\/hangton\/overview" replace \/>\}/);
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

test('Column hiding: Theo bưu cục table has presets and per-level toggles, remembered per viewer', () => {
  const office = read('./components/HangTonByOfficeTab.jsx');
  const picker = read('./components/LevelPicker.jsx');
  const state = read('./hangtonLevelState.js');
  assert.match(office, /<LevelPicker/);
  assert.match(office, /useStoredHiddenLevels/);
  assert.match(office, /shownLevels\.map/);
  assert.doesNotMatch(office, /\{TON_LEVELS\.map\(\(lvl\) => \{\s*const cfg = getLevelConfig/, 'table columns come from the visible levels');
  assert.match(picker, /COLUMN_PRESETS/);
  assert.match(picker, /toggleHiddenLevel/);
  assert.match(picker, /data-no-capture="true"/, 'the picker is not part of the captured picture');
  assert.match(state, /localStorage/);
});

test('Readable text: no 9-11px text left in the Hàng tồn screens', () => {
  for (const file of ['HangTonPage.jsx', 'components/HangTonOverviewTab.jsx', 'components/HangTonByOfficeTab.jsx', 'components/HangTonCompareTab.jsx', 'components/HangTonItemsTab.jsx', 'components/SnapshotPicker.jsx']) {
    assert.doesNotMatch(read(`./${file}`), /text-\[(?:9|10|11)px\]/, `${file} must not use tiny text`);
  }
  assert.doesNotMatch(read('./components/HangTonOverviewTab.jsx'), /fontSize: 1[01]/);
});

test('Review fixes: no truncated KPI notes or office names, empty row spans the visible columns, unknown tab rewrites the URL', () => {
  const overview = read('./components/HangTonOverviewTab.jsx');
  const office = read('./components/HangTonByOfficeTab.jsx');
  const page = read('./HangTonPage.jsx');
  assert.doesNotMatch(overview, /pt-2 truncate/, 'KPI notes wrap instead of being cut');
  assert.doesNotMatch(office, /truncate max-w-\[150px\]/, 'office names are never cut (also in the captured picture)');
  assert.doesNotMatch(office, /colSpan=\{16\}/);
  assert.match(office, /officeTableColumnCount\(shownLevels\.length\)/);
  assert.match(office, /sortAfterHide\(current, next\)/);
  assert.match(page, /navigate\('\/hangton\/overview', \{ replace: true \}\)/);
});

test('Theo bưu cục: rows and TỔNG CỘNG are built from the visible levels', () => {
  const office = read('./components/HangTonByOfficeTab.jsx');
  assert.match(office, /applyVisibleLevels\(rawRows, shownLevels\)/);
  assert.match(office, /calculateOfficeTotals\(visibleRows\)/);
  assert.doesNotMatch(office, /calculateOfficeTotals\(rawRows\)/, 'totals must not ignore the hidden levels');
  assert.doesNotMatch(office, /vẫn tính cả các mức đã ẩn/);
});

test('Theo bưu cục: every figure opens the parcel list; Chi tiết pages through every row and exports all of them', () => {
  const office = read('./components/HangTonByOfficeTab.jsx');
  const modal = read('./components/HangTonItemsModal.jsx');
  const items = read('./components/HangTonItemsTab.jsx');
  const client = read('./api/hangtonClient.js');
  assert.match(office, /HangTonItemsModal/);
  for (const kind of ["'level', lvl", "'total'", "'ge5'"]) {
    assert.ok(office.includes(`openDrill(r.office, ${kind})`), `row figure ${kind} opens the list`);
    assert.ok(office.includes(`openDrill(null, ${kind})`), `TỔNG CỘNG figure ${kind} opens the list`);
  }
  assert.match(modal, /limit: ALL_ROWS/, 'the modal loads every row, no paging');
  assert.match(modal, /Tải Excel/);
  assert.match(modal, /downloadItemsFile/);
  assert.match(client, /\/hangton\/items\/export/);
  assert.match(client, /responseType: 'blob'/);
  assert.match(items, /PAGE_SIZES = \[50, 100, 200, 500, 1000, 0\]/);
  assert.match(items, /Tất cả/);
  assert.match(items, /goToPage\(1\)/);
  assert.match(items, /goToPage\(totalPages\)/);
  assert.match(items, /handleExport\('xlsx'\)/);
  assert.doesNotMatch(items, /Xuất trang này/, 'the export is no longer limited to the current page');
  assert.doesNotMatch(items, /downloadCsv/);
});

test('Customer-group filter reaches every screen: page state, requests, chart, table, modal and detail', () => {
  const page = read('./HangTonPage.jsx');
  const overview = read('./components/HangTonOverviewTab.jsx');
  const office = read('./components/HangTonByOfficeTab.jsx');
  const modal = read('./components/HangTonItemsModal.jsx');
  const items = read('./components/HangTonItemsTab.jsx');
  const compare = read('./components/HangTonCompareTab.jsx');
  assert.match(page, /CustomerFilterBar/);
  assert.match(page, /fetchOverview\(\{ id, customers: customersParam\(customers\) \}\)/);
  assert.match(page, /fetchCompare\(\{ id,.*customers: customersParam\(customers\)/);
  assert.match(page, /selectedCustomers=\{selectedCustomers\}/);
  assert.match(page, /customersKey/, 'a change of selection reloads the data');
  assert.match(overview, /chartMode\(selectedCustomers\) === 'groups'/);
  assert.match(overview, /HangTonCustomerChart/);
  assert.match(office, /customers=\{selectedCustomers\}/, 'the drill-down window respects the selection');
  assert.match(modal, /customers, sort: 'rank'/);
  assert.match(items, /customers: selectedCustomers/);
  assert.match(items, /Nhóm KH/);
  assert.match(modal, /Nhóm KH/);
  assert.match(compare, /Nhóm KH/);
});

test('Overview chart: starts from 3 days, has its own level picker for both chart modes, shared picker with the office table', () => {
  const overview = read('./components/HangTonOverviewTab.jsx');
  const office = read('./components/HangTonByOfficeTab.jsx');
  const chart = read('./components/HangTonCustomerChart.jsx');
  const state = read('./hangtonLevelState.js');
  assert.match(overview, /useStoredHiddenLevels\('qis\.hangton\.chartLevels', presetHiddenLevels\('ge3'\)\)/);
  assert.match(overview, /chartLevels\.map\(\(lvl\)/, 'red chart draws only the shown levels');
  assert.match(overview, /levels=\{chartLevels\}/, 'stacked chart draws only the shown levels');
  assert.match(overview, /<LevelPicker/);
  assert.match(office, /<LevelPicker/);
  assert.match(office, /useStoredHiddenLevels\('qis\.hangton\.hiddenLevels', \[\]\)/);
  assert.match(state, /localStorage/);
  assert.match(chart, /LabelList/, 'segments carry their numbers');
  assert.doesNotMatch(chart + overview, /Mục tiêu ≥5 ngày: 0', position: 'top'/, 'the target label no longer sits on the bars');
});

test('Tổng quan review fixes: nine-level table independent of the chart, sortable titles, readable text, drill-down to 5 days and more', () => {
  const overview = read('./components/HangTonOverviewTab.jsx');
  const page = read('./HangTonPage.jsx');
  const items = read('./components/HangTonItemsTab.jsx');
  assert.match(overview, /buildLevelRows\(overview\?\.by_level \|\| \[\], TON_LEVELS\)/, 'the table always has the nine levels');
  assert.doesNotMatch(overview, /chartData\.map\(\(row\) => \{\s*const cfg/, 'the nine-level table is not built from the chart levels');
  assert.ok((overview.match(/<SortableTh/g) || []).length >= 8, 'customer and level tables order by clicking the titles');
  assert.doesNotMatch(overview, /text-xs/, 'no 12 px text left for the body of the screen (one step up)');
  assert.match(overview, /onDrilldownToOffice\(office\.office, 5\)/);
  assert.match(page, /handleDrilldownToOffice = \(officeName, minRank = ''\)/);
  assert.match(page, /initialMinRank=\{selectedMinRank\}/);
  assert.match(items, /initialMinRank/);
  assert.match(overview, /tồn ≥5 ngày \/ \{formatNumber\(office\.n\)\} tồn của bưu cục/, 'the hot-spot caption names what each number is');
  assert.match(overview, /COD ≥5 ngày/);
});

test('Theo bưu cục: the comparison column group shows its base snapshot and what it counts', () => {
  const office = read('./components/HangTonByOfficeTab.jsx');
  assert.match(office, /compareColumnsHeader\(compare\)/);
  assert.match(office, /\{compareHeader\.title\}\{' '\}/, 'title and note on one line');
  assert.match(office, /\{compareHeader\.note\}/);
  assert.doesNotMatch(office, /Biến động so với mốc trước/, 'the vague wording is gone');
});

test('Theo bưu cục: an office name stays on one line (never wrapped, never cut)', () => {
  const office = read('./components/HangTonByOfficeTab.jsx');
  assert.match(office, /<span className="whitespace-nowrap">\{r\.office\}<\/span>/);
  assert.doesNotMatch(office, /break-words">\{r\.office\}/);
  assert.doesNotMatch(office, /truncate max-w-\[150px\]/);
});

test('Theo bưu cục: COD figures never wrap (non-breaking currency sign and no-wrap cells)', () => {
  const office = read('./components/HangTonByOfficeTab.jsx');
  assert.match(office, /whitespace-nowrap py-2 px-2\.5 text-right font-medium text-slate-700 border-r border-slate-200">\s*\{r\.cod > 0/);
  assert.match(office, /whitespace-nowrap py-2\.5 px-2\.5 text-right border-r border-slate-300">\s*\{formatCurrency\(totals\.cod\)/);
  assert.match(read('./hangtonLevels.js'), /\u00A0₫/);
});

test('LevelPicker is compact: short chips, no wrapping labels, short notes', () => {
  const picker = read('./components/LevelPicker.jsx');
  assert.match(picker, /shortLevelLabel\(lvl\)/);
  assert.match(picker, /whitespace-nowrap text-sm font-bold/);
  assert.doesNotMatch(picker, /text-base/, 'compact: no 16 px buttons');
  const office = read('./components/HangTonByOfficeTab.jsx');
  const overview = read('./components/HangTonOverviewTab.jsx');
  assert.match(office, /note="Tổng tồn, Tồn ≥5, COD và TỔNG CỘNG chỉ tính các mức đang hiện\."/);
  assert.match(overview, /note="Chỉ ảnh hưởng biểu đồ; bảng 9 mức bên dưới luôn đủ\."/);
});
