'use strict';

/**
 * AUTO-IMPORT-SCHEDULE-01 -- scheduled automatic import with hourly retries.
 *
 * The DKCL sign-in goes through portal.vnpost.vn with a captcha, so it stays a human step (the existing login window).
 * The scheduler therefore never signs in; it uses whatever session is valid.
 *
 * At each configured time of day (Vietnam time, default 07:30) it starts a cycle. One attempt of a cycle, per lane
 * (HUE, TCT; AUTO_IMPORT_SCHEDULE_LANES):
 *   1. checks the DKCL session (preflight); no valid session -> the lane is a failure of this attempt;
 *   2. creates one ordinary Auto Backfill run for the lane (every ACTIVE indicator: the missing days, the newest day
 *      included, plus the 3-day refresh window), requested by the user "scheduler".
 * When the runs of the attempt have ended, the attempt is a success only if every lane had a valid session and its run
 * COMPLETED without a failed job (or had nothing to import). Otherwise the next attempt starts one hour after the
 * previous one began (AUTO_IMPORT_SCHEDULE_RETRY_MS), until everything succeeds or AUTO_IMPORT_SCHEDULE_MAX_ATTEMPTS
 * (default 16) is reached. Because a failed day stays missing / not refreshed, each retry plans exactly what is left.
 *
 * A day that failed and is older than the new day plus the refresh window (AUTO_IMPORT_SCHEDULE_RECENT_DAYS, default 4
 * days before the run's business date) is an old gap the person handles by hand: it is still tried by the run, but its
 * failure does not make the attempt a failure, so it cannot keep the schedule retrying all day.
 *
 * Off unless AUTO_IMPORT_SCHEDULE_ENABLED=true. A time missed because the backend was down starts its cycle once at
 * start-up if it is less than AUTO_IMPORT_SCHEDULE_CATCHUP_MS late (default 3 h). The cycle state is saved, so a restart
 * neither repeats a slot nor forgets a pending retry.
 */

const fs = require('fs');
const path = require('path');
const { formatDateInTimezone } = require('./autoBackfillBusinessCalendar');

const ALL_LANES = ['HUE', 'TCT'];
const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';
const TERMINAL_RUN_STATUSES = new Set(['COMPLETED', 'COMPLETED_WITH_ERRORS', 'CANCELLED', 'FAILED']);

function parseTimes(text) {
    const values = String(text || '07:30').split(',').map((item) => item.trim()).filter(Boolean);
    const times = [];
    for (const value of values) {
        const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
        if (match) times.push(`${match[1].padStart(2, '0')}:${match[2]}`);
    }
    return [...new Set(times)].sort();
}

function parseLanes(text) {
    const lanes = String(text || ALL_LANES.join(',')).split(',').map((item) => item.trim().toUpperCase()).filter((lane) => ALL_LANES.includes(lane));
    return lanes.length > 0 ? [...new Set(lanes)] : [...ALL_LANES];
}

function vietnamClock(date) {
    const day = formatDateInTimezone(date, BUSINESS_TIMEZONE);
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { day, minutes: Number(values.hour) * 60 + Number(values.minute) };
}

class AutoImportScheduler {
    constructor({
        queueService,
        sessionService,
        env = process.env,
        fsImpl = fs,
        clock = () => new Date(),
        setTimer = setInterval,
        clearTimer = clearInterval,
        stateDir = null,
        logger = console,
    } = {}) {
        this.queueService = queueService;
        this.sessionService = sessionService;
        this.env = env;
        this.fs = fsImpl;
        this.clock = clock;
        this.setTimer = setTimer;
        this.clearTimer = clearTimer;
        this.logger = logger;
        this.stateDir = stateDir || path.resolve(__dirname, '../../../Data DKCL/BrowserProfiles');
        this.timer = null;
        this.busy = false;
    }

    isEnabled() {
        return String(this.env.AUTO_IMPORT_SCHEDULE_ENABLED || '').toLowerCase() === 'true';
    }

    times() { return parseTimes(this.env.AUTO_IMPORT_SCHEDULE_TIMES); }

    lanes() { return parseLanes(this.env.AUTO_IMPORT_SCHEDULE_LANES); }

    number(name, fallback) {
        const value = Number(this.env[name]);
        return Number.isFinite(value) && value >= 0 ? value : fallback;
    }

    catchupMs() { return this.number('AUTO_IMPORT_SCHEDULE_CATCHUP_MS', 3 * 60 * 60 * 1000); }

    retryMs() { return this.number('AUTO_IMPORT_SCHEDULE_RETRY_MS', 60 * 60 * 1000); }

    recentDays() { return Math.floor(this.number('AUTO_IMPORT_SCHEDULE_RECENT_DAYS', 4)); }

    maxAttempts() { return Math.max(1, Math.floor(this.number('AUTO_IMPORT_SCHEDULE_MAX_ATTEMPTS', 16))); }

    statePath() { return path.join(this.stateDir, 'auto-import-schedule.json'); }

    readState() {
        try {
            const parsed = JSON.parse(this.fs.readFileSync(this.statePath(), 'utf8'));
            return parsed && typeof parsed === 'object' ? { fired: parsed.fired || {}, cycle: parsed.cycle || null } : { fired: {}, cycle: null };
        } catch (_) {
            return { fired: {}, cycle: null };
        }
    }

    writeState(state) {
        try {
            this.fs.mkdirSync(this.stateDir, { recursive: true });
            this.fs.writeFileSync(this.statePath(), JSON.stringify(state));
        } catch (error) {
            this.logger.warn?.(`[AUTO-IMPORT-SCHEDULE] cannot save state: ${error.message}`);
        }
    }

    start({ intervalMs = 30000 } = {}) {
        if (!this.isEnabled()) {
            this.logger.log?.('[AUTO-IMPORT-SCHEDULE] disabled (set AUTO_IMPORT_SCHEDULE_ENABLED=true to enable).');
            return this;
        }
        if (this.timer) return this;
        this.logger.log?.(`[AUTO-IMPORT-SCHEDULE] enabled at ${this.times().join(', ')} (Vietnam time), lanes ${this.lanes().join('+')}, retry every ${Math.round(this.retryMs() / 60000)} min.`);
        this.timer = this.setTimer(() => { void this.tick().catch((error) => this.logger.error?.(`[AUTO-IMPORT-SCHEDULE] tick failed: ${error.message}`)); }, intervalMs);
        this.timer.unref?.();
        void this.tick().catch(() => {});
        return this;
    }

    stop() {
        if (this.timer) this.clearTimer(this.timer);
        this.timer = null;
    }

    /** The slot that is due now (and not yet started today), or null. */
    dueSlot(now = this.clock(), state = this.readState()) {
        const { day, minutes } = vietnamClock(now);
        for (const time of this.times()) {
            const [hour, minute] = time.split(':').map(Number);
            const lateMs = (minutes - (hour * 60 + minute)) * 60000;
            if (lateMs < 0 || lateMs > this.catchupMs()) continue;
            if (state.fired[time] === day) continue;
            return { day, time };
        }
        return null;
    }

    async tick() {
        if (this.busy || !this.isEnabled()) return null;
        this.busy = true;
        try {
            const now = this.clock();
            const state = this.readState();
            const { day } = vietnamClock(now);

            // A new slot starts a new cycle (saved before any work, so a restart never repeats it).
            const slot = this.dueSlot(now, state);
            if (slot) {
                state.fired[slot.time] = slot.day;
                state.cycle = { day, slot: slot.time, attempts: 0, done: false, nextAttemptAt: now.getTime(), attempt: null, lastSummary: null };
                this.writeState(state);
            }

            const cycle = state.cycle;
            if (!cycle || cycle.done || cycle.day !== day) return null;

            if (cycle.attempt) {
                return this.finishAttemptIfReady(state, now);
            }
            if (now.getTime() < cycle.nextAttemptAt) return null;
            if (cycle.attempts >= this.maxAttempts()) {
                cycle.done = true;
                cycle.lastSummary = `gave up after ${cycle.attempts} attempts`;
                this.writeState(state);
                this.logger.warn?.(`[AUTO-IMPORT-SCHEDULE] ${cycle.lastSummary}; the manual path stays available.`);
                return null;
            }
            return this.startAttempt(state, now);
        } finally {
            this.busy = false;
        }
    }

    async startAttempt(state, now) {
        const cycle = state.cycle;
        cycle.attempts += 1;
        cycle.attempt = { startedAt: now.getTime(), lanes: {} };
        this.writeState(state); // the attempt is on record before it runs
        const label = `slot ${cycle.slot} attempt ${cycle.attempts}`;
        for (const lane of this.lanes()) {
            cycle.attempt.lanes[lane] = await this.runLane(lane);
        }
        this.writeState(state);
        this.logger.log?.(`[AUTO-IMPORT-SCHEDULE] ${label}: ${this.lanes().map((lane) => `${lane}=${cycle.attempt.lanes[lane].outcome}`).join(', ')}`);
        return { label, lanes: cycle.attempt.lanes };
    }

    /** Waits for the attempt's runs to end, then decides: done, or retry in one hour. */
    async finishAttemptIfReady(state, now) {
        const cycle = state.cycle;
        const attempt = cycle.attempt;
        const results = {};
        let pending = false;
        for (const lane of this.lanes()) {
            const entry = attempt.lanes[lane] || { outcome: 'FAILED' };
            if (entry.runId) {
                const status = await this.runStatus(entry.runId);
                if (!TERMINAL_RUN_STATUSES.has(status)) { pending = true; continue; }
                results[lane] = status === 'COMPLETED' ? 'OK' : `RUN_${status}`;
                if (status === 'COMPLETED_WITH_ERRORS') {
                    const ignored = await this.oldFailuresOnly(entry.runId);
                    if (ignored) {
                        results[lane] = 'OK';
                        this.logger.warn?.(`[AUTO-IMPORT-SCHEDULE][${lane}] ignoring failed old day(s) for the retry decision: ${ignored.join(', ')}`);
                    }
                }
            } else {
                results[lane] = entry.outcome === 'NOTHING_TO_IMPORT' ? 'OK' : entry.outcome;
            }
        }
        const timedOut = now.getTime() - attempt.startedAt >= this.retryMs();
        if (pending && !timedOut) return null; // runs still working: look again on the next tick

        const failed = this.lanes().filter((lane) => results[lane] !== 'OK');
        cycle.attempt = null;
        if (failed.length === 0 && !pending) {
            cycle.done = true;
            cycle.lastSummary = `all lanes imported after ${cycle.attempts} attempt(s)`;
            this.logger.log?.(`[AUTO-IMPORT-SCHEDULE] slot ${cycle.slot}: ${cycle.lastSummary}.`);
        } else {
            cycle.nextAttemptAt = attempt.startedAt + this.retryMs();
            const detail = this.lanes().map((lane) => `${lane}=${results[lane] || 'STILL_RUNNING'}`).join(', ');
            cycle.lastSummary = `retry needed (${detail})`;
            this.logger.warn?.(`[AUTO-IMPORT-SCHEDULE] slot ${cycle.slot} attempt ${cycle.attempts}: ${cycle.lastSummary}; next attempt at ${new Date(cycle.nextAttemptAt).toISOString()}.`);
        }
        this.writeState(state);
        return { done: cycle.done, results };
    }

    async runStatus(runId) {
        try {
            const result = await this.queueService.store.getRun(runId);
            return result?.run?.status || 'UNKNOWN';
        } catch (_) {
            return 'UNKNOWN';
        }
    }

    /**
     * For a run that ended with errors: the failed days (as "indicator/lane/date") when EVERY failure is older than the
     * recent days, else null. Unknown detail counts as a real failure.
     */
    async oldFailuresOnly(runId) {
        try {
            const detail = await this.queueService.store.getRun(runId);
            const asOf = detail?.run?.as_of_business_date;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOf || '')) || !Array.isArray(detail.jobs)) return null;
            const cutoff = new Date(`${asOf}T00:00:00Z`);
            cutoff.setUTCDate(cutoff.getUTCDate() - this.recentDays());
            const cutoffDay = cutoff.toISOString().slice(0, 10);
            const bad = detail.jobs.filter((job) => !['SUCCESS', 'SKIPPED_ALREADY_SUCCESS'].includes(job.state));
            if (bad.length === 0) return null;
            if (!bad.every((job) => job.state === 'FAILED_TERMINAL' && job.business_date < cutoffDay)) return null;
            return bad.map((job) => `${job.indicator}/${job.source_lane}/${job.business_date}`);
        } catch (_) {
            return null;
        }
    }

    async runLane(lane) {
        try {
            // a restart loses the browser window but not the saved session: reopen it first (never signs in)
            if (typeof this.sessionService.reattachSession === 'function') await this.sessionService.reattachSession(lane);
            const result = await this.sessionService.preflight(lane);
            if (result?.status !== 'SESSION_VALID') {
                return { outcome: 'NEEDS_MANUAL_LOGIN', reason: result?.status || 'UNKNOWN' };
            }
            const created = await this.queueService.createRun({ lane, actor: 'scheduler', roles: ['admin'] });
            return {
                outcome: created?.creation?.created === false ? 'RUN_ALREADY_OPEN' : 'RUN_CREATED',
                runId: created?.run?.id || null,
                jobs: created?.jobs?.length ?? null,
            };
        } catch (error) {
            if (error?.code === 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE') return { outcome: 'NOTHING_TO_IMPORT' };
            this.logger.warn?.(`[AUTO-IMPORT-SCHEDULE][${lane}] ${error?.code || 'ERROR'}: ${error?.message}`);
            return { outcome: 'FAILED', reason: error?.code || 'ERROR' };
        }
    }
}

module.exports = { AutoImportScheduler, parseTimes, parseLanes, vietnamClock };
