import test from 'node:test';
import assert from 'node:assert/strict';
import { createWeeksListFetcher, createWeeklyComparisonFetcher } from './bcvhWeeklyComparisonFetcher.js';

function collector() {
  let state = null;
  const set = (update) => {
    state = typeof update === 'function' ? update(state || {}) : update;
  };
  return { set, get: () => state };
}

test('fetchWeeksList: exactly 1 request to /f13/ranking/bcvh/weeks, extracts weeks array', async () => {
  const calls = [];
  const mockApi = {
    get: async (url) => {
      calls.push(url);
      return { data: { success: true, data: { weeks: [{ week_id: '2026-W36' }, { week_id: '2026-W37' }] } } };
    },
  };
  const { set, get } = collector();
  const fetcher = createWeeksListFetcher(mockApi, set);
  await fetcher();

  assert.equal(calls.length, 1);
  assert.equal(calls[0], '/f13/ranking/bcvh/weeks');
  assert.equal(get().status, 'success');
  assert.equal(get().weeks.length, 2);
});

test('fetchWeeksList: error response sets status=error with a message', async () => {
  const mockApi = { get: async () => ({ data: { success: false, error: { message: 'boom' } } }) };
  const { set, get } = collector();
  const fetcher = createWeeksListFetcher(mockApi, set);
  await fetcher();
  assert.equal(get().status, 'error');
  assert.equal(get().error, 'boom');
  assert.deepEqual(get().weeks, []);
});

test('fetchWeeklyComparison: no request when either week id is missing', async () => {
  let callCount = 0;
  const mockApi = { get: async () => { callCount += 1; return { data: { success: true, data: {} } }; } };
  const { set, get } = collector();
  const fetcher = createWeeklyComparisonFetcher(mockApi, set);

  await fetcher('', '2026-W36');
  await fetcher('2026-W36', null);
  await fetcher(undefined, undefined);

  assert.equal(callCount, 0);
  assert.equal(get(), null);
});

test('fetchWeeklyComparison: sends week and compare_week as query params', async () => {
  const calls = [];
  const mockApi = {
    get: async (url, config) => {
      calls.push({ url, config });
      return { data: { success: true, data: { rows: [], total_row: null, meta: {} } } };
    },
  };
  const { set, get } = collector();
  const fetcher = createWeeklyComparisonFetcher(mockApi, set);
  await fetcher('2026-W38', '2026-W36');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/f13/ranking/bcvh/weekly-comparison');
  assert.deepEqual(calls[0].config.params, { week: '2026-W38', compare_week: '2026-W36' });
  assert.equal(get().status, 'success');
});

test('fetchWeeklyComparison: race condition -- an older selection response never overwrites a newer one', async () => {
  let resolveFirst;
  const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
  let resolveSecond;
  const secondPromise = new Promise((resolve) => { resolveSecond = resolve; });

  const mockApi = {
    get: async (url, config) => (config.params.week === '2026-W36' ? firstPromise : secondPromise),
  };
  const { set, get } = collector();
  const fetcher = createWeeklyComparisonFetcher(mockApi, set);

  const p1 = fetcher('2026-W36', '2026-W01');
  const p2 = fetcher('2026-W38', '2026-W01');

  resolveSecond({ data: { success: true, data: { meta: { current_week: { week_id: '2026-W38' } } } } });
  await p2;
  assert.equal(get().data.meta.current_week.week_id, '2026-W38');

  resolveFirst({ data: { success: true, data: { meta: { current_week: { week_id: '2026-W36' } } } } });
  await p1;
  assert.equal(get().data.meta.current_week.week_id, '2026-W38', 'stale response must not overwrite the latest selection');
});
