'use strict';

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
        this.authenticationBlocked = false;
        this.integrityBlocked = false;
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
        if (reason !== 'poll') this.authenticationBlocked = false;
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
                if (this.started && this.wakeRequested && !this.authenticationBlocked && !this.integrityBlocked) this.wake();
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
                    if (error?.code === 'AUTHENTICATION_REQUIRED') {
                        this.authenticationBlocked = true;
                        return;
                    }
                    if (error?.code === 'AUTO_BACKFILL_INTEGRITY_BLOCKED') {
                        this.integrityBlocked = true;
                        return;
                    }
                    break;
                }
            }
            if (!this.started) return;
            if (this.authenticationBlocked) return;
            if (this.integrityBlocked) return;
            if (this.wakeRequested) continue;

            const state = await this.queueService.store.getCoordinatorState();
            if (this.wakeRequested) continue;
            const delay = this.nextPollDelay(state);
            if (delay !== null) this.schedule(delay);
            return;
        }
    }

    nextPollDelay(state) {
        if (state.waitingAuthCount > 0 || state.integrityBlockedCount > 0) return null;
        if (state.leaseExpiresAt) {
            const expiryDelay = Date.parse(state.leaseExpiresAt) - this.clock().getTime() + this.leaseGraceMs;
            return Math.min(this.maxPollMs, Math.max(this.minPollMs, expiryDelay));
        }
        if (state.eligibleJobCount > 0) return this.minPollMs;
        if (state.retryReadyAt) {
            const retryDelay = Date.parse(state.retryReadyAt) - this.clock().getTime();
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
