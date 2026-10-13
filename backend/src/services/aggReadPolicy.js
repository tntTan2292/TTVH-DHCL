'use strict';

/**
 * aggReadPolicy.js - PERF-LOAD-01 Phase 2: decides whether a read goes to the detail table or to the
 * pre-aggregated day table (design: PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md section 5.3, hardened by
 * the independent review in section 17).
 *
 * Mode per indicator, read at call time:
 *   QIS_AGG_READ_F41 | QIS_AGG_READ_F13 | QIS_AGG_READ_F11 | QIS_AGG_READ_F12, else QIS_AGG_READ, else 'off'
 *   off    - always the detail table (the behaviour before Phase 2)
 *   shadow - answer from the detail table, compare with the aggregate in the background, log differences
 *   on     - answer from the aggregate while the fuse holds, otherwise from the detail table
 *
 * Fuse (re-checked at most every FUSE_TTL_MS and right after any transaction of this process):
 * the aggregate may be used only while, for the indicator,
 *   1. SUM(n_rows) of the aggregate = COUNT(*) of the detail table, AND
 *   2. for EVERY day the detail table's (row count, MAX(id)) equals the signature stored when that day was
 *      last built (agg_day_sig). The tables are AUTOINCREMENT, so any delete+insert of a day (an import by a
 *      process that does not maintain the aggregate, even with the same row count) moves MAX(id) and trips it.
 * In-place UPDATE of a detail row is invisible to the fuse; `scripts/agg_tool.js verify` covers that.
 *
 * While an import transaction is open on the shared connection the fuse keeps its last answer and shadow
 * comparisons are skipped (a half-written day would be reported as a difference).
 */

const { AGG_DEFINITIONS } = require('./aggMaintenance');
const { txState } = require('../config/db');

const MODES = new Set(['off', 'shadow', 'on']);
const FUSE_TTL_MS = 60 * 1000;
const SUMMARY_EVERY = 100;
const SUMMARY_MS = 10 * 60 * 1000;

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

let fuseCache = new WeakMap(); // db -> Map(indicator -> { at, ok, generation })
const lastFuse = {};           // indicator -> { ok, at } for status()
const listeners = [];

function freshCounters() {
    return { compared: 0, mismatches: 0, skipped: 0, errors: 0 };
}
const stats = { shadowCompared: 0, shadowMismatches: 0, shadowSkipped: 0, shadowErrors: 0, fuseTrips: 0, byIndicator: {} };
let lastSummaryAt = Date.now();

function counters(indicator) {
    if (!stats.byIndicator[indicator]) stats.byIndicator[indicator] = freshCounters();
    return stats.byIndicator[indicator];
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

async function checkInvariant(db, indicator) {
    const def = AGG_DEFINITIONS[indicator];
    try {
        const facts = await dbAll(
            db,
            `SELECT ngay_do_kiem AS d, COUNT(*) AS c, MAX(id) AS m FROM ${def.factTable} GROUP BY ngay_do_kiem`
        );
        const signatures = await dbAll(
            db,
            `SELECT ngay_do_kiem AS d, fact_rows AS c, fact_max_id AS m FROM agg_day_sig WHERE indicator = ?`,
            [indicator]
        );
        const sums = await dbGet(db, `SELECT COALESCE(SUM(n_rows), 0) AS a FROM ${def.aggTable}`);
        const total = facts.reduce((sum, row) => sum + row.c, 0);
        if (total !== sums.a) return false;
        if (facts.length !== signatures.length) return false;
        const bySig = new Map(signatures.map((row) => [row.d, row]));
        return facts.every((row) => {
            const sig = bySig.get(row.d);
            return sig && sig.c === row.c && sig.m === row.m;
        });
    } catch {
        return false; // table or signature missing / unreadable: never serve from the aggregate
    }
}

function onFuseChange(listener) {
    listeners.push(listener);
}

/** True when the aggregate may answer for this indicator right now. */
async function aggUsable(indicator, db, { force = false } = {}) {
    let perDb = fuseCache.get(db);
    if (!perDb) { perDb = new Map(); fuseCache.set(db, perDb); }
    const cached = perDb.get(indicator);
    const now = Date.now();

    // An import transaction is open on the shared connection: the detail table is half written, so
    // a check now would trip falsely. Keep the last answer (or stay on the detail table).
    if (txState.active > 0) return cached ? cached.ok : false;

    if (!force && cached && now - cached.at < FUSE_TTL_MS && cached.generation === txState.generation) {
        return cached.ok;
    }

    const generation = txState.generation;
    const ok = await checkInvariant(db, indicator);
    if (txState.active > 0) return cached ? cached.ok : false; // an import started while we were checking

    const previous = cached ? cached.ok : null;
    perDb.set(indicator, { at: now, ok, generation });
    lastFuse[indicator] = { ok, at: new Date(now).toISOString() };
    if (previous !== null && previous !== ok) {
        if (!ok) {
            stats.fuseTrips += 1;
            console.warn(`[agg-read] ${indicator}: fuse OPEN - aggregate and detail table disagree (row totals or a day signature); reading the detail table until the aggregate is rebuilt (scripts/agg_tool.js build).`);
        } else {
            console.log(`[agg-read] ${indicator}: fuse closed again - aggregate matches the detail table.`);
        }
        for (const listener of listeners) {
            try { listener({ indicator, ok }); } catch { /* a listener must not break reads */ }
        }
    } else if (previous === null && !ok) {
        stats.fuseTrips += 1;
        console.warn(`[agg-read] ${indicator}: fuse OPEN at first check - aggregate missing or different from the detail table; reading the detail table.`);
    }
    return ok;
}

function writeToken() {
    return { active: txState.active, generation: txState.generation };
}

function resetForTests() {
    fuseCache = new WeakMap();
    for (const key of Object.keys(lastFuse)) delete lastFuse[key];
    stats.shadowCompared = 0;
    stats.shadowMismatches = 0;
    stats.shadowSkipped = 0;
    stats.shadowErrors = 0;
    stats.fuseTrips = 0;
    stats.byIndicator = {};
    lastSummaryAt = Date.now();
}

function normalize(value) {
    return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? Number(v) : v));
}

function maybeSummarize() {
    const total = stats.shadowCompared + stats.shadowSkipped + stats.shadowErrors;
    if (total === 0) return;
    if (total % SUMMARY_EVERY !== 0 && Date.now() - lastSummaryAt < SUMMARY_MS) return;
    lastSummaryAt = Date.now();
    console.log(`[agg-shadow] summary compared=${stats.shadowCompared} mismatches=${stats.shadowMismatches} skipped(in-import)=${stats.shadowSkipped} errors=${stats.shadowErrors} fuseTrips=${stats.fuseTrips} byIndicator=${JSON.stringify(stats.byIndicator)}`);
}

/**
 * Fire-and-forget comparison used by `shadow` mode; never throws, never alters the answer.
 * `token` is writeToken() taken BEFORE the detail query ran: a comparison that overlapped an import
 * (transaction open at the start, or committed meanwhile) is skipped, not reported.
 */
function shadowCompare(indicator, method, factResult, aggRunner, token = null) {
    const before = token || writeToken();
    const c = counters(indicator);
    if (before.active > 0) {
        stats.shadowSkipped += 1;
        c.skipped += 1;
        maybeSummarize();
        return;
    }
    Promise.resolve()
        .then(aggRunner)
        .then((aggResult) => {
            const after = writeToken();
            if (after.active > 0 || after.generation !== before.generation) {
                stats.shadowSkipped += 1;
                c.skipped += 1;
                return;
            }
            stats.shadowCompared += 1;
            c.compared += 1;
            const a = normalize(factResult);
            const b = normalize(aggResult);
            if (a !== b) {
                stats.shadowMismatches += 1;
                c.mismatches += 1;
                console.warn(`[agg-shadow] MISMATCH ${indicator} ${method}\n  detail: ${a.slice(0, 400)}\n  agg:    ${b.slice(0, 400)}`);
            }
        })
        .catch((error) => {
            stats.shadowErrors += 1;
            c.errors += 1;
            console.warn(`[agg-shadow] ERROR ${indicator} ${method}: ${error && error.message}`);
        })
        .finally(maybeSummarize);
}

/** Snapshot for the admin status endpoint. */
function status() {
    return {
        modes: Object.fromEntries(Object.keys(ENV_KEY).map((indicator) => [indicator, modeFor(indicator)])),
        fuse: { ...lastFuse },
        inImportTransaction: txState.active > 0,
        shadow: { ...stats, byIndicator: { ...stats.byIndicator } },
    };
}

module.exports = { FUSE_TTL_MS, aggUsable, modeFor, onFuseChange, resetForTests, shadowCompare, stats, status, writeToken };
