'use strict';

const crypto = require('node:crypto');
const { AutoBackfillCoverageService } = require('./autoBackfillCoverageService');
const { AutoBackfillQueueStore, queueError } = require('./autoBackfillQueueStore');
const { AutoBackfillExecutorRegistry } = require('./autoBackfillExecutorRegistry');
const {
    REGISTRY_VERSION,
    listIndicatorConfigs,
    validateIndicatorRegistration,
} = require('./importIndicatorRegistry');
const { COMPLETION_STATUSES } = require('./autoBackfillCompletionPolicies');
const { AutoBackfillSafetyCoordinator, scopeKey } = require('./autoBackfillSafetyCoordinator');
const { normalizeBusinessDate } = require('./autoBackfillBusinessCalendar');

function normalizeRoles(roles) {
    const values = Array.isArray(roles) ? roles : [roles];
    return values.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean);
}

function assertAdmin(roles) {
    if (!normalizeRoles(roles).includes('admin')) {
        throw queueError('AUTO_BACKFILL_ADMIN_REQUIRED', 'Auto Backfill run control is restricted to Admin.', 403);
    }
}

function stableRequestKey(value) {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

// Optional enqueue-scope filter for createRun(): when neither bound is
// supplied, behavior is unchanged (the full coverage-eligible set is
// enqueued). Reuses the shared business-date validator so malformed dates
// fail the same way (`INVALID_DATE`, 400) as everywhere else in Auto
// Backfill; an inverted range is rejected explicitly rather than silently
// producing an empty job set.
function normalizeOptionalDateRange(fromDate, toDate) {
    const normalizedFrom = fromDate ? normalizeBusinessDate(fromDate, 'from_date') : null;
    const normalizedTo = toDate ? normalizeBusinessDate(toDate, 'to_date') : null;
    if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
        throw queueError('AUTO_BACKFILL_DATE_RANGE_INVALID', 'from_date must be less than or equal to to_date.', 400);
    }
    return { fromDate: normalizedFrom, toDate: normalizedTo };
}

class AutoBackfillQueueService {
    constructor({
        store,
        coverageService,
        executorRegistry = new AutoBackfillExecutorRegistry(),
        registryProvider = listIndicatorConfigs,
        registryVersion = REGISTRY_VERSION,
        completionDb = null,
        fsImpl = null,
        workerId = `backend-${process.pid}-${crypto.randomUUID()}`,
        heartbeatMs = 15000,
        onWorkAvailable = null,
        safetyCoordinator = new AutoBackfillSafetyCoordinator(),
    } = {}) {
        if (!(store instanceof AutoBackfillQueueStore)) throw new Error('AutoBackfillQueueService requires an AutoBackfillQueueStore.');
        if (!(coverageService instanceof AutoBackfillCoverageService) && typeof coverageService?.scan !== 'function') {
            throw new Error('AutoBackfillQueueService requires a coverage service.');
        }
        this.store = store;
        this.coverageService = coverageService;
        this.executorRegistry = executorRegistry;
        this.registryProvider = registryProvider;
        this.registryVersion = registryVersion;
        this.completionDb = completionDb || coverageService.db;
        this.fs = fsImpl || coverageService.fs;
        this.workerId = workerId;
        this.heartbeatMs = heartbeatMs;
        this.onWorkAvailable = onWorkAvailable;
        this.safetyCoordinator = safetyCoordinator;
    }

    setWorkAvailableNotifier(notifier) {
        if (notifier !== null && typeof notifier !== 'function') throw new Error('Queue work notifier must be a function or null.');
        this.onWorkAvailable = notifier;
        return this;
    }

    notifyWorkAvailable(reason) {
        this.onWorkAvailable?.(reason);
    }

    registrations() {
        return this.registryProvider().map((entry) => validateIndicatorRegistration(entry, entry.code));
    }

    findRegistration(indicatorCode, laneCode) {
        const indicator = this.registrations().find((entry) => entry.code === indicatorCode);
        const lane = indicator?.lanes?.[laneCode];
        if (!indicator || !lane) {
            throw queueError('AUTO_BACKFILL_REGISTRATION_UNAVAILABLE', `Queue registration '${indicatorCode}/${laneCode}' is unavailable.`, 409);
        }
        return { indicator, lane };
    }

    async createRun({ indicator = null, lane = null, fromDate = null, toDate = null, actor, roles }) {
        assertAdmin(roles);
        const range = normalizeOptionalDateRange(fromDate, toDate);
        const coverage = await this.coverageService.scan({ indicator, lane, roles: ['admin'] });
        const eligible = coverage.items
            .filter((item) => item.queue_eligible)
            .filter((item) => !range.fromDate || item.business_date >= range.fromDate)
            .filter((item) => !range.toDate || item.business_date <= range.toDate);
        if (eligible.length === 0) {
            throw queueError(
                'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE',
                'No queue-eligible coverage has a verified Portal executor. MANUAL_ONLY coverage remains read-only.',
                409,
            );
        }

        const jobs = eligible.map((item) => {
            const registration = this.findRegistration(item.indicator, item.source_lane);
            const adapter = registration.lane.portalAdapter;
            if (registration.lane.automationMode !== 'AUTOMATED' || !adapter?.verified) {
                throw queueError('AUTO_BACKFILL_EXECUTOR_NOT_VERIFIED', `Portal adapter for ${item.indicator}/${item.source_lane} is not verified.`, 409);
            }
            if (!this.executorRegistry.getVerified(adapter.id)) {
                throw queueError('AUTO_BACKFILL_EXECUTOR_NOT_AVAILABLE', `Verified executor '${adapter.id}' is not available in this runtime.`, 503);
            }
            if (registration.lane.completionPolicy.id !== item.completion_policy_id) {
                throw queueError('AUTO_BACKFILL_COMPLETION_POLICY_MISMATCH', `Completion policy changed for ${item.indicator}/${item.source_lane}.`, 409);
            }
            return {
                indicator: item.indicator,
                sourceLane: item.source_lane,
                businessDate: item.business_date,
                indicatorPriority: registration.indicator.priority,
                lanePriority: registration.lane.priority,
                completionPolicyId: item.completion_policy_id,
                executorId: adapter.id,
                resourceIdentity: adapter.resourceIdentity,
                circuitScopeKey: scopeKey({
                    adapterId: adapter.id,
                    sourceLane: item.source_lane,
                    resourceIdentity: adapter.resourceIdentity,
                }),
            };
        });
        jobs.sort((left, right) =>
            right.businessDate.localeCompare(left.businessDate)
            || left.indicatorPriority - right.indicatorPriority
            || left.lanePriority - right.lanePriority
            || left.indicator.localeCompare(right.indicator)
            || left.sourceLane.localeCompare(right.sourceLane));

        const requestKey = stableRequestKey({
            registry_version: coverage.registry_version || this.registryVersion,
            as_of_business_date: coverage.as_of_business_date,
            indicator: indicator ? String(indicator).toUpperCase() : null,
            lane: lane ? String(lane).toUpperCase() : null,
            identities: jobs.map((job) => [job.indicator, job.sourceLane, job.businessDate]),
        });
        const result = await this.store.createRunWithJobs({
            requestKey,
            registryVersion: coverage.registry_version || this.registryVersion,
            asOfBusinessDate: coverage.as_of_business_date,
            requestedIndicator: indicator ? String(indicator).toUpperCase() : null,
            requestedLane: lane ? String(lane).toUpperCase() : null,
            requestedBy: String(actor || 'unknown'),
            jobs,
        });
        this.notifyWorkAvailable('run-created');
        return result;
    }

    async getRun(runId, { roles, permissionField = 'coverageReadRoles' }) {
        const result = await this.store.getRun(runId);
        const normalizedRoles = normalizeRoles(roles);
        const registrations = this.registrations();
        const readableJobs = result.jobs.filter((job) => {
            const lane = registrations.find((entry) => entry.code === job.indicator)?.lanes?.[job.source_lane];
            const allowed = lane?.permissions?.[permissionField]?.map((role) => String(role).toLowerCase()) || [];
            return normalizedRoles.some((role) => allowed.includes(role));
        });
        if (readableJobs.length === 0) {
            throw queueError('AUTO_BACKFILL_RUN_FORBIDDEN', 'Run access is not granted by the indicator registry.', 403);
        }
        const readableJobIds = new Set(readableJobs.map((job) => job.id));
        const admin = normalizedRoles.includes('admin');
        const canReadRunEvents = admin || (permissionField === 'auditReadRoles' && readableJobs.length === result.jobs.length);
        const readableScopeKeys = new Set(readableJobs.map((job) => job.circuit_scope_key).filter(Boolean));
        return {
            run: result.run,
            jobs: readableJobs,
            attempts: result.attempts.filter((attempt) => readableJobIds.has(attempt.job_id)),
            events: result.events.filter((event) => readableJobIds.has(event.job_id) || (canReadRunEvents && event.job_id === null)),
            circuits: result.circuits.filter((circuit) => readableScopeKeys.has(circuit.scope_key)),
        };
    }

    async pauseRun(runId, { actor, roles }) {
        assertAdmin(roles);
        return this.store.pauseRun(runId, actor);
    }

    async resumeRun(runId, { actor, roles }) {
        assertAdmin(roles);
        const persisted = await this.store.getRun(runId);
        if (persisted.run.safety_state === 'WAITING_AUTH') {
            const waitingJobs = persisted.jobs.filter((job) => job.safety_state === 'WAITING_AUTH');
            for (const job of waitingJobs) {
                const executor = this.executorRegistry.getVerified(job.executor_id);
                if (typeof executor?.validateSession !== 'function') {
                    throw queueError(
                        'AUTO_BACKFILL_SESSION_VALIDATOR_UNAVAILABLE',
                        `Verified executor '${job.executor_id}' cannot validate the supported session.`,
                        503,
                    );
                }
                await executor.validateSession({
                    indicator: job.indicator,
                    sourceLane: job.source_lane,
                    businessDate: job.business_date,
                    jobId: job.id,
                });
            }
        }
        const result = await this.store.resumeRun(runId, actor);
        this.notifyWorkAvailable('run-resumed');
        return result;
    }

    async resetCircuits(runId, { actor, roles }) {
        assertAdmin(roles);
        const result = await this.store.resetCircuitsForRun(runId, actor);
        this.notifyWorkAvailable('circuit-reset');
        return result;
    }

    async getEvents(runId, { roles }) {
        const result = await this.getRun(runId, { roles, permissionField: 'auditReadRoles' });
        return { run_id: result.run.id, events: result.events };
    }

    async getReport(runId, { roles }) {
        const result = await this.getRun(runId, { roles, permissionField: 'auditReadRoles' });
        const attemptsByJob = new Map();
        for (const attempt of result.attempts) {
            if (!attemptsByJob.has(attempt.job_id)) attemptsByJob.set(attempt.job_id, []);
            attemptsByJob.get(attempt.job_id).push(attempt);
        }
        const items = result.jobs.map((job) => {
            const attempts = attemptsByJob.get(job.id) || [];
            const latest = attempts.at(-1) || null;
            return {
                indicator: job.indicator,
                source_lane: job.source_lane,
                business_date: job.business_date,
                state: job.safety_state || job.state,
                error_signature: job.last_error_signature || latest?.error_signature || null,
                classification: job.last_error_class || latest?.classification || null,
                attempt_count: attempts.length,
                action_required: job.action_required || latest?.action_required || null,
            };
        });
        return {
            run_id: result.run.id,
            run_state: result.run.safety_state || result.run.status,
            action_required: result.run.action_required || null,
            totals: items.reduce((totals, item) => {
                totals.total += 1;
                totals[item.state] = (totals[item.state] || 0) + 1;
                return totals;
            }, { total: 0 }),
            items,
            circuits: result.circuits.map((circuit) => ({
                adapter_id: circuit.adapter_id,
                source_lane: circuit.source_lane,
                resource_identity: circuit.resource_identity,
                state: circuit.state,
                error_signature: circuit.error_signature,
                consecutive_count: circuit.consecutive_count,
            })),
        };
    }

    async evaluateCompletion(job) {
        const { indicator, lane } = this.findRegistration(job.indicator, job.source_lane);
        if (lane.completionPolicy.id !== job.completion_policy_id) {
            throw queueError('AUTO_BACKFILL_COMPLETION_POLICY_MISMATCH', `Completion policy changed for ${job.indicator}/${job.source_lane}.`, 409);
        }
        return lane.completionPolicy.evaluate({
            db: this.completionDb,
            fs: this.fs,
            indicator,
            lane,
            businessDate: job.business_date,
        });
    }

    async processNext({ simulateCrashAfterExecutor = false } = {}) {
        await this.recoverInterruptedWork();
        const job = await this.store.acquireNextJob(this.workerId);
        if (!job) return null;

        let heartbeat = null;
        try {
            const before = await this.evaluateCompletion(job);
            if (before.status === COMPLETION_STATUSES.SUCCESS) {
                await this.store.completeLeasedJob(job.id, job.lease_token, {
                    state: 'SKIPPED_ALREADY_SUCCESS',
                    reasonCode: 'COMPLETION_CONFIRMED_BEFORE_EXECUTION',
                    evidence: before.evidence,
                });
                return { jobId: job.id, state: 'SKIPPED_ALREADY_SUCCESS' };
            }
            if (before.status !== COMPLETION_STATUSES.MISSING) {
                const completionError = new Error(`Completion state ${before.status} requires manual review.`);
                completionError.code = `COMPLETION_${before.status}`;
                completionError.autoBackfill = { classification: 'DATA' };
                throw completionError;
            }

            const executor = this.executorRegistry.getVerified(job.executor_id);
            if (!executor) {
                const executorError = new Error(`Verified executor '${job.executor_id}' is unavailable.`);
                executorError.code = 'VERIFIED_EXECUTOR_UNAVAILABLE';
                executorError.autoBackfill = { classification: 'SYSTEM' };
                throw executorError;
            }
            heartbeat = setInterval(() => {
                this.store.renewLease(job.id, job.lease_token).catch(() => clearInterval(heartbeat));
            }, this.heartbeatMs);
            heartbeat.unref?.();
            await executor.execute({
                indicator: job.indicator,
                sourceLane: job.source_lane,
                businessDate: job.business_date,
                jobId: job.id,
            });
            if (simulateCrashAfterExecutor) return { jobId: job.id, state: 'SIMULATED_CRASH' };

            const after = await this.evaluateCompletion(job);
            if (after.status !== COMPLETION_STATUSES.SUCCESS) {
                const integrityError = new Error('Executor returned without satisfying the exact completion policy.');
                integrityError.code = 'EXECUTION_DID_NOT_SATISFY_COMPLETION_POLICY';
                integrityError.autoBackfill = { classification: 'INTEGRITY_FATAL' };
                throw integrityError;
            }
            const { lane } = this.findRegistration(job.indicator, job.source_lane);
            await this.store.recordCircuitSuccess(job, this.safetyCoordinator.scopeFor(lane, job));
            await this.store.completeLeasedJob(job.id, job.lease_token, {
                state: 'SUCCESS',
                reasonCode: 'COMPLETION_CONFIRMED_AFTER_EXECUTION',
                evidence: after.evidence,
            });
            return { jobId: job.id, state: 'SUCCESS' };
        } catch (error) {
            try {
                const completion = await this.evaluateCompletion(job).catch(() => null);
                if (completion?.status === COMPLETION_STATUSES.SUCCESS) {
                    await this.store.completeLeasedJob(job.id, job.lease_token, {
                        state: 'SKIPPED_ALREADY_SUCCESS',
                        reasonCode: 'COMPLETION_CONFIRMED_AFTER_EXECUTOR_ERROR',
                        evidence: completion.evidence,
                    });
                    return { jobId: job.id, state: 'SKIPPED_ALREADY_SUCCESS' };
                }
                const { lane } = this.findRegistration(job.indicator, job.source_lane);
                const failure = this.safetyCoordinator.classify(error, { lane, job });
                const maxAttempts = this.safetyCoordinator.maxAttempts(lane.retryPolicy);
                const retryAt = failure.retryable && Number(job.attempt_number) < maxAttempts
                    ? new Date(this.store.clock().getTime() + this.safetyCoordinator.retryDelayMs(lane.retryPolicy, job.attempt_number)).toISOString()
                    : null;
                const result = await this.store.recordLeasedFailure(job.id, job.lease_token, {
                    failure,
                    maxAttempts,
                    retryAt,
                    circuitThreshold: lane.circuitScope.threshold,
                });
                if (result.haltCoordinator) {
                    const haltError = new Error(result.actionRequired);
                    haltError.code = result.state === 'WAITING_AUTH'
                        ? 'AUTHENTICATION_REQUIRED'
                        : 'AUTO_BACKFILL_INTEGRITY_BLOCKED';
                    // AB-AUTH-03: carry the lane so the coordinator can block just this source
                    // instead of halting every lane (see AutoBackfillWorkerCoordinator).
                    haltError.sourceLane = job.source_lane;
                    haltError.safetyHandled = true;
                    throw haltError;
                }
                return { jobId: job.id, ...result };
            } catch (persistenceError) {
                if (persistenceError?.safetyHandled) throw persistenceError;
                // A simulated process failure or lost lease is recovered from persisted state.
            }
            throw error;
        } finally {
            if (heartbeat) clearInterval(heartbeat);
        }
    }

    async recoverInterruptedWork() {
        const recovered = [];
        for (;;) {
            const job = await this.store.claimInterruptedJobForRecovery();
            if (!job) break;
            try {
                const completion = await this.evaluateCompletion(job);
                const completed = completion.status === COMPLETION_STATUSES.SUCCESS;
                const state = await this.store.resolveRecovery(job.id, {
                    completed,
                    evidence: completion.evidence,
                    reasonCode: completed ? 'RECOVERY_COMPLETION_CONFIRMED' : 'RECOVERY_COMPLETION_MISSING',
                });
                recovered.push({ jobId: job.id, state });
            } catch (error) {
                await this.store.resolveRecovery(job.id, {
                    completed: false,
                    reasonCode: error.code || 'RECOVERY_COMPLETION_CHECK_FAILED',
                });
                recovered.push({ jobId: job.id, state: 'QUEUED', warning: error.code || error.message });
            }
        }
        return recovered;
    }
}

module.exports = {
    AutoBackfillQueueService,
    assertAdmin,
    stableRequestKey,
    normalizeOptionalDateRange,
};
