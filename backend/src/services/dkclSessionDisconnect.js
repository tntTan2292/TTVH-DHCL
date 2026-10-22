'use strict';

/**
 * IMPORT-SESSION-01 -- "disconnected by the user" marker and saved-cookie wipe for the DKCL sessions.
 *
 * Closing the browser window is not enough to end a DKCL session: the cookies stay in the browser profile, and the
 * keep-alive and the scheduler reopen a window from them (reattachSession). A person who has just changed the account
 * password needs the old session gone and a fresh sign-in, so a disconnect (1) wipes the cookies saved in the profile
 * and (2) leaves a marker per source that stops every automatic reattach until the person signs in again. The marker is
 * a small file, so a backend restart does not bring the old session back.
 */

const fs = require('fs');
const path = require('path');

const FLAG_FILE = 'session-disconnected.json';
const SOURCES = ['HUE', 'TCT'];

// Chromium keeps cookies here (the first path is current Chromium, the second an older layout).
const COOKIE_FILES = [
    ['Default', 'Network', 'Cookies'],
    ['Default', 'Network', 'Cookies-journal'],
    ['Default', 'Cookies'],
    ['Default', 'Cookies-journal']
];

function defaultFlagDir() {
    return path.resolve(__dirname, '../../../Data DKCL/BrowserProfiles');
}

class DkclDisconnectFlags {
    constructor({ dir = null, fsImpl = fs, clock = () => new Date() } = {}) {
        this.dir = dir || defaultFlagDir();
        this.fs = fsImpl;
        this.clock = clock;
    }

    filePath() {
        return path.join(this.dir, FLAG_FILE);
    }

    read() {
        try {
            const parsed = JSON.parse(this.fs.readFileSync(this.filePath(), 'utf8'));
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    /** ISO time the source was disconnected, or null when it is not. */
    get(source) {
        const value = this.read()[String(source || '').toUpperCase()];
        return typeof value === 'string' && value ? value : null;
    }

    isSet(source) {
        return this.get(source) !== null;
    }

    set(source) {
        const data = this.read();
        data[String(source).toUpperCase()] = this.clock().toISOString();
        this.write(data);
    }

    clear(source) {
        const data = this.read();
        const key = String(source).toUpperCase();
        if (!(key in data)) return;
        delete data[key];
        this.write(data);
    }

    write(data) {
        try {
            this.fs.mkdirSync(this.dir, { recursive: true });
            this.fs.writeFileSync(this.filePath(), JSON.stringify(data));
        } catch (_) { /* the in-process state still holds; a failed write only loses restart persistence */ }
    }
}

/** Deletes the cookie files of a browser profile that no process is using. Resolves the names of the files removed. */
function clearProfileCookies(profileDir, fsImpl = fs) {
    const removed = [];
    if (!profileDir) return removed;
    for (const parts of COOKIE_FILES) {
        const target = path.join(profileDir, ...parts);
        try {
            if (fsImpl.existsSync(target)) {
                fsImpl.rmSync(target, { force: true });
                removed.push(parts.join('/'));
            }
        } catch (_) { /* a locked file is reported by the caller through the shorter list */ }
    }
    return removed;
}

module.exports = { DkclDisconnectFlags, clearProfileCookies, FLAG_FILE, SOURCES };
