'use strict';

const path = require('path');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const BROKER_STATES = Object.freeze({
    IDLE: 'IDLE',
    OPENING_BROWSER: 'OPENING_BROWSER',
    WAITING_FOR_LOGIN: 'WAITING_FOR_LOGIN',
    AUTHENTICATED: 'AUTHENTICATED',
    F13_READY: 'F13_READY',
    FAILED: 'FAILED',
    CLOSED: 'CLOSED'
});

function resolveHueProfileDir() {
    const configured = process.env.DKCL_HUE_PROFILE_DIR;
    if (configured) {
        return path.isAbsolute(configured) ? configured : path.resolve(REPO_ROOT, configured);
    }
    return path.join(REPO_ROOT, 'Data DKCL', 'BrowserProfiles', 'HUE');
}

function buildBrokerPayload(service) {
    const error = service.state.lastError
        ? {
            code: service.state.lastError.code || 'HUE_BROKER_ERROR',
            message: service.state.lastError.message || 'HUE broker failed.'
        }
        : null;

    return {
        source: 'HUE',
        broker_state: service.state.status,
        status: service.getPreflightStatus(),
        interactive: true,
        source_page_ready: Boolean(service.state.sourcePageReady),
        authenticated: Boolean(service.state.authenticated),
        browser_open: Boolean(service.state.client),
        profile_dir: service.profileDir,
        updated_at: service.state.updatedAt,
        error
    };
}

class DkclHueBrowserBroker {
    constructor(options = {}) {
        this.portalBaseUrl = options.portalBaseUrl || process.env.PORTAL_BASE_URL || 'https://dkcl.vnpost.vn/';
        this.profileDir = options.profileDir || resolveHueProfileDir();
        this.logger = options.logger || console;
        this.clientFactory = options.clientFactory || (() => new DkclHueF13PortalClient({
            headless: false,
            manualAuthWaitMs: Number(process.env.DKCL_INTERACTIVE_AUTH_WAIT_MS || 240000),
            source: 'HUE'
        }));
        this.state = {
            status: BROKER_STATES.IDLE,
            client: null,
            openingPromise: null,
            waitPromise: null,
            authenticated: false,
            sourcePageReady: false,
            lastError: null,
            updatedAt: new Date().toISOString()
        };
    }

    markState(status, patch = {}) {
        this.state = {
            ...this.state,
            ...patch,
            status,
            updatedAt: new Date().toISOString()
        };
        this.logger.log?.(`[HUE_BROKER] ${status} auth=${this.state.authenticated ? 'yes' : 'no'} ready=${this.state.sourcePageReady ? 'yes' : 'no'}`);
        return buildBrokerPayload(this);
    }

    getPreflightStatus() {
        if (this.state.status === BROKER_STATES.F13_READY) return 'SESSION_VALID';
        if (this.state.status === BROKER_STATES.OPENING_BROWSER || this.state.status === BROKER_STATES.WAITING_FOR_LOGIN || this.state.status === BROKER_STATES.AUTHENTICATED) {
            return 'LOGIN_IN_PROGRESS';
        }
        if (this.state.status === BROKER_STATES.FAILED) return 'SESSION_CHECK_FAILED';
        return 'AUTHENTICATION_REQUIRED';
    }

    getHealth() {
        return {
            ok: true,
            service: 'dkcl-hue-browser-broker',
            source: 'HUE',
            pid: process.pid,
            ...buildBrokerPayload(this)
        };
    }

    async getStatus() {
        if (this.state.client) {
            await this.refreshStateFromClient();
        }
        return buildBrokerPayload(this);
    }

    async getSessionReady() {
        const status = await this.getStatus();
        return {
            source: 'HUE',
            ready: status.status === 'SESSION_VALID' && Boolean(status.source_page_ready),
            broker_state: status.broker_state,
            authenticated: status.authenticated,
            source_page_ready: status.source_page_ready,
            updated_at: status.updated_at,
            error: status.error
        };
    }

    async openLogin() {
        if (this.state.openingPromise) {
            return this.state.openingPromise;
        }

        if (this.state.client) {
            await this.refreshStateFromClient();
            if (this.state.status === BROKER_STATES.F13_READY) {
                return buildBrokerPayload(this);
            }
            await this.state.client.restoreWindow?.().catch(() => {});
            return buildBrokerPayload(this);
        }

        const openingPromise = this._openLogin();
        this.state = {
            ...this.state,
            openingPromise
        };
        try {
            return await openingPromise;
        } finally {
            this.state = {
                ...this.state,
                openingPromise: null
            };
        }
    }

    async _openLogin() {
        const client = this.clientFactory();
        this.markState(BROKER_STATES.OPENING_BROWSER, {
            client,
            authenticated: false,
            sourcePageReady: false,
            lastError: null
        });

        client.onDisconnect = async () => {
            if (this.state.client !== client) return;
            this.markState(BROKER_STATES.CLOSED, {
                client: null,
                authenticated: false,
                sourcePageReady: false
            });
            await client.close().catch(() => {});
        };

        try {
            await client.prepareInteractiveAuthentication({
                baseUrl: this.portalBaseUrl,
                profileDir: this.profileDir
            });

            const readyOnOpen = await client.isF13ReportReady?.().catch(() => false);
            const authenticatedOnOpen = await client.isAuthenticated?.().catch(() => false);
            if (readyOnOpen) {
                this.markState(BROKER_STATES.F13_READY, {
                    authenticated: true,
                    sourcePageReady: true
                });
                return buildBrokerPayload(this);
            }

            this.markState(
                authenticatedOnOpen ? BROKER_STATES.AUTHENTICATED : BROKER_STATES.WAITING_FOR_LOGIN,
                {
                    authenticated: authenticatedOnOpen,
                    sourcePageReady: false
                }
            );

            this.state.waitPromise = this.monitorInteractiveAuthentication(client);
            return buildBrokerPayload(this);
        } catch (error) {
            await client.close().catch(() => {});
            this.markState(BROKER_STATES.FAILED, {
                client: null,
                authenticated: false,
                sourcePageReady: false,
                lastError: error
            });
            throw error;
        }
    }

    async monitorInteractiveAuthentication(client = this.state.client) {
        if (!client) return;
        try {
            await client.waitInteractiveAuthentication();
            if (this.state.client !== client) return;
            const ready = await client.isF13ReportReady?.().catch(() => false);
            this.markState(ready ? BROKER_STATES.F13_READY : BROKER_STATES.AUTHENTICATED, {
                authenticated: true,
                sourcePageReady: ready,
                lastError: null
            });
        } catch (error) {
            if (this.state.client !== client) return;
            this.markState(BROKER_STATES.WAITING_FOR_LOGIN, {
                authenticated: false,
                sourcePageReady: false,
                lastError: error
            });
            await client.restoreWindow?.().catch(() => {});
        }
    }

    async refreshStateFromClient() {
        const client = this.state.client;
        if (!client) return buildBrokerPayload(this);

        const authenticated = await client.isAuthenticated?.().catch(() => false);
        const sourcePageReady = authenticated
            ? await client.isF13ReportReady?.().catch(() => false)
            : false;

        if (sourcePageReady) {
            this.markState(BROKER_STATES.F13_READY, {
                authenticated: true,
                sourcePageReady: true,
                lastError: null
            });
        } else if (authenticated) {
            this.markState(BROKER_STATES.AUTHENTICATED, {
                authenticated: true,
                sourcePageReady: false
            });
        } else if (this.state.status !== BROKER_STATES.OPENING_BROWSER) {
            this.markState(BROKER_STATES.WAITING_FOR_LOGIN, {
                authenticated: false,
                sourcePageReady: false
            });
        }

        return buildBrokerPayload(this);
    }

    async close() {
        const client = this.state.client;
        this.state.waitPromise = null;
        this.state.openingPromise = null;
        if (client) {
            await client.close().catch(() => {});
        }
        this.markState(BROKER_STATES.CLOSED, {
            client: null,
            authenticated: false,
            sourcePageReady: false,
            lastError: null
        });
        return {
            source: 'HUE',
            closed: true,
            broker_state: this.state.status,
            profile_dir: this.profileDir,
            updated_at: this.state.updatedAt
        };
    }
}

module.exports = {
    DkclHueBrowserBroker,
    BROKER_STATES,
    resolveHueProfileDir
};
