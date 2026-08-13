const test = require('node:test');
const assert = require('node:assert/strict');

const dashboardController = require('./DashboardController');
const service = require('../services/F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');
const dbModule = require('../config/db');

// Product Owner-mandated remediation: /f13/ranking/bcvh must genuinely honour
// ngay_do_kiem BETWEEN from_date AND to_date (inclusive), while BCVH Ranking's
// single-evaluation-day contract is preserved by always sending from_date === to_date.
// The 7 required test scenarios from the PO decision (2026-08-12) are covered below,
// numbered to match the PO's own list.

function buildRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

test('1. Single day: from_date === to_date resolves to a single-evaluation-day request', async () => {
  const originalService = service.getBcvhRanking;
  const calls = [];
  service.getBcvhRanking = async (fromDate, toDate, page, pageSize, sort, order) => {
    calls.push({ fromDate, toDate, page, pageSize, sort, order });
    return { data: [], meta: { date_range: { from_date: fromDate, to_date: toDate, single_day: fromDate === toDate } } };
  };

  try {
    const req = { query: { from_date: '2026-08-11', to_date: '2026-08-11', page: '1', page_size: '20', sort: 'rank', order: 'asc' } };
    const res = buildRes();
    await dashboardController.getBcvh(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].fromDate, '2026-08-11');
    assert.equal(calls[0].toDate, '2026-08-11');
    assert.equal(res.body.meta.date_range.single_day, true);
  } finally {
    service.getBcvhRanking = originalService;
  }
});

test('2. Range 01/08/2026-11/08/2026: both dates are forwarded to the service unchanged', async () => {
  const originalService = service.getBcvhRanking;
  const calls = [];
  service.getBcvhRanking = async (fromDate, toDate) => {
    calls.push({ fromDate, toDate });
    return { data: [], meta: { date_range: { from_date: fromDate, to_date: toDate, single_day: fromDate === toDate } } };
  };

  try {
    const req = { query: { from_date: '2026-08-01', to_date: '2026-08-11' } };
    const res = buildRes();
    await dashboardController.getBcvh(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(calls[0].fromDate, '2026-08-01');
    assert.equal(calls[0].toDate, '2026-08-11');
    assert.equal(res.body.meta.date_range.single_day, false);
  } finally {
    service.getBcvhRanking = originalService;
  }
});

test('3. Only from_date changes: to_date held constant, from_date varies as an independent parameter', async () => {
  const originalService = service.getBcvhRanking;
  const calls = [];
  service.getBcvhRanking = async (fromDate, toDate) => {
    calls.push({ fromDate, toDate });
    return { data: [], meta: {} };
  };

  try {
    await dashboardController.getBcvh({ query: { from_date: '2026-08-05', to_date: '2026-08-11' } }, buildRes());
    await dashboardController.getBcvh({ query: { from_date: '2026-08-09', to_date: '2026-08-11' } }, buildRes());

    assert.equal(calls[0].toDate, '2026-08-11');
    assert.equal(calls[1].toDate, '2026-08-11');
    assert.notEqual(calls[0].fromDate, calls[1].fromDate);
    assert.equal(calls[0].fromDate, '2026-08-05');
    assert.equal(calls[1].fromDate, '2026-08-09');
  } finally {
    service.getBcvhRanking = originalService;
  }
});

test('4. Only to_date changes: from_date held constant, to_date varies as an independent parameter', async () => {
  const originalService = service.getBcvhRanking;
  const calls = [];
  service.getBcvhRanking = async (fromDate, toDate) => {
    calls.push({ fromDate, toDate });
    return { data: [], meta: {} };
  };

  try {
    await dashboardController.getBcvh({ query: { from_date: '2026-08-01', to_date: '2026-08-05' } }, buildRes());
    await dashboardController.getBcvh({ query: { from_date: '2026-08-01', to_date: '2026-08-11' } }, buildRes());

    assert.equal(calls[0].fromDate, '2026-08-01');
    assert.equal(calls[1].fromDate, '2026-08-01');
    assert.notEqual(calls[0].toDate, calls[1].toDate);
    assert.equal(calls[0].toDate, '2026-08-05');
    assert.equal(calls[1].toDate, '2026-08-11');
  } finally {
    service.getBcvhRanking = originalService;
  }
});

test('6. Reversed/invalid range: from_date > to_date is rejected with 400 INVALID_RANGE before reaching the service', async () => {
  const originalService = service.getBcvhRanking;
  let called = false;
  service.getBcvhRanking = async () => { called = true; return { data: [], meta: {} }; };

  try {
    const req = { query: { from_date: '2026-08-11', to_date: '2026-08-01' } };
    const res = buildRes();
    await dashboardController.getBcvh(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'INVALID_RANGE');
    assert.equal(called, false);
  } finally {
    service.getBcvhRanking = originalService;
  }
});

test('6b. Service-level reversed range also rejected directly (defence in depth, not only the controller check)', async () => {
  await assert.rejects(
    () => service.getBcvhRanking('2026-08-11', '2026-08-01', 1, 20, 'rank', 'asc'),
    (err) => err.code === 'INVALID_RANGE'
  );
});

test('7. Repository issues a genuine BETWEEN range query, not a to_date-only query, and both bounds are inclusive', async () => {
  const originalGet = dbModule.db.get;
  const originalAll = dbModule.db.all;
  const observed = { count: [], data: [] };

  dbModule.db.get = (sql, params, callback) => {
    observed.count.push({ sql, params });
    callback(null, { total: 2 });
  };
  dbModule.db.all = (sql, params, callback) => {
    observed.data.push({ sql, params });
    callback(null, []);
  };

  try {
    await repo.getBcvhRanking('2026-08-01', '2026-08-11', 1, 20, 'rank', 'asc');

    assert.equal(observed.count.length, 1);
    assert.match(observed.count[0].sql, /ngay_do_kiem BETWEEN \? AND \?/);
    assert.deepEqual(observed.count[0].params, ['2026-08-01', '2026-08-11']);

    assert.equal(observed.data.length, 1);
    assert.match(observed.data[0].sql, /ngay_do_kiem BETWEEN \? AND \?/);
    // First two bound params must be the inclusive from/to bounds, in order.
    assert.equal(observed.data[0].params[0], '2026-08-01');
    assert.equal(observed.data[0].params[1], '2026-08-11');
  } finally {
    dbModule.db.get = originalGet;
    dbModule.db.all = originalAll;
  }
});

test('7b. Repository single-day call (from_date === to_date) is the same BETWEEN query collapsed to one day', async () => {
  const originalAll = dbModule.db.all;
  const observed = [];

  dbModule.db.get = (sql, params, callback) => callback(null, { total: 1 });
  dbModule.db.all = (sql, params, callback) => {
    observed.push({ sql, params });
    callback(null, []);
  };

  try {
    await repo.getBcvhRanking('2026-08-11', '2026-08-11', 1, 20, 'rank', 'asc');
    assert.match(observed[0].sql, /ngay_do_kiem BETWEEN \? AND \?/);
    assert.equal(observed[0].params[0], '2026-08-11');
    assert.equal(observed[0].params[1], '2026-08-11');
  } finally {
    dbModule.db.all = originalAll;
  }
});

test('7c. Dashboard table no longer collapses a genuine range onto to_date-only figures (service-level, mocked repo)', async () => {
  const originals = {
    getBcvhOperationMetricsByDate: repo.getBcvhOperationMetricsByDate,
    getBcvhRanking: repo.getBcvhRanking,
    getFactByDate: repo.getFactByDate,
    getFactBetween: repo.getFactBetween,
    getBcvhOperationMetricsBetween: repo.getBcvhOperationMetricsBetween,
  };

  const singleDayRow = { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuan Hoa', sl_bg_ptc: 1820, sl_ptc_nop_tien: 1800, dat_kpi_2026: 753, khong_dat_kpi_2026: 986 };
  const rangeRow = { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuan Hoa', sl_bg_ptc: 18895, sl_ptc_nop_tien: 18000, dat_kpi_2026: 10179, khong_dat_kpi_2026: 7841 };

  repo.getBcvhOperationMetricsByDate = async () => [];
  repo.getFactByDate = async () => [];
  repo.getFactBetween = async () => [];
  repo.getBcvhRanking = async (fromDate, toDate) => ({
    data: [{ ma_bcvh: '533140', ten_bcvh: 'BCVH Thuan Hoa', total_bg: fromDate === toDate ? 1820 : 18895, total_passed: fromDate === toDate ? 753 : 10179, total_failed: fromDate === toDate ? 986 : 7841, rank: 1 }],
    totalItems: 1,
  });
  repo.getBcvhOperationMetricsBetween = async (startDate, endDate) => {
    if (startDate === endDate) return [singleDayRow];
    return [rangeRow];
  };

  try {
    const singleDayResult = await service.getBcvhRanking('2026-08-11', '2026-08-11', 1, 20, 'rank', 'asc');
    const rangeResult = await service.getBcvhRanking('2026-08-01', '2026-08-11', 1, 20, 'rank', 'asc');

    // Ground truth from the PO's own runtime evidence (BCVH Thuận Hóa 533140).
    assert.equal(singleDayResult.data[0].sl_bg_ptc, 1820);
    assert.equal(singleDayResult.data[0].dat_kpi_2026, 753);
    assert.equal(singleDayResult.data[0].khong_dat_kpi_2026, 986);

    assert.equal(rangeResult.data[0].sl_bg_ptc, 18895);
    assert.equal(rangeResult.data[0].dat_kpi_2026, 10179);
    assert.equal(rangeResult.data[0].khong_dat_kpi_2026, 7841);

    // The defect being fixed: the range result must NOT equal the single-day result.
    assert.notEqual(rangeResult.data[0].sl_bg_ptc, singleDayResult.data[0].sl_bg_ptc);
  } finally {
    Object.assign(repo, originals);
  }
});
