import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildDoughnutAriaLabel,
  formatNumber,
  formatRate,
  formatSignedDelta,
  formatVolumeDelta,
  mapBcvhRankingResponse,
  mapBcvhRankingRow,
  ROUTE_BAND_META,
  UNAVAILABLE_TEXT,
} from './unifiedBcvhAnalysisTableData.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('maps Wave 1 runtime row into current-day, D-1, D-7, late-cash, route, and analysis groups', () => {
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
  assert.match(row.analysis, /hồng 1/);
  assert.equal(row.action.route, '/f13/ranking/route');
});

test('maps total row and preserves canonical filtering only', () => {
  const mapped = mapBcvhRankingResponse({
    success: true,
    data: [
      { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', rank: 1, sl_bg_ptc: 10, dat_kpi_2026: 8, khong_dat_kpi_2026: 2 },
      { ma_bcvh: 'non-canonical', ten_bcvh: 'Ignore', rank: 99, sl_bg_ptc: 1, dat_kpi_2026: 1, khong_dat_kpi_2026: 0 },
    ],
    meta: {
      total_row: {
        ten_bcvh: 'TỔNG CỘNG',
        sl_bg_ptc: 10,
        dat_kpi_2026: 8,
        khong_dat_kpi_2026: 2,
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
  assert.equal(mapped.total_row.ma_bcvh, 'total');
  assert.equal(mapped.total_row.route_distribution.counts.pink, 1);
  assert.match(mapped.meta.evaluation_label, /Ngày đánh giá/);
});

test('formats unavailable states and factual deltas without fallback', () => {
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
  assert.equal(row.comparisons.d1.rank_movement.signal.label, UNAVAILABLE_TEXT);
  assert.match(row.analysis, /Chưa có dữ liệu/);
});

test('builds four-band doughnut aria label and preserves pink band metadata', () => {
  assert.equal(ROUTE_BAND_META.pink.label, 'Hồng');
  assert.equal(ROUTE_BAND_META.pink.color, '#ec4899');
  assert.equal(
    buildDoughnutAriaLabel({
      segments: [
        { label: 'Xanh', value: 2 },
        { label: 'Hồng', value: 1 },
        { label: 'Vàng', value: 3 },
        { label: 'Đỏ', value: 2 },
      ],
    }),
    'Xanh 2 · Hồng 1 · Vàng 3 · Đỏ 2',
  );
});

test('Wave 2 component source exposes grouped columns, 4-band route cells, doughnut, and hideable D-1/D-7 raw columns', () => {
  const componentSource = read('./UnifiedBcvhAnalysisTable.jsx');
  const pageSource = read('../../ranking/BcvhRankingPage.jsx');

  assert.match(componentSource, /Kết quả ngày đánh giá/);
  assert.match(componentSource, /So sánh D-1/);
  assert.match(componentSource, /So sánh D-7/);
  assert.match(componentSource, /Chậm nộp tiền/);
  assert.match(componentSource, /Phân bổ tuyến/);
  assert.match(componentSource, /Phân tích BCVH/);
  assert.match(componentSource, /routeDistribution/);
  assert.match(componentSource, /routePink: 'Tuyến hồng'/);
  assert.match(componentSource, /DoughnutCell/);
  assert.match(componentSource, /PieChart/);
  assert.match(componentSource, /Cell key=\{segment\.id\} fill=\{segment\.color\}/);
  assert.match(componentSource, /qis\.bcvhRankingWave2\.columns\.v1/);
  assert.match(componentSource, /d1Volume: true/);
  assert.match(componentSource, /d1Rate: true/);
  assert.match(componentSource, /d7Volume: true/);
  assert.match(componentSource, /d7Rate: true/);
  assert.match(componentSource, /'D-1 \/ Sản lượng'/);
  assert.match(componentSource, /'D-7 \/ Tỷ lệ F1\.3'/);
  assert.match(pageSource, /UnifiedBcvhAnalysisTable/);
  assert.match(pageSource, /4 dải tuyến giữ nguyên/);
  assert.match(pageSource, /Drill-down giữ nguyên context Route Ranking/);
});
