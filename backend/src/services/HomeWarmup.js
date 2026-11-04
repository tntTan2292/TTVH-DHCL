'use strict';

// HOME-WARMUP-01 (PO 2026-11-04) - the Home page is computed in the background so nobody waits for it.
// Once the loaded data has changed AND stopped changing (an import or backfill that is still running would only be
// competing with itself) the main views are computed and kept by HomeExecutiveService; the first visit after a
// load is then answered from memory. One warm-up also runs shortly after the backend starts.
// It is read-only: a failure is logged and skipped, it never touches the data or the load that triggered it.

const DAY_OFFSETS = [0, -1, -2, -3, -4, -5, -6]; // the last 7 days
const WEEK_OFFSETS = [0, -1];
const MONTH_OFFSETS = [0, -1];
const OTHER_INDICATORS = ['f12', 'f13', 'f41', 'f42']; // the ranking table opens on F1.1; the others are warmed for the latest period

// Latest period first: it is what people open.
function buildSteps() {
    const views = [
        ...['day', 'week', 'month'].map((period) => ({ period, offset: 0 })),
        ...DAY_OFFSETS.slice(1).map((offset) => ({ period: 'day', offset })),
        ...WEEK_OFFSETS.slice(1).map((offset) => ({ period: 'week', offset })),
        ...MONTH_OFFSETS.slice(1).map((offset) => ({ period: 'month', offset })),
    ];
    const steps = [];
    for (const view of views) {
        steps.push({ kind: 'executive', ...view });
        steps.push({ kind: 'ranking', indicator: 'f11', ...view });
        if (view.offset === 0) for (const indicator of OTHER_INDICATORS) steps.push({ kind: 'ranking', indicator, ...view });
    }
    return steps;
}

class HomeWarmup {
    constructor({ service, getVersion, intervalMs = 60 * 1000, startDelayMs = 30 * 1000, log = console } = {}) {
        this.service = service;
        this.getVersion = getVersion;
        this.intervalMs = intervalMs;
        this.startDelayMs = startDelayMs;
        this.log = log;
        this.lastWarmed = null;
        this.lastSeen = null;
        this.running = false;
        this.timer = null;
        this.startTimer = null;
    }

    start() {
        this.startTimer = setTimeout(() => { void this.warm('start'); }, this.startDelayMs);
        this.timer = setInterval(() => { void this.tick(); }, this.intervalMs);
        this.startTimer.unref?.();
        this.timer.unref?.();
    }

    stop() {
        clearTimeout(this.startTimer);
        clearInterval(this.timer);
        this.startTimer = null;
        this.timer = null;
    }

    // Warm when the data has changed and the same version was seen on two checks in a row.
    async tick() {
        if (this.running) return false;
        let version;
        try {
            version = await this.getVersion();
        } catch {
            return false;
        }
        if (version === this.lastWarmed) {
            this.lastSeen = version;
            return false;
        }
        if (version !== this.lastSeen) {
            this.lastSeen = version; // still changing: look again next time
            return false;
        }
        await this.warm('data');
        return true;
    }

    async warm(reason = 'manual') {
        if (this.running) return null;
        this.running = true;
        const startedAt = Date.now();
        let done = 0;
        let failed = 0;
        try {
            const version = await Promise.resolve().then(() => this.getVersion()).catch(() => null);
            for (const step of buildSteps()) {
                try {
                    if (step.kind === 'executive') await this.service.getExecutive({ anchorDate: null, period: step.period, offset: step.offset });
                    else await this.service.getNationalRanking({ indicator: step.indicator, period: step.period, anchorDate: null, fromDate: null, toDate: null, offset: step.offset });
                    done += 1;
                } catch {
                    failed += 1;
                }
            }
            this.lastWarmed = version;
            this.lastSeen = version;
            this.log.log?.(`[home-warmup] ${reason}: ${done} view(s) ready, ${failed} skipped, ${Date.now() - startedAt} ms`);
            return { done, failed };
        } finally {
            this.running = false;
        }
    }
}

module.exports = { HomeWarmup, buildSteps };
