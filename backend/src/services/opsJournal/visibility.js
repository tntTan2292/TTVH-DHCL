'use strict';

// OPS-JOURNAL-01 (A1): the one place that decides who may read what of the Nhật ký điều hành.
//  - the manager (capability journal.manage: Giám đốc TTVH, admin) reads every day, spot and row;
//  - any other signed-in user reads ONLY the rows assigned to them, and only after the spot was finalized (assigned_at set),
//    together with the headline / metrics of that spot (the "phiếu"); never the other rows, other assignees, the closing,
//    a draft spot, a count or an id of anything else;
//  - everything else is NOT_FOUND (404, never 403) with the same body as an id that does not exist, so existence is not disclosed.
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
    if (!DAY_PATTERN.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) throw new NotFoundError();
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
    return {
        ...presentSpot(spotRow),
        finalizedAt: spotRow.finalized_at,
        actions: actions.map((a) => ({ ...presentRow(a), assignedAt: a.assigned_at, assigneeUserIds: assignees.get(a.id) || [] })),
        closing: presentClosing(await db.get('SELECT * FROM ops_journal_closing WHERE spot_id = ?', [spotRow.id])),
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
    const spotRow = await db.get('SELECT * FROM ops_journal_spot WHERE id = ?', [id]);
    if (!spotRow) throw new NotFoundError();
    if (isManager(access)) return managerSpot(db, spotRow);
    const rows = userId == null ? [] : await ownRows(db, id, userId);
    if (!rows.length) throw new NotFoundError();
    return { ...presentSpot(spotRow), myRows: rows.map(presentRow) };
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
    for (const [spotId, spotRows] of bySpot) {
        const spot = presentSpot(await db.get('SELECT * FROM ops_journal_spot WHERE id = ?', [spotId]));
        tasks.push({
            spotId,
            day: spot.day,
            indicator: spot.indicator,
            title: spot.title,
            headline: spot.headline,
            metrics: spot.metrics,
            status: spotRows.every((r) => r.status === 'DONE') ? 'DONE' : (spotRows.some((r) => r.status === 'REPORTED') ? 'REPORTED' : spotRows[0].status),
            myRows: spotRows.map(presentRow),
        });
    }
    return { tasks };
}

module.exports = { NotFoundError, isManager, getDay, getSpot, listMyTasks };
