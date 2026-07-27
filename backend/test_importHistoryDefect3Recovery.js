'use strict';

const assert = require('assert');
const { buildCorrectionPlan } = require('./src/services/importHistoryDefect3Recovery');

const plan = buildCorrectionPlan([
    {
        id: 1,
        file_name: 'same.xlsx',
        ngay_do_kiem: '2026-07-10',
        status: 'SUCCESS',
        total_records: 2,
        error_records: 0,
        skipped_records: 0,
        linked_fact_count: 2400,
        same_date_fact_count: 2400,
        same_date_import_count: 1
    },
    {
        id: 2,
        file_name: 'same.xlsx',
        ngay_do_kiem: '2026-07-11',
        status: 'SUCCESS',
        total_records: 1,
        error_records: 0,
        skipped_records: 0,
        linked_fact_count: 0,
        same_date_fact_count: 2300,
        same_date_import_count: 1
    },
    {
        id: 3,
        file_name: 'ambiguous.xlsx',
        ngay_do_kiem: '2026-07-12',
        status: 'SUCCESS',
        total_records: 1,
        error_records: 0,
        skipped_records: 0,
        linked_fact_count: 0,
        same_date_fact_count: 4600,
        same_date_import_count: 2
    },
    {
        id: 4,
        file_name: 'locked.xlsx',
        ngay_do_kiem: '2026-07-18',
        status: 'SUCCESS',
        total_records: 2,
        error_records: 0,
        skipped_records: 0,
        linked_fact_count: 2399,
        same_date_fact_count: 2399,
        same_date_import_count: 1
    },
    {
        id: 5,
        file_name: 'synthetic.xlsx',
        ngay_do_kiem: '2098-07-01',
        status: 'SUCCESS',
        total_records: 1,
        error_records: 0,
        skipped_records: 0,
        linked_fact_count: 100,
        same_date_fact_count: 100,
        same_date_import_count: 1
    }
]);

assert.equal(plan[0].action, 'CORRECT_FROM_IMPORT_LOG_ID');
assert.equal(plan[0].source, 'HUE');
assert.equal(plan[0].correctedTotal, 2400);

assert.equal(plan[1].action, 'CORRECT_FROM_UNIQUE_BUSINESS_DATE_FACTS');
assert.equal(plan[1].source, 'HUE');
assert.equal(plan[1].correctedTotal, 2300);

assert.equal(plan[2].action, 'PRESERVE_UNKNOWN');
assert.equal(plan[2].source, 'UNKNOWN');
assert.equal(plan[2].reason, 'MULTIPLE_IMPORT_LOGS_FOR_BUSINESS_DATE');

assert.equal(plan[3].action, 'PRESERVE');
assert.equal(plan[3].reason, 'LOCKED_BUSINESS_DATE');

assert.equal(plan[4].action, 'PRESERVE');
assert.equal(plan[4].reason, 'SYNTHETIC_2098_TEST_DATE');

console.log('importHistoryDefect3Recovery tests passed');
