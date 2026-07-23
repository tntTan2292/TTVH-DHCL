import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDashboardDateRange } from './dashboardDateRange.js';

test('dashboard date range normalizes invalid year 2098 to available coverage', () => {
  const range = resolveDashboardDateRange({
    rawFromDate: '2098-02-18',
    rawToDate: '2098-02-18',
    minDate: '2026-07-01',
    maxDate: '2026-07-22',
  });

  assert.deepEqual(range, {
    fromDate: '2026-07-22',
    toDate: '2026-07-22',
    normalized: true,
    ready: true,
  });
});

test('dashboard date range clamps before coverage and keeps valid no-data dates inside coverage', () => {
  assert.deepEqual(resolveDashboardDateRange({
    rawFromDate: '2020-01-01',
    rawToDate: '2026-07-15',
    minDate: '2026-07-01',
    maxDate: '2026-07-22',
  }), {
    fromDate: '2026-07-01',
    toDate: '2026-07-15',
    normalized: true,
    ready: true,
  });

  assert.deepEqual(resolveDashboardDateRange({
    rawFromDate: '2026-07-20',
    rawToDate: '2026-07-21',
    minDate: '2026-07-01',
    maxDate: '2026-07-22',
  }), {
    fromDate: '2026-07-20',
    toDate: '2026-07-21',
    normalized: false,
    ready: true,
  });
});
