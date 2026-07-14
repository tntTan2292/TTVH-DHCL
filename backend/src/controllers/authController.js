const authSessionStore = require('../services/auth/AuthSessionStore');

const DEMO_USERS = [
    {
        username: 'admin',
        password: 'admin123',
        display_name: 'Quản trị viên',
        role: 'Admin',
    },
];

const getSessionId = (req) => req.header('x-session-id') || req.header('authorization')?.replace(/^Bearer\s+/i, '') || '';

const sendUnauthorized = (res, message = 'Phiên đăng nhập không hợp lệ') =>
    res.status(401).json({
        success: false,
        error: {
            code: 'UNAUTHORIZED',
            message,
        },
    });

exports.login = (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'MISSING_CREDENTIALS',
                message: 'Yêu cầu username và password',
            },
        });
    }

    const user = DEMO_USERS.find((item) => item.username === username && item.password === password);
    if (!user) {
        return sendUnauthorized(res, 'Sai tên đăng nhập hoặc mật khẩu');
    }

    const sessionId = authSessionStore.createSession({
        username: user.username,
        display_name: user.display_name,
        role: user.role,
    });

    return res.json({
        success: true,
        data: {
            session_id: sessionId,
            user: {
                username: user.username,
                display_name: user.display_name,
                role: user.role,
            },
        },
    });
};

exports.me = (req, res) => {
    const sessionId = getSessionId(req);
    const session = authSessionStore.getSession(sessionId);

    if (!session) {
        return sendUnauthorized(res);
    }

    return res.json({
        success: true,
        data: {
            session_id: sessionId,
            user: session.user,
        },
    });
};

exports.logout = (req, res) => {
    const sessionId = getSessionId(req);
    authSessionStore.deleteSession(sessionId);
    return res.json({
        success: true,
        data: {
            message: 'Đăng xuất thành công',
        },
    });
};
