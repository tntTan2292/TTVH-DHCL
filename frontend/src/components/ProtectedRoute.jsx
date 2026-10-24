import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccessPath } from '../auth/accessModel.js';

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export default function ProtectedRoute({ children, allowedRoles }) {
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

    // While must_change_password is true, every route redirects to /change-password
    if (user?.must_change_password && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    // Route gating by user.access
    const isAllowed = canAccessPath(user?.access, location.pathname, user?.role);
    if (!isAllowed) {
        return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }

    // Legacy role check if allowedRoles is explicitly passed and access was not defined
    if (allowedRoles?.length > 0 && !user?.access) {
        const currentRole = normalizeRole(user?.role);
        const isRoleAllowed = allowedRoles
            .map(normalizeRole)
            .includes(currentRole);

        if (!isRoleAllowed) {
            return <Navigate to="/unauthorized" replace state={{ from: location }} />;
        }
    }

    return children;
}
