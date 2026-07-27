'use strict';

const { db, all, run } = require('./src/config/db');
const { buildCorrectionPlan } = require('./src/services/importHistoryDefect3Recovery');

const APPLY = process.argv.includes('--apply');

const CANDIDATE_SQL = `
SELECT
    log.id,
    log.file_name,
    log.ngay_do_kiem,
    log.status,
    log.total_records,
    log.error_records,
    log.skipped_records,
    (
        SELECT COUNT(*)
        FROM fact_f13 fact
        WHERE fact.import_log_id = log.id
    ) AS linked_fact_count,
    (
        SELECT COUNT(*)
        FROM fact_f13 fact
        WHERE fact.ngay_do_kiem = log.ngay_do_kiem
    ) AS same_date_fact_count,
    (
        SELECT COUNT(*)
        FROM import_log peer
        WHERE peer.ngay_do_kiem = log.ngay_do_kiem
          AND peer.status IN ('SUCCESS', 'FILE_MOVE_FAILED')
    ) AS same_date_import_count
FROM import_log log
WHERE log.status IN ('SUCCESS', 'FILE_MOVE_FAILED')
  AND COALESCE(log.total_records, 0) > 0
  AND COALESCE(log.total_records, 0) <= 34
ORDER BY log.ngay_do_kiem, log.id
`;

async function main() {
    const rows = await all(CANDIDATE_SQL);
    const plan = buildCorrectionPlan(rows);
    const corrections = plan.filter((item) => item.action.startsWith('CORRECT_'));
    const preserved = plan.filter((item) => !item.action.startsWith('CORRECT_'));

    if (APPLY && corrections.length > 0) {
        await run('BEGIN TRANSACTION');
        try {
            for (const item of corrections) {
                await run(
                    `UPDATE import_log
                     SET total_records = ?,
                         error_records = 0,
                         skipped_records = 0
                     WHERE id = ?
                       AND ngay_do_kiem = ?
                       AND total_records = ?`,
                    [item.correctedTotal, item.id, item.ngay_do_kiem, item.before_total_records]
                );
            }
            await run('COMMIT');
        } catch (error) {
            try { await run('ROLLBACK'); } catch (_) {}
            throw error;
        }
    }

    console.log(JSON.stringify({
        mode: APPLY ? 'APPLY' : 'DRY_RUN',
        candidateCount: plan.length,
        correctionCount: corrections.length,
        preservedCount: preserved.length,
        corrections,
        preserved
    }, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        db.close(() => process.exit(1));
    })
    .finally(() => {
        db.close();
    });
