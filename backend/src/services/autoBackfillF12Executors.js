'use strict';

// F12-PHASE-3 - Auto Backfill executors for F1.2 (HUE and TCT), the F1.2 twin of
// autoBackfillF11Executors.js: same session classification, per-source lock and active-operation
// marker. NOT wired into autoBackfillExecutors.js yet: that, and flipping the registry lanes to
// AUTOMATED, happen only after the supervised live run has passed (portal_adapter_standard.md §2, §7).

const { DkclSessionPreflightService } = require('./dkclSessionPreflightService');
const { F12HueAdapter, F12TctAdapter, F12HueSingleDateService, F12TctSingleDateService } = require('./f12SingleDateServices');
const { F12_EXECUTOR_IDENTITIES } = require('./autoBackfillF12Contract');
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
            `${identity.id} accepts exactly F1.2/${identity.sourceLane}/YYYY-MM-DD.`
        );
    }
}

class F12AutoBackfillExecutor {
    constructor({ identity, adapter, sessionPreflightService }) {
        for (const method of ['preflight', 'withSourceLock', 'getRegistryState', 'getInteractiveClient']) {
            if (typeof sessionPreflightService?.[method] !== 'function') {
                throw new Error(`F1.2 Auto Backfill requires sessionPreflightService.${method}().`);
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
            const operationId = `AUTO_BACKFILL_F12_${source}`;
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

function createF12AutoBackfillExecutors(options = {}) {
    const sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService();
    const hueService = options.hueService || new F12HueSingleDateService(options.hueServiceOptions || options.serviceOptions);
    const tctService = options.tctService || new F12TctSingleDateService(options.tctServiceOptions || options.serviceOptions);
    return {
        HUE: new F12AutoBackfillExecutor({ identity: F12_EXECUTOR_IDENTITIES.HUE, adapter: options.hueAdapter || new F12HueAdapter({ service: hueService }), sessionPreflightService }),
        TCT: new F12AutoBackfillExecutor({ identity: F12_EXECUTOR_IDENTITIES.TCT, adapter: options.tctAdapter || new F12TctAdapter({ service: tctService }), sessionPreflightService }),
    };
}

function registerF12AutoBackfillExecutors(executorRegistry, options = {}) {
    const executors = createF12AutoBackfillExecutors(options);
    for (const sourceLane of ['HUE', 'TCT']) {
        executorRegistry.register(F12_EXECUTOR_IDENTITIES[sourceLane].id, executors[sourceLane], { verified: true });
    }
    return executors;
}

module.exports = {
    F12_EXECUTOR_IDENTITIES,
    F12AutoBackfillExecutor,
    createF12AutoBackfillExecutors,
    registerF12AutoBackfillExecutors,
};
