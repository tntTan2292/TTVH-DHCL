'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('./F41DashboardController');
const service = require('../services/F41DashboardService').f41DashboardService;

function buildRes() {
    return {
        statusCode: null,
        headers: {},
        body: null,
        set(key, value) { this.headers[key] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
}

test('getKpi requires from_date and to_date', async () => {
    const req = { query: {} };
    const res = buildRes();
    await controller.getKpi(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'MISSING_PARAM');
});

test('getKpi rejects a ma_bcvh that is not one of the canonical F1.3/F4.1 BCVH codes', async () => {
    const req = { query: { from_date: '2026-08-01', to_date: '2026-08-01', ma_bcvh: 'NOT-A-CODE' } };
    const res = buildRes();
    await controller.getKpi(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'INVALID_PARAM');
});

test('getKpi forwards a valid single-day request to the service and returns its result', async () => {
    const original = service.getDashboardKpi;
    let receivedArgs = null;
    service.getDashboardKpi = async (fromDate, toDate, filters) => {
        receivedArgs = { fromDate, toDate, filters };
        return { date_range: { from_date: fromDate, to_date: toDate }, total_rows: 4695, total_passed: 2863, rate_percent: 60.98 };
    };
    try {
        const req = { query: { from_date: '2026-08-01', to_date: '2026-08-01' } };
        const res = buildRes();
        await controller.getKpi(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.total_rows, 4695);
        assert.equal(res.body.data.rate_percent, 60.98);
        assert.deepEqual(receivedArgs, { fromDate: '2026-08-01', toDate: '2026-08-01', filters: { bcvhId: null } });
    } finally {
        service.getDashboardKpi = original;
    }
});

test('getKpi forwards a multi-day range unchanged', async () => {
    const original = service.getDashboardKpi;
    let receivedArgs = null;
    service.getDashboardKpi = async (fromDate, toDate, filters) => {
        receivedArgs = { fromDate, toDate, filters };
        return { date_range: { from_date: fromDate, to_date: toDate }, total_rows: 100, rate_percent: 50 };
    };
    try {
        const req = { query: { from_date: '2026-08-01', to_date: '2026-08-05' } };
        const res = buildRes();
        await controller.getKpi(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(receivedArgs.fromDate, '2026-08-01');
        assert.equal(receivedArgs.toDate, '2026-08-05');
    } finally {
        service.getDashboardKpi = original;
    }
});

test('getBcvhReconciliation requires date', async () => {
    const req = { query: {} };
    const res = buildRes();
    await controller.getBcvhReconciliation(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'MISSING_PARAM');
});

test('getMeta returns the service result with no-cache headers', async () => {
    const original = service.getDashboardMeta;
    service.getDashboardMeta = async () => ({ min_date: '2026-08-01', max_date: '2026-08-03', bcvh_units: [] });
    try {
        const req = { query: {} };
        const res = buildRes();
        await controller.getMeta(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.data.max_date, '2026-08-03');
        assert.equal(res.headers['Cache-Control'], 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } finally {
        service.getDashboardMeta = original;
    }
});

test('getKpi returns SERVER_ERROR on a service failure', async () => {
    const original = service.getDashboardKpi;
    service.getDashboardKpi = async () => { throw new Error('boom'); };
    try {
        const req = { query: { from_date: '2026-08-01', to_date: '2026-08-01' } };
        const res = buildRes();
        await controller.getKpi(req, res);
        assert.equal(res.statusCode, 500);
        assert.equal(res.body.error.code, 'SERVER_ERROR');
    } finally {
        service.getDashboardKpi = original;
    }
});
