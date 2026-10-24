const crypto = require('crypto');

const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const hashSessionId = (sessionId) => crypto.createHash('sha256').update(String(sessionId)).digest('hex');

// RBAC-01: reads stay synchronous and in memory; when a persistence adapter is attached
// (server startup) every session of a stored user (user.id set) is also written to qis_session,
// keyed by the sha256 of the id, so sessions survive a backend restart. Sessions without a user.id
// (tests, legacy runtime users) stay memory-only.
class AuthSessionStore {
    constructor() {
        this.sessions = new Map();
        this.persistence = null;
    }

    attachPersistence(adapter) {
        this.persistence = adapter;
    }

    /** Called once at startup: user rows are rebuilt by the adapter so scope edits made while down apply. */
    async restore() {
        if (!this.persistence) return 0;
        const rows = await this.persistence.loadAll();
        let restored = 0;
        for (const row of rows) {
            if (row.expiresAt <= Date.now() || !row.user) continue;
            this.sessions.set(row.sessionHash, { user: row.user, createdAt: row.createdAt, expiresAt: row.expiresAt });
            restored += 1;
        }
        return restored;
    }

    keyFor(sessionId) {
        return this.persistence ? hashSessionId(sessionId) : String(sessionId);
    }

    createSession(user, options = {}) {
        const sessionId = crypto.randomUUID();
        const now = Date.now();
        const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : DEFAULT_SESSION_TTL_MS;
        const session = { user, createdAt: now, expiresAt: now + ttlMs };
        this.sessions.set(this.keyFor(sessionId), session);
        if (this.persistence && user?.id) {
            this.persistence.insert(hashSessionId(sessionId), user.id, session.createdAt, session.expiresAt)
                .catch((error) => console.warn('Auth session persist failed:', error.message));
        }
        return sessionId;
    }

    getSession(sessionId) {
        if (!sessionId) return null;
        const key = this.keyFor(sessionId);
        const session = this.sessions.get(key);
        if (!session) return null;
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(key);
            this.persistRemove(key);
            return null;
        }
        return session;
    }

    deleteSession(sessionId) {
        if (!sessionId) return;
        const key = this.keyFor(sessionId);
        this.sessions.delete(key);
        this.persistRemove(key);
    }

    /** Revoke every session of a user (password change, reset, deactivation, scope edit). */
    deleteSessionsForUser(userId, { exceptSessionId = null } = {}) {
        const keep = exceptSessionId ? this.keyFor(exceptSessionId) : null;
        for (const [key, session] of this.sessions) {
            if (session.user?.id === userId && key !== keep) this.sessions.delete(key);
        }
        if (this.persistence) {
            this.persistence.removeForUser(userId, keep)
                .catch((error) => console.warn('Auth session revoke failed:', error.message));
        }
    }

    persistRemove(key) {
        if (this.persistence) {
            this.persistence.remove(key).catch((error) => console.warn('Auth session remove failed:', error.message));
        }
    }

    clear() {
        this.sessions.clear();
    }
}

module.exports = new AuthSessionStore();
module.exports.hashSessionId = hashSessionId;
