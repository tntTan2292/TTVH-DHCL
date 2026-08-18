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
        const classification = normalizeClass(declared) || ERROR_CLASSES.SYSTEM;
        const declaredRetryable = (lane?.retryPolicy?.retryableClasses || [])
            .map(normalizeClass)
            .filter(Boolean);
        const retryable = classification === ERROR_CLASSES.TRANSIENT
            && declaredRetryable.includes(ERROR_CLASSES.TRANSIENT);
        const systemic = retryable || classification === ERROR_CLASSES.SYSTEM;
        return {
            code,
            classification,
            retryable,
            systemic,
            integrityFatal: classification === ERROR_CLASSES.INTEGRITY_FATAL,
            signature: errorSignature(classification, code, error?.message),
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
    errorSignature,
    scopeKey,
};
