'use strict';

// AB-AUTH-03: a blocking error that cannot name its source lane is tracked under this sentinel
// and halts the drain outright, preserving the pre-AB-AUTH-03 conservative behaviour whenever
// lane-scoped reasoning is not possible.
const UNKNOWN_LANE = '__UNKNOWN_LANE__';

function normalizeLane(value) {
    const lane = String(value || '').trim().toUpperCase();
    return lane || UNKNOWN_LANE;
}

class AutoBackfillWorkerCoordinator {
    constructor({
        queueService,
        minPollMs = 100,
        maxPollMs = 5000,
        leaseGraceMs = 25,
        clock = () => new Date(),
        setTimer = setTimeout,
        clearTimer = clearTimeout,
        onError = (error) => console.error('[AutoBackfillQueue] coordinator drain failed:', error?.code || error?.message || error),
    } = {}) {
        if (typeof queueService?.processNext !== 'function' || typeof queueService?.store?.getCoordinatorState !== 'function') {
            throw new Error('AutoBackfillWorkerCoordinator requires a queue service with a durable store.');
        }
        if (!Number.isFinite(minPollMs) || minPollMs < 1 || !Number.isFinite(maxPollMs) || maxPollMs < minPollMs) {
            throw new Error('Coordinator poll bounds are invalid.');
        }
        this.queueService = queueService;
        this.minPollMs = minPollMs;
        this.maxPollMs = maxPollMs;
        this.leaseGraceMs = leaseGraceMs;
        this.clock = clock;
        this.setTimer = setTimer;
        this.clearTimer = clearTimer;
        this.onError = onError;
        this.started = false;
        this.wakeRequested = false;
        this.timer = null;
        this.drainPromise = null;
        // AB-AUTH-03: these were single booleans that halted every lane at once. They are now
        // sets of the source lanes known to be blocked, so a lane waiting for a manual login
        // stops only itself. An entry with no lane (an error that could not name one) falls back
        // to the UNKNOWN_LANE sentinel, which is treated conservatively as "stop this drain".
        this.authenticationBlockedLanes = new Set();
        this.integrityBlockedLanes = new Set();
        this.metrics = { wakeCount: 0, drainCount: 0, processNextCount: 0, timerCount: 0 };
    }

    start() {
        if (this.started) return this;
        this.started = true;
        this.wake('start');
        return this;
    }

    wake(reason = 'external') {
        if (!this.started) return false;
        if (reason !== 'poll') this.authenticationBlockedLanes.clear();
        this.metrics.wakeCount += 1;
        this.wakeRequested = true;
        this.clearPendingTimer();
        void this.drain();
        return true;
    }

    async drain() {
        if (!this.started) return;
        if (this.drainPromise) return this.drainPromise;
        this.drainPromise = (async () => {
            try {
                await this.runDrainLoop();
            } catch (error) {
                this.onError(error);
            } finally {
                this.drainPromise = null;
                if (this.started && this.wakeRequested && !this.isDrainHalted()) this.wake();
            }
        })();
        return this.drainPromise;
    }

    async runDrainLoop() {
        this.metrics.drainCount += 1;
        while (this.started) {
            this.wakeRequested = false;
            for (;;) {
                if (!this.started) return;
                try {
                    this.metrics.processNextCount += 1;
                    const result = await this.queueService.processNext();
                    if (!result) break;
                } catch (error) {
                    this.onError(error);
                    // AB-AUTH-03: record WHICH lane is blocked, then stop this drain pass. The
                    // next scheduling decision is made by nextPollDelay() from persisted state,
                    // so another lane with eligible work still gets polled.
                    if (error?.code === 'AUTHENTICATION_REQUIRED') {
                        this.authenticationBlockedLanes.add(normalizeLane(error.sourceLane));
                        break;
                    }
                    if (error?.code === 'AUTO_BACKFILL_INTEGRITY_BLOCKED') {
                        this.integrityBlockedLanes.add(normalizeLane(error.sourceLane));
                        break;
                    }
                    break;
                }
            }
            if (!this.started) return;
            if (this.isDrainHalted()) return;
            if (this.wakeRequested) continue;

            const state = await this.queueService.store.getCoordinatorState();
            if (this.wakeRequested) continue;
            const delay = this.nextPollDelay(state);
            if (delay !== null) this.schedule(delay);
            return;
        }
    }

    // AB-AUTH-03: only an unattributable block stops the drain outright. A block on a named lane
    // leaves the scheduling decision to nextPollDelay(), which reads persisted state and keeps
    // polling as long as some other lane still has work.
    isDrainHalted() {
        return this.authenticationBlockedLanes.has(UNKNOWN_LANE)
            || this.integrityBlockedLanes.has(UNKNOWN_LANE);
    }

    nextPollDelay(state) {
        // AB-AUTH-03: `eligibleJobCount`/`retryReadyAt` remain whole-system totals for existing
        // callers; the coordinator uses the open-lane variants so a blocked lane neither silences
        // polling for the others, nor causes a busy-poll loop for its own pending retries.
        const openLaneEligible = Number(
            state.openLaneEligibleJobCount !== undefined
                ? state.openLaneEligibleJobCount
                : (state.eligibleJobCount || 0),
        );
        const openLaneRetryReadyAt = state.openLaneRetryReadyAt !== undefined
            ? state.openLaneRetryReadyAt
            : state.retryReadyAt;
        const blockedCount = Number(state.waitingAuthCount || 0) + Number(state.integrityBlockedCount || 0);
        const hasOpenWork = Boolean(state.leaseExpiresAt)
            || openLaneEligible > 0
            || Boolean(openLaneRetryReadyAt)
            || Number(state.runningJobCount || 0) > 0;

        // Previously ANY blocked job silenced the coordinator permanently. Now it only stops
        // when nothing remains that a still-open lane could actually pick up.
        if (blockedCount > 0 && !hasOpenWork) return null;

        if (state.leaseExpiresAt) {
            const expiryDelay = Date.parse(state.leaseExpiresAt) - this.clock().getTime() + this.leaseGraceMs;
            return Math.min(this.maxPollMs, Math.max(this.minPollMs, expiryDelay));
        }
        if (openLaneEligible > 0) return this.minPollMs;
        if (openLaneRetryReadyAt) {
            const retryDelay = Date.parse(openLaneRetryReadyAt) - this.clock().getTime();
            return Math.min(this.maxPollMs, Math.max(this.minPollMs, retryDelay));
        }
        if (state.runningJobCount > 0) return this.minPollMs;
        return null;
    }

    schedule(delayMs) {
        if (!this.started || this.timer) return;
        this.metrics.timerCount += 1;
        this.timer = this.setTimer(() => {
            this.timer = null;
            this.wake('poll');
        }, delayMs);
        this.timer?.unref?.();
    }

    clearPendingTimer() {
        if (!this.timer) return;
        this.clearTimer(this.timer);
        this.timer = null;
    }

    async stop() {
        this.started = false;
        this.wakeRequested = false;
        this.clearPendingTimer();
        if (this.drainPromise) await this.drainPromise;
    }

    snapshot() {
        return {
            started: this.started,
            draining: Boolean(this.drainPromise),
            timerScheduled: Boolean(this.timer),
            ...this.metrics,
        };
    }
}

module.exports = { AutoBackfillWorkerCoordinator };
