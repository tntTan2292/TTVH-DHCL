const test = require('node:test');
const assert = require('node:assert/strict');
const dbModule = require('../config/db');
const { requestJson, requestJsonWithQuery } = require('../../test_support/httpTestClient');

const CANONICAL_CODES = ['535790', '536250', '535470', '537220', '537015', '533140'];
const DATE_RANGE = { fromDate: '2026-07-01', toDate: '2026-07-15' };

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    dbModule.db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

test('live KPI database and HTTP payloads stay aligned for canonical BCVH scope', async () => {
  const aggregateRows = await query(
    `SELECT
      COUNT(ma_bg) AS total_bg,
      SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) AS total_passed,
      SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) AS total_failed
    FROM fact_f13
    WHERE ngay_do_kiem BETWEEN ? AND ?`,
    [DATE_RANGE.fromDate, DATE_RANGE.toDate]
  );

  const groupedRows = await query(
    `SELECT
      ma_bcvh,
      COUNT(ma_bg) AS total_bg,
      SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) AS total_passed,
      SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) AS total_failed
    FROM fact_f13
    WHERE ngay_do_kiem BETWEEN ? AND ?
    GROUP BY ma_bcvh
    ORDER BY ma_bcvh`,
    [DATE_RANGE.fromDate, DATE_RANGE.toDate]
  );

  const login = await requestJson('/auth/login', {
    username: 'admin',
    password: 'admin123',
  });
  const sessionId = login.body.data.session_id;

  const allContext = groupedRows.reduce(
    (acc, row) => {
      acc.total_bg += Number(row.total_bg || 0);
      acc.total_passed += Number(row.total_passed || 0);
      acc.total_failed += Number(row.total_failed || 0);
      return acc;
    },
    { total_bg: 0, total_passed: 0, total_failed: 0 }
  );

  assert.equal(Number(aggregateRows[0].total_bg || 0), allContext.total_bg);

  const scopedRows = groupedRows.filter((row) => CANONICAL_CODES.includes(String(row.ma_bcvh)));
  assert.equal(scopedRows.length, 6);
  assert.ok(groupedRows.some((row) => row.ma_bcvh === '531120'));
  assert.ok(groupedRows.some((row) => row.ma_bcvh === '531600'));

  const canonicalResponses = [];
  for (const code of ['all', ...CANONICAL_CODES]) {
    const response = await requestJsonWithQuery('/f13/dashboard/kpi', {
      from_date: DATE_RANGE.fromDate,
      to_date: DATE_RANGE.toDate,
      ma_bcvh: code,
    }, sessionId);

    canonicalResponses.push({ code, response });
  }

  const responseMap = new Map(canonicalResponses.map((entry) => [entry.code, entry.response.body.data]));
  assert.equal(responseMap.get('all').total_bg, Number(aggregateRows[0].total_bg || 0));

  for (const row of scopedRows) {
    const payload = responseMap.get(String(row.ma_bcvh));
    assert.equal(payload.total_bg, Number(row.total_bg || 0));
    assert.equal(payload.passed_rate, Number(((Number(row.total_passed || 0) / Number(row.total_bg || 0)) * 100).toFixed(1)));
    assert.equal(payload.failed_rate, Number(((Number(row.total_failed || 0) / Number(row.total_bg || 0)) * 100).toFixed(1)));
  }
});

test('dashboard KPI invalid code returns HTTP 400', async () => {
  const login = await requestJson('/auth/login', {
    username: 'admin',
    password: 'admin123',
  });
  const sessionId = login.body.data.session_id;

  const invalid = await requestJsonWithQuery('/f13/dashboard/kpi', {
    from_date: DATE_RANGE.fromDate,
    to_date: DATE_RANGE.toDate,
    ma_bcvh: 'INVALID',
  }, sessionId);

  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.success, false);
});
