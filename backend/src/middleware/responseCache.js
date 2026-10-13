// PERF-LOAD-01 Phase 1: in-memory cache for read-only dashboard GET responses.
//
// Mount AFTER requireAuth (it must never answer an unauthenticated request). The dashboard
// controllers do not read req.auth, so a response depends only on the URL and on the data.
// "Data" is fingerprinted from the fact tables (max rowid) + the small configuration tables, so
// any import/backfill (this process or another one) makes older entries unreachable at once.
// A TTL bounds staleness for edits the fingerprint cannot see (in-place UPDATE).

const { get, all } = require('../config/db');

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const FINGERPRINT_TTL_MS = 1500;
const MAX_ENTRIES = 400;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

// Tables whose max(rowid) moves on every import/backfill (rows are deleted + re-inserted).
const GROWING_TABLES = [
    'fact_f13', 'fact_f13_national',
    'fact_f41', 'fact_f41_national',
    'fact_f11', 'fact_f11_national',
    'fact_f12', 'fact_f12_national',
    'import_log',
    'dm_buu_ta', 'dm_buu_ta_event',
    'network_delivery_point', 'network_service_point', 'network_level2_route',
];
// Tiny configuration tables that can change by UPDATE: fingerprinted by content.
const CONFIG_TABLES = ['sys_kpi_thresholds', 'system_config'];

let fingerprintValue = null;
let fingerprintAt = 0;
let fingerprintPromise = null;

async function computeFingerprint() {
    const parts = [];
    for (const table of GROWING_TABLES) {
        try {
            const row = await get(`SELECT MAX(rowid) AS m FROM "${table}"`);
            parts.push(`${table}:${row?.m ?? 0}`);
        } catch {
            parts.push(`${table}:x`);
        }
    }
    for (const table of CONFIG_TABLES) {
        try {
            const rows = await all(`SELECT * FROM "${table}"`);
            parts.push(`${table}:${JSON.stringify(rows)}`);
        } catch {
            parts.push(`${table}:x`);
        }
    }
    return parts.join('|');
}

function getFingerprint() {
    const now = Date.now();
    if (fingerprintValue !== null && now - fingerprintAt < FINGERPRINT_TTL_MS) {
        return Promise.resolve(fingerprintValue);
    }
    if (!fingerprintPromise) {
        fingerprintPromise = computeFingerprint()
            .then((value) => {
                fingerprintValue = value;
                fingerprintAt = Date.now();
                return value;
            })
            .finally(() => { fingerprintPromise = null; });
    }
    return fingerprintPromise;
}

const store = new Map();

function remember(key, entry) {
    if (store.has(key)) store.delete(key);
    store.set(key, entry);
    while (store.size > MAX_ENTRIES) {
        store.delete(store.keys().next().value);
    }
}

/**
 * @param {object} [options]
 * @param {(req) => boolean} [options.shouldCache] default: every GET.
 * @param {number} [options.ttlMs]
 */
function cachedRead(options = {}) {
    const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : DEFAULT_TTL_MS;
    const shouldCache = typeof options.shouldCache === 'function' ? options.shouldCache : () => true;

    return async function responseCache(req, res, next) {
        if (req.method !== 'GET' || !shouldCache(req)) return next();

        let version;
        try {
            version = await getFingerprint();
        } catch {
            return next();
        }

        const key = req.originalUrl;
        const hit = store.get(key);
        if (hit && hit.version === version && Date.now() - hit.at < ttlMs) {
            remember(key, hit);
            res.set('X-QIS-Cache', 'HIT');
            res.set('Cache-Control', 'private, no-cache');
            return res.status(200).type('application/json').send(hit.body);
        }

        const originalJson = res.json.bind(res);
        res.json = (payload) => {
            res.json = originalJson;
            if (res.statusCode === 200) {
                try {
                    const body = JSON.stringify(payload);
                    if (body !== undefined && Buffer.byteLength(body) <= MAX_BODY_BYTES) {
                        // `version` was read BEFORE the query ran: if an import committed meanwhile
                        // the entry is already stale and the next request recomputes it.
                        remember(key, { version, at: Date.now(), body });
                    }
                } catch { /* uncacheable payload: serve it normally */ }
            }
            res.set('X-QIS-Cache', 'MISS');
            res.set('Cache-Control', 'private, no-cache');
            return originalJson(payload);
        };
        return next();
    };
}

function clearResponseCache() {
    store.clear();
    fingerprintValue = null;
    fingerprintAt = 0;
}

// Test hook: forget the memoized fingerprint (entries stay) so the next request re-reads it.
function expireFingerprintMemo() {
    fingerprintValue = null;
    fingerprintAt = 0;
}

module.exports = { cachedRead, clearResponseCache, computeFingerprint, expireFingerprintMemo };
