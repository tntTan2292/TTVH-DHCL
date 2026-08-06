/**
 * rollbackService — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Orchestrates a rollback: eligibility check (no later Import touched the
 * same scope) -> transactional snapshot restore -> new ROLLED_BACK log
 * entry referencing the original import.
 */

'use strict';

const crypto = require('crypto');
const { get } = require('../../config/db');
const { withTransaction } = require('./transactionHelper');
const { checkRollbackEligibility, restoreSnapshotsForImport } = require('./importSnapshot');

async function rollbackImport(importLogId, performedBy) {
    const originalLog = await get('SELECT * FROM network_import_log WHERE id = ?', [importLogId]);
    if (!originalLog) {
        return { success: false, code: 'IMPORT_LOG_NOT_FOUND', message: `Không tìm thấy lịch sử Import #${importLogId}.` };
    }
    if (originalLog.status !== 'SUCCESS') {
        return { success: false, code: 'NOT_ROLLBACKABLE', message: `Chỉ có thể rollback bản ghi trạng thái SUCCESS (hiện tại: ${originalLog.status}).` };
    }

    const eligibility = await checkRollbackEligibility(importLogId);
    if (!eligibility.eligible) {
        if (eligibility.reason === 'ALREADY_ROLLED_BACK') {
            return { success: false, code: 'NOT_ROLLBACKABLE', message: `Import #${importLogId} đã được rollback trước đó.` };
        }
        return {
            success: false,
            code: 'BLOCKED_BY_LATER_IMPORT',
            message: `Không thể rollback: Import #${eligibility.blockingImportLogId} thực hiện sau và đã thay đổi dữ liệu trùng phạm vi. Vui lòng rollback #${eligibility.blockingImportLogId} trước (nếu hợp lệ).`,
            blockingImportLogId: eligibility.blockingImportLogId,
        };
    }

    const rollbackFingerprint = crypto
        .createHash('sha256')
        .update(`${originalLog.file_fingerprint}:rollback:${importLogId}:${Date.now()}`)
        .digest('hex');

    const restoredCount = await withTransaction(async (runInTx) => {
        const count = await restoreSnapshotsForImport(runInTx, importLogId);

        await runInTx(
            `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, inserted_records, updated_records, skipped_records, error_records, uploaded_by, rollback_of_import_log_id)
             VALUES (?, ?, ?, 'ROLLED_BACK', ?, 0, 0, 0, 0, ?, ?)`,
            [originalLog.module, `ROLLBACK của #${importLogId} (${originalLog.file_name})`, rollbackFingerprint, count, performedBy || null, importLogId],
        );

        return count;
    });

    return { success: true, restoredRowCount: restoredCount, rolledBackImportLogId: importLogId };
}

module.exports = { rollbackImport };
