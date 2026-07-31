'use strict';

const path = require('path');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');
const processManager = require('./browserProcessManager');
const { DkclSessionCoordinator } = require('./dkclSessionCoordinator');
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
    LOGIN_IN_PROGRESS: 'LOGIN_IN_PROGRESS'
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
                hideAttempted: false
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

    async reclaimTctOrphanedProfile(classification, profileDir) {
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

    async preflight(source) {
        const sourceConfig = this.normalizeSource(source);
        const entry = getOrCreateRegistryEntry(sourceConfig.source);

        if (DKCL_IN_PROGRESS_STATES.has(entry.state)) {
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
                interactive: true,
                source_page_ready: false,
                ...lifecyclePayload(entry),
                message: `Đang mở đăng nhập DKCL ${sourceConfig.displayName}.`
            };
        }

        if (sourceConfig.source === 'HUE' && entry.activeOperation === 'HUE_QUEUE_RUNNING' && entry.authenticated) {
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
            let ready = await entry.client.isF13ReportReady().catch(() => false);
            const authenticated = entry.client.isAuthenticated
                ? await entry.client.isAuthenticated().catch(() => false)
                : false;
            if (!ready && authenticated) {
                this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_OPENING, {
                    authenticated: true,
                    backgroundReady: false
                });
                await entry.client.openF13Report?.().catch(() => {});
                this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                    authenticated: true,
                    backgroundReady: true
                });
                return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true, ...lifecyclePayload(entry) };
            }
            if (ready) {
                this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                    authenticated: true,
                    backgroundReady: true
                });
                return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true, ...lifecyclePayload(entry) };
            }
            await entry.client.restoreWindow?.().catch(() => {});

            // Clean up stale client in registry if no longer valid
            const oldClient = entry.client;
            this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
                client: null,
                authenticated: false,
                backgroundReady: false,
                windowHidden: false,
                hideAttempted: false
            });
            await oldClient.close().catch(() => {});

            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED,
                ...lifecyclePayload(entry),
                error: { code: 'SOURCE_PAGE_REQUIRED', message: 'DKCL source page F1.3 is not ready.' }
            };
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
        const entry = getOrCreateRegistryEntry(sourceConfig.source);

        if (entry.openingPromise) {
            return entry.openingPromise;
        }

        if (DKCL_IN_PROGRESS_STATES.has(entry.state)) {
            return this.buildInteractiveInProgressResponse(sourceConfig, entry);
        }

        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.SOURCE_SELECTED);

        if (entry.client) {
            const reusedSession = await this.reuseInteractiveClient(sourceConfig, entry);
            if (reusedSession) {
                return reusedSession;
            }
        }

        entry.openingPromise = (async () => {
            const profileDir = resolveProfileDir(sourceConfig);
            transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, {
                lastError: null,
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
                if (!this.coordinatorEnabled && classification.lockState === 'LIVE_UNVERIFIED' && sourceConfig.source === 'TCT' && !entry.client) {
                    await this.reclaimTctOrphanedProfile(classification, profileDir);
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
                        const keepWindowVisible = err?.code === 'AUTHENTICATION_REQUIRED' || err?.code === 'SOURCE_PAGE_REQUIRED';
                        if (keepWindowVisible) {
                            this.transitionEntry(sourceConfig.source, entry, DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN, {
                                client,
                                lastError: err.message,
                                authenticated: false,
                                backgroundReady: false,
                                windowHidden: false,
                                hideAttempted: false,
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
        })();

        return entry.openingPromise;
    }

    getInteractiveClient(source) {
        const entry = getOrCreateRegistryEntry(this.normalizeSource(source).source);
        return entry.client || null;
    }

    /**
     * Cancel a stuck OPENING_BROWSER / WAITING_FOR_LOGIN / F13_OPENING interactive session.
     * Called explicitly by the frontend "Thử lại / Huỷ" button.
     */
    async cancelInteractiveLogin(source) {
        const sourceConfig = this.normalizeSource(source);
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
}

module.exports = {
    DkclSessionPreflightService,
    PREFLIGHT_STATUSES,
    SOURCE_CONFIG,
    resolveProfileDir,
    DKCL_LIFECYCLE_STATES,
    DKCL_LEGACY_STATES,
    globalRegistry
};
