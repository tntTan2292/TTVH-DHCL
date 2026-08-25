'use strict';

const path = require('path');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');
const processManager = require('./browserProcessManager');
const { DkclSessionCoordinator } = require('./dkclSessionCoordinator');
const { DkclHueBrokerClient, isHueBrokerEnabled } = require('./dkclHueBrokerClient');
const {
    DKCL_LIFECYCLE_STATES,
    DKCL_LEGACY_STATES,
    DKCL_IN_PROGRESS_STATES,
    transitionLifecycle,
    lifecyclePayload
} = require('./dkclLifecycleContract');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const PREFLIGHT_STATUSES = Object.freeze({
    SESSION_VALID: 'SESSION_VALID',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    SESSION_CHECK_FAILED: 'SESSION_CHECK_FAILED',
    LOGIN_IN_PROGRESS: 'LOGIN_IN_PROGRESS',
    // AUTO-IMPORT-013: reported exactly once, right after the manual-login wait window
    // elapses and resources have been released. Distinct from LOGIN_IN_PROGRESS so the
    // frontend can show an accurate "timed out, please retry" message instead of an
    // indefinite/misleading "window did not appear" one.
    LOGIN_TIMEOUT: 'LOGIN_TIMEOUT'
});

function resolveRepoRootPath(targetPath) {
    if (!targetPath) return targetPath;
    return path.isAbsolute(targetPath) ? targetPath : path.resolve(REPO_ROOT, targetPath);
}

function resolveProfileDir(sourceConfig) {
    return resolveRepoRootPath(process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir());
}

function selectExactProfileRootPids(matchingProcesses = []) {
    const exactMatches = matchingProcesses.filter((proc) => proc?.exactProfileMatch && Number.isFinite(Number(proc.pid)));
    const exactPidSet = new Set(exactMatches.map((proc) => Number(proc.pid)));
    return exactMatches
        .filter((proc) => !exactPidSet.has(Number(proc.parentPid)))
        .map((proc) => Number(proc.pid));
}

const SOURCE_CONFIG = Object.freeze({
    HUE: {
        source: 'HUE',
        displayName: 'Huế',
        profileDirEnv: 'DKCL_HUE_PROFILE_DIR',
        defaultProfileDir: () => path.join(REPO_ROOT, 'Data DKCL', 'BrowserProfiles', 'HUE')
    },
    TCT: {
        source: 'TCT',
        displayName: 'TCT',
        profileDirEnv: 'DKCL_TCT_PROFILE_DIR',
        defaultProfileDir: () => path.join(REPO_ROOT, 'Data DKCL', 'BrowserProfiles', 'TCT')
    }
});

function safeMessage(error, sourceLabel) {
    if (error?.code === 'AUTHENTICATION_REQUIRED') {
        return `Phiên đăng nhập DKCL ${sourceLabel} không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập/cập nhật phiên rồi thử lại.`;
    }
    if (error?.code === 'PROFILE_OWNERSHIP_UNVERIFIED' || error?.code === 'PROFILE_LOCKED' || error?.code === 'PROFILE_LOCK_STALE') {
        return `Không thể xác minh tiến trình đang sử dụng hồ sơ trình duyệt ${sourceLabel}. Hãy đóng đúng cửa sổ DKCL đang mở hoặc khởi động lại backend rồi thử lại.`;
    }
    if (error?.code === 'PROCESS_INSPECTION_UNAVAILABLE') {
        return `Không thể kiểm tra tiến trình trình duyệt ${sourceLabel} trên máy này. Hệ thống chưa thay đổi hồ sơ để bảo đảm an toàn.`;
    }
    if (error?.code === 'PROFILE_IN_USE_OWNED') {
        return `Trình duyệt đăng nhập ${sourceLabel} đang chạy. Vui lòng hoàn tất hoặc đóng cửa sổ hiện tại trước khi mở lại.`;
    }
    if (error?.code === 'ORPHAN_PROCESS_RECOVERY_FAILED') {
        return `Không thể khôi phục tiến trình đăng nhập ${sourceLabel}. Vui lòng khởi động lại backend và thử lại.`;
    }
    return `Không thể kiểm tra phiên DKCL ${sourceLabel}. Vui lòng thử lại hoặc mở đăng nhập thủ công nếu cần.`;
}

// AUTO-IMPORT-014: per-source serialization. Each source (HUE/TCT) gets its own independent
// lock instance — one source's operations never wait on the other's. Any code path that must
// not run concurrently with another for the SAME source (preflight's session-validation/expire
// branch, a fresh reconciliation+launch, an Import worker actively using the client) acquires
// this lock around just that critical section — never around the multi-minute manual-login wait,
// which is already excluded from the race by the lifecycle state machine (DKCL_IN_PROGRESS_STATES
// is checked, and set, synchronously before any await).
class SourceOperationLock {
    constructor() {
        this._tail = Promise.resolve();
    }

    run(fn) {
        const result = this._tail.then(fn, fn);
        // Keep the chain alive regardless of outcome, without leaking a rejection into it.
        this._tail = result.then(() => undefined, () => undefined);
        return result;
    }
}

const sourceLocks = new Map();

function getSourceLock(source) {
    if (!sourceLocks.has(source)) {
        sourceLocks.set(source, new SourceOperationLock());
    }
    return sourceLocks.get(source);
}

const globalRegistry = new Map();

function getOrCreateRegistryEntry(source) {
    if (!globalRegistry.has(source)) {
        globalRegistry.set(source, {
            state: DKCL_LEGACY_STATES.NOT_AUTHENTICATED,
            lifecycleState: DKCL_LEGACY_STATES.NOT_AUTHENTICATED,
            client: null,
            openingPromise: null,
            authenticated: false,
            backgroundReady: false,
            windowHidden: false,
            hideAttempted: false,
            activeOperation: null,
            lastError: null,
            // AB-AUTH-08: true only while parked at WAITING_FOR_LOGIN after a SOURCE_PAGE_REQUIRED
            // recovery (see the catch branch in interactiveAuthenticate()'s background task) — lets
            // preflight() distinguish that safe-to-reprobe sub-case from a human genuinely still
            // filling in the login form.
            pendingSourcePageWait: false,
            updatedAt: new Date().toISOString()
        });
    }
    return globalRegistry.get(source);
}

class DkclSessionPreflightService {
    constructor(options = {}) {
        this.portalClientFactory = options.portalClientFactory || ((sourceConfig) => new DkclHueF13PortalClient({
            headless: true,
            manualAuthWaitMs: Number(process.env.DKCL_SESSION_PREFLIGHT_WAIT_MS || 10000),
            ...(options.portalClientOptions || {}),
            source: sourceConfig.source
        }));
        this.portalBaseUrl = options.portalBaseUrl || process.env.PORTAL_BASE_URL || 'https://dkcl.vnpost.vn/';
        this.interactiveClientFactory = options.interactiveClientFactory || ((sourceConfig) => new DkclHueF13PortalClient({
            headless: false,
            manualAuthWaitMs: Number(process.env.DKCL_INTERACTIVE_AUTH_WAIT_MS || 240000),
            source: sourceConfig?.source
        }));
        this.coordinatorEnabled = typeof options.coordinatorEnabled === 'boolean'
            ? options.coordinatorEnabled
            : DkclSessionCoordinator.isEnabled();
        this.coordinator = options.coordinator || new DkclSessionCoordinator(options.coordinatorOptions);
        this.hueBrokerEnabled = typeof options.hueBrokerEnabled === 'boolean'
            ? options.hueBrokerEnabled
            : isHueBrokerEnabled();
        this.hueBrokerClient = options.hueBrokerClient || (this.hueBrokerEnabled ? new DkclHueBrokerClient(options.hueBrokerClientOptions) : null);
        // AUTO-IMPORT-014 item 3: bounded retry before treating a single false
        // isAuthenticated()/isF13ReportReady() reading as a real failure. Overridable for tests.
        this.reprobeRetryDelayMs = Number.isFinite(options.reprobeRetryDelayMs)
            ? options.reprobeRetryDelayMs
            : Number(process.env.DKCL_REPROBE_RETRY_MS || 750);
    }

    /**
     * AUTO-IMPORT-014 item 1: run fn serialized against every other caller of this method for
     * the same source. HUE and TCT are independent — locking one never blocks the other.
     */
    withSourceLock(source, fn) {
        return getSourceLock(this.normalizeSource(source).source).run(fn);
    }

    normalizeSource(source) {
        const normalized = String(source || '').trim().toUpperCase();
        const config = SOURCE_CONFIG[normalized];
        if (!config) {
            const error = new Error('source must be HUE or TCT.');
            error.code = 'INVALID_SOURCE';
            throw error;
        }
        return config;
    }


    async _classifyLockState(sourceConfig, entry, profileDir) {
        const inspection = await processManager.findBrowserProcessByProfile(profileDir);
        const lockDirExists = require('fs').existsSync(`${profileDir}.lock`);

        if (inspection.inspectionStatus !== 'SUCCESS') {
            return { lockState: 'UNKNOWN', inspection };
        }

        const hasLiveProcess = inspection.matchingProcesses.length > 0;

        if (hasLiveProcess) {
            if (entry.client) {
                return { lockState: 'LIVE_OWNED', inspection };
            }
            return { lockState: 'LIVE_UNVERIFIED', inspection };
        }

        if (!hasLiveProcess && lockDirExists && !entry.client) {
            return { lockState: 'STALE_CONFIRMED', inspection };
        }

        return { lockState: 'NONE', inspection };
    }

    buildInteractiveInProgressResponse(sourceConfig, entry) {
        return {
            source: sourceConfig.source,
            status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
            interactive: true,
            source_page_ready: Boolean(entry.backgroundReady),
            ...lifecyclePayload(entry)
        };
    }

    transitionEntry(source, entry, state, patch = {}) {
        transitionLifecycle(entry, state, patch);
        if (this.coordinatorEnabled) {
            this.coordinator.syncLifecycle(source, entry, patch.profileDir || null, patch);
        }
        return entry;
    }

    recoverFromCoordinator(sourceConfig, entry, profileDir, inspection) {
        if (!this.coordinatorEnabled) return null;
        const record = this.coordinator.getSession(sourceConfig.source);
        if (!this.coordinator.canRecover(record, profileDir, inspection)) return null;

        const recoveredState = this.coordinator.getRecoveredState(record);
        this.transitionEntry(sourceConfig.source, entry, recoveredState, {
            authenticated: Boolean(record.authenticated || recoveredState === DKCL_LIFECYCLE_STATES.F13_READY),
            backgroundReady: Boolean(record.sourcePageReady),
            windowHidden: false,
            hideAttempted: false,
            lastError: null,
            // AB-AUTH-08: this is a fresh recovery, not the SOURCE_PAGE_REQUIRED parked case below.
            pendingSourcePageWait: false,
            profileDir
        });
        return { record, recoveredState };
    }

    async reuseInteractiveClient(sourceConfig, entry) {
        if (!entry.client) return null;

        const restored = await entry.client.restoreWindow?.().catch(() => false);
        if (restored) {
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN, {
                client: entry.client,
                windowHidden: false,
                hideAttempted: false,
                // AB-AUTH-08: reusing an existing window is a fresh wait, not the parked case below.
                pendingSourcePageWait: false
            });
            return this.buildInteractiveInProgressResponse(sourceConfig, entry);
        }

        const staleClient = entry.client;
        this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
            client: null,
            authenticated: false,
            backgroundReady: false,
            windowHidden: false,
            hideAttempted: false,
            activeOperation: null
        });
        await staleClient?.close?.().catch(() => {});
        return null;
    }

    // AUTO-IMPORT-014 item 5: reconcile a confirmed-orphaned QIS-owned browser instance before
    // launching a new one. Generalized from the prior TCT-only reclaim path — HUE gets the same
    // reconciliation now. Ownership safety is enforced by selectExactProfileRootPids(), which only
    // returns PIDs whose own --user-data-dir command-line argument matches this exact profile
    // directory (exactProfileMatch) — a personal/unrelated Chrome window, or any process not
    // launched against this profile path, is never selected or terminated by this method.
    async reclaimOrphanedProfile(classification, profileDir) {
        const rootPids = selectExactProfileRootPids(classification?.inspection?.matchingProcesses);
        if (rootPids.length === 0) {
            const error = new Error('PROFILE_OWNERSHIP_UNVERIFIED');
            error.code = 'PROFILE_OWNERSHIP_UNVERIFIED';
            throw error;
        }

        for (const pid of rootPids) {
            await processManager.terminateProcessTree(pid);
        }
        processManager.cleanupStaleLocks(profileDir);
    }

    async recoverStaleHueInProgressEntry(sourceConfig, entry) {
        if (sourceConfig.source !== 'HUE' || !DKCL_IN_PROGRESS_STATES.has(entry.state)) return false;
        if (entry.client || entry.openingPromise) return false;

        const profileDir = resolveProfileDir(sourceConfig);
        const inspection = await processManager.findBrowserProcessByProfile(profileDir).catch(() => ({
            inspectionStatus: 'FAILED',
            matchingProcesses: []
        }));
        const hasLiveProfileProcess = inspection.inspectionStatus === 'SUCCESS'
            && inspection.matchingProcesses.some((proc) => proc?.exactProfileMatch);

        if (hasLiveProfileProcess) {
            return false;
        }

        if (this.coordinatorEnabled) {
            this.coordinator.markStale(sourceConfig.source, profileDir, 'Stale in-memory interactive state without live browser evidence');
        }

        this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
            client: null,
            openingPromise: null,
            authenticated: false,
            backgroundReady: false,
            windowHidden: false,
            hideAttempted: false,
            activeOperation: null,
            lastError: 'Recovered stale interactive login state.',
            profileDir
        });
        return true;
    }

    /**
     * AUTO-IMPORT-014 item 3: replaces the prior single-reading destructive close. A single
     * false isF13ReportReady()/isAuthenticated() reading no longer expires a live, in-use
     * session — it is retried once (bounded, this.reprobeRetryDelayMs) before any conclusion is
     * drawn. If an owning operation claims the session while probing/retrying, defer to it
     * entirely. Only a *confirmed* logged-out signal (a real login form present, per
     * client.hasLoginForm()) after the bounded retry is treated as a genuine failure —
     * anything else inconclusive keeps the session and reports it as still in-progress rather
     * than guessing. The actual expire-and-close, when it does happen, runs inside this
     * source's lock (item 1) so it can never interleave with a concurrent reconciliation/launch
     * or Import operation for the same source.
     */
    async probeAndMaybeExpireClient(sourceConfig, entry) {
        const client = entry.client;
        if (!client) {
            return this.buildInteractiveInProgressResponse(sourceConfig, entry);
        }

        const check = async () => {
            // AUTO-IMPORT-014 item 4: isAuthenticated() itself now rebinds to another open,
            // authenticated page in the same context if the tracked page was closed/invalidated —
            // check authentication first so isF13ReportReady() below sees the rebound page.
            const authenticated = client.isAuthenticated
                ? await client.isAuthenticated().catch(() => false)
                : false;
            const ready = await client.isF13ReportReady().catch(() => false);
            const hasLoginInput = client.hasLoginForm
                ? await client.hasLoginForm().catch(() => false)
                : false;
            return { ready, authenticated, hasLoginInput };
        };

        let probe = await check();
        if (!probe.ready && probe.authenticated) {
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_OPENING, { authenticated: true, backgroundReady: false });
            await client.openF13Report?.().catch(() => {});
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, { authenticated: true, backgroundReady: true });
            return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true, ...lifecyclePayload(entry) };
        }
        if (probe.ready) {
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, { authenticated: true, backgroundReady: true });
            return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true, ...lifecyclePayload(entry) };
        }

        // Bounded retry before concluding anything — a single false reading is plausibly a
        // transient mid-navigation state (e.g. an Import operation is actively using the page).
        if (this.reprobeRetryDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.reprobeRetryDelayMs));
        }
        probe = await check();
        if (!probe.ready && probe.authenticated) {
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_OPENING, { authenticated: true, backgroundReady: false });
            await client.openF13Report?.().catch(() => {});
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, { authenticated: true, backgroundReady: true });
            return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true, ...lifecyclePayload(entry) };
        }
        if (probe.ready) {
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, { authenticated: true, backgroundReady: true });
            return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true, ...lifecyclePayload(entry) };
        }

        // An owning operation may have started while we were probing/retrying — defer to it,
        // never expire a session another operation now owns.
        if (entry.activeOperation) {
            return this.buildInteractiveInProgressResponse(sourceConfig, entry);
        }

        if (!probe.hasLoginInput) {
            // Inconclusive: neither ready, nor authenticated, nor a confirmed login form —
            // classify as ambiguous/transient rather than a confirmed failure, and keep the
            // session. The next poll re-checks; nothing is destroyed on unclear evidence.
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
                interactive: true,
                source_page_ready: false,
                ...lifecyclePayload(entry),
                message: `Không xác nhận được trạng thái phiên DKCL ${sourceConfig.displayName} — giữ nguyên phiên, sẽ kiểm tra lại.`
            };
        }

        // Confirmed logged-out (a real login form is present) after a bounded retry, and no
        // operation claims ownership: expire, serialized against any concurrent operation.
        return this.withSourceLock(sourceConfig.source, async () => {
            if (entry.client !== client) {
                // Another path already replaced/cleared the client while we waited for the lock.
                return this.buildInteractiveInProgressResponse(sourceConfig, entry);
            }
            await client.restoreWindow?.().catch(() => {});
            this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
                client: null,
                authenticated: false,
                backgroundReady: false,
                windowHidden: false,
                hideAttempted: false
            });
            await client.close().catch(() => {});
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED,
                ...lifecyclePayload(entry),
                error: { code: 'SOURCE_PAGE_REQUIRED', message: 'DKCL source page F1.3 is not ready.' }
            };
        });
    }

    async preflight(source) {
        const sourceConfig = this.normalizeSource(source);
        if (sourceConfig.source === 'HUE' && this.hueBrokerEnabled) {
            return this.preflightViaHueBroker(sourceConfig);
        }
        const entry = getOrCreateRegistryEntry(sourceConfig.source);

        // AB-AUTH-08: WAITING_FOR_LOGIN normally means a human is actively completing the manual
        // login form, and this whole IN_PROGRESS short-circuit exists specifically so nothing ever
        // probes/touches that live client while it's in that state (see the SourceOperationLock
        // class comment above). But the SOURCE_PAGE_REQUIRED recovery branch in
        // interactiveAuthenticate() parks the entry at WAITING_FOR_LOGIN with a real, already-
        // authenticated client attached and no human interaction pending — entry.pendingSourcePageWait
        // marks only that sub-case (set exclusively by that one branch, cleared by every other
        // WAITING_FOR_LOGIN entry point), so this bypass can never fire while a login form is
        // genuinely still in front of the user. When it does fire, execution falls through to the
        // normal `if (entry.client)` branch below, which safely re-probes the real client via
        // probeAndMaybeExpireClient() instead of reporting a stale LOGIN_IN_PROGRESS forever.
        const stuckAfterSourcePageWait = entry.state === DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN
            && entry.pendingSourcePageWait
            && Boolean(entry.client);

        if (DKCL_IN_PROGRESS_STATES.has(entry.state) && !stuckAfterSourcePageWait) {
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
                interactive: true,
                source_page_ready: false,
                ...lifecyclePayload(entry),
                message: `Đang mở đăng nhập DKCL ${sourceConfig.displayName}.`
            };
        }

        // AUTO-IMPORT-013: surface the bounded manual-login timeout exactly once with its
        // specific diagnostic message, then reset to NOT_AUTHENTICATED so the next poll
        // re-checks the (already-released) profile fresh via requireExistingSession below,
        // instead of repeating a stale message or falling into the generic SESSION_CHECK_FAILED
        // bucket that would lose the "why".
        if (entry.state === DKCL_LEGACY_STATES.LOGIN_TIMEOUT) {
            const timeoutMessage = entry.lastError;
            this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.NOT_AUTHENTICATED, {
                client: null,
                authenticated: false,
                backgroundReady: false,
                windowHidden: false,
                hideAttempted: false,
                lastError: null
            });
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.LOGIN_TIMEOUT,
                interactive: true,
                source_page_ready: false,
                ...lifecyclePayload(entry),
                error: { code: 'LOGIN_TIMEOUT', message: timeoutMessage }
            };
        }

        // AUTO-IMPORT-014 item 2: generalized from the prior HUE-only 'HUE_QUEUE_RUNNING' check.
        // ANY owning operation (a running queue, an Update/Re-update, or any other
        // activeOperation value either source's worker sets) exempts this poll from ever
        // touching entry.client — the owning operation is the sole authority over the session
        // while it runs. This now protects TCT identically to HUE.
        if (entry.activeOperation && entry.authenticated) {
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.SESSION_VALID,
                interactive: true,
                source_page_ready: true,
                ...lifecyclePayload(entry),
                message: `PhiÃªn DKCL ${sourceConfig.displayName} Ä‘ang Ä‘Æ°á»£c hÃ ng Ä‘á»£i bÃ¹ dá»¯ liá»‡u sá»­ dá»¥ng.`
            };
        }

        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.SOURCE_SELECTED);
        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.SESSION_CHECK);

        if (entry.client) {
            return this.probeAndMaybeExpireClient(sourceConfig, entry);
        }
        const profileDir = resolveProfileDir(sourceConfig);
        const inspection = await processManager.findBrowserProcessByProfile(profileDir).catch(() => ({ inspectionStatus: 'FAILED', matchingProcesses: [] }));
        const recovered = this.recoverFromCoordinator(sourceConfig, entry, profileDir, inspection);
        if (recovered) {
            if (recovered.recoveredState === DKCL_LIFECYCLE_STATES.F13_READY) {
                return {
                    source: sourceConfig.source,
                    status: PREFLIGHT_STATUSES.SESSION_VALID,
                    interactive: true,
                    source_page_ready: true,
                    ...lifecyclePayload(entry)
                };
            }
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
                interactive: true,
                source_page_ready: Boolean(entry.backgroundReady),
                ...lifecyclePayload(entry),
                message: `Đang khôi phục phiên đăng nhập DKCL ${sourceConfig.displayName}.`
            };
        }
        const client = this.portalClientFactory(sourceConfig);

        try {
            await client.authenticate({
                baseUrl: this.portalBaseUrl,
                profileDir,
                requireExistingSession: true
            });
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.AUTHENTICATED, {
                authenticated: true,
                backgroundReady: false,
                profileDir
            });
            if (client.openF13Report) {
                this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_OPENING, {
                    authenticated: true,
                    backgroundReady: false,
                    profileDir
                });
                await client.openF13Report();
            }
            if (client.isF13ReportReady && !await client.isF13ReportReady()) {
                this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
                    authenticated: false,
                    backgroundReady: false,
                    profileDir
                });
                return {
                    source: sourceConfig.source,
                    status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED,
                    ...lifecyclePayload(entry),
                    error: { code: 'SOURCE_PAGE_REQUIRED', message: 'DKCL source page F1.3 is not ready.' }
                };
            }
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                authenticated: true,
                backgroundReady: true,
                profileDir
            });
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.SESSION_VALID,
                source_page_ready: true,
                ...lifecyclePayload(entry),
                profile: {
                    source: sourceConfig.source,
                    isolated: true,
                    locked_during_check: true
                },
                message: `Phiên DKCL ${sourceConfig.displayName} hợp lệ. Tác vụ nền có thể tiếp tục.`
            };
        } catch (error) {
            const profileDir = resolveProfileDir(sourceConfig);
            processManager.clearHiddenHwnds?.(profileDir);
            if (this.coordinatorEnabled) {
                this.coordinator.markFailed(sourceConfig.source, profileDir, error);
            }
            const status = error?.code === 'AUTHENTICATION_REQUIRED'
                ? PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED
                : PREFLIGHT_STATUSES.SESSION_CHECK_FAILED;
            return {
                source: sourceConfig.source,
                status,
                ...lifecyclePayload(entry),
                profile: {
                    source: sourceConfig.source,
                    isolated: true,
                    locked_during_check: true
                },
                error: {
                    code: error?.code || status,
                    message: safeMessage(error, sourceConfig.displayName)
                }
            };
        } finally {
            if (client?.close) {
                await client.close().catch(() => {});
            }
        }
    }

    async interactiveAuthenticate(source) {
        const sourceConfig = this.normalizeSource(source);
        if (sourceConfig.source === 'HUE' && this.hueBrokerEnabled) {
            return this.interactiveAuthenticateViaHueBroker(sourceConfig);
        }
        const entry = getOrCreateRegistryEntry(sourceConfig.source);

        if (entry.openingPromise) {
            return entry.openingPromise;
        }

        if (DKCL_IN_PROGRESS_STATES.has(entry.state)) {
            const recoveredStaleHueEntry = await this.recoverStaleHueInProgressEntry(sourceConfig, entry);
            if (!recoveredStaleHueEntry) {
                return this.buildInteractiveInProgressResponse(sourceConfig, entry);
            }
        }

        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.SOURCE_SELECTED);

        if (entry.client) {
            const reusedSession = await this.reuseInteractiveClient(sourceConfig, entry);
            if (reusedSession) {
                return reusedSession;
            }
        }

        // AUTO-IMPORT-014 item 1: reconciliation + launch is serialized against any concurrent
        // probe-and-maybe-expire for this same source (probeAndMaybeExpireClient's destructive
        // path acquires the same per-source lock). The lock is released once this async function
        // returns — which happens right after the fire-and-forget background wait task below is
        // spawned, not after it completes — so a fresh launch is never blocked for the full
        // multi-minute manual-login window, only for the short reconciliation/launch phase.
        entry.openingPromise = this.withSourceLock(sourceConfig.source, async () => {
            const profileDir = resolveProfileDir(sourceConfig);
            transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, {
                lastError: null,
                // AB-AUTH-08: a brand-new login attempt is starting; clear any stale
                // parked-after-SOURCE_PAGE_REQUIRED marker from a prior attempt.
                pendingSourcePageWait: false,
                profileDir
            });
            processManager.clearHiddenHwnds?.(profileDir);

            // R4.1A Automatic Reconciliation
            const classification = await this._classifyLockState(sourceConfig, entry, profileDir);
            const recovered = this.recoverFromCoordinator(sourceConfig, entry, profileDir, classification.inspection);
            if (recovered) {
                await processManager.showBrowserWindowsByProfile?.(profileDir).catch(() => {});
                if (recovered.recoveredState === DKCL_LIFECYCLE_STATES.F13_READY) {
                    return {
                        source: sourceConfig.source,
                        status: PREFLIGHT_STATUSES.SESSION_VALID,
                        interactive: true,
                        source_page_ready: true,
                        ...lifecyclePayload(entry)
                    };
                }
                return this.buildInteractiveInProgressResponse(sourceConfig, entry);
            }
            if (this.coordinatorEnabled) {
                this.coordinator.beginOpening(sourceConfig.source, profileDir);
            }

            if (classification.lockState === 'UNKNOWN' || classification.lockState === 'LIVE_UNVERIFIED') {
                if (!this.coordinatorEnabled && classification.lockState === 'LIVE_UNVERIFIED' && !entry.client) {
                    await this.reclaimOrphanedProfile(classification, profileDir);
                } else {
                    const errCode = classification.lockState === 'UNKNOWN' ? 'PROCESS_INSPECTION_UNAVAILABLE' : 'PROFILE_OWNERSHIP_UNVERIFIED';
                    const recErr = new Error(errCode);
                    recErr.code = errCode;
                    throw recErr;
                }
            }

            if (classification.lockState === 'LIVE_OWNED') {
                const recErr = new Error('PROFILE_IN_USE_OWNED');
                recErr.code = 'PROFILE_IN_USE_OWNED';
                throw recErr;
            }

            if (classification.lockState === 'STALE_CONFIRMED') {
                processManager.cleanupStaleLocks(profileDir);
            }

            const client = this.interactiveClientFactory(sourceConfig);
            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, {
                client,
                authenticated: false,
                backgroundReady: false,
                windowHidden: false,
                hideAttempted: false,
                profileDir
            });

            client.onDisconnect = () => {
                this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
                    client: null,
                    authenticated: false,
                    backgroundReady: false,
                    windowHidden: false,
                    hideAttempted: false,
                    profileDir
                });
                if (this.coordinatorEnabled) {
                    this.coordinator.markStale(sourceConfig.source, profileDir, 'Browser disconnected');
                }
                client.close().catch(() => {});
            };

            try {
                this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, { profileDir });

                await client.prepareInteractiveAuthentication({
                    baseUrl: this.portalBaseUrl,
                    profileDir
                });

                this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN, { profileDir });

                // Spawn background task to wait for login
                (async () => {
                    try {
                        await client.waitInteractiveAuthentication();

                        this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.AUTHENTICATED, {
                            client,
                            authenticated: true,
                            backgroundReady: false,
                            profileDir
                        });

                        this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_OPENING, {
                            authenticated: true,
                            backgroundReady: false,
                            profileDir
                        });

                        if (client.isF13ReportReady) {
                            const delayMs = client.manualAuthPollMs || 1000;
                            const maxAttempts = Math.max(1, Math.floor(15000 / delayMs));
                            for (let i = 0; i < maxAttempts; i++) {
                                const ready = await client.isF13ReportReady().catch(() => false);
                                if (ready) break;
                                await new Promise((resolve) => setTimeout(resolve, delayMs));
                            }
                        }

                        this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                            authenticated: true,
                            backgroundReady: false,
                            profileDir
                        });

                        if (client.interactiveAuthenticatedOnOpen) {
                            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                                hideAttempted: false,
                                windowHidden: false,
                                backgroundReady: true,
                                profileDir
                            });
                        } else {
                            const hideWindow = client.hideWindow || client.hideBrowserWindow;
                            const hideSuccess = entry.hideAttempted
                                ? entry.windowHidden
                                : await hideWindow.call(client).catch(() => false);

                            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                                hideAttempted: true,
                                windowHidden: Boolean(hideSuccess),
                                backgroundReady: true,
                                profileDir
                            });
                        }
                    } catch (err) {
                        // AUTO-IMPORT-013: waitInteractiveAuthentication() throws AUTHENTICATION_REQUIRED
                        // from exactly one place — waitForManualAuthentication() returning false after its
                        // full wait window elapsed. In the interactive flow, credentials are typed by the
                        // Product Owner directly in the visible browser (no automated login-attempt path
                        // exists here), so this is unambiguously a bounded manual-login timeout, not a
                        // "still on the login form, retry credentials" case. Treat it as terminal: release
                        // the browser/profile lock and report a specific, accurate diagnostic instead of
                        // leaving the session parked at WAITING_FOR_LOGIN indefinitely.
                        if (err?.code === 'AUTHENTICATION_REQUIRED') {
                            const waitedMs = client.manualAuthWaitMs || 0;
                            const waitedMinutes = Math.round(waitedMs / 60000);
                            this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.LOGIN_TIMEOUT, {
                                client: null,
                                lastError: `Không xác nhận được đăng nhập DKCL ${sourceConfig.displayName} trong ${waitedMinutes} phút. Trình duyệt đã đóng và hồ sơ đã được giải phóng.`,
                                authenticated: false,
                                backgroundReady: false,
                                windowHidden: false,
                                hideAttempted: false,
                                profileDir
                            });
                            if (this.coordinatorEnabled) {
                                this.coordinator.markFailed(sourceConfig.source, profileDir, err);
                            }
                            await client.close().catch(() => {});
                            return;
                        }
                        // SOURCE_PAGE_REQUIRED: login succeeded but the F1.3 report page did not become
                        // ready. Keep the window visible/open — the session is authenticated, this is a
                        // different (portal-page-level) symptom, unchanged from prior behavior.
                        //
                        // AB-AUTH-08: this used to be a dead end — preflight() short-circuits on
                        // WAITING_FOR_LOGIN before it ever reaches the entry.client probe, so nothing
                        // ever re-checked this real, already-authenticated client again, and the PO's
                        // "Đang chờ bạn đăng nhập..." banner stood forever even after the F1.3 page
                        // finished rendering. pendingSourcePageWait marks this specific sub-case so
                        // preflight() can safely bypass the short-circuit for it alone (see there).
                        const keepWindowVisible = err?.code === 'SOURCE_PAGE_REQUIRED';
                        if (keepWindowVisible) {
                            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN, {
                                client,
                                lastError: err.message,
                                authenticated: false,
                                backgroundReady: false,
                                windowHidden: false,
                                hideAttempted: false,
                                pendingSourcePageWait: true,
                                profileDir
                            });
                            await client.restoreWindow?.().catch(() => {});
                            return;
                        }
                        this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.ERROR, {
                            lastError: err.message,
                            client: null,
                            authenticated: false,
                            backgroundReady: false,
                            windowHidden: false,
                            hideAttempted: false,
                            profileDir
                        });
                        if (this.coordinatorEnabled) {
                            this.coordinator.markFailed(sourceConfig.source, profileDir, err);
                        }
                        await client.close().catch(() => {});
                    }
                })();

                return this.buildInteractiveInProgressResponse(sourceConfig, entry);
            } catch (error) {
                this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.ERROR, {
                    lastError: error.message,
                    client: null,
                    authenticated: false,
                    backgroundReady: false,
                    windowHidden: false,
                    hideAttempted: false,
                    profileDir
                });
                if (this.coordinatorEnabled) {
                    this.coordinator.markFailed(sourceConfig.source, profileDir, error);
                }
                await client.close().catch(() => {});
                throw error;
            } finally {
                entry.openingPromise = null;
            }
        });

        return entry.openingPromise;
    }

    getInteractiveClient(source) {
        const sourceConfig = this.normalizeSource(source);
        if (sourceConfig.source === 'HUE' && this.hueBrokerEnabled) {
            return null;
        }
        const entry = getOrCreateRegistryEntry(sourceConfig.source);
        return entry.client || null;
    }

    /**
     * Cancel a stuck OPENING_BROWSER / WAITING_FOR_LOGIN / F13_OPENING interactive session.
     * Called explicitly by the frontend "Thử lại / Huỷ" button.
     */
    async cancelInteractiveLogin(source) {
        const sourceConfig = this.normalizeSource(source);
        if (sourceConfig.source === 'HUE' && this.hueBrokerEnabled) {
            const data = await this.hueBrokerClient.close();
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED,
                cancelled: true,
                was_in_progress: true,
                broker: data
            };
        }
        const entry = getOrCreateRegistryEntry(sourceConfig.source);

        const wasInProgress = DKCL_IN_PROGRESS_STATES.has(entry.state);

        // Close any existing client
        const clientToClose = entry.client;
        this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.NOT_AUTHENTICATED, {
            client: null,
            openingPromise: null,
            authenticated: false,
            backgroundReady: false,
            windowHidden: false,
            hideAttempted: false,
            lastError: 'Cancelled by user.'
        });
        if (this.coordinatorEnabled) {
            this.coordinator.clearSession(sourceConfig.source);
        }

        if (clientToClose) {
            await clientToClose.close().catch(() => {});
        }

        return {
            source: sourceConfig.source,
            status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED,
            cancelled: true,
            was_in_progress: wasInProgress,
            ...lifecyclePayload(entry)
        };
    }

    getRegistryState(source) {
        return getOrCreateRegistryEntry(this.normalizeSource(source).source);
    }

    async recover(source) {
        const sourceConfig = this.normalizeSource(source);
        if (sourceConfig.source === 'HUE' && this.hueBrokerEnabled) {
            return {
                source: sourceConfig.source,
                status: 'BROKER_MANAGED',
                details: await this.hueBrokerClient.getStatus()
            };
        }
        const profileDir = resolveProfileDir(sourceConfig);
        const entry = getOrCreateRegistryEntry(sourceConfig.source);

        const classification = await this._classifyLockState(sourceConfig, entry, profileDir);

        let action = 'NO_RECOVERY_NEEDED';

        if (classification.lockState === 'UNKNOWN') {
            action = 'PROCESS_INSPECTION_UNAVAILABLE';
        } else if (classification.lockState === 'LIVE_UNVERIFIED') {
            action = 'PROFILE_OWNERSHIP_UNVERIFIED';
        } else if (classification.lockState === 'LIVE_OWNED') {
            action = 'PROFILE_IN_USE_OWNED';
        } else if (classification.lockState === 'STALE_CONFIRMED') {
            processManager.cleanupStaleLocks(profileDir);
            action = 'STALE_LOCK_CLEANED';

            if (entry.client) {
                await entry.client.close().catch(() => {});
            }
            this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.NOT_AUTHENTICATED, {
                client: null,
                openingPromise: null,
                authenticated: false,
                backgroundReady: false,
                windowHidden: false,
                hideAttempted: false,
                lastError: null
            });
            if (this.coordinatorEnabled) {
                this.coordinator.clearSession(sourceConfig.source);
            }
        }

        if (action === 'PROCESS_INSPECTION_UNAVAILABLE' || action === 'PROFILE_OWNERSHIP_UNVERIFIED' || action === 'PROFILE_IN_USE_OWNED') {
            const err = new Error(action);
            err.code = action;
            throw err;
        }

        return {
            source: sourceConfig.source,
            status: action,
            details: {
                classification: classification.lockState
            }
        };
    }

    async preflightViaHueBroker(sourceConfig) {
        try {
            const status = await this.hueBrokerClient.getStatus();
            return {
                source: sourceConfig.source,
                status: status.status,
                interactive: true,
                source_page_ready: Boolean(status.source_page_ready),
                broker_state: status.broker_state,
                authenticated: Boolean(status.authenticated),
                updated_at: status.updated_at,
                error: status.error || null
            };
        } catch (error) {
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.SESSION_CHECK_FAILED,
                interactive: true,
                source_page_ready: false,
                error: {
                    code: error.code || 'HUE_BROKER_UNAVAILABLE',
                    message: error.message || 'HUE broker is unavailable.'
                }
            };
        }
    }

    async interactiveAuthenticateViaHueBroker(sourceConfig) {
        const result = await this.hueBrokerClient.openLogin();
        return {
            source: sourceConfig.source,
            status: result.status,
            interactive: true,
            source_page_ready: Boolean(result.source_page_ready),
            broker_state: result.broker_state,
            authenticated: Boolean(result.authenticated),
            updated_at: result.updated_at,
            error: result.error || null
        };
    }
}

module.exports = {
    DkclSessionPreflightService,
    PREFLIGHT_STATUSES,
    SOURCE_CONFIG,
    resolveProfileDir,
    DKCL_LIFECYCLE_STATES,
    DKCL_LEGACY_STATES,
    globalRegistry,
    getSourceLock,
    SourceOperationLock
};
