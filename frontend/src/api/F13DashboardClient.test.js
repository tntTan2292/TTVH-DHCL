import test from 'node:test';
import assert from 'node:assert/strict';
import f13DashboardClient from './F13DashboardClient.js';

function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test.beforeEach(() => {
  installLocalStorage();
});

test.afterEach(() => {
  delete globalThis.fetch;
  globalThis.localStorage.clear();
});

function stubFetch(expectedPathname) {
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, expectedPathname);
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

// P0-03: getKpi and getPareto were missing the '/f13' prefix (API-01), which would
// 404 against the mounted backend routes (/api/f13/dashboard/kpi, /api/f13/rca/pareto).
test('getKpi requests the /f13-prefixed dashboard KPI path', async () => {
  stubFetch('/api/f13/dashboard/kpi');
  await f13DashboardClient.getKpi('2026-08-01', '2026-08-03');
});

test('getPareto requests the /f13-prefixed RCA pareto path', async () => {
  stubFetch('/api/f13/rca/pareto');
  await f13DashboardClient.getPareto('2026-08-03', '533140');
});
