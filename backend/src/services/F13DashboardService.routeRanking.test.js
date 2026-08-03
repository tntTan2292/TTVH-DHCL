const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('./F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');

test('route ranking maps BLACK/returned-shipment count additively without changing passed_rate formula', async () => {
  const original = repo.getRouteRanking;
  repo.getRouteRanking = async () => ({
    data: [
      { ma_tuyen: '53314018', ten_tuyen: '533140 - Phát tại quầy', total_bg: 87, total_passed: 1, total_failed: 2, total_returned: 84 },
      { ma_tuyen: '53100001', ten_tuyen: 'Tuyến bưu tá A', total_bg: 100, total_passed: 88, total_failed: 12, total_returned: 0 },
    ],
    totalItems: 2,
  });

  try {
    const result = await service.getRouteRanking('2026-08-02', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
    const withReturns = result.data.find((row) => row.ma_tuyen === '53314018');
    const clean = result.data.find((row) => row.ma_tuyen === '53100001');

    assert.equal(withReturns.returned, 84);
    // passed_rate formula is unchanged: Đạt / Tổng BG (F1.3 rate), still Đạt / total_bg.
    assert.equal(withReturns.passed_rate, Number(((1 / 87) * 100).toFixed(1)));
    assert.equal(clean.returned, 0);
    assert.equal(clean.passed_rate, Number(((88 / 100) * 100).toFixed(1)));

    // additive-only contract: existing fields remain present and unchanged in shape.
    assert.equal(withReturns.total_bg, 87);
    assert.equal(withReturns.failed, 2);
    assert.equal(withReturns.total_failed, 2);
    assert.ok(Object.hasOwn(withReturns, 'is_postman_delivery_route'));
  } finally {
    repo.getRouteRanking = original;
  }
});

test('route ranking defaults returned to 0 when the repository omits it', async () => {
  const original = repo.getRouteRanking;
  repo.getRouteRanking = async () => ({
    data: [{ ma_tuyen: '53200002', ten_tuyen: 'Tuyến bưu tá B', total_bg: 10, total_passed: 10, total_failed: 0 }],
    totalItems: 1,
  });

  try {
    const result = await service.getRouteRanking('2026-08-02', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'postman' });
    assert.equal(result.data[0].returned, 0);
  } finally {
    repo.getRouteRanking = original;
  }
});

test('SSOT: Tổng BG = Đạt + Không đạt + Chuyển hoàn (BLACK), and Không đạt is never merged with Chuyển hoàn', async () => {
  const original = repo.getRouteRanking;
  repo.getRouteRanking = async () => ({
    data: [
      { ma_tuyen: '53100003', ten_tuyen: 'Tuyến bưu tá C', total_bg: 87, total_passed: 1, total_failed: 2, total_returned: 84 },
    ],
    totalItems: 1,
  });

  try {
    const result = await service.getRouteRanking('2026-08-02', '533140', 1, 1000, 'total_bg', 'desc', { routeType: 'all' });
    const row = result.data[0];

    assert.equal(row.total_bg, row.passed + row.failed + row.returned);
    // failed and returned are distinct buckets, not merged into one number anywhere in the mapped row.
    assert.notEqual(row.failed, row.failed + row.returned);
    assert.equal(row.failed, 2);
    assert.equal(row.returned, 84);
  } finally {
    repo.getRouteRanking = original;
  }
});
