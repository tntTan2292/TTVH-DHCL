'use strict';

// OPS-JOURNAL-01 (round 2): in-app notifications of the Nhật ký điều hành (PO 2026-10-30).
//  - ASSIGNED: the people named on a row are told when the manager finalizes the spot (chốt = giao việc);
//  - REPORTED: the manager (Giám đốc TTVH, admin) and the other people on the same row are told when someone reports;
//  - DONE: the people on the row are told when the manager accepts it.
// A notification belongs to ONE user and only that user reads it; a user nobody notified gets an empty list (the bell stays hidden),
// so nothing is learned about who else is involved. The writers run inside the caller's transaction (they use the same `db`).
const { withImportWriteLock } = require('../importWriteLock');
const { POSITIONS } = require('../auth/access/roles');

const MAX_LIST = 50;
const clip = (value, max) => {
    const s = String(value ?? '').replace(/\s+/g, ' ').trim();
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};
// "Mai Văn Mười – Giám đốc TTVH": the person AND the position, because several people can hold one position and the notification
// is the record of who assigned, who reported and who accepted
const whoIs = (actor) => {
    const name = String(actor?.name || '').trim() || 'Người dùng';
    const label = POSITIONS[actor?.position]?.label;
    return label ? `${name} – ${label}` : name;
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
async function notifyAssigned(db, { spot, at, actor }) {
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
            title: `${whoIs(actor)} giao việc: ${spot.title}`,
            body: `Bạn được giao ${own.length} dòng việc ngày ${dmy(spot.day)}:\n${list}`,
        });
    }
}

/** Someone reported on a row: the manager(s) and the other people on the row are told. */
const rowsLabel = (seqs) => (seqs.length > 1 ? `các dòng ${seqs.join(', ')}` : `dòng ${seqs[0]}`);

async function notifyReported(db, { rows, spot, reporter, status, text, files, at }) {
    const seqs = rows.map((r) => r.seq);
    const co = (await db.all(`SELECT DISTINCT user_id FROM ops_journal_action_assignee WHERE action_id IN (${rows.map(() => '?').join(',')})`, rows.map((r) => r.id))).map((r) => r.user_id);
    const row = rows[0];
    const managers = await managerIds(db);
    const what = status === 'REPORTED' ? 'đã báo cáo' : 'cập nhật tiến độ';
    const who = whoIs(reporter);
    const title = `${who} ${what} ${rowsLabel(seqs)}: ${spot.title}`;
    const body = `${rows.length > 1 ? `Báo cáo chung cho ${rows.length} dòng việc của điểm đen` : `Dòng ${row.seq}: ${clip(row.what, 120)}`}\nNội dung: ${clip(text, 300) || '(không có)'}${files ? `\nĐính kèm: ${files} file` : ''}`;
    const sent = new Set([reporter.id]);
    for (const userId of managers) {
        if (sent.has(userId)) continue;
        sent.add(userId);
        await insert(db, { userId, kind: 'REPORTED', target: 'MANAGER', day: spot.day, spotId: spot.id, actionId: row.id, title, body, at });
    }
    for (const userId of co) {
        if (sent.has(userId)) continue;
        sent.add(userId);
        await insert(db, { userId, kind: 'REPORTED', target: 'MY_TASKS', day: spot.day, spotId: spot.id, actionId: row.id, title, body, at });
    }
}

/** The manager accepted a row: the people on it are told. */
async function notifyDone(db, { rows, spot, actor, at }) {
    const seqs = rows.map((r) => r.seq);
    const row = rows[0];
    const people = await db.all(`SELECT DISTINCT user_id FROM ops_journal_action_assignee WHERE action_id IN (${rows.map(() => '?').join(',')})`, rows.map((r) => r.id));
    for (const { user_id: userId } of people) {
        await insert(db, {
            userId, kind: 'DONE', target: 'MY_TASKS', day: spot.day, spotId: spot.id, actionId: row.id, at,
            title: `${whoIs(actor)} xác nhận hoàn thành ${rowsLabel(seqs)}: ${spot.title}`, body: rows.length > 1 ? `${rows.length} dòng việc của điểm đen đã được xác nhận hoàn thành.` : `Dòng ${row.seq}: ${clip(row.what, 160)}`,
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
