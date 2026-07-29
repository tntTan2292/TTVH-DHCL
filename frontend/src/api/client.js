import axios from 'axios';
import { SESSION_KEY } from './httpClient.js';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api',
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
        if (error?.response?.status === 401) {
            globalThis.localStorage?.removeItem(SESSION_KEY);
        }
        return Promise.reject(error);
    },
);

export default api;
