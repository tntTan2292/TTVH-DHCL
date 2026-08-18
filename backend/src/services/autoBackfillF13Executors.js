'use strict';

const { DkclHueF13SyncService } = require('./dkclHueF13SyncService');
const { DkclSessionPreflightService } = require('./dkclSessionPreflightService');
const { HueF13Adapter, TctF13Adapter } = require('./f13Adapters');
const { TctF13BackfillService } = require('./tctF13BackfillService');
const { F13_EXECUTOR_IDENTITIES } = require('./autoBackfillF13Contract');

const HUE_TERMINAL_STATUSES = new Set([
    'SUCCESS',
    'NO_DATA',
    'FAILED',
    'AUTHENTICATION_REQUIRED',
    'ALREADY_COMPLETED',
    'MANUAL_REVIEW_REQUIRED',
]);

function executorError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
}

function authenticationError(sourceLane, result = null) {
    const sourceMessage = result?.error?.message || result?.message;
    return executorError(
        'AUTHENTICATION_REQUIRED',
        sourceMessage || `A valid manually authenticated DKCL ${sourceLane} session is required.`,
        result
    );
}

function assertRequest(identity, request) {
    if (request?.indicator !== identity.indicator
        || request?.sourceLane !== identity.sourceLane
        || !/^\d{4}-\d{2}-\d{2}$/.test(String(request?.businessDate || ''))) {
        throw executorError(
            'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH',
            `${identity.id} accepts exactly ${identity.indicator}/${identity.sourceLane}/YYYY-MM-DD.`
        );
    }
}

class F13AutoBackfillExecutor {
    constructor({ identity, adapter, sessionPreflightService, pollIntervalMs = 100 }) {
        for (const method of ['preflight', 'withSourceLock', 'getRegistryState', 'getInteractiveClient']) {
            if (typeof sessionPreflightService?.[method] !== 'function') {
                throw new Error(`F13 Auto Backfill requires sessionPreflightService.${method}().`);
            }
        }
        this.identity = identity;
        this.adapter = adapter;
        this.sessionPreflightService = sessionPreflightService;
        this.pollIntervalMs = pollIntervalMs;
    }

    async execute(request) {
        assertRequest(this.identity, request);
        await this.validateSession();

        return this.sessionPreflightService.withSourceLock(
            this.identity.sourceLane,
            () => this.executeWithSession(request)
        );
    }

    async validateSession() {
        const preflight = await this.sessionPreflightService.preflight(this.identity.sourceLane);
        if (preflight?.status !== 'SESSION_VALID') {
            throw authenticationError(this.identity.sourceLane, preflight);
        }
        return preflight;
    }

    async executeWithSession(request) {
        const source = this.identity.sourceLane;
        const entry = this.sessionPreflightService.getRegistryState(source);
        if (entry?.activeOperation) {
            throw executorError(
                'DKCL_SOURCE_OPERATION_ACTIVE',
                `DKCL ${source} is already owned by '${entry.activeOperation}'.`
            );
        }

        const portalClient = this.sessionPreflightService.getInteractiveClient(source) || null;
        if (!portalClient) throw authenticationError(source);

        const operationId = `AUTO_BACKFILL_F13_${source}`;
        if (entry) entry.activeOperation = operationId;
        try {
            const result = await this.adapter.runOneDate(request.businessDate, {
                queueId: request.jobId,
                refreshRequested: false,
                portalClient,
            });
            return source === 'HUE' ? this.awaitHueResult(result) : result;
        } finally {
            if (entry?.activeOperation === operationId) entry.activeOperation = null;
        }
    }

    async awaitHueResult(result) {
        if (result?.status === 'IN_PROGRESS') {
            throw executorError('DKCL_SOURCE_OPERATION_ACTIVE', 'A Hue F1.3 one-date operation is already active.');
        }

        let run = result?.run || null;
        while (run?.runId && !HUE_TERMINAL_STATUSES.has(run.status)) {
            await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
            run = this.adapter.getRun?.(run.runId) || run;
        }

        const status = run?.status || result?.status;
        if (status === 'AUTHENTICATION_REQUIRED') throw authenticationError('HUE', run);
        if (status === 'SUCCESS' || status === 'ALREADY_COMPLETED') return run;
        throw executorError(status || 'F13_HUE_EXECUTION_FAILED', run?.safeErrorMessage || `Hue F1.3 execution ended with ${status || 'an unknown status'}.`);
    }
}

function createF13AutoBackfillExecutors(options = {}) {
    const db = options.db;
    const sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService();
    const hueSyncService = options.hueSyncService || new DkclHueF13SyncService({ db });
    const tctBackfillService = options.tctBackfillService || new TctF13BackfillService({ db, sessionPreflightService });
    const hueAdapter = options.hueAdapter || new HueF13Adapter({ syncService: hueSyncService, sessionPreflightService });
    const tctAdapter = options.tctAdapter || new TctF13Adapter({
        runOneDateImport: (businessDate, jobId, adapterOptions) => tctBackfillService.runOneDateImport(businessDate, jobId, adapterOptions),
    });
    const pollIntervalMs = options.pollIntervalMs;
    return {
        HUE: new F13AutoBackfillExecutor({
            identity: F13_EXECUTOR_IDENTITIES.HUE,
            adapter: hueAdapter,
            sessionPreflightService,
            pollIntervalMs,
        }),
        TCT: new F13AutoBackfillExecutor({
            identity: F13_EXECUTOR_IDENTITIES.TCT,
            adapter: tctAdapter,
            sessionPreflightService,
            pollIntervalMs,
        }),
    };
}

function registerF13AutoBackfillExecutors(executorRegistry, options = {}) {
    const executors = createF13AutoBackfillExecutors(options);
    for (const sourceLane of ['HUE', 'TCT']) {
        executorRegistry.register(F13_EXECUTOR_IDENTITIES[sourceLane].id, executors[sourceLane], { verified: true });
    }
    return executors;
}

module.exports = {
    F13_EXECUTOR_IDENTITIES,
    F13AutoBackfillExecutor,
    createF13AutoBackfillExecutors,
    registerF13AutoBackfillExecutors,
};
