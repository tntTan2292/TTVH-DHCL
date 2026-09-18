/**
 * postmanCatalogImport — F13-ROUTE-POSTMAN-IDENTITY-01 Phase 1.
 *
 * Classification and apply logic for Design of Record v2 §7 (D1 + D3):
 *
 *   | existing            | file row differs how | action                                    |
 *   | none                | -                     | INSERT, nguon=IMPORT, in_latest_import=1  |
 *   | nguon=IMPORT, same  | -                     | unchanged (BCVH/status refresh if needed) |
 *   | nguon=IMPORT, diff  | name differs          | UPDATE (file still owns)                  |
 *   | nguon=MANUAL, same  | -                     | unchanged; ownership stays MANUAL         |
 *   | nguon=MANUAL, diff  | name differs          | NO WRITE — dm_buu_ta_conflict (OPEN)      |
 *   | code not in file    | -                     | keep row, in_latest_import=0 (never delete)|
 *
 * Every row that actually changes dm_buu_ta is logged in dm_buu_ta_event
 * with a full before/after row image (not just the changed fields), so
 * ROLLBACK can restore the exact prior row without needing to know which
 * columns changed.
 */

'use strict';

const { all, get } = require('../../config/db');

const TRACKED_FIELDS = ['ten_buu_ta', 'ma_bcvh', 'ten_bcvh', 'trang_thai_hoat_dong', 'nguon', 'in_latest_import'];

function normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
}

function fieldsDiffer(a, b) {
    return TRACKED_FIELDS.some((f) => (a?.[f] ?? null) !== (b?.[f] ?? null));
}

/**
 * Classifies parsed directory rows against live dm_buu_ta state.
 * Read-only — issues no writes. Used by both Preview and Confirm (Confirm
 * re-classifies server-side rather than trusting a client-echoed preview).
 *
 * @returns {{ rows: Array, summary: object, absentRows: Array }}
 */
async function classifyPostmanCatalogImport(fileRecords) {
    const existingRows = await all('SELECT * FROM dm_buu_ta');
    const existingByCode = new Map(existingRows.map((r) => [normalizeCode(r.ma_buu_ta), r]));
    const seenInFile = new Set();

    const rows = fileRecords.map((record) => {
        const code = normalizeCode(record.ma_buu_ta);
        seenInFile.add(code);
        const existing = existingByCode.get(code) || null;

        if (!existing) {
            return {
                classification: 'insert', ma_buu_ta: code, file: record, existing: null,
            };
        }

        if (existing.nguon === 'MANUAL' && existing.ten_buu_ta !== record.ten_buu_ta) {
            return {
                classification: 'conflict', ma_buu_ta: code, file: record, existing,
            };
        }

        // M2 (Backend Review 002): a manually-protected NAME is never overwritten by a
        // newer file, but BCVH/status are not personal names and carry no manual-edit
        // conflict — DoR v2 §7 says they always refresh. Only ten_buu_ta/nguon stay pinned.
        const desired = existing.nguon === 'MANUAL'
            ? {
                ...existing,
                ma_bcvh: record.ma_bcvh,
                ten_bcvh: record.ten_bcvh,
                trang_thai_hoat_dong: record.trang_thai_hoat_dong,
                in_latest_import: 1,
            }
            : {
                ma_buu_ta: code,
                ten_buu_ta: record.ten_buu_ta,
                ma_bcvh: record.ma_bcvh,
                ten_bcvh: record.ten_bcvh,
                trang_thai_hoat_dong: record.trang_thai_hoat_dong,
                nguon: 'IMPORT',
                in_latest_import: 1,
            };

        if (fieldsDiffer(existing, desired)) {
            return {
                classification: 'update', ma_buu_ta: code, file: record, existing, desired,
            };
        }
        return {
            classification: 'unchanged', ma_buu_ta: code, file: record, existing,
        };
    });

    const absentRows = existingRows
        .filter((r) => !seenInFile.has(normalizeCode(r.ma_buu_ta)))
        .map((r) => ({
            classification: 'absent_from_file',
            ma_buu_ta: normalizeCode(r.ma_buu_ta),
            existing: r,
            needsWrite: r.in_latest_import === 1,
        }));

    const summary = {
        insert: 0, update: 0, unchanged: 0, conflict: 0, absent_from_file: absentRows.length,
    };
    rows.forEach((r) => { summary[r.classification] += 1; });

    return { rows, summary, absentRows };
}

/**
 * Applies a classified import inside an existing transaction. Must run
 * after `classifyPostmanCatalogImport` inside the SAME transaction/lock
 * window (Confirm re-classifies immediately before calling this).
 */
async function applyPostmanCatalogImport(runInTx, batchId, classified, meta) {
    const { fileName, fileFingerprint, performedBy } = meta;
    const counts = {
        inserted: 0, updated: 0, unchanged: 0, conflicts: 0, markedAbsent: 0,
    };

    for (const row of classified.rows) {
        if (row.classification === 'insert') {
            const after = {
                ma_buu_ta: row.ma_buu_ta,
                ten_buu_ta: row.file.ten_buu_ta,
                ma_bcvh: row.file.ma_bcvh,
                ten_bcvh: row.file.ten_bcvh,
                trang_thai_hoat_dong: row.file.trang_thai_hoat_dong,
                nguon: 'IMPORT',
                in_latest_import: 1,
                last_import_batch_id: batchId,
            };
            // eslint-disable-next-line no-await-in-loop
            await runInTx(
                `INSERT INTO dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh, ten_bcvh, trang_thai_hoat_dong, nguon, in_latest_import, last_import_batch_id, updated_by, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [after.ma_buu_ta, after.ten_buu_ta, after.ma_bcvh, after.ten_bcvh, after.trang_thai_hoat_dong, after.nguon, after.in_latest_import, after.last_import_batch_id, performedBy || null],
            );
            // eslint-disable-next-line no-await-in-loop
            await runInTx(
                `INSERT INTO dm_buu_ta_event (batch_id, ma_buu_ta, operation, before_image, after_image, nguon, file_name, file_fingerprint, created_by)
                 VALUES (?, ?, 'INSERT', NULL, ?, 'IMPORT', ?, ?, ?)`,
                [batchId, row.ma_buu_ta, JSON.stringify(after), fileName, fileFingerprint, performedBy || null],
            );
            counts.inserted += 1;
        } else if (row.classification === 'update') {
            const after = { ...row.desired, last_import_batch_id: batchId };
            // eslint-disable-next-line no-await-in-loop
            await runInTx(
                `UPDATE dm_buu_ta SET ten_buu_ta=?, ma_bcvh=?, ten_bcvh=?, trang_thai_hoat_dong=?, nguon=?, in_latest_import=?, last_import_batch_id=?, updated_by=?, updated_at=CURRENT_TIMESTAMP
                 WHERE ma_buu_ta=?`,
                [after.ten_buu_ta, after.ma_bcvh, after.ten_bcvh, after.trang_thai_hoat_dong, after.nguon, after.in_latest_import, after.last_import_batch_id, performedBy || null, row.ma_buu_ta],
            );
            // eslint-disable-next-line no-await-in-loop
            await runInTx(
                `INSERT INTO dm_buu_ta_event (batch_id, ma_buu_ta, operation, before_image, after_image, nguon, file_name, file_fingerprint, created_by)
                 VALUES (?, ?, 'UPDATE', ?, ?, ?, ?, ?, ?)`,
                [batchId, row.ma_buu_ta, JSON.stringify(row.existing), JSON.stringify(after), after.nguon, fileName, fileFingerprint, performedBy || null],
            );
            counts.updated += 1;
        } else if (row.classification === 'conflict') {
            // eslint-disable-next-line no-await-in-loop
            await runInTx(
                `INSERT INTO dm_buu_ta_conflict (ma_buu_ta, ten_hien_tai, ten_tu_file, ma_bcvh_file, ten_bcvh_file, trang_thai_file, batch_id, file_name, file_fingerprint, trang_thai)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
                 ON CONFLICT(ma_buu_ta) WHERE trang_thai = 'OPEN' DO UPDATE SET
                    ten_tu_file = excluded.ten_tu_file, ma_bcvh_file = excluded.ma_bcvh_file,
                    ten_bcvh_file = excluded.ten_bcvh_file, trang_thai_file = excluded.trang_thai_file,
                    batch_id = excluded.batch_id, file_name = excluded.file_name, file_fingerprint = excluded.file_fingerprint`,
                [row.ma_buu_ta, row.existing.ten_buu_ta, row.file.ten_buu_ta, row.file.ma_bcvh, row.file.ten_bcvh, row.file.trang_thai_hoat_dong, batchId, fileName, fileFingerprint],
            );
            counts.conflicts += 1;
        } else {
            counts.unchanged += 1;
        }
    }

    for (const row of classified.absentRows) {
        if (!row.needsWrite) continue; // eslint-disable-line no-continue
        const before = row.existing;
        const after = { ...before, in_latest_import: 0, last_import_batch_id: batchId };
        // eslint-disable-next-line no-await-in-loop
        await runInTx(
            'UPDATE dm_buu_ta SET in_latest_import = 0, last_import_batch_id = ?, updated_at = CURRENT_TIMESTAMP WHERE ma_buu_ta = ?',
            [batchId, row.ma_buu_ta],
        );
        // eslint-disable-next-line no-await-in-loop
        await runInTx(
            `INSERT INTO dm_buu_ta_event (batch_id, ma_buu_ta, operation, before_image, after_image, nguon, file_name, file_fingerprint, created_by)
             VALUES (?, ?, 'UPDATE', ?, ?, ?, ?, ?, ?)`,
            [batchId, row.ma_buu_ta, JSON.stringify(before), JSON.stringify(after), before.nguon, fileName, fileFingerprint, performedBy || null],
        );
        counts.markedAbsent += 1;
    }

    return counts;
}

async function getExistingByCode(maBuuTa) {
    return get('SELECT * FROM dm_buu_ta WHERE ma_buu_ta = ?', [normalizeCode(maBuuTa)]);
}

module.exports = {
    classifyPostmanCatalogImport,
    applyPostmanCatalogImport,
    getExistingByCode,
    normalizeCode,
    TRACKED_FIELDS,
};
