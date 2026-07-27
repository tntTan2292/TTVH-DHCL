'use strict';

const path = require('path');

const REPORT_TYPE_F13 = 'F1.3';
const UNKNOWN_SOURCE = 'UNKNOWN';
const UNKNOWN_SOURCE_LABEL = 'CHUA XAC DINH';

function positiveCount(value) {
    return Number(value || 0) > 0;
}

function basenameOrNull(value) {
    return value ? path.basename(String(value)) : null;
}

function buildEvidenceMessage({ source, reason, missingEvidence }) {
    if (source === 'HUE') {
        return reason === 'FACT_F13_BUSINESS_DATE_COUNT_MATCH'
            ? 'HUE identified from deterministic fact_f13 business-date count evidence.'
            : 'HUE identified from linked fact_f13 import evidence.';
    }
    if (source === 'TCT') {
        return reason === 'PROCESSED_TCT_PATH'
            ? 'TCT identified from processed TCT artifact evidence.'
            : 'TCT identified from accepted national F1.3 import evidence.';
    }
    return `Source unresolved: ${missingEvidence || 'missing reliable HUE/TCT evidence.'}`;
}

function resolveImportHistorySource(row = {}) {
    const hasHueFactEvidence = positiveCount(row.hue_fact_count);
    const hasTctNationalEvidence = row.status === 'SUCCESS' && positiveCount(row.tct_national_row_count);
    const hasHueProcessedPath = Boolean(row.hue_processed_path);
    const hasTctProcessedPath = Boolean(row.tct_processed_path);
    const totalRows = Number(row.total_records || 0);
    const sameDateFactCount = Number(row.same_date_fact_count || 0);
    const matchingHueImportCount = Number(row.matching_hue_import_count || 0);

    if (hasHueFactEvidence) {
        return {
            source: 'HUE',
            source_label: 'HUE',
            evidence_reason: 'FACT_F13_IMPORT_LOG_LINK',
            evidence_path: row.hue_processed_path || null,
            missing_evidence: null
        };
    }

    if (totalRows > 34 && sameDateFactCount === totalRows && matchingHueImportCount === 1) {
        return {
            source: 'HUE',
            source_label: 'HUE',
            evidence_reason: 'FACT_F13_BUSINESS_DATE_COUNT_MATCH',
            evidence_path: row.hue_processed_path || null,
            missing_evidence: null
        };
    }

    if (hasTctProcessedPath) {
        return {
            source: 'TCT',
            source_label: 'TCT',
            evidence_reason: 'PROCESSED_TCT_PATH',
            evidence_path: row.tct_processed_path,
            missing_evidence: null
        };
    }

    if (hasTctNationalEvidence && !hasHueProcessedPath) {
        return {
            source: 'TCT',
            source_label: 'TCT',
            evidence_reason: 'FACT_F13_NATIONAL_BUSINESS_DATE',
            evidence_path: null,
            missing_evidence: null
        };
    }

    return {
        source: UNKNOWN_SOURCE,
        source_label: UNKNOWN_SOURCE_LABEL,
        evidence_reason: 'MISSING_RELIABLE_SOURCE_EVIDENCE',
        evidence_path: null,
        missing_evidence: 'No linked HUE fact rows, TCT processed path, or accepted TCT national success evidence.'
    };
}

function presentImportHistoryRow(row = {}) {
    const sourceResolution = resolveImportHistorySource(row);
    const processedFilename = sourceResolution.source === 'HUE'
        ? basenameOrNull(row.hue_processed_path)
        : sourceResolution.source === 'TCT'
            ? basenameOrNull(row.tct_processed_path)
            : null;
    const originalFilename = row.source_original_filename || null;
    const standardizedFilename = row.source_standardized_filename || processedFilename || null;
    const importedRows = Number(row.total_records || 0) - Number(row.error_records || 0) - Number(row.skipped_records || 0);

    return {
        id: row.id,
        source: sourceResolution.source,
        source_label: sourceResolution.source_label,
        report_type: REPORT_TYPE_F13,
        business_date: row.ngay_do_kiem || null,
        original_filename: originalFilename,
        standardized_filename: standardizedFilename,
        import_status: row.status,
        total_rows: Number(row.total_records || 0),
        imported_rows: Math.max(0, importedRows),
        success_rows: Math.max(0, importedRows),
        error_rows: Number(row.error_records || 0),
        skipped_rows: Number(row.skipped_records || 0),
        evidence_message: buildEvidenceMessage({
            source: sourceResolution.source,
            reason: sourceResolution.evidence_reason,
            missingEvidence: sourceResolution.missing_evidence
        }),
        evidence_reason: sourceResolution.evidence_reason,
        evidence_path: sourceResolution.evidence_path,
        missing_source_evidence: sourceResolution.missing_evidence
    };
}

module.exports = {
    REPORT_TYPE_F13,
    UNKNOWN_SOURCE,
    UNKNOWN_SOURCE_LABEL,
    resolveImportHistorySource,
    presentImportHistoryRow
};
