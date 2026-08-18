'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const defaultCoverageController = require('./src/controllers/autoBackfillCoverageController');
const { AutoBackfillCoverageController } = defaultCoverageController;
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { getIndicatorConfig } = require('./src/services/importIndicatorRegistry');

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

function createRequest(query = {}) {
    return {
        query,
        auth: { user: { role: 'admin' } },
    };
}

function createBackendClockFixture() {
    const base = getIndicatorConfig('F1.3');
    const hue = {
        ...base.lanes.HUE,
        completionPolicy: {
            id: 'BACKEND_CLOCK_TEST_POLICY',
            async evaluate({ businessDate }) {
                return {
                    status: 'MISSING',
                    reason: 'NO_IMPORT_EVIDENCE',
                    evidence: { business_date: businessDate },
                };
            },
        },
    };
    return {
        ...base,
        trackingStartDate: '2026-01-03',
        lanes: { HUE: hue },
    };
}

test('coverage API uses backend Asia/Ho_Chi_Minh clock and excludes current business date', async () => {
    const indicator = createBackendClockFixture();
    const service = new AutoBackfillCoverageService({
        db: {},
        clock: () => new Date('2026-01-03T18:30:00Z'),
        registryProvider: () => [indicator],
    });
    const controller = new AutoBackfillCoverageController({ coverageService: service });
    const response = createResponse();

    await controller.getCoverage(createRequest(), response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.business_timezone, 'Asia/Ho_Chi_Minh');
    assert.equal(response.body.data.as_of_business_date, '2026-01-04');
    assert.equal(response.body.data.to_date, '2026-01-03');
    assert.deepEqual(response.body.data.items.map((item) => item.business_date), ['2026-01-03']);
});

test('coverage API rejects caller-controlled future as_of before any downstream operation', async () => {
    const operations = {
        scannerCalls: 0,
        importExecutions: 0,
        queueMutations: 0,
        databaseWrites: 0,
    };
    const controller = new AutoBackfillCoverageController({
        coverageService: {
            async scan() {
                operations.scannerCalls += 1;
                operations.importExecutions += 1;
                operations.queueMutations += 1;
                operations.databaseWrites += 1;
                throw new Error('Scanner must not run for rejected as_of.');
            },
        },
    });
    const response = createResponse();

    await controller.getCoverage(createRequest({ as_of: '2098-01-01' }), response);

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, {
        success: false,
        error: {
            code: 'AUTO_BACKFILL_AS_OF_NOT_ALLOWED',
            message: 'as_of is not allowed; coverage always uses the backend business clock in Asia/Ho_Chi_Minh.',
        },
    });
    assert.deepEqual(operations, {
        scannerCalls: 0,
        importExecutions: 0,
        queueMutations: 0,
        databaseWrites: 0,
    });
});

test('coverage API rejects even an empty as_of override', async () => {
    let scannerCalls = 0;
    const controller = new AutoBackfillCoverageController({
        coverageService: {
            async scan() {
                scannerCalls += 1;
                return {};
            },
        },
    });
    const response = createResponse();

    await controller.getCoverage(createRequest({ as_of: '' }), response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error.code, 'AUTO_BACKFILL_AS_OF_NOT_ALLOWED');
    assert.equal(scannerCalls, 0);
});

test('production controller rejects as_of before default database service initialization', async () => {
    const dbModulePath = require.resolve('./src/config/db');
    const response = createResponse();
    assert.equal(require.cache[dbModulePath], undefined);

    await defaultCoverageController.getCoverage(createRequest({ as_of: '2098-12-31' }), response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error.code, 'AUTO_BACKFILL_AS_OF_NOT_ALLOWED');
    assert.equal(require.cache[dbModulePath], undefined);
});
