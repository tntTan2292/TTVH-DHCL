'use strict';

const crypto = require('node:crypto');
const {
    REGISTRY_VERSION,
    BUSINESS_TIMEZONE,
    listIndicatorConfigs,
    validateIndicatorRegistration,
} = require('./importIndicatorRegistry');
const { COMPLETION_STATUSES } = require('./autoBackfillCompletionPolicies');
const { normalizeBusinessDate, formatDateInTimezone, addUtcDays } = require('./autoBackfillBusinessCalendar');

const COVERAGE_EXCEPTION_TYPES = Object.freeze({
    PO_EXEMPTED: 'PO_EXEMPTED',
    LEGACY_BASELINE: 'LEGACY_BASELINE',
    VERIFIED_NO_DATA: 'VERIFIED_NO_DATA',
});

const ADAPTER_PROOF_CRITERIA = Object.freeze([
    'reportIdentityVerified',
    'tupleMatchVerified',
    'filterAppliedVerified',
    'responseReadyVerified',
    'structureValidZeroRows',
]);

function exceptionError(code, message, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function normalizeRoles(roles) {
    if (roles === null || roles === undefined) return null;
    const values = Array.isArray(roles) ? roles : [roles];
    return values.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean);
}

function assertPermitted(lane, permissionField, roles) {
    const requesterRoles = normalizeRoles(roles);
    if (requesterRoles === null) return;
    const allowed = (lane.permissions?.[permissionField] || []).map((role) => String(role).toLowerCase());
    if (!requesterRoles.some((role) => allowed.includes(role))) {
        throw exceptionError('COVERAGE_EXCEPTION_FORBIDDEN', 'Coverage exception access is not granted by the indicator registry.', 403);
    }
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

function mapExceptionRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        indicator: row.indicator,
        source_lane: row.source_lane,
        business_date: row.business_date,
        exception_type: row.exception_type,
        status: row.status,
        reason: row.reason,
        evidence: parseJson(row.evidence_json),
        registry_version: row.registry_version,
        created_by: row.created_by,
        created_at: row.created_at,
        revoked_by: row.revoked_by || null,
        revoked_at: row.revoked_at || null,
        revoke_reason: row.revoke_reason || null,
    };
}

class AutoBackfillCoverageExceptionService {
    constructor({
        db = null,
        fsImpl = require('fs'),
        clock = () => new Date(),
        registryProvider = listIndicatorConfigs,
        registryVersion = REGISTRY_VERSION,
        businessTimezone = BUSINESS_TIMEZONE,
    } = {}) {
        this.db = db || require('../config/db');
        this.fs = fsImpl;
        this.clock = clock;
        this.registryProvider = registryProvider;
        this.registryVersion = registryVersion;
        this.businessTimezone = businessTimezone;
    }

    resolveTuple({ indicator, lane, businessDate }) {
        const indicatorCode = String(indicator || '').trim().toUpperCase();
        const laneCode = String(lane || '').trim().toUpperCase();
        if (!indicatorCode) throw exceptionError('INDICATOR_REQUIRED', 'indicator is required.');
        if (!laneCode) throw exceptionError('LANE_REQUIRED', 'source_lane is required.');
        const normalizedDate = normalizeBusinessDate(businessDate, 'business_date');

        const registrations = this.registryProvider().map((entry) => validateIndicatorRegistration(entry, entry.code));
        const indicatorConfig = registrations.find((entry) => entry.code === indicatorCode);
        if (!indicatorConfig) throw exceptionError('INDICATOR_NOT_REGISTERED', `Indicator '${indicator}' is not registered.`);
        const laneConfig = indicatorConfig.lanes[laneCode];
        if (!laneConfig) throw exceptionError('LANE_NOT_REGISTERED', `Source lane '${lane}' is not registered for '${indicatorCode}'.`);

        const toDate = addUtcDays(formatDateInTimezone(this.clock(), this.businessTimezone), -1);
        if (normalizedDate < indicatorConfig.trackingStartDate || normalizedDate > toDate) {
            throw exceptionError('BUSINESS_DATE_OUT_OF_COVERAGE_WINDOW', `business_date must be within [${indicatorConfig.trackingStartDate}, ${toDate}].`);
        }

        return { indicatorConfig, laneConfig, businessDate: normalizedDate };
    }

    /**
     * Runs `fn` inside a SQLite transaction on the shared injected connection,
     * matching the repository's established BEGIN TRANSACTION / COMMIT /
     * ROLLBACK pattern (see `importProcessor.js`). Any failure -- the state
     * write, the mandatory append-only event write, or anything else inside
     * `fn` -- rolls back the entire operation so an exception's effective
     * state and its audit event can never diverge.
     */
    async withTransaction(fn) {
        await this.db.run('BEGIN TRANSACTION');
        try {
            const result = await fn();
            await this.db.run('COMMIT');
            return result;
        } catch (error) {
            try {
                await this.db.run('ROLLBACK');
            } catch {
                // Preserve the original transaction error over a rollback failure.
            }
            throw error;
        }
    }

    async evaluateRawCompletion({ indicatorConfig, laneConfig, businessDate }) {
        const completion = await laneConfig.completionPolicy.evaluate({
            db: this.db,
            fs: this.fs,
            indicator: indicatorConfig,
            lane: laneConfig,
            businessDate,
        });
        if (!Object.values(COMPLETION_STATUSES).includes(completion.status)) {
            throw exceptionError('INVALID_COMPLETION_STATUS', `${laneConfig.completionPolicy.id} returned an invalid status.`);
        }
        return completion;
    }

    validateAdapterProof({ laneConfig, evidence }) {
        if (laneConfig.automationMode !== 'AUTOMATED' || !laneConfig.portalAdapter) {
            throw exceptionError(
                'VERIFIED_NO_DATA_REQUIRES_PORTAL_ADAPTER',
                'VERIFIED_NO_DATA requires a registered, automated Portal adapter to supply the 5-point proof.',
            );
        }
        const proof = evidence && typeof evidence === 'object' ? evidence : {};
        const missing = ADAPTER_PROOF_CRITERIA.filter((key) => proof[key] !== true);
        if (missing.length > 0) {
            throw exceptionError(
                'VERIFIED_NO_DATA_PROOF_INCOMPLETE',
                `VERIFIED_NO_DATA requires all 5 adapter-proof criteria; missing/false: ${missing.join(', ')}. Mark MANUAL_REVIEW_REQUIRED instead -- never auto-exempt.`,
                422,
            );
        }
        if (String(proof.reportIdentity || '') !== laneConfig.portalAdapter.reportIdentity) {
            throw exceptionError(
                'VERIFIED_NO_DATA_REPORT_IDENTITY_MISMATCH',
                `evidence.reportIdentity must equal the declared adapter report identity '${laneConfig.portalAdapter.reportIdentity}'.`,
                422,
            );
        }
        if (Number(proof.confirmedRowCount) !== 0) {
            throw exceptionError(
                'VERIFIED_NO_DATA_ROW_COUNT_NOT_ZERO',
                'evidence.confirmedRowCount must be exactly 0 for VERIFIED_NO_DATA.',
                422,
            );
        }
        return proof;
    }

    async create({
        indicator,
        lane,
        businessDate,
        exceptionType,
        reason,
        evidence = null,
        actor,
        roles = null,
    }) {
        const type = String(exceptionType || '').trim().toUpperCase();
        if (!Object.values(COVERAGE_EXCEPTION_TYPES).includes(type)) {
            throw exceptionError('COVERAGE_EXCEPTION_TYPE_INVALID', `exception_type must be one of ${Object.values(COVERAGE_EXCEPTION_TYPES).join(', ')}.`);
        }
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason) {
            throw exceptionError('COVERAGE_EXCEPTION_REASON_REQUIRED', 'reason is required and cannot be empty.');
        }
        if (!actor) throw exceptionError('COVERAGE_EXCEPTION_ACTOR_REQUIRED', 'An authenticated actor is required.');

        const { indicatorConfig, laneConfig, businessDate: normalizedDate } = this.resolveTuple({ indicator, lane, businessDate });
        assertPermitted(laneConfig, 'runControlRoles', roles);

        const existing = await this.db.get(
            `SELECT id FROM auto_backfill_coverage_exception
             WHERE indicator = ? AND source_lane = ? AND business_date = ? AND status = 'ACTIVE'`,
            [indicatorConfig.code, laneConfig.code, normalizedDate],
        );
        if (existing) {
            throw exceptionError(
                'COVERAGE_EXCEPTION_ALREADY_ACTIVE',
                `An active exception already exists for ${indicatorConfig.code}/${laneConfig.code}/${normalizedDate}; revoke it before recording a new one.`,
                409,
            );
        }

        const completion = await this.evaluateRawCompletion({ indicatorConfig, laneConfig, businessDate: normalizedDate });
        let storedEvidence = evidence;

        if (type === COVERAGE_EXCEPTION_TYPES.VERIFIED_NO_DATA) {
            if (completion.status !== COMPLETION_STATUSES.MISSING) {
                throw exceptionError(
                    'VERIFIED_NO_DATA_REQUIRES_NO_COMMITTED_DATA',
                    `VERIFIED_NO_DATA is only valid when no data is currently committed (current completion status: ${completion.status}).`,
                    409,
                );
            }
            storedEvidence = this.validateAdapterProof({ laneConfig, evidence });
        } else if (type === COVERAGE_EXCEPTION_TYPES.LEGACY_BASELINE) {
            const rowCount = Number(completion.evidence?.row_count || 0);
            if (completion.status !== COMPLETION_STATUSES.MANUAL_REVIEW_REQUIRED || rowCount <= 0) {
                throw exceptionError(
                    'LEGACY_BASELINE_REQUIRES_COMMITTED_DATA_WITHOUT_EVIDENCE',
                    'LEGACY_BASELINE is only valid when committed target-table rows already exist without complete import evidence.',
                    409,
                );
            }
            storedEvidence = { completion_snapshot: completion.evidence };
        } else if (type === COVERAGE_EXCEPTION_TYPES.PO_EXEMPTED) {
            if (completion.status === COMPLETION_STATUSES.SUCCESS) {
                throw exceptionError(
                    'PO_EXEMPTED_NOT_APPLICABLE_TO_COMPLETE_DATA',
                    'PO_EXEMPTED cannot be recorded for a tuple that already has complete evidence.',
                    409,
                );
            }
            storedEvidence = evidence && typeof evidence === 'object' ? evidence : null;
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await this.withTransaction(async () => {
            await this.db.run(
                `INSERT INTO auto_backfill_coverage_exception
                    (id, indicator, source_lane, business_date, exception_type, status, reason, evidence_json, registry_version, created_by, created_at)
                 VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)`,
                [id, indicatorConfig.code, laneConfig.code, normalizedDate, type, trimmedReason, serializeJson(storedEvidence), this.registryVersion, actor, now],
            );
            await this.db.run(
                `INSERT INTO auto_backfill_coverage_exception_event
                    (exception_id, event_type, exception_type, indicator, source_lane, business_date, reason, evidence_json, actor, created_at)
                 VALUES (?, 'CREATED', ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, type, indicatorConfig.code, laneConfig.code, normalizedDate, trimmedReason, serializeJson(storedEvidence), actor, now],
            );
        });

        return this.getById(id, { roles });
    }

    async revoke({ exceptionId, reason, actor, roles = null }) {
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason) throw exceptionError('COVERAGE_EXCEPTION_REVOKE_REASON_REQUIRED', 'A revoke reason is required.');
        if (!actor) throw exceptionError('COVERAGE_EXCEPTION_ACTOR_REQUIRED', 'An authenticated actor is required.');

        const row = await this.db.get('SELECT * FROM auto_backfill_coverage_exception WHERE id = ?', [exceptionId]);
        if (!row) throw exceptionError('COVERAGE_EXCEPTION_NOT_FOUND', `Exception '${exceptionId}' does not exist.`, 404);
        if (row.status !== 'ACTIVE') {
            throw exceptionError('COVERAGE_EXCEPTION_NOT_ACTIVE', `Exception '${exceptionId}' is already ${row.status}.`, 409);
        }

        const { laneConfig, indicatorConfig } = this.resolveTuple({ indicator: row.indicator, lane: row.source_lane, businessDate: row.business_date });
        assertPermitted(laneConfig, 'runControlRoles', roles);

        const now = new Date().toISOString();
        await this.withTransaction(async () => {
            await this.db.run(
                `UPDATE auto_backfill_coverage_exception
                 SET status = 'REVOKED', revoked_by = ?, revoked_at = ?, revoke_reason = ?
                 WHERE id = ? AND status = 'ACTIVE'`,
                [actor, now, trimmedReason, exceptionId],
            );
            await this.db.run(
                `INSERT INTO auto_backfill_coverage_exception_event
                    (exception_id, event_type, exception_type, indicator, source_lane, business_date, reason, evidence_json, actor, created_at)
                 VALUES (?, 'REVOKED', ?, ?, ?, ?, ?, NULL, ?, ?)`,
                [exceptionId, row.exception_type, indicatorConfig.code, laneConfig.code, row.business_date, trimmedReason, actor, now],
            );
        });

        return this.getById(exceptionId, { roles });
    }

    async getById(exceptionId, { roles = null } = {}) {
        const row = await this.db.get('SELECT * FROM auto_backfill_coverage_exception WHERE id = ?', [exceptionId]);
        if (!row) throw exceptionError('COVERAGE_EXCEPTION_NOT_FOUND', `Exception '${exceptionId}' does not exist.`, 404);
        const { laneConfig } = this.resolveTuple({ indicator: row.indicator, lane: row.source_lane, businessDate: row.business_date });
        assertPermitted(laneConfig, 'coverageReadRoles', roles);
        const events = await this.db.all(
            'SELECT * FROM auto_backfill_coverage_exception_event WHERE exception_id = ? ORDER BY id ASC',
            [exceptionId],
        );
        return { ...mapExceptionRow(row), events: events.map((event) => ({
            event_type: event.event_type,
            reason: event.reason,
            evidence: parseJson(event.evidence_json),
            actor: event.actor,
            created_at: event.created_at,
        })) };
    }

    async list({ indicator = null, lane = null, businessDate = null, status = null, roles = null } = {}) {
        const indicatorFilter = indicator ? String(indicator).trim().toUpperCase() : null;
        const laneFilter = lane ? String(lane).trim().toUpperCase() : null;
        const statusFilter = status ? String(status).trim().toUpperCase() : null;
        if (statusFilter && !['ACTIVE', 'REVOKED'].includes(statusFilter)) {
            throw exceptionError('COVERAGE_EXCEPTION_STATUS_INVALID', "status must be 'ACTIVE' or 'REVOKED'.");
        }

        const registrations = this.registryProvider().map((entry) => validateIndicatorRegistration(entry, entry.code));
        if (indicatorFilter && !registrations.some((entry) => entry.code === indicatorFilter)) {
            throw exceptionError('INDICATOR_NOT_REGISTERED', `Indicator '${indicator}' is not registered.`);
        }

        const clauses = [];
        const params = [];
        if (indicatorFilter) { clauses.push('indicator = ?'); params.push(indicatorFilter); }
        if (laneFilter) { clauses.push('source_lane = ?'); params.push(laneFilter); }
        if (businessDate) { clauses.push('business_date = ?'); params.push(normalizeBusinessDate(businessDate, 'business_date')); }
        if (statusFilter) { clauses.push('status = ?'); params.push(statusFilter); }
        const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

        const rows = await this.db.all(
            `SELECT * FROM auto_backfill_coverage_exception ${where} ORDER BY created_at DESC`,
            params,
        );

        const visible = rows.filter((row) => {
            const indicatorConfig = registrations.find((entry) => entry.code === row.indicator);
            const laneConfig = indicatorConfig?.lanes?.[row.source_lane];
            if (!laneConfig) return false;
            try {
                assertPermitted(laneConfig, 'coverageReadRoles', roles);
                return true;
            } catch {
                return false;
            }
        });

        return { total: visible.length, items: visible.map(mapExceptionRow) };
    }

    /**
     * Batch-load ACTIVE exceptions for the given indicator codes as a
     * `indicator|lane|date` -> exception map, used by the coverage
     * scanner to overlay the 6-state model. Returns an empty map whenever the
     * injected db does not expose `.all` (unit-test doubles), never throws.
     */
    async loadActiveExceptionMap({ indicatorCodes = [], laneCode = null } = {}) {
        const map = new Map();
        if (typeof this.db?.all !== 'function' || indicatorCodes.length === 0) return map;
        const placeholders = indicatorCodes.map(() => '?').join(', ');
        const clauses = [`status = 'ACTIVE'`, `indicator IN (${placeholders})`];
        const params = [...indicatorCodes];
        if (laneCode) { clauses.push('source_lane = ?'); params.push(laneCode); }
        const rows = await this.db.all(
            `SELECT * FROM auto_backfill_coverage_exception WHERE ${clauses.join(' AND ')}`,
            params,
        );
        for (const row of rows) {
            map.set(row.indicator + '|' + row.source_lane + '|' + row.business_date, mapExceptionRow(row));
        }
        return map;
    }
}

module.exports = {
    AutoBackfillCoverageExceptionService,
    COVERAGE_EXCEPTION_TYPES,
    ADAPTER_PROOF_CRITERIA,
};
