import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverDashboardDateState, resolveDashboardDateRange } from './dashboardDateRange.js';

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

function createStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(index) {
      return Array.from(map.keys())[index] || null;
    },
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    snapshot() {
      return Object.fromEntries(map.entries());
    },
  };
}

test('dashboard date recovery removes stale persisted filter keys without touching auth or table columns', () => {
  const localStorage = createStorage({
    'qis.dashboard.filters': '{"from_date":"2098-02-18","to_date":"2098-02-18"}',
    'qis.unifiedBcvhAnalysisTable.columns.v3': '{"preset":"default"}',
    qis_session_id: 'session-for-test',
  });
  const sessionStorage = createStorage({
    'f13-dashboard-date-range': '2098-02-18',
    theme: 'light',
  });

  const result = recoverDashboardDateState({ localStorage, sessionStorage });

  assert.equal(result.skipped, false);
  assert.deepEqual(result.removedLocalKeys, ['qis.dashboard.filters']);
  assert.deepEqual(result.removedSessionKeys, ['f13-dashboard-date-range']);
  assert.equal(localStorage.getItem('qis.dashboard.filters'), null);
  assert.equal(sessionStorage.getItem('f13-dashboard-date-range'), null);
  assert.equal(localStorage.getItem('qis.unifiedBcvhAnalysisTable.columns.v3'), '{"preset":"default"}');
  assert.equal(localStorage.getItem('qis_session_id'), 'session-for-test');
  assert.equal(sessionStorage.getItem('theme'), 'light');
});

test('dashboard date recovery runs once per recovery version', () => {
  const localStorage = createStorage({
    'qis.dashboard.filters': '{"from_date":"2098-02-18"}',
  });
  const sessionStorage = createStorage();

  recoverDashboardDateState({ localStorage, sessionStorage });
  localStorage.setItem('qis.dashboard.filters', '{"from_date":"2098-02-18"}');

  const result = recoverDashboardDateState({ localStorage, sessionStorage });

  assert.equal(result.skipped, true);
  assert.deepEqual(result.removedLocalKeys, []);
  assert.equal(localStorage.getItem('qis.dashboard.filters'), '{"from_date":"2098-02-18"}');
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
