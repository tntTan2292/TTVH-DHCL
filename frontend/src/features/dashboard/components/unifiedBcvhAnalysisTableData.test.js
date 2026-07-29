import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildDoughnutAriaLabel,
  DASH,
  formatNumber,
  formatRate,
  formatSignedDelta,
  formatVolumeDelta,
  KPI_STATUS_META,
  mapBcvhRankingResponse,
  mapBcvhRankingRow,
  ROUTE_BAND_META,
  UNAVAILABLE_TEXT,
} from './unifiedBcvhAnalysisTableData.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('maps runtime row into current-day, D-1, D-7, late-cash, route, and analysis groups', () => {
  const row = mapBcvhRankingRow({
    ma_bcvh: '533140',
    ten_bcvh: 'BCVH Thuận Hóa',
    rank: 1,
    sl_bg_ptc: 120,
    dat_kpi_2026: 90,
    khong_dat_kpi_2026: 30,
    kpi_2026: 75,
    kpi_2026_dod: 1.25,
    kpi_2026_swc: -2.5,
    delayed_cash_handover_count: 3,
    f13_303_rate: 10,
    route_distribution: {
      participating_postman_route_count: 8,
      green_route_count: 2,
      pink_route_count: 1,
      yellow_route_count: 3,
      red_route_count: 2,
    },
    comparisons: {
      d1: {
        volume: 100,
        f1_3_rate: 70,
        volume_delta: 20,
        comparison_rank: 2,
        rank_movement: { comparison_rank: 2, delta: 1, direction: 'improved' },
      },
      d7: {
        volume: 130,
        f1_3_rate: 77.5,
        volume_delta: -10,
        comparison_rank: 1,
        rank_movement: { comparison_rank: 1, delta: -1, direction: 'declined' },
      },
    },
  }, {
    fromDate: '2026-07-28',
    toDate: '2026-07-28',
    interval: 'daily',
    maBcvh: 'all',
  });

  assert.equal(row.current_day.volume, 120);
  assert.equal(row.current_day.pass_count, 90);
  assert.equal(row.current_day.fail_count, 30);
  assert.equal(row.current_day.rate, 75);
  assert.equal(row.current_day.signal.label, 'Tốt');
  assert.equal(row.comparisons.d1.volume, 100);
  assert.equal(row.comparisons.d1.rate, 70);
  assert.equal(row.comparisons.d1.volume_delta, 20);
  assert.equal(row.comparisons.d1.rate_delta, 1.25);
  assert.equal(row.comparisons.d1.rank_movement.signal.shortLabel, '↑ 1');
  assert.equal(row.comparisons.d7.rank_movement.signal.shortLabel, '↓ 1');
  assert.equal(row.late_cash.count, 3);
  assert.equal(row.late_cash.rate, 10);
  assert.equal(row.route_distribution.participating_postman_route_count, 8);
  assert.equal(row.route_distribution.counts.pink, 1);
  assert.equal(row.route_distribution.segments.length, 4);
  assert.match(row.analysis, /KPI ngày 75,0%/);
  assert.match(row.analysis, /khá 1/);
  assert.equal(row.action.route, '/f13/ranking/route');
});

test('maps total row without exposing raw total and preserves valid aggregate values', () => {
  const mapped = mapBcvhRankingResponse({
    success: true,
    data: [
      { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', rank: 1, sl_bg_ptc: 10, dat_kpi_2026: 8, khong_dat_kpi_2026: 2 },
      { ma_bcvh: 'non-canonical', ten_bcvh: 'Ignore', rank: 99, sl_bg_ptc: 1, dat_kpi_2026: 1, khong_dat_kpi_2026: 0 },
    ],
    meta: {
      total_row: {
        sl_bg_ptc: 10,
        dat_kpi_2026: 8,
        khong_dat_kpi_2026: 2,
        kpi_2026: 80,
        delayed_cash_handover_count: 1,
        f13_303_rate: 5.5,
        route_distribution: {
          participating_postman_route_count: 4,
          green_route_count: 1,
          pink_route_count: 1,
          yellow_route_count: 1,
          red_route_count: 1,
        },
      },
    },
  }, {
    fromDate: '2026-07-28',
    toDate: '2026-07-28',
    interval: 'daily',
    maBcvh: 'all',
  });

  assert.deepEqual(mapped.rows.map((row) => row.ma_bcvh), ['533140']);
  assert.equal(mapped.total_row.is_total, true);
  assert.equal(mapped.total_row.ma_bcvh, '');
  assert.equal(mapped.total_row.ten_bcvh, 'Tổng cộng');
  assert.equal(mapped.total_row.rank, null);
  assert.equal(mapped.total_row.action, null);
  assert.equal(mapped.total_row.analysis, null);
  assert.equal(mapped.total_row.current_day.volume, 10);
  assert.equal(mapped.total_row.current_day.pass_count, 8);
  assert.equal(mapped.total_row.current_day.fail_count, 2);
  assert.equal(mapped.total_row.current_day.rate, 80);
  assert.equal(mapped.total_row.current_day.signal.label, 'Tốt');
  assert.equal(mapped.total_row.late_cash.count, 1);
  assert.equal(mapped.total_row.late_cash.rate, 5.5);
  assert.equal(mapped.total_row.route_distribution.participating_postman_route_count, 4);
  assert.equal(mapped.total_row.route_distribution.counts.pink, 1);
  assert.match(mapped.meta.evaluation_label, /28\/07/);
});

test('renders unsupported total-row fields as dash and unavailable row fields as factual unavailable', () => {
  const row = mapBcvhRankingRow({
    ma_bcvh: '535790',
    ten_bcvh: 'BCVH A Lưới',
    comparisons: {
      d1: { volume: null, f1_3_rate: null, volume_delta: null, comparison_rank: null, rank_movement: { direction: 'unavailable', delta: null } },
      d7: { volume: null, f1_3_rate: null, volume_delta: null, comparison_rank: null, rank_movement: { direction: 'unavailable', delta: null } },
    },
  });

  assert.equal(formatNumber(null), UNAVAILABLE_TEXT);
  assert.equal(formatRate(null), UNAVAILABLE_TEXT);
  assert.equal(formatSignedDelta(null, 'điểm %'), UNAVAILABLE_TEXT);
  assert.equal(formatVolumeDelta(null), UNAVAILABLE_TEXT);
  assert.equal(formatNumber(null, true), DASH);
  assert.equal(formatRate(null, true), DASH);
  assert.equal(formatSignedDelta(null, 'điểm %', true), DASH);
  assert.equal(formatVolumeDelta(null, true), DASH);
  assert.equal(row.comparisons.d1.rank_movement.signal.label, DASH);
  assert.match(row.analysis, /Chưa có dữ liệu/);
});

test('keeps KPI 2026 SSOT labels separate from route-distribution labels', () => {
  assert.deepEqual(
    KPI_STATUS_META.map((item) => item.label),
    ['Tốt', 'Cần chú ý', 'Cảnh báo', 'Rủi ro cao'],
  );
  assert.deepEqual(
    Object.values(ROUTE_BAND_META).map((item) => item.label),
    ['Tốt', 'Khá', 'Trung bình', 'Kém'],
  );
  assert.notEqual(KPI_STATUS_META[1].label, ROUTE_BAND_META.pink.label);
  assert.notEqual(KPI_STATUS_META[2].label, ROUTE_BAND_META.yellow.label);
});

test('builds semantic four-band doughnut labels and preserves SSOT colors', () => {
  assert.equal(ROUTE_BAND_META.green.label, 'Tốt');
  assert.equal(ROUTE_BAND_META.pink.label, 'Khá');
  assert.equal(ROUTE_BAND_META.yellow.label, 'Trung bình');
  assert.equal(ROUTE_BAND_META.red.label, 'Kém');
  assert.equal(ROUTE_BAND_META.pink.color, '#ec4899');
  assert.equal(
    buildDoughnutAriaLabel({
      segments: [
        { label: 'Tốt', value: 2 },
        { label: 'Khá', value: 1 },
        { label: 'Trung bình', value: 3 },
        { label: 'Kém', value: 2 },
      ],
    }),
    'Tốt 2 · Khá 1 · Trung bình 3 · Kém 2',
  );
});

test('component sources preserve dashboard isolation, total-row polish, and semantic separation', () => {
  const componentSource = read('./UnifiedBcvhAnalysisTable.jsx');
  const pageSource = read('../../ranking/BcvhRankingPage.jsx');
  const dashboardSource = read('../../../components/f13/BcvhOperationTable.jsx');
  const dashboardAdapterSource = read('./BcvhOperationTableAdapter.jsx');

  assert.match(componentSource, /expandedRowId/);
  assert.match(componentSource, /AnalysisPanel/);
  assert.match(componentSource, /onToggleAnalysis/);
  assert.match(componentSource, /row\.is_total/);
  assert.match(componentSource, /Xem chi tiết tuyến/);
  assert.match(componentSource, /Phân tích/);
  assert.match(componentSource, /sticky left-0/);
  assert.match(componentSource, /sticky left-\[68px\]/);
  assert.match(componentSource, /sticky left-\[176px\]/);
  assert.match(componentSource, /font-black uppercase tracking-wide/);
  assert.doesNotMatch(componentSource, /<th[^>]*>.*Phân tích BCVH.*<\/th>/s);
  assert.doesNotMatch(componentSource, />total</);
  assert.doesNotMatch(componentSource, /Chưa có dữ liệu[\s\S]*Tổng cộng[\s\S]*Chưa có dữ liệu/);

  assert.match(pageSource, /Bảng xếp hạng chất lượng BCVH/);
  assert.match(pageSource, /So sánh kỳ trước/);
  assert.match(pageSource, /Xem chi tiết tuyến/);
  assert.match(pageSource, /Khá/);
  assert.match(pageSource, /Trung bình/);
  assert.match(pageSource, /Kém/);
  assert.doesNotMatch(pageSource, /Ngày đánh giá · Ngày đánh giá/);
  assert.doesNotMatch(pageSource, /KPI \/ chậm nộp \/ hạng độc lập/);
  assert.doesNotMatch(pageSource, /Wave 1|contract/i);

  assert.match(dashboardAdapterSource, /<BcvhOperationTable/);
  assert.doesNotMatch(dashboardAdapterSource, /<UnifiedBcvhAnalysisTable/);
  assert.doesNotMatch(dashboardSource, /Phân tích BCVH|Xem chi tiết tuyến|Doughnut|So sánh D-1|So sánh D-7/);
});
