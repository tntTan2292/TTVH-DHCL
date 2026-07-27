'use strict';

const LOCKED_BUSINESS_DATES = new Set(['2026-07-18', '2026-07-19', '2026-07-23']);

function isSyntheticBusinessDate(value) {
    return /^2098-\d{2}-\d{2}$/.test(String(value || ''));
}

function isLowHistoricalCount(row) {
    const total = Number(row?.total_records || 0);
    return total > 0 && total <= 34;
}

function shouldPreserveRow(row) {
    return LOCKED_BUSINESS_DATES.has(row?.ngay_do_kiem)
        || isSyntheticBusinessDate(row?.ngay_do_kiem)
        || !isLowHistoricalCount(row);
}

function resolveHueRecovery(row) {
    const linkedFactCount = Number(row?.linked_fact_count || 0);
    const sameDateImportCount = Number(row?.same_date_import_count || 0);
    const sameDateFactCount = Number(row?.same_date_fact_count || 0);

    if (shouldPreserveRow(row)) {
        return {
            action: 'PRESERVE',
            reason: LOCKED_BUSINESS_DATES.has(row?.ngay_do_kiem)
                ? 'LOCKED_BUSINESS_DATE'
                : isSyntheticBusinessDate(row?.ngay_do_kiem)
                    ? 'SYNTHETIC_2098_TEST_DATE'
                    : 'CURRENT_COUNT_NOT_LOW_HISTORY_DEFECT'
        };
    }

    if (linkedFactCount > 0 && linkedFactCount !== Number(row.total_records || 0)) {
        return {
            action: 'CORRECT_FROM_IMPORT_LOG_ID',
            source: 'HUE',
            correctedTotal: linkedFactCount,
            reason: 'FACT_F13_IMPORT_LOG_ID_DETERMINISTIC'
        };
    }

    if (linkedFactCount > 0) {
        return {
            action: 'PRESERVE',
            reason: 'LINKED_FACT_COUNT_ALREADY_MATCHES'
        };
    }

    if (sameDateImportCount === 1 && sameDateFactCount > 34) {
        return {
            action: 'CORRECT_FROM_UNIQUE_BUSINESS_DATE_FACTS',
            source: 'HUE',
            correctedTotal: sameDateFactCount,
            reason: 'UNIQUE_IMPORT_FOR_BUSINESS_DATE_WITH_HUE_FACTS'
        };
    }

    return {
        action: 'PRESERVE_UNKNOWN',
        source: 'UNKNOWN',
        reason: sameDateImportCount > 1
            ? 'MULTIPLE_IMPORT_LOGS_FOR_BUSINESS_DATE'
            : 'MISSING_DETERMINISTIC_HUE_FACT_EVIDENCE'
    };
}

function buildCorrectionPlan(rows = []) {
    return rows.map((row) => ({
        id: row.id,
        file_name: row.file_name,
        ngay_do_kiem: row.ngay_do_kiem,
        status: row.status,
        before_total_records: Number(row.total_records || 0),
        before_error_records: Number(row.error_records || 0),
        before_skipped_records: Number(row.skipped_records || 0),
        linked_fact_count: Number(row.linked_fact_count || 0),
        same_date_fact_count: Number(row.same_date_fact_count || 0),
        same_date_import_count: Number(row.same_date_import_count || 0),
        ...resolveHueRecovery(row)
    }));
}

module.exports = {
    LOCKED_BUSINESS_DATES,
    isSyntheticBusinessDate,
    resolveHueRecovery,
    buildCorrectionPlan
};
