'use strict';

// Refresh window (PO decision 2026-10-10): an unscoped Auto Backfill run also re-imports the last N
// already-completed days before the newest day for indicators that declare refreshWindowDays (F1.1: 3).
// Run per file: node --test --experimental-sqlite test_autoBackfillRefreshWindow.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyImportBulkReimportAll01Schema } = require('./migrate_import_bulk_reimport_all_01_schema');
const { DEFAULT_PERMISSIONS, DEFAULT_RETRY_POLICY, createFilenameDateRule, INDICATORS, validateIndicatorRegistration } = require('./src/services/importIndicatorRegistry');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');

const CIRCUIT_SCOPE = Object.freeze({ dimensions: ['adapter', 'source', 'resource'], threshold: 5, sameSignatureConsecutive: true, integrityFailureStopsImmediately: true });

function createIndicator({ code, priority, startDate, statuses, refreshWindowDays, status = 'ACTIVE', automationMode = 'AUTOMATED' }) {
    const filenameDateRule = createFilenameDateRule({ id: `${code}_DATE`, prefix: code, parse: () => startDate });
    const adapterId = `TEST_${code.replace(/[^A-Z0-9]/gi, '_')}_HUE`;
    const lane = {
        code: 'HUE',
        priority: 10,
        parser: () => ({ parsedData: [] }),
        targetTable: `fact_${code.replace(/[^A-Z0-9]/gi, '_').toLowerCase()}_hue`,
        completionPolicy: {
            id: `${adapterId}_COMPLETION`,
            async evaluate({ indicator, lane: laneConfig, businessDate }) {
                const key = `${indicator.code}|${laneConfig.code}|${businessDate}`;
                const value = statuses.get(key) || 'MISSING';
                return { status: value, reason: value === 'SUCCESS' ? 'COMPLETE_EVIDENCE' : 'NO_IMPORT_EVIDENCE', evidence: { key, row_count: value === 'SUCCESS' ? 100 : 0 } };
            },
        },
        automationMode,
        manualOnlyReason: automationMode === 'AUTOMATED' ? null : 'PORTAL_ADAPTER_NOT_REGISTERED',
        portalAdapter: automationMode === 'AUTOMATED'
            ? { id: adapterId, verified: true, reportIdentity: `REPORT_${code}`, resourceIdentity: `RESOURCE_${code}` }
            : null,
        permissions: { ...DEFAULT_PERMISSIONS, coverageReadRoles: ['admin'] },
        retryPolicy: DEFAULT_RETRY_POLICY,
        circuitScope: CIRCUIT_SCOPE,
    };
    return {
        code,
        key: code,
        name: `${code} Refresh Test`,
        status,
        priority,
        ...(refreshWindowDays === undefined ? {} : { refreshWindowDays }),
        trackingStartDate: startDate,
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: code,
        filenamePattern: /\.xlsx$/i,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir: path.join(os.tmpdir(), 'unused-refresh-window-artifacts', code),
        lanes: { HUE: lane },
    };
}

async function createFixture({ indicators }) {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-refresh-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyAutoBackfillQueueSchema(dbPath);
    await applyAutoBackfillSafetySchema(dbPath);
    await applyImportBulkReimportAll01Schema(dbPath);
    const statuses = new Map();
    const registry = indicators(statuses);
    const executorRegistry = new AutoBackfillExecutorRegistry({ allowTestExecutors: true });
    const calls = [];
    for (const indicator of registry) {
        executorRegistry.register(indicator.lanes.HUE.portalAdapter?.id || `UNUSED_${indicator.code}`, {
            async execute(identity) {
                calls.push(identity);
                statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
            },
        }, { verified: true, testOnly: true });
    }
    // a service whose business clock is a given instant (the Vietnam day is that instant + 7h)
    const serviceAt = (iso) => {
        const now = new Date(iso);
        return new AutoBackfillQueueService({
            store: new AutoBackfillQueueStore({ dbPath, clock: () => now, leaseMs: 1000 }),
            coverageService: new AutoBackfillCoverageService({ db: {}, clock: () => now, registryProvider: () => registry, registryVersion: 'REFRESH-TEST-1' }),
            executorRegistry,
            registryProvider: () => registry,
            registryVersion: 'REFRESH-TEST-1',
            completionDb: {},
            fsImpl: { existsSync: () => false },
            workerId: 'worker-refresh',
            heartbeatMs: 100000,
        });
    };
    return { dbPath, statuses, calls, registry, serviceAt, cleanup() { fs.rmSync(dbPath, { force: true }); } };
}

function seedSuccess(statuses, code, dates) {
    for (const date of dates) statuses.set(`${code}|HUE|${date}`, 'SUCCESS');
}

const DAY_11 = '2026-01-11T01:00:00.000Z'; // as-of 11 Jan (Vietnam), newest day = 10 Jan

test('an unscoped run adds the 3 completed days before the newest day as force_reimport jobs', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => {
            seedSuccess(statuses, 'F9.WIN', ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09']);
            return [createIndicator({ code: 'F9.WIN', priority: 10, startDate: '2026-01-05', statuses, refreshWindowDays: 3 })];
        },
    });
    try {
        const created = await fixture.serviceAt(DAY_11).createRun({ actor: 'admin', roles: ['admin'] });
        const byDate = Object.fromEntries(created.jobs.map((job) => [job.business_date, Number(job.force_reimport)]));
        assert.deepEqual(byDate, { '2026-01-10': 0, '2026-01-09': 1, '2026-01-08': 1, '2026-01-07': 1 });
    } finally { fixture.cleanup(); }
});

test('an indicator without a window (or with 0) is never refreshed; scoped, ranged and flagged runs do not add refresh jobs', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => {
            seedSuccess(statuses, 'F9.OFF', ['2026-01-07', '2026-01-08', '2026-01-09']);
            seedSuccess(statuses, 'F9.WIN', ['2026-01-07', '2026-01-08', '2026-01-09']);
            return [
                createIndicator({ code: 'F9.OFF', priority: 10, startDate: '2026-01-07', statuses }),
                createIndicator({ code: 'F9.WIN', priority: 20, startDate: '2026-01-07', statuses, refreshWindowDays: 3 }),
            ];
        },
    });
    try {
        const service = fixture.serviceAt(DAY_11);
        // F9.OFF: nothing missing but 10 Jan, and no refresh; F9.WIN: 3 refreshes
        const created = await service.createRun({ actor: 'admin', roles: ['admin'] });
        const forOff = created.jobs.filter((job) => job.indicator === 'F9.OFF');
        assert.deepEqual(forOff.map((job) => [job.business_date, Number(job.force_reimport)]), [['2026-01-10', 0]]);
        assert.equal(created.jobs.filter((job) => job.indicator === 'F9.WIN' && Number(job.force_reimport) === 1).length, 3);

        // a date-ranged run on completed days finds nothing (no refresh, no confirmation)
        await assert.rejects(
            fixture.serviceAt(DAY_11).createRun({ indicator: 'F9.WIN', lane: 'HUE', fromDate: '2026-01-08', toDate: '2026-01-08', actor: 'admin', roles: ['admin'] }),
            (error) => error.code === 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE',
        );
    } finally { fixture.cleanup(); }
});

test('paused indicators and manual-only lanes are not refreshed', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => {
            seedSuccess(statuses, 'F9.PAUSED', ['2026-01-08', '2026-01-09']);
            seedSuccess(statuses, 'F9.MANUAL', ['2026-01-08', '2026-01-09']);
            return [
                createIndicator({ code: 'F9.PAUSED', priority: 10, startDate: '2026-01-08', statuses, refreshWindowDays: 3, status: 'PAUSED' }),
                createIndicator({ code: 'F9.MANUAL', priority: 20, startDate: '2026-01-08', statuses, refreshWindowDays: 3, automationMode: 'MANUAL_ONLY' }),
            ];
        },
    });
    try {
        await assert.rejects(
            fixture.serviceAt(DAY_11).createRun({ actor: 'admin', roles: ['admin'] }),
            (error) => error.code === 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE',
        );
    } finally { fixture.cleanup(); }
});

test('each tuple is refreshed once per planning day; the next day slides the window forward', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => {
            seedSuccess(statuses, 'F9.WIN', ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09']);
            return [createIndicator({ code: 'F9.WIN', priority: 10, startDate: '2026-01-05', statuses, refreshWindowDays: 3 })];
        },
    });
    try {
        const first = fixture.serviceAt(DAY_11);
        await first.createRun({ actor: 'admin', roles: ['admin'] });
        let processed = 0;
        while (await first.processNext()) processed += 1;
        assert.equal(processed, 4); // 10 Jan (new) + 7, 8, 9 Jan (refreshed)
        assert.deepEqual(fixture.calls.map((call) => [call.businessDate, call.forceReimport]).sort(), [
            ['2026-01-07', true], ['2026-01-08', true], ['2026-01-09', true], ['2026-01-10', false],
        ]);

        // same planning day: nothing new to do (the refreshed days are not repeated)
        await assert.rejects(fixture.serviceAt(DAY_11).createRun({ actor: 'admin', roles: ['admin'] }), (error) => error.code === 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE');

        // next day: 11 Jan is the new day, 8-10 Jan are refreshed
        const next = fixture.serviceAt('2026-01-12T01:00:00.000Z');
        const created = await next.createRun({ actor: 'admin', roles: ['admin'] });
        const byDate = Object.fromEntries(created.jobs.map((job) => [job.business_date, Number(job.force_reimport)]));
        assert.deepEqual(byDate, { '2026-01-11': 0, '2026-01-10': 1, '2026-01-09': 1, '2026-01-08': 1 });
    } finally { fixture.cleanup(); }
});

test('a refresh job executes with forceReimport:true and records the row count it replaced', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => {
            seedSuccess(statuses, 'F9.WIN', ['2026-01-08', '2026-01-09', '2026-01-10']);
            return [createIndicator({ code: 'F9.WIN', priority: 10, startDate: '2026-01-08', statuses, refreshWindowDays: 3 })];
        },
    });
    try {
        const service = fixture.serviceAt(DAY_11);
        const created = await service.createRun({ actor: 'admin', roles: ['admin'] }).catch((error) => error);
        // 10 Jan is already complete here, so only 7..9 are in the window: 8 and 9 Jan are completed
        assert.ok(created.jobs, 'a run with refresh jobs only is created');
        assert.deepEqual(created.jobs.map((job) => [job.business_date, Number(job.force_reimport)]).sort(), [['2026-01-08', 1], ['2026-01-09', 1]]);
        const result = await service.processNext();
        assert.equal(result.state, 'SUCCESS');
        assert.equal(fixture.calls[0].forceReimport, true);
        const persisted = await service.getRun(created.run.id, { roles: ['admin'] });
        const done = persisted.jobs.find((job) => job.state === 'SUCCESS');
        assert.equal(JSON.parse(done.completion_evidence_json).replaced_row_count, 100);
    } finally { fixture.cleanup(); }
});

test('registry: refreshWindowDays is validated; only F1.1 declares it', () => {
    assert.equal(INDICATORS['F1.1'].refreshWindowDays, 3);
    assert.equal(INDICATORS['F1.3'].refreshWindowDays, undefined);
    assert.equal(INDICATORS['F4.1'].refreshWindowDays, undefined);
    for (const bad of [-1, 15, 1.5, '3']) {
        assert.throws(() => validateIndicatorRegistration({ ...INDICATORS['F1.1'], refreshWindowDays: bad }), /refreshWindowDays/);
    }
    assert.doesNotThrow(() => validateIndicatorRegistration({ ...INDICATORS['F1.1'], refreshWindowDays: 0 }));
});
