/**
 * importSession — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Server-side preview cache. Confirm never trusts client-echoed parsed
 * data — it only receives a session_token and re-reads the cached,
 * server-computed classification from network_import_session.
 */

'use strict';

const crypto = require('crypto');
const { run, get } = require('../../config/db');

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function createSession({ module, fileName, fingerprint, parsedPayload, createdBy }) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    await run(
        `INSERT INTO network_import_session (module, session_token, file_name, file_fingerprint, parsed_payload, created_by, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [module, token, fileName, fingerprint, JSON.stringify(parsedPayload), createdBy || null, expiresAt],
    );

    return token;
}

async function getSession(token) {
    const row = await get('SELECT * FROM network_import_session WHERE session_token = ?', [token]);
    if (!row) return null;

    if (new Date(row.expires_at).getTime() < Date.now()) {
        await run('DELETE FROM network_import_session WHERE id = ?', [row.id]);
        return null;
    }

    return { ...row, parsed_payload: JSON.parse(row.parsed_payload) };
}

async function deleteSession(token) {
    await run('DELETE FROM network_import_session WHERE session_token = ?', [token]);
}

module.exports = { createSession, getSession, deleteSession, SESSION_TTL_MS };
