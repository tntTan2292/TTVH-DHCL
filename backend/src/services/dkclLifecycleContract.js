'use strict';

const DKCL_LIFECYCLE_STATES = Object.freeze({
    SOURCE_SELECTED: 'SOURCE_SELECTED',
    SESSION_CHECK: 'SESSION_CHECK',
    OPENING_BROWSER: 'OPENING_BROWSER',
    WAITING_FOR_LOGIN: 'WAITING_FOR_LOGIN',
    AUTHENTICATED: 'AUTHENTICATED',
    F13_OPENING: 'F13_OPENING',
    F13_READY: 'F13_READY'
});

const DKCL_LEGACY_STATES = Object.freeze({
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    ERROR: 'ERROR'
});

const DKCL_PUBLIC_LIFECYCLE_SEQUENCE = Object.freeze([
    DKCL_LIFECYCLE_STATES.SOURCE_SELECTED,
    DKCL_LIFECYCLE_STATES.SESSION_CHECK,
    DKCL_LIFECYCLE_STATES.OPENING_BROWSER,
    DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN,
    DKCL_LIFECYCLE_STATES.AUTHENTICATED,
    DKCL_LIFECYCLE_STATES.F13_OPENING,
    DKCL_LIFECYCLE_STATES.F13_READY
]);

const DKCL_IN_PROGRESS_STATES = new Set([
    DKCL_LIFECYCLE_STATES.OPENING_BROWSER,
    DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN,
    DKCL_LIFECYCLE_STATES.F13_OPENING
]);

function isKnownLifecycleState(state) {
    return DKCL_PUBLIC_LIFECYCLE_SEQUENCE.includes(state) || Object.values(DKCL_LEGACY_STATES).includes(state);
}

function transitionLifecycle(entry, state, patch = {}, clock = () => new Date()) {
    if (!isKnownLifecycleState(state)) {
        const error = new Error(`Unsupported DKCL lifecycle state: ${state}`);
        error.code = 'INVALID_DKCL_LIFECYCLE_STATE';
        throw error;
    }
    Object.assign(entry, patch, {
        state,
        lifecycleState: state,
        updatedAt: clock().toISOString()
    });
    return entry;
}

function lifecyclePayload(entry) {
    const state = entry.lifecycleState || entry.state;
    return {
        lifecycle_state: state,
        lifecycle: {
            state,
            source_page_ready: state === DKCL_LIFECYCLE_STATES.F13_READY,
            authenticated: Boolean(entry.authenticated),
            background_ready: Boolean(entry.backgroundReady),
            window_hidden: Boolean(entry.windowHidden),
            hide_attempted: Boolean(entry.hideAttempted)
        }
    };
}

module.exports = {
    DKCL_LIFECYCLE_STATES,
    DKCL_LEGACY_STATES,
    DKCL_PUBLIC_LIFECYCLE_SEQUENCE,
    DKCL_IN_PROGRESS_STATES,
    transitionLifecycle,
    lifecyclePayload
};
