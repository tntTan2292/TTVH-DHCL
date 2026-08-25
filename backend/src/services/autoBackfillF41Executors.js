'use strict';

const { DkclSessionPreflightService } = require('./dkclSessionPreflightService');
const { F41HueAdapter } = require('./f41HueAdapter');
const { F41HueSingleDateService } = require('./f41HueSingleDateService');
const { F41TctAdapter } = require('./f41TctAdapter');
const { F41TctSingleDateService } = require('./f41TctSingleDateService');
const { F41_EXECUTOR_IDENTITIES } = require('./autoBackfillF41Contract');
// AB-AUTH-05 follow-up: F41AutoBackfillExecutor.validateSession() was missed when AB-AUTH-05
// (commit d4193263) shipped for F13AutoBackfillExecutor -- it kept the old binary
// SESSION_VALID-vs-hard-AUTHENTICATION_REQUIRED logic, so a manual login in progress for F4.1
// still produced a false "Cần đăng nhập thủ công" instead of the PENDING treatment F1.3 already
// gets. Reusing the exact same classification, not a re-implementation.
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
            `${identity.id} accepts exactly F4.1/HUE/YYYY-MM-DD.`
        );
    }
}

class F41AutoBackfillExecutor {
    constructor({ identity, adapter, sessionPreflightService }) {
        for (const method of ['preflight', 'withSourceLock', 'getRegistryState', 'getInteractiveClient']) {
            if (typeof sessionPreflightService?.[method] !== 'function') {
                throw new Error(`F4.1 Auto Backfill requires sessionPreflightService.${method}().`);
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
            const operationId = `AUTO_BACKFILL_F41_${source}`;
            if (entry) entry.activeOperation = operationId;
            try {
                return await this.adapter.runOneDate(request.businessDate, {
                    jobId: request.jobId,
                    refreshRequested: false,
                    portalClient,
                });
            } finally {
                if (entry?.activeOperation === operationId) entry.activeOperation = null;
            }
        });
    }

    // AB-AUTH-05 follow-up: same three-way classification as F13AutoBackfillExecutor.
    // validateSession() -- only a status that means the session is genuinely unusable is
    // treated as blocked; LOGIN_IN_PROGRESS/LOGIN_TIMEOUT is PENDING, not a hard failure.
    async validateSession() {
        const source = this.identity.sourceLane;
        const preflight = await this.sessionPreflightService.preflight(source);
        if (preflight?.status === 'SESSION_VALID') return preflight;
        if (PENDING_PREFLIGHT_STATUSES.has(preflight?.status)) {
            throw sessionPendingError(source, preflight);
        }
        throw executorError('AUTHENTICATION_REQUIRED', preflight?.error?.message || `A valid manual ${source} session is required.`, preflight);
    }
}

function createF41AutoBackfillExecutors(options = {}) {
    const sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService();
    const hueService = options.hueService || new F41HueSingleDateService(options.hueServiceOptions || options.serviceOptions);
    const tctService = options.tctService || new F41TctSingleDateService(options.tctServiceOptions || options.serviceOptions);
    const hueAdapter = options.hueAdapter || new F41HueAdapter({ service: hueService });
    const tctAdapter = options.tctAdapter || new F41TctAdapter({ service: tctService });
    return {
        HUE: new F41AutoBackfillExecutor({ identity: F41_EXECUTOR_IDENTITIES.HUE, adapter: hueAdapter, sessionPreflightService }),
        TCT: new F41AutoBackfillExecutor({ identity: F41_EXECUTOR_IDENTITIES.TCT, adapter: tctAdapter, sessionPreflightService }),
    };
}

function registerF41AutoBackfillExecutors(executorRegistry, options = {}) {
    const executors = createF41AutoBackfillExecutors(options);
    for (const sourceLane of ['HUE', 'TCT']) {
        executorRegistry.register(F41_EXECUTOR_IDENTITIES[sourceLane].id, executors[sourceLane], { verified: true });
    }
    return executors;
}

module.exports = {
    F41_EXECUTOR_IDENTITIES,
    F41AutoBackfillExecutor,
    createF41AutoBackfillExecutors,
    registerF41AutoBackfillExecutors,
};
