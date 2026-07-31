'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_STORE_PATH = path.resolve(__dirname, '../../../Data DKCL/Runtime/dkcl-session-coordinator.json');

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function atomicWriteJson(filePath, payload) {
    ensureParentDir(filePath);
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, filePath);
}

class DkclSessionStore {
    constructor(options = {}) {
        this.filePath = options.filePath || process.env.DKCL_SESSION_STORE_PATH || DEFAULT_STORE_PATH;
        this.fs = options.fs || fs;
    }

    readState() {
        try {
            if (!this.fs.existsSync(this.filePath)) {
                return { version: 1, sessions: {} };
            }
            const raw = this.fs.readFileSync(this.filePath, 'utf8');
            const parsed = JSON.parse(raw);
            return {
                version: 1,
                sessions: parsed && typeof parsed.sessions === 'object' ? parsed.sessions : {}
            };
        } catch (_) {
            return { version: 1, sessions: {} };
        }
    }

    writeState(state) {
        atomicWriteJson(this.filePath, {
            version: 1,
            sessions: state && typeof state.sessions === 'object' ? state.sessions : {}
        });
    }

    getSession(source) {
        const state = this.readState();
        return state.sessions[String(source || '').toUpperCase()] || null;
    }

    upsertSession(source, patch) {
        const normalizedSource = String(source || '').toUpperCase();
        const state = this.readState();
        const current = state.sessions[normalizedSource] || null;
        const next = {
            source: normalizedSource,
            ...(current || {}),
            ...(patch || {})
        };
        state.sessions[normalizedSource] = next;
        this.writeState(state);
        return next;
    }

    removeSession(source) {
        const normalizedSource = String(source || '').toUpperCase();
        const state = this.readState();
        delete state.sessions[normalizedSource];
        this.writeState(state);
    }

    clearAll() {
        this.writeState({ version: 1, sessions: {} });
    }
}

module.exports = {
    DkclSessionStore,
    DEFAULT_STORE_PATH
};
