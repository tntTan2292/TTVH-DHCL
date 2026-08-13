const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const service = require('./F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');
const dashboardController = require('../controllers/DashboardController');

test('dashboard KPI filters canonical ma_bcvh values and keeps all aggregated', async () => {
    const original = repo.getKpiMetrics;
    const originalNationalRank = service._getNationalRankSummary;
    const calls = [];

    repo.getKpiMetrics = async (startDate, endDate, filters = {}) => {
    calls.push({ startDate, endDate, filters });
    if (filters.bcvhId === '535790') {
      return { total_bg: 10, total_passed: 8, total_failed: 2 };
    }
    if (filters.bcvhId === '536250') {
      return { total_bg: 20, total_passed: 10, total_failed: 10 };
        }
        return { total_bg: 30, total_passed: 21, total_failed: 9 };
    };
    service._getNationalRankSummary = async (endDate) => ({ available: false, requested_period: endDate });

  try {
    const allResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', {});
    const firstResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', { bcvhId: '535790' });
    const secondResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', { bcvhId: '536250' });

    const primaryCalls = calls.filter((call) => call.startDate === '2026-07-01' && call.endDate === '2026-07-15');
    assert.equal(primaryCalls.length, 3);
    assert.equal(primaryCalls[0].filters.bcvhId, null);
    assert.equal(primaryCalls[1].filters.bcvhId, '535790');
    assert.equal(primaryCalls[2].filters.bcvhId, '536250');
    assert.equal(allResult.total_bg, 30);
    assert.equal(firstResult.total_bg, 10);
    assert.equal(secondResult.total_bg, 20);
    assert.notDeepEqual(firstResult, secondResult);
    assert.equal(allResult.total_bg, 30);
    assert.equal(allResult.total_passed, 21);
    assert.equal(allResult.total_failed, 9);
    assert.equal(allResult.total_unknown, 0);
    assert.equal(allResult.passed_rate, 70);
    assert.equal(allResult.failed_rate, 30);
    assert.ok(Object.hasOwn(allResult, 'national_rank'));
    assert.ok(Object.hasOwn(allResult, 'comparisons'));
    } finally {
        repo.getKpiMetrics = original;
        service._getNationalRankSummary = originalNationalRank;
    }
});

test('dashboard KPI comparison contract reports both D-1 and D-7 when data exists', async () => {
  const original = repo.getKpiMetrics;
  const originalNationalRank = service._getNationalRankSummary;

  repo.getKpiMetrics = async (startDate) => {
    if (startDate === '2026-07-22') return { total_bg: 100, total_passed: 89, total_failed: 11 };
    if (startDate === '2026-07-21') return { total_bg: 100, total_passed: 65, total_failed: 35 };
    if (startDate === '2026-07-15') return { total_bg: 100, total_passed: 83, total_failed: 17 };
    return { total_bg: 0, total_passed: 0, total_failed: 0 };
  };
  service._getNationalRankSummary = async () => ({ available: false });

  try {
    const result = await service.getDashboardKpi('2026-07-22', '2026-07-22', {});

    assert.equal(result.comparisons.d1.available, true);
    assert.equal(result.comparisons.d1.previous_date, '2026-07-21');
    assert.equal(result.comparisons.d1.pass_rate.delta, 24);
    assert.equal(result.comparisons.d7.available, true);
    assert.equal(result.comparisons.d7.previous_date, '2026-07-15');
    assert.equal(result.comparisons.d7.pass_rate.delta, 6);
  } finally {
    repo.getKpiMetrics = original;
    service._getNationalRankSummary = originalNationalRank;
  }
});

test('dashboard KPI comparison contract keeps D-1 unavailable when prior day is missing', async () => {
  const original = repo.getKpiMetrics;
  const originalNationalRank = service._getNationalRankSummary;

  repo.getKpiMetrics = async (startDate) => {
    if (startDate === '2026-07-22') return { total_bg: 100, total_passed: 89, total_failed: 11 };
    if (startDate === '2026-07-21') return { total_bg: 0, total_passed: 0, total_failed: 0 };
    if (startDate === '2026-07-15') return { total_bg: 100, total_passed: 83, total_failed: 17 };
    return { total_bg: 0, total_passed: 0, total_failed: 0 };
  };
  service._getNationalRankSummary = async () => ({ available: false });

  try {
    const result = await service.getDashboardKpi('2026-07-22', '2026-07-22', {});

    assert.equal(result.comparisons.d1.available, false);
    assert.equal(result.comparisons.d1.pass_rate, null);
    assert.equal(result.comparisons.d7.available, true);
  } finally {
    repo.getKpiMetrics = original;
    service._getNationalRankSummary = originalNationalRank;
  }
});

test('dashboard KPI comparison contract keeps D-7 unavailable when prior week is missing', async () => {
  const original = repo.getKpiMetrics;
  const originalNationalRank = service._getNationalRankSummary;

  repo.getKpiMetrics = async (startDate) => {
    if (startDate === '2026-07-22') return { total_bg: 100, total_passed: 89, total_failed: 11 };
    if (startDate === '2026-07-21') return { total_bg: 100, total_passed: 65, total_failed: 35 };
    if (startDate === '2026-07-15') return { total_bg: 0, total_passed: 0, total_failed: 0 };
    return { total_bg: 0, total_passed: 0, total_failed: 0 };
  };
  service._getNationalRankSummary = async () => ({ available: false });

  try {
    const result = await service.getDashboardKpi('2026-07-22', '2026-07-22', {});

    assert.equal(result.comparisons.d1.available, true);
    assert.equal(result.comparisons.d7.available, false);
    assert.equal(result.comparisons.d7.total_volume, null);
  } finally {
    repo.getKpiMetrics = original;
    service._getNationalRankSummary = originalNationalRank;
  }
});

test('dashboard KPI comparison contract keeps both comparisons unavailable when prior rows are missing', async () => {
  const original = repo.getKpiMetrics;
  const originalNationalRank = service._getNationalRankSummary;

  repo.getKpiMetrics = async (startDate) => {
    if (startDate === '2026-07-22') return { total_bg: 100, total_passed: 89, total_failed: 11 };
    return { total_bg: 0, total_passed: 0, total_failed: 0 };
  };
  service._getNationalRankSummary = async () => ({ available: false });

  try {
    const result = await service.getDashboardKpi('2026-07-22', '2026-07-22', {});

    assert.equal(result.comparisons.d1.available, false);
    assert.equal(result.comparisons.d7.available, false);
    assert.equal(result.comparisons.d1.pass_rate, null);
    assert.equal(result.comparisons.d7.pass_rate, null);
  } finally {
    repo.getKpiMetrics = original;
    service._getNationalRankSummary = originalNationalRank;
  }
});

test('dashboard KPI passes selected date range to nationwide ranking summary', async () => {
  const original = repo.getKpiMetrics;
  const originalNationalRank = service._getNationalRankSummary;
  let rankCall = null;

  repo.getKpiMetrics = async () => ({ total_bg: 100, total_passed: 80, total_failed: 20 });
  service._getNationalRankSummary = async (startDate, endDate) => {
    rankCall = { startDate, endDate };
    return {
      available: true,
      rank: 2,
      total: 34,
      period: `${startDate}..${endDate}`,
      period_start: startDate,
      period_end: endDate,
      period_type: 'selected_range',
    };
  };

  try {
    const result = await service.getDashboardKpi('2026-07-10', '2026-07-19', {});

    assert.deepEqual(rankCall, { startDate: '2026-07-10', endDate: '2026-07-19' });
    assert.equal(result.national_rank.period_start, '2026-07-10');
    assert.equal(result.national_rank.period_end, '2026-07-19');
  } finally {
    repo.getKpiMetrics = original;
    service._getNationalRankSummary = originalNationalRank;
  }
});

test('nationwide ranking contract uses exact selected date or cumulative selected range without latest fallback', () => {
  const source = fs.readFileSync(require.resolve('./F13DashboardService'), 'utf8');

  assert.match(source, /_getNationalRankSummary\(startDate, endDate\)/);
  assert.match(source, /_getNationalRankForDate\(endDate, provinceCode\)/);
  assert.match(source, /_getNationalRankForRange\(startDate, endDate, provinceCode\)/);
  assert.match(source, /WHERE ngay_do_kiem BETWEEN \? AND \?/);
  assert.match(source, /SUM\(sl_ptc_dung_qd_ct\) \* 1\.0 \/ NULLIF\(SUM\(sl_bg_ptc\), 0\)/);
  assert.doesNotMatch(source, /WHERE ngay_do_kiem <= \?/);
  assert.match(source, /await this\._getNationalRankSummary\(startDate, endDate\)/);
});

test('daily trend enriches all-network rows with backend-provided exact-day nationwide rank', async () => {
  const originals = {
    getLatestImportMeta: repo.getLatestImportMeta,
    getDailyTrendData: repo.getDailyTrendData,
    getNationalRanksForDates: service.getNationalRanksForDates,
  };
  let rankDates = null;

  repo.getLatestImportMeta = async () => ({ ngay_do_kiem: '2026-07-20', created_at: '2026-07-20T00:00:00Z' });
  repo.getDailyTrendData = async () => ([
    { date: '2026-07-19', total_volume: 10, passed: 8, failed: 2, quality_rate: 80, data_available: 1 },
    { date: '2026-07-20', total_volume: 11, passed: 9, failed: 2, quality_rate: 81.82, data_available: 1 },
  ]);
  service.getNationalRanksForDates = async (dates) => {
    rankDates = dates;
    return {
      '2026-07-19': { available: true, rank: 24, total: 34, period: '2026-07-19' },
      '2026-07-20': { available: false, message: 'Chưa có dữ liệu xếp hạng toàn quốc cho ngày 2026-07-20' },
    };
  };

  try {
    const result = await service.getDailyTrend('2026-07-19', '2026-07-20', {});

    assert.deepEqual(rankDates, ['2026-07-19', '2026-07-20']);
    assert.equal(result.items[0].national_rank.rank, 24);
    assert.equal(result.items[0].national_rank.total, 34);
    assert.equal(result.items[1].national_rank.available, false);
    assert.match(result.items[1].national_rank.message, /Chưa có dữ liệu xếp hạng toàn quốc/);
  } finally {
    repo.getLatestImportMeta = originals.getLatestImportMeta;
    repo.getDailyTrendData = originals.getDailyTrendData;
    service.getNationalRanksForDates = originals.getNationalRanksForDates;
  }
});

test('daily trend suppresses province-level nationwide rank when a BCVH filter is active', async () => {
  const originals = {
    getLatestImportMeta: repo.getLatestImportMeta,
    getDailyTrendData: repo.getDailyTrendData,
    getNationalRanksForDates: service.getNationalRanksForDates,
  };
  let rankCalled = false;

  repo.getLatestImportMeta = async () => ({ ngay_do_kiem: '2026-07-20' });
  repo.getDailyTrendData = async () => ([
    { date: '2026-07-20', total_volume: 11, passed: 9, failed: 2, quality_rate: 81.82, data_available: 1 },
  ]);
  service.getNationalRanksForDates = async () => {
    rankCalled = true;
    return {};
  };

  try {
    const result = await service.getDailyTrend('2026-07-20', '2026-07-20', { bcvhId: '535790' });

    assert.equal(rankCalled, false);
    assert.equal(Object.hasOwn(result.items[0], 'national_rank'), false);
    assert.equal(result.meta.filters.bcvh_id, '535790');
  } finally {
    repo.getLatestImportMeta = originals.getLatestImportMeta;
    repo.getDailyTrendData = originals.getDailyTrendData;
    service.getNationalRanksForDates = originals.getNationalRanksForDates;
  }
});

test('daily nationwide rank helper uses one batched query and Checkpoint 004 ordering', () => {
  const source = fs.readFileSync(require.resolve('./F13DashboardService'), 'utf8');

  assert.match(source, /getNationalRanksForDates\(dates = \[\]\)/);
  assert.match(source, /WHERE ngay_do_kiem IN \(\$\{placeholders\}\)/);
  assert.match(source, /ORDER BY ngay_do_kiem ASC, tl_ptc_dung_qd_ct DESC, sl_bg_ptc DESC/);
  assert.doesNotMatch(source, /for \(const date.*await this\._getNationalRankForDate/s);
});

test('monthly nationwide rank helper uses one batched range query and cumulative C004 ordering', () => {
  const source = fs.readFileSync(require.resolve('./F13DashboardService'), 'utf8');
  const helperSource = source.slice(
    source.indexOf('async getNationalRanksForPeriods'),
    source.indexOf('async _getNationalRankSummary'),
  );

  assert.match(source, /getNationalRanksForPeriods\(periods = \[\]\)/);
  assert.match(source, /WHERE ngay_do_kiem BETWEEN \? AND \?/);
  assert.match(source, /sl_ptc_dung_qd_ct \/ b\.sl_bg_ptc|sl_ptc_dung_qd_ct \/ a\.sl_bg_ptc/);
  assert.match(source, /return b\.sl_bg_ptc - a\.sl_bg_ptc/);
  assert.match(source, /_applyMonthlyRankMovements\(normalizedPeriods, ranksByMonth\)/);
  assert.doesNotMatch(helperSource, /await this\._getNationalRankForRange/);
});

test('monthly nationwide rank movement treats smaller numeric rank as improvement', () => {
  const ranked = service._applyMonthlyRankMovements([
    { month: '2026-05' },
    { month: '2026-06' },
    { month: '2026-07' },
    { month: '2026-08' },
  ], {
    '2026-05': { available: true, period: '2026-05', rank: 12, total: 34 },
    '2026-06': { available: true, period: '2026-06', rank: 9, total: 34 },
    '2026-07': { available: true, period: '2026-07', rank: 14, total: 34 },
    '2026-08': { available: true, period: '2026-08', rank: 14, total: 34 },
  });

  assert.equal(ranked['2026-05'].movement, null);
  assert.equal(ranked['2026-06'].movement, 3);
  assert.equal(ranked['2026-06'].movement_label, '↑ 3 hạng');
  assert.equal(ranked['2026-07'].movement, -5);
  assert.equal(ranked['2026-07'].movement_label, '↓ 5 hạng');
  assert.equal(ranked['2026-08'].movement, 0);
  assert.equal(ranked['2026-08'].movement_label, 'Không đổi');
});

test('monthly nationwide rank movement is skipped when adjacent rank is unavailable', () => {
  const ranked = service._applyMonthlyRankMovements([
    { month: '2026-06' },
    { month: '2026-07' },
    { month: '2026-08' },
  ], {
    '2026-06': { available: true, period: '2026-06', rank: 9, total: 34 },
    '2026-07': { available: false, message: 'Chưa có dữ liệu xếp hạng tháng' },
    '2026-08': { available: true, period: '2026-08', rank: 7, total: 34 },
  });

  assert.equal(ranked['2026-07'].movement, null);
  assert.equal(ranked['2026-08'].movement, null);
  assert.equal(ranked['2026-08'].previous_rank, null);
});

test('dashboard controller forwards ma_bcvh to the KPI service path', async () => {
  const original = service.getDashboardKpi;
  let captured = null;

  service.getDashboardKpi = async (fromDate, toDate, filters = {}) => {
    captured = { fromDate, toDate, filters };
    return { total_bg: 1, passed_rate: 100, failed_rate: 0 };
  };

  try {
    const req = { query: { from_date: '2026-07-01', to_date: '2026-07-15', ma_bcvh: '535790' } };
    let payload = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        payload = body;
      },
    };

    await dashboardController.getKpi(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(captured, {
      fromDate: '2026-07-01',
      toDate: '2026-07-15',
      filters: { bcvhId: '535790' },
    });
    assert.equal(payload.success, true);
  } finally {
    service.getDashboardKpi = original;
  }
});

test('BCVH ranking does not fall back to latest data for a no-data selected date', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };
  const calls = [];

  repo.getBcvhOperationMetricsByDate = async (date) => {
    calls.push({ method: 'getBcvhOperationMetricsByDate', date });
    return [];
  };
  repo.getBcvhRanking = async (fromDate, toDate) => {
    calls.push({ method: 'getBcvhRanking', fromDate, toDate });
    return { data: [], totalItems: 0 };
  };
  repo.getFactByDate = async (date) => {
    calls.push({ method: 'getFactByDate', date });
    return [];
  };
  repo.getFactBetween = async (fromDate, toDate) => {
    calls.push({ method: 'getFactBetween', fromDate, toDate });
    return [];
  };
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    calls.push({ method: 'getBcvhOperationMetricsBetween', startDate, endDate });
    return [];
  };

  try {
    // Single-day request: from_date === to_date === '2026-07-23' (BCVH Ranking's contract).
    const result = await service.getBcvhRanking('2026-07-23', '2026-07-23', 1, 1000, 'rank', 'asc');

    assert.deepEqual(result.data, []);
    assert.equal(result.meta.evaluation_date.date, '2026-07-23');
    assert.equal(result.meta.evaluation_date.used_latest_available, false);
    assert.equal(result.meta.evaluation_date.available, false);
    assert.equal(result.meta.month_to_date.available, false);
    assert.equal(result.meta.month_to_date.to_date, null);
    assert.equal(result.meta.total_row.kpi_2026_dod, null);
    assert.equal(result.meta.total_row.kpi_2026_swc, null);
    assert.equal(calls.some((call) => call.method === 'getBcvhRanking' && call.fromDate === '2026-07-22'), false);
    // currentMetrics is now sourced from getBcvhOperationMetricsBetween(fromDate, toDate) — it
    // IS called, for the requested single day (fromDate === toDate); it genuinely has no data.
    assert.equal(
      calls.some((call) => call.method === 'getBcvhOperationMetricsBetween' && call.startDate === '2026-07-23' && call.endDate === '2026-07-23'),
      true
    );
    // The month-to-date range (a *different* range: monthStart..cutoff) must still not fire,
    // since the selected day has no data — no fallback to a latest-available day.
    assert.equal(
      calls.some((call) => call.method === 'getBcvhOperationMetricsBetween' && call.startDate !== '2026-07-23'),
      false
    );
  } finally {
    Object.assign(repo, originals);
  }
});

test('BCVH ranking returns null D-1 and D-7 deltas when comparison rows are unavailable', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  repo.getBcvhOperationMetricsByDate = async () => [];
  repo.getBcvhRanking = async () => ({
    data: [{
      ma_bcvh: '535790',
      ten_bcvh: 'BCVH A Luoi',
      total_bg: 2,
      total_passed: 1,
      total_failed: 1,
      rank: 1,
    }],
    totalItems: 1,
  });
  repo.getFactByDate = async () => [];
  repo.getFactBetween = async () => [];
  // currentMetrics is sourced via the range aggregator; the requested single day is
  // '2026-07-22' (fromDate === toDate), the month-to-date range is a different span.
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    if (startDate === '2026-07-22' && endDate === '2026-07-22') {
      return [{
        ma_bcvh: '535790',
        ten_bcvh: 'BCVH A Luoi',
        sl_bg_ptc: 2,
        sl_ptc_nop_tien: 2,
        dat_kpi_2026: 1,
        khong_dat_kpi_2026: 1,
      }];
    }
    return [];
  };

  try {
    const result = await service.getBcvhRanking('2026-07-22', '2026-07-22', 1, 1000, 'rank', 'asc');

    assert.equal(result.data[0].kpi_2026, 50);
    assert.equal(result.data[0].kpi_2026_dod, null);
    assert.equal(result.data[0].kpi_2026_swc, null);
    assert.equal(result.meta.total_row.kpi_2026_dod, null);
    assert.equal(result.meta.total_row.kpi_2026_swc, null);
  } finally {
    Object.assign(repo, originals);
  }
});

test('BCVH ranking exposes Wave 1 comparison, delayed-cash, and route-distribution fields', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  const currentMetricsRows = [
    {
      ma_bcvh: '535790',
      ten_bcvh: 'BCVH A Luoi',
      sl_bg_ptc: 10,
      sl_ptc_nop_tien: 10,
      dat_kpi_2026: 8,
      khong_dat_kpi_2026: 2,
    },
    {
      ma_bcvh: '536250',
      ten_bcvh: 'BCVH Huong Thuy',
      sl_bg_ptc: 8,
      sl_ptc_nop_tien: 8,
      dat_kpi_2026: 4,
      khong_dat_kpi_2026: 4,
    },
  ];

  repo.getBcvhOperationMetricsByDate = async (date) => {
    if (date === '2026-07-21') {
      return [
        {
          ma_bcvh: '535790',
          ten_bcvh: 'BCVH A Luoi',
          sl_bg_ptc: 6,
          sl_ptc_nop_tien: 6,
          dat_kpi_2026: 3,
          khong_dat_kpi_2026: 3,
        },
        {
          ma_bcvh: '536250',
          ten_bcvh: 'BCVH Huong Thuy',
          sl_bg_ptc: 9,
          sl_ptc_nop_tien: 9,
          dat_kpi_2026: 7,
          khong_dat_kpi_2026: 2,
        },
      ];
    }
    if (date === '2026-07-15') {
      return [
        {
          ma_bcvh: '535790',
          ten_bcvh: 'BCVH A Luoi',
          sl_bg_ptc: 12,
          sl_ptc_nop_tien: 12,
          dat_kpi_2026: 10,
          khong_dat_kpi_2026: 2,
        },
        {
          ma_bcvh: '536250',
          ten_bcvh: 'BCVH Huong Thuy',
          sl_bg_ptc: 5,
          sl_ptc_nop_tien: 5,
          dat_kpi_2026: 1,
          khong_dat_kpi_2026: 4,
        },
      ];
    }
    return [];
  };
  repo.getBcvhRanking = async () => ({
    data: [
      {
        ma_bcvh: '535790',
        ten_bcvh: 'BCVH A Luoi',
        total_bg: 10,
        total_passed: 8,
        total_failed: 2,
        rank: 1,
      },
      {
        ma_bcvh: '536250',
        ten_bcvh: 'BCVH Huong Thuy',
        total_bg: 8,
        total_passed: 4,
        total_failed: 4,
        rank: 2,
      },
    ],
    totalItems: 2,
  });
  repo.getFactByDate = async () => [];
  repo.getFactBetween = async () => ([
    { ma_bcvh: '535790', ma_tuyen: '53579001', danh_gia_2026: 'Đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '535790', ma_tuyen: '53579001', danh_gia_2026: 'Đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '535790', ma_tuyen: '53579002', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T13:30:00Z' },
    { ma_bcvh: '535790', ma_tuyen: '53579002', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '535790', ma_tuyen: '53579027', danh_gia_2026: 'Đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '536250', ma_tuyen: '53625001', danh_gia_2026: 'Đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '536250', ma_tuyen: '53625001', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '536250', ma_tuyen: '53625002', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T12:30:00Z' },
  ]);
  // currentMetrics is now sourced via the range aggregator; month-to-date range calls
  // (a different span) return empty so they don't interfere with this test.
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    if (startDate === '2026-07-22' && endDate === '2026-07-22') return currentMetricsRows;
    return [];
  };

  try {
    const result = await service.getBcvhRanking('2026-07-22', '2026-07-22', 1, 1000, 'rank', 'asc');

    assert.equal(result.data[0].comparisons.d1.volume, 6);
    assert.equal(result.data[0].comparisons.d1.f1_3_rate, 50);
    assert.equal(result.data[0].comparisons.d1.volume_delta, 4);
    assert.equal(result.data[0].comparisons.d1.comparison_rank, 2);
    assert.equal(result.data[0].comparisons.d1.rank_movement.delta, 1);
    assert.equal(result.data[0].comparisons.d1.rank_movement.direction, 'improved');
    assert.equal(result.data[0].comparisons.d7.volume, 12);
    assert.equal(result.data[0].comparisons.d7.rank_movement.direction, 'unchanged');
    assert.equal(result.data[0].delayed_cash_handover_count, 1);
    assert.equal(result.data[0].route_distribution.participating_postman_route_count, 2);
    assert.equal(result.data[0].route_distribution.green_route_count, 1);
    assert.equal(result.data[0].route_distribution.red_route_count, 1);
    assert.equal(result.data[0].route_distribution.pink_route_count, 0);
    assert.equal(result.data[1].comparisons.d1.rank_movement.direction, 'declined');
    assert.equal(result.data[1].comparisons.d1.rank_movement.delta, -1);
    assert.equal(result.data[1].comparisons.d7.rank_movement.direction, 'unchanged');
    assert.equal(result.data[1].delayed_cash_handover_count, 1);
    assert.equal(result.data[1].route_distribution.participating_postman_route_count, 2);
    assert.equal(result.data[1].route_distribution.yellow_route_count, 1);
    assert.equal(result.data[1].route_distribution.red_route_count, 1);
    assert.equal(result.meta.total_row.delayed_cash_handover_count, 2);
    assert.equal(result.meta.total_row.delayed_cash_handover_eligible_count, 4);
    assert.equal(result.meta.total_row.f13_303_rate, 50);
    assert.equal(result.meta.total_row.route_distribution.participating_postman_route_count, 4);
    assert.equal(result.meta.total_row.route_distribution.green_route_count, 1);
    assert.equal(result.meta.total_row.route_distribution.yellow_route_count, 1);
    assert.equal(result.meta.total_row.route_distribution.red_route_count, 2);
  } finally {
    Object.assign(repo, originals);
  }
});

test('BCVH ranking preserves genuine zero comparison rates instead of marking them unavailable', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  repo.getBcvhOperationMetricsByDate = async (date) => {
    if (date === '2026-07-21') {
      return [{
        ma_bcvh: '535790',
        ten_bcvh: 'BCVH A Luoi',
        sl_bg_ptc: 4,
        sl_ptc_nop_tien: 4,
        dat_kpi_2026: 0,
        khong_dat_kpi_2026: 4,
      }];
    }
    if (date === '2026-07-15') {
      return [{
        ma_bcvh: '535790',
        ten_bcvh: 'BCVH A Luoi',
        sl_bg_ptc: 6,
        sl_ptc_nop_tien: 6,
        dat_kpi_2026: 0,
        khong_dat_kpi_2026: 6,
      }];
    }
    return [];
  };
  repo.getBcvhRanking = async () => ({
    data: [{
      ma_bcvh: '535790',
      ten_bcvh: 'BCVH A Luoi',
      total_bg: 10,
      total_passed: 8,
      total_failed: 2,
      rank: 1,
    }],
    totalItems: 1,
  });
  repo.getFactByDate = async () => [];
  repo.getFactBetween = async () => [];
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    if (startDate === '2026-07-22' && endDate === '2026-07-22') {
      return [{
        ma_bcvh: '535790',
        ten_bcvh: 'BCVH A Luoi',
        sl_bg_ptc: 10,
        sl_ptc_nop_tien: 10,
        dat_kpi_2026: 8,
        khong_dat_kpi_2026: 2,
      }];
    }
    return [];
  };

  try {
    const result = await service.getBcvhRanking('2026-07-22', '2026-07-22', 1, 1000, 'rank', 'asc');

    assert.equal(result.data[0].comparisons.d1.volume, 4);
    assert.equal(result.data[0].comparisons.d1.f1_3_rate, 0);
    assert.equal(result.data[0].comparisons.d1.volume_delta, 6);
    assert.equal(result.data[0].comparisons.d7.volume, 6);
    assert.equal(result.data[0].comparisons.d7.f1_3_rate, 0);
    assert.equal(result.data[0].comparisons.d7.volume_delta, 4);
  } finally {
    Object.assign(repo, originals);
  }
});

test('BCVH ranking total-row comparison aggregates use summed numerators and denominators', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  repo.getBcvhOperationMetricsByDate = async (date) => {
    if (date === '2026-07-21') {
      return [
        { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', sl_bg_ptc: 6, sl_ptc_nop_tien: 6, dat_kpi_2026: 3, khong_dat_kpi_2026: 3 },
        { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', sl_bg_ptc: 9, sl_ptc_nop_tien: 9, dat_kpi_2026: 7, khong_dat_kpi_2026: 2 },
      ];
    }
    if (date === '2026-07-15') {
      return [
        { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', sl_bg_ptc: 12, sl_ptc_nop_tien: 12, dat_kpi_2026: 10, khong_dat_kpi_2026: 2 },
        { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', sl_bg_ptc: 5, sl_ptc_nop_tien: 5, dat_kpi_2026: 1, khong_dat_kpi_2026: 4 },
      ];
    }
    return [];
  };
  repo.getBcvhRanking = async () => ({
    data: [
      { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', total_bg: 10, total_passed: 8, total_failed: 2, rank: 1 },
      { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', total_bg: 8, total_passed: 4, total_failed: 4, rank: 2 },
    ],
    totalItems: 2,
  });
  repo.getFactByDate = async () => [];
  repo.getFactBetween = async () => [];
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    if (startDate === '2026-07-22' && endDate === '2026-07-22') {
      return [
        { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', sl_bg_ptc: 10, sl_ptc_nop_tien: 10, dat_kpi_2026: 8, khong_dat_kpi_2026: 2 },
        { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', sl_bg_ptc: 8, sl_ptc_nop_tien: 8, dat_kpi_2026: 4, khong_dat_kpi_2026: 4 },
      ];
    }
    return [];
  };

  try {
    const result = await service.getBcvhRanking('2026-07-22', '2026-07-22', 1, 1000, 'rank', 'asc');

    assert.equal(result.meta.total_row.sl_bg_ptc, 18);
    assert.equal(result.meta.total_row.dat_kpi_2026, 12);
    assert.equal(result.meta.total_row.kpi_2026, 66.7);
    assert.equal(result.meta.total_row.comparisons.d1.volume, 15);
    assert.equal(result.meta.total_row.comparisons.d1.f1_3_rate, 66.7);
    assert.equal(result.meta.total_row.comparisons.d1.volume_delta, 3);
    assert.equal(result.meta.total_row.comparisons.d1.rate_delta, 0);
    assert.equal(result.meta.total_row.comparisons.d7.volume, 17);
    assert.equal(result.meta.total_row.comparisons.d7.f1_3_rate, 64.7);
    assert.equal(result.meta.total_row.comparisons.d7.volume_delta, 1);
    assert.equal(result.meta.total_row.comparisons.d7.rate_delta, 2);
  } finally {
    Object.assign(repo, originals);
  }
});

test('BCVH ranking total-row comparison coverage stays unavailable when canonical comparison coverage is partial', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  repo.getBcvhOperationMetricsByDate = async (date) => {
    if (date === '2026-07-21') {
      return [
        { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', sl_bg_ptc: 6, sl_ptc_nop_tien: 6, dat_kpi_2026: 3, khong_dat_kpi_2026: 3 },
      ];
    }
    return [];
  };
  repo.getBcvhRanking = async () => ({
    data: [
      { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', total_bg: 10, total_passed: 8, total_failed: 2, rank: 1 },
      { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', total_bg: 8, total_passed: 4, total_failed: 4, rank: 2 },
    ],
    totalItems: 2,
  });
  repo.getFactByDate = async () => [];
  repo.getFactBetween = async () => [];
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    if (startDate === '2026-07-22' && endDate === '2026-07-22') {
      return [
        { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', sl_bg_ptc: 10, sl_ptc_nop_tien: 10, dat_kpi_2026: 8, khong_dat_kpi_2026: 2 },
        { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', sl_bg_ptc: 8, sl_ptc_nop_tien: 8, dat_kpi_2026: 4, khong_dat_kpi_2026: 4 },
      ];
    }
    return [];
  };

  try {
    const result = await service.getBcvhRanking('2026-07-22', '2026-07-22', 1, 1000, 'rank', 'asc');

    assert.equal(result.meta.total_row.comparisons.d1.volume, null);
    assert.equal(result.meta.total_row.comparisons.d1.f1_3_rate, null);
    assert.equal(result.meta.total_row.comparisons.d1.volume_delta, null);
    assert.equal(result.meta.total_row.comparisons.d1.rate_delta, null);
    assert.equal(result.meta.total_row.comparisons.d1.coverage.available_rows, 1);
    assert.equal(result.meta.total_row.comparisons.d1.coverage.canonical_total, 2);
    assert.equal(result.meta.total_row.comparisons.d1.coverage.is_partial, true);
    assert.equal(result.meta.total_row.comparisons.d1.coverage.is_complete, false);
  } finally {
    Object.assign(repo, originals);
  }
});

test('BCVH ranking total-row delayed-cash summary uses authoritative summed numerator and denominator', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  repo.getBcvhOperationMetricsByDate = async () => [];
  repo.getBcvhRanking = async () => ({
    data: [
      { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', total_bg: 100, total_passed: 70, total_failed: 30, rank: 1 },
      { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', total_bg: 20, total_passed: 10, total_failed: 10, rank: 2 },
    ],
    totalItems: 2,
  });
  repo.getFactByDate = async () => [];
  repo.getFactBetween = async () => ([
    { ma_bcvh: '535790', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T12:30:00Z' },
    { ma_bcvh: '535790', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T12:15:00Z' },
    { ma_bcvh: '535790', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '535790', danh_gia_2026: 'Đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '536250', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T12:45:00Z' },
    { ma_bcvh: '536250', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: null },
    { ma_bcvh: '536250', danh_gia_2026: 'Đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
  ]);
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    if (startDate === '2026-07-22' && endDate === '2026-07-22') {
      return [
        { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', sl_bg_ptc: 100, sl_ptc_nop_tien: 80, dat_kpi_2026: 70, khong_dat_kpi_2026: 30 },
        { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', sl_bg_ptc: 20, sl_ptc_nop_tien: 15, dat_kpi_2026: 10, khong_dat_kpi_2026: 10 },
      ];
    }
    return [];
  };

  try {
    const result = await service.getBcvhRanking('2026-07-22', '2026-07-22', 1, 1000, 'rank', 'asc');

    assert.equal(result.data[0].delayed_cash_handover_count, 2);
    assert.equal(result.data[0].f13_303_rate, 66.7);
    assert.equal(result.data[1].delayed_cash_handover_count, 1);
    assert.equal(result.data[1].f13_303_rate, 50);

    assert.equal(result.meta.total_row.delayed_cash_handover_count, 3);
    assert.equal(result.meta.total_row.delayed_cash_handover_eligible_count, 5);
    assert.equal(result.meta.total_row.f13_303_rate, 60);
    assert.notEqual(result.meta.total_row.f13_303_rate, 58.4);
    assert.notEqual(
      result.meta.total_row.f13_303_rate,
      Number(((result.meta.total_row.delayed_cash_handover_count / result.meta.total_row.sl_bg_ptc) * 100).toFixed(1)),
    );
  } finally {
    Object.assign(repo, originals);
  }
});

test('BCVH ranking total-row delayed-cash summary preserves genuine zero and SSOT zero-denominator behavior', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  repo.getBcvhOperationMetricsByDate = async () => [];
  repo.getBcvhRanking = async () => ({
    data: [
      { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', total_bg: 5, total_passed: 4, total_failed: 1, rank: 1 },
      { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', total_bg: 7, total_passed: 6, total_failed: 1, rank: 2 },
    ],
    totalItems: 2,
  });
  repo.getFactByDate = async () => [];
  repo.getFactBetween = async () => ([
    { ma_bcvh: '535790', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: '2026-07-22T09:00:00Z' },
    { ma_bcvh: '536250', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '2026-07-22T08:00:00Z', thoi_gian_nop_tien: null },
  ]);
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    if (startDate === '2026-07-22' && endDate === '2026-07-22') {
      return [
        { ma_bcvh: '535790', ten_bcvh: 'BCVH A Luoi', sl_bg_ptc: 5, sl_ptc_nop_tien: 5, dat_kpi_2026: 4, khong_dat_kpi_2026: 1 },
        { ma_bcvh: '536250', ten_bcvh: 'BCVH Huong Thuy', sl_bg_ptc: 7, sl_ptc_nop_tien: 7, dat_kpi_2026: 6, khong_dat_kpi_2026: 1 },
      ];
    }
    return [];
  };

  try {
    const result = await service.getBcvhRanking('2026-07-22', '2026-07-22', 1, 1000, 'rank', 'asc');

    assert.equal(result.data[0].f13_303_rate, 0);
    assert.equal(result.data[1].f13_303_rate, 0);
    assert.equal(result.meta.total_row.delayed_cash_handover_count, 0);
    assert.equal(result.meta.total_row.delayed_cash_handover_eligible_count, 2);
    assert.equal(result.meta.total_row.f13_303_rate, 0);
  } finally {
    Object.assign(repo, originals);
  }
});

test('latest import freshness ignores future-dated recovery artifacts', () => {
  const source = fs.readFileSync(require.resolve('../repositories/FactBuuGuiRepository'), 'utf8');

  assert.match(source, /WHERE status = 'SUCCESS'\s+AND date\(ngay_do_kiem\) <= date\('now', 'localtime'\)/);
});
