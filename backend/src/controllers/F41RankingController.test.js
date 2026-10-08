'use strict';

// F41-DASHBOARD-RANKING-01 (T1/T2): HTTP contract of the F4.1 ranking endpoints
// with a fake service (status mapping, no-store headers, parameter plumbing).

const test = require('node:test');
const assert = require('node:assert/strict');
const { createController } = require('./F41RankingController');

function makeRes() {
    return {
        statusCode: null,
        body: null,
        headers: {},
        set(name, value) { this.headers[name] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

function codedError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

function fakeService(overrides = {}) {
    const calls = [];
    const record = (name, result) => async (...args) => {
        calls.push({ name, args });
        return typeof result === 'function' ? result(...args) : result;
    };
    return {
        calls,
        getSummary: record('getSummary', { total_bg: 1 }),
        getDailyTrend: record('getDailyTrend', { items: [] }),
        getOverview: record('getOverview', { daily: [] }),
        listWeeks: record('listWeeks', [{ week_id: '2026-W32' }]),
        compareWeeks: record('compareWeeks', { rows: [] }),
        trendWeeks: record('trendWeeks', { weeks: [] }),
        listMonths: record('listMonths', [{ month_id: '2026-08' }]),
        compareMonths: record('compareMonths', { rows: [] }),
        getBcvhRanking: record('getBcvhRanking', { data: [], meta: { pagination: {} } }),
        ...overrides,
    };
}

test('successful reads answer 200 with success flag and no-store headers', async () => {
    const controller = createController(fakeService());
    const res = makeRes();
    await controller.getWeeks({ query: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, data: { weeks: [{ week_id: '2026-W32' }] } });
    assert.equal(res.headers['Cache-Control'], 'no-store, no-cache, must-revalidate, proxy-revalidate');
    assert.equal(res.headers.Pragma, 'no-cache');
    assert.equal(res.headers.Expires, '0');
});

test('summary/daily-trend/ranking require from_date and to_date (400 MISSING_PARAM)', async () => {
    const controller = createController(fakeService());
    for (const handler of ['getSummary', 'getDailyTrend', 'getBcvhRanking']) {
        const res = makeRes();
        await controller[handler]({ query: { from_date: '2026-08-01' } }, res);
        assert.equal(res.statusCode, 400, handler);
        assert.equal(res.body.error.code, 'MISSING_PARAM', handler);
    }
});

test('ma_bcvh "all"/empty means no BCVH filter; a code is passed through', async () => {
    const service = fakeService();
    const controller = createController(service);
    await controller.getSummary({ query: { from_date: '2026-08-01', to_date: '2026-08-02', ma_bcvh: 'all' } }, makeRes());
    await controller.getSummary({ query: { from_date: '2026-08-01', to_date: '2026-08-02', ma_bcvh: '533140' } }, makeRes());
    assert.equal(service.calls[0].args[2].bcvhId, null);
    assert.equal(service.calls[1].args[2].bcvhId, '533140');
});

test('domain errors map to 400 and unknown errors to 500 SERVER_ERROR', async () => {
    const codes = ['INVALID_DATE', 'INVALID_RANGE', 'INVALID_BCVH', 'INVALID_WEEK_ID', 'WEEK_NOT_FOUND', 'INVALID_MONTH_ID', 'MONTH_NOT_FOUND', 'MISSING_PARAM'];
    for (const code of codes) {
        const controller = createController(fakeService({ compareWeeks: async () => { throw codedError(code); } }));
        const res = makeRes();
        await controller.getWeeklyComparison({ query: { week: 'x', compare_week: 'y' } }, res);
        assert.equal(res.statusCode, 400, code);
        assert.equal(res.body.error.code, code);
    }
    const controller = createController(fakeService({ listMonths: async () => { throw new Error('boom'); } }));
    const res = makeRes();
    await controller.getMonths({ query: {} }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'SERVER_ERROR');
});

test('weekly/monthly/ranking parameters reach the service', async () => {
    const service = fakeService();
    const controller = createController(service);
    await controller.getWeeklyComparison({ query: { week: '2026-W32', compare_week: '2026-W31' } }, makeRes());
    await controller.getWeeklyTrend({ query: { week: '2026-W32', limit: '10' } }, makeRes());
    await controller.getMonthlyComparison({ query: { month: '2026-08', compare_month: '2026-07', same_period: '1' } }, makeRes());
    await controller.getBcvhRanking({ query: { fromDate: '2026-08-01', toDate: '2026-08-01', page: '2', page_size: '5', sort: 'total_bg', order: 'asc' } }, makeRes());
    await controller.getOverview({ query: { anchor_date: '2026-08-11' } }, makeRes());
    const byName = Object.fromEntries(service.calls.map((call) => [call.name, call.args]));
    assert.deepEqual(byName.compareWeeks, ['2026-W32', '2026-W31']);
    assert.deepEqual(byName.trendWeeks, ['2026-W32', { limit: '10' }]);
    assert.deepEqual(byName.compareMonths, ['2026-08', '2026-07', { samePeriod: true }]);
    assert.deepEqual(byName.getBcvhRanking, ['2026-08-01', '2026-08-01', 2, 5]);
    assert.deepEqual(byName.getOverview, ['2026-08-11']);
});
