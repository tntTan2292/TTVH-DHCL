import axios from 'axios';
import { SESSION_KEY, isOfficialSessionValidationEndpoint } from './httpClient.js';
import { resolveApiBaseUrl } from './apiBaseUrl.js';

const api = axios.create({
    baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
    const sessionId = globalThis.localStorage?.getItem(SESSION_KEY);
    if (sessionId) {
        config.headers = config.headers || {};
        config.headers.Authorization = config.headers.Authorization || `Bearer ${sessionId}`;
        config.headers['x-session-id'] = config.headers['x-session-id'] || sessionId;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const endpoint = error?.config?.url || '';
        if (error?.response?.status === 401 && isOfficialSessionValidationEndpoint(endpoint)) {
            globalThis.localStorage?.removeItem(SESSION_KEY);
        }
        return Promise.reject(error);
    },
);

export default api;
