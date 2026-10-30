'use strict';

// OPS-JOURNAL-01 (round 2): in-app notifications of the Nhật ký điều hành (PO 2026-10-30).
//  - ASSIGNED: the people named on a row are told when the manager finalizes the spot (chốt = giao việc);
//  - REPORTED: the manager (Giám đốc TTVH, admin) and the other people on the same row are told when someone reports;
//  - DONE: the people on the row are told when the manager accepts it.
// A notification belongs to ONE user and only that user reads it; a user nobody notified gets an empty list (the bell stays hidden),
// so nothing is learned about who else is involved. The writers run inside the caller's transaction (they use the same `db`).
const { withImportWriteLock } = require('../importWriteLock');

const MAX_LIST = 50;
const clip = (value, max) => {
    const s = String(value ?? '').replace(/\s+/g, ' ').trim();
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};
const dmy = (day) => (day ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}` : '');

async function insert(db, { userId, kind, target, day, spotId, actionId, title, body, at }) {
    await db.run(
        `INSERT INTO ops_journal_notification (user_id, kind, target, day, spot_id, action_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, kind, target, day, spotId, actionId, clip(title, 200), clip(body, 700), at]);
}

/** Everyone who may manage the journal: admins and the Giám đốc TTVH. */
async function managerIds(db) {
    const rows = await db.all("SELECT id FROM qis_user WHERE is_active = 1 AND (tier = 'ADMIN' OR position = 'GD_TTVH')");
    return rows.map((r) => r.id);
}

/** The spot was finalized: tell each person named on its rows which rows are theirs. */
async function notifyAssigned(db, { spot, at, actorName }) {
    const rows = await db.all(
        `SELECT a.id, a.seq, a.what, a.due, x.user_id FROM ops_journal_action a JOIN ops_journal_action_assignee x ON x.action_id = a.id
          WHERE a.spot_id = ? ORDER BY a.seq`, [spot.id]);
    const byUser = new Map();
    for (const row of rows) {
        if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
        byUser.get(row.user_id).push(row);
    }
    for (const [userId, own] of byUser) {
        const list = own.map((r) => `• ${clip(r.what, 160)}${r.due ? ` (hạn: ${clip(r.due, 60)})` : ''}`).join('\n');
        await insert(db, {
            userId, kind: 'ASSIGNED', target: 'MY_TASKS', day: spot.day, spotId: spot.id, actionId: own[0].id, at,
            title: `Giao việc mới: ${spot.title}`,
            body: `${actorName ? `${actorName} giao ` : 'Được giao '}${own.length} dòng việc ngày ${dmy(spot.day)}:\n${list}`,
        });
    }
}

/** Someone reported on a row: the manager(s) and the other people on the row are told. */
async function notifyReported(db, { row, spot, reporterId, reporterName, status, text, files, at }) {
    const co = (await db.all('SELECT user_id FROM ops_journal_action_assignee WHERE action_id = ?', [row.id])).map((r) => r.user_id);
    const managers = await managerIds(db);
    const what = status === 'REPORTED' ? 'đã báo cáo' : 'cập nhật tiến độ';
    const body = `${reporterName || 'Người được giao'} ${what} dòng ${row.seq}: ${clip(row.what, 120)}\nNội dung: ${clip(text, 300) || '(không có)'}${files ? `\nĐính kèm: ${files} file` : ''}`;
    const sent = new Set([reporterId]);
    for (const userId of managers) {
        if (sent.has(userId)) continue;
        sent.add(userId);
        await insert(db, { userId, kind: 'REPORTED', target: 'MANAGER', day: spot.day, spotId: spot.id, actionId: row.id, title: `Báo cáo mới: ${spot.title}`, body, at });
    }
    for (const userId of co) {
        if (sent.has(userId)) continue;
        sent.add(userId);
        await insert(db, { userId, kind: 'REPORTED', target: 'MY_TASKS', day: spot.day, spotId: spot.id, actionId: row.id, title: `Báo cáo mới: ${spot.title}`, body, at });
    }
}

/** The manager accepted a row: the people on it are told. */
async function notifyDone(db, { row, spot, at }) {
    const people = await db.all('SELECT user_id FROM ops_journal_action_assignee WHERE action_id = ?', [row.id]);
    for (const { user_id: userId } of people) {
        await insert(db, {
            userId, kind: 'DONE', target: 'MY_TASKS', day: spot.day, spotId: spot.id, actionId: row.id, at,
            title: `Đã xác nhận hoàn thành: ${spot.title}`, body: `Dòng ${row.seq} đã được Giám đốc TTVH xác nhận hoàn thành: ${clip(row.what, 160)}`,
        });
    }
}

function present(row) {
    return {
        id: row.id, kind: row.kind, target: row.target, day: row.day, spotId: row.spot_id, actionId: row.action_id,
        title: row.title, body: row.body, createdAt: row.created_at, read: row.read_at !== null,
    };
}

/** GET /notifications: the user's own, newest first; `hasAny` keeps the bell hidden for people nobody ever notified. */
async function listNotifications(db, { userId }) {
    if (userId == null) return { items: [], unread: 0, hasAny: false };
    const rows = await db.all('SELECT * FROM ops_journal_notification WHERE user_id = ? ORDER BY id DESC LIMIT ?', [userId, MAX_LIST]);
    const counts = await db.get('SELECT COUNT(*) AS total, SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) AS unread FROM ops_journal_notification WHERE user_id = ?', [userId]);
    return { items: rows.map(present), unread: counts.unread || 0, hasAny: counts.total > 0 };
}

/** POST /notifications/read: `ids` or `all`; only the caller's own rows can be touched. */
async function markRead(db, { userId, ids, all }) {
    if (userId == null) return { updated: 0 };
    const clean = Array.isArray(ids) ? [...new Set(ids.filter((v) => Number.isInteger(v) && v > 0))].slice(0, 200) : [];
    if (!all && !clean.length) return { updated: 0 };
    return withImportWriteLock(async () => {
        const at = Date.now();
        const result = all
            ? await db.run('UPDATE ops_journal_notification SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [at, userId])
            : await db.run(`UPDATE ops_journal_notification SET read_at = ? WHERE user_id = ? AND read_at IS NULL AND id IN (${clean.map(() => '?').join(',')})`, [at, userId, ...clean]);
        return { updated: result.changes || 0 };
    });
}

module.exports = { notifyAssigned, notifyReported, notifyDone, listNotifications, markRead, managerIds };
