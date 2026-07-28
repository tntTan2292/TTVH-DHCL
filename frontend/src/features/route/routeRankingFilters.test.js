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
  assert.match(pageSource, /getRouteRanking\(fromDate, bcvhId, 1, 1000, sort, order, routeType\)/);
  assert.match(pageSource, /updateParam\('route_type', item\.value === DEFAULT_ROUTE_TYPE_FILTER \? '' : item\.value\)/);
  assert.match(pageSource, /bcvhOptions=\{ROUTE_BCVH_OPTIONS\}/);
  assert.match(pageSource, /aria-pressed=\{routeType === item\.value\}/);
  assert.match(clientSource, /route_type: routeType/);
  assert.match(clientSource, /\/f13\/ranking\/route/);
});
