import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TON_LEVELS,
  tonRank,
  canonicalLevel,
  getLevelConfig,
  isGe5Level,
  formatSlot,
  formatSnapshotLabel,
  formatNumber,
  formatCurrency,
  formatDelta,
  hasCompareBase,
  compareValue,
  NO_BASE_NOTE,
} from './hangtonLevels.js';
import {
  buildOfficeTableRows,
  calculateOfficeTotals,
  sortOfficeRows,
} from './hangtonOfficeTableData.js';
import { escapeCsvCell, buildCsvContent } from './hangtonExport.js';

test('tonRank extracts correct numeric rank for all 9 levels', () => {
  assert.equal(tonRank('<1 ngày'), 0);
  assert.equal(tonRank('≥1 ngày'), 1);
  assert.equal(tonRank('≥1.5 ngày'), 1.5);
  assert.equal(tonRank('≥2 ngày'), 2);
  assert.equal(tonRank('≥3 ngày'), 3);
  assert.equal(tonRank('≥4 ngày'), 4);
  assert.equal(tonRank('≥5 ngày'), 5);
  assert.equal(tonRank('≥7 ngày'), 7);
  assert.equal(tonRank('≥14 ngày'), 14);
  assert.equal(tonRank(''), null);
  assert.equal(tonRank(null), null);
});

test('canonicalLevel standardizes levels and maps correctly', () => {
  assert.equal(canonicalLevel('≥1.5 ngày'), '≥1.5 ngày');
  assert.equal(canonicalLevel('≥5 ngày'), '≥5 ngày');
  assert.equal(canonicalLevel('unknown'), '<1 ngày');
});

test('D10/D11: RED color scale is deeper with stock age and >=5 days is heavier alert', () => {
  for (const lvl of TON_LEVELS) {
    const config = getLevelConfig(lvl);
    assert.ok(config, `Missing config for ${lvl}`);
    assert.ok(config.chartColor, `Missing chartColor for ${lvl}`);
    assert.ok(config.bgClass, `Missing bgClass for ${lvl}`);
    assert.ok(config.textClass, `Missing textClass for ${lvl}`);

    const rank = tonRank(lvl);
    if (rank >= 5) {
      assert.equal(config.isAlert, true, `${lvl} must be alert`);
      assert.match(config.alertWeight, /heavy|heavier|heaviest/);
      assert.equal(isGe5Level(lvl), true);
    } else {
      assert.equal(config.isAlert, false, `${lvl} must not be alert`);
      assert.equal(isGe5Level(lvl), false);
    }
  }

  // Check distinct shades of red
  const colors = TON_LEVELS.map((lvl) => getLevelConfig(lvl).chartColor);
  const uniqueColors = new Set(colors);
  assert.equal(uniqueColors.size, TON_LEVELS.length, 'Every level must have a distinct tone in the color scale');
});

test('formatting helpers format slots, snapshots, numbers and currencies accurately', () => {
  assert.equal(formatSlot('0730'), '07:30');
  assert.equal(formatSlot('1130'), '11:30');
  assert.equal(formatSlot('2100'), '21:00');
  assert.equal(formatSlot(''), '');

  assert.equal(formatSnapshotLabel({ business_date: '2026-10-17', slot: '0730', is_stale: 0 }), '2026-10-17 07:30');
  assert.equal(formatSnapshotLabel({ business_date: '2026-10-17', slot: '0730', is_stale: 1 }), '2026-10-17 07:30 (chưa cập nhật)');
  assert.equal(formatSnapshotLabel(null), 'Chưa chọn mốc');

  assert.equal(formatNumber(4430), '4.430');
  assert.equal(formatNumber(0), '0');

  assert.equal(formatCurrency(12500000), '12.500.000 ₫');
  assert.equal(formatCurrency(0), '0 ₫');

  assert.equal(formatDelta(15), '+15');
  assert.equal(formatDelta(-4), '-4');
  assert.equal(formatDelta(0), '0');
});

test('buildOfficeTableRows and calculateOfficeTotals aggregate per-office metrics correctly', () => {
  const byOffice = [
    { office: 'Thuận Hóa', n: 100, cod: 25000000, n_ge5: 30 },
    { office: 'Phú Lộc', n: 50, cod: 10000000, n_ge5: 15 },
  ];
  const byOfficeLevel = [
    { office: 'Thuận Hóa', ton_level: '<1 ngày', n: 40 },
    { office: 'Thuận Hóa', ton_level: '≥1 ngày', n: 30 },
    { office: 'Thuận Hóa', ton_level: '≥5 ngày', n: 30 },
    { office: 'Phú Lộc', ton_level: '<1 ngày', n: 20 },
    { office: 'Phú Lộc', ton_level: '≥5 ngày', n: 15 },
    { office: 'Phú Lộc', ton_level: '≥7 ngày', n: 15 },
  ];
  const compareByOffice = [
    { office: 'Thuận Hóa', change: 'resolved', n: 5 },
    { office: 'Thuận Hóa', change: 'aged_up', n: 3 },
    { office: 'Thuận Hóa', change: 'new', n: 7 },
    { office: 'Phú Lộc', change: 'resolved', n: 2 },
    { office: 'Phú Lộc', change: 'aged_up', n: 1 },
    { office: 'Phú Lộc', change: 'new', n: 4 },
  ];

  const rows = buildOfficeTableRows(byOffice, byOfficeLevel, compareByOffice);
  assert.equal(rows.length, 2);

  const thuanHoa = rows.find((r) => r.office === 'Thuận Hóa');
  assert.ok(thuanHoa);
  assert.equal(thuanHoa.total, 100);
  assert.equal(thuanHoa.ge5, 30);
  assert.equal(thuanHoa.cod, 25000000);
  assert.equal(thuanHoa['<1 ngày'], 40);
  assert.equal(thuanHoa['≥1 ngày'], 30);
  assert.equal(thuanHoa['≥5 ngày'], 30);
  assert.equal(thuanHoa.resolved, 5);
  assert.equal(thuanHoa.aged_up, 3);
  assert.equal(thuanHoa.new, 7);

  const totals = calculateOfficeTotals(rows);
  assert.equal(totals.office, 'TỔNG CỘNG');
  assert.equal(totals.total, 150);
  assert.equal(totals.ge5, 45);
  assert.equal(totals.cod, 35000000);
  assert.equal(totals.resolved, 7);
  assert.equal(totals.aged_up, 4);
  assert.equal(totals.new, 11);
  assert.equal(totals['<1 ngày'], 60);
  assert.equal(totals['≥5 ngày'], 45);
});

test('sortOfficeRows orders rows accurately and stably', () => {
  const rows = [
    { office: 'Thuận Hóa', total: 100, cod: 50 },
    { office: 'Hương Thủy', total: 200, cod: 30 },
    { office: 'Phú Lộc', total: 50, cod: 80 },
  ];

  const sortedByTotalDesc = sortOfficeRows(rows, { field: 'total', direction: 'desc' });
  assert.deepEqual(sortedByTotalDesc.map((r) => r.office), ['Hương Thủy', 'Thuận Hóa', 'Phú Lộc']);

  const sortedByOfficeAsc = sortOfficeRows(rows, { field: 'office', direction: 'asc' });
  assert.deepEqual(sortedByOfficeAsc.map((r) => r.office), ['Hương Thủy', 'Phú Lộc', 'Thuận Hóa']);
});

test('CSV export properly escapes cells and builds valid BOM string', () => {
  assert.equal(escapeCsvCell('Hello'), '"Hello"');
  assert.equal(escapeCsvCell('He"llo'), '"He""llo"');
  assert.equal(escapeCsvCell('He,llo'), '"He,llo"');
  assert.equal(escapeCsvCell(null), '""');

  const headers = [
    { key: 'code', label: 'Mã bưu gửi' },
    { key: 'office', label: 'Bưu cục phát' },
  ];
  const rows = [
    { code: 'EH12345VN', office: 'Thuận Hóa' },
    { code: 'EH67890VN', office: 'Hương Thủy' },
  ];

  const csv = buildCsvContent(headers, rows);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Mã bưu gửi","Bưu cục phát"'));
  assert.ok(csv.includes('"EH12345VN","Thuận Hóa"'));
});

test('compare figures show a dash, not 0, when there is no base snapshot', () => {
  assert.equal(hasCompareBase(null), false);
  assert.equal(hasCompareBase({ summary: { resolved: 0 } }), false, 'summary without a base snapshot');
  assert.equal(compareValue(null, 'resolved'), '—');
  assert.equal(compareValue(undefined, 'new'), '—');
  const withBase = { from: { id: 1 }, summary: { resolved: 0, aged_up: 1234 } };
  assert.equal(hasCompareBase(withBase), true);
  assert.equal(compareValue(withBase, 'resolved'), '0', 'a real zero stays 0');
  assert.equal(compareValue(withBase, 'aged_up'), formatNumber(1234));
  assert.match(NO_BASE_NOTE, /Chưa có mốc so sánh/);
});

test('column presets hide the low-age levels; toggles and storage values are sanitised', async () => {
  const { presetHiddenLevels, visibleLevels, toggleHiddenLevel, activePresetId, sanitizeHiddenLevels } = await import('./hangtonLevels.js');
  assert.deepEqual(presetHiddenLevels('all'), []);
  assert.deepEqual(visibleLevels(presetHiddenLevels('ge3')), ['≥3 ngày', '≥4 ngày', '≥5 ngày', '≥7 ngày', '≥14 ngày']);
  assert.deepEqual(visibleLevels(presetHiddenLevels('ge5')), ['≥5 ngày', '≥7 ngày', '≥14 ngày']);
  const hidden = toggleHiddenLevel([], '≥2 ngày');
  assert.deepEqual(hidden, ['≥2 ngày']);
  assert.deepEqual(toggleHiddenLevel(hidden, '≥2 ngày'), [], 'second click shows the column again');
  assert.equal(activePresetId(presetHiddenLevels('ge5')), 'ge5');
  assert.equal(activePresetId(['≥2 ngày']), null, 'a custom choice matches no preset');
  assert.deepEqual(sanitizeHiddenLevels(['≥2 ngày', 'rác', 5]), ['≥2 ngày']);
  assert.deepEqual(sanitizeHiddenLevels('x'), []);
});

test('office table: empty-row colSpan follows the visible columns; hiding the sorted level resets the sort', async () => {
  const { officeTableColumnCount, sortAfterHide, buildOfficeTableRows, calculateOfficeTotals } = await import('./hangtonOfficeTableData.js');
  const { TON_LEVELS, presetHiddenLevels, visibleLevels } = await import('./hangtonLevels.js');
  assert.equal(officeTableColumnCount(TON_LEVELS.length), 16, 'all 9 levels: 1 + 9 + 3 + 3');
  assert.equal(officeTableColumnCount(visibleLevels(presetHiddenLevels('ge5')).length), 10, 'only ≥5, ≥7, ≥14');
  assert.equal(officeTableColumnCount(0), 7);
  const sorted = { field: '≥2 ngày', direction: 'asc' };
  assert.deepEqual(sortAfterHide(sorted, ['≥2 ngày']), { field: 'total', direction: 'desc' });
  assert.equal(sortAfterHide(sorted, ['≥1 ngày']), sorted, 'a visible sort column is kept');
  assert.deepEqual(sortAfterHide({ field: 'office', direction: 'asc' }, TON_LEVELS), { field: 'office', direction: 'asc' });
  // hiding levels changes the figures: totals, ≥5 and COD follow the shown levels; empty offices disappear
  const { applyVisibleLevels } = await import('./hangtonOfficeTableData.js');
  const rows = buildOfficeTableRows(
    [{ office: 'A', n: 7, cod: 700, n_ge5: 2 }, { office: 'B', n: 3, cod: 30, n_ge5: 0 }],
    [
      { office: 'A', ton_level: '<1 ngày', n: 3, cod: 300 }, { office: 'A', ton_level: '≥3 ngày', n: 2, cod: 200 },
      { office: 'A', ton_level: '≥5 ngày', n: 1, cod: 100 }, { office: 'A', ton_level: '≥14 ngày', n: 1, cod: 100 },
      { office: 'B', ton_level: '<1 ngày', n: 3, cod: 30 },
    ],
    [],
  );
  assert.equal(applyVisibleLevels(rows, TON_LEVELS), rows, 'all levels shown: rows unchanged');
  assert.equal(calculateOfficeTotals(rows).total, 10);
  const ge3 = applyVisibleLevels(rows, visibleLevels(presetHiddenLevels('ge3')));
  assert.deepEqual(ge3.map((r) => r.office), ['A'], 'B has stock only below 3 days: it disappears');
  assert.deepEqual([ge3[0].total, ge3[0].ge5, ge3[0].cod], [4, 2, 400]);
  const totals = calculateOfficeTotals(ge3);
  assert.deepEqual([totals.total, totals.ge5, totals.cod], [4, 2, 400], 'TỔNG CỘNG follows the shown levels');
  const ge5 = applyVisibleLevels(rows, visibleLevels(presetHiddenLevels('ge5')));
  assert.deepEqual([ge5[0].total, ge5[0].ge5, ge5[0].cod], [2, 2, 200]);
  assert.deepEqual(applyVisibleLevels(rows, []), [], 'no level shown: no row');
});

test('tab resolution: unknown tab falls back to the overview', async () => {
  const { resolveHangtonTab, isHangtonTab, HANGTON_TAB_IDS } = await import('./hangtonTabs.js');
  assert.deepEqual([...HANGTON_TAB_IDS], ['overview', 'office', 'compare', 'items']);
  assert.equal(resolveHangtonTab('items'), 'items');
  assert.equal(resolveHangtonTab('foo'), 'overview');
  assert.equal(resolveHangtonTab(undefined), 'overview');
  assert.equal(isHangtonTab('foo'), false);
});

test('drill-down from a figure of the office table: which parcels it lists', async () => {
  const { drillDownFilter } = await import('./hangtonOfficeTableData.js');
  const { TON_LEVELS, presetHiddenLevels, visibleLevels } = await import('./hangtonLevels.js');
  const one = drillDownFilter({ office: 'BCVH Thuận Hóa', kind: 'level', level: '≥5 ngày', shownLevels: TON_LEVELS });
  assert.deepEqual(one.levels, ['≥5 ngày']);
  assert.equal(one.office, 'BCVH Thuận Hóa');
  assert.equal(one.title, 'BCVH Thuận Hóa — ≥5 ngày');
  const ge3 = visibleLevels(presetHiddenLevels('ge3'));
  assert.deepEqual(drillDownFilter({ office: 'A', kind: 'total', shownLevels: ge3 }).levels, ge3, 'Tổng tồn = the shown levels');
  assert.match(drillDownFilter({ office: 'A', kind: 'total', shownLevels: ge3 }).title, /các mức đang hiển thị/);
  assert.equal(drillDownFilter({ office: 'A', kind: 'total', shownLevels: TON_LEVELS }).title, 'A — Tổng tồn');
  assert.deepEqual(drillDownFilter({ office: 'A', kind: 'ge5', shownLevels: TON_LEVELS }).levels, ['≥5 ngày', '≥7 ngày', '≥14 ngày']);
  assert.deepEqual(drillDownFilter({ office: 'A', kind: 'ge5', shownLevels: ge3 }).levels, ['≥5 ngày', '≥7 ngày', '≥14 ngày']);
  const all = drillDownFilter({ office: null, kind: 'level', level: '≥7 ngày' });
  assert.equal(all.office, null, 'the TỔNG CỘNG row covers every office');
  assert.match(all.title, /^Toàn BĐT TP Huế — ≥7 ngày$/);
});

test('items query parameters: empty values dropped, levels joined with a bar', async () => {
  const { buildItemsParams } = await import('./hangtonExport.js');
  assert.deepEqual(buildItemsParams({ snapshotId: 7 }), { id: 7 });
  assert.deepEqual(
    buildItemsParams({ snapshotId: 7, office: 'BCVH Phú Lộc', levels: ['≥5 ngày', '≥7 ngày'], minRank: '', status: '', sort: 'rank', dir: 'desc', limit: 100, offset: 0 }),
    { id: 7, office: 'BCVH Phú Lộc', levels: '≥5 ngày|≥7 ngày', sort: 'rank', dir: 'desc', limit: 100, offset: 0 },
  );
  assert.equal(buildItemsParams({ snapshotId: 1, levels: [] }).levels, undefined);
  assert.equal(buildItemsParams({ snapshotId: 1, minRank: 5 }).min_rank, 5);
});

test('customer groups: handling order, toggling, stored selection, API parameter, chart mode and stacked chart rows', async () => {
  const c = await import('./hangtonCustomers.js');
  const { TON_LEVELS } = await import('./hangtonLevels.js');
  const rows = [{ customer_class: 'KH Thường' }, { customer_class: 'Nhóm lạ' }, { customer_class: 'KH Shopee' }, { customer_class: 'KH Trọng điểm' }];
  assert.deepEqual(c.sortCustomerGroups(rows).map((r) => r.customer_class), ['KH Trọng điểm', 'KH Shopee', 'KH Thường', 'Nhóm lạ'], 'key accounts first, unknown last');
  assert.deepEqual(c.toggleCustomer([], 'KH Mới'), ['KH Mới']);
  assert.deepEqual(c.toggleCustomer(['KH Mới', 'KH Shopee'], 'KH Mới'), ['KH Shopee']);
  assert.deepEqual(c.sanitizeSelectedCustomers(['KH Mới', 'KH Mới', 5, '', 'X']), ['KH Mới', 'X']);
  assert.deepEqual(c.sanitizeSelectedCustomers(['KH Mới', 'X'], ['KH Mới']), ['KH Mới']);
  assert.deepEqual(c.sanitizeSelectedCustomers('rác'), []);
  assert.equal(c.customersParam([]), undefined);
  assert.equal(c.customersParam(['KH Mới', 'KH Shopee']), 'KH Mới|KH Shopee');
  assert.equal(c.chartMode([]), 'levels');
  assert.equal(c.chartMode(['KH Mới']), 'levels', 'one group keeps the red stock-age chart');
  assert.equal(c.chartMode(['KH Mới', 'KH Shopee']), 'groups');
  const chart = c.buildCustomerChart(
    [
      { ton_level: '≥5 ngày', customer_class: 'KH Mới', n: 3 },
      { ton_level: '≥5 ngày', customer_class: 'KH Shopee', n: 2 },
      { ton_level: '<1 ngày', customer_class: 'KH Mới', n: 7 },
      { ton_level: '≥5 ngày', customer_class: 'KH Thường', n: 99 },
    ],
    ['KH Mới', 'KH Shopee'],
  );
  assert.equal(chart.data.length, TON_LEVELS.length, 'one row per level, empty levels included');
  assert.deepEqual(chart.series.map((s) => s.key), ['KH Shopee', 'KH Mới'], 'series follow the handling order');
  const ge5 = chart.data.find((r) => r.level === '≥5 ngày');
  assert.deepEqual([ge5['KH Mới'], ge5['KH Shopee'], ge5.total], [3, 2, 5], 'groups that are not selected never enter the chart');
  assert.equal(chart.data.find((r) => r.level === '≥14 ngày').total, 0);
  assert.ok(chart.series.every((s) => /^#[0-9A-F]{6}$/i.test(s.color)));
  assert.notEqual(c.customerColor('KH Mới'), c.customerColor('KH Shopee'));
});

test('items parameters carry the selected customer groups', async () => {
  const { buildItemsParams } = await import('./hangtonExport.js');
  assert.equal(buildItemsParams({ snapshotId: 1, customers: ['KH Mới', 'KH Shopee'] }).customers, 'KH Mới|KH Shopee');
  assert.equal(buildItemsParams({ snapshotId: 1, customers: [] }).customers, undefined);
});

test('chart levels: the stacked chart is limited to the shown levels (default from 3 days), totals follow', async () => {
  const c = await import('./hangtonCustomers.js');
  const { presetHiddenLevels, visibleLevels } = await import('./hangtonLevels.js');
  const byLevelCustomer = [
    { ton_level: '<1 ngày', customer_class: 'KH Mới', n: 400 },
    { ton_level: '≥2 ngày', customer_class: 'KH Mới', n: 90 },
    { ton_level: '≥3 ngày', customer_class: 'KH Mới', n: 20 },
    { ton_level: '≥3 ngày', customer_class: 'KH Shopee', n: 5 },
    { ton_level: '≥14 ngày', customer_class: 'KH Shopee', n: 1 },
  ];
  const ge3 = visibleLevels(presetHiddenLevels('ge3'));
  const chart = c.buildCustomerChart(byLevelCustomer, ['KH Mới', 'KH Shopee'], ge3);
  assert.deepEqual(chart.data.map((r) => r.level), ['≥3 ngày', '≥4 ngày', '≥5 ngày', '≥7 ngày', '≥14 ngày'], 'levels below 3 days are not drawn');
  assert.deepEqual(chart.data.map((r) => r.total), [25, 0, 0, 0, 1]);
  const custom = c.buildCustomerChart(byLevelCustomer, ['KH Mới', 'KH Shopee'], ['<1 ngày', '≥14 ngày']);
  assert.deepEqual(custom.data.map((r) => r.level), ['<1 ngày', '≥14 ngày'], 'any chosen levels, in ascending order');
  assert.equal(c.buildCustomerChart(byLevelCustomer, ['KH Mới'], []).data.length, 0, 'no level chosen: nothing to draw');
});
