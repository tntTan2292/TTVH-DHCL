const crypto = require('crypto');

class AuthSessionStore {
    constructor() {
        this.sessions = new Map();
    }

    createSession(user) {
        const sessionId = crypto.randomUUID();
        const now = Date.now();
        this.sessions.set(sessionId, {
            user,
            createdAt: now,
            expiresAt: now + 12 * 60 * 60 * 1000,
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
}

module.exports = new AuthSessionStore();
