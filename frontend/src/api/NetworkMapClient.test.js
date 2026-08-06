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

test('getDeliveryRoutesMeta requests /api/network-map/delivery-routes/meta with no params by default', async () => {
  stubFetch('/api/network-map/delivery-routes/meta', '');
  await networkMapClient.getDeliveryRoutesMeta();
});

test('getDeliveryRoutesMeta adds ngay when given, and ma_bcvh only alongside ngay', async () => {
  stubFetch('/api/network-map/delivery-routes/meta', '?ngay=20260601');
  await networkMapClient.getDeliveryRoutesMeta('20260601');

  stubFetch('/api/network-map/delivery-routes/meta', '?ngay=20260601&ma_bcvh=533140');
  await networkMapClient.getDeliveryRoutesMeta('20260601', '533140');

  stubFetch('/api/network-map/delivery-routes/meta', '');
  await networkMapClient.getDeliveryRoutesMeta(null, '533140');
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

// ==================== Phase 3: Import / Export / History / Rollback ====================

test('previewServicePoints POSTs a FormData file to /import/preview', async () => {
  let capturedBody;
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/network-map/service-points/import/preview');
    capturedBody = options.body;
    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  };
  const fakeFile = new File(['x'], 'a.xlsx');
  await networkMapClient.previewServicePoints(fakeFile);
  assert.ok(capturedBody instanceof FormData);
});

test('confirmServicePoints POSTs session_token to /import/confirm', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/network-map/service-points/import/confirm');
    assert.deepEqual(JSON.parse(options.body), { session_token: 'tok-1' });
    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  };
  await networkMapClient.confirmServicePoints('tok-1');
});

test('confirmLevel2Routes sends session_token and selected_route_keys', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/network-map/level2-routes/import/confirm');
    assert.deepEqual(JSON.parse(options.body), { session_token: 'tok-2', selected_route_keys: ['id:1', 'new:X'] });
    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  };
  await networkMapClient.confirmLevel2Routes('tok-2', ['id:1', 'new:X']);
});

test('exportServicePoints requests the export endpoint and returns a blob', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).pathname, '/api/network-map/service-points/export');
    return new Response(new Blob(['xlsx-bytes']), {
      status: 200,
      headers: { 'Content-Disposition': 'attachment; filename="export.xlsx"' },
    });
  };
  const { blob, fileName } = await networkMapClient.exportServicePoints();
  assert.ok(blob instanceof Blob);
  assert.equal(fileName, 'export.xlsx');
});

test('exportDeliveryRoutes sends from/to by default, and all=true when requested', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).search, '?from=2026-06-01&to=2026-06-30');
    return new Response(new Blob(['x']), { status: 200, headers: {} });
  };
  await networkMapClient.exportDeliveryRoutes({ from: '2026-06-01', to: '2026-06-30' });

  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).search, '?all=true');
    return new Response(new Blob(['x']), { status: 200, headers: {} });
  };
  await networkMapClient.exportDeliveryRoutes({ all: true });
});

test('importHistory requests /import/history/:module', async () => {
  stubFetch('/api/network-map/import/history/service_point');
  await networkMapClient.importHistory('service_point');
});

test('rollbackImport POSTs to /import/:id/rollback', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).pathname, '/api/network-map/import/42/rollback');
    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  };
  await networkMapClient.rollbackImport(42);
});
