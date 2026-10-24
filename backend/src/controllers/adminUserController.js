'use strict';

const authSessionStore = require('../services/auth/AuthSessionStore');
const userStore = require('../services/auth/userStore');
const { BCVH_CODES } = require('../services/auth/access/officeMap');

const TIERS = ['ADMIN', 'LEADER', 'STAFF'];
const INDICATORS = ['F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON'];

const fail = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message } });
const initialPassword = () => String(process.env.QIS_INITIAL_PASSWORD || '');

function validateScopes({ tier, bcvh = [], indicators = [] }) {
    if (!TIERS.includes(tier)) return 'tier phải là ADMIN, LEADER hoặc STAFF';
    if (!Array.isArray(bcvh) || bcvh.some((code) => !BCVH_CODES.includes(String(code)))) return 'bcvh chứa mã không hợp lệ';
    if (!Array.isArray(indicators) || indicators.some((code) => !INDICATORS.includes(code))) return 'indicators chứa chỉ số không hợp lệ';
    if (tier !== 'STAFF' && (bcvh.length > 0 || indicators.length > 0)) return 'ADMIN và LEADER không có phạm vi riêng';
    return null;
}

exports.list = async (req, res) => {
    try {
        return res.json({ success: true, data: await userStore.listUsers() });
    } catch (error) {
        return fail(res, 500, 'ADMIN_USERS_ERROR', error.message);
    }
};

exports.create = async (req, res) => {
    const { username, display_name: displayName = '', tier, bcvh = [], indicators = [] } = req.body || {};
    if (!String(username || '').trim()) return fail(res, 400, 'MISSING_FIELDS', 'Yêu cầu username (mã HRM)');
    const problem = validateScopes({ tier, bcvh, indicators });
    if (problem) return fail(res, 400, 'INVALID_INPUT', problem);
    if (!initialPassword()) return fail(res, 500, 'NO_INITIAL_PASSWORD', 'Chưa cấu hình QIS_INITIAL_PASSWORD trên máy chủ');

    try {
        if (await userStore.findByUsername(username)) return fail(res, 409, 'USER_EXISTS', 'Tên đăng nhập đã tồn tại');
        const result = await userStore.upsertUser({
            username: String(username).trim(), displayName, tier, bcvh, indicators, initialPassword: initialPassword(), mustChange: true,
        });
        await userStore.logEvent({ userId: result.id, username, event: 'ADMIN_CREATE', detail: req.auth.user.username });
        return res.status(201).json({ success: true, data: { id: result.id } });
    } catch (error) {
        return fail(res, 500, 'ADMIN_USERS_ERROR', error.message);
    }
};

exports.update = async (req, res) => {
    try {
        const row = await userStore.findById(Number(req.params.id));
        if (!row) return fail(res, 404, 'NOT_FOUND', 'Không tìm thấy người dùng');
        const body = req.body || {};
        const current = (await userStore.listUsers()).find((user) => user.id === row.id);
        const next = {
            tier: body.tier ?? row.tier,
            bcvh: body.bcvh ?? current.bcvh,
            indicators: body.indicators ?? current.indicators,
        };
        const problem = validateScopes(next);
        if (problem) return fail(res, 400, 'INVALID_INPUT', problem);

        const isActive = body.is_active === undefined ? !!row.is_active : !!body.is_active;
        if (row.tier === 'ADMIN' && (next.tier !== 'ADMIN' || !isActive) && (await userStore.countActiveAdmins()) <= 1) {
            return fail(res, 409, 'LAST_ADMIN', 'Không thể hạ quyền hoặc khóa admin cuối cùng');
        }

        await userStore.upsertUser({
            username: row.username, displayName: body.display_name ?? row.display_name, tier: next.tier, bcvh: next.bcvh, indicators: next.indicators,
        });
        await userStore.setActive(row.id, isActive);
        authSessionStore.deleteSessionsForUser(row.id);
        await userStore.logEvent({
            userId: row.id,
            username: row.username,
            event: 'ADMIN_UPDATE',
            detail: `${req.auth.user.username}: tier=${next.tier} bcvh=${next.bcvh.join(',')} ind=${next.indicators.join(',')} active=${isActive}`,
        });
        return res.json({ success: true, data: { id: row.id } });
    } catch (error) {
        return fail(res, 500, 'ADMIN_USERS_ERROR', error.message);
    }
};

exports.resetPassword = async (req, res) => {
    if (!initialPassword()) return fail(res, 500, 'NO_INITIAL_PASSWORD', 'Chưa cấu hình QIS_INITIAL_PASSWORD trên máy chủ');
    try {
        const row = await userStore.findById(Number(req.params.id));
        if (!row) return fail(res, 404, 'NOT_FOUND', 'Không tìm thấy người dùng');
        await userStore.setPassword(row.id, initialPassword(), { mustChange: true, actor: req.auth.user.username });
        authSessionStore.deleteSessionsForUser(row.id);
        return res.json({ success: true, data: { id: row.id } });
    } catch (error) {
        return fail(res, 500, 'ADMIN_USERS_ERROR', error.message);
    }
};

exports.unlock = async (req, res) => {
    try {
        const row = await userStore.findById(Number(req.params.id));
        if (!row) return fail(res, 404, 'NOT_FOUND', 'Không tìm thấy người dùng');
        await userStore.unlock(row.id, req.auth.user.username);
        return res.json({ success: true, data: { id: row.id } });
    } catch (error) {
        return fail(res, 500, 'ADMIN_USERS_ERROR', error.message);
    }
};
