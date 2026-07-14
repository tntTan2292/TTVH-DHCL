import { createContext, useContext, useEffect, useState } from 'react';
import authClient from '../api/authClient';
import { SESSION_KEY } from '../api/httpClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restore = async () => {
            const sessionId = localStorage.getItem(SESSION_KEY);
            if (!sessionId) {
                setLoading(false);
                return;
            }

            try {
                const response = await authClient.me();
                setUser(response?.data?.user || null);
            } catch {
                localStorage.removeItem(SESSION_KEY);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restore();
    }, []);

    const login = async (username, password) => {
        const response = await authClient.login(username, password);
        setUser(response?.data?.user || null);
        return response;
    };

    const logout = async () => {
        await authClient.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
