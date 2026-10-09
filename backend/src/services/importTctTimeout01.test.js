'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');
const { AutoBackfillSafetyCoordinator } = require('./autoBackfillSafetyCoordinator');
const { getIndicatorConfig } = require('./importIndicatorRegistry');

function playwrightTimeout() {
    const error = new Error('apiRequestContext.get: Timeout 30000ms exceeded.\nCall log:\n  - GET https://dkcl.vnpost.vn/kpi/x?token=abc');
    error.name = 'TimeoutError';
    return error;
}

function clientWith(request) {
    const client = new DkclHueF13PortalClient({ headless: true, source: 'TCT' });
    client.baseUrl = 'https://dkcl.example';
    client.lastBusinessDate = '2026-06-11';
    client.lastF41Query = 'q=1';
    client.logger = { log() {}, warn() {} };
    client.page = { request, url: () => 'https://dkcl.example/kpi/x', content: async () => '' };
    return client;
}

test('IMPORT-TCT-TIMEOUT-01: report request gets an explicit timeout above the 30 s Playwright default', async () => {
    let seen = null;
    const client = clientWith({
        get: async (url, options) => {
            seen = options;
            return { status: () => 500, text: async () => '' };
        }
    });
    await assert.rejects(() => client.fetchF41OuterRows('TCT'), { code: 'F41_REPORT_REQUEST_FAILED' });
    assert.ok(seen.timeout > 30000, `timeout ${seen.timeout}`);
    assert.equal(seen.headers['x-requested-with'], 'XMLHttpRequest');
});

test('IMPORT-TCT-TIMEOUT-01: a Playwright timeout becomes a coded F41_PORTAL_REQUEST_TIMEOUT error', async () => {
    const client = clientWith({ get: async () => { throw playwrightTimeout(); } });
    await assert.rejects(() => client.fetchF41OuterRows('TCT'), (error) => {
        assert.equal(error.code, 'F41_PORTAL_REQUEST_TIMEOUT');
        assert.match(error.message, /report request timed out after \d+ ms/);
        return true;
    });
});

test('IMPORT-TCT-TIMEOUT-01: export request timeout is coded too; already-coded errors pass through untouched', async () => {
    const client = clientWith({ fetch: async () => { throw playwrightTimeout(); } });
    client.lastF41ExportRequest = { url: 'https://dkcl.example/export/x/all', method: 'GET', params: {}, exportIdentity: 'X' };
    await assert.rejects(() => client.requestF41Export('X', 'TCT'), { code: 'F41_PORTAL_REQUEST_TIMEOUT' });

    const coded = Object.assign(new Error('boom'), { code: 'SOMETHING_ELSE' });
    const passthrough = clientWith({ get: async () => { throw coded; } });
    await assert.rejects(() => passthrough.fetchF41OuterRows('TCT'), { code: 'SOMETHING_ELSE' });
});

test('IMPORT-TCT-TIMEOUT-01: the queue classifies the timeout TRANSIENT/retryable and keeps a redacted message', () => {
    const lane = getIndicatorConfig('F4.1').lanes.TCT;
    const failure = new AutoBackfillSafetyCoordinator().classify(
        Object.assign(playwrightTimeout(), { code: 'F41_PORTAL_REQUEST_TIMEOUT' }),
        { lane, job: { executor_id: 'x', source_lane: 'TCT' } }
    );
    assert.equal(failure.classification, 'TRANSIENT');
    assert.equal(failure.retryable, true);
    assert.match(failure.message, /Timeout 30000ms exceeded/);
    assert.doesNotMatch(failure.message, /https?:|token=abc/);
    assert.ok(failure.message.length <= 300);
});

test('IMPORT-TCT-TIMEOUT-01: an uncoded error still defaults to SYSTEM but now carries its message', () => {
    const lane = getIndicatorConfig('F4.1').lanes.TCT;
    const failure = new AutoBackfillSafetyCoordinator().classify(new Error('Target page, context or browser has been closed'), {
        lane,
        job: { executor_id: 'x', source_lane: 'TCT' }
    });
    assert.equal(failure.classification, 'SYSTEM');
    assert.equal(failure.message, 'Target page, context or browser has been closed');
});
