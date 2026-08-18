'use strict';

const { DkclSessionPreflightService } = require('./dkclSessionPreflightService');
const { F41HueAdapter } = require('./f41HueAdapter');
const { F41HueSingleDateService } = require('./f41HueSingleDateService');
const { F41_EXECUTOR_IDENTITIES } = require('./autoBackfillF41Contract');

function executorError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details) error.details = details;
    return error;
}

function assertRequest(request) {
    const identity = F41_EXECUTOR_IDENTITIES.HUE;
    if (request?.indicator !== identity.indicator
        || request?.sourceLane !== identity.sourceLane
        || !/^\d{4}-\d{2}-\d{2}$/.test(String(request?.businessDate || ''))) {
        throw executorError(
            'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH',
            `${identity.id} accepts exactly F4.1/HUE/YYYY-MM-DD.`
        );
    }
}

class F41HueAutoBackfillExecutor {
    constructor({ adapter, sessionPreflightService }) {
        for (const method of ['preflight', 'withSourceLock', 'getRegistryState', 'getInteractiveClient']) {
            if (typeof sessionPreflightService?.[method] !== 'function') {
                throw new Error(`F4.1 HUE Auto Backfill requires sessionPreflightService.${method}().`);
            }
        }
        this.identity = F41_EXECUTOR_IDENTITIES.HUE;
        this.adapter = adapter;
        this.sessionPreflightService = sessionPreflightService;
    }

    async execute(request) {
        assertRequest(request);
        const preflight = await this.sessionPreflightService.preflight('HUE');
        if (preflight?.status !== 'SESSION_VALID') {
            throw executorError('AUTHENTICATION_REQUIRED', preflight?.error?.message || 'A valid manual HUE session is required.', preflight);
        }
        return this.sessionPreflightService.withSourceLock('HUE', async () => {
            const entry = this.sessionPreflightService.getRegistryState('HUE');
            if (entry?.activeOperation) {
                throw executorError('DKCL_SOURCE_OPERATION_ACTIVE', `DKCL HUE is already owned by '${entry.activeOperation}'.`);
            }
            const portalClient = this.sessionPreflightService.getInteractiveClient('HUE') || null;
            if (!portalClient) throw executorError('AUTHENTICATION_REQUIRED', 'A valid manual HUE session is required.');
            const operationId = 'AUTO_BACKFILL_F41_HUE';
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
}

function createF41AutoBackfillExecutors(options = {}) {
    const sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService();
    const service = options.hueService || new F41HueSingleDateService(options.serviceOptions);
    const adapter = options.hueAdapter || new F41HueAdapter({ service });
    return {
        HUE: new F41HueAutoBackfillExecutor({ adapter, sessionPreflightService }),
    };
}

function registerF41AutoBackfillExecutors(executorRegistry, options = {}) {
    const executors = createF41AutoBackfillExecutors(options);
    executorRegistry.register(F41_EXECUTOR_IDENTITIES.HUE.id, executors.HUE, { verified: true });
    return executors;
}

module.exports = {
    F41_EXECUTOR_IDENTITIES,
    F41HueAutoBackfillExecutor,
    createF41AutoBackfillExecutors,
    registerF41AutoBackfillExecutors,
};
