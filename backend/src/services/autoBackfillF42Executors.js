'use strict';

// F42-PHASE-3 - Auto Backfill executors for F4.2 (HUE and TCT), the F4.2 twin of
// autoBackfillF12Executors.js: same session classification, per-source lock and active-operation
// marker. NOT wired into autoBackfillExecutors.js yet: that, and flipping the registry lanes to
// AUTOMATED, happen only after the supervised live run has passed (portal_adapter_standard.md §2, §7).

const { DkclSessionPreflightService } = require('./dkclSessionPreflightService');
const { F42HueAdapter, F42TctAdapter, F42HueSingleDateService, F42TctSingleDateService } = require('./f42SingleDateServices');
const { F42_EXECUTOR_IDENTITIES } = require('./autoBackfillF42Contract');
const { sessionPendingError, PENDING_PREFLIGHT_STATUSES } = require('./autoBackfillF13Executors');
const { sweepLeftoverFiles } = require('./dkclLeftoverCleanup');

function executorError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
}

function assertRequest(identity, request) {
    if (request?.indicator !== identity.indicator
        || request?.sourceLane !== identity.sourceLane
        || !/^\d{4}-\d{2}-\d{2}$/.test(String(request?.businessDate || ''))) {
        throw executorError(
            'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH',
            `${identity.id} accepts exactly F4.2/${identity.sourceLane}/YYYY-MM-DD.`
        );
    }
}

class F42AutoBackfillExecutor {
    constructor({ identity, adapter, sessionPreflightService }) {
        for (const method of ['preflight', 'withSourceLock', 'getRegistryState', 'getInteractiveClient']) {
            if (typeof sessionPreflightService?.[method] !== 'function') {
                throw new Error(`F4.2 Auto Backfill requires sessionPreflightService.${method}().`);
            }
        }
        this.identity = identity;
        this.adapter = adapter;
        this.sessionPreflightService = sessionPreflightService;
    }

    async execute(request) {
        assertRequest(this.identity, request);
        const source = this.identity.sourceLane;
        await this.validateSession();
        return this.sessionPreflightService.withSourceLock(source, async () => {
            const entry = this.sessionPreflightService.getRegistryState(source);
            if (entry?.activeOperation) {
                throw executorError('DKCL_SOURCE_OPERATION_ACTIVE', `DKCL ${source} is already owned by '${entry.activeOperation}'.`);
            }
            const portalClient = this.sessionPreflightService.getInteractiveClient(source) || null;
            if (!portalClient) throw executorError('AUTHENTICATION_REQUIRED', `A valid manual ${source} session is required.`);
            const operationId = `AUTO_BACKFILL_F42_${source}`;
            if (entry) entry.activeOperation = operationId;
            try {
                return await this.adapter.runOneDate(request.businessDate, {
                    jobId: request.jobId,
                    refreshRequested: Boolean(request.forceReimport),
                    portalClient,
                });
            } finally {
                await sweepLeftoverFiles(portalClient, { source });
                if (entry?.activeOperation === operationId) entry.activeOperation = null;
            }
        });
    }

    async validateSession() {
        const source = this.identity.sourceLane;
        const preflight = await this.sessionPreflightService.preflight(source);
        if (preflight?.status === 'SESSION_VALID') return preflight;
        if (PENDING_PREFLIGHT_STATUSES.has(preflight?.status)) throw sessionPendingError(source, preflight);
        throw executorError('AUTHENTICATION_REQUIRED', preflight?.error?.message || `A valid manual ${source} session is required.`, preflight);
    }
}

// The F4.2 export covers every postman nationwide: successes take up to ~3.3 minutes in total (about 2.7 of waiting),
// so 3 minutes of waiting (PO decision 2026-10-28; 15 minutes before, 2 briefly) separates a slow export from a failed
// one. Only the queue's own service instances use it; the plain service keeps its 15-minute default.
const F42_BACKFILL_EXPORT_TIMEOUT_MS = 180000;

function createF42AutoBackfillExecutors(options = {}) {
    const sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService();
    const serviceOptions = (laneOptions) => ({ generationTimeoutMs: F42_BACKFILL_EXPORT_TIMEOUT_MS, ...(laneOptions || options.serviceOptions) });
    const hueService = options.hueService || new F42HueSingleDateService(serviceOptions(options.hueServiceOptions));
    const tctService = options.tctService || new F42TctSingleDateService(serviceOptions(options.tctServiceOptions));
    return {
        HUE: new F42AutoBackfillExecutor({ identity: F42_EXECUTOR_IDENTITIES.HUE, adapter: options.hueAdapter || new F42HueAdapter({ service: hueService }), sessionPreflightService }),
        TCT: new F42AutoBackfillExecutor({ identity: F42_EXECUTOR_IDENTITIES.TCT, adapter: options.tctAdapter || new F42TctAdapter({ service: tctService }), sessionPreflightService }),
    };
}

function registerF42AutoBackfillExecutors(executorRegistry, options = {}) {
    const executors = createF42AutoBackfillExecutors(options);
    for (const sourceLane of ['HUE', 'TCT']) {
        executorRegistry.register(F42_EXECUTOR_IDENTITIES[sourceLane].id, executors[sourceLane], { verified: true });
    }
    return executors;
}

module.exports = {
    F42_BACKFILL_EXPORT_TIMEOUT_MS,
    F42_EXECUTOR_IDENTITIES,
    F42AutoBackfillExecutor,
    createF42AutoBackfillExecutors,
    registerF42AutoBackfillExecutors,
};
