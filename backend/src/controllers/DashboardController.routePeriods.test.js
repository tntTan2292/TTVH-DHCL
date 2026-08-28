const test = require('node:test');
const assert = require('node:assert/strict');

const dashboardController = require('./DashboardController');
const routePeriodServiceModule = require('../services/routePeriodService');

// AC-01/§6.2 contract wiring: exercises the controller handler directly (not over HTTP) with a
// fake req/res pair, monkeypatching the shared routePeriodService singleton the same way
// FactBuuGuiRepository.routeRanking.test.js already monkeypatches the shared db object.
function fakeRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

test('GET /f13/ranking/route/periods: bcvh is required -> 400 MISSING_PARAM, service never called', async () => {
    const original = routePeriodServiceModule.routePeriodService.getRoutePeriods;
    let called = false;
    routePeriodServiceModule.routePeriodService.getRoutePeriods = async () => { called = true; return {}; };
    try {
        const req = { query: {} };
        const res = fakeRes();
        await dashboardController.getRoutePeriods(req, res);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'MISSING_PARAM');
        assert.equal(called, false);
    } finally {
        routePeriodServiceModule.routePeriodService.getRoutePeriods = original;
    }
});

test('GET /f13/ranking/route/periods: passes bcvh/anchor_date/route_type through and returns 200 with the service payload', async () => {
    const original = routePeriodServiceModule.routePeriodService.getRoutePeriods;
    const observedArgs = [];
    const fakePayload = { anchor_date: '2026-08-27', bcvh: { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' }, routes: [] };
    routePeriodServiceModule.routePeriodService.getRoutePeriods = async (bcvh, anchorDate, options) => {
        observedArgs.push([bcvh, anchorDate, options]);
        return fakePayload;
    };
    try {
        const req = { query: { bcvh: '533140', anchor_date: '2026-08-27', route_type: 'all' } };
        const res = fakeRes();
        await dashboardController.getRoutePeriods(req, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.deepEqual(res.body.data, fakePayload);
        assert.equal(observedArgs.length, 1);
        assert.deepEqual(observedArgs[0], ['533140', '2026-08-27', { routeType: 'all' }]);
    } finally {
        routePeriodServiceModule.routePeriodService.getRoutePeriods = original;
    }
});

test('GET /f13/ranking/route/periods: INVALID_DATE from the service maps to HTTP 400, other errors to 500', async () => {
    const original = routePeriodServiceModule.routePeriodService.getRoutePeriods;
    try {
        routePeriodServiceModule.routePeriodService.getRoutePeriods = async () => {
            const error = new Error('anchor_date must be a valid ISO date in YYYY-MM-DD format');
            error.code = 'INVALID_DATE';
            throw error;
        };
        const res1 = fakeRes();
        await dashboardController.getRoutePeriods({ query: { bcvh: '533140', anchor_date: 'not-a-date' } }, res1);
        assert.equal(res1.statusCode, 400);
        assert.equal(res1.body.error.code, 'INVALID_DATE');

        routePeriodServiceModule.routePeriodService.getRoutePeriods = async () => {
            throw new Error('boom');
        };
        const res2 = fakeRes();
        await dashboardController.getRoutePeriods({ query: { bcvh: '533140' } }, res2);
        assert.equal(res2.statusCode, 500);
        assert.equal(res2.body.error.code, 'SERVER_ERROR');
    } finally {
        routePeriodServiceModule.routePeriodService.getRoutePeriods = original;
    }
});

test('f13Routes.js registers GET /ranking/route/periods on the viewer-readable role set, alongside the unmodified /ranking/route', () => {
    const router = require('../routes/f13Routes');
    const layer = router.stack.find((l) => l.route && l.route.path === '/ranking/route/periods');
    assert.ok(layer, 'route /ranking/route/periods must be registered');
    assert.equal(layer.route.methods.get, true);
    const existing = router.stack.find((l) => l.route && l.route.path === '/ranking/route');
    assert.ok(existing, 'the existing /ranking/route must remain registered, unmodified');
});
