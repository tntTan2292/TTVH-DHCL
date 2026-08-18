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

    async createRun({ indicator = null, lane = null, actor, roles }) {
        assertAdmin(roles);
        const coverage = await this.coverageService.scan({ indicator, lane, roles: ['admin'] });
        const eligible = coverage.items.filter((item) => item.queue_eligible);
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

    async getRun(runId, { roles }) {
        const result = await this.store.getRun(runId);
        const normalizedRoles = normalizeRoles(roles);
        const registrations = this.registrations();
        const readableJobs = result.jobs.filter((job) => {
            const lane = registrations.find((entry) => entry.code === job.indicator)?.lanes?.[job.source_lane];
            const allowed = lane?.permissions?.coverageReadRoles?.map((role) => String(role).toLowerCase()) || [];
            return normalizedRoles.some((role) => allowed.includes(role));
        });
        if (readableJobs.length === 0) {
            throw queueError('AUTO_BACKFILL_RUN_FORBIDDEN', 'Run access is not granted by the indicator registry.', 403);
        }
        const readableJobIds = new Set(readableJobs.map((job) => job.id));
        const admin = normalizedRoles.includes('admin');
        return {
            run: result.run,
            jobs: readableJobs,
            attempts: result.attempts.filter((attempt) => readableJobIds.has(attempt.job_id)),
            events: result.events.filter((event) => readableJobIds.has(event.job_id) || (admin && event.job_id === null)),
        };
    }

    async pauseRun(runId, { actor, roles }) {
        assertAdmin(roles);
        return this.store.pauseRun(runId, actor);
    }

    async resumeRun(runId, { actor, roles }) {
        assertAdmin(roles);
        const result = await this.store.resumeRun(runId, actor);
        this.notifyWorkAvailable('run-resumed');
        return result;
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
                await this.store.completeLeasedJob(job.id, job.lease_token, {
                    state: 'FAILED_TERMINAL',
                    reasonCode: `COMPLETION_${before.status}`,
                    evidence: before.evidence,
                });
                return { jobId: job.id, state: 'FAILED_TERMINAL' };
            }

            const executor = this.executorRegistry.getVerified(job.executor_id);
            if (!executor) {
                await this.store.completeLeasedJob(job.id, job.lease_token, {
                    state: 'FAILED_TERMINAL',
                    reasonCode: 'VERIFIED_EXECUTOR_UNAVAILABLE',
                });
                return { jobId: job.id, state: 'FAILED_TERMINAL' };
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
                await this.store.completeLeasedJob(job.id, job.lease_token, {
                    state: 'FAILED_TERMINAL',
                    reasonCode: 'EXECUTION_DID_NOT_SATISFY_COMPLETION_POLICY',
                    evidence: after.evidence,
                });
                return { jobId: job.id, state: 'FAILED_TERMINAL' };
            }
            await this.store.completeLeasedJob(job.id, job.lease_token, {
                state: 'SUCCESS',
                reasonCode: 'COMPLETION_CONFIRMED_AFTER_EXECUTION',
                evidence: after.evidence,
            });
            return { jobId: job.id, state: 'SUCCESS' };
        } catch (error) {
            try {
                await this.store.completeLeasedJob(job.id, job.lease_token, {
                    state: 'FAILED_TERMINAL',
                    reasonCode: error.code || 'QUEUE_EXECUTION_ERROR',
                    evidence: { message: error.message },
                });
            } catch {
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
};
