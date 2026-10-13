'use strict';

/**
 * aggReadPolicy.js - PERF-LOAD-01 Phase 2: decides whether a read goes to the detail table or to the
 * pre-aggregated day table (design: PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md section 5.3).
 *
 * Mode per indicator, read at call time (restart-free for tests, env-driven for operations):
 *   QIS_AGG_READ_F41 | QIS_AGG_READ_F13 | QIS_AGG_READ_F11 | QIS_AGG_READ_F12, else QIS_AGG_READ, else 'off'
 *   off    - always the detail table (the behaviour before Phase 2)
 *   shadow - answer from the detail table, compare with the aggregate in the background, log differences
 *   on     - answer from the aggregate while the fuse holds, otherwise from the detail table
 *
 * Fuse: the aggregate may be used only while SUM(n_rows) of the aggregate equals COUNT(*) of the detail
 * table (re-checked at most every FUSE_TTL_MS). Any import that bypasses the maintenance, or a table
 * that was never built, trips it and reads fall back to the detail table automatically.
 */

const { AGG_DEFINITIONS } = require('./aggMaintenance');

const MODES = new Set(['off', 'shadow', 'on']);
const FUSE_TTL_MS = 60 * 1000;

const ENV_KEY = {
    'F1.3': 'QIS_AGG_READ_F13',
    'F4.1': 'QIS_AGG_READ_F41',
    'F1.1': 'QIS_AGG_READ_F11',
    'F1.2': 'QIS_AGG_READ_F12',
};

function modeFor(indicator) {
    const raw = String(process.env[ENV_KEY[indicator]] || process.env.QIS_AGG_READ || 'off').trim().toLowerCase();
    return MODES.has(raw) ? raw : 'off';
}

let fuseCache = new WeakMap(); // db -> Map(indicator -> { at, ok })
const stats = { shadowCompared: 0, shadowMismatches: 0, shadowErrors: 0, fuseTrips: 0 };

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

async function checkInvariant(db, indicator) {
    const def = AGG_DEFINITIONS[indicator];
    try {
        const row = await dbGet(
            db,
            `SELECT (SELECT COUNT(*) FROM ${def.factTable}) AS fact_rows,
                    (SELECT COALESCE(SUM(n_rows), 0) FROM ${def.aggTable}) AS agg_rows`
        );
        return row.fact_rows === row.agg_rows;
    } catch {
        return false; // table missing / unreadable: never serve from it
    }
}

/** True when the aggregate may answer for this indicator right now. */
async function aggUsable(indicator, db, { force = false } = {}) {
    let perDb = fuseCache.get(db);
    if (!perDb) { perDb = new Map(); fuseCache.set(db, perDb); }
    const cached = perDb.get(indicator);
    const now = Date.now();
    if (!force && cached && now - cached.at < FUSE_TTL_MS) return cached.ok;

    const ok = await checkInvariant(db, indicator);
    if (!ok && (!cached || cached.ok)) {
        stats.fuseTrips += 1;
        console.warn(`[agg-read] ${indicator}: aggregate and detail row counts differ (or the aggregate is missing); reading the detail table until it is rebuilt (scripts/agg_tool.js build).`);
    }
    perDb.set(indicator, { at: now, ok });
    return ok;
}

function resetForTests() {
    fuseCache = new WeakMap();
    stats.shadowCompared = 0;
    stats.shadowMismatches = 0;
    stats.shadowErrors = 0;
    stats.fuseTrips = 0;
}

function normalize(value) {
    return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? Number(v) : v));
}

/** Fire-and-forget comparison used by `shadow` mode; never throws, never alters the answer. */
function shadowCompare(indicator, method, factResult, aggRunner) {
    Promise.resolve()
        .then(aggRunner)
        .then((aggResult) => {
            stats.shadowCompared += 1;
            if (normalize(aggResult) !== normalize(factResult)) {
                stats.shadowMismatches += 1;
                console.warn(`[agg-shadow] MISMATCH ${indicator} ${method}`);
            }
        })
        .catch((error) => {
            stats.shadowErrors += 1;
            console.warn(`[agg-shadow] ERROR ${indicator} ${method}: ${error && error.message}`);
        });
}

module.exports = { FUSE_TTL_MS, aggUsable, modeFor, resetForTests, shadowCompare, stats };
