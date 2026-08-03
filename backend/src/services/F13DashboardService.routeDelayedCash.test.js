const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('./F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');

// Route A: one delayed (>3h), one exactly-3h (not delayed), one BLACK with missing timestamps
// (stays in denominator, not numerator), one Đạt (excluded from denominator entirely).
const ROUTE_A_FACTS = [
  { ma_tuyen: 'A', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 12:00:01' },
  { ma_tuyen: 'A', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 11:00:00' },
  { ma_tuyen: 'A', danh_gia_2026: null, thoi_gian_ptc: null, thoi_gian_nop_tien: null },
  { ma_tuyen: 'A', danh_gia_2026: 'Đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' },
];

// Route B: all Đạt -> zero eligible denominator.
const ROUTE_B_FACTS = [
  { ma_tuyen: 'B', danh_gia_2026: 'Đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 08:30:00' },
  { ma_tuyen: 'B', danh_gia_2026: 'Đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 08:30:00' },
];

function withMocks(fn) {
  return async () => {
    const originalGetRouteRanking = repo.getRouteRanking;
    const originalGetRouteRankingFacts = repo.getRouteRankingFacts;
    try {
      await fn({ originalGetRouteRanking, originalGetRouteRankingFacts });
    } finally {
      repo.getRouteRanking = originalGetRouteRanking;
      repo.getRouteRankingFacts = originalGetRouteRankingFacts;
    }
  };
}

test('route row exposes delayed_cash_handover_count, eligible_count, and f13_303_rate', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => ROUTE_A_FACTS;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  const row = result.data[0];

  assert.equal(row.delayed_cash_handover_count, 1);
  assert.equal(row.delayed_cash_handover_eligible_count, 3);
  assert.equal(row.f13_303_rate, Number(((1 / 3) * 100).toFixed(1)));
}));

test('a gap strictly greater than 3 hours counts as delayed; exactly 3 hours does not', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => ROUTE_A_FACTS;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  // Only the >3h01s fact is delayed; the exactly-3h fact is not -> count stays at 1.
  assert.equal(result.data[0].delayed_cash_handover_count, 1);
}));

test('missing/invalid timestamps stay in the denominator but are never counted as delayed', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => ROUTE_A_FACTS;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  const row = result.data[0];
  // 3 non-Đạt facts (2 Không đạt + 1 BLACK with missing timestamps) => denominator 3; only 1 delayed.
  assert.equal(row.delayed_cash_handover_eligible_count, 3);
  assert.equal(row.delayed_cash_handover_count, 1);
}));

test('Đạt shipments never enter the delayed-cash denominator', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => ROUTE_A_FACTS;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  // total_bg is 4 but eligible denominator is 3 -> the 1 Đạt fact was excluded.
  assert.equal(result.data[0].delayed_cash_handover_eligible_count, 3);
}));

test('zero eligible denominator publishes 0%, not null or a fallback value', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'B', ten_tuyen: 'Tuyến B', total_bg: 2, total_passed: 2, total_failed: 0, total_returned: 0 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => ROUTE_B_FACTS;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  const row = result.data[0];
  assert.equal(row.delayed_cash_handover_eligible_count, 0);
  assert.equal(row.delayed_cash_handover_count, 0);
  assert.equal(row.f13_303_rate, 0);
}));

test('each route only counts its own facts (no cross-route leakage)', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [
      { ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 },
      { ma_tuyen: 'B', ten_tuyen: 'Tuyến B', total_bg: 2, total_passed: 2, total_failed: 0, total_returned: 0 },
    ],
    totalItems: 2,
  });
  repo.getRouteRankingFacts = async () => [...ROUTE_A_FACTS, ...ROUTE_B_FACTS];

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  const rowA = result.data.find((r) => r.ma_tuyen === 'A');
  const rowB = result.data.find((r) => r.ma_tuyen === 'B');

  assert.equal(rowA.delayed_cash_handover_eligible_count, 3);
  assert.equal(rowA.delayed_cash_handover_count, 1);
  assert.equal(rowB.delayed_cash_handover_eligible_count, 0);
  assert.equal(rowB.delayed_cash_handover_count, 0);
}));

test('aggregate rate is Sum(delayed)/Sum(eligible) across routes, not an average of per-route rates', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [
      { ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 },
      { ma_tuyen: 'B', ten_tuyen: 'Tuyến B', total_bg: 2, total_passed: 2, total_failed: 0, total_returned: 0 },
    ],
    totalItems: 2,
  });
  repo.getRouteRankingFacts = async () => [...ROUTE_A_FACTS, ...ROUTE_B_FACTS];

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  // Route A: 1/3 = 33.3%; Route B: 0/0 (excluded from denominator entirely).
  // Aggregate must be Sum(1)/Sum(3) = 33.3%, not average(33.3%, 0%) = 16.65%.
  assert.equal(result.meta.delayed_cash_handover_summary.delayed_cash_handover_count, 1);
  assert.equal(result.meta.delayed_cash_handover_summary.delayed_cash_handover_eligible_count, 3);
  assert.equal(result.meta.delayed_cash_handover_summary.f13_303_rate, Number(((1 / 3) * 100).toFixed(1)));
  assert.notEqual(result.meta.delayed_cash_handover_summary.f13_303_rate, 16.65);
}));

test('the aggregate uses the full unpaginated fact scope even when the route list is paginated to one row', withMocks(async () => {
  // Simulate pagination: only route B's aggregated row comes back from getRouteRanking (page 2, size 1),
  // but the raw facts fetch is never paginated -> it must still cover both routes A and B.
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'B', ten_tuyen: 'Tuyến B', total_bg: 2, total_passed: 2, total_failed: 0, total_returned: 0 }],
    totalItems: 2,
  });
  repo.getRouteRankingFacts = async () => [...ROUTE_A_FACTS, ...ROUTE_B_FACTS];

  const result = await service.getRouteRanking('2026-07-28', '533140', 2, 1, 'total_bg', 'desc', { routeType: 'all' });

  // The visible page has only route B, but the aggregate must still reflect route A's contribution too.
  assert.equal(result.data.length, 1);
  assert.equal(result.meta.delayed_cash_handover_summary.delayed_cash_handover_count, 1);
  assert.equal(result.meta.delayed_cash_handover_summary.delayed_cash_handover_eligible_count, 3);
}));

test('the existing route-classification/exclusion filter is passed through unchanged to the facts fetch', withMocks(async () => {
  const observedFactsCalls = [];
  repo.getRouteRanking = async () => ({ data: [], totalItems: 0 });
  repo.getRouteRankingFacts = async (date, bcvh, options) => {
    observedFactsCalls.push({ date, bcvh, options });
    return [];
  };

  await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'postman' });

  assert.equal(observedFactsCalls.length, 1);
  assert.equal(observedFactsCalls[0].date, '2026-07-28');
  assert.equal(observedFactsCalls[0].bcvh, '533140');
  assert.equal(observedFactsCalls[0].options.routeType, 'postman');
  assert.ok(Array.isArray(observedFactsCalls[0].options.confirmedNonPostmanRouteCodes));
}));
