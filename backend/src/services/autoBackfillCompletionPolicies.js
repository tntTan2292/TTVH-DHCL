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
    requiredValues = null,
}) {
    if (!id || typeof id !== 'string') throw new Error('Completion policy id is required.');
    assertSqlIdentifier(dateColumn, 'completionPolicy.dateColumn');
    // A single column, or several columns that together form the table's unique key (F1.1 TCT:
    // accepting province x delivering province). A single column keeps the original SQL.
    const distinctColumns = Array.isArray(distinctColumn) ? distinctColumn : [distinctColumn];
    if (distinctColumns.length === 0) throw new Error('completionPolicy.distinctColumn must not be empty.');
    distinctColumns.forEach((column) => assertSqlIdentifier(column, 'completionPolicy.distinctColumn'));
    const distinctExpression = distinctColumns.length === 1
        ? distinctColumns[0]
        : distinctColumns.map((column) => `COALESCE(${column}, '')`).join(" || '|' || ");
    // Optional completeness check: every listed value must appear in the column on that date
    // (F1.1 TCT: the 34 ranked delivering provinces).
    if (requiredValues !== null) {
        assertSqlIdentifier(requiredValues.column, 'completionPolicy.requiredValues.column');
        if (!Array.isArray(requiredValues.values) || requiredValues.values.length === 0) {
            throw new Error('completionPolicy.requiredValues.values must be a non-empty array.');
        }
    }
    if (expectedRowCount !== null && (!Number.isInteger(expectedRowCount) || expectedRowCount <= 0)) {
        throw new Error('completionPolicy.expectedRowCount must be a positive integer or null.');
    }

    // Pure: turns what was read from the database / disk for one business date into the policy result.
    // Shared by evaluate() (one date) and evaluateBatch() (many dates) so both give identical answers.
    function buildResult({ targetTable, artifactFilename, rowCount, distinctCount, requiredPresentCount, logs, artifactPresent }) {
        const successLogCount = logs.filter((log) => log.status === 'SUCCESS').length;
        const fileMoveFailedLogCount = logs.filter((log) => log.status === 'FILE_MOVE_FAILED').length;
        const failedLogCount = logs.filter((log) => log.status === 'FAILED').length;
        const artifactRequirementMet = !requireProcessedArtifact || artifactPresent;
        const rowCountValid = expectedRowCount === null
            ? rowCount > 0
            : rowCount === expectedRowCount;
        const requiredValuesComplete = requiredValues === null || requiredPresentCount === requiredValues.values.length;
        const integrityValid = rowCountValid && distinctCount === rowCount && requiredValuesComplete;
        const evidence = {
            policy_id: id,
            target_table: targetTable,
            row_count: rowCount,
            distinct_count: distinctCount,
            required_values_expected: requiredValues === null ? null : requiredValues.values.length,
            required_values_present: requiredPresentCount,
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

        // Only failed import attempts and no data at all (e.g. a bulk insert that hit SQLITE_BUSY): nothing was
        // committed and nothing needs review, so the day is simply still missing and may be queued again.
        if (logs.length > 0 && failedLogCount === logs.length && !artifactPresent) {
            return { status: COMPLETION_STATUSES.MISSING, reason: 'ONLY_FAILED_IMPORT_ATTEMPTS', evidence };
        }

        if (logs.length > 0 || artifactPresent) {
            return {
                status: COMPLETION_STATUSES.INCOMPLETE,
                reason: 'IMPORT_EVIDENCE_WITHOUT_TARGET_DATA',
                evidence,
            };
        }

        return { status: COMPLETION_STATUSES.MISSING, reason: 'NO_IMPORT_EVIDENCE', evidence };
    }

    return Object.freeze({
        id,
        async evaluate({ db, fs: fsImpl, indicator, lane, businessDate }) {
            const targetTable = assertSqlIdentifier(lane.targetTable, 'lane.targetTable');
            const artifactFilename = indicator.filenameDateRule.format(businessDate);
            const artifactPath = path.join(indicator.processedDir, lane.code, artifactFilename);
            const row = await db.get(
                `SELECT COUNT(*) AS row_count, COUNT(DISTINCT ${distinctExpression}) AS distinct_count
                 FROM ${targetTable}
                 WHERE ${dateColumn} = ?`,
                [businessDate],
            );
            let requiredPresentCount = null;
            if (requiredValues !== null) {
                const present = await db.get(
                    `SELECT COUNT(DISTINCT ${requiredValues.column}) AS present_count
                     FROM ${targetTable}
                     WHERE ${dateColumn} = ?
                       AND ${requiredValues.column} IN (${requiredValues.values.map(() => '?').join(', ')})`,
                    [businessDate, ...requiredValues.values],
                );
                requiredPresentCount = Number(present?.present_count || 0);
            }
            const logs = await db.all(
                `SELECT id, status, total_records, error_records, skipped_records
                 FROM import_log
                 WHERE indicator = ?
                   AND source_lane = ?
                   AND ngay_do_kiem = ?
                 ORDER BY id ASC`,
                [indicator.code, lane.code, businessDate],
            );
            return buildResult({
                targetTable,
                artifactFilename,
                rowCount: Number(row?.row_count || 0),
                distinctCount: Number(row?.distinct_count || 0),
                requiredPresentCount,
                logs,
                artifactPresent: requireProcessedArtifact ? fsImpl.existsSync(artifactPath) : false,
            });
        },

        // Coverage scan fast path: the same answer as evaluate() for every date, from one grouped read per table
        // instead of two or three queries and a file check per date. Returns Map<businessDate, result>.
        async evaluateBatch({ db, fs: fsImpl, indicator, lane, dates }) {
            const results = new Map();
            if (!dates || dates.length === 0) return results;
            const targetTable = assertSqlIdentifier(lane.targetTable, 'lane.targetTable');
            const sorted = [...dates].sort();
            const low = sorted[0];
            const high = sorted[sorted.length - 1];

            const countRows = await db.all(
                `SELECT ${dateColumn} AS d, COUNT(*) AS row_count, COUNT(DISTINCT ${distinctExpression}) AS distinct_count
                 FROM ${targetTable}
                 WHERE ${dateColumn} >= ? AND ${dateColumn} <= ?
                 GROUP BY ${dateColumn}`,
                [low, high],
            );
            const counts = new Map(countRows.map((row) => [row.d, row]));

            let presentByDate = null;
            if (requiredValues !== null) {
                const presentRows = await db.all(
                    `SELECT ${dateColumn} AS d, COUNT(DISTINCT ${requiredValues.column}) AS present_count
                     FROM ${targetTable}
                     WHERE ${dateColumn} >= ? AND ${dateColumn} <= ?
                       AND ${requiredValues.column} IN (${requiredValues.values.map(() => '?').join(', ')})
                     GROUP BY ${dateColumn}`,
                    [low, high, ...requiredValues.values],
                );
                presentByDate = new Map(presentRows.map((row) => [row.d, Number(row.present_count || 0)]));
            }

            const logRows = await db.all(
                `SELECT id, status, total_records, error_records, skipped_records, ngay_do_kiem AS d
                 FROM import_log
                 WHERE indicator = ?
                   AND source_lane = ?
                   AND ngay_do_kiem >= ? AND ngay_do_kiem <= ?
                 ORDER BY id ASC`,
                [indicator.code, lane.code, low, high],
            );
            const logsByDate = new Map();
            for (const { d, ...log } of logRows) {
                if (!logsByDate.has(d)) logsByDate.set(d, []);
                logsByDate.get(d).push(log);
            }

            // One directory listing instead of one existsSync per date. Windows file names are case-insensitive,
            // exactly like existsSync, so compare lower-cased there. If the listing cannot be read for any
            // reason other than "folder absent", fall back to asking per date, like evaluate().
            const fold = (name) => (process.platform === 'win32' ? String(name).toLowerCase() : String(name));
            let artifactNames = null;
            if (requireProcessedArtifact && typeof fsImpl.readdirSync === 'function') {
                try {
                    artifactNames = new Set(fsImpl.readdirSync(path.join(indicator.processedDir, lane.code)).map(fold));
                } catch (error) {
                    artifactNames = error?.code === 'ENOENT' || error?.code === 'ENOTDIR' ? new Set() : null;
                }
            }

            for (const businessDate of dates) {
                const artifactFilename = indicator.filenameDateRule.format(businessDate);
                let artifactPresent = false;
                if (requireProcessedArtifact) {
                    artifactPresent = artifactNames
                        ? artifactNames.has(fold(artifactFilename))
                        : fsImpl.existsSync(path.join(indicator.processedDir, lane.code, artifactFilename));
                }
                const row = counts.get(businessDate);
                results.set(businessDate, buildResult({
                    targetTable,
                    artifactFilename,
                    rowCount: Number(row?.row_count || 0),
                    distinctCount: Number(row?.distinct_count || 0),
                    requiredPresentCount: presentByDate === null ? null : (presentByDate.get(businessDate) || 0),
                    logs: logsByDate.get(businessDate) || [],
                    artifactPresent,
                }));
            }
            return results;
        },
    });
}

module.exports = {
    COMPLETION_STATUSES,
    assertSqlIdentifier,
    createSqliteImportCompletionPolicy,
};
