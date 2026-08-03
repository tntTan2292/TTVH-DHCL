const test = require('node:test');
const assert = require('node:assert/strict');

// Self-contained request helpers using 127.0.0.1 explicitly (not "localhost"):
// Node's fetch/undici resolves "localhost" to ::1 first in this environment, which
// this backend (bound to 0.0.0.0, IPv4) refuses, unrelated to any Route Ranking code.
// test_support/httpTestClient.js hardcodes "localhost" and is shared by other
// pre-existing tests, so it is intentionally left untouched here (out of scope).
const BASE_URL = 'http://127.0.0.1:5050/api';

async function requestJson(path, body = {}, sessionId = null) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (sessionId) {
    headers.Authorization = `Bearer ${sessionId}`;
    headers['x-session-id'] = sessionId;
  }
  const response = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await response.json().catch(() => null);
  return { status: response.status, body: json };
}

async function requestJsonWithQuery(path, params = {}, sessionId = null) {
  const headers = { Accept: 'application/json' };
  if (sessionId) {
    headers.Authorization = `Bearer ${sessionId}`;
    headers['x-session-id'] = sessionId;
  }
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { method: 'GET', headers });
  const json = await response.json().catch(() => null);
  return { status: response.status, body: json };
}

// Real end-to-end path: DB facts -> FactBuuGuiRepository.getRouteRankingFacts()
// -> RuleF13302/RuleRegistry -> F13DashboardService route grouping -> live HTTP
// API response, exercised against the running backend and its real database.
// Uses the project's known test admin fixture (also used by
// DashboardController.r6.integration.test.js), not a real user credential.
test('route ranking delayed-cash metrics flow correctly end-to-end through the live API', async () => {
  const login = await requestJson('/auth/login', { username: 'admin', password: 'admin123' });
  const sessionId = login.body?.data?.session_id;
  assert.ok(sessionId, 'expected a session id from /auth/login');

  const response = await requestJsonWithQuery('/f13/ranking/route', {
    date: '2026-07-28',
    bcvh: '533140',
    page: 1,
    page_size: 1000,
    sort: 'total_bg',
    order: 'desc',
    route_type: 'all',
  }, sessionId);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const rows = response.body.data;
  assert.ok(Array.isArray(rows) && rows.length > 0, 'expected at least one route row for this known date/BCVH');

  for (const row of rows) {
    assert.equal(typeof row.delayed_cash_handover_count, 'number');
    assert.equal(typeof row.delayed_cash_handover_eligible_count, 'number');
    assert.equal(typeof row.f13_303_rate, 'number');
    assert.match(String(row.ma_tuyen), /^53/); // Hue route-code contract
    // Eligible (non-Đạt facts) can never be smaller than the delayed count.
    assert.ok(row.delayed_cash_handover_eligible_count >= row.delayed_cash_handover_count);
  }

  const summary = response.body.meta?.delayed_cash_handover_summary;
  assert.ok(summary, 'expected meta.delayed_cash_handover_summary in the response');

  const sumCount = rows.reduce((s, r) => s + r.delayed_cash_handover_count, 0);
  const sumEligible = rows.reduce((s, r) => s + r.delayed_cash_handover_eligible_count, 0);

  // The aggregate must equal the sum of the per-route counts for this same unpaginated scope
  // (proves the route-grouping key used to attach the summary matches getRouteRanking()'s
  // route key exactly - a mismatch would silently show 0 on every row while the aggregate
  // stayed non-zero, or vice versa).
  assert.equal(summary.delayed_cash_handover_count, sumCount);
  assert.equal(summary.delayed_cash_handover_eligible_count, sumEligible);

  // Known-good evidence for this date/BCVH: delayed-cash activity actually exists.
  assert.ok(summary.delayed_cash_handover_count > 0, 'expected a nonzero delayed count for 2026-07-28/533140');
  assert.ok(summary.delayed_cash_handover_eligible_count > 0);
  assert.ok(rows.some((r) => r.delayed_cash_handover_count > 0), 'expected at least one route row with a nonzero delayed count');

  // Aggregate rate must be Sum(delayed)/Sum(eligible), not an average of per-route rates.
  const expectedAggregateRate = Number(((summary.delayed_cash_handover_count / summary.delayed_cash_handover_eligible_count) * 100).toFixed(1));
  assert.equal(summary.f13_303_rate, expectedAggregateRate);

  // Each row's own rate must independently satisfy the same Sum/Sum formula.
  for (const row of rows) {
    if (row.delayed_cash_handover_eligible_count === 0) {
      assert.equal(row.f13_303_rate, 0);
    } else {
      const expectedRowRate = Number(((row.delayed_cash_handover_count / row.delayed_cash_handover_eligible_count) * 100).toFixed(1));
      assert.equal(row.f13_303_rate, expectedRowRate);
    }
  }
});

test('paginating the route list does not shrink the delayed-cash aggregate', async () => {
  const login = await requestJson('/auth/login', { username: 'admin', password: 'admin123' });
  const sessionId = login.body?.data?.session_id;

  const fullPage = await requestJsonWithQuery('/f13/ranking/route', {
    date: '2026-07-28', bcvh: '533140', page: 1, page_size: 1000, sort: 'total_bg', order: 'desc', route_type: 'all',
  }, sessionId);
  const smallPage = await requestJsonWithQuery('/f13/ranking/route', {
    date: '2026-07-28', bcvh: '533140', page: 1, page_size: 3, sort: 'total_bg', order: 'desc', route_type: 'all',
  }, sessionId);

  assert.ok(smallPage.body.data.length <= 3);
  assert.equal(
    smallPage.body.meta.delayed_cash_handover_summary.delayed_cash_handover_count,
    fullPage.body.meta.delayed_cash_handover_summary.delayed_cash_handover_count
  );
});
