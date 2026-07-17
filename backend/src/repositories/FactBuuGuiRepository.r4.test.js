const test = require('node:test');
const assert = require('node:assert/strict');

const repo = require('./FactBuuGuiRepository');
const dbModule = require('../config/db');

test('KPI fixture sums scoped BCVH totals and never passes all to SQL', async () => {
  const originalGet = dbModule.db.get;
  const observed = [];

  const fixture = {
    aggregate: { total_bg: 18, total_passed: 11, total_failed: 7 },
    '535790': { total_bg: 5, total_passed: 3, total_failed: 2 },
    '536250': { total_bg: 6, total_passed: 4, total_failed: 2 },
    '535470': { total_bg: 7, total_passed: 4, total_failed: 3 },
  };

  dbModule.db.get = (sql, params, callback) => {
    observed.push({ sql, params });
    const hasBcvhClause = sql.includes('ma_bcvh = ?');
    const bcvhId = hasBcvhClause ? params[2] : null;
    const row = bcvhId ? fixture[bcvhId] : fixture.aggregate;
    callback(null, row);
  };

  try {
    const aggregate = await repo.getKpiMetrics('2026-07-01', '2026-07-15', {});
    const allScoped = await Promise.all([
      repo.getKpiMetrics('2026-07-01', '2026-07-15', { bcvhId: '535790' }),
      repo.getKpiMetrics('2026-07-01', '2026-07-15', { bcvhId: '536250' }),
      repo.getKpiMetrics('2026-07-01', '2026-07-15', { bcvhId: '535470' }),
    ]);

    assert.equal(observed.length, 4);
    assert.ok(observed.every((entry) => !entry.params.includes('all')));
    assert.equal(aggregate.total_bg, 18);
    assert.equal(allScoped.reduce((sum, row) => sum + row.total_bg, 0), 18);
    assert.deepEqual(allScoped.map((row) => row.total_bg), [5, 6, 7]);
    assert.notDeepEqual(allScoped[0], allScoped[1]);
    assert.notDeepEqual(allScoped[1], allScoped[2]);
  } finally {
    dbModule.db.get = originalGet;
  }
});
