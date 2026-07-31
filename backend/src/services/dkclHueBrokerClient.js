'use strict';

const DEFAULT_BROKER_PORT = Number(process.env.DKCL_HUE_BROKER_PORT || 5061);
const DEFAULT_BROKER_URL = process.env.DKCL_HUE_BROKER_URL || `http://127.0.0.1:${DEFAULT_BROKER_PORT}`;

function normalizeBaseUrl(baseUrl = DEFAULT_BROKER_URL) {
    return String(baseUrl || DEFAULT_BROKER_URL).replace(/\/+$/, '');
}

function isHueBrokerEnabled() {
    return process.env.DKCL_HUE_BROKER_ENABLED === 'true';
}

class DkclHueBrokerClient {
    constructor(options = {}) {
        this.baseUrl = normalizeBaseUrl(options.baseUrl);
        this.fetchImpl = options.fetchImpl || global.fetch;
        if (typeof this.fetchImpl !== 'function') {
            throw new Error('Global fetch is required for DkclHueBrokerClient.');
        }
    }

    async health() {
        return this.requestJson('/health');
    }

    async openLogin() {
        return this.requestJson('/api/hue/open-login', { method: 'POST' });
    }

    async getStatus() {
        return this.requestJson('/api/hue/status');
    }

    async getSessionReady() {
        return this.requestJson('/api/hue/session-ready');
    }

    async close() {
        return this.requestJson('/api/hue/close', { method: 'POST' });
    }

    async requestJson(pathname, options = {}) {
        let response;
        try {
            response = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
                method: options.method || 'GET',
                headers: {
                    'content-type': 'application/json',
                    ...(options.headers || {})
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });
        } catch (error) {
            const requestError = new Error(`HUE broker is unreachable at ${this.baseUrl}.`);
            requestError.code = 'HUE_BROKER_UNREACHABLE';
            requestError.cause = error;
            throw requestError;
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
            const brokerError = new Error(payload?.error?.message || `HUE broker request failed with status ${response.status}.`);
            brokerError.code = payload?.error?.code || 'HUE_BROKER_REQUEST_FAILED';
            brokerError.statusCode = response.status;
            brokerError.payload = payload;
            throw brokerError;
        }

        return payload?.data ?? payload;
    }
}

module.exports = {
    DkclHueBrokerClient,
    DEFAULT_BROKER_PORT,
    DEFAULT_BROKER_URL,
    isHueBrokerEnabled
};
