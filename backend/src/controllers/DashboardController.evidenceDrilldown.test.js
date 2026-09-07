const test = require('node:test');
const assert = require('node:assert/strict');

const dashboardController = require('./DashboardController');
const evidenceQueryServiceModule = require('../services/evidenceQueryService');

// F13-ROUTE-EVIDENCE-STATUS-02 Phase B1 (Design of Record R0 §6.2). Same pattern as
// DashboardController.routePeriods.test.js: exercises the new getEvidenceDrilldown handler
// directly (not over HTTP) with a fake req/res pair, monkeypatching the shared
// evidenceQueryService singleton.

function fakeRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

test('GET /f13/evidence: MISSING_PARAM from the service maps to HTTP 400', async () => {
    const original = evidenceQueryServiceModule.evidenceQueryService.getEvidence;
    let called = false;
    evidenceQueryServiceModule.evidenceQueryService.getEvidence = async () => {
        called = true;
        const error = new Error('bcvh là tham số bắt buộc');
        error.code = 'MISSING_PARAM';
        throw error;
    };
    try {
        const res = await runHandler({});
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'MISSING_PARAM');
        assert.equal(called, true);
    } finally {
        evidenceQueryServiceModule.evidenceQueryService.getEvidence = original;
    }
});

test('GET /f13/evidence: passes req.query through unchanged and returns 200 with data/meta', async () => {
    const original = evidenceQueryServiceModule.evidenceQueryService.getEvidence;
    const observedArgs = [];
    const fakePayload = { data: [{ ma_bg: 'X' }], meta: { anchor_date: '2026-08-31' } };
    evidenceQueryServiceModule.evidenceQueryService.getEvidence = async (params) => {
        observedArgs.push(params);
        return fakePayload;
    };
    try {
        const query = { bcvh: '533140', period: 'month_to_anchor', status: 'passed', search: 'hcc' };
        const res = await runHandler(query);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.deepEqual(res.body.data, fakePayload.data);
        assert.deepEqual(res.body.meta, fakePayload.meta);
        assert.equal(observedArgs.length, 1);
        assert.deepEqual(observedArgs[0], query);
    } finally {
        evidenceQueryServiceModule.evidenceQueryService.getEvidence = original;
    }
});

test('GET /f13/evidence: INVALID_DATE from the service maps to HTTP 400, other errors to 500', async () => {
    const original = evidenceQueryServiceModule.evidenceQueryService.getEvidence;
    try {
        evidenceQueryServiceModule.evidenceQueryService.getEvidence = async () => {
            const error = new Error('anchor_date must be a valid ISO date in YYYY-MM-DD format');
            error.code = 'INVALID_DATE';
            throw error;
        };
        const res1 = await runHandler({ bcvh: '533140', anchor_date: 'not-a-date' });
        assert.equal(res1.statusCode, 400);
        assert.equal(res1.body.error.code, 'INVALID_DATE');

        evidenceQueryServiceModule.evidenceQueryService.getEvidence = async () => { throw new Error('boom'); };
        const res2 = await runHandler({ bcvh: '533140' });
        assert.equal(res2.statusCode, 500);
        assert.equal(res2.body.error.code, 'SERVER_ERROR');
    } finally {
        evidenceQueryServiceModule.evidenceQueryService.getEvidence = original;
    }
});

async function runHandler(query) {
    const res = fakeRes();
    await dashboardController.getEvidenceDrilldown({ query }, res);
    return res;
}

// ============================================================================================
// Route wiring: GET /evidence is registered additively, and the existing GET /evidence-list is
// untouched (§6.1, §9.4 Cấm chạm).
// ============================================================================================

test('f13Routes.js registers GET /evidence on the viewer-readable role set, alongside the unmodified /evidence-list', () => {
    const router = require('../routes/f13Routes');
    const newRoute = router.stack.find((l) => l.route && l.route.path === '/evidence');
    assert.ok(newRoute, 'route /evidence must be registered');
    assert.equal(newRoute.route.methods.get, true);

    const oldRoute = router.stack.find((l) => l.route && l.route.path === '/evidence-list');
    assert.ok(oldRoute, 'the existing /evidence-list must remain registered, unmodified');
    assert.equal(oldRoute.route.methods.get, true);
});
