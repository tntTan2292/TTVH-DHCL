const authSessionStore = require('../services/auth/AuthSessionStore');

function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
}

function getSessionId(req) {
    return req.header('x-session-id') || req.header('authorization')?.replace(/^Bearer\s+/i, '') || '';
}

function sendUnauthorized(res, message = 'Phiên đăng nhập không hợp lệ') {
    return res.status(401).json({
        success: false,
        error: {
            code: 'UNAUTHORIZED',
            message,
        },
    });
}

function sendForbidden(res, message = 'Bạn không có quyền truy cập chức năng này') {
    return res.status(403).json({
        success: false,
        error: {
            code: 'FORBIDDEN',
            message,
        },
    });
}

function requireAuth(req, res, next) {
    const sessionId = getSessionId(req);
    const session = authSessionStore.getSession(sessionId);

    if (!session) {
        return sendUnauthorized(res);
    }

    // RBAC-01: until the first-login password change is done, nothing but /api/auth/* is reachable.
    if (session.user?.must_change_password) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'PASSWORD_CHANGE_REQUIRED',
                message: 'Bạn phải đổi mật khẩu trước khi sử dụng hệ thống',
            },
        });
    }

    req.auth = {
        sessionId,
        user: {
            ...session.user,
            role: normalizeRole(session.user?.role),
        },
    };
    req.access = session.user?.access || null;

    return next();
}

function requireRole(allowedRoles = []) {
    const normalizedRoles = allowedRoles.map(normalizeRole);

    return (req, res, next) => {
        if (!req.auth?.user) {
            return sendUnauthorized(res);
        }

        if (!normalizedRoles.includes(normalizeRole(req.auth.user.role))) {
            return sendForbidden(res);
        }

        return next();
    };
}

module.exports = {
    getSessionId,
    requireAuth,
    requireRole,
    sendUnauthorized,
    sendForbidden,
};
