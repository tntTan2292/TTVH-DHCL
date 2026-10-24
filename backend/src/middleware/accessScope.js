'use strict';

// RBAC-01 step 2b: data-scope building blocks (Design of Record sections 2-4).
// requireModule runs AFTER requireAuth and BEFORE cachedRead(), so the cache key can include the scope.

const { sendForbidden, sendUnauthorized } = require('./authMiddleware');

const MODULE_KEYS = ['f11', 'f12', 'f13', 'f41'];

/** Stable string for the response cache key: '' (unscoped route), 'all', or 'b:<sorted codes>'. */
function scopeKey(req) {
    const scope = req.scope;
    if (!scope) return '';
    if (scope.mode === 'all') return 'all';
    return `b:${[...scope.bcvh].sort().join(',')}`;
}

/** 403 when the user's mode for the module is 'none'; otherwise sets req.scope = { module, mode, bcvh }. */
function requireModule(moduleKey) {
    if (!MODULE_KEYS.includes(moduleKey)) throw new Error(`Unknown RBAC module "${moduleKey}"`);

    return (req, res, next) => {
        if (!req.auth?.user || !req.access) return sendUnauthorized(res);
        const entry = req.access.modules?.[moduleKey];
        if (!entry || entry.mode === 'none') return sendForbidden(res);
        req.scope = { module: moduleKey, mode: entry.mode, bcvh: [...(entry.bcvh || [])] };
        return next();
    };
}

/** ADMIN only, decided from the resolved access object (not from the legacy role string). */
function requireAdminAccess(req, res, next) {
    if (!req.auth?.user || !req.access) return sendUnauthorized(res);
    if (!req.access.admin) return sendForbidden(res);
    return next();
}

class OutOfScopeError extends Error {
    constructor(message = 'Đơn vị nằm ngoài phạm vi được phép xem') {
        super(message);
        this.code = 'OUT_OF_SCOPE';
        this.status = 403;
    }
}

/**
 * The only way a controller obtains a BCVH filter for a single-unit endpoint.
 * - mode 'all': the requested value (or null = no filter).
 * - mode 'bcvh': the requested value must be in scope (else OutOfScopeError); absent -> first code of the scope.
 * Values from the client can narrow the scope, never widen it. Never aggregates several BCVH (PO O1).
 */
function effectiveBcvh(req, requested) {
    const scope = req.scope;
    if (!scope) throw new Error('effectiveBcvh called on a route without requireModule');
    const wanted = requested === undefined || requested === null || String(requested).trim() === '' || String(requested).toLowerCase() === 'all'
        ? null
        : String(requested).trim();
    if (scope.mode === 'all') return wanted;
    if (wanted === null) return scope.bcvh[0] || null;
    if (!scope.bcvh.includes(wanted)) throw new OutOfScopeError();
    return wanted;
}

/**
 * Controller-side entry point: on a scoped route (req.scope set by requireModule) this is
 * effectiveBcvh; a request without scope is returned unchanged. Every module route mounts
 * requireModule, which a route-wiring test asserts, so the unscoped branch is for unit tests only.
 */
function resolveBcvh(req, requested) {
    return req.scope ? effectiveBcvh(req, requested) : requested;
}

/** For list (Type B) endpoints: the BCVH codes the rows may contain, or null for no restriction. */
function scopedBcvhList(req) {
    const scope = req.scope;
    if (!scope) throw new Error('scopedBcvhList called on a route without requireModule');
    return scope.mode === 'all' ? null : [...scope.bcvh];
}

/** Express error helper for controllers: maps OutOfScopeError to the standard 403 body. */
function sendIfOutOfScope(res, error) {
    if (error instanceof OutOfScopeError) {
        res.status(403).json({ success: false, error: { code: error.code, message: error.message } });
        return true;
    }
    return false;
}

module.exports = {
    scopeKey,
    requireModule,
    requireAdminAccess,
    effectiveBcvh,
    resolveBcvh,
    scopedBcvhList,
    sendIfOutOfScope,
    OutOfScopeError,
};
