'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const defaultController = require('./src/controllers/autoBackfillCoverageExceptionController');
const { AutoBackfillCoverageExceptionController } = defaultController;

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function request({ role = 'admin', body = {}, query = {}, exceptionId = 'exc-1' } = {}) {
    return {
        body,
        query,
        params: { exceptionId },
        auth: { user: { username: 'tester', role } },
    };
}

test('create forwards indicator/lane/date/reason/evidence and the authenticated actor', async () => {
    let input;
    const controller = new AutoBackfillCoverageExceptionController({ exceptionService: {
        async create(value) { input = value; return { id: 'exc-1', exception_type: 'PO_EXEMPTED' }; },
    } });
    const res = response();
    await controller.create(request({ body: {
        indicator: 'F9.TEST', source_lane: 'HUE', business_date: '2026-01-01',
        exception_type: 'PO_EXEMPTED', reason: 'ly do',
    } }), res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.deepEqual(input, {
        indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-01',
        exceptionType: 'PO_EXEMPTED', reason: 'ly do', evidence: null,
        actor: 'tester', roles: ['admin'],
    });
});

test('create surfaces service validation errors with their code and status', async () => {
    const controller = new AutoBackfillCoverageExceptionController({ exceptionService: {
        async create() {
            const error = new Error('reason is required and cannot be empty.');
            error.code = 'COVERAGE_EXCEPTION_REASON_REQUIRED';
            error.statusCode = 400;
            throw error;
        },
    } });
    const res = response();
    await controller.create(request({ body: { indicator: 'F9.TEST', source_lane: 'HUE', business_date: '2026-01-01', exception_type: 'PO_EXEMPTED' } }), res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'COVERAGE_EXCEPTION_REASON_REQUIRED');
});

test('revoke forwards the exception id, reason and authenticated actor', async () => {
    let input;
    const controller = new AutoBackfillCoverageExceptionController({ exceptionService: {
        async revoke(value) { input = value; return { id: 'exc-1', status: 'REVOKED' }; },
    } });
    const res = response();
    await controller.revoke(request({ exceptionId: 'exc-1', body: { reason: 'PO doi y' } }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(input, { exceptionId: 'exc-1', reason: 'PO doi y', actor: 'tester', roles: ['admin'] });
});

test('list forwards filters and never mutates', async () => {
    let input;
    let writes = 0;
    const controller = new AutoBackfillCoverageExceptionController({ exceptionService: {
        async list(value) { input = value; return { total: 0, items: [] }; },
        async create() { writes += 1; },
        async revoke() { writes += 1; },
    } });
    const res = response();
    await controller.list(request({ role: 'viewer', query: { indicator: 'F9.TEST', lane: 'HUE', status: 'ACTIVE' } }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(input, { indicator: 'F9.TEST', lane: 'HUE', businessDate: null, status: 'ACTIVE', roles: ['viewer'] });
    assert.equal(writes, 0);
});
