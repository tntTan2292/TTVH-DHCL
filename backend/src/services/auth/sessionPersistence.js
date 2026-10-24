'use strict';

const { run, all } = require('../../config/db');
const userStore = require('./userStore');

// SQLite adapter for AuthSessionStore (RBAC-01). Table: qis_session.
module.exports = {
    async insert(sessionHash, userId, createdAt, expiresAt) {
        await run(
            'INSERT OR REPLACE INTO qis_session (session_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
            [sessionHash, userId, createdAt, expiresAt, createdAt],
        );
    },
    async remove(sessionHash) {
        await run('DELETE FROM qis_session WHERE session_hash = ?', [sessionHash]);
    },
    async removeForUser(userId, keepHash = null) {
        if (keepHash) await run('DELETE FROM qis_session WHERE user_id = ? AND session_hash <> ?', [userId, keepHash]);
        else await run('DELETE FROM qis_session WHERE user_id = ?', [userId]);
    },
    async loadAll() {
        await run('DELETE FROM qis_session WHERE expires_at <= ?', [Date.now()]);
        const rows = await all(
            `SELECT s.session_hash, s.user_id, s.created_at, s.expires_at, u.is_active
               FROM qis_session s JOIN qis_user u ON u.id = s.user_id`,
        );
        const out = [];
        for (const row of rows) {
            if (!row.is_active) continue;
            const stored = await userStore.findById(row.user_id);
            out.push({
                sessionHash: row.session_hash,
                createdAt: row.created_at,
                expiresAt: row.expires_at,
                user: stored ? await userStore.toSessionUser(stored) : null,
            });
        }
        return out;
    },
};
