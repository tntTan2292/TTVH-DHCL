'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const defaultController = require('./src/controllers/autoBackfillQueueController');
const { AutoBackfillQueueController } = defaultController;

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function request({ role = 'admin', body = {}, query = {}, runId = 'run-1' } = {}) {
    return {
        body,
        query,
        params: { runId },
        auth: { user: { username: 'tester', role } },
    };
}

test('queue create rejects caller-controlled as_of before service initialization or writes', async () => {
    let calls = 0;
    const controller = new AutoBackfillQueueController({ queueService: { async createRun() { calls += 1; } } });
    const res = response();
    await controller.createRun(request({ body: { as_of: '2098-01-01' } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'AUTO_BACKFILL_AS_OF_NOT_ALLOWED');
    assert.equal(calls, 0);
});

test('queue controller forwards identity filters and authenticated Admin actor', async () => {
    let input;
    const controller = new AutoBackfillQueueController({ queueService: {
        async createRun(value) {
            input = value;
            return { run: { id: 'run-1' }, creation: { created: true } };
        },
    } });
    const res = response();
    await controller.createRun(request({ body: { indicator: 'F9.TEST', lane: 'HUE' } }), res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(input, { indicator: 'F9.TEST', lane: 'HUE', actor: 'tester', roles: ['admin'] });
});

test('queue read delegates registry permission without causing a mutation', async () => {
    const operations = { reads: 0, writes: 0 };
    const controller = new AutoBackfillQueueController({ queueService: {
        async getRun(runId, context) {
            operations.reads += 1;
            assert.equal(runId, 'run-1');
            assert.deepEqual(context.roles, ['viewer']);
            return { run: { id: runId }, jobs: [] };
        },
        async pauseRun() { operations.writes += 1; },
        async resumeRun() { operations.writes += 1; },
    } });
    const res = response();
    await controller.getRun(request({ role: 'viewer' }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(operations, { reads: 1, writes: 0 });
});

test('queue service permission errors retain clear 403 API contracts', async () => {
    const forbidden = Object.assign(new Error('Admin required.'), { code: 'AUTO_BACKFILL_ADMIN_REQUIRED', statusCode: 403 });
    const controller = new AutoBackfillQueueController({ queueService: {
        async pauseRun() { throw forbidden; },
    } });
    const res = response();
    await controller.pauseRun(request({ role: 'viewer' }), res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, 'AUTO_BACKFILL_ADMIN_REQUIRED');
});

test('Safety audit and report reads are delegated without mutation', async () => {
    const calls = [];
    const controller = new AutoBackfillQueueController({ queueService: {
        async getEvents(runId, context) { calls.push(['events', runId, context]); return { events: [] }; },
        async getReport(runId, context) { calls.push(['report', runId, context]); return { items: [] }; },
    } });
    const eventResponse = response();
    const reportResponse = response();
    await controller.getEvents(request({ role: 'viewer' }), eventResponse);
    await controller.getReport(request({ role: 'viewer' }), reportResponse);
    assert.equal(eventResponse.statusCode, 200);
    assert.equal(reportResponse.statusCode, 200);
    assert.deepEqual(calls, [
        ['events', 'run-1', { roles: ['viewer'] }],
        ['report', 'run-1', { roles: ['viewer'] }],
    ]);
});

test('circuit reset forwards only authenticated Admin identity', async () => {
    let input;
    const controller = new AutoBackfillQueueController({ queueService: {
        async resetCircuits(runId, context) { input = { runId, context }; return { run: { id: runId } }; },
    } });
    const res = response();
    await controller.resetCircuits(request(), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(input, { runId: 'run-1', context: { actor: 'tester', roles: ['admin'] } });
});
