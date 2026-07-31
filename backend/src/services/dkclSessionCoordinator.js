'use strict';

const crypto = require('node:crypto');
const { DkclSessionStore } = require('./dkclSessionStore');
const { DKCL_LIFECYCLE_STATES } = require('./dkclLifecycleContract');

const COORDINATOR_RUNTIME_STATES = Object.freeze({
    STALE: 'STALE',
    FAILED: 'FAILED'
});

const COORDINATOR_RECOVERABLE_STATES = new Set([
    DKCL_LIFECYCLE_STATES.OPENING_BROWSER,
    DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN,
    DKCL_LIFECYCLE_STATES.AUTHENTICATED,
    DKCL_LIFECYCLE_STATES.F13_OPENING,
    DKCL_LIFECYCLE_STATES.F13_READY
]);

function normalizeState(state) {
    return String(state || '').trim().toUpperCase();
}

function createSessionId() {
    return crypto.randomUUID();
}

class DkclSessionCoordinator {
    constructor(options = {}) {
        this.store = options.store || new DkclSessionStore(options.storeOptions);
        this.backendInstanceId = options.backendInstanceId || process.env.DKCL_BACKEND_INSTANCE_ID || createSessionId();
        this.clock = options.clock || (() => new Date());
    }

    static isEnabled() {
        const raw = String(process.env.DKCL_SESSION_COORDINATOR_ENABLED || '0').trim().toLowerCase();
        return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
    }

    nowIso() {
        return this.clock().toISOString();
    }

    getSession(source) {
        return this.store.getSession(source);
    }

    clearSession(source) {
        this.store.removeSession(source);
    }

    recordState(source, patch = {}) {
        const current = this.store.getSession(source);
        const nextState = normalizeState(patch.state || current?.state || DKCL_LIFECYCLE_STATES.OPENING_BROWSER);
        return this.store.upsertSession(source, {
            sessionId: patch.sessionId || current?.sessionId || createSessionId(),
            backendInstanceId: patch.backendInstanceId || this.backendInstanceId,
            state: nextState,
            profileDir: patch.profileDir || current?.profileDir || null,
            browserRootPid: Number.isFinite(Number(patch.browserRootPid)) ? Number(patch.browserRootPid) : (current?.browserRootPid ?? null),
            sourcePageReady: typeof patch.sourcePageReady === 'boolean' ? patch.sourcePageReady : Boolean(current?.sourcePageReady),
            authenticated: typeof patch.authenticated === 'boolean' ? patch.authenticated : Boolean(current?.authenticated),
            lastError: patch.lastError ?? current?.lastError ?? null,
            updatedAt: this.nowIso()
        });
    }

    beginOpening(source, profileDir) {
        return this.recordState(source, {
            state: DKCL_LIFECYCLE_STATES.OPENING_BROWSER,
            profileDir,
            sourcePageReady: false,
            authenticated: false,
            lastError: null
        });
    }

    syncLifecycle(source, entry, profileDir, patch = {}) {
        if (!entry) return null;
        return this.recordState(source, {
            state: entry.lifecycleState || entry.state,
            profileDir,
            sourcePageReady: Boolean(entry.backgroundReady),
            authenticated: Boolean(entry.authenticated),
            lastError: patch.lastError ?? entry.lastError ?? null
        });
    }

    markStale(source, profileDir, lastError = null) {
        return this.recordState(source, {
            state: COORDINATOR_RUNTIME_STATES.STALE,
            profileDir,
            lastError
        });
    }

    markFailed(source, profileDir, error) {
        return this.recordState(source, {
            state: COORDINATOR_RUNTIME_STATES.FAILED,
            profileDir,
            lastError: error?.message || String(error || '')
        });
    }

    canRecover(record, profileDir, inspection) {
        if (!record) return false;
        if (!COORDINATOR_RECOVERABLE_STATES.has(normalizeState(record.state))) return false;
        if (record.profileDir && profileDir && String(record.profileDir).toLowerCase() !== String(profileDir).toLowerCase()) return false;

        const matchingProcesses = inspection?.matchingProcesses || [];
        return matchingProcesses.some((proc) => proc?.exactProfileMatch);
    }

    getRecoveredState(record) {
        const state = normalizeState(record?.state);
        if (state === DKCL_LIFECYCLE_STATES.F13_READY) return DKCL_LIFECYCLE_STATES.F13_READY;
        if (state === DKCL_LIFECYCLE_STATES.OPENING_BROWSER) return DKCL_LIFECYCLE_STATES.OPENING_BROWSER;
        return DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN;
    }
}

module.exports = {
    DkclSessionCoordinator,
    COORDINATOR_RUNTIME_STATES,
    COORDINATOR_RECOVERABLE_STATES
};
