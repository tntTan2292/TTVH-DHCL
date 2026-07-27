'use strict';

const assert = require('assert');
const { presentImportHistoryRow } = require('./src/services/importHistoryPresenter');

function baseRow(overrides = {}) {
    return {
        id: 1,
        file_name: 'F1.3-2026.07.20.xlsx',
        ngay_do_kiem: '2026-07-20',
        status: 'SUCCESS',
        total_records: 34,
        error_records: 2,
        skipped_records: 3,
        hue_fact_count: 0,
        tct_national_row_count: 0,
        hue_processed_path: null,
        tct_processed_path: null,
        ...overrides
    };
}

function runTests() {
    const identicalFilename = 'F1.3-2026.07.20.xlsx';

    const hue = presentImportHistoryRow(baseRow({
        id: 10,
        file_name: identicalFilename,
        hue_fact_count: 2374,
        hue_processed_path: `D:\\Data DKCL\\F1.3\\Processed\\HUE\\${identicalFilename}`
    }));
    assert.equal(hue.source, 'HUE');
    assert.equal(hue.report_type, 'F1.3');
    assert.equal(hue.business_date, '2026-07-20');
    assert.equal(hue.standardized_filename, identicalFilename);
    assert.equal(hue.original_filename, null);

    const tct = presentImportHistoryRow(baseRow({
        id: 11,
        file_name: identicalFilename,
        tct_national_row_count: 34,
        tct_processed_path: `D:\\Data DKCL\\F1.3\\Processed\\TCT\\${identicalFilename}`
    }));
    assert.equal(tct.source, 'TCT');
    assert.equal(tct.standardized_filename, identicalFilename);
    assert.notEqual(hue.source, tct.source, 'identical filenames remain distinguishable by source evidence');

    const unknown = presentImportHistoryRow(baseRow({
        id: 12,
        file_name: 'TCT-looking-name.xlsx',
        status: 'FAILED'
    }));
    assert.equal(unknown.source, 'UNKNOWN');
    assert.equal(unknown.source_label, 'CHUA XAC DINH');
    assert.equal(unknown.standardized_filename, null);
    assert.match(unknown.evidence_reason, /MISSING_RELIABLE_SOURCE_EVIDENCE/);

    const counts = presentImportHistoryRow(baseRow({
        total_records: 34,
        error_records: 1,
        skipped_records: 2
    }));
    assert.equal(counts.total_rows, 34);
    assert.equal(counts.error_rows, 1);
    assert.equal(counts.skipped_rows, 2);
    assert.equal(counts.imported_rows, 31);
    assert.equal(counts.success_rows, 31);

    console.log('importHistoryPresenter tests passed');
}

runTests();
