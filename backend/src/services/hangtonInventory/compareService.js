'use strict';

// HANGTON-INVENTORY-01 phase 2: read side. Overview of one snapshot and the parcel-level comparison of
// two snapshots keyed by item_code: resolved (left the stock), aged_up, new, unchanged, aged_down.

async function listSnapshots(db, { limit = 90 } = {}) {
    return db.all(
        `SELECT id, business_date, slot, captured_at, portal_timestamp, source_row_count, kept_row_count, is_stale, trigger
           FROM hangton_snapshot ORDER BY business_date DESC, slot DESC LIMIT ?`, [limit]);
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
    const slot = baseSlot || snapshot.slot;
    if (baseDate) return db.get('SELECT * FROM hangton_snapshot WHERE business_date = ? AND slot = ?', [baseDate, slot]);
    return db.get(
        'SELECT * FROM hangton_snapshot WHERE business_date < ? AND slot = ? ORDER BY business_date DESC LIMIT 1',
        [snapshot.business_date, slot]);
}

async function overview(db, snapshotId) {
    const byLevel = await db.all(
        `SELECT ton_level, ton_rank, COUNT(*) AS n, COALESCE(SUM(cod), 0) AS cod
           FROM hangton_snapshot_item WHERE snapshot_id = ? GROUP BY ton_level, ton_rank ORDER BY ton_rank`, [snapshotId]);
    const byOffice = await db.all(
        `SELECT office, COUNT(*) AS n, COALESCE(SUM(cod), 0) AS cod,
                SUM(CASE WHEN ton_rank >= 5 THEN 1 ELSE 0 END) AS n_ge5
           FROM hangton_snapshot_item WHERE snapshot_id = ? GROUP BY office ORDER BY n DESC`, [snapshotId]);
    const byOfficeLevel = await db.all(
        `SELECT office, ton_level, ton_rank, COUNT(*) AS n
           FROM hangton_snapshot_item WHERE snapshot_id = ? GROUP BY office, ton_level, ton_rank ORDER BY office, ton_rank`, [snapshotId]);
    const byStatus = await db.all(
        'SELECT status_name, COUNT(*) AS n FROM hangton_snapshot_item WHERE snapshot_id = ? GROUP BY status_name ORDER BY n DESC', [snapshotId]);
    const total = byLevel.reduce((s, r) => s + r.n, 0);
    const ge5 = byLevel.filter((r) => r.ton_rank >= 5).reduce((s, r) => s + r.n, 0);
    return { total, ge5, by_level: byLevel, by_office: byOffice, by_office_level: byOfficeLevel, by_status: byStatus };
}

const DETAIL_CAP = 1000;

// Parcels in A (left join B) plus parcels only in B. ?1 = from snapshot, ?2 = to snapshot.
const CLASSIFIED = `
    SELECT a.item_code AS item_code,
           CASE WHEN b.item_code IS NULL THEN 'resolved'
                WHEN b.ton_rank > a.ton_rank THEN 'aged_up'
                WHEN b.ton_rank < a.ton_rank THEN 'aged_down'
                ELSE 'unchanged' END AS change,
           COALESCE(b.office, a.office) AS office,
           a.ton_level AS from_level, b.ton_level AS to_level,
           a.status_name AS from_status, b.status_name AS to_status,
           COALESCE(b.cod, a.cod) AS cod,
           COALESCE(b.postman_name, a.postman_name) AS postman_name
      FROM hangton_snapshot_item a
      LEFT JOIN hangton_snapshot_item b ON b.snapshot_id = ?2 AND b.item_code = a.item_code
     WHERE a.snapshot_id = ?1
    UNION ALL
    SELECT n.item_code, 'new', n.office, NULL, n.ton_level, NULL, n.status_name, n.cod, n.postman_name
      FROM hangton_snapshot_item n
     WHERE n.snapshot_id = ?2
       AND NOT EXISTS (SELECT 1 FROM hangton_snapshot_item p WHERE p.snapshot_id = ?1 AND p.item_code = n.item_code)`;

async function compare(db, fromId, toId, { detail = false } = {}) {
    const summaryRows = await db.all(`SELECT change, COUNT(*) AS n FROM (${CLASSIFIED}) GROUP BY change`, [fromId, toId]);
    const byOffice = await db.all(
        `SELECT office, change, COUNT(*) AS n FROM (${CLASSIFIED}) GROUP BY office, change ORDER BY office`, [fromId, toId]);
    const summary = { resolved: 0, aged_up: 0, aged_down: 0, new: 0, unchanged: 0 };
    for (const r of summaryRows) summary[r.change] = r.n;
    const result = { from_snapshot_id: fromId, to_snapshot_id: toId, summary, by_office: byOffice };
    if (detail) {
        const list = (change) => db.all(
            `SELECT * FROM (${CLASSIFIED}) WHERE change = ?3 ORDER BY office, item_code LIMIT ${DETAIL_CAP}`, [fromId, toId, change]);
        result.resolved = await list('resolved');
        result.aged_up = await list('aged_up');
        result.new = await list('new');
        result.detail_cap = DETAIL_CAP;
    }
    return result;
}

module.exports = { listSnapshots, getSnapshot, resolveSnapshot, resolveDefaultBase, overview, compare };
