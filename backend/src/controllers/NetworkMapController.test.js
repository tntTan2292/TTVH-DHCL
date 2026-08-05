'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-network-map-controller-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);

process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { applyNetworkManagement001Phase1Schema } = require('../../migrate_network_management_001_phase1_schema');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const authSessionStore = require('../services/auth/AuthSessionStore');
const networkMapController = require('./NetworkMapController');

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
}

function createRequest({ query = {}, headers = {} } = {}) {
    const normalizedHeaders = Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );
    return {
        auth: null,
        query,
        header(name) {
            return normalizedHeaders[String(name).toLowerCase()];
        },
    };
}

function runMiddlewareChain(middlewares, req, res) {
    let index = -1;
    function dispatch(i) {
        index = i;
        const fn = middlewares[i];
        if (!fn) return;
        fn(req, res, () => dispatch(i + 1));
    }
    dispatch(0);
}

test.before(async () => {
    await applyNetworkManagement001Phase1Schema(testDbPath);
});

test.after(() => {
    // On Windows, sqlite3 may still hold the file handle open at this point;
    // cleanup is best-effort and must not fail the suite over an OS file lock.
    try {
        fs.rmSync(testDbDir, { recursive: true, force: true });
    } catch {
        // ignore — temp dir, harmless if left behind
    }
});

test.beforeEach(() => {
    authSessionStore.clear();
});

test('listServicePoints returns an empty array — no fabricated data seeded in Phase 1', async () => {
    const req = createRequest();
    const res = createResponse();
    await networkMapController.listServicePoints(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, []);
});

test('listLevel2Routes returns an empty array with stops attached shape', async () => {
    const req = createRequest();
    const res = createResponse();
    await networkMapController.listLevel2Routes(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, []);
});

test('getDeliveryRoutesMeta returns empty dates/bcvh lists', async () => {
    const req = createRequest();
    const res = createResponse();
    await networkMapController.getDeliveryRoutesMeta(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, { dates: [], bcvh: [] });
});

test('listDeliveryPoints rejects a query missing any of the three required filters', async () => {
    const cases = [
        {},
        { ngay: '20260601' },
        { ngay: '20260601', ma_bcvh: '533140' },
    ];

    for (const query of cases) {
        const req = createRequest({ query });
        const res = createResponse();
        await networkMapController.listDeliveryPoints(req, res);
        assert.equal(res.statusCode, 400, `expected 400 for query ${JSON.stringify(query)}`);
        assert.equal(res.body.error.code, 'MISSING_REQUIRED_FILTER');
    }
});

test('listDeliveryPoints queries only after all three filters are provided and never bulk-loads', async () => {
    const req = createRequest({ query: { ngay: '20260601', ma_bcvh: '533140', postman_code: 'PT001' } });
    const res = createResponse();
    await networkMapController.listDeliveryPoints(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, []);
});

test('import endpoints are admin-only scaffolding that report NOT_IMPLEMENTED, not silent success', async () => {
    const req = createRequest();
    const res = createResponse();
    await networkMapController.importServicePoints(req, res);

    assert.equal(res.statusCode, 501);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_IMPLEMENTED');
});

test('read endpoints are reachable by both admin and viewer through the shared middleware chain', () => {
    const allowViewerRead = [requireAuth, requireRole(['admin', 'viewer'])];

    for (const role of ['admin', 'viewer']) {
        const sessionId = authSessionStore.createSession({ username: `${role}-user`, role });
        const req = createRequest({ headers: { authorization: `Bearer ${sessionId}` } });
        const res = createResponse();
        let reachedController = false;

        runMiddlewareChain([...allowViewerRead, () => { reachedController = true; }], req, res);

        assert.equal(reachedController, true, `${role} should reach the read controller`);
    }
});

test('import routes reject viewer role and unauthenticated requests before reaching the controller', () => {
    const allowAdminOnly = [requireAuth, requireRole(['admin'])];

    // Unauthenticated
    const anonRes = createResponse();
    let anonReached = false;
    runMiddlewareChain([...allowAdminOnly, () => { anonReached = true; }], createRequest(), anonRes);
    assert.equal(anonReached, false);
    assert.equal(anonRes.statusCode, 401);

    // Viewer
    const viewerSessionId = authSessionStore.createSession({ username: 'viewer-user', role: 'viewer' });
    const viewerReq = createRequest({ headers: { authorization: `Bearer ${viewerSessionId}` } });
    const viewerRes = createResponse();
    let viewerReached = false;
    runMiddlewareChain([...allowAdminOnly, () => { viewerReached = true; }], viewerReq, viewerRes);
    assert.equal(viewerReached, false);
    assert.equal(viewerRes.statusCode, 403);

    // Admin
    const adminSessionId = authSessionStore.createSession({ username: 'admin-user', role: 'admin' });
    const adminReq = createRequest({ headers: { authorization: `Bearer ${adminSessionId}` } });
    const adminRes = createResponse();
    let adminReached = false;
    runMiddlewareChain([...allowAdminOnly, () => { adminReached = true; }], adminReq, adminRes);
    assert.equal(adminReached, true);
});
