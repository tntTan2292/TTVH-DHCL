'use strict';

const crypto = require('node:crypto');

const ERROR_CLASSES = Object.freeze({
    AUTHENTICATION: 'AUTHENTICATION',
    TRANSIENT: 'TRANSIENT',
    DATA: 'DATA',
    PERMISSION: 'PERMISSION',
    INTEGRITY_FATAL: 'INTEGRITY_FATAL',
    SYSTEM: 'SYSTEM',
});

const CLASS_ALIASES = Object.freeze({
    AUTH: ERROR_CLASSES.AUTHENTICATION,
    AUTHENTICATION_REQUIRED: ERROR_CLASSES.AUTHENTICATION,
    PORTAL_TRANSIENT: ERROR_CLASSES.TRANSIENT,
    LOCAL_SYSTEM: ERROR_CLASSES.TRANSIENT,
    DATE_DATA: ERROR_CLASSES.DATA,
    VALIDATION: ERROR_CLASSES.DATA,
    PORTAL_SYSTEMIC: ERROR_CLASSES.SYSTEM,
    INTEGRITY: ERROR_CLASSES.INTEGRITY_FATAL,
});

function normalizeClass(value) {
    const key = String(value || '').trim().toUpperCase();
    const normalized = CLASS_ALIASES[key] || key;
    return Object.values(ERROR_CLASSES).includes(normalized) ? normalized : null;
}

// AUTO-IMPORT-LOG-01 (1): a locked database is local contention between two writers, not a portal or adapter fault.
// It is retried (bounded by the lane's attempt budget, never faster than MIN_LOCK_RETRY_DELAY_MS) and never counts
// toward the circuit that stops a lane.
const LOCK_CODES = new Set(['SQLITE_BUSY', 'SQLITE_LOCKED']);
const LOCK_MESSAGE = /SQLITE_BUSY|SQLITE_LOCKED|database (table )?is locked/i;
const MIN_LOCK_RETRY_DELAY_MS = 15000;

// AUTO-IMPORT-LOG-01 (3): the portal data of a day is not complete (yet): TCT rows without an accepting province,
// the portal's own summary disagreeing with the file (the portal is still computing or revised the day). Nothing is
// wrong with the system, so it is class DATA (isolated to that day, does not count toward the circuit) with the code
// DATA_NOT_READY unless the error already carries a specific code. The scheduled import retries such days.
const DATA_NOT_READY_MESSAGE = /missing accepting province code|has no accepting province code/i;
const DATA_NOT_READY_CODE = /(RECONCILIATION|OUTER_SUMMARY)/;

function sanitizeCode(value) {
    const code = String(value || 'QUEUE_EXECUTION_ERROR').toUpperCase().replace(/[^A-Z0-9_.-]/g, '_');
    return code.slice(0, 96) || 'QUEUE_EXECUTION_ERROR';
}

function normalizedMessage(value) {
    return String(value || '')
        .replace(/https?:\/\/\S+/gi, '[url]')
        .replace(/(token|cookie|password|authorization|credential)\s*[:=]\s*\S+/gi, '$1=[redacted]')
        .replace(/[0-9a-f]{24,}/gi, '[opaque]')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .slice(0, 240);
}

// IMPORT-TCT-TIMEOUT-01: the signature is a one-way hash, so a failure used to leave no readable
// trace of what actually went wrong. Keep a bounded, redacted copy of the message (original case)
// next to it so the next occurrence is diagnosable from the attempt/event rows alone.
function diagnosticMessage(value) {
    return String(value || '')
        .replace(/https?:\/\/\S+/gi, '[url]')
        .replace(/(token|cookie|password|authorization|credential)\s*[:=]\s*\S+/gi, '$1=[redacted]')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
}

function errorSignature(classification, code, message) {
    const digest = crypto.createHash('sha256')
        .update(`${classification}|${code}|${normalizedMessage(message)}`)
        .digest('hex')
        .slice(0, 16);
    return `${code}:${digest}`;
}

function scopeKey({ adapterId, sourceLane, resourceIdentity }) {
    return crypto.createHash('sha256')
        .update(`${adapterId}|${sourceLane}|${resourceIdentity}`)
        .digest('hex');
}

class AutoBackfillSafetyCoordinator {
    scopeFor(lane, job) {
        const adapterId = job.executor_id;
        const sourceLane = job.source_lane;
        const resourceIdentity = job.resource_identity || lane?.portalAdapter?.resourceIdentity || 'UNDECLARED_RESOURCE';
        return {
            key: job.circuit_scope_key || scopeKey({ adapterId, sourceLane, resourceIdentity }),
            adapterId,
            sourceLane,
            resourceIdentity,
        };
    }

    classify(error, { lane, job }) {
        const code = sanitizeCode(error?.code);
        const declared = error?.autoBackfill?.classification
            || lane?.errorMap?.[code];
        const message = String(error?.message || '');
        const lockContention = !declared && (LOCK_CODES.has(code) || LOCK_MESSAGE.test(message));
        const dataNotReady = !declared && !lockContention && (DATA_NOT_READY_MESSAGE.test(message) || DATA_NOT_READY_CODE.test(code));
        const classification = normalizeClass(declared)
            || (lockContention ? ERROR_CLASSES.TRANSIENT : null)
            || (dataNotReady ? ERROR_CLASSES.DATA : null)
            || ERROR_CLASSES.SYSTEM;
        const reportedCode = dataNotReady && code === 'QUEUE_EXECUTION_ERROR' ? 'DATA_NOT_READY' : code;
        const declaredRetryable = (lane?.retryPolicy?.retryableClasses || [])
            .map(normalizeClass)
            .filter(Boolean);
        const retryable = classification === ERROR_CLASSES.TRANSIENT
            && declaredRetryable.includes(ERROR_CLASSES.TRANSIENT);
        const systemic = lockContention ? false : (retryable || classification === ERROR_CLASSES.SYSTEM);
        return {
            code: reportedCode,
            classification,
            retryable,
            systemic,
            lockContention,
            dataNotReady,
            minRetryDelayMs: lockContention ? MIN_LOCK_RETRY_DELAY_MS : 0,
            integrityFatal: classification === ERROR_CLASSES.INTEGRITY_FATAL,
            signature: errorSignature(classification, reportedCode, error?.message),
            message: diagnosticMessage(error?.message),
            scope: this.scopeFor(lane, job),
        };
    }

    retryDelayMs(policy, attemptNumber) {
        const initial = Number(policy?.initialDelayMs || 2000);
        const maximum = Number(policy?.maxDelayMs || 30000);
        return Math.min(maximum, initial * (2 ** Math.max(0, Number(attemptNumber) - 1)));
    }

    maxAttempts(policy) {
        return Number(policy?.maxAttempts || 3);
    }
}

module.exports = {
    AutoBackfillSafetyCoordinator,
    ERROR_CLASSES,
    MIN_LOCK_RETRY_DELAY_MS,
    errorSignature,
    scopeKey,
};
