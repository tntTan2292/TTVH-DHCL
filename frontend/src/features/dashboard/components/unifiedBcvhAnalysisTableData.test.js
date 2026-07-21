import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  formatDelta,
  formatRateDelta,
  formatVolumeDelta,
  mapBcvhRankingResponse,
  mapBcvhRankingRow,
  UNAVAILABLE_TEXT,
} from './unifiedBcvhAnalysisTableData.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const vn = {
  unavailable: 'Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u',
  thuanHoa: 'BCVH Thu\u1eadn H\u00f3a',
  tongCong: 'T\u1ed4NG C\u1ed8NG',
  aLuoi: 'BCVH A L\u01b0\u1edbi',
  thuanAn: 'BCVH Thu\u1eadn An',
  warning: 'C\u1ea3nh b\u00e1o t\u1eeb h\u1ee3p \u0111\u1ed3ng hi\u1ec7n c\u00f3',
  mtdGroup: 'L\u0168Y K\u1ebe TH\u00c1NG \u2014 01/07\u201318/07/2026',
  mtdGroupLatest: 'L\u0168Y K\u1ebe TH\u00c1NG \u2014 01/07\u201318/07/2026 \u00b7 d\u1eef li\u1ec7u g\u1ea7n nh\u1ea5t',
  evaluation: 'NG\u00c0Y \u0110\u00c1NH GI\u00c1 \u2014 18/07/2026',
  evaluationLatest: 'NG\u00c0Y \u0110\u00c1NH GI\u00c1 \u2014 18/07/2026 \u00b7 d\u1eef li\u1ec7u g\u1ea7n nh\u1ea5t',
  diem: '\u0111i\u1ec3m %',
  mtdHeader: 'L\u0168Y K\u1ebe TH\u00c1NG',
  evaluationHeader: 'NG\u00c0Y \u0110\u00c1NH GI\u00c1',
  comparisonHeader: 'SO S\u00c1NH NG\u00c0Y \u0110\u00c1NH GI\u00c1',
  volume: 'S\u1ea3n l\u01b0\u1ee3ng',
  passRate: 'T\u1ef7 l\u1ec7 \u0111\u1ea1t',
  chiTiet: 'Chi ti\u1ebft',
  loading: '\u0110ang t\u1ea3i b\u1ea3ng ph\u00e2n t\u00edch BCVH',
  loadError: 'Kh\u00f4ng th\u1ec3 t\u1ea3i b\u1ea3ng ph\u00e2n t\u00edch BCVH',
  empty: 'Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u BCVH',
};

const sourceText = {
  mtdHeader: 'L\\u0168Y K\\u1ebe TH\\u00c1NG',
  evaluationHeader: 'NG\\u00c0Y \\u0110\\u00c1NH GI\\u00c1',
  volume: 'S\\u1ea3n l\\u01b0\\u1ee3ng',
  passRate: 'T\\u1ef7 l\\u1ec7 \\u0111\\u1ea1t',
  volumeDelta: '\\u0394 SL',
  rateDelta: '\\u0394 T\\u1ef7 l\\u1ec7',
  columnOptions: 'T\\u00f9y ch\\u1ecdn c\\u1ed9t',
  compact: 'G\\u1ecdn',
  defaultPreset: 'M\\u1eb7c \\u0111\\u1ecbnh',
  chiTiet: 'Chi ti\\u1ebft',
  loading: '\\u0110ang t\\u1ea3i b\\u1ea3ng ph\\u00e2n t\\u00edch BCVH',
  loadError: 'Kh\\u00f4ng th\\u1ec3 t\\u1ea3i b\\u1ea3ng ph\\u00e2n t\\u00edch BCVH',
  empty: 'Kh\\u00f4ng c\\u00f3 d\\u1eef li\\u1ec7u BCVH',
  filterLabel: 'Theo b\\u1ed9 l\\u1ecdc',
};

const badFragments = [
  'L' + String.fromCharCode(0x00c5),
  'T' + String.fromCharCode(0x00e1) + String.fromCharCode(0x00bb),
  'S' + String.fromCharCode(0x00e1) + String.fromCharCode(0x00ba),
  String.fromCharCode(0x00c4) + String.fromCharCode(0x2018),
  'd' + String.fromCharCode(0x00e1) + String.fromCharCode(0x00bb),
  'Ch' + String.fromCharCode(0x00c6),
  'Kh' + String.fromCharCode(0x00c3),
  String.fromCharCode(0x00c2),
  'Theo b' + String.fromCharCode(0x1ed9) + ' l' + String.fromCharCode(0x1ecdc),
];

test('maps ranking row using only existing authoritative evaluation-day fields', () => {
  const row = mapBcvhRankingRow({
    ma_bcvh: '533140',
    ten_bcvh: vn.thuanHoa,
    rank: 1,
    sl_bg_ptc: 1694,
    dat_kpi_2026: 1252,
    khong_dat_kpi_2026: 373,
    kpi_2026: 73.91,
    kpi_2026_dod: -1.49,
    kpi_2026_swc: 6.37,
  }, {
    fromDate: '2026-07-15',
    toDate: '2026-07-15',
    interval: 'daily',
    maBcvh: 'all',
  });

  assert.equal(row.ma_bcvh, '533140');
  assert.equal(row.ten_bcvh, vn.thuanHoa);
  assert.equal(row.total_volume, 1694);
  assert.equal(row.pass_count, 1252);
  assert.equal(row.fail_count, 373);
  assert.equal(row.returned_count, 69);
  assert.equal(row.current_kpi, 73.91);
  assert.equal(row.warning.label, UNAVAILABLE_TEXT);
  assert.equal(row.action.route, '/f13/ranking/route');
});

test('calculates chuyen hoan for row and total reconciliation', () => {
  const mapped = mapBcvhRankingResponse({
    success: true,
    data: [
      { ma_bcvh: 'aggregate-evidence', ten_bcvh: 'BCVH evidence', sl_bg_ptc: 3677, dat_kpi_2026: 2471, khong_dat_kpi_2026: 1037 },
      { ma_bcvh: 'row-evidence', ten_bcvh: 'BCVH row', sl_bg_ptc: 100, dat_kpi_2026: 70, khong_dat_kpi_2026: 20 },
    ],
    meta: {
      total_row: { ten_bcvh: vn.tongCong, sl_bg_ptc: 3677, dat_kpi_2026: 2471, khong_dat_kpi_2026: 1037 },
    },
  });

  assert.equal(mapped.rows[0].returned_count, 169);
  assert.equal(mapped.rows[0].total_volume, mapped.rows[0].pass_count + mapped.rows[0].fail_count + mapped.rows[0].returned_count);
  assert.equal(mapped.rows[1].returned_count, 10);
  assert.equal(mapped.total_row.returned_count, 169);
});

test('separates month-to-date fields from evaluation-day fields', () => {
  const mapped = mapBcvhRankingResponse({
    success: true,
    data: [{
      ma_bcvh: '533140',
      ten_bcvh: vn.thuanHoa,
      rank: 1,
      sl_bg_ptc: 120,
      dat_kpi_2026: 90,
      khong_dat_kpi_2026: 20,
      kpi_2026: 75,
      month_to_date_sl_bg_ptc: 1800,
      month_to_date_dat_kpi_2026: 1260,
      month_to_date_khong_dat_kpi_2026: 400,
      month_to_date_kpi_2026: 70,
      previous_month_to_date_sl_bg_ptc: 1500,
      previous_month_to_date_dat_kpi_2026: 1125,
      previous_month_to_date_kpi_2026: 75,
    }],
    meta: {
      month_to_date: { from_date: '2026-07-01', to_date: '2026-07-18', requested_to_date: '2026-07-18', current_data_date: '2026-07-18', used_latest_available: false, available: true },
      evaluation_date: { date: '2026-07-18', requested_to_date: '2026-07-18', used_latest_available: false, available: true },
      previous_month_to_date: { from_date: '2026-06-01', to_date: '2026-06-18', available: true },
      total_row: { ten_bcvh: vn.tongCong, sl_bg_ptc: 120, dat_kpi_2026: 90, khong_dat_kpi_2026: 20, kpi_2026: 75, month_to_date_sl_bg_ptc: 1800, month_to_date_dat_kpi_2026: 1260, month_to_date_khong_dat_kpi_2026: 400, month_to_date_kpi_2026: 70, previous_month_to_date_sl_bg_ptc: 1500, previous_month_to_date_dat_kpi_2026: 1125, previous_month_to_date_kpi_2026: 75 },
    },
  }, { fromDate: '2026-07-10', toDate: '2026-07-18' });

  assert.equal(mapped.rows[0].month_to_date.total_volume, 1800);
  assert.equal(mapped.rows[0].month_to_date.pass_count, 1260);
  assert.equal(mapped.rows[0].month_to_date.fail_count, 400);
  assert.equal(mapped.rows[0].month_to_date.pass_rate, 70);
  assert.equal(mapped.rows[0].month_to_date.previous_total_volume, 1500);
  assert.equal(mapped.rows[0].month_to_date.previous_pass_rate, 75);
  assert.equal(Number(mapped.rows[0].month_to_date.volume_delta_percent.toFixed(1)), 20);
  assert.equal(mapped.rows[0].month_to_date.pass_rate_delta_points, -5);
  assert.equal(mapped.rows[0].total_volume, 120);
  assert.equal(mapped.rows[0].pass_count, 90);
  assert.equal(mapped.rows[0].fail_count, 20);
  assert.notEqual(mapped.rows[0].month_to_date.total_volume, mapped.rows[0].total_volume);
  assert.notEqual(mapped.rows[0].month_to_date.pass_rate, mapped.rows[0].current_kpi);
  assert.equal(mapped.total_row.month_to_date.total_volume, 1800);
  assert.equal(mapped.total_row.month_to_date.fail_count, 400);
  assert.equal(mapped.total_row.total_volume, 120);
  assert.equal(mapped.meta.month_to_date.group_label, vn.mtdGroup);
  assert.equal(mapped.meta.evaluation_date.label, vn.evaluation);
});

test('formats month-to-date comparison deltas and unavailable previous period', () => {
  assert.equal(formatVolumeDelta(20), '+20,0% · Tăng');
  assert.equal(formatVolumeDelta(-5.5), '-5,5% · Giảm');
  assert.equal(formatVolumeDelta(0), '0,0% · Không đổi');
  assert.equal(formatVolumeDelta(null), vn.unavailable);
  assert.equal(formatRateDelta(1.25), '+1,25 điểm % · Tốt hơn');
  assert.equal(formatRateDelta(-2), '-2,00 điểm % · Giảm');
  assert.equal(formatRateDelta(0), '0,00 điểm % · Không đổi');

  const mapped = mapBcvhRankingRow({
    ma_bcvh: 'zero-prev',
    ten_bcvh: 'BCVH zero',
    month_to_date_sl_bg_ptc: 10,
    month_to_date_dat_kpi_2026: 5,
    month_to_date_kpi_2026: 50,
    previous_month_to_date_sl_bg_ptc: 0,
    previous_month_to_date_dat_kpi_2026: 0,
    previous_month_to_date_kpi_2026: null,
  });
  assert.equal(mapped.month_to_date.volume_delta_percent, null);
  assert.equal(mapped.month_to_date.pass_rate_delta_points, null);
});

test('labels latest available cutoff for both month-to-date and evaluation date', () => {
  const mapped = mapBcvhRankingResponse({
    success: true,
    data: [],
    meta: {
      month_to_date: { from_date: '2026-07-01', to_date: '2026-07-18', requested_to_date: '2026-07-20', current_data_date: '2026-07-18', used_latest_available: true, available: true },
      evaluation_date: { date: '2026-07-18', requested_to_date: '2026-07-20', used_latest_available: true, available: true },
    },
  }, { fromDate: '2026-07-18', toDate: '2026-07-20' });

  assert.equal(mapped.meta.month_to_date.group_label, vn.mtdGroupLatest);
  assert.equal(mapped.meta.evaluation_date.label, vn.evaluationLatest);
});

test('preserves unavailable and warning-source boundaries', () => {
  const lowKpiRow = mapBcvhRankingRow({ ma_bcvh: '535790', ten_bcvh: vn.aLuoi, rank: 6, total_bg: 100, total_passed: 49, total_failed: 51, passed_rate: 49 });
  assert.equal(lowKpiRow.warning.label, UNAVAILABLE_TEXT);
  assert.equal(lowKpiRow.warning.source, 'unavailable');

  const warningRow = mapBcvhRankingRow({ ma_bcvh: '537015', ten_bcvh: vn.thuanAn, warning_level: 'quality-pulse', warning_label: vn.warning });
  assert.equal(warningRow.warning.label, vn.warning);
});

test('preserves rank ordering, context, formatting and detail action', () => {
  const mapped = mapBcvhRankingResponse({
    success: true,
    data: [
      { ma_bcvh: 'B', ten_bcvh: 'B', rank: 2, sl_bg_ptc: 5 },
      { ma_bcvh: 'A', ten_bcvh: 'A', rank: 1, sl_bg_ptc: 4 },
    ],
    meta: { total_row: { ten_bcvh: vn.tongCong, sl_bg_ptc: 9, dat_kpi_2026: 6, khong_dat_kpi_2026: 3, kpi_2026: 66.7 } },
  }, { fromDate: '2026-07-14', toDate: '2026-07-15', maBcvh: 'all' });

  assert.deepEqual(mapped.rows.map((row) => row.ma_bcvh), ['A', 'B']);
  assert.equal(mapped.meta.default_order, 'rank_asc');
  assert.equal(mapped.total_row.total_volume, 9);
  assert.equal(formatDelta(0), `0.00 ${vn.diem}`);
  assert.equal(formatDelta(1.25), `+1.25 ${vn.diem}`);
  assert.equal(mapped.rows[0].action.route, '/f13/ranking/route');
});

test('component source has two grouped headers, no filter-group label, and clean Vietnamese text', () => {
  const componentSource = read('./UnifiedBcvhAnalysisTable.jsx');
  const dataSource = read('./unifiedBcvhAnalysisTableData.js');
  const adapterSource = read('./BcvhOperationTableAdapter.jsx');

  assert.match(adapterSource, /UnifiedBcvhAnalysisTable/);
  for (const text of [sourceText.mtdHeader, sourceText.evaluationHeader, sourceText.volume, sourceText.passRate, sourceText.volumeDelta, sourceText.rateDelta, sourceText.columnOptions, sourceText.compact, sourceText.defaultPreset, sourceText.chiTiet, sourceText.loading, sourceText.loadError, sourceText.empty]) {
    assert.ok(componentSource.includes(text) || componentSource.includes(text.replace('...', '')), `Expected component source to include: ${text}`);
  }
  assert.ok(componentSource.indexOf("'dayVolume'") < componentSource.indexOf("'mtdVolume'"));
  assert.equal(componentSource.includes(sourceText.filterLabel), false);
  assert.match(componentSource, /STORAGE_KEY/);
  assert.match(componentSource, /qis\.unifiedBcvhAnalysisTable\.columns\.v3/);
  assert.match(componentSource, /compact:\s*\['bcvh', 'dayVolume', 'dayPass', 'dayRate', 'd1', 'd7', 'mtdVolume', 'mtdRate', 'action'\]/);
  assert.match(componentSource, /default:\s*\['bcvh', 'dayVolume', 'dayPass', 'dayRate', 'd1', 'd7', 'supplemental', 'mtdVolume', 'mtdVolumeDelta', 'mtdRate', 'mtdRateDelta', 'action'\]/);
  assert.doesNotMatch(componentSource, /full:\s*\[/);
  assert.doesNotMatch(componentSource, /PRESETS\.full/);
  assert.doesNotMatch(componentSource, /TEXT\.full/);
  assert.doesNotMatch(componentSource, /\u0110\u1ea7y \u0111\u1ee7|\\u0110\\u1ea7y \\u0111\\u1ee7/);
  assert.match(componentSource, /JSON\.stringify\(\{ preset, columns: normalized \}\)/);
  assert.match(componentSource, /readStoredColumns\(\)\.columns/);
  assert.match(componentSource, /colSpan=\{mtdCount\}/);
  assert.match(componentSource, /colSpan=\{dayCount\}/);
  assert.doesNotMatch(componentSource, /TEXT\.fail/);
  assert.doesNotMatch(componentSource, /mtdPass/);
  assert.doesNotMatch(componentSource, /Không đạt|Kh\\u00f4ng \\u0111\\u1ea1t/);
  for (const fragment of badFragments) {
    assert.equal(componentSource.includes(fragment), false, `Component contains mojibake or removed label fragment: ${fragment}`);
    assert.equal(dataSource.includes(fragment), false, `Data helper contains mojibake or removed label fragment: ${fragment}`);
  }
  assert.doesNotMatch(componentSource, />=\s*70|>=\s*60|>=\s*50|<\s*50/);
});
