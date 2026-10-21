'use strict';

/**
 * AUTO-BACKFILL-PARALLEL-LANES-01: one import at a time may touch the database.
 *
 * Every import runs its fact-table write as a transaction (BEGIN ... COMMIT) on the single shared sqlite3 connection
 * of src/config/db. A second import that starts while the first transaction is open would either fail at BEGIN
 * ("cannot start a transaction within a transaction") or, worse, have its statements land inside the first one's
 * transaction and be rolled back with it. The queue may now run the HUE and TCT lanes in parallel (downloads, waiting
 * for the portal and file handling overlap), so the part that really writes is queued here, first in first out.
 * The lock is in-process and not re-entrant: the callback must not call withImportWriteLock again.
 */

let tail = Promise.resolve();
let waiting = 0;

function withImportWriteLock(task) {
    waiting += 1;
    const result = tail.then(() => task());
    // the next waiter starts once this one settles, whatever the outcome
    tail = result.then(() => undefined, () => undefined).then(() => { waiting -= 1; });
    return result;
}

function importWriteLockQueueLength() {
    return waiting;
}

module.exports = { withImportWriteLock, importWriteLockQueueLength };
