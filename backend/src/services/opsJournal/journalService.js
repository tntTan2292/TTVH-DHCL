'use strict';

// OPS-JOURNAL-01 (A3): the write side of the Nhật ký điều hành. Everything here is for the manager (Giám đốc TTVH, admin)
// except `report`, which an assignee does on a row that names them. Rules:
//  - a day holds at least 1 spot, as many as the manager decides (PO 2026-10-30, replaces 5-10); candidates are re-derived on the server, a client cannot invent figures;
//  - a spot is DRAFT until the manager finalizes it (chốt = giao việc); a finalized spot is locked (409) until the manager
//    reopens it with a reason; a reopened spot keeps its reports;
//  - an assignee reports IN_PROGRESS / REPORTED on their own row of a finalized spot; the manager marks it DONE;
//  - every change appends a row to ops_journal_action_log (a trigger refuses UPDATE / DELETE there).
// The database has ONE shared connection, so every write transaction queues on the same lock as the imports (handlingService).
const { withImportWriteLock } = require('../importWriteLock');
const { POSITIONS } = require('../auth/access/roles');
const { BCVH_BY_CODE, HANGTON_OFFICES_BY_BCVH } = require('../auth/access/officeMap');
const { NotFoundError, asDay, asSpotId, getDay } = require('./visibility');
const candidateService = require('./candidateService');
const { buildRows } = require('./rowTemplates');

const MIN_SPOTS = 1;
const MAX_SPOTS = 50; // sanity cap only: how many spots to assign is the manager's call (PO 2026-10-30)
const MAX_ROWS = 12;
const MAX_ASSIGNEES = 20;
const MAX_SHORT = 300;
const MAX_TEXT = 4000;
const INDICATORS = Object.freeze(['F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON']);
const REPORT_STATUSES = Object.freeze(['IN_PROGRESS', 'REPORTED']);

class JournalError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const now = () => Date.now();
const text = (value, max, field) => {
    const out = String(value ?? '').trim();
    if (out.length > max) throw new JournalError('TOO_LONG', `${field} quá dài (tối đa ${max} ký tự).`);
    return out;
};

function actorOf(user) {
    return { id: user.id, name: user.display_name || user.username || null, position: user.access?.position || user.position || null };
}

function inTransaction(db, work) {
    return withImportWriteLock(async () => {
        await db.run('BEGIN IMMEDIATE');
        try {
            const result = await work();
            await db.run('COMMIT');
            return result;
        } catch (error) {
            await db.run('ROLLBACK').catch(() => {});
            throw error;
        }
    });
}

async function logChange(db, { spotId, actionId = null, kind, before = null, after = null, actor }) {
    await db.run(
        `INSERT INTO ops_journal_action_log (spot_id, action_id, kind, before_json, after_json, actor_id, actor_name, actor_position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [spotId, actionId, kind, before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after), actor.id, actor.name, actor.position, now()]);
}

async function dayRow(db, day) {
    return db.get('SELECT * FROM ops_journal_day WHERE day = ?', [day]);
}

async function requireOpenDay(db, day) {
    const row = await dayRow(db, day);
    if (row && row.status === 'CLOSED') throw new JournalError('DAY_CLOSED', 'Nhật ký ngày này đã đóng.', 409);
    return row;
}

async function spotById(db, id) {
    const spot = await db.get('SELECT * FROM ops_journal_spot WHERE id = ?', [id]);
    if (!spot) throw new NotFoundError();
    return spot;
}

// ---- 1. choose the day's spots ---------------------------------------------------------------------------------------------

function manualSpot(entry, index) {
    const indicator = String(entry?.indicator || '');
    if (!INDICATORS.includes(indicator)) throw new JournalError('BAD_MANUAL', `Điểm thêm tay #${index + 1}: chỉ tiêu không hợp lệ.`);
    const title = text(entry.title, MAX_SHORT, 'Tiêu đề');
    if (!title) throw new JournalError('BAD_MANUAL', `Điểm thêm tay #${index + 1}: thiếu tiêu đề.`);
    const officeCode = text(entry.officeCode, 40, 'Mã đơn vị');
    return {
        indicator, scopeType: 'BCVH', scopeKey: officeCode || `manual:${title.toLowerCase()}`, officeCode: officeCode || null,
        title, headline: text(entry.headline, MAX_TEXT, 'Nhận định'), metrics: null, source: 'MANUAL',
    };
}

/**
 * PUT /days/:date/spots. The selection is the full list of the day: finalized spots stay (they cannot be dropped), draft
 * spots not in the list are removed, new ones are created with the figures SNAPSHOTTED from the server's own candidates.
 */
async function selectSpots(db, { date, candidateIds = [], manual = [], actor, adapters }) {
    const day = asDay(date);
    await requireOpenDay(db, day);
    if (!Array.isArray(candidateIds) || !Array.isArray(manual)) throw new JournalError('BAD_REQUEST', 'Danh sách chọn không hợp lệ.');
    const wantedIds = [...new Set(candidateIds.map(String))];
    const manualSpots = manual.map(manualSpot);
    // candidates are derived before the transaction (it reads the indicator services, which must not wait on the write lock)
    const fresh = wantedIds.length ? (await candidateService.buildCandidates({ db, date: day, adapters })).items : [];
    const byId = new Map(fresh.map((item) => [item.candidateId, item]));
    const unknown = wantedIds.filter((id) => !byId.has(id));
    if (unknown.length) throw new JournalError('UNKNOWN_CANDIDATE', 'Có điểm đen không còn trong danh sách gợi ý. Hãy tải lại danh sách.', 409);

    return inTransaction(db, async () => {
        await requireOpenDay(db, day);
        const existing = await db.all('SELECT * FROM ops_journal_spot WHERE day = ?', [day]);
        const keyOf = (s) => `${s.indicator}|${s.scope_type}|${s.scope_key}`;
        const wanted = [
            ...wantedIds.map((id) => {
                const c = byId.get(id);
                return {
                    indicator: c.indicator, scopeType: c.scopeType, scopeKey: c.scopeKey, officeCode: c.officeCode, title: c.title, headline: c.headline,
                    metrics: { ...c.metrics, score: c.score, rankScore: c.rankScore }, source: 'SYSTEM',
                };
            }),
            ...manualSpots,
        ];
        const wantedKeys = new Set(wanted.map((w) => `${w.indicator}|${w.scopeType}|${w.scopeKey}`));
        if (wantedKeys.size !== wanted.length) throw new JournalError('DUPLICATE_SPOT', 'Một điểm đen được chọn hai lần.');
        // a spot that was ever finalized or holds a report is never dropped, even when it was reopened (it is a DRAFT again)
        const protectedRows = await db.all(
            `SELECT id FROM ops_journal_spot s WHERE s.day = ? AND (
                EXISTS (SELECT 1 FROM ops_journal_action_log l WHERE l.spot_id = s.id AND l.kind = 'FINALIZED')
                OR EXISTS (SELECT 1 FROM ops_journal_action a WHERE a.spot_id = s.id AND a.reported_at IS NOT NULL))`, [day]);
        const protectedIds = new Set(protectedRows.map((r) => r.id));
        const kept = existing.filter((s) => s.status !== 'DRAFT' || protectedIds.has(s.id)); // finalized / closed / reported spots cannot be dropped
        const keptKeys = new Set(kept.map(keyOf));
        const toCreate = wanted.filter((w) => !keptKeys.has(`${w.indicator}|${w.scopeType}|${w.scopeKey}`));
        const draftsKept = existing.filter((s) => s.status === 'DRAFT' && !protectedIds.has(s.id) && wantedKeys.has(keyOf(s)));
        const total = kept.length + draftsKept.length + toCreate.filter((w) => !draftsKept.some((s) => keyOf(s) === `${w.indicator}|${w.scopeType}|${w.scopeKey}`)).length;
        if (total < MIN_SPOTS || total > MAX_SPOTS) {
            throw new JournalError('OUT_OF_RANGE', total < MIN_SPOTS ? 'Cần chọn ít nhất 1 điểm đen.' : `Một ngày chỉ nhận tối đa ${MAX_SPOTS} điểm đen (hiện ${total}, gồm ${kept.length} điểm đã chốt).`);
        }
        const t = now();
        if (!(await dayRow(db, day))) await db.run('INSERT INTO ops_journal_day (day, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [day, 'DRAFT', actor.id, t, t]);
        for (const draft of existing.filter((s) => s.status === 'DRAFT' && !protectedIds.has(s.id) && !wantedKeys.has(keyOf(s)))) {
            const goneRows = await db.all('SELECT * FROM ops_journal_action WHERE spot_id = ? ORDER BY seq', [draft.id]);
            await db.run('DELETE FROM ops_journal_action_assignee WHERE action_id IN (SELECT id FROM ops_journal_action WHERE spot_id = ?)', [draft.id]);
            await db.run('DELETE FROM ops_journal_action WHERE spot_id = ?', [draft.id]);
            await db.run('DELETE FROM ops_journal_spot WHERE id = ?', [draft.id]);
            await logChange(db, { spotId: draft.id, kind: 'SPOT_REMOVED', before: { title: draft.title, headline: draft.headline, metrics: draft.metrics_json, rows: goneRows.map((r) => ({ seq: r.seq, who: r.who_text, what: r.what })) }, actor });
        }
        let sort = 0;
        for (const w of wanted) {
            sort += 1;
            const key = `${w.indicator}|${w.scopeType}|${w.scopeKey}`;
            const present = existing.find((s) => keyOf(s) === key);
            if (present) {
                await db.run('UPDATE ops_journal_spot SET sort = ? WHERE id = ?', [sort, present.id]);
                if (present.status === 'DRAFT' && !(await db.get('SELECT 1 AS x FROM ops_journal_action WHERE spot_id = ?', [present.id]))) {
                    await seedRows(db, present.id, { indicator: present.indicator, title: present.title, officeCode: present.office_code }, actor);
                }
                continue;
            }
            const result = await db.run(
                `INSERT INTO ops_journal_spot (day, indicator, scope_type, scope_key, office_code, title, headline, metrics_json, source, status, detected_at, channel, sort, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)`,
                [day, w.indicator, w.scopeType, w.scopeKey, w.officeCode, w.title, w.headline, w.metrics ? JSON.stringify(w.metrics) : null, w.source,
                    w.source === 'SYSTEM' ? '07:30' : null, w.source === 'SYSTEM' ? 'Dashboard' : null, sort, t]);
            await logChange(db, { spotId: result.lastID, kind: 'SPOT_ADDED', after: { title: w.title, source: w.source, headline: w.headline, metrics: w.metrics }, actor });
            await seedRows(db, result.lastID, { indicator: w.indicator, title: w.title, officeCode: w.officeCode }, actor);
        }
        await db.run('UPDATE ops_journal_day SET updated_at = ? WHERE day = ?', [t, day]);
        return true;
    }).then(() => getDay(db, { access: { capabilities: ['journal.manage'] } }, day));
}

/** The system drafts the 3 "6 rõ" rows of a spot (right wording for its indicator, the unit's people already on them). */
async function seedRows(db, spotId, spot, actor) {
    const people = await assignableUsers(db, { officeCode: spot.officeCode, indicator: spot.indicator });
    const rows = buildRows(spot, people);
    for (let i = 0; i < rows.length; i += 1) {
        const r = rows[i];
        const result = await db.run('INSERT INTO ops_journal_action (spot_id, seq, who_text, what, where_text, due, how, expected_result, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [spotId, i + 1, r.whoText, r.what, r.where, r.due, r.how, r.expectedResult, 'DRAFT']);
        for (const userId of r.assigneeUserIds) await db.run('INSERT INTO ops_journal_action_assignee (action_id, user_id) VALUES (?, ?)', [result.lastID, userId]);
    }
    await logChange(db, { spotId, kind: 'ACTIONS_SAVED', before: [], after: rows.map((r, i) => ({ seq: i + 1, who: r.whoText, what: r.what, where: r.where, due: r.due, how: r.how, expectedResult: r.expectedResult, assignees: r.assigneeUserIds, drafted: 'SYSTEM' })), actor });
}

// ---- 2. the "6 rõ" rows ------------------------------------------------------------------------------------------------------

async function validAssignees(db, ids) {
    if (!Array.isArray(ids)) throw new JournalError('BAD_ROW', 'Danh sách người được giao không hợp lệ.');
    if (ids.some((v) => !(Number.isInteger(v) || (typeof v === 'string' && /^[1-9]\d{0,14}$/.test(v))))) throw new JournalError('BAD_ROW', 'Danh sách người được giao không hợp lệ.');
    const clean = [...new Set(ids.map((v) => Number(v)))];
    if (clean.length > MAX_ASSIGNEES || clean.some((v) => !Number.isInteger(v) || v <= 0)) throw new JournalError('BAD_ROW', 'Danh sách người được giao không hợp lệ.');
    if (!clean.length) return [];
    const rows = await db.all(`SELECT id FROM qis_user WHERE is_active = 1 AND id IN (${clean.map(() => '?').join(',')})`, clean);
    if (rows.length !== clean.length) throw new JournalError('UNKNOWN_ASSIGNEE', 'Có người được giao không tồn tại hoặc đã bị khóa.');
    return clean;
}

function rowFields(entry, index) {
    if (!entry || typeof entry !== 'object') throw new JournalError('BAD_ROW', `Dòng ${index + 1} không hợp lệ.`);
    return {
        who_text: text(entry.whoText, MAX_SHORT, 'Ai'),
        what: text(entry.what, MAX_TEXT, 'Làm gì'),
        where_text: text(entry.where, MAX_SHORT, 'Ở đâu'),
        due: text(entry.due, MAX_SHORT, 'Khi nào xong'),
        how: text(entry.how, MAX_TEXT, 'Bằng cách nào'),
        expected_result: text(entry.expectedResult, MAX_TEXT, 'Kết quả gì'),
    };
}

/**
 * PUT /spots/:id/actions: the whole list of rows of a DRAFT spot. Row n of the list updates the existing row n in place (so a
 * reopened spot keeps its reports); a row that already carries a report cannot be dropped.
 */
async function saveActions(db, { spotId, actions, actor }) {
    const id = asSpotId(spotId);
    if (!Array.isArray(actions) || actions.length > MAX_ROWS) throw new JournalError('BAD_ROW', `Tối đa ${MAX_ROWS} dòng "6 rõ".`);
    const fields = actions.map(rowFields);
    return inTransaction(db, async () => {
        const spot = await spotById(db, id);
        await requireOpenDay(db, spot.day);
        if (spot.status !== 'DRAFT') throw new JournalError('LOCKED', 'Điểm đen đã chốt. Hãy mở lại để sửa.', 409);
        const assigneeLists = [];
        for (const entry of actions) assigneeLists.push(await validAssignees(db, entry.assigneeUserIds ?? []));
        const before = await db.all('SELECT * FROM ops_journal_action WHERE spot_id = ? ORDER BY seq', [id]);
        const beforeAssignees = await assigneesOf(db, before.map((r) => r.id));
        for (const old of before.filter((r) => r.seq > fields.length)) {
            if (old.reported_at) throw new JournalError('ROW_HAS_REPORT', `Dòng ${old.seq} đã có báo cáo nên không xóa được.`, 409);
        }
        for (const old of before.filter((r) => r.seq > fields.length)) {
            await db.run('DELETE FROM ops_journal_action_assignee WHERE action_id = ?', [old.id]);
            await db.run('DELETE FROM ops_journal_action WHERE id = ?', [old.id]);
        }
        for (let i = 0; i < fields.length; i += 1) {
            const f = fields[i];
            const seq = i + 1;
            const old = before.find((r) => r.seq === seq);
            let actionId;
            if (old) {
                const kept = beforeAssignees.get(old.id) || [];
                const sameWork = old.what === f.what && assigneeLists[i].length === kept.length && assigneeLists[i].every((u) => kept.includes(u));
                // a confirmed row is final; a reported row only keeps its report while the same work stays with the reporter
                if (old.status === 'DONE' && !sameWork) throw new JournalError('ROW_DONE', `Dòng ${old.seq} đã được xác nhận hoàn thành nên không đổi nội dung hoặc người được giao.`, 409);
                const reporterStays = old.reported_by === null || assigneeLists[i].includes(old.reported_by);
                const resetReport = Boolean(old.reported_at) && old.status !== 'DONE' && (old.what !== f.what || !reporterStays);
                await db.run('UPDATE ops_journal_action SET who_text = ?, what = ?, where_text = ?, due = ?, how = ?, expected_result = ? WHERE id = ?',
                    [f.who_text, f.what, f.where_text, f.due, f.how, f.expected_result, old.id]);
                if (resetReport) {
                    await db.run("UPDATE ops_journal_action SET status = 'DRAFT', report_cause = NULL, report_text = NULL, reported_by = NULL, reported_at = NULL WHERE id = ?", [old.id]);
                    await logChange(db, { spotId: id, actionId: old.id, kind: 'REPORT_RESET', before: { status: old.status, cause: old.report_cause, text: old.report_text, reportedBy: old.reported_by }, actor });
                }
                actionId = old.id;
                await db.run('DELETE FROM ops_journal_action_assignee WHERE action_id = ?', [actionId]);
            } else {
                const result = await db.run('INSERT INTO ops_journal_action (spot_id, seq, who_text, what, where_text, due, how, expected_result, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, seq, f.who_text, f.what, f.where_text, f.due, f.how, f.expected_result, 'DRAFT']);
                actionId = result.lastID;
            }
            for (const userId of assigneeLists[i]) await db.run('INSERT INTO ops_journal_action_assignee (action_id, user_id) VALUES (?, ?)', [actionId, userId]);
        }
        const rowLog = (r, assignees) => ({ seq: r.seq, who: r.who_text, what: r.what, where: r.where_text, due: r.due, how: r.how, expectedResult: r.expected_result, assignees });
        await logChange(db, {
            spotId: id, kind: 'ACTIONS_SAVED',
            before: before.map((r) => rowLog(r, beforeAssignees.get(r.id) || [])),
            after: fields.map((f, i) => rowLog({ seq: i + 1, who_text: f.who_text, what: f.what, where_text: f.where_text, due: f.due, how: f.how, expected_result: f.expected_result }, assigneeLists[i])), actor,
        });
        return true;
    }).then(async () => getDay(db, { access: { capabilities: ['journal.manage'] } }, await spotDayOf(db, id)));
}

async function assigneesOf(db, actionIds) {
    const map = new Map();
    if (!actionIds.length) return map;
    const rows = await db.all(`SELECT action_id, user_id FROM ops_journal_action_assignee WHERE action_id IN (${actionIds.map(() => '?').join(',')}) ORDER BY user_id`, actionIds);
    for (const r of rows) {
        if (!map.has(r.action_id)) map.set(r.action_id, []);
        map.get(r.action_id).push(r.user_id);
    }
    return map;
}

/** DELETE /spots/:id: take one DRAFT spot out of the day's list (a spot that was ever finalized or holds a report stays). */
async function removeSpot(db, { spotId, actor }) {
    const id = asSpotId(spotId);
    return inTransaction(db, async () => {
        const spot = await spotById(db, id);
        await requireOpenDay(db, spot.day);
        if (spot.status !== 'DRAFT') throw new JournalError('LOCKED', 'Điểm đen đã chốt nên không xóa được. Hãy mở lại để sửa.', 409);
        const protectedSpot = await db.get(
            `SELECT 1 AS x WHERE EXISTS (SELECT 1 FROM ops_journal_action_log l WHERE l.spot_id = ? AND l.kind = 'FINALIZED')
                OR EXISTS (SELECT 1 FROM ops_journal_action a WHERE a.spot_id = ? AND a.reported_at IS NOT NULL)`, [id, id]);
        if (protectedSpot) throw new JournalError('PROTECTED', 'Điểm đen đã từng được chốt hoặc đã có báo cáo nên không xóa được.', 409);
        const goneRows = await db.all('SELECT * FROM ops_journal_action WHERE spot_id = ? ORDER BY seq', [id]);
        await db.run('DELETE FROM ops_journal_action_assignee WHERE action_id IN (SELECT id FROM ops_journal_action WHERE spot_id = ?)', [id]);
        await db.run('DELETE FROM ops_journal_action WHERE spot_id = ?', [id]);
        await db.run('DELETE FROM ops_journal_spot WHERE id = ?', [id]);
        await logChange(db, { spotId: id, kind: 'SPOT_REMOVED', before: { title: spot.title, headline: spot.headline, metrics: spot.metrics_json, rows: goneRows.map((r) => ({ seq: r.seq, who: r.who_text, what: r.what })) }, actor });
        await db.run('UPDATE ops_journal_day SET updated_at = ? WHERE day = ?', [now(), spot.day]);
        return spot.day;
    }).then((day) => getDay(db, { access: { capabilities: ['journal.manage'] } }, day));
}

async function spotDayOf(db, id) {
    return (await db.get('SELECT day FROM ops_journal_spot WHERE id = ?', [id])).day;
}

// ---- 3. finalize (chốt = giao việc) and reopen -------------------------------------------------------------------------------

/** POST /days/:date/assign: all-or-nothing; every named spot needs rows with a "Làm gì" and at least one assignee each. */
async function finalizeSpots(db, { date, spotIds, actor }) {
    const day = asDay(date);
    if (!Array.isArray(spotIds) || !spotIds.length) throw new JournalError('BAD_REQUEST', 'Chưa chọn điểm đen để chốt.');
    const ids = [...new Set(spotIds.map(asSpotId))];
    await inTransaction(db, async () => {
        await requireOpenDay(db, day);
        const t = now();
        for (const id of ids) {
            const spot = await spotById(db, id);
            if (spot.day !== day) throw new NotFoundError();
            if (spot.status !== 'DRAFT') throw new JournalError('LOCKED', `Điểm đen "${spot.title}" đã được chốt.`, 409);
            const rows = await db.all('SELECT * FROM ops_journal_action WHERE spot_id = ? ORDER BY seq', [id]);
            if (!rows.length) throw new JournalError('SPOT_INCOMPLETE', `Điểm đen "${spot.title}" chưa có dòng "6 rõ" nào.`);
            for (const row of rows) {
                const assignees = await db.get('SELECT COUNT(*) AS n FROM ops_journal_action_assignee WHERE action_id = ?', [row.id]);
                if (!row.what || !assignees.n) throw new JournalError('SPOT_INCOMPLETE', `Điểm đen "${spot.title}", dòng ${row.seq}: cần "Làm gì" và ít nhất một người được giao.`);
            }
            await db.run('UPDATE ops_journal_action SET assigned_at = COALESCE(assigned_at, ?), status = CASE WHEN status = ? THEN ? ELSE status END WHERE spot_id = ?', [t, 'DRAFT', 'ASSIGNED', id]);
            await db.run("UPDATE ops_journal_spot SET status = 'FINALIZED', finalized_at = ?, finalized_by = ? WHERE id = ?", [t, actor.id, id]);
            await logChange(db, { spotId: id, kind: 'FINALIZED', after: { rows: rows.length }, actor });
        }
        await db.run("UPDATE ops_journal_day SET status = 'ASSIGNED', updated_at = ? WHERE day = ?", [t, day]);
    });
    return getDay(db, { access: { capabilities: ['journal.manage'] } }, day);
}

/** POST /spots/:id/reopen: back to DRAFT for a correction; the reason is mandatory and logged. Reports are kept. */
async function reopenSpot(db, { spotId, reason, actor }) {
    const id = asSpotId(spotId);
    const why = text(reason, MAX_SHORT, 'Lý do');
    if (!why) throw new JournalError('REASON_REQUIRED', 'Cần ghi lý do mở lại.');
    await inTransaction(db, async () => {
        const spot = await spotById(db, id);
        await requireOpenDay(db, spot.day);
        if (spot.status !== 'FINALIZED') throw new JournalError('NOT_REOPENABLE', 'Chỉ mở lại được điểm đen đã chốt và chưa đóng.', 409);
        await db.run("UPDATE ops_journal_spot SET status = 'DRAFT', finalized_at = NULL, finalized_by = NULL WHERE id = ?", [id]);
        await db.run('UPDATE ops_journal_action SET assigned_at = NULL WHERE spot_id = ?', [id]);
        await logChange(db, { spotId: id, kind: 'REOPENED', after: { reason: why }, actor });
    });
    return getDay(db, { access: { capabilities: ['journal.manage'] } }, await spotDayOf(db, id));
}

// ---- 4. reports, DONE, closing ------------------------------------------------------------------------------------------------

/** POST /actions/:id/report: an assignee's own row of a finalized spot; anything else is NOT_FOUND (never disclosed). */
async function report(db, { actionId, status, causeText, reportText, actor }) {
    const id = asSpotId(actionId);
    // who may report is decided BEFORE anything else (and before the write lock): a stranger gets NOT_FOUND whatever the body
    // says, and cannot queue behind an import just by posting
    const eligible = () => db.get(
        `SELECT a.* FROM ops_journal_action a
           JOIN ops_journal_action_assignee x ON x.action_id = a.id AND x.user_id = ?
           JOIN ops_journal_spot s ON s.id = a.spot_id
          WHERE a.id = ? AND a.assigned_at IS NOT NULL AND s.status = 'FINALIZED'`, [actor.id, id]);
    if (actor.id == null || !(await eligible())) throw new NotFoundError();
    if (!REPORT_STATUSES.includes(status)) throw new JournalError('BAD_STATUS', 'Trạng thái báo cáo không hợp lệ.');
    const cause = text(causeText, MAX_TEXT, 'Nguyên nhân');
    const body = text(reportText, MAX_TEXT, 'Nội dung báo cáo');
    if (status === 'REPORTED' && !body) throw new JournalError('REPORT_REQUIRED', 'Cần ghi nội dung báo cáo.');
    return inTransaction(db, async () => {
        const row = await eligible(); // re-checked inside the lock: the spot may have been reopened meanwhile
        if (!row) throw new NotFoundError();
        if (row.status === 'DONE') throw new JournalError('LOCKED', 'Dòng này đã được xác nhận hoàn thành.', 409);
        const t = now();
        await db.run('UPDATE ops_journal_action SET status = ?, report_cause = ?, report_text = ?, reported_by = ?, reported_at = ? WHERE id = ?', [status, cause, body, actor.id, t, id]);
        await logChange(db, {
            spotId: row.spot_id, actionId: id, kind: 'REPORT',
            before: { status: row.status, cause: row.report_cause, text: row.report_text }, after: { status, cause, text: body }, actor,
        });
        return { id, status, reportCause: cause, reportText: body, reportedAt: t };
    });
}

/** POST /actions/:id/done (manager): a REPORTED row is accepted. */
async function markDone(db, { actionId, actor }) {
    const id = asSpotId(actionId);
    return inTransaction(db, async () => {
        const row = await db.get('SELECT a.*, s.status AS spot_status, s.day AS spot_day FROM ops_journal_action a JOIN ops_journal_spot s ON s.id = a.spot_id WHERE a.id = ?', [id]);
        if (!row) throw new NotFoundError();
        if (row.spot_status !== 'FINALIZED') throw new JournalError('LOCKED', 'Điểm đen chưa chốt hoặc đã đóng.', 409);
        if (row.status !== 'REPORTED') throw new JournalError('NOT_REPORTED', 'Dòng này chưa có báo cáo để xác nhận.', 409);
        await db.run("UPDATE ops_journal_action SET status = 'DONE' WHERE id = ?", [id]);
        await logChange(db, { spotId: row.spot_id, actionId: id, kind: 'DONE', before: { status: row.status }, after: { status: 'DONE' }, actor });
        return { id, status: 'DONE' };
    });
}

const bool = (value) => (value === null || value === undefined || value === '' ? null : (value ? 1 : 0));

/** PUT /spots/:id/closing (manager): PL06 sections 3 and 4, on a finalized spot. */
async function saveClosing(db, { spotId, closing, actor }) {
    const id = asSpotId(spotId);
    const c = closing || {};
    const values = {
        resolved: bool(c.resolved), recovered: bool(c.recovered),
        handling_time_text: text(c.handlingTimeText, MAX_SHORT, 'Thời gian xử lý'),
        lesson: text(c.lesson, MAX_TEXT, 'Bài học'), process_update: text(c.processUpdate, MAX_TEXT, 'Quy trình cần cập nhật'),
        done_time: text(c.doneTime, 40, 'Giờ hoàn thành'),
    };
    await inTransaction(db, async () => {
        const spot = await spotById(db, id);
        await requireOpenDay(db, spot.day);
        if (spot.status !== 'FINALIZED') throw new JournalError('LOCKED', 'Chỉ ghi kết quả cuối ngày cho điểm đen đã chốt và chưa đóng.', 409);
        const before = await db.get('SELECT * FROM ops_journal_closing WHERE spot_id = ?', [id]);
        await db.run(
            `INSERT INTO ops_journal_closing (spot_id, resolved, recovered, handling_time_text, lesson, process_update, signed_by, done_time, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(spot_id) DO UPDATE SET resolved = excluded.resolved, recovered = excluded.recovered, handling_time_text = excluded.handling_time_text,
                 lesson = excluded.lesson, process_update = excluded.process_update, signed_by = excluded.signed_by, done_time = excluded.done_time, updated_at = excluded.updated_at`,
            [id, values.resolved, values.recovered, values.handling_time_text, values.lesson, values.process_update, actor.id, values.done_time, now()]);
        await logChange(db, { spotId: id, kind: 'CLOSING_SAVED', before: before || null, after: values, actor });
    });
    return getDay(db, { access: { capabilities: ['journal.manage'] } }, await spotDayOf(db, id));
}

/** POST /days/:date/close (manager): every spot must be finalized; then the day and its spots are CLOSED (read-only). */
async function closeDay(db, { date, actor }) {
    const day = asDay(date);
    await inTransaction(db, async () => {
        const row = await requireOpenDay(db, day);
        if (!row) throw new NotFoundError();
        const spots = await db.all('SELECT * FROM ops_journal_spot WHERE day = ?', [day]);
        const open = spots.filter((s) => s.status !== 'FINALIZED');
        if (!spots.length || open.length) throw new JournalError('DAY_NOT_READY', `Còn ${open.length} điểm đen chưa chốt nên chưa đóng được ngày.`, 409);
        const t = now();
        await db.run("UPDATE ops_journal_spot SET status = 'CLOSED' WHERE day = ?", [day]);
        await db.run("UPDATE ops_journal_day SET status = 'CLOSED', updated_at = ? WHERE day = ?", [t, day]);
        for (const s of spots) await logChange(db, { spotId: s.id, kind: 'DAY_CLOSED', actor });
    });
    return getDay(db, { access: { capabilities: ['journal.manage'] } }, day);
}

// ---- 5. who can be assigned --------------------------------------------------------------------------------------------------

/**
 * GET /assignable-users: active Giám đốc BCVH / Chuyên quản accounts whose BCVH scope covers the office, plus the Chuyên quản who
 * hold the indicator as their specialty. `all=1` lists every such account (for an office that maps to no BCVH).
 */
async function assignableUsers(db, { officeCode, indicator, all }) {
    const office = String(officeCode || '').trim();
    const bcvh = new Set();
    if (BCVH_BY_CODE[office]) bcvh.add(office);
    for (const [code, offices] of Object.entries(HANGTON_OFFICES_BY_BCVH)) if (offices.includes(office)) bcvh.add(code);
    const positions = ['GD_BCVH', 'CHUYEN_QUAN'];
    const rows = await db.all(
        `SELECT u.id, u.username, u.display_name, u.position,
                (SELECT GROUP_CONCAT(b.ma_bcvh) FROM qis_user_bcvh b WHERE b.user_id = u.id) AS bcvh,
                (SELECT GROUP_CONCAT(i.indicator) FROM qis_user_indicator i WHERE i.user_id = u.id) AS indicators
           FROM qis_user u WHERE u.is_active = 1 AND u.position IN (${positions.map(() => '?').join(',')}) ORDER BY u.display_name, u.username`, positions);
    const wantedIndicator = INDICATORS.includes(indicator) ? indicator : null;
    return rows
        .filter((u) => all || (u.bcvh || '').split(',').some((code) => bcvh.has(code)) || (wantedIndicator && (u.indicators || '').split(',').includes(wantedIndicator)))
        .map((u) => ({ id: u.id, username: u.username, name: u.display_name || u.username, position: u.position, positionLabel: POSITIONS[u.position]?.label || u.position }));
}

module.exports = {
    JournalError, actorOf, selectSpots, removeSpot, saveActions, finalizeSpots, reopenSpot, report, markDone, saveClosing, closeDay, assignableUsers,
    LIMITS: { MIN_SPOTS, MAX_SPOTS, MAX_ROWS },
};
