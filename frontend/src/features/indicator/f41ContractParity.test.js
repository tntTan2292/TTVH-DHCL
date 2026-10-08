import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { mapBcvhRankingResponse } from '../dashboard/components/unifiedBcvhAnalysisTableData.js';
import { processOverviewData } from '../ranking/bcvhOverviewData.js';
import { setActiveIndicator } from './activeIndicator.js';
import { F41_INDICATOR } from './indicatorConfig.js';

afterEach(() => setActiveIndicator(null));

// Shapes below are exactly what backend F41RankingService.getBcvhRanking / getOverview return:
// no route_distribution, no late-cash fields, routes: [] (F4.1 has no route dimension).
const rankingRow = {
  ma_bcvh: '533140',
  ten_bcvh: 'BCVH Thuận Hóa',
  total_bg: 2184,
  passed_rate: 68.4,
  total_failed: 539,
  sl_bg_ptc: 2184,
  dat_kpi_2026: 1494,
  khong_dat_kpi_2026: 539,
  kpi_2026: 68.4,
  kpi_2026_dod: 1.2,
  kpi_2026_swc: -0.5,
  month_to_date_sl_bg_ptc: 2184,
  month_to_date_dat_kpi_2026: 1494,
  month_to_date_khong_dat_kpi_2026: 539,
  month_to_date_kpi_2026: 68.4,
  previous_month_to_date_sl_bg_ptc: null,
  previous_month_to_date_dat_kpi_2026: null,
  previous_month_to_date_kpi_2026: null,
  comparisons: {
    d1: { volume: 2000, f1_3_rate: 67.2, volume_delta: 184, comparison_rank: 2, rank_movement: { comparison_rank: 2, delta: 1, direction: 'improved' } },
    d7: { volume: null, f1_3_rate: null, volume_delta: null, comparison_rank: null, rank_movement: { comparison_rank: null, delta: null, direction: 'unavailable' } },
  },
  rank: 1,
};

const totalRow = {
  ten_bcvh: 'TỔNG CỘNG',
  sl_bg_ptc: 4694,
  dat_kpi_2026: 2862,
  khong_dat_kpi_2026: 1581,
  kpi_2026: 61,
  kpi_2026_dod: null,
  kpi_2026_swc: null,
  comparisons: {
    d1: { volume: null, f1_3_rate: null, volume_delta: null, rate_delta: null, coverage: { available_rows: 0, canonical_total: 6, is_partial: false, is_complete: false } },
    d7: { volume: null, f1_3_rate: null, volume_delta: null, rate_delta: null, coverage: { available_rows: 0, canonical_total: 6, is_partial: false, is_complete: false } },
  },
};

test('the F1.3 ranking mapper accepts the F4.1 ranking payload (no route / late-cash fields)', () => {
  setActiveIndicator(F41_INDICATOR);
  const mapped = mapBcvhRankingResponse(
    { data: [rankingRow], meta: { total_row: totalRow, national_rank: { rank: 22, total: 34 } } },
    { fromDate: '2026-08-01', toDate: '2026-08-01' },
  );
  assert.equal(mapped.rows.length, 1);
  const [row] = mapped.rows;
  assert.equal(row.current_day.volume, 2184);
  assert.equal(row.current_day.pass_count, 1494);
  assert.equal(row.current_day.fail_count, 539);
  assert.equal(row.current_day.rate, 68.4);
  assert.equal(row.current_day.signal.id, 'yellow'); // 68.4 is in the F4.1 yellow band (60-70)
  assert.equal(row.comparisons.d1.rate_delta, 1.2);
  assert.equal(row.route_distribution.participating_postman_route_count, 0);
  assert.equal(mapped.total_row.current_day.volume, 4694);
  assert.deepEqual(mapped.meta.national_rank, { rank: 22, total: 34 });
});

test('the F1.3 overview mapper accepts the F4.1 overview payload with an empty routes list', () => {
  const data = {
    monthly: [{ month: '2026-08', label: 'T8', ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', volume: 100, passed: 61, failed: 30, rate: 61, days_with_data: 31, days_in_period: 31 }],
    daily: [{ date: '2026-08-01', ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', volume: 10, passed: 6, failed: 3, rate: 60 }],
    mtd: [{ ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', volume: 10, passed: 6, failed: 3, rate: 60, rank: 1, previous_month_to_date: { volume: 0, passed: 0, rate: null }, previous_full_month: { volume: 0, passed: 0, rate: null } }],
    routes: [],
  };
  const processed = processOverviewData(data, { national_rank: { monthly: { '2026-08': { rank: 22, total: 34 } } } });
  assert.ok(processed);
  assert.equal(processed.months.length, 1);
  assert.deepEqual(processed.monthlyChartData[0].national_rank, { rank: 22, total: 34 });
});
