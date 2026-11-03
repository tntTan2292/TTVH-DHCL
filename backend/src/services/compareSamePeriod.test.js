// TIME-AXIS-TEMPLATE-01: the range table of the indicators that share F41RankingService.
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(os.tmpdir(), `qis-same-period-${process.pid}.sqlite`);
process.env.QIS_TEST_DATA_ROOT = path.join(os.tmpdir(), `qis-same-period-${process.pid}`, 'F1.3');

const { F41RankingService } = require('./F41RankingService');

const A = '537015';
const B = '533140';
const metric = (ma_bcvh, volume, passed) => ({ ma_bcvh, ten_bcvh: `BCVH ${ma_bcvh}`, sl_bg_ptc: volume, dat_kpi_2026: passed, khong_dat_kpi_2026: volume - passed });

function serviceWith(byRange) {
  const calls = [];
  const service = new F41RankingService({
    repository: {
      getBcvhOperationMetricsBetween: async (from, to, codes) => { calls.push({ from, to, codes }); return byRange[`${from}|${to}`] || []; },
    },
    nationalRankService: {},
  });
  return { service, calls };
}

test('a range across two months is compared with the same dates two months back; the total is summed, not averaged', async () => {
  const { service, calls } = serviceWith({
    '2026-09-01|2026-10-15': [metric(A, 100, 90), metric(B, 300, 150)],
    '2026-07-01|2026-08-15': [metric(A, 200, 100)],
  });
  const { rows, meta } = await service.compareSamePeriod('2026-09-01', '2026-10-15');
  assert.deepEqual(calls.map((c) => [c.from, c.to]), [['2026-09-01', '2026-10-15'], ['2026-07-01', '2026-08-15']]);
  assert.deepEqual(meta.compare.same_period, { from_date: '2026-07-01', to_date: '2026-08-15' });
  const rowA = rows.find((r) => r.ma_bcvh === A);
  assert.equal(rowA.rate, 90);
  assert.deepEqual(rowA.compare.same_period, { volume: 200, rate: 50, volume_delta: -100, rate_delta: 40 });
  assert.deepEqual(rows.find((r) => r.ma_bcvh === B).compare.same_period, { volume: null, rate: null, volume_delta: null, rate_delta: null });
  assert.equal(meta.total_row.volume, 400);
  assert.equal(meta.total_row.rate, 60); // 240 / 400, not (90 + 50) / 2
  assert.equal(meta.total_row.compare.same_period.volume, 200);
  assert.equal(meta.total_row.compare.same_period.rate_delta, 10);
});

test('one unit: its row and a total of that unit only', async () => {
  const { service } = serviceWith({
    '2026-10-01|2026-10-15': [metric(A, 100, 90), metric(B, 300, 150)],
    '2026-09-01|2026-09-15': [metric(A, 100, 80), metric(B, 300, 300)],
  });
  const { rows, meta } = await service.compareSamePeriod('2026-10-01', '2026-10-15', { bcvhId: A });
  assert.deepEqual(rows.map((r) => r.ma_bcvh), [A]);
  assert.equal(meta.total_row.volume, 100);
  assert.equal(meta.total_row.compare.same_period.volume, 100);
});

test('no earlier data: comparison empty; bad input refused', async () => {
  const { service } = serviceWith({ '2026-10-01|2026-10-15': [metric(A, 10, 5)] });
  const { meta } = await service.compareSamePeriod('2026-10-01', '2026-10-15');
  assert.equal(meta.total_row.compare.same_period.rate, null);
  await assert.rejects(service.compareSamePeriod('2026-10-15', '2026-10-01'), { code: 'INVALID_RANGE' });
  await assert.rejects(service.compareSamePeriod('x', '2026-10-01'), { code: 'INVALID_DATE' });
  await assert.rejects(service.compareSamePeriod('2026-10-01', '2026-10-15', { bcvhId: '999999' }), { code: 'INVALID_BCVH' });
});
