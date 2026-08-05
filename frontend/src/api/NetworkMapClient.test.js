import test from 'node:test';
import assert from 'node:assert/strict';
import networkMapClient from './NetworkMapClient.js';

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

function stubFetch(expectedPathname, expectedSearch) {
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, expectedPathname);
    if (expectedSearch !== undefined) {
      assert.equal(parsed.search, expectedSearch);
    }
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

test('getServicePoints requests /api/network-map/service-points', async () => {
  stubFetch('/api/network-map/service-points');
  await networkMapClient.getServicePoints();
});

test('getLevel2Routes requests /api/network-map/level2-routes', async () => {
  stubFetch('/api/network-map/level2-routes');
  await networkMapClient.getLevel2Routes();
});

test('getDeliveryRoutesMeta requests /api/network-map/delivery-routes/meta', async () => {
  stubFetch('/api/network-map/delivery-routes/meta');
  await networkMapClient.getDeliveryRoutesMeta();
});

test('getDeliveryRoutePoints requests only after all three filters are given', async () => {
  stubFetch('/api/network-map/delivery-routes/points', '?ngay=20260601&ma_bcvh=533140&postman_code=PT001');
  await networkMapClient.getDeliveryRoutePoints('20260601', '533140', 'PT001');
});

test('getDeliveryRoutePoints rejects locally without hitting the network when a filter is missing', async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  };

  await assert.rejects(
    () => networkMapClient.getDeliveryRoutePoints('20260601', '', 'PT001'),
    (error) => error.code === 'MISSING_REQUIRED_FILTER',
  );
  assert.equal(fetchCalled, false, 'must not bulk-query the backend without all three filters');
});
