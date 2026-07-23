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
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };
  const calls = [];

  repo.getBcvhOperationMetricsByDate = async (date) => {
    calls.push({ method: 'getBcvhOperationMetricsByDate', date });
    return [];
  };
  repo.getBcvhRanking = async (date) => {
    calls.push({ method: 'getBcvhRanking', date });
    return { data: [], totalItems: 0 };
  };
  repo.getFactByDate = async (date) => {
    calls.push({ method: 'getFactByDate', date });
    return [];
  };
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    calls.push({ method: 'getBcvhOperationMetricsBetween', startDate, endDate });
    return [];
  };

  try {
    const result = await service.getBcvhRanking('2026-07-23', 1, 1000, 'rank', 'asc');

    assert.deepEqual(result.data, []);
    assert.equal(result.meta.evaluation_date.date, '2026-07-23');
    assert.equal(result.meta.evaluation_date.used_latest_available, false);
    assert.equal(result.meta.evaluation_date.available, false);
    assert.equal(result.meta.month_to_date.available, false);
    assert.equal(result.meta.month_to_date.to_date, null);
    assert.equal(result.meta.total_row.kpi_2026_dod, null);
    assert.equal(result.meta.total_row.kpi_2026_swc, null);
    assert.equal(calls.some((call) => call.method === 'getBcvhRanking' && call.date === '2026-07-22'), false);
    assert.equal(calls.some((call) => call.method === 'getBcvhOperationMetricsBetween'), false);
  } finally {
    Object.assign(repo, originals);
  }
});

test('BCVH ranking returns null D-1 and D-7 deltas when comparison rows are unavailable', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  repo.getBcvhOperationMetricsByDate = async (date) => {
    if (date === '2026-07-22') {
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
  repo.getBcvhOperationMetricsBetween = async () => [];

  try {
    const result = await service.getBcvhRanking('2026-07-22', 1, 1000, 'rank', 'asc');

    assert.equal(result.data[0].kpi_2026, 50);
    assert.equal(result.data[0].kpi_2026_dod, null);
    assert.equal(result.data[0].kpi_2026_swc, null);
    assert.equal(result.meta.total_row.kpi_2026_dod, null);
    assert.equal(result.meta.total_row.kpi_2026_swc, null);
  } finally {
    Object.assign(repo, originals);
  }
});

test('latest import freshness ignores future-dated recovery artifacts', () => {
  const source = fs.readFileSync(require.resolve('../repositories/FactBuuGuiRepository'), 'utf8');

  assert.match(source, /WHERE status = 'SUCCESS'\s+AND date\(ngay_do_kiem\) <= date\('now', 'localtime'\)/);
});
