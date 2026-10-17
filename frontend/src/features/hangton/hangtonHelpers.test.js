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
