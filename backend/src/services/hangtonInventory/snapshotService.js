'use strict';

// HANGTON-INVENTORY-01 phase 2: take one snapshot (fetch -> scope filter -> store). The three daily
// slots are separate points in time (PO D12); one (business_date, slot) holds one snapshot, a re-run
// replaces it.
const { selectScope, isValidSlot } = require('./scope');
const { withImportWriteLock } = require('../importWriteLock');

const COLUMNS = ['snapshot_id', 'item_code', 'status_name', 'ton_level', 'ton_rank', 'office', 'office_code', 'district',
    'cod', 'parcel_type', 'customer_class', 'postman_code', 'postman_name', 'reason', 'tms_scan_ms', 'weight'];
const CHUNK = 250;

function pad(n) { return String(n).padStart(2, '0'); }
function localDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

// One fetch at a time (scheduler, manual point, make-up): a second caller gets HANGTON_BUSY instead of a second login.
let snapshotBusy = false;
async function withSnapshotLock(fn) {
    if (snapshotBusy) throw new Error('HANGTON_BUSY');
    snapshotBusy = true;
    try {
        return await fn();
    } finally {
        snapshotBusy = false;
    }
}
function isSnapshotBusy() { return snapshotBusy; }

// replace = false: refuse when (business_date, slot) already holds a snapshot (a make-up never overwrites).
async function takeSnapshot({ db, fetchStock, slot, now = new Date(), trigger = 'SCHEDULE', actor = null, replace = true }) {
    if (!isValidSlot(slot)) throw new Error(`HANGTON_BAD_SLOT_${slot}`);
    const { rows, portalTimestamp, count } = await fetchStock();
    const items = selectScope(rows);
    const businessDate = localDate(now);
    if (!replace && (await db.get('SELECT id FROM hangton_snapshot WHERE business_date = ? AND slot = ?', [businessDate, slot]))) {
        throw new Error('HANGTON_SLOT_EXISTS');
    }
    const previous = await db.get(
        `SELECT portal_timestamp FROM hangton_snapshot WHERE NOT (business_date = ? AND slot = ?) AND captured_at < ?
          ORDER BY captured_at DESC, id DESC LIMIT 1`, [businessDate, slot, now.toISOString()]);
    const isStale = previous && portalTimestamp && previous.portal_timestamp === portalTimestamp ? 1 : 0;

    // one write transaction at a time on the shared connection (the handling entries use the same lock)
    return withImportWriteLock(async () => {
        await db.run('BEGIN IMMEDIATE');
        try {
            const old = await db.get('SELECT id FROM hangton_snapshot WHERE business_date = ? AND slot = ?', [businessDate, slot]);
            if (old) {
                await db.run('DELETE FROM hangton_snapshot_item WHERE snapshot_id = ?', [old.id]);
                await db.run('DELETE FROM hangton_snapshot WHERE id = ?', [old.id]);
            }
            const ins = await db.run(
                `INSERT INTO hangton_snapshot (business_date, slot, captured_at, portal_timestamp, source_row_count, kept_row_count, is_stale, trigger, actor)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [businessDate, slot, now.toISOString(), portalTimestamp, count, items.length, isStale, trigger, actor]);
            const snapshotId = ins.lastID;
            for (let i = 0; i < items.length; i += CHUNK) {
                const part = items.slice(i, i + CHUNK);
                const sql = `INSERT INTO hangton_snapshot_item (${COLUMNS.join(',')}) VALUES ${part.map(() => `(${COLUMNS.map(() => '?').join(',')})`).join(',')}`;
                const params = [];
                for (const it of part) {
                    params.push(snapshotId, it.item_code, it.status_name, it.ton_level, it.ton_rank, it.office, it.office_code, it.district,
                        it.cod, it.parcel_type, it.customer_class, it.postman_code, it.postman_name, it.reason, it.tms_scan_ms, it.weight);
                }
                await db.run(sql, params);
            }
            await db.run('COMMIT');
            return { snapshotId, businessDate, slot, sourceRows: count, keptRows: items.length, isStale: Boolean(isStale), portalTimestamp };
        } catch (error) {
            await db.run('ROLLBACK').catch(() => {});
            throw error;
        }
    });
}

module.exports = { takeSnapshot, localDate, withSnapshotLock, isSnapshotBusy };
