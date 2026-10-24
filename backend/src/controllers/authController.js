const authSessionStore = require('../services/auth/AuthSessionStore');
const userStore = require('../services/auth/userStore');
const { validateNewPassword } = require('../services/auth/passwordPolicy');
const { verifyPasswordAsync } = require('../services/auth/passwordHash');

const getSessionId = (req) => req.header('x-session-id') || req.header('authorization')?.replace(/^Bearer\s+/i, '') || '';

const sendUnauthorized = (res, message = 'Phiên đăng nhập không hợp lệ') =>
    res.status(401).json({
        success: false,
        error: {
            code: 'UNAUTHORIZED',
            message,
        },
    });

const clientIp = (req) => req.ip || req.socket?.remoteAddress || null;

const publicUser = (user) => ({
    username: user.username,
    display_name: user.display_name,
    tier: user.tier,
    role: user.role,
    must_change_password: !!user.must_change_password,
    access: user.access,
});

exports.login = async (req, res) => {
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

    try {
        const result = await userStore.authenticate(username, password, { ip: clientIp(req) });
        if (!result.ok) {
            // Same text for unknown user, wrong password, inactive and locked accounts.
            return sendUnauthorized(res, 'Sai tên đăng nhập hoặc mật khẩu, hoặc tài khoản đang bị khóa');
        }

        const user = await userStore.toSessionUser(result.row);
        const sessionId = authSessionStore.createSession(user);

        return res.json({
            success: true,
            data: {
                session_id: sessionId,
                user: publicUser(user),
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: { code: 'AUTH_ERROR', message: 'Không đăng nhập được, thử lại sau' } });
    }
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
            user: session.user?.access ? publicUser(session.user) : session.user,
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

exports.changePassword = async (req, res) => {
    const sessionId = getSessionId(req);
    const session = authSessionStore.getSession(sessionId);
    if (!session?.user?.id) return sendUnauthorized(res);

    const { current_password: currentPassword, new_password: newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Yêu cầu mật khẩu hiện tại và mật khẩu mới' } });
    }

    try {
        const row = await userStore.findById(session.user.id);
        if (!row || !row.is_active) {
            return res.status(400).json({ success: false, error: { code: 'WRONG_CURRENT_PASSWORD', message: 'Mật khẩu hiện tại không đúng' } });
        }
        if (row.locked_until && row.locked_until > Date.now()) {
            return res.status(429).json({ success: false, error: { code: 'ACCOUNT_LOCKED', message: 'Tài khoản đang tạm khóa do nhập sai nhiều lần, thử lại sau' } });
        }
        if (!(await verifyPasswordAsync(currentPassword, row.password_hash))) {
            // A stolen session must not be able to guess the real password: wrong attempts count like wrong logins.
            await userStore.recordFailure(row, 'bad_current_password', clientIp(req));
            return res.status(400).json({ success: false, error: { code: 'WRONG_CURRENT_PASSWORD', message: 'Mật khẩu hiện tại không đúng' } });
        }

        const problems = validateNewPassword(newPassword, {
            username: row.username,
            isSameAsCurrent: await verifyPasswordAsync(newPassword, row.password_hash),
        });
        if (problems.length > 0) {
            return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: problems.join('; '), problems } });
        }

        await userStore.setPassword(row.id, newPassword, { mustChange: false });
        authSessionStore.deleteSessionsForUser(row.id);

        const fresh = await userStore.toSessionUser(await userStore.findById(row.id));
        const freshSessionId = authSessionStore.createSession(fresh);
        return res.json({ success: true, data: { session_id: freshSessionId, user: publicUser(fresh) } });
    } catch (error) {
        return res.status(500).json({ success: false, error: { code: 'AUTH_ERROR', message: 'Không đổi được mật khẩu, thử lại sau' } });
    }
};
