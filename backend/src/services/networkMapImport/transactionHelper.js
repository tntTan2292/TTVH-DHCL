/**
 * transactionHelper — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Mirrors the BEGIN/COMMIT/ROLLBACK pattern already used by
 * backend/src/services/importProcessor.js: run a callback inside a single
 * transaction, ROLLBACK and re-throw on any failure so Confirm never
 * leaves a partial write.
 */

'use strict';

const { run } = require('../../config/db');

async function withTransaction(fn) {
    await run('BEGIN TRANSACTION');
    try {
        const result = await fn(run);
        await run('COMMIT');
        return result;
    } catch (error) {
        try {
            await run('ROLLBACK');
        } catch {
            // ROLLBACK itself failing must not mask the original error.
        }
        throw error;
    }
}

module.exports = { withTransaction };
