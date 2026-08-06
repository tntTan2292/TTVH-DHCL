/**
 * importSnapshot — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Records a before-image + operation type (INSERT/UPDATE/DELETE) per DB row
 * affected by a Confirm, so Rollback can reverse exactly what happened —
 * and enforces "no rollback if a later Import already touched the same
 * scope" before ever writing to the business tables.
 */

'use strict';

const { run, all } = require('../../config/db');

const TABLE_PK = {
    network_service_point: ['ma_diem'],
    network_level2_route: ['id'],
    network_level2_route_stop: ['id'],
    network_delivery_point: ['id'],
};

function pkColumns(tableName) {
    const pk = TABLE_PK[tableName];
    if (!pk) throw new Error(`No primary key configured for snapshot table "${tableName}"`);
    return pk;
}

/**
 * Records one snapshot row. `beforeImage` must be the full row (SELECT *)
 * fetched immediately before the write, or null for INSERT operations
 * (nothing existed before).
 */
async function recordSnapshot(importLogId, tableName, rowKey, operation, beforeImage) {
    await run(
        `INSERT INTO network_import_snapshot (import_log_id, table_name, row_key, operation, before_image)
         VALUES (?, ?, ?, ?, ?)`,
        [importLogId, tableName, JSON.stringify(rowKey), operation, beforeImage ? JSON.stringify(beforeImage) : null],
    );
}

async function getSnapshotsForImport(importLogId) {
    const rows = await all(
        'SELECT * FROM network_import_snapshot WHERE import_log_id = ? ORDER BY id DESC',
        [importLogId],
    );
    return rows.map((row) => ({
        ...row,
        row_key: JSON.parse(row.row_key),
        before_image: row.before_image ? JSON.parse(row.before_image) : null,
    }));
}

/**
 * Restores one snapshot row (reverses one INSERT/UPDATE/DELETE) via the
 * already-open transactional `runInTx` executor. Generic across tables:
 * before_image is always a full-row capture, so column lists are derived
 * from its own keys rather than hardcoded per table.
 */
async function restoreOne(runInTx, snapshot) {
    const { table_name: tableName, row_key: rowKey, operation, before_image: beforeImage } = snapshot;
    const pk = pkColumns(tableName);

    if (operation === 'INSERT') {
        // The row was newly inserted by the import being rolled back — remove it.
        const whereClause = pk.map((col) => `${col} = ?`).join(' AND ');
        await runInTx(`DELETE FROM ${tableName} WHERE ${whereClause}`, pk.map((col) => rowKey[col]));
        return;
    }

    if (operation === 'UPDATE') {
        if (!beforeImage) throw new Error(`Snapshot ${snapshot.id}: UPDATE operation missing before_image`);
        const columns = Object.keys(beforeImage).filter((col) => !pk.includes(col));
        const setClause = columns.map((col) => `${col} = ?`).join(', ');
        const whereClause = pk.map((col) => `${col} = ?`).join(' AND ');
        await runInTx(
            `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`,
            [...columns.map((col) => beforeImage[col]), ...pk.map((col) => beforeImage[col])],
        );
        return;
    }

    if (operation === 'DELETE') {
        if (!beforeImage) throw new Error(`Snapshot ${snapshot.id}: DELETE operation missing before_image`);
        const columns = Object.keys(beforeImage);
        const placeholders = columns.map(() => '?').join(', ');
        await runInTx(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
            columns.map((col) => beforeImage[col]),
        );
        return;
    }

    throw new Error(`Snapshot ${snapshot.id}: unknown operation "${operation}"`);
}

/**
 * Restores every snapshot for one import_log_id, in reverse order
 * (newest-affected-row first) via the caller-supplied transactional
 * `runInTx(sql, params)` executor.
 */
async function restoreSnapshotsForImport(runInTx, importLogId) {
    const snapshots = await getSnapshotsForImport(importLogId);
    for (const snapshot of snapshots) {
        // eslint-disable-next-line no-await-in-loop
        await restoreOne(runInTx, snapshot);
    }
    return snapshots.length;
}

/**
 * Scope-overlap eligibility check: an import may only be rolled back if no
 * later, still-active (non-rolled-back) import for the same module touched
 * an overlapping row-key scope. Returns { eligible: true } or
 * { eligible: false, blockingImportLogId }.
 */
async function checkRollbackEligibility(importLogId) {
    // Already rolled back? A ROLLED_BACK entry referencing this import_log_id means it's spent.
    const priorRollback = await all('SELECT id FROM network_import_log WHERE rollback_of_import_log_id = ?', [importLogId]);
    if (priorRollback.length > 0) {
        return { eligible: false, reason: 'ALREADY_ROLLED_BACK' };
    }

    const targetSnapshots = await getSnapshotsForImport(importLogId);
    if (targetSnapshots.length === 0) {
        return { eligible: true };
    }

    const targetLog = await all('SELECT module FROM network_import_log WHERE id = ?', [importLogId]);
    if (targetLog.length === 0) {
        return { eligible: false, reason: 'IMPORT_LOG_NOT_FOUND' };
    }
    const { module } = targetLog[0];

    // Compare by id (monotonic AUTOINCREMENT), not created_at — CURRENT_TIMESTAMP has only
    // second-level resolution, so two imports in the same second would otherwise be
    // indistinguishable and a genuinely later import could slip past this check.
    const laterLogs = await all(
        `SELECT id FROM network_import_log
         WHERE module = ? AND id > ? AND status = 'SUCCESS'
         ORDER BY id ASC`,
        [module, importLogId],
    );

    const targetScopeKeys = new Set(
        targetSnapshots.map((s) => `${s.table_name}:${JSON.stringify(s.row_key)}`),
    );

    for (const laterLog of laterLogs) {
        // eslint-disable-next-line no-await-in-loop
        const laterSnapshots = await getSnapshotsForImport(laterLog.id);
        const overlap = laterSnapshots.some((s) => targetScopeKeys.has(`${s.table_name}:${JSON.stringify(s.row_key)}`));
        if (overlap) {
            return { eligible: false, blockingImportLogId: laterLog.id };
        }
    }

    return { eligible: true };
}

module.exports = {
    recordSnapshot,
    getSnapshotsForImport,
    restoreSnapshotsForImport,
    checkRollbackEligibility,
    pkColumns,
};
