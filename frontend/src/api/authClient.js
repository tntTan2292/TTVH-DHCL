import httpClient, { SESSION_KEY } from './httpClient';

class AuthClient {
    async login(username, password) {
        const response = await httpClient.post('/auth/login', { username, password });
        const sessionId = response?.data?.session_id;
        if (sessionId) {
            localStorage.setItem(SESSION_KEY, sessionId);
        }
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
