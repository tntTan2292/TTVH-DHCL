'use strict';

// HANGTON-HANDLING-01: follow-up of stock handling. Everything a person enters about a parcel is an append-only row of
// hangton_handling_log keyed by item_code (not by snapshot), so it survives the snapshots being replaced and carries
// over to the next mốc / day. Rules (PO 2026-10-27):
//  - "đã rà soát" on a day = a COMPLETE entry (all required fields) dated that day; parcels of >= REVIEW_MIN_RANK days
//    are the ones that must be reviewed;
//  - an entry of today is corrected in place (a new row superseding it); an entry of a past day only changes when a
//    chuyên quản / admin approves an edit request; nothing is ever deleted or overwritten.
const { localDate } = require('../snapshotService');
const { CAPABILITIES, can } = require('../../auth/access/roles');
const catalog = require('./catalog');
const { withImportWriteLock } = require('../../importWriteLock');

const REVIEW_MIN_RANK = 5;
const MAX_BATCH = 2000;
const IN_CHUNK = 400;
const ENTRY_FIELDS = ['cause_code', 'cause_text', 'plan_code', 'plan_text', 'result_code', 'result_text', 'due_date', 'postman_code', 'postman_name', 'note'];

class HandlingError extends Error {
    constructor(code, message, status = 400, details = null) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

// ---- who may do what ------------------------------------------------------------------------------------------------

/** access.hangton.offices: 'all' or the office codes of the account. */
function officeCovered(access, officeCode) {
    const offices = access?.hangton?.offices;
    if (offices === 'all') return true;
    return Array.isArray(offices) && offices.includes(String(officeCode ?? ''));
}

function canWriteOffice(access, officeCode) {
    return can(access, CAPABILITIES.HANGTON_HANDLING_WRITE) && officeCovered(access, officeCode);
}

function canApproveOffice(access, officeCode) {
    return can(access, CAPABILITIES.HANGTON_HANDLING_APPROVE) && officeCovered(access, officeCode);
}

function requireCapability(access, capability) {
    if (!can(access, capability)) throw new HandlingError('FORBIDDEN', 'Tài khoản không có quyền thực hiện thao tác này.', 403);
}

function actorOf(user) {
    return { id: user.id, name: user.display_name || user.username, position: user.access?.position || user.position || null, access: user.access };
}

// ---- helpers --------------------------------------------------------------------------------------------------------

const placeholders = (n) => Array.from({ length: n }, () => '?').join(',');
const rankOfRow = (a, b) => (a.business_date === b.business_date ? a.id - b.id : (a.business_date < b.business_date ? -1 : 1));

async function inChunks(db, codes, buildSql) {
    const out = [];
    for (let i = 0; i < codes.length; i += IN_CHUNK) {
        const part = codes.slice(i, i + IN_CHUNK);
        out.push(...(await db.all(buildSql(placeholders(part.length)), part)));
    }
    return out;
}

/** Map(item_code -> rows of that item sorted oldest -> newest by (business_date, id)). */
async function logRowsByItem(db, codes) {
    const rows = await inChunks(db, codes, (marks) => `SELECT * FROM hangton_handling_log WHERE item_code IN (${marks})`);
    const byItem = new Map();
    for (const row of rows) {
        if (!byItem.has(row.item_code)) byItem.set(row.item_code, []);
        byItem.get(row.item_code).push(row);
    }
    for (const list of byItem.values()) list.sort(rankOfRow);
    return byItem;
}

/** The entry that counts for a day: the last row (highest id) dated that day. */
function effectiveOn(rows, date) {
    let found = null;
    for (const row of rows || []) if (row.business_date === date && (!found || row.id > found.id)) found = row;
    return found;
}

/** The entry carried forward: the newest by (business_date, id). */
function latestOf(rows) {
    return rows && rows.length ? rows[rows.length - 1] : null;
}

async function loadGrouping(db) {
    const maps = { cause: new Map(), plan: new Map(), result: new Map() };
    for (const row of await db.all('SELECT kind, norm_text, group_code FROM hangton_reason_map')) maps[row.kind]?.set(row.norm_text, row.group_code);
    const custom = { cause: new Map(), plan: new Map(), result: new Map() };
    for (const row of await db.all('SELECT kind, code, label FROM hangton_option_group')) custom[row.kind]?.set(row.code, row.label);
    return { maps, custom };
}

/** Entry as the screens show it: answers, their statistics group and label, who/when. */
function presentEntry(row, grouping) {
    if (!row) return null;
    const entry = { ...row };
    for (const kind of catalog.KINDS) {
        const code = row[`${kind}_code`];
        const group = catalog.groupOf(kind, code, row[`${kind}_text`], grouping.maps[kind]);
        entry[`${kind}_label`] = code === catalog.OTHER ? (row[`${kind}_text`] || 'Khác') : catalog.groupLabel(kind, code, grouping.custom[kind]);
        entry[`${kind}_group`] = group;
        entry[`${kind}_group_label`] = catalog.groupLabel(kind, group, grouping.custom[kind]);
    }
    return entry;
}

async function newestSnapshot(db) {
    return db.get('SELECT * FROM hangton_snapshot ORDER BY captured_at DESC, id DESC LIMIT 1');
}

/**
 * The day "đã rà soát" is counted on for a snapshot. Entries are dated by the calendar day they are typed, so for the newest
 * snapshot that is today (between midnight and the first snapshot of the day the newest one is still yesterday's); an older
 * snapshot keeps its own day.
 */
async function reviewDateOf(db, snapshot, now = new Date()) {
    const newest = await newestSnapshot(db);
    if (newest && newest.id === snapshot.id) {
        const today = localDate(now);
        return today > snapshot.business_date ? today : snapshot.business_date;
    }
    return snapshot.business_date;
}

// ---- reading ---------------------------------------------------------------------------------------------------------

/**
 * Adds `handling` to parcel rows of a snapshot (compareService.items): required (>= REVIEW_MIN_RANK), state of the day
 * (DONE = complete entry today, STALE = only older entries, NONE = never) and the last entry.
 */
async function decorateItems(db, rows, businessDate, snapshotDate = businessDate) {
    if (!rows || rows.length === 0) return rows || [];
    const byItem = await logRowsByItem(db, rows.map((row) => row.item_code));
    const grouping = await loadGrouping(db);
    return rows.map((row) => {
        const list = byItem.get(row.item_code) || [];
        const today = effectiveOn(list, businessDate);
        const last = latestOf(list);
        return {
            ...row,
            handling: {
                required: Number(row.ton_rank) >= REVIEW_MIN_RANK,
                state: today ? 'DONE' : (last ? 'STALE' : 'NONE'),
                // marked "Đã xử lý" on an earlier day, yet the parcel is still in stock: the cause must be checked again
                // (only "qua ngày": the entry is older than the snapshot's own day)
                recheck: !today && Boolean(last) && last.result_code === 'DA_XU_LY' && last.business_date < snapshotDate,
                last: presentEntry(today || last, grouping),
                entries: list.length,
            },
        };
    });
}

function customerAndOfficeClause(customers, offices, alias = 'i.') {
    const sql = [];
    const params = [];
    const customerList = (Array.isArray(customers) ? customers : String(customers || '').split('|')).map((v) => String(v).trim()).filter(Boolean);
    if (customerList.length) { sql.push(`${alias}customer_class IN (${placeholders(customerList.length)})`); params.push(...customerList); }
    if (Array.isArray(offices)) {
        const list = offices.map((v) => String(v).trim()).filter(Boolean);
        if (list.length === 0) sql.push('1 = 0');
        else { sql.push(`${alias}office_code IN (${placeholders(list.length)})`); params.push(...list); }
    }
    return { sql: sql.length ? ` AND ${sql.join(' AND ')}` : '', params };
}

/** Review statistics of one snapshot (its business day): who has been reviewed, who has not, and the answers given. */
async function stats(db, snapshot, { customers, offices, reviewDate } = {}) {
    const c = customerAndOfficeClause(customers, offices);
    const today = reviewDate || snapshot.business_date;
    const base = `FROM hangton_snapshot_item i WHERE i.snapshot_id = ? AND i.ton_rank >= ${REVIEW_MIN_RANK}${c.sql}`;
    const doneSql = 'EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = i.item_code AND l.business_date = ?)';
    const anySql = 'EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = i.item_code)';
    const byOffice = await db.all(
        `SELECT i.office AS office, i.office_code AS office_code, COUNT(*) AS needed,
                SUM(CASE WHEN ${doneSql} THEN 1 ELSE 0 END) AS done,
                SUM(CASE WHEN NOT ${doneSql} AND ${anySql} THEN 1 ELSE 0 END) AS stale,
                SUM(CASE WHEN NOT ${anySql} THEN 1 ELSE 0 END) AS never
           ${base} GROUP BY i.office, i.office_code ORDER BY needed DESC`,
        [today, today, snapshot.id, ...c.params]);
    const byLevel = await db.all(
        `SELECT i.ton_level AS ton_level, i.ton_rank AS ton_rank, COUNT(*) AS needed,
                SUM(CASE WHEN ${doneSql} THEN 1 ELSE 0 END) AS done
           ${base} GROUP BY i.ton_level, i.ton_rank ORDER BY i.ton_rank`,
        [today, snapshot.id, ...c.params]);
    const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    const total = { needed: sum(byOffice, 'needed'), done: sum(byOffice, 'done'), stale: sum(byOffice, 'stale'), never: sum(byOffice, 'never') };
    total.pending = total.needed - total.done;
    total.rate = total.needed > 0 ? total.done / total.needed : null;

    // answers given today for the parcels that must be reviewed (latest entry of the day per parcel)
    const entries = await db.all(
        `SELECT l.* FROM hangton_handling_log l JOIN hangton_snapshot_item i ON i.item_code = l.item_code AND i.snapshot_id = ?
          WHERE l.business_date = ? AND i.ton_rank >= ${REVIEW_MIN_RANK}${c.sql}`,
        [snapshot.id, today, ...c.params]);
    const latestByItem = new Map();
    for (const row of entries) if (!latestByItem.has(row.item_code) || row.id > latestByItem.get(row.item_code).id) latestByItem.set(row.item_code, row);
    const grouping = await loadGrouping(db);
    const answers = {};
    for (const kind of catalog.KINDS) {
        const counts = new Map();
        for (const row of latestByItem.values()) {
            const group = catalog.groupOf(kind, row[`${kind}_code`], row[`${kind}_text`], grouping.maps[kind]);
            counts.set(group, (counts.get(group) || 0) + 1);
        }
        answers[`by_${kind}`] = [...counts.entries()]
            .map(([code, n]) => ({ code, label: catalog.groupLabel(kind, code, grouping.custom[kind]), n }))
            .sort((a, b) => b.n - a.n);
    }
    return {
        business_date: today, min_rank: REVIEW_MIN_RANK, total, by_office: byOffice.map((row) => ({
            ...row, pending: row.needed - row.done, rate: row.needed > 0 ? row.done / row.needed : null,
        })), by_level: byLevel, ...answers,
    };
}

/** Every row of the log, newest first, for the audit view (filters: date, office code, actor id). */
async function listLog(db, { date, officeCode, actorId, offices, limit = 200, offset = 0 } = {}) {
    const where = [];
    const params = [];
    if (date) { where.push('business_date = ?'); params.push(date); }
    if (officeCode) { where.push('office_code = ?'); params.push(String(officeCode)); }
    if (actorId) { where.push('actor_id = ?'); params.push(Number(actorId)); }
    if (Array.isArray(offices)) {
        if (offices.length === 0) where.push('1 = 0');
        else { where.push(`office_code IN (${placeholders(offices.length)})`); params.push(...offices); }
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = (await db.get(`SELECT COUNT(*) AS n FROM hangton_handling_log ${clause}`, params)).n;
    const rows = await db.all(
        `SELECT * FROM hangton_handling_log ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, Math.min(Math.max(Number(limit) || 200, 1), 1000), Math.max(Number(offset) || 0, 0)]);
    const grouping = await loadGrouping(db);
    return { total, rows: rows.map((row) => presentEntry(row, grouping)) };
}

/** Full history of one parcel (entries and edit requests), oldest first. Scoped users only see their own offices. */
async function history(db, itemCode, { offices } = {}) {
    const rows = await db.all('SELECT * FROM hangton_handling_log WHERE item_code = ? ORDER BY business_date, id', [itemCode]);
    const visible = Array.isArray(offices) ? rows.filter((row) => offices.includes(String(row.office_code))) : rows;
    const requests = await db.all('SELECT * FROM hangton_edit_request WHERE item_code = ? ORDER BY id', [itemCode]);
    const grouping = await loadGrouping(db);
    const visibleRequests = Array.isArray(offices) ? requests.filter((row) => offices.includes(String(row.office_code))) : requests;
    return {
        item_code: itemCode,
        entries: visible.map((row) => presentEntry(row, grouping)),
        edit_requests: visibleRequests.map((row) => ({ ...row, proposed: safeJson(row.proposed) })),
    };
}

function safeJson(text) {
    try { return JSON.parse(text); } catch { return null; }
}

// ---- writing ---------------------------------------------------------------------------------------------------------

function contextOf(item, snapshot) {
    return {
        snapshot_id: snapshot.id, slot: snapshot.slot, office_code: item.office_code ?? null, office: item.office ?? null,
        ton_level: item.ton_level ?? null, customer_class: item.customer_class ?? null,
    };
}

async function insertLog(db, row) {
    const columns = [
        'item_code', 'business_date', 'snapshot_id', 'slot', 'office_code', 'office', 'ton_level', 'customer_class', 'action',
        ...ENTRY_FIELDS, 'actor_id', 'actor_name', 'actor_position', 'approved_by_id', 'approved_by_name', 'supersedes_id', 'created_at',
    ];
    const result = await db.run(
        `INSERT INTO hangton_handling_log (${columns.join(',')}) VALUES (${placeholders(columns.length)})`,
        columns.map((column) => row[column] ?? null));
    return result.lastID;
}

// The database has ONE shared connection: two transactions at once ("cannot start a transaction within a transaction", or one
// rolled back with the other) are avoided by queueing every write transaction on the same lock the imports and the
// snapshots use. The work inside must not queue on the lock again.
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

/** True when the answers of a file line are the stored ones (so the line was not touched). */
function sameAnswers(last, input) {
    const norm = (value) => String(value ?? '').trim();
    if (norm(input.cause_code) !== norm(last.cause_code) || norm(input.cause_text) !== norm(last.cause_text)) return false;
    // a content that settles the parcel sets the plan itself; the result always follows from the content (never compared)
    if (!catalog.optionOf('cause', last.cause_code)?.auto) {
        for (const field of ['plan_code', 'plan_text']) if (norm(input[field]) !== norm(last[field])) return false;
    }
    const settled = Boolean(catalog.optionOf('cause', last.cause_code)?.auto);
    return (settled || norm(input.due_date) === norm(last.due_date)) && norm(input.note) === norm(last.note);
}

/**
 * Saves reviews. `entries` = [{ item_code, input }] where input holds the answers (see catalog.validateEntry), or
 * mode 'KEEP' with [{ item_code }] to repeat the latest entry unchanged; mode 'IMPORT' = 'REVIEW' that skips the lines of a
 * loaded file that are identical to the stored entry. Parcels must be in the NEWEST snapshot and in
 * an office the actor may write. One row per parcel; a parcel already reviewed today gets a superseding row (EDIT).
 * Returns { saved, skipped, results: [{ item_code, status, reason?, errors? }] }.
 */
async function recordEntries(db, { entries, mode = 'REVIEW', actor, now = new Date() }) {
    requireCapability(actor.access, CAPABILITIES.HANGTON_HANDLING_WRITE);
    if (!Array.isArray(entries) || entries.length === 0) throw new HandlingError('NO_ITEMS', 'Chưa chọn bưu gửi nào.');
    if (entries.length > MAX_BATCH) throw new HandlingError('TOO_MANY', `Mỗi lần chỉ xử lý tối đa ${MAX_BATCH} bưu gửi.`);
    const snapshot = await newestSnapshot(db);
    if (!snapshot) throw new HandlingError('NO_SNAPSHOT', 'Chưa có snapshot hàng tồn.', 404);
    const today = localDate(now);
    const codes = [...new Set(entries.map((entry) => String(entry.item_code || '').trim()).filter(Boolean))];
    const items = new Map();
    for (let i = 0; i < codes.length; i += IN_CHUNK) {
        const part = codes.slice(i, i + IN_CHUNK);
        const found = await db.all(`SELECT * FROM hangton_snapshot_item WHERE snapshot_id = ? AND item_code IN (${placeholders(part.length)})`, [snapshot.id, ...part]);
        for (const row of found) items.set(row.item_code, row);
    }
    const logs = await logRowsByItem(db, codes);
    const results = [];
    const toWrite = [];
    const seen = new Set();

    for (const entry of entries) {
        const code = String(entry.item_code || '').trim();
        const item = items.get(code);
        const skip = (reason, extra = {}) => results.push({ item_code: code, status: 'SKIPPED', reason, ...extra });
        if (!code) { skip('NO_CODE'); continue; }
        if (seen.has(code)) { skip('DUPLICATE_IN_BATCH'); continue; } // two lines of one parcel in a batch: the first one counts
        seen.add(code);
        if (!item) { skip('NOT_IN_STOCK'); continue; }
        if (!canWriteOffice(actor.access, item.office_code)) { skip('OUT_OF_SCOPE'); continue; }
        const list = logs.get(code) || [];
        const existingToday = effectiveOn(list, today);
        let input = entry.input;
        let action = 'REVIEW';
        // A file loaded back holds the last entry pre-filled: a line the person did not change is not a new review.
        if (mode === 'IMPORT') {
            const previous = latestOf(list);
            if (previous && sameAnswers(previous, input || {})) { skip('UNCHANGED'); continue; }
        }
        if (mode === 'KEEP') {
            if (existingToday) { skip('ALREADY_REVIEWED_TODAY'); continue; }
            const last = latestOf(list);
            if (!last) { skip('NO_PREVIOUS'); continue; }
            // "Đã xử lý" yet still in stock: repeating it would hide the warning, the cause has to be looked at again
            if (last.result_code === 'DA_XU_LY') { skip('RECHECK_REQUIRED'); continue; }
            input = Object.fromEntries(ENTRY_FIELDS.map((field) => [field, last[field]]));
            // a due date that already passed cannot be repeated: the person must set a new one
            if (input.due_date && input.due_date < today) { skip('DUE_DATE_PASSED'); continue; }
            action = 'KEEP';
        }
        const checked = catalog.validateEntry({ ...input, postman_code: input?.postman_code || item.postman_code, postman_name: input?.postman_name || item.postman_name }, { today });
        if (!checked.ok) { skip('INVALID', { errors: checked.errors }); continue; }
        if (existingToday) action = 'EDIT';
        toWrite.push({ code, item, existingToday, action, value: checked.value });
        results.push({ item_code: code, status: 'SAVED', action });
    }

    if (toWrite.length > 0) {
        await inTransaction(db, async () => {
            for (const { code, item, existingToday, action, value } of toWrite) {
                await insertLog(db, {
                    item_code: code, business_date: today, ...contextOf(item, snapshot), action, ...value,
                    actor_id: actor.id, actor_name: actor.name, actor_position: actor.position,
                    supersedes_id: existingToday ? existingToday.id : null, created_at: now.getTime(),
                });
            }
        });
    }
    return { saved: toWrite.length, skipped: results.length - toWrite.length, business_date: today, snapshot_id: snapshot.id, results };
}

// ---- edit requests (past days) ----------------------------------------------------------------------------------------

async function createEditRequest(db, { logId, input, reason, actor, now = new Date() }) {
    requireCapability(actor.access, CAPABILITIES.HANGTON_HANDLING_WRITE);
    const target = await db.get('SELECT * FROM hangton_handling_log WHERE id = ?', [Number(logId)]);
    if (!target) throw new HandlingError('NOT_FOUND', 'Không tìm thấy bản ghi cần sửa.', 404);
    if (!canWriteOffice(actor.access, target.office_code)) throw new HandlingError('OUT_OF_SCOPE', 'Bản ghi thuộc bưu cục ngoài phạm vi của bạn.', 403);
    const today = localDate(now);
    if (target.business_date >= today) throw new HandlingError('SAME_DAY', 'Bản ghi của hôm nay được sửa trực tiếp, không cần xin phê duyệt.');
    const effective = effectiveOn(await db.all('SELECT * FROM hangton_handling_log WHERE item_code = ? AND business_date = ?', [target.item_code, target.business_date]), target.business_date);
    if (!effective || effective.id !== target.id) throw new HandlingError('NOT_LATEST_OF_DAY', 'Bản ghi này đã được thay bằng bản mới hơn trong ngày.');
    const why = String(reason ?? '').trim();
    if (why.length < 5) throw new HandlingError('REASON_REQUIRED', 'Nhập lý do xin sửa (ít nhất 5 ký tự).');
    const checked = catalog.validateEntry({ postman_code: target.postman_code, postman_name: target.postman_name, ...input }, { today: target.business_date });
    if (!checked.ok) throw new HandlingError('INVALID', 'Nội dung sửa chưa đầy đủ.', 400, checked.errors);
    const proposed = { ...checked.value, _actor_position: actor.position };
    // checked and written inside one queued transaction, so a double click cannot leave two pending requests for one entry
    return inTransaction(db, async () => {
        if (await db.get("SELECT id FROM hangton_edit_request WHERE log_id = ? AND status = 'PENDING'", [target.id])) {
            throw new HandlingError('ALREADY_PENDING', 'Bản ghi này đang có yêu cầu sửa chờ phê duyệt.', 409);
        }
        const result = await db.run(
            `INSERT INTO hangton_edit_request (log_id, item_code, office_code, business_date, proposed, reason, status, requested_by_id, requested_by_name, requested_at)
             VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
            [target.id, target.item_code, target.office_code, target.business_date, JSON.stringify(proposed), why, actor.id, actor.name, now.getTime()]);
        return { id: result.lastID, status: 'PENDING' };
    });
}

async function listEditRequests(db, { status, actor }) {
    const access = actor.access;
    const where = [];
    const params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    const rows = await db.all(`SELECT * FROM hangton_edit_request ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 500`, params);
    const visible = rows.filter((row) => row.requested_by_id === actor.id || canApproveOffice(access, row.office_code)
        || (can(access, CAPABILITIES.HANGTON_HANDLING_VIEW) && officeCovered(access, row.office_code)));
    const grouping = await loadGrouping(db);
    const out = [];
    for (const row of visible) {
        const target = await db.get('SELECT * FROM hangton_handling_log WHERE id = ?', [row.log_id]);
        out.push({
            ...row,
            proposed: safeJson(row.proposed),
            current: presentEntry(target, grouping),
            can_decide: row.status === 'PENDING' && canApproveOffice(access, row.office_code)
                && (row.requested_by_id !== actor.id || actor.position === 'ADMIN'),
        });
    }
    return out;
}

async function decideEditRequest(db, { id, approve, note, actor, now = new Date() }) {
    requireCapability(actor.access, CAPABILITIES.HANGTON_HANDLING_APPROVE);
    const decisionNote = String(note ?? '').trim() || null;
    // read, check and decide inside one queued transaction: two people deciding at once cannot both succeed
    return inTransaction(db, async () => {
        const request = await db.get('SELECT * FROM hangton_edit_request WHERE id = ?', [Number(id)]);
        if (!request) throw new HandlingError('NOT_FOUND', 'Không tìm thấy yêu cầu sửa.', 404);
        if (request.status !== 'PENDING') throw new HandlingError('ALREADY_DECIDED', 'Yêu cầu này đã được xử lý.', 409);
        if (!canApproveOffice(actor.access, request.office_code)) throw new HandlingError('OUT_OF_SCOPE', 'Yêu cầu thuộc bưu cục ngoài phạm vi phê duyệt của bạn.', 403);
        if (request.requested_by_id === actor.id && actor.position !== 'ADMIN') {
            throw new HandlingError('SELF_APPROVAL', 'Không tự phê duyệt yêu cầu của chính mình; cần chuyên quản khác hoặc quản trị.', 403);
        }
        if (!approve) {
            await db.run(
                "UPDATE hangton_edit_request SET status = 'REJECTED', decided_by_id = ?, decided_by_name = ?, decided_at = ?, decision_note = ? WHERE id = ? AND status = 'PENDING'",
                [actor.id, actor.name, now.getTime(), decisionNote, request.id]);
            return { id: request.id, status: 'REJECTED' };
        }
        const target = await db.get('SELECT * FROM hangton_handling_log WHERE id = ?', [request.log_id]);
        const proposed = safeJson(request.proposed) || {};
        const logId = await insertLog(db, {
            item_code: target.item_code, business_date: target.business_date, snapshot_id: target.snapshot_id, slot: target.slot,
            office_code: target.office_code, office: target.office, ton_level: target.ton_level, customer_class: target.customer_class,
            action: 'EDIT_APPROVED', ...Object.fromEntries(ENTRY_FIELDS.map((field) => [field, proposed[field] ?? null])),
            actor_id: request.requested_by_id, actor_name: request.requested_by_name, actor_position: proposed._actor_position || null,
            approved_by_id: actor.id, approved_by_name: actor.name, supersedes_id: target.id, created_at: now.getTime(),
        });
        await db.run(
            "UPDATE hangton_edit_request SET status = 'APPROVED', decided_by_id = ?, decided_by_name = ?, decided_at = ?, decision_note = ?, applied_log_id = ? WHERE id = ? AND status = 'PENDING'",
            [actor.id, actor.name, now.getTime(), decisionNote, logId, request.id]);
        return { id: request.id, status: 'APPROVED', applied_log_id: logId };
    });
}

// ---- free-text grouping ("Gom nhóm lý do") -----------------------------------------------------------------------------

/** Wordings typed under "Khác" that no rule or mapping groups yet, most frequent first. */
async function ungroupedReasons(db, { kind, offices } = {}) {
    const grouping = await loadGrouping(db);
    const out = [];
    for (const k of kind ? [kind] : catalog.KINDS) {
        if (!catalog.KINDS.includes(k)) continue;
        // a chuyên quản only reads the wordings typed in the offices of the account
        const scope = Array.isArray(offices) ? (offices.length === 0 ? ' AND 1 = 0' : ` AND office_code IN (${placeholders(offices.length)})`) : '';
        const rows = await db.all(
            `SELECT ${k}_text AS text, COUNT(*) AS n FROM hangton_handling_log WHERE ${k}_code = ? AND ${k}_text IS NOT NULL${scope} GROUP BY ${k}_text`,
            [catalog.OTHER, ...(Array.isArray(offices) ? offices : [])]);
        const byNorm = new Map();
        for (const row of rows) {
            const norm = catalog.normalizeText(row.text);
            if (!norm || catalog.groupOf(k, catalog.OTHER, row.text, grouping.maps[k]) !== catalog.UNGROUPED) continue;
            const current = byNorm.get(norm) || { kind: k, norm_text: norm, sample_text: row.text, n: 0 };
            current.n += row.n;
            byNorm.set(norm, current);
        }
        out.push(...byNorm.values());
    }
    return out.sort((a, b) => b.n - a.n);
}

/** Groups a chuyên quản can pick for a kind: standard answers (selectable or not) and the ones created before. */
async function groupChoices(db, kind) {
    const grouping = await loadGrouping(db);
    const standard = (catalog.CATALOG[kind] || []).filter((entry) => entry.code !== catalog.OTHER).map((entry) => ({ code: entry.code, label: entry.label }));
    const custom = [...grouping.custom[kind].entries()].map(([code, label]) => ({ code, label }));
    return [...standard, ...custom];
}

/**
 * Puts a wording into a group, for every old and new entry with that wording. groupCode must exist for the kind, or
 * newGroupLabel creates a group first.
 */
async function mapReason(db, { kind, text, groupCode, newGroupLabel, actor, now = new Date() }) {
    requireCapability(actor.access, CAPABILITIES.HANGTON_HANDLING_REASONS);
    if (!catalog.KINDS.includes(kind)) throw new HandlingError('BAD_KIND', 'Loại nội dung không hợp lệ.');
    const norm = catalog.normalizeText(text);
    if (!norm) throw new HandlingError('EMPTY_TEXT', 'Chưa có nội dung cần gom nhóm.');
    let code = String(groupCode || '').trim();
    const label = String(newGroupLabel || '').trim();
    if (!code && label) {
        const slug = catalog.normalizeText(label).replace(/ /g, '_').toUpperCase().slice(0, 40);
        if (!slug) throw new HandlingError('BAD_LABEL', 'Tên nhóm mới không hợp lệ.');
        code = `G_${slug}`;
        await db.run('INSERT OR IGNORE INTO hangton_option_group (kind, code, label, created_by_id, created_at) VALUES (?, ?, ?, ?, ?)', [kind, code, label, actor.id, now.getTime()]);
    }
    if (!(await groupChoices(db, kind)).some((choice) => choice.code === code)) throw new HandlingError('UNKNOWN_GROUP', 'Nhóm không tồn tại.');
    await db.run(
        `INSERT INTO hangton_reason_map (kind, norm_text, sample_text, group_code, set_by_id, set_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(kind, norm_text) DO UPDATE SET group_code = excluded.group_code, sample_text = excluded.sample_text, set_by_id = excluded.set_by_id, set_at = excluded.set_at`,
        [kind, norm, String(text).trim(), code, actor.id, now.getTime()]);
    return { kind, norm_text: norm, group_code: code };
}

module.exports = {
    REVIEW_MIN_RANK, MAX_BATCH, ENTRY_FIELDS, HandlingError, reviewDateOf, sameAnswers,
    officeCovered, canWriteOffice, canApproveOffice, actorOf,
    logRowsByItem, effectiveOn, latestOf, decorateItems, stats, listLog, history,
    recordEntries, createEditRequest, listEditRequests, decideEditRequest,
    ungroupedReasons, groupChoices, mapReason, presentEntry, loadGrouping, newestSnapshot,
};
