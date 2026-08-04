const test = require('node:test');
const assert = require('node:assert/strict');

const repo = require('./FactBuuGuiRepository');
const dbModule = require('../config/db');

test('route ranking SQL selects total_returned additively and keeps the Hue/postman scope filters', async () => {
  const originalGet = dbModule.db.get;
  const originalAll = dbModule.db.all;
  const observedDataSql = [];

  dbModule.db.get = (sql, params, callback) => {
    callback(null, { total: 1 });
  };
  dbModule.db.all = (sql, params, callback) => {
    observedDataSql.push(sql);
    callback(null, [
      { ma_tuyen: '53314018', ten_tuyen: '533140 - Phát tại quầy', total_bg: 87, total_passed: 1, total_failed: 2, total_returned: 84 },
    ]);
  };

  try {
    const result = await repo.getRouteRanking('2026-08-02', '533140', 1, 1000, 'total_bg', 'desc', {
      routeType: 'all',
      confirmedNonPostmanRouteCodes: ['53314018'],
    });

    assert.equal(observedDataSql.length, 1);
    assert.match(observedDataSql[0], /total_returned/);
    assert.match(observedDataSql[0], /MAX\(ten_bcvh\) as ten_bcvh/);
    assert.match(observedDataSql[0], /ma_tuyen LIKE '53%'/);
    assert.match(observedDataSql[0], /GROUP BY ma_tuyen/);
    assert.equal(result.data[0].total_returned, 84);
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

test('getRouteRankingFacts mirrors getRouteRanking\'s WHERE clause (same date/BCVH/Hue/postman scope) and is not paginated', async () => {
  const originalAll = dbModule.db.all;
  const observedSql = [];
  const observedParams = [];

  dbModule.db.all = (sql, params, callback) => {
    observedSql.push(sql);
    observedParams.push(params);
    callback(null, [{ ma_tuyen: '53100001', danh_gia_2026: 'Không đạt', thoi_gian_ptc: null, thoi_gian_nop_tien: null }]);
  };

  try {
    const rows = await repo.getRouteRankingFacts('2026-08-02', '533140', {
      routeType: 'postman',
      confirmedNonPostmanRouteCodes: ['53314018'],
    });

    assert.equal(observedSql.length, 1);
    assert.match(observedSql[0], /ma_tuyen LIKE '53%'/);
    assert.match(observedSql[0], /ma_tuyen NOT IN \(\?\)/);
    assert.doesNotMatch(observedSql[0], /LIMIT/);
    assert.doesNotMatch(observedSql[0], /GROUP BY/);
    assert.deepEqual(observedParams[0], ['2026-08-02', '533140', '53314018']);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ma_tuyen, '53100001');
  } finally {
    dbModule.db.all = originalAll;
  }
});

test('getRouteRankingFacts does not exclude non-postman routes under the "all" filter', async () => {
  const originalAll = dbModule.db.all;
  const observedSql = [];

  dbModule.db.all = (sql, params, callback) => {
    observedSql.push(sql);
    callback(null, []);
  };

  try {
    await repo.getRouteRankingFacts('2026-08-02', '533140', {
      routeType: 'all',
      confirmedNonPostmanRouteCodes: ['53314018'],
    });
    assert.doesNotMatch(observedSql[0], /ma_tuyen NOT IN/);
  } finally {
    dbModule.db.all = originalAll;
  }
});
