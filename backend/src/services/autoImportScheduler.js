'use strict';

/**
 * AUTO-LOGIN-01 Part B -- scheduled automatic import (PO decision 2026-10-20: after the automatic sign-in works,
 * schedule the import).
 *
 * At each configured time of day (Vietnam time) it, for HUE and TCT separately:
 *   1. makes sure the DKCL session is valid (preflight; when it is not and automatic sign-in is allowed for that source,
 *      opens the interactive login, which makes its one rate-limited automatic attempt, and waits for the result);
 *   2. for a source with a valid session, creates one ordinary Auto Backfill run for that lane (every ACTIVE indicator:
 *      missing days plus the 3-day refresh window), requested by the user "scheduler" so the import log shows who.
 * A source that cannot sign in is skipped and reported; nothing is forced, the manual path stays available.
 *
 * Off unless AUTO_IMPORT_SCHEDULE_ENABLED=true. Times: AUTO_IMPORT_SCHEDULE_TIMES="08:30,13:00" (default 08:30).
 * A time missed because the backend was down runs once at start-up if it is less than
 * AUTO_IMPORT_SCHEDULE_CATCHUP_MS late (default 3 h). The fired slots are saved so a restart never repeats one.
 */

const fs = require('fs');
const path = require('path');
const { formatDateInTimezone } = require('./autoBackfillBusinessCalendar');

const SOURCES = ['HUE', 'TCT'];
const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

function parseTimes(text) {
    const values = String(text || '08:30').split(',').map((item) => item.trim()).filter(Boolean);
    const times = [];
    for (const value of values) {
        const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
        if (match) times.push(`${match[1].padStart(2, '0')}:${match[2]}`);
    }
    return [...new Set(times)].sort();
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
        autoLogin,
        env = process.env,
        fsImpl = fs,
        clock = () => new Date(),
        setTimer = setInterval,
        clearTimer = clearInterval,
        stateDir = null,
        logger = console,
        sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    } = {}) {
        this.queueService = queueService;
        this.sessionService = sessionService;
        this.autoLogin = autoLogin;
        this.env = env;
        this.fs = fsImpl;
        this.clock = clock;
        this.setTimer = setTimer;
        this.clearTimer = clearTimer;
        this.logger = logger;
        this.sleep = sleep;
        this.stateDir = stateDir || path.resolve(__dirname, '../../../Data DKCL/BrowserProfiles');
        this.timer = null;
        this.running = false;
        this.lastReport = null;
    }

    isEnabled() {
        return String(this.env.AUTO_IMPORT_SCHEDULE_ENABLED || '').toLowerCase() === 'true';
    }

    times() {
        return parseTimes(this.env.AUTO_IMPORT_SCHEDULE_TIMES);
    }

    catchupMs() {
        const value = Number(this.env.AUTO_IMPORT_SCHEDULE_CATCHUP_MS);
        return Number.isFinite(value) && value >= 0 ? value : 3 * 60 * 60 * 1000;
    }

    sessionWaitMs() {
        const value = Number(this.env.AUTO_IMPORT_SCHEDULE_SESSION_WAIT_MS);
        return Number.isFinite(value) && value >= 0 ? value : 5 * 60 * 1000;
    }

    statePath() {
        return path.join(this.stateDir, 'auto-import-schedule.json');
    }

    readFired() {
        try {
            const parsed = JSON.parse(this.fs.readFileSync(this.statePath(), 'utf8'));
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    writeFired(fired) {
        try {
            this.fs.mkdirSync(this.stateDir, { recursive: true });
            this.fs.writeFileSync(this.statePath(), JSON.stringify(fired));
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
        this.logger.log?.(`[AUTO-IMPORT-SCHEDULE] enabled at ${this.times().join(', ')} (Vietnam time).`);
        this.timer = this.setTimer(() => { void this.tick().catch((error) => this.logger.error?.(`[AUTO-IMPORT-SCHEDULE] tick failed: ${error.message}`)); }, intervalMs);
        this.timer.unref?.();
        void this.tick().catch(() => {});
        return this;
    }

    stop() {
        if (this.timer) this.clearTimer(this.timer);
        this.timer = null;
    }

    /** The slot that is due now (and not yet fired today), or null. */
    dueSlot(now = this.clock()) {
        const { day, minutes } = vietnamClock(now);
        const fired = this.readFired();
        for (const time of this.times()) {
            const [hour, minute] = time.split(':').map(Number);
            const slotMinutes = hour * 60 + minute;
            const lateMs = (minutes - slotMinutes) * 60000;
            if (lateMs < 0 || lateMs > this.catchupMs()) continue;
            if (fired[time] === day) continue;
            return { day, time };
        }
        return null;
    }

    async tick() {
        if (this.running || !this.isEnabled()) return null;
        const slot = this.dueSlot();
        if (!slot) return null;
        const fired = this.readFired();
        fired[slot.time] = slot.day; // saved before the work: a crash or restart never repeats the slot
        this.writeFired(fired);
        return this.runOnce(`slot ${slot.time}`);
    }

    async runOnce(reason = 'manual') {
        if (this.running) return null;
        this.running = true;
        const report = { reason, startedAt: this.clock().toISOString(), sources: {} };
        try {
            for (const source of SOURCES) {
                report.sources[source] = await this.runSource(source);
            }
        } finally {
            this.running = false;
            this.lastReport = { ...report, endedAt: this.clock().toISOString() };
            this.logger.log?.(`[AUTO-IMPORT-SCHEDULE] ${reason}: ${SOURCES.map((s) => `${s}=${report.sources[s]?.outcome}`).join(', ')}`);
        }
        return this.lastReport;
    }

    async ensureSession(source) {
        let result = await this.sessionService.preflight(source);
        if (result?.status === 'SESSION_VALID') return { ok: true, how: 'EXISTING_SESSION' };
        const gate = this.autoLogin?.check?.(source) || { allowed: false, reason: 'AUTO_LOGIN_UNAVAILABLE' };
        if (!gate.allowed) return { ok: false, how: 'NEEDS_MANUAL_LOGIN', reason: gate.reason };
        await this.sessionService.interactiveAuthenticate(source);
        const deadline = this.clock().getTime() + this.sessionWaitMs();
        while (this.clock().getTime() < deadline) {
            await this.sleep(5000);
            result = await this.sessionService.preflight(source);
            if (result?.status === 'SESSION_VALID') return { ok: true, how: 'AUTO_LOGIN' };
        }
        return { ok: false, how: 'SESSION_NOT_READY', reason: result?.status || 'UNKNOWN' };
    }

    async runSource(source) {
        try {
            const session = await this.ensureSession(source);
            if (!session.ok) return { outcome: `SKIPPED_${session.how}`, reason: session.reason || null };
            const created = await this.queueService.createRun({ lane: source, actor: 'scheduler', roles: ['admin'] });
            return { outcome: created?.creation?.created === false ? 'RUN_ALREADY_OPEN' : 'RUN_CREATED', runId: created?.run?.id || null, jobs: created?.jobs?.length ?? null };
        } catch (error) {
            if (error?.code === 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE') return { outcome: 'NOTHING_TO_IMPORT' };
            this.logger.warn?.(`[AUTO-IMPORT-SCHEDULE][${source}] ${error?.code || 'ERROR'}: ${error?.message}`);
            return { outcome: 'FAILED', reason: error?.code || 'ERROR' };
        }
    }
}

module.exports = { AutoImportScheduler, parseTimes, vietnamClock };
