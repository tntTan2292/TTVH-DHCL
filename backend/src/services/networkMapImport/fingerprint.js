/**
 * fingerprint — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Shared rule across all 3 modules: a file is rejected only if the exact
 * same bytes (fingerprint) were already logged SUCCESS for that module.
 * A same-month, edited (different-fingerprint) tuyến-phát file is allowed,
 * per the locked design — no per-module special-casing needed here.
 */

'use strict';

const crypto = require('crypto');
const { get } = require('../../config/db');

function computeFingerprint(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function isFingerprintAlreadyImported(module, fingerprint) {
    const row = await get(
        "SELECT id FROM network_import_log WHERE module = ? AND file_fingerprint = ? AND status = 'SUCCESS'",
        [module, fingerprint],
    );
    return Boolean(row);
}

module.exports = { computeFingerprint, isFingerprintAlreadyImported };
