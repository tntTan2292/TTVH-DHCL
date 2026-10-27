'use strict';

// HANGTON-INVENTORY-01 phase 2: read side. Overview of one snapshot and the parcel-level comparison of
// two snapshots keyed by item_code: resolved (left the stock), aged_up, new, unchanged, aged_down.

const handlingCatalog = require('./handling/catalog');

async function listSnapshots(db, { limit = 90 } = {}) {
    return db.all(
        `SELECT id, business_date, slot, captured_at, portal_timestamp, source_row_count, kept_row_count, is_stale, trigger
           FROM hangton_snapshot ORDER BY business_date DESC,
                CASE WHEN slot LIKE 'M%' THEN substr(slot, 2, 4) ELSE slot END DESC, slot DESC LIMIT ?`, [limit]);
}

async function getSnapshot(db, id) {
    return db.get('SELECT * FROM hangton_snapshot WHERE id = ?', [id]);
}

// Resolve a snapshot by id, or by (date, slot); date defaults to the newest, slot to 0730 else the latest slot of that day.
async function resolveSnapshot(db, { id, date, slot } = {}) {
    if (id) return getSnapshot(db, Number(id));
    const day = date || (await db.get('SELECT MAX(business_date) AS d FROM hangton_snapshot'))?.d;
    if (!day) return null;
    if (slot) return db.get('SELECT * FROM hangton_snapshot WHERE business_date = ? AND slot = ?', [day, slot]);
    return (await db.get('SELECT * FROM hangton_snapshot WHERE business_date = ? AND slot = ?', [day, '0730']))
        || db.get('SELECT * FROM hangton_snapshot WHERE business_date = ? ORDER BY slot DESC LIMIT 1', [day]);
}

// Default base for a snapshot: the same slot on the closest earlier day that has it.
async function resolveDefaultBase(db, snapshot, { baseDate, baseSlot } = {}) {
    // A manual (extra) point is compared with the snapshot taken right before it (PO 2026-10-27: "what changed since 07:30").
    if (!baseDate && !baseSlot && String(snapshot.slot).startsWith('M')) {
        return db.get(
            'SELECT * FROM hangton_snapshot WHERE captured_at < ? AND id <> ? ORDER BY captured_at DESC, id DESC LIMIT 1',
            [snapshot.captured_at, snapshot.id]);
    }
    const slot = baseSlot || snapshot.slot;
    if (baseDate) return db.get('SELECT * FROM hangton_snapshot WHERE business_date = ? AND slot = ?', [baseDate, slot]);
    return db.get(
        'SELECT * FROM hangton_snapshot WHERE business_date < ? AND slot = ? ORDER BY business_date DESC LIMIT 1',
        [snapshot.business_date, slot]);
}

// "customers": exact "Phân Loại KH" values (array or "|"-joined string); empty = every group.
function parseList(value) {
    const list = Array.isArray(value) ? value : String(value || '').split('|');
    return list.map((v) => String(v).trim()).filter(Boolean);
}

// ` AND <alias>customer_class IN (?n, ...)` with positional parameters (anonymous ?) or numbered ones from `from`.
function customerClause(customers, { alias = '', numberedFrom = null } = {}) {
    const list = parseList(customers);
    if (list.length === 0) return { sql: '', params: [] };
    const marks = list.map((_, i) => (numberedFrom === null ? '?' : `?${numberedFrom + i}`)).join(',');
    return { sql: ` AND ${alias}customer_class IN (${marks})`, params: list };
}

// RBAC-01: "offices" = office codes a scoped user may see (array) or null/undefined for no restriction.
// An empty array means "nothing" and must match no row.
function officeList(offices) {
    return Array.isArray(offices) ? offices.map((v) => String(v).trim()).filter(Boolean) : null;
}

function officeClause(offices, { alias = '' } = {}) {
    const list = officeList(offices);
    if (list === null) return { sql: '', params: [] };
    if (list.length === 0) return { sql: ' AND 1 = 0', params: [] };
    return { sql: ` AND ${alias}office_code IN (${list.map(() => '?').join(',')})`, params: list };
}

// Snapshot headers carry the size of the whole portal extract: a scoped user does not get those two counts.
function publicSnapshot(snapshot, offices) {
    if (!snapshot || officeList(offices) === null) return snapshot;
    const { source_row_count, kept_row_count, ...rest } = snapshot;
    return rest;
}

async function overview(db, snapshotId, { customers, offices } = {}) {
    const c0 = customerClause(customers);
    const o = officeClause(offices);
    const c = { sql: c0.sql + o.sql, params: [...c0.params, ...o.params] };
    const p = [snapshotId, ...c.params];
    const byLevel = await db.all(
        `SELECT ton_level, ton_rank, COUNT(*) AS n, COALESCE(SUM(cod), 0) AS cod
           FROM hangton_snapshot_item WHERE snapshot_id = ?${c.sql} GROUP BY ton_level, ton_rank ORDER BY ton_rank`, p);
    const byOffice = await db.all(
        `SELECT office, COUNT(*) AS n, COALESCE(SUM(cod), 0) AS cod,
                SUM(CASE WHEN ton_rank >= 5 THEN 1 ELSE 0 END) AS n_ge5,
                COALESCE(SUM(CASE WHEN ton_rank >= 5 THEN cod END), 0) AS cod_ge5
           FROM hangton_snapshot_item WHERE snapshot_id = ?${c.sql} GROUP BY office ORDER BY n DESC`, p);
    const byOfficeLevel = await db.all(
        `SELECT office, ton_level, ton_rank, COUNT(*) AS n, COALESCE(SUM(cod), 0) AS cod
           FROM hangton_snapshot_item WHERE snapshot_id = ?${c.sql} GROUP BY office, ton_level, ton_rank ORDER BY office, ton_rank`, p);
    const byStatus = await db.all(
        `SELECT status_name, COUNT(*) AS n FROM hangton_snapshot_item WHERE snapshot_id = ?${c.sql} GROUP BY status_name ORDER BY n DESC`, p);
    // chart "by customer group": level x group, limited to the selected groups
    const byLevelCustomer = await db.all(
        `SELECT ton_level, ton_rank, customer_class, COUNT(*) AS n, COALESCE(SUM(cod), 0) AS cod
           FROM hangton_snapshot_item WHERE snapshot_id = ?${c.sql} GROUP BY ton_level, ton_rank, customer_class ORDER BY ton_rank, customer_class`, p);
    // every group of the snapshot (NOT limited by the selection): the selector cards
    const byCustomer = await db.all(
        `SELECT customer_class, COUNT(*) AS n, COALESCE(SUM(cod), 0) AS cod,
                SUM(CASE WHEN ton_rank >= 5 THEN 1 ELSE 0 END) AS n_ge5,
                COALESCE(SUM(CASE WHEN ton_rank >= 5 THEN cod END), 0) AS cod_ge5
           FROM hangton_snapshot_item WHERE snapshot_id = ?${o.sql} GROUP BY customer_class ORDER BY n DESC`, [snapshotId, ...o.params]);
    const total = byLevel.reduce((sum, r) => sum + r.n, 0);
    const ge5 = byLevel.filter((r) => r.ton_rank >= 5).reduce((sum, r) => sum + r.n, 0);
    return {
        total, ge5, by_level: byLevel, by_office: byOffice, by_office_level: byOfficeLevel, by_status: byStatus,
        by_level_customer: byLevelCustomer, by_customer: byCustomer,
    };
}

// Parcel list of one snapshot for the detail table: optional office / min level rank / status / customer groups, paged.
const ITEM_SORT_COLUMNS = Object.freeze({
    rank: 'ton_rank', office: 'office', cod: 'cod', item_code: 'item_code', status: 'status_name', postman: 'postman_name', customer: 'customer_class',
    reason: 'reason',
});
const ITEM_SORT_DEFAULT_DIR = Object.freeze({ rank: 'DESC', cod: 'DESC' });

// HANGTON-HANDLING-01: columns that come from the handling log. The entry shown for a parcel is its newest one.
const LATEST_ENTRY = (column) => `(SELECT l.${column} FROM hangton_handling_log l WHERE l.item_code = hangton_snapshot_item.item_code ORDER BY l.business_date DESC, l.id DESC LIMIT 1)`;
const answerOrder = (kind) => {
    const codes = handlingCatalog.CATALOG[kind].map((entry) => `'${entry.code}'`);
    const whens = codes.map((code, index) => `WHEN ${code} THEN ${index + 1}`).join(' ');
    return `CASE ${LATEST_ENTRY(`${kind}_code`)} ${whens} ELSE 99 END`;
};
// field -> { sql (primary key, ascending order), params, then (secondary expressions) }
function handlingSort(field, reviewDate) {
    switch (field) {
    case 'review':
        // 0 = never reviewed, 1 = only older entries (waiting for confirmation), 2 = reviewed on the snapshot's day
        return {
            sql: `CASE WHEN EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = hangton_snapshot_item.item_code AND l.business_date = ?) THEN 2
                       WHEN EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = hangton_snapshot_item.item_code) THEN 1 ELSE 0 END`,
            params: [reviewDate || ''],
        };
    case 'cause':
        return { sql: answerOrder('cause'), params: [], then: LATEST_ENTRY('cause_text') };
    case 'plan':
        return { sql: answerOrder('plan'), params: [], then: LATEST_ENTRY('due_date') };
    case 'result':
        return { sql: answerOrder('result'), params: [] };
    case 'due':
        return { sql: `(${LATEST_ENTRY('due_date')} IS NULL)`, params: [], then: LATEST_ENTRY('due_date') };
    case 'note':
        return { sql: `(${LATEST_ENTRY('note')} IS NULL)`, params: [], then: LATEST_ENTRY('note') };
    default:
        return null;
    }
}
const ITEMS_MAX_LIMIT = 20000;

// "levels": exact "Loại Tồn" values, as an array or a "|"-joined string (e.g. "≥5 ngày|≥7 ngày").
function parseLevels(levels) {
    const list = Array.isArray(levels) ? levels : String(levels || '').split('|');
    return list.map((l) => String(l).trim()).filter(Boolean);
}

// HANGTON-HANDLING-01: filter by review state on the snapshot's business day: done (complete entry that day), pending
// (not done), never (no entry ever), stale (older entries only).
const REVIEW_FILTERS = Object.freeze({
    done: 'EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = hangton_snapshot_item.item_code AND l.business_date = ?)',
    pending: 'NOT EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = hangton_snapshot_item.item_code AND l.business_date = ?)',
    never: 'NOT EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = hangton_snapshot_item.item_code)',
    stale: 'EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = hangton_snapshot_item.item_code) AND NOT EXISTS (SELECT 1 FROM hangton_handling_log l WHERE l.item_code = hangton_snapshot_item.item_code AND l.business_date = ?)',
});

// Search box of the parcel list: one or several (space / comma / line separated) pieces of a parcel code, case-insensitive.
const SEARCH_MAX_TERMS = 50;
function searchTerms(q) {
    return [...new Set(String(q ?? '').split(/[\s,;]+/).map((term) => term.trim()).filter(Boolean))].slice(0, SEARCH_MAX_TERMS);
}

async function items(db, snapshotId, { office, offices, minRank, levels, customers, status, review, reviewDate, q, sort = 'rank', dir, limit = 200, offset = 0 } = {}) {
    const where = ['snapshot_id = ?'];
    const params = [snapshotId];
    const scoped = officeClause(offices);
    if (scoped.sql) { where.push(scoped.sql.replace(/^ AND /, '')); params.push(...scoped.params); }
    if (office) { where.push('office = ?'); params.push(office); }
    if (minRank !== undefined && minRank !== '' && !Number.isNaN(Number(minRank))) { where.push('ton_rank >= ?'); params.push(Number(minRank)); }
    const levelList = parseLevels(levels);
    if (levelList.length > 0) { where.push(`ton_level IN (${levelList.map(() => '?').join(',')})`); params.push(...levelList); }
    const customerList = parseList(customers);
    if (customerList.length > 0) { where.push(`customer_class IN (${customerList.map(() => '?').join(',')})`); params.push(...customerList); }
    if (status) { where.push('status_name = ?'); params.push(status); }
    const terms = searchTerms(q);
    if (terms.length > 0) {
        where.push(`(${terms.map(() => "item_code LIKE ? ESCAPE '!'").join(' OR ')})`);
        params.push(...terms.map((term) => `%${term.replace(/[!%_]/g, '!$&')}%`));
    }
    if (review && REVIEW_FILTERS[review] && reviewDate) {
        where.push(`(${REVIEW_FILTERS[review]})`);
        if (REVIEW_FILTERS[review].includes('?')) params.push(reviewDate);
    }
    const viaLog = handlingSort(sort, reviewDate);
    const field = viaLog || ITEM_SORT_COLUMNS[sort] ? sort : 'rank';
    const direction = String(dir).toLowerCase() === 'asc' ? 'ASC' : String(dir).toLowerCase() === 'desc' ? 'DESC' : (ITEM_SORT_DEFAULT_DIR[field] || 'ASC');
    const orderParams = [];
    let orderBy;
    if (viaLog) {
        orderBy = `${viaLog.sql} ${direction}${viaLog.then ? `, ${viaLog.then} ${direction}` : ''}, office, item_code`;
        orderParams.push(...viaLog.params);
    } else {
        orderBy = `${ITEM_SORT_COLUMNS[field]} ${direction}, ${field === 'rank' ? 'office, ' : ''}item_code`;
    }
    const total = (await db.get(`SELECT COUNT(*) AS n FROM hangton_snapshot_item WHERE ${where.join(' AND ')}`, params)).n;
    const rows = await db.all(
        `SELECT item_code, status_name, ton_level, ton_rank, office, office_code, district, cod, parcel_type, customer_class, postman_code, postman_name, reason, weight
           FROM hangton_snapshot_item WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
        [...params, ...orderParams, Math.min(Number(limit) || 200, ITEMS_MAX_LIMIT), Math.max(Number(offset) || 0, 0)]);
    return { total, rows };
}

const DETAIL_CAP = 1000;

// Parcels in A (left join B) plus parcels only in B. ?1 = from snapshot, ?2 = to snapshot, ?3 = change (detail lists),
// ?4.. = customer groups (optional): the comparison is made between the selected groups of both snapshots.
function classified(customers, offices) {
    const list = parseList(customers);
    const marks = list.map((_, i) => `?${4 + i}`).join(',');
    const officeCodes = officeList(offices);
    const officeMarks = (officeCodes || []).map((_, i) => `?${4 + list.length + i}`).join(',');
    const on = (alias) => (list.length ? ` AND ${alias}.customer_class IN (${marks})` : '')
        + (officeCodes === null ? '' : officeCodes.length === 0 ? ' AND 1 = 0' : ` AND ${alias}.office_code IN (${officeMarks})`);
    return `
    SELECT a.item_code AS item_code,
           CASE WHEN b.item_code IS NULL THEN 'resolved'
                WHEN b.ton_rank > a.ton_rank THEN 'aged_up'
                WHEN b.ton_rank < a.ton_rank THEN 'aged_down'
                ELSE 'unchanged' END AS change,
           COALESCE(b.office, a.office) AS office,
           a.ton_level AS from_level, b.ton_level AS to_level,
           a.status_name AS from_status, b.status_name AS to_status,
           COALESCE(b.cod, a.cod) AS cod,
           COALESCE(b.postman_name, a.postman_name) AS postman_name,
           COALESCE(b.customer_class, a.customer_class) AS customer_class
      FROM hangton_snapshot_item a
      LEFT JOIN hangton_snapshot_item b ON b.snapshot_id = ?2 AND b.item_code = a.item_code${on('b')}
     WHERE a.snapshot_id = ?1${on('a')}
    UNION ALL
    SELECT n.item_code, 'new', n.office, NULL, n.ton_level, NULL, n.status_name, n.cod, n.postman_name, n.customer_class
      FROM hangton_snapshot_item n
     WHERE n.snapshot_id = ?2${on('n')}
       AND NOT EXISTS (SELECT 1 FROM hangton_snapshot_item p WHERE p.snapshot_id = ?1 AND p.item_code = n.item_code${on('p')})`;
}

async function compare(db, fromId, toId, { detail = false, customers, offices } = {}) {
    const sql = classified(customers, offices);
    const cust = parseList(customers);
    const officeCodes = officeList(offices) || [];
    const extra = [...cust, ...officeCodes];
    // ?3 is only referenced by the detail lists; a statement with no ?3 and no extra parameter takes just ?1 and ?2
    const base = extra.length ? [fromId, toId, null, ...extra] : [fromId, toId];
    const summaryRows = await db.all(`SELECT change, COUNT(*) AS n FROM (${sql}) GROUP BY change`, base);
    const byOffice = await db.all(
        `SELECT office, change, COUNT(*) AS n FROM (${sql}) GROUP BY office, change ORDER BY office`, base);
    const summary = { resolved: 0, aged_up: 0, aged_down: 0, new: 0, unchanged: 0 };
    for (const r of summaryRows) summary[r.change] = r.n;
    const result = { from_snapshot_id: fromId, to_snapshot_id: toId, summary, by_office: byOffice };
    if (detail) {
        const list = (change) => db.all(
            `SELECT * FROM (${sql}) WHERE change = ?3 ORDER BY office, item_code LIMIT ${DETAIL_CAP}`, [fromId, toId, change, ...extra]);
        result.resolved = await list('resolved');
        result.aged_up = await list('aged_up');
        result.new = await list('new');
        result.detail_cap = DETAIL_CAP;
    }
    return result;
}

module.exports = { ITEMS_MAX_LIMIT, publicSnapshot, listSnapshots, getSnapshot, resolveSnapshot, resolveDefaultBase, overview, compare, items };
