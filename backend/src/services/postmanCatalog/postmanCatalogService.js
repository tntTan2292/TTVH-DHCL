/**
 * postmanCatalogService — F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1.
 *
 * Directory listing, manual edit, conflict resolution, and history/rollback.
 * Rollback is self-contained (dm_buu_ta_event), not the shared
 * networkMapImport rollback machinery — see migration file header for why.
 */

'use strict';

const crypto = require('crypto');
const { all, get } = require('../../config/db');
const { withTransaction } = require('../networkMapImport/transactionHelper');
const { normalizeCode } = require('./postmanCatalogImport');

async function listDirectory({ search, ma_bcvh: maBcvh } = {}) {
    const clauses = [];
    const params = [];
    if (search) {
        clauses.push('(ma_buu_ta LIKE ? OR ten_buu_ta LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }
    if (maBcvh) {
        clauses.push('ma_bcvh = ?');
        params.push(maBcvh);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return all(`SELECT * FROM dm_buu_ta ${where} ORDER BY ma_buu_ta ASC`, params);
}

async function listOpenConflicts() {
    return all("SELECT * FROM dm_buu_ta_conflict WHERE trang_thai = 'OPEN' ORDER BY created_at DESC");
}

async function listHistory(limit = 200) {
    return all('SELECT * FROM dm_buu_ta_event ORDER BY id DESC LIMIT ?', [Number(limit) || 200]);
}

/**
 * Manual name/status edit — creates the record (nguon=MANUAL) for an
 * unnamed code, or overwrites an existing one. Always nguon=MANUAL after
 * this call, per D1 (a manually-entered name is never silently overwritten
 * by a later file).
 */
async function manualUpsert(maBuuTaRaw, { ten_buu_ta: tenBuuTa, ma_bcvh: maBcvh, trang_thai_hoat_dong: trangThai }, performedBy) {
    const maBuuTa = normalizeCode(maBuuTaRaw);
    if (!maBuuTa) {
        const err = new Error('Thiếu mã bưu tá.');
        err.code = 'MISSING_CODE';
        throw err;
    }
    if (!tenBuuTa || !String(tenBuuTa).trim()) {
        const err = new Error('Thiếu tên bưu tá.');
        err.code = 'MISSING_NAME';
        throw err;
    }

    const existing = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', [maBuuTa]);
    const batchId = `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const after = {
        ma_buu_ta: maBuuTa,
        ten_buu_ta: String(tenBuuTa).trim(),
        ma_bcvh: maBcvh !== undefined ? maBcvh : (existing?.ma_bcvh ?? null),
        ten_bcvh: existing?.ten_bcvh ?? null,
        trang_thai_hoat_dong: trangThai !== undefined ? trangThai : (existing?.trang_thai_hoat_dong ?? null),
        nguon: 'MANUAL',
        in_latest_import: existing?.in_latest_import ?? 0,
    };

    return withTransaction(async (runInTx) => {
        if (existing) {
            await runInTx(
                `UPDATE dm_buu_ta SET ten_buu_ta=?, ma_bcvh=?, trang_thai_hoat_dong=?, nguon='MANUAL', updated_by=?, updated_at=CURRENT_TIMESTAMP
                 WHERE ma_buu_ta=?`,
                [after.ten_buu_ta, after.ma_bcvh, after.trang_thai_hoat_dong, performedBy || null, maBuuTa],
            );
        } else {
            await runInTx(
                `INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, ten_bcvh, trang_thai_hoat_dong, nguon, in_latest_import, updated_by, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'MANUAL', ?, ?, CURRENT_TIMESTAMP)`,
                [after.ma_buu_ta, after.ten_buu_ta, after.ma_bcvh, after.ten_bcvh, after.trang_thai_hoat_dong, after.in_latest_import, performedBy || null],
            );
        }
        await runInTx(
            `INSERT INTO dm_buu_ta_event (batch_id, ma_buu_ta, operation, before_image, after_image, nguon, created_by)
             VALUES (?, ?, ?, ?, ?, 'MANUAL', ?)`,
            [batchId, maBuuTa, existing ? 'UPDATE' : 'INSERT', existing ? JSON.stringify(existing) : null, JSON.stringify(after), performedBy || null],
        );
        return get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', [maBuuTa]);
    });
}

/**
 * D1 conflict resolution: KEPT_MANUAL leaves dm_buu_ta untouched (the
 * manual name wins permanently for this batch); APPLIED_FILE writes the
 * file's name/BCVH/status now, exactly like a normal IMPORT update would
 * have. Either way the conflict is closed and the decision is itself a
 * logged, reversible event (RESOLVE_CONFLICT).
 */
async function resolveConflict(conflictId, decision, performedBy) {
    if (!['KEPT_MANUAL', 'APPLIED_FILE'].includes(decision)) {
        const err = new Error('decision phải là KEPT_MANUAL hoặc APPLIED_FILE.');
        err.code = 'INVALID_DECISION';
        throw err;
    }
    const conflict = await get("SELECT * FROM dm_buu_ta_conflict WHERE id = ? AND trang_thai = 'OPEN'", [conflictId]);
    if (!conflict) {
        const err = new Error(`Không tìm thấy xung đột #${conflictId} đang mở.`);
        err.code = 'CONFLICT_NOT_FOUND';
        throw err;
    }

    // M3 (Backend Review 002): this decision gets its OWN batch id, never the
    // original import's `conflict.batch_id`. Reusing the import's batch id mixed
    // a later human decision into an earlier file import's history, so rolling
    // back that earlier import would silently also undo this decision — the
    // eligibility check in checkRollbackEligibility() only looks for a event with
    // a DIFFERENT batch_id touching the same code, so a same-batch-id write was
    // invisible to it and rollback would wrongly succeed.
    const resolveBatchId = `resolve-conflict-${conflictId}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    return withTransaction(async (runInTx) => {
        await runInTx(
            'UPDATE dm_buu_ta_conflict SET trang_thai = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
            [decision, performedBy || null, conflictId],
        );

        if (decision === 'APPLIED_FILE') {
            const before = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', [conflict.ma_buu_ta]);
            const after = {
                ...before,
                ten_buu_ta: conflict.ten_tu_file,
                ma_bcvh: conflict.ma_bcvh_file,
                ten_bcvh: conflict.ten_bcvh_file,
                trang_thai_hoat_dong: conflict.trang_thai_file,
                nguon: 'IMPORT',
                in_latest_import: 1,
                last_import_batch_id: resolveBatchId,
            };
            await runInTx(
                `UPDATE dm_buu_ta SET ten_buu_ta=?, ma_bcvh=?, ten_bcvh=?, trang_thai_hoat_dong=?, nguon='IMPORT', in_latest_import=1, last_import_batch_id=?, updated_by=?, updated_at=CURRENT_TIMESTAMP
                 WHERE ma_buu_ta=?`,
                [after.ten_buu_ta, after.ma_bcvh, after.ten_bcvh, after.trang_thai_hoat_dong, resolveBatchId, performedBy || null, conflict.ma_buu_ta],
            );
            await runInTx(
                `INSERT INTO dm_buu_ta_event (batch_id, ma_buu_ta, operation, before_image, after_image, nguon, file_name, file_fingerprint, created_by)
                 VALUES (?, ?, 'RESOLVE_CONFLICT', ?, ?, 'IMPORT', ?, ?, ?)`,
                [resolveBatchId, conflict.ma_buu_ta, JSON.stringify(before), JSON.stringify(after), conflict.file_name, conflict.file_fingerprint, performedBy || null],
            );
        } else {
            const current = await get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', [conflict.ma_buu_ta]);
            await runInTx(
                `INSERT INTO dm_buu_ta_event (batch_id, ma_buu_ta, operation, before_image, after_image, nguon, file_name, file_fingerprint, created_by)
                 VALUES (?, ?, 'RESOLVE_CONFLICT', ?, ?, 'MANUAL', ?, ?, ?)`,
                [resolveBatchId, conflict.ma_buu_ta, JSON.stringify(current), JSON.stringify(current), conflict.file_name, conflict.file_fingerprint, performedBy || null],
            );
        }

        return get("SELECT * FROM dm_buu_ta_conflict WHERE id = ?", [conflictId]);
    });
}

/**
 * Restores every event in a batch to its before-image (or deletes the row
 * for an INSERT). Refused if a LATER batch already touched any of the same
 * codes — reported, not forced, mirroring the shared rollback service's
 * eligibility rule.
 */
async function checkRollbackEligibility(batchId) {
    const events = await all('SELECT DISTINCT ma_buu_ta, id FROM dm_buu_ta_event WHERE batch_id = ? ORDER BY id ASC', [batchId]);
    // A batch whose only outcome was raising a conflict (D1: "No write" — no
    // dm_buu_ta_event) still legitimately "exists" for rollback purposes (M3):
    // it needs to close its OPEN conflict(s), even though there is no dm_buu_ta
    // row to restore. Checked here so such a batch is not wrongly reported as
    // BATCH_NOT_FOUND.
    const conflictRows = await all('SELECT id FROM dm_buu_ta_conflict WHERE batch_id = ?', [batchId]);
    if (events.length === 0 && conflictRows.length === 0) {
        return { eligible: false, reason: 'BATCH_NOT_FOUND' };
    }
    if (events.length === 0) {
        // Nothing was ever written to dm_buu_ta by this batch, so no other
        // batch's write can conflict with restoring it — there is nothing to
        // restore, only a (possibly already-resolved) conflict to close.
        return { eligible: true, codes: [] };
    }

    const minEventId = Math.min(...events.map((e) => e.id));
    const codes = [...new Set(events.map((e) => e.ma_buu_ta))];

    const placeholders = codes.map(() => '?').join(',');
    const laterEvents = await all(
        `SELECT DISTINCT batch_id FROM dm_buu_ta_event WHERE id > ? AND batch_id != ? AND ma_buu_ta IN (${placeholders})`,
        [minEventId, batchId, ...codes],
    );
    if (laterEvents.length > 0) {
        return { eligible: false, reason: 'BLOCKED_BY_LATER_BATCH', blockingBatchIds: laterEvents.map((e) => e.batch_id) };
    }
    return { eligible: true, codes };
}

async function rollbackBatch(batchId, performedBy) {
    const eligibility = await checkRollbackEligibility(batchId);
    if (!eligibility.eligible) {
        return { success: false, ...eligibility };
    }

    const events = await all('SELECT * FROM dm_buu_ta_event WHERE batch_id = ? ORDER BY id DESC', [batchId]);
    const rollbackBatchId = `rollback-${batchId}-${Date.now()}`;

    const txResult = await withTransaction(async (runInTx) => {
        let count = 0;
        for (const event of events) {
            const before = event.before_image ? JSON.parse(event.before_image) : null;
            if (!before) {
                // eslint-disable-next-line no-await-in-loop
                await runInTx('DELETE FROM dm_buu_ta WHERE ma_buu_ta = ?', [event.ma_buu_ta]);
            } else {
                // eslint-disable-next-line no-await-in-loop
                await runInTx(
                    `INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, ten_bcvh, trang_thai_hoat_dong, nguon, in_latest_import, last_import_batch_id, updated_by, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(ma_buu_ta) DO UPDATE SET
                        ten_buu_ta = excluded.ten_buu_ta, ma_bcvh = excluded.ma_bcvh, ten_bcvh = excluded.ten_bcvh,
                        trang_thai_hoat_dong = excluded.trang_thai_hoat_dong, nguon = excluded.nguon,
                        in_latest_import = excluded.in_latest_import, last_import_batch_id = excluded.last_import_batch_id,
                        updated_at = CURRENT_TIMESTAMP`,
                    [before.ma_buu_ta, before.ten_buu_ta, before.ma_bcvh ?? null, before.ten_bcvh ?? null, before.trang_thai_hoat_dong ?? null, before.nguon, before.in_latest_import ?? 0, before.last_import_batch_id ?? null, performedBy || null],
                );
            }
            // after_image is NOT NULL — rolling back an INSERT has no "after" row
            // (the code is deleted), so a deletion marker is logged instead of null.
            const rollbackAfterImage = event.before_image || JSON.stringify({ deleted: true, ma_buu_ta: event.ma_buu_ta });
            // eslint-disable-next-line no-await-in-loop
            await runInTx(
                `INSERT INTO dm_buu_ta_event (batch_id, ma_buu_ta, operation, before_image, after_image, nguon, created_by)
                 VALUES (?, ?, 'ROLLBACK', ?, ?, ?, ?)`,
                [rollbackBatchId, event.ma_buu_ta, event.after_image, rollbackAfterImage, event.nguon, performedBy || null],
            );
            count += 1;
        }

        // M3 (Backend Review 002): a conflict this batch raised is a proposal from
        // the file that batch imported — rolling back that import withdraws the
        // proposal. dm_buu_ta itself was never written for a conflicted code (D1:
        // "No write"), so closing as KEPT_MANUAL is factually accurate, not a
        // fabricated PO decision. Left OPEN, the review queue would keep showing a
        // "pending" conflict against a batch that no longer exists.
        const openConflicts = await all("SELECT id FROM dm_buu_ta_conflict WHERE batch_id = ? AND trang_thai = 'OPEN'", [batchId]);
        for (const conflict of openConflicts) {
            // eslint-disable-next-line no-await-in-loop
            await runInTx(
                "UPDATE dm_buu_ta_conflict SET trang_thai = 'KEPT_MANUAL', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
                [performedBy ? `${performedBy} (auto-closed by rollback)` : 'system (auto-closed by rollback)', conflict.id],
            );
        }

        return { count, conflictsClosed: openConflicts.length };
    });

    return {
        success: true,
        restoredCount: txResult.count,
        conflictsClosed: txResult.conflictsClosed,
        rollbackBatchId,
        originalBatchId: batchId,
    };
}

module.exports = {
    listDirectory,
    listOpenConflicts,
    listHistory,
    manualUpsert,
    resolveConflict,
    checkRollbackEligibility,
    rollbackBatch,
};
