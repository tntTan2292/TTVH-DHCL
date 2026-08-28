import test from 'node:test';
import assert from 'node:assert/strict';
import { createOverviewFetcher } from './bcvhOverviewFetcher.js';

test('fetchOverview does not call API when toDate is empty', async () => {
  let callCount = 0;
  const mockApi = {
    get: async () => {
      callCount++;
      return { data: { success: true, data: { meta: {} } } };
    }
  };
  const states = [];
  const fetcher = createOverviewFetcher(mockApi, (s) => states.push(s));

  await fetcher('');
  await fetcher(null);
  await fetcher(undefined);

  assert.equal(callCount, 0);
  assert.equal(states.length, 0);
});

test('fetchOverview sends exact 1 request per anchor_date and properly extracts meta from rawData', async () => {
  const calls = [];
  const mockApi = {
    get: async (url, config) => {
      calls.push({ url, config });
      return {
        data: {
          success: true,
          data: {
            monthly: [],
            daily: [],
            mtd: [],
            routes: [],
            meta: {
              anchor_date: config.params.anchor_date,
              month_period: { from_date: '2026-08-01', to_date: config.params.anchor_date },
              year_period: { from_date: '2026-01-01', to_date: config.params.anchor_date },
              route_period: { from_date: '2026-08-01', to_date: config.params.anchor_date, basis: 'MTD' },
            }
          }
        }
      };
    }
  };

  let currentState = null;
  const setOverviewState = (update) => {
    if (typeof update === 'function') {
      currentState = update(currentState || {});
    } else {
      currentState = update;
    }
  };

  const fetcher = createOverviewFetcher(mockApi, setOverviewState);

  await fetcher('2026-08-27');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/f13/ranking/bcvh/overview');
  assert.deepEqual(calls[0].config.params, { anchor_date: '2026-08-27' });

  assert.equal(currentState.status, 'success');
  // Khẳng định meta được giữ nguyên và đọc đúng tầng
  const meta = currentState.processed.meta;
  assert.equal(meta.anchor_date, '2026-08-27');
  assert.deepEqual(meta.month_period, { from_date: '2026-08-01', to_date: '2026-08-27' });
  assert.deepEqual(meta.year_period, { from_date: '2026-01-01', to_date: '2026-08-27' });
  assert.deepEqual(meta.route_period, { from_date: '2026-08-01', to_date: '2026-08-27', basis: 'MTD' });
});

test('fetchOverview prevents race conditions - old response does not overwrite new response', async () => {
  let resolveFirst;
  const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
  let resolveSecond;
  const secondPromise = new Promise((resolve) => { resolveSecond = resolve; });

  let callCount = 0;
  const mockApi = {
    get: async (url, config) => {
      callCount++;
      if (config.params.anchor_date === '2026-08-26') {
        return firstPromise;
      }
      return secondPromise;
    }
  };

  let lastState = null;
  const setOverviewState = (update) => {
    if (typeof update === 'function') {
      lastState = update(lastState || {});
    } else {
      lastState = update;
    }
  };

  const fetcher = createOverviewFetcher(mockApi, setOverviewState);

  // Request 1: toDate = '2026-08-26'
  const p1 = fetcher('2026-08-26');
  
  // Request 2: toDate = '2026-08-27' starts before Request 1 finishes
  const p2 = fetcher('2026-08-27');

  assert.equal(lastState.status, 'loading');
  assert.equal(callCount, 2);

  // Resolve 2nd request first (fast network)
  resolveSecond({
    data: { success: true, data: { meta: { anchor_date: '2026-08-27' } } }
  });
  await p2;

  assert.equal(lastState.status, 'success');
  assert.equal(lastState.processed.meta.anchor_date, '2026-08-27');

  // Resolve 1st request later (slow network)
  resolveFirst({
    data: { success: true, data: { meta: { anchor_date: '2026-08-26' } } }
  });
  await p1;

  // The state should STILL be the 2nd request's state!
  assert.equal(lastState.status, 'success');
  assert.equal(lastState.processed.meta.anchor_date, '2026-08-27');
});

test('fetchOverview updates state to error properly and ignores old errors', async () => {
  let rejectFirst;
  const firstPromise = new Promise((resolve, reject) => { rejectFirst = reject; });
  
  const mockApi = {
    get: async (url, config) => {
      if (config.params.anchor_date === '2026-08-26') {
        return firstPromise;
      }
      return { data: { success: true, data: { meta: { anchor_date: '2026-08-27' } } } };
    }
  };

  let lastState = null;
  const setOverviewState = (update) => {
    if (typeof update === 'function') lastState = update(lastState || {});
    else lastState = update;
  };

  const fetcher = createOverviewFetcher(mockApi, setOverviewState);

  const p1 = fetcher('2026-08-26');
  const p2 = fetcher('2026-08-27');

  await p2; // p2 resolves successfully
  assert.equal(lastState.status, 'success');

  // p1 rejects (timeout or error)
  rejectFirst(new Error('Network error on 26'));
  await p1.catch(() => {});

  // Should remain success, not overwritten by old error
  assert.equal(lastState.status, 'success');
  assert.equal(lastState.processed.meta.anchor_date, '2026-08-27');
});
