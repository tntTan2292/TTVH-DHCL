import { createContext, useContext, useEffect, useState } from 'react';
import authClient from '../api/authClient';
import { SESSION_KEY } from '../api/httpClient';
import { clearEvidenceAccessCache } from '../features/f13v2/f13EvidenceHelpers.js';

const AuthContext = createContext(null);

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restore = async () => {
            const sessionId = globalThis.localStorage?.getItem(SESSION_KEY);
            if (!sessionId) {
                clearEvidenceAccessCache();
                setLoading(false);
                return;
            }

            try {
                const response = await authClient.me();
                const restoredUser = response?.data?.user || null;
                setUser(restoredUser ? { ...restoredUser, role: normalizeRole(restoredUser.role) } : null);
            } catch {
                clearEvidenceAccessCache();
                globalThis.localStorage?.removeItem(SESSION_KEY);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restore();
    }, []);

    const login = async (username, password) => {
        clearEvidenceAccessCache();
        const response = await authClient.login(username, password);
        const authenticatedUser = response?.data?.user || null;
        setUser(authenticatedUser ? { ...authenticatedUser, role: normalizeRole(authenticatedUser.role) } : null);
        return response;
    };

    const changePassword = async (currentPassword, newPassword) => {
        const response = await authClient.changePassword(currentPassword, newPassword);
        const freshUser = response?.data?.user || null;
        setUser(freshUser ? { ...freshUser, role: normalizeRole(freshUser.role) } : null);
        return response;
    };

    const logout = async () => {
        clearEvidenceAccessCache();
        try {
            await authClient.logout();
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout, changePassword }}>
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
