'use strict';

// HANGTON-INVENTORY-01 phase 2: three fixed daily slots (07:30, 11:30, 21:00, local time).
// A tick every minute runs a slot that is due (now >= slot time, within the catch-up window) and not yet
// stored for today; a failed attempt is retried after RETRY_MS. One run at a time.
const { SLOTS } = require('./scope');
const { takeSnapshot, localDate } = require('./snapshotService');

const CATCH_UP_MS = 3 * 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;
const TICK_MS = 60 * 1000;

function slotTime(now, slot) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(slot.slice(0, 2)), Number(slot.slice(2)), 0, 0);
}

// Pure decision: which slot (if any) should run now.
function dueSlot({ now, stored, lastAttempt = {} }) {
    const today = localDate(now);
    for (const slot of [...SLOTS].reverse()) {
        const age = now.getTime() - slotTime(now, slot).getTime();
        if (age < 0 || age > CATCH_UP_MS) continue;
        if (stored.has(`${today}|${slot}`)) return null;
        const last = lastAttempt[`${today}|${slot}`];
        if (last && now.getTime() - last < RETRY_MS) return null;
        return slot;
    }
    return null;
}

function createScheduler({ db, fetchStock, log = console }) {
    let timer = null;
    let running = false;
    const lastAttempt = {};

    async function tick(now = new Date()) {
        if (running) return null;
        const rows = await db.all('SELECT business_date, slot FROM hangton_snapshot WHERE business_date = ?', [localDate(now)]);
        const stored = new Set(rows.map((r) => `${r.business_date}|${r.slot}`));
        const slot = dueSlot({ now, stored, lastAttempt });
        if (!slot) return null;
        running = true;
        lastAttempt[`${localDate(now)}|${slot}`] = now.getTime();
        try {
            const result = await takeSnapshot({ db, fetchStock, slot, now, trigger: 'SCHEDULE' });
            log.log(`[hangton] snapshot ${result.businessDate} ${slot}: kept ${result.keptRows}/${result.sourceRows}${result.isStale ? ' (portal data not refreshed)' : ''}`);
            return result;
        } catch (error) {
            log.error(`[hangton] snapshot ${slot} failed: ${error.message}`);
            return null;
        } finally {
            running = false;
        }
    }

    return {
        tick,
        start() {
            if (timer) return;
            timer = setInterval(() => { void tick().catch((e) => log.error(`[hangton] tick failed: ${e.message}`)); }, TICK_MS);
            timer.unref?.();
            void tick().catch((e) => log.error(`[hangton] tick failed: ${e.message}`));
        },
        stop() { if (timer) { clearInterval(timer); timer = null; } },
    };
}

module.exports = { createScheduler, dueSlot, slotTime, CATCH_UP_MS, RETRY_MS };
