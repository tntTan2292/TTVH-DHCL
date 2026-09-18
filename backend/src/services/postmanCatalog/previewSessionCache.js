/**
 * previewSessionCache — F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1.
 *
 * In-process, in-memory TTL cache for the Preview -> Confirm handoff.
 * Deliberately NOT network_import_session (its `module` CHECK constraint
 * excludes this feature, per the migration's header note) and deliberately
 * NOT written to disk: the parsed rows briefly held here carry personal
 * names, so they live only in process memory for a short TTL and are
 * dropped on Confirm/expiry — never archived, unlike the network map's
 * business-data files.
 */

'use strict';

const crypto = require('crypto');

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes — short-lived by design (§8)
const sessions = new Map();

function createSession({ fileName, fileFingerprint, records }) {
    const token = crypto.randomUUID();
    sessions.set(token, {
        fileName, fileFingerprint, records, expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return token;
}

function getSession(token) {
    const session = sessions.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
        sessions.delete(token);
        return null;
    }
    return session;
}

function deleteSession(token) {
    sessions.delete(token);
}

module.exports = {
    createSession, getSession, deleteSession, SESSION_TTL_MS,
};
