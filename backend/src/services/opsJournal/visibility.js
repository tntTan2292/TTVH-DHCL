'use strict';

// OPS-JOURNAL-01 (A1): the one place that decides who may read what of the Nhật ký điều hành.
//  - the manager (capability journal.manage: Giám đốc TTVH, admin) reads every day, spot and row;
//  - any other signed-in user reads ONLY the rows assigned to them, and only after the spot was finalized (assigned_at set),
//    together with the headline / metrics of that spot (the "phiếu"); never the other rows, other assignees, the closing,
//    a draft spot, a count or an id of anything else;
//  - everything else is NOT_FOUND (404, never 403) with the same body as an id that does not exist, so existence is not disclosed.
const { draftClosing } = require('./closingDraft');
const { CAPABILITIES, can } = require('../auth/access/roles');

class NotFoundError extends Error {
    constructor() {
        super('Không tìm thấy');
        this.code = 'NOT_FOUND';
        this.status = 404;
    }
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isManager(access) {
    return can(access, CAPABILITIES.JOURNAL_MANAGE);
}

function asSpotId(value) {
    const text = String(value ?? '');
    if (!/^[1-9]\d{0,14}$/.test(text)) throw new NotFoundError();
    return Number(text);
}

function asDay(value) {
    const text = String(value ?? '');
    const parsed = DAY_PATTERN.test(text) ? new Date(`${text}T00:00:00Z`) : null;
    // round trip: Date rolls 2026-02-31 over to March, which must not pass for a real day
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) throw new NotFoundError();
    return text;
}

function parseJson(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
}

function presentSpot(row) {
    return {
        id: row.id,
        day: row.day,
        indicator: row.indicator,
        scopeType: row.scope_type,
        scopeKey: row.scope_key,
        officeCode: row.office_code,
        title: row.title,
        headline: row.headline,
        metrics: parseJson(row.metrics_json),
        source: row.source,
        status: row.status,
        detectedAt: row.detected_at,
        channel: row.channel,
        sort: row.sort,
    };
}

/**
 * What an assignee gets about the spot: a whitelist, so nothing tells them how many other spots / rows exist or whether the
 * spot is closed (no sort, source, status). The spot id stays: it is the address of the phiếu.
 */
function presentSpotForAssignee(row) {
    const spot = presentSpot(row);
    return {
        id: spot.id, day: spot.day, indicator: spot.indicator, scopeType: spot.scopeType, scopeKey: spot.scopeKey, officeCode: spot.officeCode,
        title: spot.title, headline: spot.headline, metrics: spot.metrics, detectedAt: spot.detectedAt, channel: spot.channel,
    };
}

/** An assignee's row: no seq (its gaps would show how many rows others hold); the row id stays: it is the address of the report. */
function presentRowForAssignee(row) {
    const { seq, ...own } = presentRow(row);
    return own;
}

function presentRow(row) {
    return {
        id: row.id,
        seq: row.seq,
        whoText: row.who_text,
        what: row.what,
        where: row.where_text,
        due: row.due,
        how: row.how,
        expectedResult: row.expected_result,
        status: row.status,
        reportCause: row.report_cause,
        reportText: row.report_text,
        reportedAt: row.reported_at,
    };
}

function presentClosing(row) {
    if (!row) return null;
    return {
        resolved: row.resolved === null ? null : Boolean(row.resolved),
        recovered: row.recovered === null ? null : Boolean(row.recovered),
        handlingTimeText: row.handling_time_text,
        lesson: row.lesson,
        processUpdate: row.process_update,
        doneTime: row.done_time,
    };
}

/** The evidence files of rows: { id, name, size, uploadedAt, uploadedByName }, oldest first. */
async function attachmentsByAction(db, actionIds) {
    const map = new Map();
    if (!actionIds.length) return map;
    const rows = await db.all(
        `SELECT f.id, f.action_id, f.file_name, f.size, f.uploaded_at, f.uploaded_by, COALESCE(NULLIF(u.display_name, ''), u.username) AS by_name
           FROM ops_journal_attachment f LEFT JOIN qis_user u ON u.id = f.uploaded_by
          WHERE f.action_id IN (${actionIds.map(() => '?').join(',')}) ORDER BY f.id`, actionIds);
    for (const r of rows) {
        if (!map.has(r.action_id)) map.set(r.action_id, []);
        map.get(r.action_id).push({ id: r.id, name: r.file_name, size: r.size, uploadedAt: r.uploaded_at, uploadedBy: r.uploaded_by, uploadedByName: r.by_name });
    }
    return map;
}

/** id -> display name of the people who reported on these rows (a report must say by whom). */
async function reporterNames(db, rows) {
    const ids = [...new Set(rows.map((r) => r.reported_by).filter((v) => v !== null && v !== undefined))];
    const map = new Map();
    if (!ids.length) return map;
    const users = await db.all(`SELECT id, COALESCE(NULLIF(display_name, ''), username) AS name FROM qis_user WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    for (const u of users) map.set(u.id, u.name);
    return map;
}

async function assigneesByAction(db, actionIds) {
    const map = new Map();
    if (!actionIds.length) return map;
    const rows = await db.all(`SELECT action_id, user_id FROM ops_journal_action_assignee WHERE action_id IN (${actionIds.map(() => '?').join(',')}) ORDER BY user_id`, actionIds);
    for (const row of rows) {
        if (!map.has(row.action_id)) map.set(row.action_id, []);
        map.get(row.action_id).push(row.user_id);
    }
    return map;
}

/** Manager view of one spot: every row with its assignees, and the closing. */
async function managerSpot(db, spotRow) {
    const actions = await db.all('SELECT * FROM ops_journal_action WHERE spot_id = ? ORDER BY seq', [spotRow.id]);
    const assignees = await assigneesByAction(db, actions.map((a) => a.id));
    const files = await attachmentsByAction(db, actions.map((a) => a.id));
    const reporters = await reporterNames(db, actions);
    // protected = the spot holds a report (an assignee answered), so it can never be dropped, even as a DRAFT again after a reopen
    // (the screens lock and count it); a reopened spot nobody reported on is removable
    const flags = await db.get(
        `SELECT EXISTS (SELECT 1 FROM ops_journal_action a WHERE a.spot_id = ? AND a.reported_at IS NOT NULL) AS protected,
                (SELECT COALESCE(NULLIF(u.display_name, ''), u.username) FROM qis_user u WHERE u.id = ?) AS finalized_by_name`,
        [spotRow.id, spotRow.finalized_by]);
    return {
        ...presentSpot(spotRow),
        protected: Boolean(flags.protected),
        finalizedByName: flags.finalized_by_name || null,
        finalizedAt: spotRow.finalized_at,
        actions: actions.map((a) => ({ ...presentRow(a), assignedAt: a.assigned_at, assigneeUserIds: assignees.get(a.id) || [], attachments: files.get(a.id) || [], reportedByName: reporters.get(a.reported_by) || null })),
        closing: presentClosing(await db.get('SELECT * FROM ops_journal_closing WHERE spot_id = ?', [spotRow.id])),
        // what the system proposes for sections 3-4 until the manager saves his own (the screens prefill it, the export falls back to it)
        closingDraft: draftClosing({ day: spotRow.day, indicator: spotRow.indicator, scopeType: spotRow.scope_type, metrics: spotRow.metrics_json ? JSON.parse(spotRow.metrics_json) : null }),
    };
}

/** Rows of a FINALIZED spot that name `userId`; empty when none (the caller then answers NOT_FOUND). */
async function ownRows(db, spotId, userId) {
    return db.all(
        `SELECT a.* FROM ops_journal_action a
           JOIN ops_journal_action_assignee x ON x.action_id = a.id AND x.user_id = ?
           JOIN ops_journal_spot s ON s.id = a.spot_id
          WHERE a.spot_id = ? AND a.assigned_at IS NOT NULL AND s.status IN ('FINALIZED', 'CLOSED')
          ORDER BY a.seq`,
        [userId, spotId]);
}

/** GET /days/:date -- manager only. A day nobody opened is an empty draft, not an error. */
async function getDay(db, { access }, dayValue) {
    if (!isManager(access)) throw new NotFoundError();
    const day = asDay(dayValue);
    const dayRow = await db.get('SELECT * FROM ops_journal_day WHERE day = ?', [day]);
    const spots = await db.all('SELECT * FROM ops_journal_spot WHERE day = ? ORDER BY sort, id', [day]);
    const out = [];
    for (const spot of spots) out.push(await managerSpot(db, spot));
    return { date: day, status: dayRow ? dayRow.status : 'DRAFT', spots: out };
}

/** GET /spots/:id -- the manager reads the whole spot, an assignee only the phiếu with their own rows. */
async function getSpot(db, { access, userId }, idValue) {
    const id = asSpotId(idValue);
    if (isManager(access)) {
        const spotRow = await db.get('SELECT * FROM ops_journal_spot WHERE id = ?', [id]);
        if (!spotRow) throw new NotFoundError();
        return managerSpot(db, spotRow);
    }
    // not the manager: the rows come first, so a missing spot and a spot that is not theirs cost the same one query
    const rows = userId == null ? [] : await ownRows(db, id, userId);
    if (!rows.length) throw new NotFoundError();
    const spotRow = await db.get('SELECT * FROM ops_journal_spot WHERE id = ?', [id]);
    const files = await attachmentsByAction(db, rows.map((r) => r.id));
    const reporters = await reporterNames(db, rows);
    return { ...presentSpotForAssignee(spotRow), myRows: rows.map((r) => ({ ...presentRowForAssignee(r), attachments: files.get(r.id) || [], reportedByName: reporters.get(r.reported_by) || null })) };
}

/** GET /my-tasks -- one task per finalized spot that has rows assigned to the user; [] when none (the menu entry stays hidden). */
async function listMyTasks(db, { userId }) {
    if (userId == null) return { tasks: [] };
    const rows = await db.all(
        `SELECT a.*, s.day AS s_day FROM ops_journal_action a
           JOIN ops_journal_action_assignee x ON x.action_id = a.id AND x.user_id = ?
           JOIN ops_journal_spot s ON s.id = a.spot_id
          WHERE a.assigned_at IS NOT NULL AND s.status IN ('FINALIZED', 'CLOSED')
          ORDER BY s.day DESC, a.spot_id DESC, a.seq`,
        [userId]);
    const bySpot = new Map();
    for (const row of rows) {
        if (!bySpot.has(row.spot_id)) bySpot.set(row.spot_id, []);
        bySpot.get(row.spot_id).push(row);
    }
    const tasks = [];
    const files = await attachmentsByAction(db, rows.map((r) => r.id));
    const reporters = await reporterNames(db, rows);
    for (const [spotId, spotRows] of bySpot) {
        const spot = presentSpotForAssignee(await db.get('SELECT * FROM ops_journal_spot WHERE id = ?', [spotId]));
        tasks.push({
            spotId,
            day: spot.day,
            indicator: spot.indicator,
            title: spot.title,
            headline: spot.headline,
            metrics: spot.metrics,
            status: spotRows.every((r) => r.status === 'DONE') ? 'DONE' : (spotRows.some((r) => r.status === 'REPORTED') ? 'REPORTED' : spotRows[0].status),
            myRows: spotRows.map((r) => ({ ...presentRowForAssignee(r), attachments: files.get(r.id) || [], reportedByName: reporters.get(r.reported_by) || null })),
        });
    }
    return { tasks };
}

const MAX_RANGE_DAYS = 62;
// PO 2026-10-30: a spot keeps its 4 rows and 4 reports, but the LAST TWO are the ones that count: the Chuyên quản of TTVH reporting on
// them means rows 1 and 2 were already worked, so the task is done once those two are reported
const KEY_ROWS = 2;

/** Who still owes a report: [{ name, seqs: [1, 2] }] over the rows nobody has reported on yet (not REPORTED, not DONE). */
function pendingOf(spotRows, rowPeople) {
    const byName = new Map();
    for (const row of spotRows) {
        if (row.status === 'REPORTED' || row.status === 'DONE') continue;
        for (const person of rowPeople.filter((p) => p.action_id === row.id)) {
            if (!byName.has(person.name)) byName.set(person.name, []);
            byName.get(person.name).push(row.seq);
        }
    }
    return [...byName.entries()].map(([name, seqs]) => ({ name, seqs }));
}

/**
 * GET /assigned?from=&to= -- manager only. One light line per finalized or closed spot of the range (no rows, no report text): how many
 * rows, how they stand (not reported / reported and waiting / done), how many evidence files, the last report time and who the work is
 * with. The screen lists these and opens one spot on demand (GET /spots/:id), so ten days of work stay readable.
 */
async function listAssigned(db, { access }, fromValue, toValue) {
    if (!isManager(access)) throw new NotFoundError();
    const to = asDay(toValue);
    const from = asDay(fromValue);
    if (from > to) throw new NotFoundError();
    const span = (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000;
    if (span > MAX_RANGE_DAYS) throw new NotFoundError();
    const spots = await db.all(
        `SELECT * FROM ops_journal_spot WHERE day BETWEEN ? AND ? AND status IN ('FINALIZED', 'CLOSED') ORDER BY day DESC, sort, id LIMIT 500`, [from, to]);
    if (!spots.length) return { from, to, days: [], items: [] };
    const marks = spots.map(() => '?').join(',');
    const ids = spots.map((s) => s.id);
    const rows = await db.all(`SELECT id, spot_id, seq, status, reported_at FROM ops_journal_action WHERE spot_id IN (${marks}) ORDER BY seq`, ids);
    const rowPeople = await db.all(
        `SELECT x.action_id, COALESCE(NULLIF(u.display_name, ''), u.username) AS name FROM ops_journal_action_assignee x JOIN qis_user u ON u.id = x.user_id
          WHERE x.action_id IN (SELECT id FROM ops_journal_action WHERE spot_id IN (${marks}))`, ids);
    const files = await db.all(`SELECT spot_id, COUNT(*) AS n FROM ops_journal_attachment WHERE spot_id IN (${marks}) GROUP BY spot_id`, ids);
    const people = await db.all(
        `SELECT DISTINCT a.spot_id, COALESCE(NULLIF(u.display_name, ''), u.username) AS name
           FROM ops_journal_action a JOIN ops_journal_action_assignee x ON x.action_id = a.id JOIN qis_user u ON u.id = x.user_id
          WHERE a.spot_id IN (${marks}) ORDER BY name`, ids);
    const dayRows = await db.all('SELECT day, status FROM ops_journal_day WHERE day BETWEEN ? AND ?', [from, to]);
    const items = spots.map((spot) => {
        const own = rows.filter((r) => r.spot_id === spot.id);
        const count = (status) => own.filter((r) => r.status === status).length;
        const keyRows = [...own].sort((a, b) => a.seq - b.seq).slice(-KEY_ROWS);
        const reportedCount = keyRows.filter((r) => r.status === 'REPORTED' || r.status === 'DONE').length;
        const reportsNeeded = keyRows.length;
        const enough = keyRows.length > 0 && reportedCount === reportsNeeded;
        return {
            id: spot.id, day: spot.day, indicator: spot.indicator, title: spot.title, status: spot.status, officeCode: spot.office_code,
            rowCount: own.length,
            counts: { assigned: count('ASSIGNED') + count('DRAFT'), inProgress: count('IN_PROGRESS'), reported: count('REPORTED'), done: count('DONE') },
            fileCount: files.find((f) => f.spot_id === spot.id)?.n || 0,
            lastReportedAt: own.reduce((max, r) => Math.max(max, r.reported_at || 0), 0) || null,
            assignees: people.filter((p) => p.spot_id === spot.id).map((p) => p.name),
            reportedCount, reportsNeeded, enough,
            keySeqs: keyRows.map((r) => r.seq),
            pending: enough ? [] : pendingOf(keyRows, rowPeople), // only the last two rows are owed, and nothing once they are in
        };
    });
    const days = [...new Set(items.map((i) => i.day))].map((day) => ({ day, status: dayRows.find((d) => d.day === day)?.status || 'ASSIGNED' }));
    return { from, to, days, items };
}

/** Manager-only gate for the routes that have no row-level rule (candidates ...): everyone else gets the usual NOT_FOUND. */
function assertManager({ access }) {
    if (!isManager(access)) throw new NotFoundError();
}

module.exports = { NotFoundError, isManager, assertManager, asDay, asSpotId, getDay, getSpot, listMyTasks, listAssigned };
