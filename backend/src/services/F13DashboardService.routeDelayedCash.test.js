const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('./F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');

// Route A: one Không đạt delayed (>3h), one Không đạt exactly-3h (not delayed), one BLACK
// (Chuyển hoàn) with valid timestamps and a large gap that WOULD qualify as delayed if it
// were included — it must be excluded entirely (SSOT correction: Chuyển hoàn never goes
// through the cash-remittance workflow, so it is not part of the delayed-cash population
// at all, neither numerator nor denominator) — and one Đạt (always excluded).
const ROUTE_A_FACTS = [
  { ma_tuyen: 'A', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 12:00:01' },
  { ma_tuyen: 'A', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 11:00:00' },
  { ma_tuyen: 'A', danh_gia_2026: null, thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' },
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
  assert.equal(row.delayed_cash_handover_eligible_count, 2);
  assert.equal(row.f13_303_rate, Number(((1 / 2) * 100).toFixed(1)));
}));

test('a gap strictly greater than 3 hours counts as delayed; exactly 3 hours does not', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => ROUTE_A_FACTS;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  // Only the >3h01s Không đạt fact is delayed; the exactly-3h Không đạt fact is not -> count stays at 1.
  assert.equal(result.data[0].delayed_cash_handover_count, 1);
}));

test('SSOT correction: Chuyển hoàn (BLACK) is excluded from the delayed-cash population entirely, even when its own timestamps would otherwise qualify as delayed', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => ROUTE_A_FACTS;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  const row = result.data[0];
  // Denominator = 2 (Không đạt only); the BLACK fact (24h gap, would qualify) contributes to neither.
  assert.equal(row.delayed_cash_handover_eligible_count, 2);
  assert.equal(row.delayed_cash_handover_count, 1);
}));

test('missing/invalid timestamps on a Không đạt fact stay in the denominator but are never counted as delayed', withMocks(async () => {
  const facts = [
    { ma_tuyen: 'A', danh_gia_2026: 'Không đạt', thoi_gian_ptc: null, thoi_gian_nop_tien: null },
    { ma_tuyen: 'A', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 12:00:01' },
  ];
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 2, total_passed: 0, total_failed: 2, total_returned: 0 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => facts;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  const row = result.data[0];
  assert.equal(row.delayed_cash_handover_eligible_count, 2);
  assert.equal(row.delayed_cash_handover_count, 1);
}));

test('Đạt shipments never enter the delayed-cash denominator', withMocks(async () => {
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'A', ten_tuyen: 'Tuyến A', total_bg: 4, total_passed: 1, total_failed: 2, total_returned: 1 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => ROUTE_A_FACTS;

  const result = await service.getRouteRanking('2026-07-28', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
  // total_bg is 4 but eligible denominator is 2 -> the Đạt fact and the BLACK fact were both excluded.
  assert.equal(result.data[0].delayed_cash_handover_eligible_count, 2);
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

test('a route made only of Chuyển hoàn facts also publishes a zero eligible denominator and 0%', withMocks(async () => {
  const facts = [
    { ma_tuyen: 'C', danh_gia_2026: null, thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' },
    { ma_tuyen: 'C', danh_gia_2026: null, thoi_gian_ptc: null, thoi_gian_nop_tien: null },
  ];
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: 'C', ten_tuyen: 'Tuyến C', total_bg: 2, total_passed: 0, total_failed: 0, total_returned: 2 }],
    totalItems: 1,
  });
  repo.getRouteRankingFacts = async () => facts;

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

  assert.equal(rowA.delayed_cash_handover_eligible_count, 2);
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
  // Route A: 1/2 = 50%; Route B: 0/0 (excluded from denominator entirely).
  // Aggregate must be Sum(1)/Sum(2) = 50%, not average(50%, 0%) = 25%.
  assert.equal(result.meta.delayed_cash_handover_summary.delayed_cash_handover_count, 1);
  assert.equal(result.meta.delayed_cash_handover_summary.delayed_cash_handover_eligible_count, 2);
  assert.equal(result.meta.delayed_cash_handover_summary.f13_303_rate, 50);
  assert.notEqual(result.meta.delayed_cash_handover_summary.f13_303_rate, 25);
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
  assert.equal(result.meta.delayed_cash_handover_summary.delayed_cash_handover_eligible_count, 2);
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
