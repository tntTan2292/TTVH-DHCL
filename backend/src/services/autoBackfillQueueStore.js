'use strict';

const crypto = require('node:crypto');
const sqlite3 = require('sqlite3').verbose();

const ACTIVE_JOB_STATES = ['QUEUED', 'RUNNING', 'RECOVERY_CHECK'];
const TERMINAL_JOB_STATES = ['SUCCESS', 'SKIPPED_ALREADY_SUCCESS', 'FAILED_TERMINAL', 'CANCELLED'];

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
                         registry_version, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, ?)`,
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
            return {
                run: record,
                jobs: jobs.map((job) => ({ ...job, completion_evidence: parseJson(job.completion_evidence_json) })),
                attempts: attempts.map((attempt) => ({ ...attempt, evidence: parseJson(attempt.evidence_json) })),
                events: events.map((event) => ({ ...event, payload: parseJson(event.payload_json) })),
            };
        });
    }

    async acquireNextJob(workerId) {
        return this.transaction(async (db) => {
            const existingLease = await get(db, "SELECT * FROM auto_backfill_worker_lease WHERE lease_name = 'GLOBAL_DKCL'");
            const runningJob = await get(db, "SELECT id FROM auto_backfill_job WHERE state = 'RUNNING'");
            if (existingLease || runningJob) return null;

            const job = await get(
                db,
                `SELECT j.* FROM auto_backfill_job j
                 JOIN auto_backfill_run r ON r.id = j.run_id
                 WHERE j.state = 'QUEUED' AND r.status = 'RUNNING'
                 ORDER BY j.business_date DESC, j.indicator_priority ASC,
                          j.lane_priority ASC, j.created_at ASC, j.id ASC
                 LIMIT 1`,
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
                 SET state = 'RUNNING', lease_owner = ?, lease_token = ?, lease_acquired_at = ?,
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
            return { ...job, state: 'RUNNING', lease_token: leaseToken, lease_owner: workerId, attempt_id: attemptId };
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

    async completeLeasedJob(jobId, leaseToken, { state, reasonCode, evidence = null }) {
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
                 SET state = ?, terminal_reason = ?, completion_evidence_json = ?, ended_at = ?, updated_at = ?,
                     lease_owner = NULL, lease_token = NULL, lease_acquired_at = NULL, lease_expires_at = NULL
                 WHERE id = ?`,
                [state, reasonCode, serializeJson(evidence), now, now, jobId],
            );
            await run(
                db,
                `UPDATE auto_backfill_attempt SET status = ?, ended_at = ?, result_code = ?, evidence_json = ? WHERE id = ?`,
                [state, now, reasonCode, serializeJson(evidence), attempt.id],
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

    async countRows(tableName) {
        if (!['auto_backfill_run', 'auto_backfill_job', 'auto_backfill_attempt', 'auto_backfill_worker_lease', 'auto_backfill_event'].includes(tableName)) {
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
