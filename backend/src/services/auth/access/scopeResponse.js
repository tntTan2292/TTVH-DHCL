'use strict';

// RBAC-01 step 3: response sanitising for list endpoints that return every BCVH ("Type B").
// A BCVH-mode user must receive only the rows of the BCVH in their scope and no number that is
// derived from the other BCVH (city totals, ranks, province rank). PO rule 6, DEC-022.

const { BCVH_BY_CODE } = require('./officeMap');

const CANONICAL_CODES = new Set(Object.keys(BCVH_BY_CODE));
const norm = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const CANONICAL_NAMES = new Set(Object.values(BCVH_BY_CODE).map(norm));

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Keeps only rows / map entries that belong to `allowedCodes`.
 * - array elements carrying `ma_bcvh` (or, without a code, a `ten_bcvh`) are dropped unless allowed;
 *   an element whose `ten_bcvh` is not an allowed name (e.g. "TỔNG CỘNG") is dropped too;
 * - object keys that are canonical BCVH codes are dropped unless allowed (maps like `units`).
 */
function restrictToBcvh(value, allowedCodes) {
    const allowed = new Set(allowedCodes.map(String));
    const allowedNames = new Set(allowedCodes.map((code) => norm(BCVH_BY_CODE[code])));

    const keepRow = (row) => {
        if (!isPlainObject(row)) return true;
        if (row.ma_bcvh !== undefined && row.ma_bcvh !== null) return allowed.has(String(row.ma_bcvh));
        if (typeof row.ten_bcvh === 'string') return allowedNames.has(norm(row.ten_bcvh));
        return true;
    };

    const walk = (node) => {
        if (Array.isArray(node)) return node.filter(keepRow).map(walk);
        if (isPlainObject(node)) {
            const out = {};
            for (const [key, child] of Object.entries(node)) {
                if (CANONICAL_CODES.has(key) && !allowed.has(key)) continue;
                out[key] = walk(child);
            }
            return out;
        }
        return node;
    };
    return walk(value);
}

/** Removes cross-BCVH fields. Path syntax: 'meta.total_row', 'data[].rank', 'data.weeks[].national_rank'. */
function dropPaths(value, paths) {
    const root = structuredClone(value);
    const apply = (node, segments) => {
        if (node === null || typeof node !== 'object' || segments.length === 0) return;
        const [head, ...rest] = segments;
        const isArrayStep = head.endsWith('[]');
        const key = isArrayStep ? head.slice(0, -2) : head;
        if (Array.isArray(node)) {
            node.forEach((item) => apply(item, segments));
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(node, key)) return;
        if (rest.length === 0 && !isArrayStep) {
            delete node[key];
            return;
        }
        const child = node[key];
        if (isArrayStep && Array.isArray(child)) {
            child.forEach((item) => apply(item, rest));
        } else {
            apply(child, rest);
        }
    };
    for (const path of paths) apply(root, path.split('.'));
    return root;
}

const SUM_FIELDS = ['volume', 'passed', 'failed', 'blank'];

function sumCells(cells) {
    const total = {};
    for (const field of SUM_FIELDS) total[field] = 0;
    for (const cell of Object.values(cells || {})) {
        for (const field of SUM_FIELDS) total[field] += Number(cell?.[field]) || 0;
    }
    total.rate = total.volume > 0 ? Math.round((total.passed / total.volume) * 10000) / 100 : null;
    return total;
}

/**
 * F1.1 accepting-office x delivering-BCVH matrix (PO rule 2): every accepting row stays, but only the
 * delivering columns of the scope remain (the "Khac" column of non-canonical delivering units goes too)
 * and the row / grand totals are recomputed from those columns, so no cross-BCVH number is left.
 */
function restrictPairTable(data, allowedCodes) {
    if (!isPlainObject(data) || !Array.isArray(data.rows)) return data;
    const allowed = new Set(allowedCodes.map(String));
    const onlyAllowed = (cells) => Object.fromEntries(Object.entries(cells || {}).filter(([code]) => allowed.has(code)));
    const out = { ...data };
    if (Array.isArray(data.columns)) out.columns = data.columns.filter((column) => allowed.has(String(column.ma_bcvh)));
    out.rows = data.rows.map((row) => {
        const cells = onlyAllowed(row.cells);
        return { ...row, cells, total: sumCells(cells) };
    });
    if (isPlainObject(data.total_row)) {
        const cells = onlyAllowed(data.total_row.cells);
        out.total_row = { ...data.total_row, cells, total: sumCells(cells) };
    }
    return out;
}

/** Full transform for one payload. */
function sanitizeForBcvhScope(payload, allowedCodes, drop = []) {
    return dropPaths(restrictToBcvh(payload, allowedCodes), drop);
}

/**
 * Route-level middleware: for a BCVH-mode user rewrites the JSON body before it is sent (and before
 * the response cache stores it, so the cache holds the sanitised body under the scoped key).
 * Mount AFTER cachedRead() / requireModule().
 */
function scopeBcvhResponse({ drop = [], transform = null } = {}) {
    return (req, res, next) => {
        if (!req.scope || req.scope.mode !== 'bcvh') return next();
        const originalJson = res.json.bind(res);
        res.json = (payload) => {
            if (res.statusCode === 200 && payload && typeof payload === 'object') {
                const clean = sanitizeForBcvhScope(payload, req.scope.bcvh, drop);
                return originalJson(transform ? transform(clean, req.scope.bcvh) : clean);
            }
            return originalJson(payload);
        };
        return next();
    };
}

module.exports = { restrictToBcvh, restrictPairTable, dropPaths, sanitizeForBcvhScope, scopeBcvhResponse };
