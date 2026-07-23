'use strict';

const path = require('path');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');
const processManager = require('./browserProcessManager');

const PREFLIGHT_STATUSES = Object.freeze({
    SESSION_VALID: 'SESSION_VALID',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    SESSION_CHECK_FAILED: 'SESSION_CHECK_FAILED',
    LOGIN_IN_PROGRESS: 'LOGIN_IN_PROGRESS'
});

const INTERACTIVE_IN_PROGRESS_STATES = new Set(['OPENING_BROWSER', 'WAITING_FOR_LOGIN']);

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
            state: 'NOT_AUTHENTICATED',
            client: null,
            openingPromise: null,
            authenticated: false,
            backgroundReady: false,
            minimized: false,
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
            if (entry.client || entry.openingPromise) {
                return { lockState: 'LIVE_OWNED', inspection };
            }
            return { lockState: 'LIVE_UNVERIFIED', inspection };
        }

        if (!hasLiveProcess && lockDirExists && !entry.client && !entry.openingPromise) {
            return { lockState: 'STALE_CONFIRMED', inspection };
        }

        return { lockState: 'NONE', inspection };
    }

    async preflight(source) {
        const sourceConfig = this.normalizeSource(source);
        const entry = getOrCreateRegistryEntry(sourceConfig.source);

        if (INTERACTIVE_IN_PROGRESS_STATES.has(entry.state)) {
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
                interactive: true,
                lifecycle_state: entry.state,
                source_page_ready: false,
                message: `Đang mở đăng nhập DKCL ${sourceConfig.displayName}.`
            };
        }
        
        if (entry.client) {
            let ready = await entry.client.isF13ReportReady().catch(() => false);
            if (!ready && entry.client.isAuthenticated && await entry.client.isAuthenticated().catch(() => false)) {
                await entry.client.restoreWindow?.().catch(() => {});
                await entry.client.openF13Report?.().catch(() => {});
                ready = await entry.client.isF13ReportReady().catch(() => false);
            }
            if (ready) {
                entry.state = 'BACKGROUND_READY';
                entry.authenticated = true;
                entry.backgroundReady = true;
                entry.minimized = true;
                entry.updatedAt = new Date().toISOString();
                return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true };
            }
            await entry.client.restoreWindow?.().catch(() => {});
            
            // Clean up stale client in registry if no longer valid
            const oldClient = entry.client;
            entry.client = null;
            entry.authenticated = false;
            entry.backgroundReady = false;
            entry.minimized = false;
            entry.state = 'SESSION_EXPIRED';
            entry.updatedAt = new Date().toISOString();
            await oldClient.close().catch(() => {});

            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED,
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
            if (client.openF13Report) await client.openF13Report();
            if (client.isF13ReportReady && !await client.isF13ReportReady()) {
                return {
                    source: sourceConfig.source,
                    status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED,
                    error: { code: 'SOURCE_PAGE_REQUIRED', message: 'DKCL source page F1.3 is not ready.' }
                };
            }
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.SESSION_VALID,
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

        if (INTERACTIVE_IN_PROGRESS_STATES.has(entry.state)) {
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS,
                interactive: true,
                lifecycle_state: entry.state,
                source_page_ready: false
            };
        }

        if (entry.client) {
            await entry.client.restoreWindow?.().catch(() => {});
            const preflightRes = await this.preflight(sourceConfig.source);
            if (preflightRes.status === PREFLIGHT_STATUSES.SESSION_VALID) {
                return preflightRes;
            }
        }

        entry.openingPromise = (async () => {
            entry.state = 'OPENING_BROWSER';
            entry.lastError = null;
            entry.updatedAt = new Date().toISOString();
            
            const profileDir = process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir();
            
            // R4.1 Automatic Reconciliation
            const existingPid = await processManager.findBrowserProcessByProfile(profileDir);
            if (existingPid) {
                // Orphaned process unquestionably belongs to this profile. Terminate it to recover.
                try {
                    await processManager.terminateProcessTree(existingPid);
                } catch (err) {
                    const recErr = new Error('Failed to recover orphaned process');
                    recErr.code = 'ORPHAN_PROCESS_RECOVERY_FAILED';
                    throw recErr;
                }
            }
            // Always clean up any stale lock files before launching
            processManager.cleanupStaleLocks(profileDir);

            const client = this.interactiveClientFactory(sourceConfig);
            entry.client = client;
            entry.authenticated = false;
            entry.backgroundReady = false;
            entry.minimized = false;

            client.onDisconnect = () => {
                entry.state = 'SESSION_EXPIRED';
                entry.client = null;
                entry.authenticated = false;
                entry.backgroundReady = false;
                entry.minimized = false;
                entry.updatedAt = new Date().toISOString();
                client.close().catch(() => {});
            };

            try {
                entry.state = 'WAITING_FOR_LOGIN';
                entry.updatedAt = new Date().toISOString();

                await client.openInteractiveAuthentication({
                    baseUrl: this.portalBaseUrl,
                    profileDir
                });

                entry.state = 'AUTHENTICATED';
                entry.client = client;
                entry.authenticated = true;
                entry.backgroundReady = false;
                entry.updatedAt = new Date().toISOString();

                const minimizeSuccess = entry.minimized
                    ? true
                    : await client.minimizeWindow().catch(() => false);
                entry.minimized = true;
                entry.state = 'BACKGROUND_READY';
                entry.backgroundReady = true;
                entry.updatedAt = new Date().toISOString();

                return {
                    source: sourceConfig.source,
                    status: PREFLIGHT_STATUSES.SESSION_VALID,
                    interactive: true,
                    source_page_ready: true,
                    browser_minimized: minimizeSuccess,
                    export_readiness: 'SOURCE_PAGE_READY'
                };
            } catch (error) {
                entry.state = 'ERROR';
                entry.lastError = error.message;
                entry.client = null;
                entry.authenticated = false;
                entry.backgroundReady = false;
                entry.minimized = false;
                entry.updatedAt = new Date().toISOString();
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

    getRegistryState(source) {
        return getOrCreateRegistryEntry(this.normalizeSource(source).source);
    }

    async recover(source) {
        const sourceConfig = this.normalizeSource(source);
        const profileDir = process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir();
        
        let terminated = false;
        const pid = await processManager.findBrowserProcessByProfile(profileDir);
        
        if (pid) {
            await processManager.terminateProcessTree(pid);
            terminated = true;
        }
        
        processManager.cleanupStaleLocks(profileDir);
        
        const entry = getOrCreateRegistryEntry(sourceConfig.source);
        if (entry.client) {
            await entry.client.close().catch(() => {});
        }
        
        entry.state = 'NOT_AUTHENTICATED';
        entry.client = null;
        entry.openingPromise = null;
        entry.authenticated = false;
        entry.backgroundReady = false;
        entry.minimized = false;
        entry.lastError = null;
        entry.updatedAt = new Date().toISOString();

        return {
            source: sourceConfig.source,
            status: 'RECOVERED',
            details: {
                profile_dir_resolved: profileDir,
                orphan_process_found: !!pid,
                terminated_pid: pid || null,
                registry_cleared: true
            }
        };
    }
}

module.exports = {
    DkclSessionPreflightService,
    PREFLIGHT_STATUSES,
    SOURCE_CONFIG,
    globalRegistry
};
