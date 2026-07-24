'use strict';

const path = require('path');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');
const processManager = require('./browserProcessManager');
const {
    DKCL_LIFECYCLE_STATES,
    DKCL_LEGACY_STATES,
    DKCL_IN_PROGRESS_STATES,
    transitionLifecycle,
    lifecyclePayload
} = require('./dkclLifecycleContract');

const PREFLIGHT_STATUSES = Object.freeze({
    SESSION_VALID: 'SESSION_VALID',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    SESSION_CHECK_FAILED: 'SESSION_CHECK_FAILED',
    LOGIN_IN_PROGRESS: 'LOGIN_IN_PROGRESS'
});

const SOURCE_CONFIG = Object.freeze({
    HUE: {
        source: 'HUE',
        displayName: 'Huế',
        profileDirEnv: 'DKCL_HUE_PROFILE_DIR',
        defaultProfileDir: () => path.resolve(process.cwd(), '../Data DKCL/BrowserProfiles/HUE')
    },
    TCT: {
        source: 'TCT',
        displayName: 'TCT',
        profileDirEnv: 'DKCL_TCT_PROFILE_DIR',
        defaultProfileDir: () => path.resolve(process.cwd(), '../Data DKCL/BrowserProfiles/TCT')
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

        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.SOURCE_SELECTED);
        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.SESSION_CHECK);

        if (entry.client) {
            let ready = await entry.client.isF13ReportReady().catch(() => false);
            const authenticated = entry.client.isAuthenticated
                ? await entry.client.isAuthenticated().catch(() => false)
                : false;
            if (!ready && authenticated) {
                transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.F13_OPENING, {
                    authenticated: true,
                    backgroundReady: false
                });
                await entry.client.openF13Report?.().catch(() => {});
                transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                    authenticated: true,
                    backgroundReady: true
                });
                return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true, ...lifecyclePayload(entry) };
            }
            if (ready) {
                transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                    authenticated: true,
                    backgroundReady: true
                });
                return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true, ...lifecyclePayload(entry) };
            }
            await entry.client.restoreWindow?.().catch(() => {});

            // Clean up stale client in registry if no longer valid
            const oldClient = entry.client;
            transitionLifecycle(entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
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
        const profileDir = process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir();
        const client = this.portalClientFactory(sourceConfig);

        try {
            await client.authenticate({
                baseUrl: this.portalBaseUrl,
                profileDir,
                requireExistingSession: true
            });
            transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.AUTHENTICATED, {
                authenticated: true,
                backgroundReady: false
            });
            if (client.openF13Report) {
                transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.F13_OPENING, {
                    authenticated: true,
                    backgroundReady: false
                });
                await client.openF13Report();
            }
            if (client.isF13ReportReady && !await client.isF13ReportReady()) {
                transitionLifecycle(entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
                    authenticated: false,
                    backgroundReady: false
                });
                return {
                    source: sourceConfig.source,
                    status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED,
                    ...lifecyclePayload(entry),
                    error: { code: 'SOURCE_PAGE_REQUIRED', message: 'DKCL source page F1.3 is not ready.' }
                };
            }
            transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                authenticated: true,
                backgroundReady: true
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
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
                interactive: true,
                source_page_ready: false,
                ...lifecyclePayload(entry)
            };
        }

        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.SOURCE_SELECTED);

        if (entry.client) {
            await entry.client.restoreWindow?.().catch(() => {});
            const preflightRes = await this.preflight(sourceConfig.source);
            if (preflightRes.status === PREFLIGHT_STATUSES.SESSION_VALID) {
                return preflightRes;
            }
        }

        entry.openingPromise = (async () => {
            transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, {
                lastError: null
            });

            const profileDir = process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir();

            // R4.1A Automatic Reconciliation
            const classification = await this._classifyLockState(sourceConfig, entry, profileDir);

            if (classification.lockState === 'UNKNOWN' || classification.lockState === 'LIVE_UNVERIFIED') {
                const errCode = classification.lockState === 'UNKNOWN' ? 'PROCESS_INSPECTION_UNAVAILABLE' : 'PROFILE_OWNERSHIP_UNVERIFIED';
                const recErr = new Error(errCode);
                recErr.code = errCode;
                throw recErr;
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
            transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, {
                client,
                authenticated: false,
                backgroundReady: false,
                windowHidden: false,
                hideAttempted: false
            });

            client.onDisconnect = () => {
                transitionLifecycle(entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
                    client: null,
                    authenticated: false,
                    backgroundReady: false,
                    windowHidden: false,
                    hideAttempted: false
                });
                client.close().catch(() => {});
            };

            try {
                transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.OPENING_BROWSER);

                await client.prepareInteractiveAuthentication({
                    baseUrl: this.portalBaseUrl,
                    profileDir
                });

                transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN);

                // Spawn background task to wait for login
                (async () => {
                    try {
                        await client.waitInteractiveAuthentication();

                        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.AUTHENTICATED, {
                            client,
                            authenticated: true,
                            backgroundReady: false
                        });

                        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.F13_OPENING, {
                            authenticated: true,
                            backgroundReady: false
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

                        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                            authenticated: true,
                            backgroundReady: false
                        });

                        const hideWindow = client.hideWindow || client.hideBrowserWindow;
                        const hideSuccess = entry.hideAttempted
                            ? entry.windowHidden
                            : await hideWindow.call(client).catch(() => false);

                        transitionLifecycle(entry, DKCL_LIFECYCLE_STATES.F13_READY, {
                            hideAttempted: true,
                            windowHidden: Boolean(hideSuccess),
                            backgroundReady: true
                        });
                    } catch (err) {
                        transitionLifecycle(entry, DKCL_LEGACY_STATES.ERROR, {
                            lastError: err.message,
                            client: null,
                            authenticated: false,
                            backgroundReady: false,
                            windowHidden: false,
                            hideAttempted: false
                        });
                        await client.close().catch(() => {});
                    }
                })();

                return {
                    source: sourceConfig.source,
                    status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
                    interactive: true,
                    source_page_ready: false,
                    ...lifecyclePayload(entry)
                };
            } catch (error) {
                transitionLifecycle(entry, DKCL_LEGACY_STATES.ERROR, {
                    lastError: error.message,
                    client: null,
                    authenticated: false,
                    backgroundReady: false,
                    windowHidden: false,
                    hideAttempted: false
                });
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
        transitionLifecycle(entry, DKCL_LEGACY_STATES.NOT_AUTHENTICATED, {
            client: null,
            openingPromise: null,
            authenticated: false,
            backgroundReady: false,
            windowHidden: false,
            hideAttempted: false,
            lastError: 'Cancelled by user.'
        });

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
        const profileDir = process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir();
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
            transitionLifecycle(entry, DKCL_LEGACY_STATES.NOT_AUTHENTICATED, {
                client: null,
                openingPromise: null,
                authenticated: false,
                backgroundReady: false,
                windowHidden: false,
                hideAttempted: false,
                lastError: null
            });
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
    DKCL_LIFECYCLE_STATES,
    DKCL_LEGACY_STATES,
    globalRegistry
};
