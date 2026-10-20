'use strict';

/**
 * AUTO-IMPORT-SCHEDULE-01 -- DKCL session keep-alive and expiry measurement.
 *
 * Every DKCL_KEEPALIVE_INTERVAL_MS (default 10 min) it asks the session service to re-check each source that has a live
 * browser session (preflight on a live client probes the real portal page, which keeps an idle-timeout session
 * active). It never signs in, never opens a browser, and leaves a source with no live session alone.
 *
 * Every change of a source's status is appended to Data DKCL/BrowserProfiles/session-watch.log together with how long the
 * session had been valid, so the real lifetime of a DKCL session (idle timeout or fixed time) can be read from facts
 * instead of guessed. On by default; DKCL_KEEPALIVE_ENABLED=false turns it off.
 */

const fs = require('fs');
const path = require('path');

const SOURCES = ['HUE', 'TCT'];

function formatDuration(ms) {
    const minutes = Math.round(ms / 60000);
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`;
}

class DkclSessionKeepAlive {
    constructor({
        sessionService,
        env = process.env,
        fsImpl = fs,
        clock = () => Date.now(),
        setTimer = setInterval,
        clearTimer = clearInterval,
        logDir = null,
        logger = console,
    } = {}) {
        this.sessionService = sessionService;
        this.env = env;
        this.fs = fsImpl;
        this.clock = clock;
        this.setTimer = setTimer;
        this.clearTimer = clearTimer;
        this.logDir = logDir || path.resolve(__dirname, '../../../Data DKCL/BrowserProfiles');
        this.logger = logger;
        this.timer = null;
        this.busy = false;
        this.last = new Map(); // source -> { status, since }
        this.reattachFailedAt = new Map(); // source -> time of the last reattach that found nothing to reattach
    }

    reattachCooldownMs() {
        const value = Number(this.env.DKCL_REATTACH_COOLDOWN_MS);
        return Number.isFinite(value) && value >= 0 ? value : 30 * 60 * 1000;
    }

    isEnabled() {
        return String(this.env.DKCL_KEEPALIVE_ENABLED ?? 'true').toLowerCase() !== 'false';
    }

    intervalMs() {
        const value = Number(this.env.DKCL_KEEPALIVE_INTERVAL_MS);
        return Number.isFinite(value) && value >= 1000 ? value : 10 * 60 * 1000;
    }

    start({ firstTickMs = 30000 } = {}) {
        if (!this.isEnabled() || this.timer) return this;
        this.logger.log?.(`[DKCL-KEEPALIVE] every ${Math.round(this.intervalMs() / 60000)} min; reopens the browser window of a source whose saved session is still valid.`);
        this.timer = this.setTimer(() => { void this.tick().catch(() => {}); }, this.intervalMs());
        this.timer.unref?.();
        // soon after start-up, so the windows lost by a restart are back before anyone needs them
        const first = setTimeout(() => { void this.tick().catch(() => {}); }, firstTickMs);
        first.unref?.();
        this.firstTimer = first;
        return this;
    }

    stop() {
        if (this.timer) this.clearTimer(this.timer);
        if (this.firstTimer) clearTimeout(this.firstTimer);
        this.timer = null;
        this.firstTimer = null;
    }

    async tick() {
        if (this.busy) return [];
        this.busy = true;
        const changes = [];
        try {
            for (const source of SOURCES) {
                let status;
                try {
                    let client = this.sessionService.getInteractiveClient(source);
                    if (!client) client = await this.tryReattach(source);
                    status = client ? (await this.sessionService.preflight(source))?.status || 'UNKNOWN' : 'NO_SESSION';
                } catch (error) {
                    status = `CHECK_ERROR_${error?.code || 'UNKNOWN'}`;
                }
                const change = this.note(source, status);
                if (change) changes.push(change);
            }
        } finally {
            this.busy = false;
        }
        return changes;
    }

    /** Reopens the window of a source whose saved session is still valid; a failure waits out a cooldown. */
    async tryReattach(source) {
        if (typeof this.sessionService.reattachSession !== 'function') return null;
        const failedAt = this.reattachFailedAt.get(source);
        if (failedAt && this.clock() - failedAt < this.reattachCooldownMs()) return null;
        const result = await this.sessionService.reattachSession(source);
        if (!result.attached) {
            // a person is signing in, or there is no valid saved session: wait before looking again
            this.reattachFailedAt.set(source, this.clock());
            return null;
        }
        this.reattachFailedAt.delete(source);
        this.append(`${new Date(this.clock()).toISOString()} ${source} window reopened from the saved session (${result.reason})`);
        return this.sessionService.getInteractiveClient(source);
    }

    /** Records a status; returns the log line when the status changed. */
    note(source, status) {
        const now = this.clock();
        const previous = this.last.get(source);
        if (previous && previous.status === status) return null;
        const wasValid = previous?.status === 'SESSION_VALID';
        this.last.set(source, { status, since: now });
        if (!previous) {
            this.append(`${new Date(now).toISOString()} ${source} first seen as ${status}`);
            return `${source} ${status}`;
        }
        const detail = wasValid ? ` (was valid for ${formatDuration(now - previous.since)})` : '';
        const line = `${new Date(now).toISOString()} ${source} ${previous.status} -> ${status}${detail}`;
        this.append(line);
        return line;
    }

    append(line) {
        this.logger.log?.(`[DKCL-KEEPALIVE] ${line}`);
        try {
            this.fs.mkdirSync(this.logDir, { recursive: true });
            this.fs.appendFileSync(path.join(this.logDir, 'session-watch.log'), `${line}\n`);
        } catch (_) { /* measuring only: never disturb the system */ }
    }
}

module.exports = { DkclSessionKeepAlive, formatDuration };
