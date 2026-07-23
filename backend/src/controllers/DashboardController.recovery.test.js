const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const dashboardController = require('./DashboardController');
const service = require('../services/F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');

const canonicalCodes = ['535790', '536250', '535470', '537220', '537015', '533140'];

test('KPI all and missing ma_bcvh normalize to aggregate null and never pass all to SQL', async () => {
  const originalService = service.getDashboardKpi;
  const originalRepo = repo.getKpiMetrics;
  const calls = [];

  repo.getKpiMetrics = async (startDate, endDate, filters = {}) => {
    calls.push({ startDate, endDate, filters });
    return { total_bg: filters.bcvhId ? 10 : 30, total_passed: filters.bcvhId ? 8 : 21, total_failed: filters.bcvhId ? 2 : 9 };
  };

  try {
    const allResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', { bcvhId: 'all' });
    const missingResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', {});
    const filteredResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', { bcvhId: '535790' });

    assert.equal(calls.length, 3);
    assert.equal(calls[0].filters.bcvhId, null);
    assert.equal(calls[1].filters.bcvhId, null);
    assert.equal(calls[2].filters.bcvhId, '535790');
    assert.ok(calls.every((call) => call.filters.bcvhId !== 'all'));
    assert.equal(allResult.total_bg, 30);
    assert.equal(allResult.total_passed, 21);
    assert.equal(allResult.total_failed, 9);
    assert.equal(allResult.passed_rate, 70);
    assert.equal(allResult.failed_rate, 30);
    assert.ok(Object.hasOwn(allResult, 'national_rank'));
    assert.equal(missingResult.total_bg, 30);
    assert.equal(missingResult.passed_rate, 70);
    assert.equal(missingResult.failed_rate, 30);
    assert.equal(filteredResult.total_bg, 10);
    assert.equal(filteredResult.passed_rate, 80);
    assert.equal(filteredResult.failed_rate, 20);
    assert.equal(filteredResult.national_rank, null);
  } finally {
    service.getDashboardKpi = originalService;
    repo.getKpiMetrics = originalRepo;
  }
});

test('dashboard KPI controller rejects invalid ma_bcvh and forwards canonical codes', async () => {
  const originalService = service.getDashboardKpi;
  const calls = [];

  service.getDashboardKpi = async (fromDate, toDate, filters = {}) => {
    calls.push({ fromDate, toDate, filters });
    return { total_bg: 1, passed_rate: 100, failed_rate: 0 };
  };

  try {
    for (const code of canonicalCodes) {
      const req = { query: { from_date: '2026-07-01', to_date: '2026-07-15', ma_bcvh: code } };
      let payload = null;
      const res = {
        statusCode: null,
        status(codeValue) {
          this.statusCode = codeValue;
          return this;
        },
        json(body) {
          payload = body;
        },
      };
      await dashboardController.getKpi(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(payload.success, true);
    }

    const invalidReq = { query: { from_date: '2026-07-01', to_date: '2026-07-15', ma_bcvh: 'INVALID' } };
    let invalidPayload = null;
    const invalidRes = {
      statusCode: null,
      status(codeValue) {
        this.statusCode = codeValue;
        return this;
      },
      json(body) {
        invalidPayload = body;
      },
    };

    await dashboardController.getKpi(invalidReq, invalidRes);

    assert.equal(invalidRes.statusCode, 400);
    assert.equal(invalidPayload.success, false);
    assert.ok(calls.length >= canonicalCodes.length);
    assert.ok(calls.every((call) => call.filters.bcvhId !== 'all'));
  } finally {
    service.getDashboardKpi = originalService;
  }
});

test('dashboard KPI request with ma_bcvh=all is normalized at the controller boundary', async () => {
  const originalService = service.getDashboardKpi;
  let captured = null;

  service.getDashboardKpi = async (fromDate, toDate, filters = {}) => {
    captured = { fromDate, toDate, filters };
    return { total_bg: 30, passed_rate: 70, failed_rate: 30 };
  };

  try {
    const req = { query: { from_date: '2026-07-01', to_date: '2026-07-15', ma_bcvh: 'all' } };
    let payload = null;
    const res = {
      statusCode: null,
      status(codeValue) {
        this.statusCode = codeValue;
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
      filters: { bcvhId: null },
    });
    assert.equal(payload.success, true);
  } finally {
    service.getDashboardKpi = originalService;
  }
});

test('dashboard metadata coverage excludes future-dated fact outliers', () => {
  const source = fs.readFileSync(require.resolve('./kpiController'), 'utf8');

  assert.match(source, /SELECT MIN\(ngay_do_kiem\) as min_date, MAX\(ngay_do_kiem\) as max_date/);
  assert.match(source, /WHERE date\(ngay_do_kiem\) <= date\('now', 'localtime'\)/);
});
