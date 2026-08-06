import { resolveApiBaseUrl } from './apiBaseUrl.js';

const BASE_URL = resolveApiBaseUrl();
const SESSION_KEY = 'qis_auth_session';
const SESSION_VALIDATION_PATH = '/auth/me';

function isOfficialSessionValidationEndpoint(endpoint = '') {
    try {
        const normalized = String(endpoint || '');
        const url = new URL(normalized, `${BASE_URL}/`);
        return url.pathname === SESSION_VALIDATION_PATH || url.pathname === `/api${SESSION_VALIDATION_PATH}`;
    } catch {
        return false;
    }
}

class HttpClient {
    async request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const sessionId = localStorage.getItem(SESSION_KEY);

        const headers = options.headers || {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (sessionId && !headers.Authorization) {
            headers.Authorization = `Bearer ${sessionId}`;
            headers['x-session-id'] = sessionId;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401 && isOfficialSessionValidationEndpoint(endpoint)) {
                    localStorage.removeItem(SESSION_KEY);
                }

                throw {
                    status: response.status,
                    code: data?.error?.code || 'NETWORK_ERROR',
                    message: data?.error?.message || 'Có lỗi xảy ra từ máy chủ.'
                };
            }

            return data;
        } catch (error) {
            if (!error.status) {
                throw {
                    status: 0,
                    code: 'NETWORK_UNREACHABLE',
                    message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
                };
            }
            throw error;
        }
    }

    get(endpoint, params = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value);
            }
        });

        const queryString = queryParams.toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request(url, { method: 'GET' });
    }

    /**
     * Like get(), but for a binary file response (e.g. an .xlsx Export) —
     * request()/get() always call response.json(), which would corrupt a
     * binary payload. Returns { blob, fileName } on success or throws the
     * same shaped error as request().
     */
    async getBlob(endpoint, params = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value);
            }
        });
        const queryString = queryParams.toString();
        const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

        const sessionId = localStorage.getItem(SESSION_KEY);
        const headers = {};
        if (sessionId) {
            headers.Authorization = `Bearer ${sessionId}`;
            headers['x-session-id'] = sessionId;
        }

        let response;
        try {
            response = await fetch(url, { method: 'GET', headers });
        } catch {
            throw { status: 0, code: 'NETWORK_UNREACHABLE', message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.' };
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw { status: response.status, code: data?.error?.code || 'NETWORK_ERROR', message: data?.error?.message || 'Có lỗi xảy ra từ máy chủ.' };
        }

        const disposition = response.headers.get('Content-Disposition') || '';
        const fileNameMatch = disposition.match(/filename="?([^"]+)"?/);
        const blob = await response.blob();
        return { blob, fileName: fileNameMatch ? fileNameMatch[1] : 'export.xlsx' };
    }

    post(endpoint, body = {}) {
        const isFormData = body instanceof FormData;

        const options = {
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body)
        };

        if (isFormData) {
            options.headers = {
                'Accept': 'application/json'
            };
        }

        return this.request(endpoint, options);
    }
}

export { SESSION_KEY, SESSION_VALIDATION_PATH, isOfficialSessionValidationEndpoint };
export default new HttpClient();
