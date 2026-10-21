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
const { runWithImportContext } = require('./importLogAudit');
const { bumpCoverageVersion } = require('./coverageVersion');

function normalizeRoles(roles) {
    const values = Array.isArray(roles) ? roles : [roles];
    return values.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean);
}

function assertAdmin(roles) {
    if (!normalizeRoles(roles).includes('admin')) {
        throw queueError('AUTO_BACKFILL_ADMIN_REQUIRED', 'Auto Backfill run control is restricted to Admin.', 403);
    }
}

function addDays(isoDate, delta) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
}

// PO decision 2026-10-16: the chosen day plus the two days before it (D, D-1, D-2).
const REFRESH_DAY_SPAN = 3;

function sortJobs(jobs) {
    return jobs.sort((left, right) =>
        right.businessDate.localeCompare(left.businessDate)
        || left.indicatorPriority - right.indicatorPriority
        || left.lanePriority - right.lanePriority
        || left.indicator.localeCompare(right.indicator)
        || left.sourceLane.localeCompare(right.sourceLane));
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

    async createRun({ indicator = null, lane = null, fromDate = null, toDate = null, includeExcluded = false, confirmReplaceCompleted = false, anchorDate = null, actor, roles }) {
        assertAdmin(roles);
        // IMPORT-LOG-AUDIT-01 Part B (PO decision 2026-10-16): one chosen day D plus the two days before it
        // (D, D-1, D-2 = REFRESH_DAY_SPAN days), every ACTIVE indicator on every AUTOMATED lane.
        if (anchorDate) return this.createAnchorRun({ anchorDate, indicator, lane, fromDate, toDate, includeExcluded, confirmReplaceCompleted, actor });
        const range = normalizeOptionalDateRange(fromDate, toDate);
        // AB-CALENDAR-01 D1 (design Section 4.2): include_excluded is accepted only
        // when the request resolves to exactly one indicator, one source lane and one
        // business date. A broader request is rejected outright, not silently narrowed.
        const isSingleTupleRequest = Boolean(indicator) && Boolean(lane)
            && Boolean(range.fromDate) && Boolean(range.toDate) && range.fromDate === range.toDate;
        if (includeExcluded && !isSingleTupleRequest) {
            throw queueError(
                'AUTO_BACKFILL_INCLUDE_EXCLUDED_REQUIRES_SINGLE_TUPLE',
                'include_excluded requires exactly one indicator, one source lane and one business date (from_date === to_date).',
                400,
            );
        }
        // IMPORT-BULK-REIMPORT-ALL-01 Part A (Design of Record v2 §7.2/§7.3, PO
        // decision 4): confirm_replace_completed is accepted only for the same
        // single-tuple shape include_excluded already requires -- one indicator,
        // one source lane, one business date.
        if (confirmReplaceCompleted && !isSingleTupleRequest) {
            throw queueError(
                'AUTO_BACKFILL_CONFIRM_REPLACE_REQUIRES_SINGLE_TUPLE',
                'confirm_replace_completed requires exactly one indicator, one source lane and one business date (from_date === to_date).',
                400,
            );
        }
        const coverage = await this.coverageService.scan({ indicator, lane, roles: ['admin'], fresh: true });
        const inRange = (item) => (!range.fromDate || item.business_date >= range.fromDate)
            && (!range.toDate || item.business_date <= range.toDate);
        const isReadmissibleExcluded = (item) => {
            if (!includeExcluded || item.status !== 'EXCLUDED') return false;
            // The flag re-admits an EXCLUDED day only if it would otherwise be fully
            // runnable -- it never bypasses MANUAL_ONLY, an unverified executor, or an
            // inactive indicator (design Section 4.2).
            const { indicator: registeredIndicator, lane: registeredLane } = this.findRegistration(item.indicator, item.source_lane);
            return registeredIndicator.status === 'ACTIVE'
                && registeredLane.automationMode === 'AUTOMATED'
                && item.completion_status === COMPLETION_STATUSES.MISSING;
        };
        // IMPORT-BULK-REIMPORT-ALL-01 Part A (Design of Record v2 §7.3): a
        // COMPLETED day for a PAUSED indicator or a MANUAL_ONLY lane must not
        // become reimportable through this flag, exactly as a holiday day
        // can't today. No raw-completion-status precondition applies here
        // (unlike isReadmissibleExcluded, which requires MISSING) -- the whole
        // point of this admission path is that the raw status is SUCCESS.
        const isReadmissibleCompleted = (item) => {
            if (!confirmReplaceCompleted || item.status !== 'COMPLETED') return false;
            const { indicator: registeredIndicator, lane: registeredLane } = this.findRegistration(item.indicator, item.source_lane);
            return registeredIndicator.status === 'ACTIVE' && registeredLane.automationMode === 'AUTOMATED';
        };
        // Refresh window (PO decision 2026-10-10): the portal revises a day's figures after it was first
        // fetched, so an unscoped run (no date range, no single-tuple flag) also re-imports the last N
        // already-completed days before the newest day (N = indicator.refreshWindowDays, 0 = off): with
        // N = 3 and newest day 09, days 06, 07, 08. Each tuple is refreshed once per planning day, only
        // for ACTIVE indicators and AUTOMATED lanes with a verified adapter, only when the day really
        // holds data (raw completion SUCCESS).
        const refreshEnabled = !range.fromDate && !range.toDate && !includeExcluded && !confirmReplaceCompleted;
        const alreadyRefreshed = refreshEnabled ? await this.store.listRefreshedTuples(coverage.as_of_business_date) : new Set();
        const isRefreshCandidate = (item) => {
            if (!refreshEnabled || item.status !== 'COMPLETED' || item.completion_status !== COMPLETION_STATUSES.SUCCESS) return false;
            const { indicator: registeredIndicator, lane: registeredLane } = this.findRegistration(item.indicator, item.source_lane);
            const windowDays = Number(registeredIndicator.refreshWindowDays || 0);
            if (windowDays <= 0 || registeredIndicator.status !== 'ACTIVE') return false;
            if (registeredLane.automationMode !== 'AUTOMATED' || !registeredLane.portalAdapter?.verified) return false;
            if (item.business_date > addDays(coverage.to_date, -1) || item.business_date < addDays(coverage.to_date, -windowDays)) return false;
            return !alreadyRefreshed.has(`${item.indicator}|${item.source_lane}|${item.business_date}`);
        };
        const eligible = coverage.items
            .filter(inRange)
            .filter((item) => item.queue_eligible || isReadmissibleExcluded(item) || isReadmissibleCompleted(item) || isRefreshCandidate(item));
        if (eligible.length === 0) {
            throw queueError(
                'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE',
                'No queue-eligible coverage has a verified Portal executor. MANUAL_ONLY coverage remains read-only.',
                409,
            );
        }

        const jobs = eligible.map((item) => {
            // IMPORT-BULK-REIMPORT-ALL-01 Part A (Design of Record v2 §7.4):
            // the single source of truth for "this is a confirmed Nhập lại
            // job" -- set only here, through isReadmissibleCompleted(), never
            // re-derived downstream.
            const replaced = isReadmissibleCompleted(item);
            const refreshed = !replaced && isRefreshCandidate(item);
            return this.buildJobSpec(item, {
                forceReimport: replaced || refreshed,
                importMode: replaced ? 'REIMPORT' : (refreshed ? 'REFRESH_WINDOW' : 'NEW'),
            });
        });
        sortJobs(jobs);

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

    buildJobSpec(item, { forceReimport, importMode }) {
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
            forceReimport,
            importMode,
        };
    }

    // IMPORT-LOG-AUDIT-01 Part B: "Import cả ngày + bù 3 ngày". One run holding the chosen day D and the days
    // D-1, D-2 for every ACTIVE indicator on every AUTOMATED lane. A day with no data is loaded; a COMPLETED day is
    // replaced (admin-only, one confirmation, same as Nhập lại). Every existing guard stays: holiday / exception days
    // (EXCLUDED), MANUAL_ONLY lanes, lanes without a verified executor, future days. A tuple that already has an open
    // job is skipped by the store, as for any run.
    async createAnchorRun({ anchorDate, indicator, lane, fromDate, toDate, includeExcluded, confirmReplaceCompleted, actor }) {
        if (indicator || lane || fromDate || toDate || includeExcluded) {
            throw queueError(
                'AUTO_BACKFILL_ANCHOR_DATE_EXCLUSIVE',
                'anchor_date cannot be combined with indicator, lane, from_date, to_date or include_excluded (confirm_replace_completed is the only extra field allowed).',
                400,
            );
        }
        const anchor = normalizeBusinessDate(anchorDate, 'anchor_date');
        const windowDates = Array.from({ length: REFRESH_DAY_SPAN }, (_, index) => addDays(anchor, -index));
        const coverage = await this.coverageService.scan({ roles: ['admin'], fresh: true });
        if (anchor > coverage.to_date) {
            throw queueError(
                'AUTO_BACKFILL_ANCHOR_DATE_IN_FUTURE',
                `anchor_date ${anchor} is after the newest importable day ${coverage.to_date}.`,
                400,
            );
        }
        const windowSet = new Set(windowDates);
        const jobs = [];
        const skipped = [];
        for (const item of coverage.items.filter((entry) => windowSet.has(entry.business_date))) {
            const { indicator: registeredIndicator, lane: registeredLane } = this.findRegistration(item.indicator, item.source_lane);
            const runnable = registeredIndicator.status === 'ACTIVE'
                && registeredLane.automationMode === 'AUTOMATED'
                && registeredLane.portalAdapter?.verified
                && Boolean(this.executorRegistry.getVerified(registeredLane.portalAdapter.id));
            const replaceable = item.status === 'COMPLETED' && runnable;
            if (runnable && (item.queue_eligible || replaceable)) {
                jobs.push(this.buildJobSpec(item, { forceReimport: replaceable && !item.queue_eligible, importMode: 'REFRESH_DAY' }));
            } else {
                skipped.push({
                    indicator: item.indicator,
                    source_lane: item.source_lane,
                    business_date: item.business_date,
                    reason: !runnable ? 'NOT_AUTOMATED_OR_NOT_ACTIVE' : String(item.status || 'NOT_ELIGIBLE'),
                });
            }
        }
        if (jobs.length === 0) {
            throw queueError(
                'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE',
                'No day in the requested window has a verified Portal executor.',
                409,
            );
        }
        // Same rule as Nhập lại: overwriting a completed day needs the caller's explicit confirmation on the API too.
        const replaceCount = jobs.filter((job) => job.forceReimport).length;
        if (replaceCount > 0 && !confirmReplaceCompleted) {
            throw queueError(
                'AUTO_BACKFILL_ANCHOR_CONFIRM_REQUIRED',
                `${replaceCount} completed day(s) would be overwritten; resend with confirm_replace_completed=true to confirm.`,
                409,
            );
        }
        sortJobs(jobs);
        const requestKey = stableRequestKey({
            registry_version: coverage.registry_version || this.registryVersion,
            as_of_business_date: coverage.as_of_business_date,
            mode: 'REFRESH_DAY',
            anchor_date: anchor,
            identities: jobs.map((job) => [job.indicator, job.sourceLane, job.businessDate]),
        });
        const result = await this.store.createRunWithJobs({
            requestKey,
            registryVersion: coverage.registry_version || this.registryVersion,
            asOfBusinessDate: coverage.as_of_business_date,
            requestedIndicator: null,
            requestedLane: null,
            requestedBy: String(actor || 'unknown'),
            jobs,
        });
        this.notifyWorkAvailable('run-created');
        // Counts describe what was really created: a duplicate request, or tuples that already had an open
        // job, create fewer (or no) jobs than were planned.
        const created = result.creation?.created ? result.jobs : [];
        return {
            ...result,
            anchor: {
                anchor_date: anchor,
                window_dates: windowDates,
                job_count: created.length,
                replace_count: created.filter((job) => Number(job.force_reimport) === 1).length,
                skipped,
            },
        };
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

    // AB-AUTH-06 (design Section 5, C1): list every open run, permission-filtered the same way
    // getRun() is -- a run is included only if at least one of its (indicator, lane) pairs is
    // readable by the caller's roles, and its displayed indicators/lanes are trimmed to the
    // readable subset so a restricted role never sees a lane name it has no access to.
    async listRuns({ status = null, limit = 50, offset = 0, roles, permissionField = 'coverageReadRoles' } = {}) {
        const normalizedRoles = normalizeRoles(roles);
        const registrations = this.registrations();
        const statuses = status
            ? (Array.isArray(status) ? status : String(status).split(',')).map((value) => value.trim().toUpperCase()).filter(Boolean)
            : undefined;
        const entries = await this.store.listRuns({ statuses, limit, offset });

        const isPairReadable = (indicator, sourceLane) => {
            const lane = registrations.find((entry) => entry.code === indicator)?.lanes?.[sourceLane];
            const allowed = lane?.permissions?.[permissionField]?.map((role) => String(role).toLowerCase()) || [];
            return normalizedRoles.some((role) => allowed.includes(role));
        };

        return entries
            .map((entry) => {
                const readablePairs = entry.indicatorLanePairs.filter((pair) => isPairReadable(pair.indicator, pair.sourceLane));
                if (readablePairs.length === 0) return null;
                const readableLaneSet = new Set(readablePairs.map((pair) => pair.sourceLane));
                return {
                    run: entry.run,
                    jobTotal: entry.jobTotal,
                    jobCountsByState: entry.jobCountsByState,
                    blockedLanes: entry.blockedLanes.filter((lane) => readableLaneSet.has(lane)),
                    indicators: Array.from(new Set(readablePairs.map((pair) => pair.indicator))),
                    lanes: Array.from(readableLaneSet),
                };
            })
            .filter(Boolean);
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

    // AUTO-BACKFILL-PARALLEL-LANES-01: with a lane only that source lane's slot is used (and only its jobs are taken),
    // so one call per lane can run at the same time; without a lane the queue stays one serial slot.
    async processNext({ simulateCrashAfterExecutor = false, lane = null } = {}) {
        if (lane) await this.recoverInterruptedWork({ lane });
        else await this.recoverInterruptedWork();
        const job = lane
            ? await this.store.acquireNextJob(this.workerId, { lane })
            : await this.store.acquireNextJob(this.workerId);
        if (!job) return null;

        // IMPORT-BULK-REIMPORT-ALL-01 Part A (Design of Record v2 §7.4 gate 1): the
        // single source of truth for whether this attempt may overwrite a
        // SUCCESS date. Read once so every gate below (this recheck, the
        // executor call, and the error-path recheck) agrees on the same value
        // for the whole attempt.
        const forceReimport = Boolean(job.force_reimport);

        let heartbeat = null;
        try {
            const before = await this.evaluateCompletion(job);
            if (before.status === COMPLETION_STATUSES.SUCCESS && !forceReimport) {
                await this.store.completeLeasedJob(job.id, job.lease_token, {
                    state: 'SKIPPED_ALREADY_SUCCESS',
                    reasonCode: 'COMPLETION_CONFIRMED_BEFORE_EXECUTION',
                    evidence: before.evidence,
                });
                return { jobId: job.id, state: 'SKIPPED_ALREADY_SUCCESS' };
            }
            // A force_reimport job is allowed to proceed on SUCCESS (that is the
            // whole point of this attempt); every other job, and every status
            // other than MISSING/SUCCESS-with-force_reimport, still requires
            // manual review exactly as before.
            const beforeIsExecutable = before.status === COMPLETION_STATUSES.MISSING
                || (forceReimport && before.status === COMPLETION_STATUSES.SUCCESS);
            if (!beforeIsExecutable) {
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
                // Only a lost lease ends the heartbeat. A busy database (a long import on the other lane) makes one renewal
                // fail; the next tick tries again, so a job that is still working is not taken for an interrupted one.
                this.store.renewLease(job.id, job.lease_token).catch((error) => {
                    if (error?.code === 'AUTO_BACKFILL_LEASE_LOST') clearInterval(heartbeat);
                });
            }, this.heartbeatMs);
            heartbeat.unref?.();
            // IMPORT-LOG-AUDIT-01: the import_log rows written under this call carry who asked, the run, the
            // job, the mode and (for a replace) how many rows the day held before.
            const auditContext = {
                actor: typeof this.store.getRunRequestedBy === 'function'
                    ? await this.store.getRunRequestedBy(job.run_id).catch(() => null)
                    : null,
                runId: job.run_id,
                jobId: job.id,
                importMode: job.import_mode || (forceReimport ? 'REIMPORT' : 'NEW'),
                replacedRowCount: forceReimport ? (before.evidence?.row_count ?? null) : null,
            };
            await runWithImportContext(auditContext, () => executor.execute({
                indicator: job.indicator,
                sourceLane: job.source_lane,
                businessDate: job.business_date,
                jobId: job.id,
                // Design of Record v2 §7.4 gate 2/3: the only place the executor
                // chain's forceReimport/refreshRequested literal can become
                // true. Every other Auto-Backfill call path keeps this false.
                forceReimport,
            }));
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
                // A replaced day records how many rows it held before, so a revision by the portal is visible.
                evidence: forceReimport
                    ? { ...after.evidence, replaced_row_count: before.evidence?.row_count ?? null }
                    : after.evidence,
            });
            return { jobId: job.id, state: 'SUCCESS' };
        } catch (error) {
            try {
                // Design of Record v2 §7.4 gate 6 / §7.5: for a force_reimport
                // job, a SUCCESS completion here is ambiguous -- it can mean the
                // reimport actually finished, or that the old (stale) data is
                // still sitting there untouched, since both read identically.
                // Never resolve a force_reimport job as "already done" from this
                // same-attempt guess; always fall through to normal failure/retry
                // classification instead, mirroring recoverInterruptedWork()'s
                // crash-recovery rule below.
                const completion = forceReimport ? null : await this.evaluateCompletion(job).catch(() => null);
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
            bumpCoverageVersion(); // a job attempt ended: its day may have changed state
        }
    }

    // With a lane only that lane's interrupted jobs are recovered: a RUNNING job of the other lane whose lease looks
    // expired may well be in flight (a long import can delay its heartbeat), and it is that lane's own loop that owns it.
    async recoverInterruptedWork({ lane = null } = {}) {
        const recovered = [];
        for (;;) {
            const job = lane
                ? await this.store.claimInterruptedJobForRecovery({ lane })
                : await this.store.claimInterruptedJobForRecovery();
            if (!job) break;
            try {
                const completion = await this.evaluateCompletion(job);
                // Design of Record v2 §7.5: a force_reimport job is NEVER
                // resolved as complete via this generic completion match --
                // SUCCESS here is ambiguous (it can mean the reimport actually
                // finished, or that the untouched pre-reimport data is still
                // there). Always requeue instead; the next attempt's
                // pre-execution recheck (processNext() gate 1) re-establishes
                // correctness from a fresh, provably-clean start.
                const completed = !job.force_reimport && completion.status === COMPLETION_STATUSES.SUCCESS;
                const reasonCode = job.force_reimport
                    ? 'RECOVERY_FORCE_REIMPORT_ALWAYS_REQUEUED'
                    : (completed ? 'RECOVERY_COMPLETION_CONFIRMED' : 'RECOVERY_COMPLETION_MISSING');
                const state = await this.store.resolveRecovery(job.id, {
                    completed,
                    evidence: completion.evidence,
                    reasonCode,
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
