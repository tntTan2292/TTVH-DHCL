const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('./F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');
const dashboardController = require('../controllers/DashboardController');

test('dashboard KPI filters canonical ma_bcvh values and keeps all aggregated', async () => {
  const original = repo.getKpiMetrics;
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

  try {
    const allResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', {});
    const firstResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', { bcvhId: '535790' });
    const secondResult = await service.getDashboardKpi('2026-07-01', '2026-07-15', { bcvhId: '536250' });

    assert.equal(calls.length, 3);
    assert.equal(calls[0].filters.bcvhId, null);
    assert.equal(calls[1].filters.bcvhId, '535790');
    assert.equal(calls[2].filters.bcvhId, '536250');
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
  } finally {
    repo.getKpiMetrics = original;
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
