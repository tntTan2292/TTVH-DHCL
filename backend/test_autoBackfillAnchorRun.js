'use strict';

// IMPORT-LOG-AUDIT-01: anchor_date run ("Import cả ngày + bù 3 ngày": D, D-1, D-2 for every active indicator and
// automated lane) and the audit context that reaches the executor and import_log.
// Run per file: node --test --experimental-sqlite test_autoBackfillAnchorRun.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyImportBulkReimportAll01Schema } = require('./migrate_import_bulk_reimport_all_01_schema');
const { DEFAULT_PERMISSIONS, DEFAULT_RETRY_POLICY, createFilenameDateRule } = require('./src/services/importIndicatorRegistry');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');
const { currentImportContext, withAuditColumns, runWithImportContext } = require('./src/services/importLogAudit');

const CIRCUIT_SCOPE = Object.freeze({ dimensions: ['adapter', 'source', 'resource'], threshold: 5, sameSignatureConsecutive: true, integrityFailureStopsImmediately: true });

function createIndicator({ code, priority, startDate, statuses, status = 'ACTIVE', automationMode = 'AUTOMATED' }) {
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
        name: `${code} Anchor Test`,
        status,
        priority,
        refreshWindowDays: 3,
        trackingStartDate: startDate,
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: code,
        filenamePattern: /\.xlsx$/i,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir: path.join(os.tmpdir(), 'unused-anchor-artifacts', code),
        lanes: { HUE: lane },
    };
}

async function createFixture({ indicators }) {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-anchor-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
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
                calls.push({ ...identity, audit: currentImportContext() });
                statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
            },
        }, { verified: true, testOnly: true });
    }
    const serviceAt = (iso) => {
        const now = new Date(iso);
        return new AutoBackfillQueueService({
            store: new AutoBackfillQueueStore({ dbPath, clock: () => now, leaseMs: 1000 }),
            coverageService: new AutoBackfillCoverageService({ db: {}, clock: () => now, registryProvider: () => registry, registryVersion: 'ANCHOR-TEST-1' }),
            executorRegistry,
            registryProvider: () => registry,
            registryVersion: 'ANCHOR-TEST-1',
            completionDb: {},
            fsImpl: { existsSync: () => false },
            workerId: 'worker-anchor',
            heartbeatMs: 100000,
        });
    };
    return { dbPath, statuses, calls, serviceAt, cleanup() { fs.rmSync(dbPath, { force: true }); } };
}

function seedSuccess(statuses, code, dates) {
    for (const date of dates) statuses.set(`${code}|HUE|${date}`, 'SUCCESS');
}

const DAY_11 = '2026-01-11T01:00:00.000Z'; // as-of 11 Jan (Vietnam), newest importable day = 10 Jan

test('anchor run holds D, D-1, D-2 for every active indicator; missing days load, completed days are replaced', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => {
            seedSuccess(statuses, 'F9.A', ['2026-01-07', '2026-01-08', '2026-01-09']);
            seedSuccess(statuses, 'F9.B', ['2026-01-08']);
            return [
                createIndicator({ code: 'F9.A', priority: 10, startDate: '2026-01-05', statuses }),
                createIndicator({ code: 'F9.B', priority: 20, startDate: '2026-01-05', statuses }),
            ];
        },
    });
    try {
        const created = await fixture.serviceAt(DAY_11).createRun({ anchorDate: '2026-01-09', actor: 'binh', roles: ['admin'], confirmReplaceCompleted: true });
        assert.deepEqual(created.anchor.window_dates, ['2026-01-09', '2026-01-08', '2026-01-07']);
        const rows = created.jobs.map((job) => [job.indicator, job.business_date, Number(job.force_reimport), job.import_mode]).sort();
        assert.deepEqual(rows, [
            ['F9.A', '2026-01-07', 1, 'REFRESH_DAY'],
            ['F9.A', '2026-01-08', 1, 'REFRESH_DAY'],
            ['F9.A', '2026-01-09', 1, 'REFRESH_DAY'],
            ['F9.B', '2026-01-07', 0, 'REFRESH_DAY'],
            ['F9.B', '2026-01-08', 1, 'REFRESH_DAY'],
            ['F9.B', '2026-01-09', 0, 'REFRESH_DAY'],
        ]);
        assert.equal(created.anchor.job_count, 6);
        assert.equal(created.anchor.replace_count, 4);
        assert.equal(created.run.requested_by, 'binh');
    } finally { fixture.cleanup(); }
});

test('the executor sees actor, run, job, mode and the replaced row count', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => {
            seedSuccess(statuses, 'F9.A', ['2026-01-09']);
            return [createIndicator({ code: 'F9.A', priority: 10, startDate: '2026-01-08', statuses })];
        },
    });
    try {
        const service = fixture.serviceAt(DAY_11);
        const created = await service.createRun({ anchorDate: '2026-01-09', actor: 'binh', roles: ['admin'], confirmReplaceCompleted: true });
        while (await service.processNext()) { /* drain */ }
        const byDate = Object.fromEntries(fixture.calls.map((call) => [call.businessDate, call]));
        const replaced = byDate['2026-01-09'];
        assert.equal(replaced.forceReimport, true);
        assert.equal(replaced.audit.actor, 'binh');
        assert.equal(replaced.audit.runId, created.run.id);
        assert.equal(replaced.audit.importMode, 'REFRESH_DAY');
        assert.equal(replaced.audit.replacedRowCount, 100);
        assert.ok(replaced.audit.jobId);
        assert.equal(byDate['2026-01-08'].forceReimport, false);
        assert.equal(byDate['2026-01-08'].audit.replacedRowCount, null);
    } finally { fixture.cleanup(); }
});

test('guards: admin only, no mixing with other scope fields, no future day, paused and manual-only lanes are reported as skipped', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => {
            seedSuccess(statuses, 'F9.A', ['2026-01-08']);
            return [
                createIndicator({ code: 'F9.A', priority: 10, startDate: '2026-01-05', statuses }),
                createIndicator({ code: 'F9.PAUSED', priority: 20, startDate: '2026-01-05', statuses, status: 'PAUSED' }),
                createIndicator({ code: 'F9.MANUAL', priority: 30, startDate: '2026-01-05', statuses, automationMode: 'MANUAL_ONLY' }),
            ];
        },
    });
    try {
        const service = fixture.serviceAt(DAY_11);
        await assert.rejects(service.createRun({ anchorDate: '2026-01-09', actor: 'x', roles: ['viewer'] }), (e) => e.code === 'AUTO_BACKFILL_ADMIN_REQUIRED');
        await assert.rejects(service.createRun({ anchorDate: '2026-01-09', indicator: 'F9.A', actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_ANCHOR_DATE_EXCLUSIVE');
        await assert.rejects(service.createRun({ anchorDate: '2026-01-09', fromDate: '2026-01-08', actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_ANCHOR_DATE_EXCLUSIVE');
        // a completed day (8 Jan) would be overwritten: the API itself asks for the confirmation
        await assert.rejects(service.createRun({ anchorDate: '2026-01-09', actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_ANCHOR_CONFIRM_REQUIRED' && e.statusCode === 409);
        await assert.rejects(service.createRun({ anchorDate: '2026-01-11', actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_ANCHOR_DATE_IN_FUTURE');
        await assert.rejects(service.createRun({ anchorDate: '09/01/2026', actor: 'x', roles: ['admin'] }), (e) => e.statusCode === 400);

        const created = await service.createRun({ anchorDate: '2026-01-09', actor: 'x', roles: ['admin'], confirmReplaceCompleted: true });
        assert.deepEqual([...new Set(created.jobs.map((job) => job.indicator))], ['F9.A']);
        assert.equal(created.anchor.job_count, 3);
        assert.equal(created.anchor.replace_count, 1);
        // paused / manual-only tuples are either left out of coverage or reported as skipped, never queued
        for (const entry of created.anchor.skipped) assert.ok(['F9.PAUSED', 'F9.MANUAL'].includes(entry.indicator));

        // the same request while the run is still open creates nothing and says so
        const again = await service.createRun({ anchorDate: '2026-01-09', actor: 'x', roles: ['admin'], confirmReplaceCompleted: true });
        assert.equal(again.creation.created, false);
        assert.equal(again.anchor.job_count, 0);
        assert.equal(again.anchor.replace_count, 0);
        // nothing of a paused indicator or a manual-only lane ever becomes a job
        assert.equal(created.jobs.some((job) => job.indicator !== 'F9.A'), false);
    } finally { fixture.cleanup(); }
});

test('withAuditColumns appends audit values only for columns the table has', async () => {
    const full = async () => [{ name: 'id' }, { name: 'actor' }, { name: 'run_id' }, { name: 'job_id' }, { name: 'import_mode' }, { name: 'replaced_row_count' }];
    const old = async () => [{ name: 'id' }, { name: 'file_name' }];

    const outside = await withAuditColumns(full, ['file_name'], ['a.xlsx']);
    assert.deepEqual(outside.columns, ['file_name', 'actor', 'run_id', 'job_id', 'import_mode', 'replaced_row_count']);
    assert.deepEqual(outside.values, ['a.xlsx', null, null, null, null, null]);

    const inside = await runWithImportContext(
        { actor: 'binh', runId: 'r1', jobId: 'j1', importMode: 'REIMPORT', replacedRowCount: 7 },
        () => withAuditColumns(full, ['file_name'], ['a.xlsx']),
    );
    assert.deepEqual(inside.values, ['a.xlsx', 'binh', 'r1', 'j1', 'REIMPORT', 7]);

    const unmigrated = await runWithImportContext({ actor: 'binh' }, () => withAuditColumns(old, ['file_name'], ['a.xlsx']));
    assert.deepEqual(unmigrated, { columns: ['file_name'], values: ['a.xlsx'] });
});

test('a window with no completed day needs no confirmation and replaces nothing', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => [createIndicator({ code: 'F9.A', priority: 10, startDate: '2026-01-05', statuses })],
    });
    try {
        const created = await fixture.serviceAt(DAY_11).createRun({ anchorDate: '2026-01-09', actor: 'x', roles: ['admin'] });
        assert.equal(created.anchor.job_count, 3);
        assert.equal(created.anchor.replace_count, 0);
        assert.ok(created.jobs.every((job) => Number(job.force_reimport) === 0));
    } finally { fixture.cleanup(); }
});
