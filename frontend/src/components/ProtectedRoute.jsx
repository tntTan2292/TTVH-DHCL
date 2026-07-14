import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export default function ProtectedRoute({ children, allowedRoles = ['admin'] }) {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                Đang xác thực phiên đăng nhập...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowedRoles?.length > 0) {
        const currentRole = normalizeRole(user?.role);
        const isAllowed = allowedRoles
            .map(normalizeRole)
            .includes(currentRole);

        if (!isAllowed) {
            return <Navigate to="/unauthorized" replace state={{ from: location }} />;
        }
    }

    return children;
}
