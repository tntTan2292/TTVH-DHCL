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

// AB-AUTH-05 (design Section 4, plan B): a human is actively completing manual login
// (LOGIN_IN_PROGRESS) or the bounded interactive-login wait window just elapsed
// (LOGIN_TIMEOUT, reported once before the backend's own state resets and re-checks) --
// neither means the session is actually broken. Carries error.autoBackfill.classification =
// 'TRANSIENT' so the existing retry mechanism handles it, per the design's explicit
// "tận dụng cơ chế retry sẵn có, không phát minh cơ chế mới".
function sessionPendingError(sourceLane, result = null) {
    const error = executorError(
        'SESSION_PENDING_HUMAN_ACTION',
        result?.message || `DKCL ${sourceLane} manual login is in progress; will recheck automatically.`,
        result
    );
    error.autoBackfill = { classification: 'TRANSIENT' };
    return error;
}

const PENDING_PREFLIGHT_STATUSES = new Set(['LOGIN_IN_PROGRESS', 'LOGIN_TIMEOUT']);

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

    // AB-AUTH-05: three-way classification instead of the previous binary
    // (SESSION_VALID vs "everything else is AUTHENTICATION_REQUIRED"). Only a status that means
    // the session is genuinely unusable (AUTHENTICATION_REQUIRED, SESSION_CHECK_FAILED, or any
    // future status not explicitly known as READY/PENDING) is treated as blocked.
    async validateSession() {
        const preflight = await this.sessionPreflightService.preflight(this.identity.sourceLane);
        if (preflight?.status === 'SESSION_VALID') return preflight;
        if (PENDING_PREFLIGHT_STATUSES.has(preflight?.status)) {
            throw sessionPendingError(this.identity.sourceLane, preflight);
        }
        throw authenticationError(this.identity.sourceLane, preflight);
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
        // AB-AUTH-04: prefer the sync service's original error code (e.g. EXPORT_TIMEOUT) over
        // the generic run.status ('FAILED'), which used to be the only thing that survived here
        // and made the queue's error map default every such failure to SYSTEM/terminal.
        throw executorError(run?.errorCode || status || 'F13_HUE_EXECUTION_FAILED', run?.safeErrorMessage || `Hue F1.3 execution ended with ${status || 'an unknown status'}.`);
    }
}

// AB-AUTH-04: the Product Owner set a hard ceiling of 10 minutes total wait per job (a healthy
// DKCL portal produces the export in 1-2 minutes; past 10 minutes is treated as a real failure,
// not something worth waiting longer for). With the lane's existing retryPolicy (maxAttempts: 3,
// ~6s of exponential backoff between attempts -- negligible on this scale), 3 attempts x 3 minutes
// = 9 minutes of export-wait plus backoff stays under the ceiling with margin:
//   3 * HUE_BACKFILL_EXPORT_TIMEOUT_MS + backoff(~6s) = 9m06s < 10m.
// This overrides DkclHueF13SyncService's own default (900000ms / 15 min, env
// DKCL_HUE_GENERATION_TIMEOUT_MS) ONLY for this Auto Backfill executor's private service
// instance -- the manual Import screen's own DkclHueF13SyncService instance
// (dkclHueF13SyncController.js) is untouched and keeps its original timeout.
const HUE_BACKFILL_EXPORT_TIMEOUT_MS = 180000; // 3 minutes

function createF13AutoBackfillExecutors(options = {}) {
    const db = options.db;
    const sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService();
    const hueSyncService = options.hueSyncService || new DkclHueF13SyncService({
        db,
        config: { generationTimeoutMs: HUE_BACKFILL_EXPORT_TIMEOUT_MS },
    });
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
    // AB-AUTH-05 follow-up: exported so autoBackfillF41Executors.js's validateSession() can reuse
    // the exact same PENDING-vs-BLOCKED classification instead of re-implementing it -- the F4.1
    // executor was missed when AB-AUTH-05 (commit d4193263) originally shipped.
    sessionPendingError,
    PENDING_PREFLIGHT_STATUSES,
};
