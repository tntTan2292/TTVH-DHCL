const test = require('node:test');
const assert = require('node:assert/strict');

const repo = require('./FactBuuGuiRepository');
const dbModule = require('../config/db');

test('route ranking SQL selects total_unevaluated additively and keeps the Hue/postman scope filters', async () => {
  const originalGet = dbModule.db.get;
  const originalAll = dbModule.db.all;
  const observedDataSql = [];

  dbModule.db.get = (sql, params, callback) => {
    callback(null, { total: 1 });
  };
  dbModule.db.all = (sql, params, callback) => {
    observedDataSql.push(sql);
    callback(null, [
      { ma_tuyen: '53314018', ten_tuyen: '533140 - Phát tại quầy', total_bg: 87, total_passed: 1, total_failed: 2, total_unevaluated: 84 },
    ]);
  };

  try {
    const result = await repo.getRouteRanking('2026-08-02', '533140', 1, 1000, 'total_bg', 'desc', {
      routeType: 'all',
      confirmedNonPostmanRouteCodes: ['53314018'],
    });

    assert.equal(observedDataSql.length, 1);
    assert.match(observedDataSql[0], /total_unevaluated/);
    assert.match(observedDataSql[0], /ma_tuyen LIKE '53%'/);
    assert.match(observedDataSql[0], /GROUP BY ma_tuyen/);
    assert.equal(result.data[0].total_unevaluated, 84);
  } finally {
    dbModule.db.get = originalGet;
    dbModule.db.all = originalAll;
  }
});

test('route ranking excludes confirmed non-postman routes only under the postman filter', async () => {
  const originalGet = dbModule.db.get;
  const originalAll = dbModule.db.all;
  const observedDataSql = [];
  const observedDataParams = [];

  dbModule.db.get = (sql, params, callback) => callback(null, { total: 0 });
  dbModule.db.all = (sql, params, callback) => {
    observedDataSql.push(sql);
    observedDataParams.push(params);
    callback(null, []);
  };

  try {
    await repo.getRouteRanking('2026-08-02', '533140', 1, 1000, 'total_bg', 'desc', {
      routeType: 'postman',
      confirmedNonPostmanRouteCodes: ['53314018'],
    });
    await repo.getRouteRanking('2026-08-02', '533140', 1, 1000, 'total_bg', 'desc', {
      routeType: 'all',
      confirmedNonPostmanRouteCodes: ['53314018'],
    });

    assert.match(observedDataSql[0], /ma_tuyen NOT IN \(\?\)/);
    assert.ok(observedDataParams[0].includes('53314018'));
    assert.doesNotMatch(observedDataSql[1], /ma_tuyen NOT IN/);
  } finally {
    dbModule.db.get = originalGet;
    dbModule.db.all = originalAll;
  }
});
