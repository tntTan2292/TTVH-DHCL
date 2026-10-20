'use strict';

/**
 * AUTO-LOGIN-01 -- unattended DKCL sign-in, HUE first then TCT (PO decision 2026-10-20: allowed, the portal has no
 * CAPTCHA). It never replaces the manual path: it is one attempt made on the interactive client just before the
 * client starts waiting for a human, and any failure leaves everything exactly as it is today (the window stays open for
 * a manual login).
 *
 * Safety rules, all enforced here:
 * - off unless DKCL_AUTO_LOGIN_<SOURCE>_ENABLED=true, per source;
 * - at most one attempt per DKCL_AUTO_LOGIN_MIN_INTERVAL_MS (default 30 min) per source;
 * - after DKCL_AUTO_LOGIN_MAX_FAILURES (default 2) failed attempts in a row it stops trying until a login succeeds
 *   (manual or automatic), so a wrong password can never lock the account;
 * - the attempt counters survive a backend restart (small JSON state file), so a restart loop cannot repeat attempts;
 * - credentials come only from the local .env, are never logged, and a CAPTCHA / OTP page is never worked around.
 */

const fs = require('fs');
const path = require('path');

const CREDENTIAL_ENV = Object.freeze({
    HUE: { username: 'PORTAL_HUE_USERNAME', password: 'PORTAL_HUE_PASSWORD', hrmCode: 'PORTAL_HUE_HRM_CODE', hrmRequired: true },
    TCT: { username: 'PORTAL_NATIONAL_USERNAME', password: 'PORTAL_NATIONAL_PASSWORD', hrmCode: 'PORTAL_NATIONAL_HRM_CODE', hrmRequired: false },
});

const DEFAULT_MIN_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_FAILURES = 2;

function normalizeSource(source) {
    return String(source || '').trim().toUpperCase();
}

class DkclAutoLoginService {
    constructor({
        env = process.env,
        fsImpl = fs,
        clock = () => Date.now(),
        stateDir = null,
        logger = console,
    } = {}) {
        this.env = env;
        this.fs = fsImpl;
        this.clock = clock;
        this.stateDir = stateDir;
        this.logger = logger;
    }

    isEnabled(source) {
        const key = normalizeSource(source);
        return Boolean(CREDENTIAL_ENV[key]) && String(this.env[`DKCL_AUTO_LOGIN_${key}_ENABLED`] || '').toLowerCase() === 'true';
    }

    minIntervalMs() {
        const value = Number(this.env.DKCL_AUTO_LOGIN_MIN_INTERVAL_MS);
        return Number.isFinite(value) && value >= 0 ? value : DEFAULT_MIN_INTERVAL_MS;
    }

    maxFailures() {
        const value = Number(this.env.DKCL_AUTO_LOGIN_MAX_FAILURES);
        return Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_FAILURES;
    }

    /** Credentials for a source, or null when something required is missing. Values are never returned to a log. */
    credentialsFor(source) {
        const names = CREDENTIAL_ENV[normalizeSource(source)];
        if (!names) return null;
        const username = this.env[names.username];
        const password = this.env[names.password];
        const hrmCode = this.env[names.hrmCode] || null;
        if (!username || !password) return null;
        if (names.hrmRequired && !hrmCode) return null;
        return { username, password, hrmCode };
    }

    statePath(source) {
        const dir = this.stateDir || path.resolve(__dirname, '../../../Data DKCL/BrowserProfiles');
        return path.join(dir, `${normalizeSource(source)}.autologin.json`);
    }

    readState(source) {
        try {
            const parsed = JSON.parse(this.fs.readFileSync(this.statePath(source), 'utf8'));
            return {
                lastAttemptAt: Number(parsed.lastAttemptAt) || 0,
                consecutiveFailures: Number(parsed.consecutiveFailures) || 0,
                lastReason: parsed.lastReason || null,
            };
        } catch (_) {
            return { lastAttemptAt: 0, consecutiveFailures: 0, lastReason: null };
        }
    }

    writeState(source, state) {
        try {
            this.fs.mkdirSync(path.dirname(this.statePath(source)), { recursive: true });
            this.fs.writeFileSync(this.statePath(source), JSON.stringify(state));
        } catch (error) {
            this.logger.warn?.(`[AUTO-LOGIN][${normalizeSource(source)}] cannot save attempt state: ${error.message}`);
        }
    }

    /** Whether an attempt may be made now, and why not. */
    check(source) {
        const key = normalizeSource(source);
        if (!this.isEnabled(key)) return { allowed: false, reason: 'DISABLED' };
        if (!this.credentialsFor(key)) return { allowed: false, reason: 'CREDENTIALS_MISSING' };
        const state = this.readState(key);
        if (state.consecutiveFailures >= this.maxFailures()) return { allowed: false, reason: 'TOO_MANY_FAILURES' };
        if (state.lastAttemptAt && this.clock() - state.lastAttemptAt < this.minIntervalMs()) return { allowed: false, reason: 'TOO_SOON' };
        return { allowed: true, reason: null };
    }

    /** A login worked (automatic or manual): the failure streak ends. */
    recordSuccess(source) {
        const key = normalizeSource(source);
        const state = this.readState(key);
        if (state.consecutiveFailures !== 0) this.writeState(key, { ...state, consecutiveFailures: 0, lastReason: null });
    }

    /**
     * One automatic attempt on an interactive client that is showing the login page. Always resolves: the caller
     * keeps waiting for a manual login when `authenticated` is false.
     */
    async attempt(source, client) {
        const key = normalizeSource(source);
        const gate = this.check(key);
        if (!gate.allowed) return { attempted: false, authenticated: false, reason: gate.reason };
        if (typeof client?.tryAutomatedLogin !== 'function') return { attempted: false, authenticated: false, reason: 'CLIENT_UNSUPPORTED' };

        const state = this.readState(key);
        // The attempt is recorded first: a crash in the middle still counts, so a crash loop cannot hammer the portal.
        this.writeState(key, { ...state, lastAttemptAt: this.clock(), consecutiveFailures: state.consecutiveFailures + 1, lastReason: 'IN_PROGRESS' });
        let result;
        try {
            result = await client.tryAutomatedLogin(this.credentialsFor(key));
        } catch (error) {
            result = { authenticated: false, reason: error?.code || 'ATTEMPT_ERROR' };
        }
        if (result?.authenticated) {
            this.writeState(key, { lastAttemptAt: this.clock(), consecutiveFailures: 0, lastReason: null });
            this.logger.log?.(`[AUTO-LOGIN][${key}] signed in automatically (${result.reason || 'OK'}).`);
            return { attempted: true, authenticated: true, reason: result.reason || 'OK' };
        }
        this.writeState(key, { lastAttemptAt: this.clock(), consecutiveFailures: state.consecutiveFailures + 1, lastReason: result?.reason || 'FAILED' });
        this.logger.warn?.(`[AUTO-LOGIN][${key}] automatic sign-in did not complete (${result?.reason || 'FAILED'}); falling back to manual login.`);
        return { attempted: true, authenticated: false, reason: result?.reason || 'FAILED' };
    }
}

module.exports = { DkclAutoLoginService, CREDENTIAL_ENV, DEFAULT_MIN_INTERVAL_MS, DEFAULT_MAX_FAILURES };
