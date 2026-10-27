'use strict';

// HANGTON-INVENTORY-01: the Import Center side of the stock snapshots (PO 2026-10-27).
//  - a manual point ("Lấy hàng tồn ngay") is an EXTRA snapshot, never taking the place of a scheduled slot;
//  - a make-up fills a scheduled slot of TODAY that was missed (empty), stored under that slot's label; the real
//    capture time stays in captured_at; it never overwrites an existing slot;
//  - extra points and make-ups can be deleted, scheduled snapshots cannot;
//  - no interval or daily cap (PO): only one fetch runs at a time.
const { SLOTS, isManualSlot, manualSlotFor, slotTime, slotClock } = require('./scope');
const { takeSnapshot, localDate, withSnapshotLock, isSnapshotBusy } = require('./snapshotService');

const RECENT_DAYS = 7;
const DELETABLE_TRIGGERS = Object.freeze(['MANUAL', 'MAKEUP']);

const COLUMNS = `id, business_date, slot, captured_at, portal_timestamp, source_row_count, kept_row_count, is_stale, trigger, actor`;

// State of the Import Center tab: today's three scheduled slots, today's extra points, the last 7 days.
async function importStatus(db, now = new Date()) {
    const today = localDate(now);
    const from = localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (RECENT_DAYS - 1)));
    const recent = await db.all(
        `SELECT ${COLUMNS} FROM hangton_snapshot WHERE business_date >= ?
          ORDER BY business_date DESC, CASE WHEN slot LIKE 'M%' THEN substr(slot, 2, 4) ELSE slot END DESC, slot DESC`, [from]);
    const todayRows = recent.filter((r) => r.business_date === today);
    const slots = SLOTS.map((slot) => {
        const snapshot = todayRows.find((r) => r.slot === slot) || null;
        const due = now.getTime() >= slotTime(now, slot).getTime();
        return { slot, clock: slotClock(slot), due, state: snapshot ? 'OK' : due ? 'MISSED' : 'WAITING', snapshot };
    });
    return {
        now: now.toISOString(),
        business_date: today,
        busy: isSnapshotBusy(),
        slots,
        extra: todayRows.filter((r) => isManualSlot(r.slot)),
        recent,
    };
}

// Extra point: slot "M" + HHMMSS of now; the previous snapshots are untouched.
async function runManualSnapshot({ db, fetchStock, actor = null, now = new Date() }) {
    return withSnapshotLock(() => takeSnapshot({
        db, fetchStock, slot: manualSlotFor(now), now, trigger: 'MANUAL', actor, replace: false,
    }));
}

// Make-up of a missed scheduled slot of today (slot time already passed, slot still empty).
async function runMakeupSnapshot({ db, fetchStock, slot, actor = null, now = new Date() }) {
    if (!SLOTS.includes(slot)) throw new Error('HANGTON_BAD_SLOT');
    if (now.getTime() < slotTime(now, slot).getTime()) throw new Error('HANGTON_SLOT_NOT_DUE');
    return withSnapshotLock(() => takeSnapshot({
        db, fetchStock, slot, now, trigger: 'MAKEUP', actor, replace: false,
    }));
}

async function deleteExtraSnapshot(db, id) {
    const snapshot = await db.get('SELECT id, trigger FROM hangton_snapshot WHERE id = ?', [Number(id)]);
    if (!snapshot) throw new Error('HANGTON_NOT_FOUND');
    if (!DELETABLE_TRIGGERS.includes(snapshot.trigger)) throw new Error('HANGTON_NOT_DELETABLE');
    await db.run('BEGIN IMMEDIATE');
    try {
        await db.run('DELETE FROM hangton_snapshot_item WHERE snapshot_id = ?', [snapshot.id]);
        await db.run('DELETE FROM hangton_snapshot WHERE id = ?', [snapshot.id]);
        await db.run('COMMIT');
    } catch (error) {
        await db.run('ROLLBACK').catch(() => {});
        throw error;
    }
    return { id: snapshot.id, deleted: true };
}

module.exports = { importStatus, runManualSnapshot, runMakeupSnapshot, deleteExtraSnapshot, DELETABLE_TRIGGERS, RECENT_DAYS };
