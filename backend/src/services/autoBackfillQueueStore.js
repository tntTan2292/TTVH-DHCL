'use strict';

const crypto = require('node:crypto');
const sqlite3 = require('sqlite3').verbose();

const ACTIVE_JOB_STATES = ['QUEUED', 'RUNNING', 'RECOVERY_CHECK'];
const TERMINAL_JOB_STATES = ['SUCCESS', 'SKIPPED_ALREADY_SUCCESS', 'FAILED_TERMINAL', 'CANCELLED'];

// AB-AUTH-03: the set of source lanes that are currently unable to make progress because a
// job on that lane is waiting for a manual login, or is integrity-blocked. Derived from the
// JOB, not from auto_backfill_run.requested_lane, which is nullable for unfiltered runs and
// therefore cannot identify a lane. `source_lane IS NOT NULL` is defensive: a NULL inside a
// `NOT IN (...)` subquery would make the whole predicate never match and silently starve the
// queue -- the exact failure mode called out as the main risk of this change.
const BLOCKED_LANES_SUBQUERY = `
    SELECT DISTINCT blocked_job.source_lane
    FROM auto_backfill_job blocked_job
    JOIN auto_backfill_run blocked_run ON blocked_run.id = blocked_job.run_id
    WHERE blocked_run.status = 'RUNNING'
      AND blocked_job.safety_state IN ('WAITING_AUTH', 'BLOCKED_INTEGRITY')
      AND blocked_job.source_lane IS NOT NULL`;

function queueError(code, message, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (error) => error ? reject(error) : resolve(db));
    });
}

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(error) {
            if (error) reject(error);
            else resolve({ changes: this.changes, lastID: this.lastID });
        });
    });
}

function get(db, sql, params = []) {
    return new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
}

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => error ? reject(error) : resolve()));
}

function closeDb(db) {
    return new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

function parseJson(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function serializeJson(value) {
    return value === null || value === undefined ? null : JSON.stringify(value);
}

class AutoBackfillQueueStore {
    constructor({ dbPath, clock = () => new Date(), leaseMs = 60000 } = {}) {
        if (!dbPath) throw new Error('AutoBackfillQueueStore requires dbPath.');
        this.dbPath = dbPath;
        this.clock = clock;
        this.leaseMs = leaseMs;
    }

    nowIso() {
        return this.clock().toISOString();
    }

    async withDb(callback) {
        const db = await openDb(this.dbPath);
        try {
            await exec(db, 'PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
            return await callback(db);
        } finally {
            await closeDb(db);
        }
    }

    async transaction(callback) {
        return this.withDb(async (db) => {
            await exec(db, 'BEGIN IMMEDIATE');
            try {
                const result = await callback(db);
                await exec(db, 'COMMIT');
                return result;
            } catch (error) {
                try {
                    await exec(db, 'ROLLBACK');
                } catch {
                    // Preserve the original transaction error.
                }
                throw error;
            }
        });
    }

    async appendEvent(db, {
        runId,
        jobId = null,
        attemptId = null,
        eventType,
        fromState = null,
        toState = null,
        reasonCode = null,
        payload = null,
        createdAt = this.nowIso(),
    }) {
        await run(
            db,
            `INSERT INTO auto_backfill_event
                (run_id, job_id, attempt_id, event_type, from_state, to_state, reason_code, payload_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [runId, jobId, attemptId, eventType, fromState, toState, reasonCode, serializeJson(payload), createdAt],
        );
    }

    async createRunWithJobs(spec) {
        const result = await this.transaction(async (db) => {
            const existing = await get(
                db,
                `SELECT id FROM auto_backfill_run
                 WHERE request_key = ? AND status IN ('RUNNING', 'PAUSING', 'PAUSED')`,
                [spec.requestKey],
            );
            if (existing) return { runId: existing.id, created: false, duplicate: true, skippedConflicts: 0 };

            const availableJobs = [];
            const conflictingRunIds = new Set();
            for (const job of spec.jobs) {
                const conflict = await get(
                    db,
                    `SELECT run_id FROM auto_backfill_job
                     WHERE indicator = ? AND source_lane = ? AND business_date = ?
                       AND state IN ('QUEUED', 'RUNNING', 'RECOVERY_CHECK')`,
                    [job.indicator, job.sourceLane, job.businessDate],
                );
                if (conflict) conflictingRunIds.add(conflict.run_id);
                else availableJobs.push(job);
            }

            if (availableJobs.length === 0) {
                const [runId] = conflictingRunIds;
                return { runId, created: false, duplicate: true, skippedConflicts: spec.jobs.length };
            }

            const now = this.nowIso();
            const runId = crypto.randomUUID();
            await run(
                db,
                `INSERT INTO auto_backfill_run
                    (id, request_key, registry_version, as_of_business_date, requested_indicator,
                     requested_lane, requested_by, status, created_at, updated_at, started_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'RUNNING', ?, ?, ?)`,
                [
                    runId,
                    spec.requestKey,
                    spec.registryVersion,
                    spec.asOfBusinessDate,
                    spec.requestedIndicator,
                    spec.requestedLane,
                    spec.requestedBy,
                    now,
                    now,
                    now,
                ],
            );
            await this.appendEvent(db, {
                runId,
                eventType: 'RUN_CREATED',
                toState: 'RUNNING',
                reasonCode: 'QUEUE_ELIGIBLE_COVERAGE',
                payload: { job_count: availableJobs.length, skipped_active_conflicts: spec.jobs.length - availableJobs.length },
                createdAt: now,
            });

            for (const job of availableJobs) {
                const jobId = crypto.randomUUID();
                await run(
                    db,
                    `INSERT INTO auto_backfill_job
                        (id, run_id, indicator, source_lane, business_date, state,
                         indicator_priority, lane_priority, completion_policy_id, executor_id,
                         resource_identity, circuit_scope_key, registry_version, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        jobId,
                        runId,
                        job.indicator,
                        job.sourceLane,
                        job.businessDate,
                        job.indicatorPriority,
                        job.lanePriority,
                        job.completionPolicyId,
                        job.executorId,
                        job.resourceIdentity,
                        job.circuitScopeKey,
                        spec.registryVersion,
                        now,
                        now,
                    ],
                );
                await this.appendEvent(db, {
                    runId,
                    jobId,
                    eventType: 'JOB_CREATED',
                    toState: 'QUEUED',
                    reasonCode: 'COVERAGE_ITEM_QUEUE_ELIGIBLE',
                    createdAt: now,
                });
            }
            return {
                runId,
                created: true,
                duplicate: false,
                skippedConflicts: spec.jobs.length - availableJobs.length,
            };
        });
        return { ...(await this.getRun(result.runId)), creation: result };
    }

    async getRun(runId) {
        return this.withDb(async (db) => {
            const record = await get(db, 'SELECT * FROM auto_backfill_run WHERE id = ?', [runId]);
            if (!record) throw queueError('AUTO_BACKFILL_RUN_NOT_FOUND', `Auto Backfill run '${runId}' was not found.`, 404);
            const jobs = await all(
                db,
                `SELECT * FROM auto_backfill_job WHERE run_id = ?
                 ORDER BY business_date DESC, indicator_priority ASC, lane_priority ASC, created_at ASC`,
                [runId],
            );
            const attempts = await all(
                db,
                `SELECT a.* FROM auto_backfill_attempt a
                 JOIN auto_backfill_job j ON j.id = a.job_id
                 WHERE j.run_id = ? ORDER BY a.started_at ASC, a.attempt_number ASC`,
                [runId],
            );
            const events = await all(db, 'SELECT * FROM auto_backfill_event WHERE run_id = ? ORDER BY id ASC', [runId]);
            const scopeKeys = [...new Set(jobs.map((job) => job.circuit_scope_key).filter(Boolean))];
            const circuits = scopeKeys.length === 0 ? [] : await all(
                db,
                `SELECT * FROM auto_backfill_circuit WHERE scope_key IN (${scopeKeys.map(() => '?').join(',')}) ORDER BY scope_key`,
                scopeKeys,
            );
            return {
                run: record,
                jobs: jobs.map((job) => ({ ...job, completion_evidence: parseJson(job.completion_evidence_json) })),
                attempts: attempts.map((attempt) => ({
                    ...attempt,
                    storage_status: attempt.status,
                    status: attempt.safety_outcome || attempt.status,
                    effective_status: attempt.safety_outcome || attempt.status,
                    evidence: parseJson(attempt.evidence_json),
                })),
                events: events.map((event) => ({ ...event, payload: parseJson(event.payload_json) })),
                circuits,
            };
        });
    }

    // AB-AUTH-06 (design Section 5, C1): list runs without loading every job/attempt/event, so
    // the Product Owner can see every open run at once instead of only whichever one the UI
    // happened to remember. `blockedLanes` is scoped to THIS run's own jobs (lanes this
    // particular run is currently blocking), not the system-wide union used by
    // BLOCKED_LANES_SUBQUERY in acquireNextJob() -- the question here is "which run is
    // responsible for blocking a lane", not "which lanes are blocked".
    async listRuns({ statuses = ['RUNNING', 'PAUSING', 'PAUSED'], limit = 50, offset = 0 } = {}) {
        return this.withDb(async (db) => {
            const statusList = Array.isArray(statuses) && statuses.length > 0 ? statuses : ['RUNNING', 'PAUSING', 'PAUSED'];
            const placeholders = statusList.map(() => '?').join(',');
            const runs = await all(
                db,
                `SELECT * FROM auto_backfill_run
                 WHERE status IN (${placeholders})
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
                [...statusList, Number(limit) || 50, Number(offset) || 0],
            );
            if (runs.length === 0) return [];

            const runIds = runs.map((run) => run.id);
            const runIdPlaceholders = runIds.map(() => '?').join(',');
            const jobRows = await all(
                db,
                `SELECT run_id, indicator, source_lane, state, safety_state
                 FROM auto_backfill_job WHERE run_id IN (${runIdPlaceholders})`,
                runIds,
            );

            const jobsByRun = new Map();
            for (const job of jobRows) {
                if (!jobsByRun.has(job.run_id)) jobsByRun.set(job.run_id, []);
                jobsByRun.get(job.run_id).push(job);
            }

            return runs.map((run) => {
                const jobs = jobsByRun.get(run.id) || [];
                const jobCountsByState = {};
                const blockedLaneSet = new Set();
                for (const job of jobs) {
                    jobCountsByState[job.state] = (jobCountsByState[job.state] || 0) + 1;
                    if (job.safety_state === 'WAITING_AUTH' || job.safety_state === 'BLOCKED_INTEGRITY') {
                        if (job.source_lane) blockedLaneSet.add(job.source_lane);
                    }
                }
                const pairKeys = new Set();
                const indicatorLanePairs = [];
                for (const job of jobs) {
                    const key = `${job.indicator}|${job.source_lane}`;
                    if (pairKeys.has(key)) continue;
                    pairKeys.add(key);
                    indicatorLanePairs.push({ indicator: job.indicator, sourceLane: job.source_lane });
                }
                return {
                    run,
                    jobTotal: jobs.length,
                    jobCountsByState,
                    blockedLanes: Array.from(blockedLaneSet),
                    indicators: Array.from(new Set(jobs.map((job) => job.indicator))),
                    lanes: Array.from(new Set(jobs.map((job) => job.source_lane).filter(Boolean))),
                    // AB-AUTH-06: exact (indicator, sourceLane) pairs, kept alongside the display
                    // arrays above so the service layer can apply the same per-lane permission
                    // check getRun() already uses, without a second query.
                    indicatorLanePairs,
                };
            });
        });
    }

    async acquireNextJob(workerId) {
        return this.transaction(async (db) => {
            const existingLease = await get(db, "SELECT * FROM auto_backfill_worker_lease WHERE lease_name = 'GLOBAL_DKCL'");
            const runningJob = await get(db, "SELECT id FROM auto_backfill_job WHERE state = 'RUNNING'");
            if (existingLease || runningJob) return null;

            // AB-AUTH-03: the former global block -- "if ANY RUNNING run is WAITING_AUTH or
            // BLOCKED_INTEGRITY, stop the whole queue" -- is replaced by a per-lane exclusion.
            // Execution stays globally serial (the GLOBAL_DKCL lease and the one-RUNNING-job
            // guard above are untouched, and no schema changed); only *blocking* became
            // lane-scoped, so a TCT session waiting for login no longer freezes HUE.
            const job = await get(
                db,
                `SELECT j.* FROM auto_backfill_job j
                 JOIN auto_backfill_run r ON r.id = j.run_id
                  WHERE j.state = 'QUEUED' AND r.status = 'RUNNING'
                    AND (j.safety_state IS NULL OR (j.safety_state = 'RETRY_WAIT' AND j.next_attempt_at <= ?))
                    AND (r.safety_state IS NULL OR r.safety_state = 'CIRCUIT_OPEN')
                    AND j.source_lane NOT IN (${BLOCKED_LANES_SUBQUERY})
                 ORDER BY j.business_date DESC, j.indicator_priority ASC,
                          j.lane_priority ASC, j.created_at ASC, j.id ASC
                 LIMIT 1`,
                [this.nowIso()],
            );
            if (!job) return null;

            const now = this.nowIso();
            const expiresAt = new Date(new Date(now).getTime() + this.leaseMs).toISOString();
            const leaseToken = crypto.randomUUID();
            const attemptId = crypto.randomUUID();
            const count = await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_attempt WHERE job_id = ?', [job.id]);
            const attemptNumber = Number(count.n) + 1;

            await run(
                db,
                `UPDATE auto_backfill_job
                 SET state = 'RUNNING', safety_state = NULL, next_attempt_at = NULL,
                     lease_owner = ?, lease_token = ?, lease_acquired_at = ?,
                     lease_expires_at = ?, started_at = COALESCE(started_at, ?), updated_at = ?
                 WHERE id = ? AND state = 'QUEUED'`,
                [workerId, leaseToken, now, expiresAt, now, now, job.id],
            );
            await run(
                db,
                `INSERT INTO auto_backfill_attempt
                    (id, job_id, attempt_number, lease_owner, lease_token, status, started_at)
                 VALUES (?, ?, ?, ?, ?, 'RUNNING', ?)`,
                [attemptId, job.id, attemptNumber, workerId, leaseToken, now],
            );
            await run(
                db,
                `INSERT INTO auto_backfill_worker_lease
                    (lease_name, job_id, worker_id, lease_token, acquired_at, expires_at)
                 VALUES ('GLOBAL_DKCL', ?, ?, ?, ?, ?)`,
                [job.id, workerId, leaseToken, now, expiresAt],
            );
            await this.appendEvent(db, {
                runId: job.run_id,
                jobId: job.id,
                attemptId,
                eventType: 'JOB_LEASED',
                fromState: 'QUEUED',
                toState: 'RUNNING',
                reasonCode: 'GLOBAL_DKCL_LEASE_ACQUIRED',
                payload: { worker_id: workerId, attempt_number: attemptNumber },
                createdAt: now,
            });
            return {
                ...job,
                state: 'RUNNING',
                safety_state: null,
                lease_token: leaseToken,
                lease_owner: workerId,
                attempt_id: attemptId,
                attempt_number: attemptNumber,
            };
        });
    }

    async renewLease(jobId, leaseToken) {
        return this.transaction(async (db) => {
            const now = this.nowIso();
            const expiresAt = new Date(new Date(now).getTime() + this.leaseMs).toISOString();
            const lease = await run(
                db,
                `UPDATE auto_backfill_worker_lease SET expires_at = ?
                 WHERE lease_name = 'GLOBAL_DKCL' AND job_id = ? AND lease_token = ?`,
                [expiresAt, jobId, leaseToken],
            );
            if (lease.changes !== 1) throw queueError('AUTO_BACKFILL_LEASE_LOST', 'The global DKCL lease is no longer owned by this worker.', 409);
            await run(
                db,
                'UPDATE auto_backfill_job SET lease_expires_at = ?, updated_at = ? WHERE id = ? AND lease_token = ?',
                [expiresAt, now, jobId, leaseToken],
            );
            return expiresAt;
        });
    }

    async completeLeasedJob(jobId, leaseToken, {
        state,
        reasonCode,
        evidence = null,
        classification = null,
        errorSignature = null,
        actionRequired = null,
    }) {
        if (!['SUCCESS', 'SKIPPED_ALREADY_SUCCESS', 'FAILED_TERMINAL'].includes(state)) {
            throw new Error(`Unsupported terminal queue state '${state}'.`);
        }
        return this.transaction(async (db) => {
            const job = await get(db, 'SELECT * FROM auto_backfill_job WHERE id = ? AND lease_token = ?', [jobId, leaseToken]);
            if (!job || job.state !== 'RUNNING') throw queueError('AUTO_BACKFILL_LEASE_LOST', 'The job lease is no longer active.', 409);
            const attempt = await get(db, "SELECT * FROM auto_backfill_attempt WHERE job_id = ? AND lease_token = ? AND status = 'RUNNING'", [jobId, leaseToken]);
            const now = this.nowIso();
            await run(
                db,
                `UPDATE auto_backfill_job
                 SET state = ?, safety_state = NULL, next_attempt_at = NULL,
                     terminal_reason = ?, completion_evidence_json = ?, action_required = ?, ended_at = ?, updated_at = ?,
                     lease_owner = NULL, lease_token = NULL, lease_acquired_at = NULL, lease_expires_at = NULL
                 WHERE id = ?`,
                [state, reasonCode, serializeJson(evidence), actionRequired, now, now, jobId],
            );
            await run(
                db,
                `UPDATE auto_backfill_attempt SET status = ?, ended_at = ?, result_code = ?, evidence_json = ?,
                    classification = ?, error_signature = ?, action_required = ? WHERE id = ?`,
                [state, now, reasonCode, serializeJson(evidence), classification, errorSignature, actionRequired, attempt.id],
            );
            await run(db, "DELETE FROM auto_backfill_worker_lease WHERE lease_name = 'GLOBAL_DKCL' AND lease_token = ?", [leaseToken]);
            await this.appendEvent(db, {
                runId: job.run_id,
                jobId,
                attemptId: attempt.id,
                eventType: 'JOB_COMPLETED',
                fromState: 'RUNNING',
                toState: state,
                reasonCode,
                createdAt: now,
            });
            await this.reconcileRun(db, job.run_id, now);
            return state;
        });
    }

    async recordLeasedFailure(jobId, leaseToken, {
        failure,
        maxAttempts,
        retryAt = null,
        circuitThreshold = 5,
    }) {
        return this.transaction(async (db) => {
            const job = await get(db, 'SELECT * FROM auto_backfill_job WHERE id = ? AND lease_token = ?', [jobId, leaseToken]);
            if (!job || job.state !== 'RUNNING') throw queueError('AUTO_BACKFILL_LEASE_LOST', 'The job lease is no longer active.', 409);
            const attempt = await get(db, "SELECT * FROM auto_backfill_attempt WHERE job_id = ? AND lease_token = ? AND status = 'RUNNING'", [jobId, leaseToken]);
            if (!attempt) throw queueError('AUTO_BACKFILL_ATTEMPT_LOST', 'The running attempt is no longer available.', 409);
            const now = this.nowIso();

            let circuit = null;
            let circuitSequenceReset = false;
            if (failure.systemic) {
                const previous = await get(db, 'SELECT * FROM auto_backfill_circuit WHERE scope_key = ?', [failure.scope.key]);
                const consecutiveCount = previous?.error_signature === failure.signature
                    ? Number(previous.consecutive_count) + 1
                    : 1;
                const circuitOpen = consecutiveCount >= circuitThreshold;
                await run(
                    db,
                    `INSERT INTO auto_backfill_circuit
                        (scope_key, adapter_id, source_lane, resource_identity, error_signature,
                         consecutive_count, state, last_error_code, opened_at, reset_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
                     ON CONFLICT(scope_key) DO UPDATE SET
                        error_signature = excluded.error_signature,
                        consecutive_count = excluded.consecutive_count,
                        state = excluded.state,
                        last_error_code = excluded.last_error_code,
                        opened_at = excluded.opened_at,
                        reset_at = NULL,
                        updated_at = excluded.updated_at`,
                    [
                        failure.scope.key,
                        failure.scope.adapterId,
                        failure.scope.sourceLane,
                        failure.scope.resourceIdentity,
                        failure.signature,
                        consecutiveCount,
                        circuitOpen ? 'OPEN' : 'CLOSED',
                        failure.code,
                        circuitOpen ? now : null,
                        now,
                    ],
                );
                circuit = { consecutiveCount, open: circuitOpen };
            } else {
                const previous = await get(db, 'SELECT * FROM auto_backfill_circuit WHERE scope_key = ?', [failure.scope.key]);
                if (previous?.state === 'CLOSED' && Number(previous.consecutive_count) > 0) {
                    await run(
                        db,
                        `UPDATE auto_backfill_circuit SET consecutive_count = 0, error_signature = NULL,
                            last_error_code = NULL, reset_at = ?, updated_at = ? WHERE scope_key = ?`,
                        [now, now, failure.scope.key],
                    );
                    circuitSequenceReset = true;
                }
            }

            let jobState = 'FAILED_TERMINAL';
            let safetyState = null;
            let nextAttemptAt = null;
            let outcome = 'FAILED_TERMINAL';
            let actionRequired = 'Review the terminal failure; automatic retry is not permitted.';
            let eventType = 'JOB_TERMINAL_FAILURE';
            let haltCoordinator = false;

            if (failure.classification === 'AUTHENTICATION') {
                jobState = 'QUEUED';
                safetyState = 'WAITING_AUTH';
                outcome = 'WAITING_AUTH';
                actionRequired = 'Product Owner must complete supported manual login, then Admin must explicitly Resume.';
                eventType = 'JOB_WAITING_AUTH';
                haltCoordinator = true;
            } else if (failure.integrityFatal) {
                safetyState = 'BLOCKED_INTEGRITY';
                outcome = 'BLOCKED_INTEGRITY';
                actionRequired = 'Stop immediately. Do not retry or overwrite; investigate integrity evidence.';
                eventType = 'INTEGRITY_FATAL_STOP';
                haltCoordinator = true;
            } else if (circuit?.open) {
                jobState = 'QUEUED';
                safetyState = 'CIRCUIT_OPEN';
                outcome = 'CIRCUIT_OPEN';
                actionRequired = 'Investigate the exact adapter/source/resource scope, then Admin must reset the circuit.';
                eventType = 'CIRCUIT_OPENED';
            } else if (failure.retryable && Number(attempt.attempt_number) < maxAttempts) {
                jobState = 'QUEUED';
                safetyState = 'RETRY_WAIT';
                nextAttemptAt = retryAt;
                outcome = 'RETRY_SCHEDULED';
                actionRequired = `Automatic retry ${Number(attempt.attempt_number) + 1}/${maxAttempts} is scheduled.`;
                eventType = 'JOB_RETRY_SCHEDULED';
            } else if (failure.retryable) {
                actionRequired = `Automatic retry limit of ${maxAttempts} attempts was exhausted; Product Owner review is required.`;
            } else if (failure.classification === 'PERMISSION') {
                actionRequired = 'Verify the supported account permission; automatic retry is not permitted.';
            } else if (failure.classification === 'DATA') {
                actionRequired = 'Review the isolated date/data evidence; automatic retry is not permitted.';
            }

            await run(
                db,
                `UPDATE auto_backfill_job
                 SET state = ?, safety_state = ?, next_attempt_at = ?, terminal_reason = ?,
                     last_error_class = ?, last_error_signature = ?, action_required = ?,
                     ended_at = ?, updated_at = ?, lease_owner = NULL, lease_token = NULL,
                     lease_acquired_at = NULL, lease_expires_at = NULL
                 WHERE id = ?`,
                [
                    jobState,
                    safetyState,
                    nextAttemptAt,
                    failure.code,
                    failure.classification,
                    failure.signature,
                    actionRequired,
                    jobState === 'FAILED_TERMINAL' ? now : null,
                    now,
                    jobId,
                ],
            );
            await run(
                db,
                `UPDATE auto_backfill_attempt SET status = 'FAILED_TERMINAL', ended_at = ?, result_code = ?,
                    classification = ?, error_signature = ?, retry_at = ?, action_required = ?, safety_outcome = ?,
                    evidence_json = ? WHERE id = ?`,
                [
                    now,
                    failure.code,
                    failure.classification,
                    failure.signature,
                    nextAttemptAt,
                    actionRequired,
                    outcome,
                    serializeJson({ classification: failure.classification, signature: failure.signature }),
                    attempt.id,
                ],
            );
            await run(db, "DELETE FROM auto_backfill_worker_lease WHERE lease_name = 'GLOBAL_DKCL' AND lease_token = ?", [leaseToken]);
            await this.appendEvent(db, {
                runId: job.run_id,
                jobId,
                attemptId: attempt.id,
                eventType: 'ATTEMPT_FINISHED',
                fromState: 'RUNNING',
                toState: outcome,
                reasonCode: failure.code,
                payload: {
                    classification: failure.classification,
                    signature: failure.signature,
                    attempt_number: attempt.attempt_number,
                    action_required: actionRequired,
                },
                createdAt: now,
            });
            if (circuitSequenceReset) {
                await this.appendEvent(db, {
                    runId: job.run_id,
                    jobId,
                    attemptId: attempt.id,
                    eventType: 'CIRCUIT_SEQUENCE_RESET',
                    reasonCode: 'NON_SYSTEM_FAILURE_BREAKS_SEQUENCE',
                    payload: { scope_key: failure.scope.key },
                    createdAt: now,
                });
            }
            await this.appendEvent(db, {
                runId: job.run_id,
                jobId,
                attemptId: attempt.id,
                eventType,
                fromState: 'RUNNING',
                toState: safetyState || jobState,
                reasonCode: failure.code,
                payload: {
                    classification: failure.classification,
                    signature: failure.signature,
                    attempt_number: attempt.attempt_number,
                    next_attempt_at: nextAttemptAt,
                    circuit_count: circuit?.consecutiveCount || 0,
                    action_required: actionRequired,
                },
                createdAt: now,
            });

            if (safetyState === 'WAITING_AUTH' || safetyState === 'BLOCKED_INTEGRITY') {
                await run(
                    db,
                    'UPDATE auto_backfill_run SET safety_state = ?, action_required = ?, status_reason = ?, updated_at = ? WHERE id = ?',
                    [safetyState, actionRequired, failure.code, now, job.run_id],
                );
                await this.appendEvent(db, {
                    runId: job.run_id,
                    jobId,
                    attemptId: attempt.id,
                    eventType: 'RUN_SAFETY_STATE_CHANGED',
                    fromState: null,
                    toState: safetyState,
                    reasonCode: failure.code,
                    payload: { action_required: actionRequired },
                    createdAt: now,
                });
            } else if (safetyState === 'CIRCUIT_OPEN') {
                await run(
                    db,
                    `UPDATE auto_backfill_job SET safety_state = 'CIRCUIT_OPEN', next_attempt_at = NULL,
                        action_required = ?, updated_at = ?
                     WHERE state = 'QUEUED' AND circuit_scope_key = ?`,
                    [actionRequired, now, failure.scope.key],
                );
                await run(
                    db,
                    `UPDATE auto_backfill_run SET safety_state = 'CIRCUIT_OPEN', action_required = ?, updated_at = ?
                     WHERE id IN (SELECT DISTINCT run_id FROM auto_backfill_job WHERE circuit_scope_key = ? AND safety_state = 'CIRCUIT_OPEN')`,
                    [actionRequired, now, failure.scope.key],
                );
            }

            await this.reconcileRun(db, job.run_id, now);
            return {
                state: safetyState || jobState,
                outcome,
                retryAt: nextAttemptAt,
                attemptNumber: Number(attempt.attempt_number),
                circuitCount: circuit?.consecutiveCount || 0,
                haltCoordinator,
                actionRequired,
            };
        });
    }

    async recordCircuitSuccess(job, scope) {
        return this.transaction(async (db) => {
            const circuit = await get(db, 'SELECT * FROM auto_backfill_circuit WHERE scope_key = ?', [scope.key]);
            if (!circuit || (circuit.state === 'CLOSED' && Number(circuit.consecutive_count) === 0)) return false;
            const now = this.nowIso();
            await run(
                db,
                `UPDATE auto_backfill_circuit SET state = 'CLOSED', consecutive_count = 0,
                    error_signature = NULL, last_error_code = NULL, reset_at = ?, updated_at = ? WHERE scope_key = ?`,
                [now, now, scope.key],
            );
            await this.appendEvent(db, {
                runId: job.run_id,
                jobId: job.id,
                attemptId: job.attempt_id || null,
                eventType: 'CIRCUIT_RESET_ON_SUCCESS',
                reasonCode: 'SUCCESS_RESETS_CONSECUTIVE_FAILURES',
                payload: { scope_key: scope.key },
                createdAt: now,
            });
            return true;
        });
    }

    async reconcileRun(db, runId, now = this.nowIso()) {
        const runRecord = await get(db, 'SELECT * FROM auto_backfill_run WHERE id = ?', [runId]);
        if (!runRecord) return;
        const counts = await get(
            db,
            `SELECT
                SUM(CASE WHEN state IN ('QUEUED', 'RUNNING', 'RECOVERY_CHECK') THEN 1 ELSE 0 END) AS active_count,
                SUM(CASE WHEN state = 'FAILED_TERMINAL' THEN 1 ELSE 0 END) AS failed_count
             FROM auto_backfill_job WHERE run_id = ?`,
            [runId],
        );
        let nextStatus = runRecord.status;
        let reason = null;
        if (runRecord.status === 'PAUSING') {
            nextStatus = 'PAUSED';
            reason = 'ACTIVE_JOB_FINISHED_AFTER_PAUSE';
        } else if (runRecord.status === 'RUNNING' && Number(counts.active_count || 0) === 0) {
            nextStatus = Number(counts.failed_count || 0) > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
            reason = 'NO_REMAINING_ACTIVE_JOBS';
        }
        if (nextStatus !== runRecord.status) {
            await run(
                db,
                'UPDATE auto_backfill_run SET status = ?, status_reason = ?, updated_at = ?, ended_at = ? WHERE id = ?',
                [nextStatus, reason, now, nextStatus.startsWith('COMPLETED') ? now : null, runId],
            );
            await this.appendEvent(db, {
                runId,
                eventType: 'RUN_STATE_CHANGED',
                fromState: runRecord.status,
                toState: nextStatus,
                reasonCode: reason,
                createdAt: now,
            });
        }
    }

    async pauseRun(runId, actor) {
        await this.transaction(async (db) => {
            const runRecord = await get(db, 'SELECT * FROM auto_backfill_run WHERE id = ?', [runId]);
            if (!runRecord) throw queueError('AUTO_BACKFILL_RUN_NOT_FOUND', `Auto Backfill run '${runId}' was not found.`, 404);
            if (['PAUSED', 'PAUSING'].includes(runRecord.status)) return;
            if (runRecord.status !== 'RUNNING') throw queueError('AUTO_BACKFILL_RUN_NOT_ACTIVE', 'Only a RUNNING Auto Backfill run can be paused.', 409);
            const activeJob = await get(db, "SELECT id FROM auto_backfill_job WHERE run_id = ? AND state = 'RUNNING'", [runId]);
            const nextStatus = activeJob ? 'PAUSING' : 'PAUSED';
            const now = this.nowIso();
            await run(db, 'UPDATE auto_backfill_run SET status = ?, status_reason = ?, updated_at = ? WHERE id = ?', [nextStatus, 'PAUSE_REQUESTED', now, runId]);
            await this.appendEvent(db, {
                runId,
                eventType: 'RUN_STATE_CHANGED',
                fromState: 'RUNNING',
                toState: nextStatus,
                reasonCode: 'PAUSE_REQUESTED',
                payload: { actor },
                createdAt: now,
            });
        });
        return this.getRun(runId);
    }

    async resumeRun(runId, actor) {
        await this.transaction(async (db) => {
            const runRecord = await get(db, 'SELECT * FROM auto_backfill_run WHERE id = ?', [runId]);
            if (!runRecord) throw queueError('AUTO_BACKFILL_RUN_NOT_FOUND', `Auto Backfill run '${runId}' was not found.`, 404);
            if (runRecord.safety_state === 'WAITING_AUTH') {
                const now = this.nowIso();
                const nextStatus = runRecord.status === 'PAUSED' ? 'RUNNING' : runRecord.status;
                await run(
                    db,
                    "UPDATE auto_backfill_job SET safety_state = NULL, action_required = NULL, updated_at = ? WHERE run_id = ? AND safety_state = 'WAITING_AUTH'",
                    [now, runId],
                );
                await run(
                    db,
                    'UPDATE auto_backfill_run SET status = ?, safety_state = NULL, action_required = NULL, status_reason = NULL, updated_at = ?, ended_at = NULL WHERE id = ?',
                    [nextStatus, now, runId],
                );
                await this.appendEvent(db, {
                    runId,
                    eventType: 'AUTH_WAIT_RESUMED',
                    fromState: 'WAITING_AUTH',
                    toState: 'RUNNING',
                    reasonCode: 'EXPLICIT_RESUME_REQUESTED',
                    payload: { actor, action_required: 'Session validity will be rechecked before executor work.' },
                    createdAt: now,
                });
                return;
            }
            if (runRecord.status === 'RUNNING') return;
            if (runRecord.status !== 'PAUSED') throw queueError('AUTO_BACKFILL_RUN_NOT_PAUSED', 'Only a PAUSED Auto Backfill run can be resumed.', 409);
            const now = this.nowIso();
            await run(db, "UPDATE auto_backfill_run SET status = 'RUNNING', status_reason = NULL, updated_at = ?, ended_at = NULL WHERE id = ?", [now, runId]);
            await this.appendEvent(db, {
                runId,
                eventType: 'RUN_STATE_CHANGED',
                fromState: 'PAUSED',
                toState: 'RUNNING',
                reasonCode: 'RESUME_REQUESTED',
                payload: { actor },
                createdAt: now,
            });
        });
        return this.getRun(runId);
    }

    async resetCircuitsForRun(runId, actor) {
        await this.transaction(async (db) => {
            const runRecord = await get(db, 'SELECT * FROM auto_backfill_run WHERE id = ?', [runId]);
            if (!runRecord) throw queueError('AUTO_BACKFILL_RUN_NOT_FOUND', `Auto Backfill run '${runId}' was not found.`, 404);
            const circuits = await all(
                db,
                `SELECT DISTINCT c.* FROM auto_backfill_circuit c
                 JOIN auto_backfill_job j ON j.circuit_scope_key = c.scope_key
                 WHERE j.run_id = ? AND c.state = 'OPEN'`,
                [runId],
            );
            if (circuits.length === 0) throw queueError('AUTO_BACKFILL_CIRCUIT_NOT_OPEN', 'No open circuit belongs to this run.', 409);
            const now = this.nowIso();
            for (const circuit of circuits) {
                await run(
                    db,
                    `UPDATE auto_backfill_circuit SET state = 'CLOSED', consecutive_count = 0,
                        error_signature = NULL, last_error_code = NULL, reset_at = ?, updated_at = ? WHERE scope_key = ?`,
                    [now, now, circuit.scope_key],
                );
                await run(
                    db,
                    `UPDATE auto_backfill_job SET safety_state = NULL, action_required = NULL, updated_at = ?
                     WHERE circuit_scope_key = ? AND safety_state = 'CIRCUIT_OPEN'`,
                    [now, circuit.scope_key],
                );
                const affectedRuns = await all(db, 'SELECT DISTINCT run_id FROM auto_backfill_job WHERE circuit_scope_key = ?', [circuit.scope_key]);
                for (const affected of affectedRuns) {
                    const stillOpen = await get(
                        db,
                        "SELECT 1 FROM auto_backfill_job WHERE run_id = ? AND safety_state = 'CIRCUIT_OPEN' LIMIT 1",
                        [affected.run_id],
                    );
                    if (!stillOpen) {
                        await run(
                            db,
                            "UPDATE auto_backfill_run SET safety_state = NULL, action_required = NULL, updated_at = ? WHERE id = ? AND safety_state = 'CIRCUIT_OPEN'",
                            [now, affected.run_id],
                        );
                    }
                    await this.appendEvent(db, {
                        runId: affected.run_id,
                        eventType: 'CIRCUIT_RESET',
                        fromState: 'CIRCUIT_OPEN',
                        toState: 'RUNNING',
                        reasonCode: 'ADMIN_RESET_REQUESTED',
                        payload: { actor, scope_key: circuit.scope_key },
                        createdAt: now,
                    });
                }
            }
        });
        return this.getRun(runId);
    }

    async claimInterruptedJobForRecovery() {
        return this.transaction(async (db) => {
            const now = this.nowIso();
            const job = await get(
                db,
                `SELECT j.* FROM auto_backfill_job j
                 LEFT JOIN auto_backfill_worker_lease l ON l.job_id = j.id
                 WHERE j.state = 'RUNNING' AND (l.job_id IS NULL OR l.expires_at <= ?)
                 ORDER BY j.started_at ASC LIMIT 1`,
                [now],
            );
            if (!job) return null;
            const attempt = await get(db, "SELECT * FROM auto_backfill_attempt WHERE job_id = ? AND status = 'RUNNING' ORDER BY attempt_number DESC LIMIT 1", [job.id]);
            await run(
                db,
                `UPDATE auto_backfill_job SET state = 'RECOVERY_CHECK', updated_at = ?,
                    lease_owner = NULL, lease_token = NULL, lease_acquired_at = NULL, lease_expires_at = NULL
                 WHERE id = ?`,
                [now, job.id],
            );
            if (attempt) {
                await run(db, "UPDATE auto_backfill_attempt SET status = 'INTERRUPTED', ended_at = ?, result_code = 'LEASE_EXPIRED' WHERE id = ?", [now, attempt.id]);
            }
            await run(db, "DELETE FROM auto_backfill_worker_lease WHERE job_id = ?", [job.id]);
            await this.appendEvent(db, {
                runId: job.run_id,
                jobId: job.id,
                attemptId: attempt?.id || null,
                eventType: 'JOB_RECOVERY_STARTED',
                fromState: 'RUNNING',
                toState: 'RECOVERY_CHECK',
                reasonCode: 'INTERRUPTED_LEASE',
                createdAt: now,
            });
            return { ...job, state: 'RECOVERY_CHECK' };
        });
    }

    async resolveRecovery(jobId, { completed, evidence = null, reasonCode = null }) {
        return this.transaction(async (db) => {
            const job = await get(db, "SELECT * FROM auto_backfill_job WHERE id = ? AND state = 'RECOVERY_CHECK'", [jobId]);
            if (!job) throw queueError('AUTO_BACKFILL_RECOVERY_STATE_LOST', 'The recovery candidate is no longer available.', 409);
            const runRecord = await get(db, 'SELECT * FROM auto_backfill_run WHERE id = ?', [job.run_id]);
            const now = this.nowIso();
            const nextState = completed ? 'SKIPPED_ALREADY_SUCCESS' : 'QUEUED';
            const resolvedReason = reasonCode || (completed ? 'RECOVERY_COMPLETION_CONFIRMED' : 'RECOVERY_COMPLETION_MISSING');
            await run(
                db,
                `UPDATE auto_backfill_job SET state = ?, terminal_reason = ?, completion_evidence_json = ?,
                    ended_at = ?, updated_at = ? WHERE id = ?`,
                [nextState, completed ? resolvedReason : null, serializeJson(evidence), completed ? now : null, now, jobId],
            );
            await this.appendEvent(db, {
                runId: job.run_id,
                jobId,
                eventType: 'JOB_RECOVERY_RESOLVED',
                fromState: 'RECOVERY_CHECK',
                toState: nextState,
                reasonCode: resolvedReason,
                createdAt: now,
            });
            if (runRecord.status === 'PAUSING') {
                await run(db, "UPDATE auto_backfill_run SET status = 'PAUSED', status_reason = 'RECOVERY_RESOLVED_AFTER_PAUSE', updated_at = ? WHERE id = ?", [now, job.run_id]);
                await this.appendEvent(db, {
                    runId: job.run_id,
                    eventType: 'RUN_STATE_CHANGED',
                    fromState: 'PAUSING',
                    toState: 'PAUSED',
                    reasonCode: 'RECOVERY_RESOLVED_AFTER_PAUSE',
                    createdAt: now,
                });
            } else {
                await this.reconcileRun(db, job.run_id, now);
            }
            return nextState;
        });
    }

    async getCoordinatorState() {
        return this.withDb(async (db) => {
            const counts = await get(
                db,
                `SELECT
                    SUM(CASE WHEN j.state = 'QUEUED' AND r.status = 'RUNNING'
                        AND (j.safety_state IS NULL OR (j.safety_state = 'RETRY_WAIT' AND j.next_attempt_at <= ?))
                        AND (r.safety_state IS NULL OR r.safety_state = 'CIRCUIT_OPEN') THEN 1 ELSE 0 END) AS eligible_job_count,
                    SUM(CASE WHEN j.state = 'RUNNING' THEN 1 ELSE 0 END) AS running_job_count,
                    SUM(CASE WHEN j.safety_state = 'WAITING_AUTH' THEN 1 ELSE 0 END) AS waiting_auth_count,
                    SUM(CASE WHEN j.safety_state = 'CIRCUIT_OPEN' THEN 1 ELSE 0 END) AS circuit_open_count,
                    SUM(CASE WHEN j.safety_state = 'BLOCKED_INTEGRITY' THEN 1 ELSE 0 END) AS integrity_blocked_count,
                    MIN(CASE WHEN j.safety_state = 'RETRY_WAIT' THEN j.next_attempt_at END) AS retry_ready_at
                 FROM auto_backfill_job j
                 JOIN auto_backfill_run r ON r.id = j.run_id`,
                [this.nowIso()],
            );
            // AB-AUTH-03: lane breakdown, added alongside the existing totals (which keep their
            // original meaning so no existing caller changes behaviour). `openLaneEligibleJobCount`
            // is the count the coordinator actually needs: work that a currently-unblocked lane
            // could pick up right now.
            const blockedLaneRows = await all(db, BLOCKED_LANES_SUBQUERY);
            const openLaneCounts = await get(
                db,
                `SELECT
                    SUM(CASE WHEN j.state = 'QUEUED' AND r.status = 'RUNNING'
                        AND (j.safety_state IS NULL OR (j.safety_state = 'RETRY_WAIT' AND j.next_attempt_at <= ?))
                        AND (r.safety_state IS NULL OR r.safety_state = 'CIRCUIT_OPEN') THEN 1 ELSE 0 END) AS n,
                    MIN(CASE WHEN j.safety_state = 'RETRY_WAIT' THEN j.next_attempt_at END) AS retry_ready_at
                 FROM auto_backfill_job j
                 JOIN auto_backfill_run r ON r.id = j.run_id
                 WHERE j.source_lane NOT IN (${BLOCKED_LANES_SUBQUERY})`,
                [this.nowIso()],
            );
            const lease = await get(
                db,
                "SELECT job_id, worker_id, expires_at FROM auto_backfill_worker_lease WHERE lease_name = 'GLOBAL_DKCL'",
            );
            return {
                eligibleJobCount: Number(counts?.eligible_job_count || 0),
                runningJobCount: Number(counts?.running_job_count || 0),
                waitingAuthCount: Number(counts?.waiting_auth_count || 0),
                circuitOpenCount: Number(counts?.circuit_open_count || 0),
                integrityBlockedCount: Number(counts?.integrity_blocked_count || 0),
                retryReadyAt: counts?.retry_ready_at || null,
                leaseJobId: lease?.job_id || null,
                leaseWorkerId: lease?.worker_id || null,
                leaseExpiresAt: lease?.expires_at || null,
                blockedLanes: blockedLaneRows.map((row) => row.source_lane),
                openLaneEligibleJobCount: Number(openLaneCounts?.n || 0),
                openLaneRetryReadyAt: openLaneCounts?.retry_ready_at || null,
            };
        });
    }

    async countRows(tableName) {
        if (!['auto_backfill_run', 'auto_backfill_job', 'auto_backfill_attempt', 'auto_backfill_worker_lease', 'auto_backfill_event', 'auto_backfill_circuit'].includes(tableName)) {
            throw new Error('Unsupported queue table.');
        }
        return this.withDb(async (db) => Number((await get(db, `SELECT COUNT(*) AS n FROM ${tableName}`)).n));
    }
}

module.exports = {
    AutoBackfillQueueStore,
    ACTIVE_JOB_STATES,
    TERMINAL_JOB_STATES,
    queueError,
};
