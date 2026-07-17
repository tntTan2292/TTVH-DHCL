const crypto = require('crypto');

const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

class AuthSessionStore {
    constructor() {
        this.sessions = new Map();
    }

    createSession(user, options = {}) {
        const sessionId = crypto.randomUUID();
        const now = Date.now();
        const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : DEFAULT_SESSION_TTL_MS;
        this.sessions.set(sessionId, {
            user,
            createdAt: now,
            expiresAt: now + ttlMs,
        });
        return sessionId;
    }

    getSession(sessionId) {
        if (!sessionId) return null;
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(sessionId);
            return null;
        }
        return session;
    }

    deleteSession(sessionId) {
        if (sessionId) {
            this.sessions.delete(sessionId);
        }
    }

    clear() {
        this.sessions.clear();
    }
}

module.exports = new AuthSessionStore();
