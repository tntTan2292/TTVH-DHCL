import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  DEFAULT_ROUTE_TYPE_FILTER,
  ROUTE_TYPE_FILTERS,
  normalizeRouteTypeFilter,
} from './routeRankingFilters.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Route Ranking exposes exact PO-approved route filter labels and default', () => {
  assert.equal(DEFAULT_ROUTE_TYPE_FILTER, 'postman');
  assert.deepEqual(ROUTE_TYPE_FILTERS.map((item) => item.label), ['Tuyến bưu tá', 'Tất cả']);
  assert.equal(normalizeRouteTypeFilter(undefined), 'postman');
  assert.equal(normalizeRouteTypeFilter('all'), 'all');
  assert.equal(normalizeRouteTypeFilter('unknown'), 'postman');
});

test('Route Performance page sends default postman filter and can switch to all routes', () => {
  const pageSource = read('./RoutePerformancePage.jsx');
  const clientSource = read('../../api/F13DashboardClient.js');

  assert.match(pageSource, /DEFAULT_ROUTE_TYPE_FILTER/);
  assert.match(pageSource, /searchParams\.get\('route_type'\)/);
  // Bug fix (Tuyến Ranking date/BCVH parameter mismatch): the query date now resolves from
  // `analysisDate` (to_date-first, matching Dashboard/BCVH Ranking), not the raw `fromDate`.
  assert.match(pageSource, /getRouteRanking\(analysisDate, bcvhId, 1, 1000, sort, order, routeType\)/);
  assert.match(pageSource, /function RouteRankingTable/);
  assert.match(pageSource, /data-testid="route-ranking-table"/);
  assert.match(pageSource, /rows=\{filteredRows\}/);
  assert.match(pageSource, /Bảng Tuyến Ranking/);
  assert.match(pageSource, /Nhận tại bưu cục/);
  const brokenVietnamesePattern = new RegExp([
    'B\\?ng Tuy\\?n Ranking',
    'Danh s\\?ch tuy\\?n',
    'Tuy\\u00e1\\u00ba\\u00bfn b\\u00c6\\u00b0u t\\u00c3\\u00a1',
    'T\\u00e1\\u00ba\\u00a5t c\\u00c3\\u00a1',
  ].join('|'));
  assert.doesNotMatch(pageSource, brokenVietnamesePattern);
  assert.match(pageSource, /updateParam\('route_type', item\.value === DEFAULT_ROUTE_TYPE_FILTER \? '' : item\.value\)/);
  assert.match(pageSource, /bcvhOptions=\{ROUTE_BCVH_OPTIONS\}/);
  assert.match(pageSource, /aria-pressed=\{routeType === item\.value\}/);
  assert.match(clientSource, /route_type: routeType/);
  assert.match(clientSource, /\/f13\/ranking\/route/);
});
