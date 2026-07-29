const { verifyPassword } = require('./passwordHash');

const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'admin123',
    display_name: 'Quản trị viên',
    role: 'admin',
};

const DEFAULT_VIEWER_USERNAME = 'f13viewer';

function normalizeUser(user) {
    if (!user) return null;

    return {
        username: String(user.username || '').trim(),
        display_name: String(user.display_name || '').trim(),
        role: String(user.role || '').trim().toLowerCase(),
    };
}

function getAdminUser() {
    return normalizeUser({
        username: process.env.QIS_ADMIN_USERNAME || DEFAULT_ADMIN.username,
        display_name: process.env.QIS_ADMIN_DISPLAY_NAME || DEFAULT_ADMIN.display_name,
        role: 'admin',
    });
}

function getViewerUser() {
    const passwordHash = String(process.env.QIS_VIEWER_PASSWORD_HASH || '').trim();
    if (!passwordHash) return null;

    return normalizeUser({
        username: process.env.QIS_VIEWER_USERNAME || DEFAULT_VIEWER_USERNAME,
        display_name: process.env.QIS_VIEWER_DISPLAY_NAME || 'Người xem F1.3',
        role: 'viewer',
    });
}

function authenticateRuntimeUser(username, password) {
    const normalizedUsername = String(username || '').trim();
    const normalizedPassword = String(password || '');

    const adminUsername = process.env.QIS_ADMIN_USERNAME || DEFAULT_ADMIN.username;
    const adminPassword = process.env.QIS_ADMIN_PASSWORD || DEFAULT_ADMIN.password;
    if (normalizedUsername === adminUsername && normalizedPassword === adminPassword) {
        return getAdminUser();
    }

    const viewerUser = getViewerUser();
    const viewerHash = String(process.env.QIS_VIEWER_PASSWORD_HASH || '').trim();
    if (
        viewerUser &&
        normalizedUsername === viewerUser.username &&
        verifyPassword(normalizedPassword, viewerHash)
    ) {
        return viewerUser;
    }

    return null;
}

module.exports = {
    DEFAULT_ADMIN,
    DEFAULT_VIEWER_USERNAME,
    getViewerUser,
    getAdminUser,
    authenticateRuntimeUser,
};
