'use strict';

const path = require('path');

const COMPLETION_STATUSES = Object.freeze({
    SUCCESS: 'SUCCESS',
    MISSING: 'MISSING',
    INCOMPLETE: 'INCOMPLETE',
    MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
});

const SAFE_SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertSqlIdentifier(value, fieldName) {
    if (!SAFE_SQL_IDENTIFIER.test(String(value || ''))) {
        throw new Error(`${fieldName} must be a safe SQL identifier.`);
    }
    return value;
}

function createSqliteImportCompletionPolicy({
    id,
    dateColumn = 'ngay_do_kiem',
    distinctColumn,
    expectedRowCount = null,
    requireProcessedArtifact = true,
}) {
    if (!id || typeof id !== 'string') throw new Error('Completion policy id is required.');
    assertSqlIdentifier(dateColumn, 'completionPolicy.dateColumn');
    assertSqlIdentifier(distinctColumn, 'completionPolicy.distinctColumn');
    if (expectedRowCount !== null && (!Number.isInteger(expectedRowCount) || expectedRowCount <= 0)) {
        throw new Error('completionPolicy.expectedRowCount must be a positive integer or null.');
    }

    return Object.freeze({
        id,
        async evaluate({ db, fs: fsImpl, indicator, lane, businessDate }) {
            const targetTable = assertSqlIdentifier(lane.targetTable, 'lane.targetTable');
            const artifactFilename = indicator.filenameDateRule.format(businessDate);
            const artifactPath = path.join(indicator.processedDir, lane.code, artifactFilename);
            const row = await db.get(
                `SELECT COUNT(*) AS row_count, COUNT(DISTINCT ${distinctColumn}) AS distinct_count
                 FROM ${targetTable}
                 WHERE ${dateColumn} = ?`,
                [businessDate],
            );
            const logs = await db.all(
                `SELECT id, status, total_records, error_records, skipped_records
                 FROM import_log
                 WHERE indicator = ?
                   AND source_lane = ?
                   AND ngay_do_kiem = ?
                 ORDER BY id ASC`,
                [indicator.code, lane.code, businessDate],
            );

            const rowCount = Number(row?.row_count || 0);
            const distinctCount = Number(row?.distinct_count || 0);
            const successLogCount = logs.filter((log) => log.status === 'SUCCESS').length;
            const fileMoveFailedLogCount = logs.filter((log) => log.status === 'FILE_MOVE_FAILED').length;
            const failedLogCount = logs.filter((log) => log.status === 'FAILED').length;
            const artifactPresent = requireProcessedArtifact ? fsImpl.existsSync(artifactPath) : false;
            const artifactRequirementMet = !requireProcessedArtifact || artifactPresent;
            const rowCountValid = expectedRowCount === null
                ? rowCount > 0
                : rowCount === expectedRowCount;
            const integrityValid = rowCountValid && distinctCount === rowCount;
            const evidence = {
                policy_id: id,
                target_table: targetTable,
                row_count: rowCount,
                distinct_count: distinctCount,
                expected_row_count: expectedRowCount,
                success_log_count: successLogCount,
                file_move_failed_log_count: fileMoveFailedLogCount,
                failed_log_count: failedLogCount,
                import_log_count: logs.length,
                processed_artifact_required: requireProcessedArtifact,
                processed_artifact_present: artifactPresent,
                processed_artifact_filename: artifactFilename,
            };

            // PO policy: committed data alone is sufficient for SUCCESS -- the import
            // source (a completed Import run vs. a legacy/direct row) is not relevant
            // to the "Đã hoàn tất" status. `successLogCount`/`artifactRequirementMet`
            // are intentionally not part of this gate; they remain in `evidence` for
            // internal inspection only.
            if (integrityValid) {
                return { status: COMPLETION_STATUSES.SUCCESS, reason: 'COMPLETE_EVIDENCE', evidence };
            }

            if (rowCount > 0) {
                let reason = 'COMMITTED_DATA_WITHOUT_COMPLETE_IMPORT_EVIDENCE';
                if (fileMoveFailedLogCount > 0) reason = 'COMMITTED_DATA_FILE_MOVE_FAILED';
                else if (!artifactRequirementMet) reason = 'COMMITTED_DATA_PROCESSED_ARTIFACT_MISSING';
                else if (!integrityValid) reason = 'COMMITTED_DATA_INTEGRITY_MISMATCH';

                return {
                    status: COMPLETION_STATUSES.MANUAL_REVIEW_REQUIRED,
                    reason,
                    evidence,
                };
            }

            if (logs.length > 0 || artifactPresent) {
                return {
                    status: COMPLETION_STATUSES.INCOMPLETE,
                    reason: 'IMPORT_EVIDENCE_WITHOUT_TARGET_DATA',
                    evidence,
                };
            }

            return { status: COMPLETION_STATUSES.MISSING, reason: 'NO_IMPORT_EVIDENCE', evidence };
        },
    });
}

module.exports = {
    COMPLETION_STATUSES,
    assertSqlIdentifier,
    createSqliteImportCompletionPolicy,
};
