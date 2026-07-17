import httpClient, { SESSION_KEY } from './httpClient.js';

class AuthClient {
    async login(username, password) {
        const response = await httpClient.post('/auth/login', { username, password });
        const sessionId = response?.data?.session_id;
        const user = response?.data?.user;
        if (!sessionId || !user) {
            localStorage.removeItem(SESSION_KEY);
            throw {
                status: 0,
                code: 'AUTH_CONTRACT_INVALID',
                message: 'Phản hồi đăng nhập không hợp lệ.',
            };
        }
        localStorage.setItem(SESSION_KEY, sessionId);
        return response;
    }

    me() {
        return httpClient.get('/auth/me');
    }

    async logout() {
        try {
            await httpClient.post('/auth/logout', {});
        } finally {
            localStorage.removeItem(SESSION_KEY);
        }
    }
}

export default new AuthClient();
