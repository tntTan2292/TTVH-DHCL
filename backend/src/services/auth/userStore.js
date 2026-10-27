'use strict';

const { run, get, all } = require('../../config/db');
const { hashPassword, verifyPasswordAsync } = require('./passwordHash');
const { resolveAccess } = require('./access/resolveAccess');
const throttle = require('./loginThrottle');

const LOCK_MS = throttle.LOCK_MS;

const now = () => Date.now();

// Verified against on every early-return path so the response time does not tell an unknown, inactive or
// locked account from a wrong password (account enumeration by timing, review minor).
const DUMMY_HASH = hashPassword(`dummy-${Math.random()}`);

async function loadScopes(userId) {
    const bcvhRows = await all('SELECT ma_bcvh FROM qis_user_bcvh WHERE user_id = ? ORDER BY ma_bcvh', [userId]);
    const indicatorRows = await all('SELECT indicator FROM qis_user_indicator WHERE user_id = ? ORDER BY indicator', [userId]);
    return {
        bcvh: bcvhRows.map((row) => row.ma_bcvh),
        indicators: indicatorRows.map((row) => row.indicator),
    };
}

async function findByUsername(username) {
    return get('SELECT * FROM qis_user WHERE username = ?', [String(username || '').trim()]);
}

async function findById(id) {
    return get('SELECT * FROM qis_user WHERE id = ?', [id]);
}

/** Shape stored in the session and sent to the frontend. Never includes the hash. */
async function toSessionUser(row) {
    const scopes = await loadScopes(row.id);
    const access = resolveAccess({ tier: row.tier, bcvh: scopes.bcvh, indicators: scopes.indicators, position: row.position });
    return {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        tier: row.tier,
        position: access.position,
        // Legacy field so the existing frontend / requireRole gates keep working until Phase 3.
        role: row.tier === 'ADMIN' ? 'admin' : 'viewer',
        must_change_password: !!row.must_change_password,
        bcvh: scopes.bcvh,
        indicators: scopes.indicators,
        access,
    };
}

async function logEvent({ userId = null, username = null, event, detail = null, ip = null }) {
    await run(
        'INSERT INTO qis_auth_event (user_id, username, event, detail, ip, at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, event, detail, ip, now()],
    );
}

/**
 * Checks credentials with lockout. Returns { ok, row } or { ok:false, code }.
 * The same generic failure is returned for unknown user, wrong password, inactive and locked
 * accounts so the response does not reveal which one it was; `code` is for the audit log only.
 */
async function authenticate(username, password, { ip = null } = {}) {
    if (throttle.isPairLocked(username, ip)) {
        await verifyPasswordAsync(password, DUMMY_HASH);
        await logEvent({ username: String(username || '').trim(), event: 'LOGIN_FAIL', detail: 'throttled', ip });
        return { ok: false, code: 'THROTTLED' };
    }
    const row = await findByUsername(username);
    if (!row) {
        await verifyPasswordAsync(password, DUMMY_HASH);
        throttle.recordFailure(username, ip);
        await logEvent({ username: String(username || '').trim(), event: 'LOGIN_FAIL', detail: 'unknown_user', ip });
        return { ok: false, code: 'UNKNOWN_USER' };
    }
    if (!row.is_active) {
        await verifyPasswordAsync(password, DUMMY_HASH);
        await logEvent({ userId: row.id, username: row.username, event: 'LOGIN_FAIL', detail: 'inactive', ip });
        return { ok: false, code: 'INACTIVE' };
    }
    if (row.locked_until && row.locked_until > now()) {
        await verifyPasswordAsync(password, DUMMY_HASH);
        await logEvent({ userId: row.id, username: row.username, event: 'LOGIN_FAIL', detail: 'locked', ip });
        return { ok: false, code: 'LOCKED' };
    }
    if (!(await verifyPasswordAsync(password, row.password_hash))) {
        await recordFailure(row, 'bad_password', ip);
        return { ok: false, code: 'BAD_PASSWORD' };
    }
    throttle.clearPair(row.username, ip);
    await run(
        'UPDATE qis_user SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?',
        [now(), now(), row.id],
    );
    await logEvent({ userId: row.id, username: row.username, event: 'LOGIN_OK', ip });
    return { ok: true, row };
}

/**
 * Counts one wrong secret (login or the current password of a change) against the (username, IP) pair and the
 * account. The pair locks after 5; the whole account (any IP) only after 25 within 15 minutes.
 */
async function recordFailure(row, detail, ip = null) {
    const result = throttle.recordFailure(row.username, ip);
    const lockAccount = result.accountLocked;
    await run(
        'UPDATE qis_user SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?',
        [lockAccount ? 0 : (row.failed_attempts || 0) + 1, lockAccount ? now() + LOCK_MS : row.locked_until ?? null, now(), row.id],
    );
    await logEvent({
        userId: row.id,
        username: row.username,
        event: lockAccount || result.pairLocked ? 'LOCKED' : 'LOGIN_FAIL',
        detail: lockAccount ? `${detail};account` : result.pairLocked ? `${detail};ip` : detail,
        ip,
    });
    return { locked: lockAccount || result.pairLocked, accountLocked: lockAccount, pairLocked: result.pairLocked };
}

/** True when this (username, IP) is locked or the account itself is locked. */
function isLoginBlocked(row, ip = null) {
    return throttle.isPairLocked(row.username, ip) || Boolean(row.locked_until && row.locked_until > now());
}

async function setPassword(userId, newPassword, { mustChange = false, actor = null } = {}) {
    const target = await findById(userId);
    if (target) throttle.clearUser(target.username);
    await run(
        'UPDATE qis_user SET password_hash = ?, must_change_password = ?, failed_attempts = 0, locked_until = NULL, password_changed_at = ?, updated_at = ? WHERE id = ?',
        [hashPassword(newPassword), mustChange ? 1 : 0, now(), now(), userId],
    );
    await logEvent({ userId, event: mustChange ? 'PASSWORD_RESET' : 'PASSWORD_CHANGED', detail: actor });
}

async function setScopes(userId, { bcvh = [], indicators = [] }) {
    await run('DELETE FROM qis_user_bcvh WHERE user_id = ?', [userId]);
    await run('DELETE FROM qis_user_indicator WHERE user_id = ?', [userId]);
    for (const code of [...new Set(bcvh)]) await run('INSERT INTO qis_user_bcvh (user_id, ma_bcvh) VALUES (?, ?)', [userId, code]);
    for (const indicator of [...new Set(indicators)]) await run('INSERT INTO qis_user_indicator (user_id, indicator) VALUES (?, ?)', [userId, indicator]);
}

/** Creates the user when the username is new; otherwise updates tier, name and scopes only (never the password). */
async function upsertUser({ username, displayName, tier, position, bcvh = [], indicators = [], initialPassword, mustChange = true }) {
    const existing = await findByUsername(username);
    if (existing) {
        // position undefined = leave the stored one alone (callers that do not know about positions keep working).
        if (position === undefined) {
            await run('UPDATE qis_user SET display_name = ?, tier = ?, updated_at = ? WHERE id = ?', [displayName, tier, now(), existing.id]);
        } else {
            await run('UPDATE qis_user SET display_name = ?, tier = ?, position = ?, updated_at = ? WHERE id = ?', [displayName, tier, position || null, now(), existing.id]);
        }
        await setScopes(existing.id, { bcvh, indicators });
        return { id: existing.id, created: false };
    }
    if (!initialPassword) throw new Error('initialPassword is required to create a user');
    const result = await run(
        `INSERT INTO qis_user (username, display_name, tier, position, password_hash, must_change_password, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [String(username).trim(), displayName, tier, position || null, hashPassword(initialPassword), mustChange ? 1 : 0, now(), now()],
    );
    await setScopes(result.lastID, { bcvh, indicators });
    await logEvent({ userId: result.lastID, username, event: 'USER_CREATED' });
    return { id: result.lastID, created: true };
}

async function setActive(userId, active) {
    await run('UPDATE qis_user SET is_active = ?, updated_at = ? WHERE id = ?', [active ? 1 : 0, now(), userId]);
}

async function unlock(userId, actor = null) {
    const target = await findById(userId);
    if (target) throttle.clearUser(target.username);
    await run('UPDATE qis_user SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?', [now(), userId]);
    await logEvent({ userId, event: 'UNLOCKED', detail: actor });
}

async function listUsers() {
    const rows = await all(
        'SELECT id, username, display_name, tier, position, must_change_password, is_active, failed_attempts, locked_until, last_login_at FROM qis_user ORDER BY tier, username',
    );
    const out = [];
    for (const row of rows) {
        const scopes = await loadScopes(row.id);
        out.push({ ...row, must_change_password: !!row.must_change_password, is_active: !!row.is_active, bcvh: scopes.bcvh, indicators: scopes.indicators });
    }
    return out;
}

async function countUsers() {
    const row = await get('SELECT COUNT(*) AS n FROM qis_user');
    return row?.n || 0;
}

async function countActiveAdmins() {
    const row = await get("SELECT COUNT(*) AS n FROM qis_user WHERE tier = 'ADMIN' AND is_active = 1");
    return row?.n || 0;
}

module.exports = {
    LOCK_MS,
    findByUsername,
    findById,
    toSessionUser,
    authenticate,
    recordFailure,
    isLoginBlocked,
    setPassword,
    setScopes,
    setActive,
    unlock,
    upsertUser,
    listUsers,
    countUsers,
    countActiveAdmins,
    logEvent,
};
