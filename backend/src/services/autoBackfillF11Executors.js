'use strict';

// F11-PHASE-3 - Auto Backfill executors for F1.1 (HUE and TCT), the F1.1 twin of
// autoBackfillF41Executors.js: same session classification, per-source lock and active-operation
// marker. NOT wired into autoBackfillExecutors.js yet: that, and flipping the registry lanes to
// AUTOMATED, happen only after the supervised live run has passed (portal_adapter_standard.md §2, §7).

const { DkclSessionPreflightService } = require('./dkclSessionPreflightService');
const { F11HueAdapter, F11TctAdapter, F11HueSingleDateService, F11TctSingleDateService } = require('./f11SingleDateServices');
const { F11_EXECUTOR_IDENTITIES } = require('./autoBackfillF11Contract');
const { sessionPendingError, PENDING_PREFLIGHT_STATUSES } = require('./autoBackfillF13Executors');

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
            `${identity.id} accepts exactly F1.1/${identity.sourceLane}/YYYY-MM-DD.`
        );
    }
}

class F11AutoBackfillExecutor {
    constructor({ identity, adapter, sessionPreflightService }) {
        for (const method of ['preflight', 'withSourceLock', 'getRegistryState', 'getInteractiveClient']) {
            if (typeof sessionPreflightService?.[method] !== 'function') {
                throw new Error(`F1.1 Auto Backfill requires sessionPreflightService.${method}().`);
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
            const operationId = `AUTO_BACKFILL_F11_${source}`;
            if (entry) entry.activeOperation = operationId;
            try {
                return await this.adapter.runOneDate(request.businessDate, {
                    jobId: request.jobId,
                    refreshRequested: Boolean(request.forceReimport),
                    portalClient,
                });
            } finally {
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

function createF11AutoBackfillExecutors(options = {}) {
    const sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService();
    const hueService = options.hueService || new F11HueSingleDateService(options.hueServiceOptions || options.serviceOptions);
    const tctService = options.tctService || new F11TctSingleDateService(options.tctServiceOptions || options.serviceOptions);
    return {
        HUE: new F11AutoBackfillExecutor({ identity: F11_EXECUTOR_IDENTITIES.HUE, adapter: options.hueAdapter || new F11HueAdapter({ service: hueService }), sessionPreflightService }),
        TCT: new F11AutoBackfillExecutor({ identity: F11_EXECUTOR_IDENTITIES.TCT, adapter: options.tctAdapter || new F11TctAdapter({ service: tctService }), sessionPreflightService }),
    };
}

function registerF11AutoBackfillExecutors(executorRegistry, options = {}) {
    const executors = createF11AutoBackfillExecutors(options);
    for (const sourceLane of ['HUE', 'TCT']) {
        executorRegistry.register(F11_EXECUTOR_IDENTITIES[sourceLane].id, executors[sourceLane], { verified: true });
    }
    return executors;
}

module.exports = {
    F11_EXECUTOR_IDENTITIES,
    F11AutoBackfillExecutor,
    createF11AutoBackfillExecutors,
    registerF11AutoBackfillExecutors,
};
