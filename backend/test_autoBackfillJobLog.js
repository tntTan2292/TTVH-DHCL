'use strict';

// AUTO-IMPORT-LOG-01: complete job log (GET /import/auto-backfill/jobs) and the open-run total.
// Run per file: node --test --experimental-sqlite test_autoBackfillJobLog.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyImportBulkReimportAll01Schema } = require('./migrate_import_bulk_reimport_all_01_schema');
const { DEFAULT_PERMISSIONS, DEFAULT_RETRY_POLICY, createFilenameDateRule } = require('./src/services/importIndicatorRegistry');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');
const { AutoBackfillQueueController } = require('./src/controllers/autoBackfillQueueController');

const CIRCUIT_SCOPE = Object.freeze({ dimensions: ['adapter', 'source', 'resource'], threshold: 5, sameSignatureConsecutive: true, integrityFailureStopsImmediately: true });

function indicator(code, priority, statuses) {
    const rule = createFilenameDateRule({ id: `${code}_DATE`, prefix: code, parse: () => '2026-01-05' });
    const adapterId = `TEST_${code.replace(/[^A-Z0-9]/gi, '_')}_HUE`;
    return {
        code, key: code, name: `${code} Job Log Test`, status: 'ACTIVE', priority, refreshWindowDays: 3,
        trackingStartDate: '2026-01-05', businessTimezone: 'Asia/Ho_Chi_Minh', folder: code, filenamePattern: /\.xlsx$/i,
        filenameDateRule: rule, extractDate: rule.parse, formatFilename: rule.format,
        processedDir: path.join(os.tmpdir(), 'unused-job-log', code),
        lanes: {
            HUE: {
                code: 'HUE', priority: 10, parser: () => ({ parsedData: [] }), targetTable: `fact_${code.replace(/[^A-Z0-9]/gi, '_').toLowerCase()}_hue`,
                completionPolicy: {
                    id: `${adapterId}_COMPLETION`,
                    async evaluate({ indicator: ind, lane, businessDate }) {
                        const value = statuses.get(`${ind.code}|${lane.code}|${businessDate}`) || 'MISSING';
                        return { status: value, reason: value === 'SUCCESS' ? 'COMPLETE_EVIDENCE' : 'NO_IMPORT_EVIDENCE', evidence: { row_count: value === 'SUCCESS' ? 100 : 0 } };
                    },
                },
                automationMode: 'AUTOMATED', manualOnlyReason: null,
                portalAdapter: { id: adapterId, verified: true, reportIdentity: `REPORT_${code}`, resourceIdentity: `RESOURCE_${code}` },
                permissions: { ...DEFAULT_PERMISSIONS, coverageReadRoles: ['admin'] }, retryPolicy: DEFAULT_RETRY_POLICY, circuitScope: CIRCUIT_SCOPE,
            },
        },
    };
}

async function fixture() {
    const dbPath = path.join(os.tmpdir(), `job-log-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyAutoBackfillQueueSchema(dbPath);
    await applyAutoBackfillSafetySchema(dbPath);
    await applyImportBulkReimportAll01Schema(dbPath);
    const statuses = new Map();
    const registry = [indicator('F9.A', 10, statuses), indicator('F9.B', 20, statuses)];
    const executors = new AutoBackfillExecutorRegistry({ allowTestExecutors: true });
    for (const entry of registry) {
        executors.register(entry.lanes.HUE.portalAdapter.id, {
            async execute(identity) { statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS'); },
        }, { verified: true, testOnly: true });
    }
    const now = new Date('2026-01-08T01:00:00.000Z'); // newest day 7 Jan
    const store = new AutoBackfillQueueStore({ dbPath, clock: () => now, leaseMs: 1000 });
    const service = new AutoBackfillQueueService({
        store,
        coverageService: new AutoBackfillCoverageService({ db: {}, clock: () => now, registryProvider: () => registry, registryVersion: 'JOBLOG-1' }),
        executorRegistry: executors, registryProvider: () => registry, registryVersion: 'JOBLOG-1', completionDb: {}, fsImpl: { existsSync: () => false },
        workerId: 'worker-joblog', heartbeatMs: 100000,
    });
    const exec = (sql, params = []) => new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(sql, params, (error) => { db.close(); return error ? reject(error) : resolve(); });
    });
    return { dbPath, store, service, exec, cleanup: () => fs.rmSync(dbPath, { force: true }) };
}

test('the job log lists every job of every run, finished or not, success and failure, with actor, errors and counts', async () => {
    const f = await fixture();
    try {
        const created = await f.service.createRun({ actor: 'binh', roles: ['admin'] });
        assert.ok(created.jobs.length >= 6);
        while (await f.service.processNext()) { /* drain: all jobs SUCCESS */ }
        const failedJob = created.jobs.find((job) => job.indicator === 'F9.B' && job.business_date === '2026-01-07');
        await f.exec("UPDATE auto_backfill_job SET state = 'FAILED_TERMINAL', last_error_class = 'AUTHENTICATION', last_error_signature = 'AUTHENTICATION_REQUIRED', action_required = 'Dang nhap DKCL' WHERE id = ?", [failedJob.id]);

        const all = await f.service.listJobs({}, { roles: ['admin'] });
        assert.equal(all.total, created.jobs.length);
        assert.equal(all.stateCounts.SUCCESS, created.jobs.length - 1);
        assert.equal(all.stateCounts.FAILED_TERMINAL, 1);
        const row = all.items.find((item) => item.id === failedJob.id);
        assert.equal(row.actor, 'binh');
        assert.equal(row.last_error_signature, 'AUTHENTICATION_REQUIRED');
        assert.equal(row.action_required, 'Dang nhap DKCL');
        assert.ok(row.attempt_count >= 1);
        assert.ok(!('completion_evidence_json' in row), 'raw evidence is not leaked, only counts');

        const failedOnly = await f.service.listJobs({ states: ['FAILED_TERMINAL'] }, { roles: ['admin'] });
        assert.equal(failedOnly.total, 1);
        assert.equal(failedOnly.stateCounts.SUCCESS, created.jobs.length - 1, 'chips ignore the state filter');
        assert.equal(failedOnly.items[0].id, failedJob.id);
    } finally { f.cleanup(); }
});

test('filters (date, indicator, lane, actor, run), paging and the admin-only rule', async () => {
    const f = await fixture();
    try {
        const first = await f.service.createRun({ actor: 'binh', roles: ['admin'] });
        while (await f.service.processNext()) { /* drain */ }
        const byIndicator = await f.service.listJobs({ indicator: 'F9.A' }, { roles: ['admin'] });
        assert.ok(byIndicator.items.every((item) => item.indicator === 'F9.A'));
        assert.equal(byIndicator.total * 2, first.jobs.length);

        const oneDay = await f.service.listJobs({ businessDateFrom: '2026-01-07', businessDateTo: '2026-01-07' }, { roles: ['admin'] });
        assert.ok(oneDay.items.length > 0 && oneDay.items.every((item) => item.business_date === '2026-01-07'));

        assert.equal((await f.service.listJobs({ actor: 'someone-else' }, { roles: ['admin'] })).total, 0);
        assert.equal((await f.service.listJobs({ runId: first.run.id }, { roles: ['admin'] })).total, first.jobs.length);

        const page1 = await f.service.listJobs({ limit: 2, offset: 0 }, { roles: ['admin'] });
        const page2 = await f.service.listJobs({ limit: 2, offset: 2 }, { roles: ['admin'] });
        assert.equal(page1.items.length, 2);
        assert.equal(page1.total, first.jobs.length, 'total is the whole match, not the page');
        assert.ok(page1.items.every((a) => page2.items.every((b) => a.id !== b.id)), 'pages do not overlap');

        await assert.rejects(f.service.listJobs({}, { roles: ['viewer'] }), (error) => error.code === 'AUTO_BACKFILL_ADMIN_REQUIRED');
    } finally { f.cleanup(); }
});

test('the controller validates dates, turns Vietnam days into UTC bounds and answers with the log', async () => {
    const f = await fixture();
    try {
        await f.service.createRun({ actor: 'binh', roles: ['admin'] });
        const controller = new AutoBackfillQueueController({ queueService: f.service });
        const respond = async (query) => {
            let result;
            await controller.listJobs({ query, auth: { user: { role: 'admin', username: 'binh' } } }, {
                status(code) { this.code = code; return this; },
                json(body) { result = { code: this.code, body }; },
            });
            return result;
        };
        assert.equal((await respond({ business_date_from: '07/01/2026' })).code, 400);
        const ok = await respond({ created_from: '2026-01-08', created_to: '2026-01-08', pageSize: '3' });
        assert.equal(ok.code, 200);
        assert.ok(ok.body.data.items.length <= 3);
        assert.ok(ok.body.data.total >= 1, 'the run was created at 08:00 Vietnam time on 8 Jan');
        const none = await respond({ created_from: '2026-01-09', created_to: '2026-01-09' });
        assert.equal(none.body.data.total, 0);
        const runs = await controller.listRuns({ query: { status: 'RUNNING' }, auth: { user: { role: 'admin' } } }, { status() { return this; }, json(body) { this.body = body; } });
        assert.equal(runs, undefined);
    } finally { f.cleanup(); }
});

test('countRuns reports the whole number of runs for a status filter', async () => {
    const f = await fixture();
    try {
        await f.service.createRun({ actor: 'binh', roles: ['admin'] });
        assert.equal(await f.store.countRuns({ statuses: ['RUNNING'] }), 1);
        assert.equal(await f.store.countRuns({ statuses: ['COMPLETED'] }), 0);
        while (await f.service.processNext()) { /* drain */ }
        assert.equal(await f.store.countRuns({ statuses: ['COMPLETED', 'COMPLETED_WITH_ERRORS'] }), 1);
    } finally { f.cleanup(); }
});
