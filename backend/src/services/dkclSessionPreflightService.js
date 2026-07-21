'use strict';

const path = require('path');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');

const PREFLIGHT_STATUSES = Object.freeze({
    SESSION_VALID: 'SESSION_VALID',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    SESSION_CHECK_FAILED: 'SESSION_CHECK_FAILED'
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
    if (error?.code === 'PROFILE_LOCKED') {
        return `Hồ sơ trình duyệt DKCL ${sourceLabel} đang được sử dụng bởi tác vụ khác. Vui lòng chờ tác vụ hiện tại kết thúc.`;
    }
    return `Không thể kiểm tra phiên DKCL ${sourceLabel}. Vui lòng thử lại hoặc mở đăng nhập thủ công nếu cần.`;
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
        this.interactiveClients = new Map();
        this.interactiveClientFactory = options.interactiveClientFactory || (() => new DkclHueF13PortalClient({
            headless: false,
            manualAuthWaitMs: Number(process.env.DKCL_INTERACTIVE_AUTH_WAIT_MS || 240000)
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

    async preflight(source) {
        const sourceConfig = this.normalizeSource(source);
        const interactiveClient = this.interactiveClients.get(sourceConfig.source);
        if (interactiveClient) {
            let ready = await interactiveClient.isF13ReportReady().catch(() => false);
            if (!ready && interactiveClient.isAuthenticated && await interactiveClient.isAuthenticated().catch(() => false)) {
                await interactiveClient.restoreWindow?.().catch(() => {});
                await interactiveClient.openF13Report?.().catch(() => {});
                ready = await interactiveClient.isF13ReportReady().catch(() => false);
            }
            if (ready) {
                return { source: sourceConfig.source, status: PREFLIGHT_STATUSES.SESSION_VALID, interactive: true, source_page_ready: true };
            }
            await interactiveClient.restoreWindow?.().catch(() => {});
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
        const existing = this.interactiveClients.get(sourceConfig.source);
        if (existing) {
            await existing.restoreWindow?.().catch(() => {});
            return this.preflight(sourceConfig.source);
        }
        const profileDir = process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir();
        const client = this.interactiveClientFactory(sourceConfig);

        try {
            await client.openInteractiveAuthentication({
                baseUrl: this.portalBaseUrl,
                profileDir
            });
            this.interactiveClients.set(sourceConfig.source, client);
            return {
                source: sourceConfig.source,
                status: PREFLIGHT_STATUSES.SESSION_VALID,
                interactive: true,
                source_page_ready: true,
                browser_minimized: false,
                export_readiness: 'NOT_CHECKED'
            };
        } catch (error) {
            return {
                source: sourceConfig.source,
                status: error?.code === 'AUTHENTICATION_REQUIRED'
                    ? PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED
                    : PREFLIGHT_STATUSES.SESSION_CHECK_FAILED,
                profile: {
                    source: sourceConfig.source,
                    isolated: true,
                    locked_during_check: true
                },
                error: {
                    code: error?.code || 'INTERACTIVE_AUTH_FAILED',
                    message: safeMessage(error, sourceConfig.displayName)
                }
            };
        } finally {
            if (this.interactiveClients.get(sourceConfig.source) !== client && client?.close) {
                await client.close().catch(() => {});
            }
        }
    }

    getInteractiveClient(source) {
        return this.interactiveClients.get(this.normalizeSource(source).source) || null;
    }
}

module.exports = {
    DkclSessionPreflightService,
    PREFLIGHT_STATUSES,
    SOURCE_CONFIG
};
