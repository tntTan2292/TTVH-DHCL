/**
 * test_importPipelineRace.js
 *
 * Focused verification for atomic file claiming in importPipeline.
 * Run: node test_importPipelineRace.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const { run, get, all, db } = require('./src/config/db');
const { COLUMN_MAPPING } = require('./src/services/excelParser');
const {
    executeImport,
    BASE_INCOMING,
    BASE_PROCESSING,
    BASE_PROCESSED,
    BASE_ERROR
} = require('./src/services/importPipeline');

const SUCCESS_DATE = '2097-07-18';
const SUCCESS_FILENAME = 'F1.3-2097.07.18.xlsx';
const FAILURE_DATE = '2097-07-19';
const FAILURE_FILENAME = 'F1.3-2097.07.19.xlsx';

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
    if (condition) {
        console.log(`  PASS: ${label}`);
        passed++;
    } else {
        console.error(`  FAIL: ${label}${detail ? ' - ' + detail : ''}`);
        failed++;
    }
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function safeUnlink(filePath) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function pathIn(base, fileName) {
    return path.join(base, 'HUE', fileName);
}

function buildValidWorkbook() {
    const headers = Object.keys(COLUMN_MAPPING);
    const rowTemplate = Object.fromEntries(headers.map((header) => [header, null]));
    const rows = ['RACE001', 'RACE002'].map((maBg, idx) => ({
        ...rowTemplate,
        'Số hiệu bưu gửi': maBg,
        'Mã BC phát': `BC_RACE_${idx + 1}`,
        'Tên BC phát': `BCVH Race ${idx + 1}`,
        'Đánh giá 2026 (Đạt/Không đạt)': idx === 0 ? 'Đạt' : 'Không đạt'
    }));

    const sheetRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))];
    const ws = xlsx.utils.aoa_to_sheet(sheetRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Worksheet');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildInvalidWorkbook() {
    const ws = xlsx.utils.aoa_to_sheet([
        ['Wrong header'],
        ['not an F1.3 detail file']
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Worksheet');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function cleanup() {
    await run('DELETE FROM fact_f13 WHERE ngay_do_kiem IN (?, ?)', [SUCCESS_DATE, FAILURE_DATE]);
    await run('DELETE FROM import_log WHERE ngay_do_kiem IN (?, ?)', [SUCCESS_DATE, FAILURE_DATE]);

    for (const base of [BASE_INCOMING, BASE_PROCESSING, BASE_PROCESSED, BASE_ERROR]) {
        ensureDir(path.join(base, 'HUE'));
        safeUnlink(pathIn(base, SUCCESS_FILENAME));
        safeUnlink(pathIn(base, FAILURE_FILENAME));
    }
}

async function countLogs(date) {
    return all(
        `SELECT status, COUNT(*) AS count, SUM(total_records) AS total_records,
                SUM(error_records) AS error_records, SUM(skipped_records) AS skipped_records
         FROM import_log
         WHERE ngay_do_kiem = ?
         GROUP BY status`,
        [date]
    );
}

async function runTests() {
    await cleanup();

    console.log('\nTEST 1: concurrent workers claim one file once');
    try {
        const incomingPath = pathIn(BASE_INCOMING, SUCCESS_FILENAME);
        fs.writeFileSync(incomingPath, buildValidWorkbook());

        const results = await Promise.allSettled([
            executeImport({ filePath: incomingPath, forceReimport: false, source: 'TEST-A' }),
            executeImport({ filePath: incomingPath, forceReimport: false, source: 'TEST-B' })
        ]);

        const fulfilled = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
        const successResults = fulfilled.filter((result) => result.success === true);
        const skippedResults = fulfilled.filter((result) => result.alreadyClaimed === true);
        const logRows = await countLogs(SUCCESS_DATE);
        const successLog = logRows.find((row) => row.status === 'SUCCESS');
        const failedLog = logRows.find((row) => row.status === 'FAILED');
        const factCount = await get('SELECT COUNT(*) AS count FROM fact_f13 WHERE ngay_do_kiem = ?', [SUCCESS_DATE]);

        assert('both workers exit without rejection', results.every((result) => result.status === 'fulfilled'));
        assert('only one worker imports', successResults.length === 1, `Got: ${successResults.length}`);
        assert('losing worker exits as already claimed', skippedResults.length === 1, `Got: ${skippedResults.length}`);
        assert('one SUCCESS log is created', successLog?.count === 1, `Got: ${JSON.stringify(logRows)}`);
        assert('no FAILED log is created for losing worker', !failedLog, `Got: ${JSON.stringify(logRows)}`);
        assert('two facts imported', factCount.count === 2, `Got: ${factCount.count}`);
        assert('file moved to Processed', fs.existsSync(pathIn(BASE_PROCESSED, SUCCESS_FILENAME)));
        assert('file not left in Incoming', !fs.existsSync(incomingPath));
        assert('file not left in Processing', !fs.existsSync(pathIn(BASE_PROCESSING, SUCCESS_FILENAME)));
    } catch (error) {
        console.error('  TEST 1 UNEXPECTED ERROR:', error.message);
        failed++;
    }

    console.log('\nTEST 2: genuine parse failure logs once and moves to Error');
    try {
        const incomingPath = pathIn(BASE_INCOMING, FAILURE_FILENAME);
        fs.writeFileSync(incomingPath, buildInvalidWorkbook());

        let threw = false;
        try {
            await executeImport({ filePath: incomingPath, forceReimport: false, source: 'TEST-FAIL' });
        } catch (_) {
            threw = true;
        }

        const logRows = await countLogs(FAILURE_DATE);
        const failedLog = logRows.find((row) => row.status === 'FAILED');
        const successLog = logRows.find((row) => row.status === 'SUCCESS');
        const factCount = await get('SELECT COUNT(*) AS count FROM fact_f13 WHERE ngay_do_kiem = ?', [FAILURE_DATE]);

        assert('parse failure throws to caller', threw);
        assert('one FAILED log is created', failedLog?.count === 1, `Got: ${JSON.stringify(logRows)}`);
        assert('no SUCCESS log is created', !successLog, `Got: ${JSON.stringify(logRows)}`);
        assert('no facts imported for failed file', factCount.count === 0, `Got: ${factCount.count}`);
        assert('file moved to Error', fs.existsSync(pathIn(BASE_ERROR, FAILURE_FILENAME)));
        assert('file not left in Incoming', !fs.existsSync(incomingPath));
        assert('file not left in Processing', !fs.existsSync(pathIn(BASE_PROCESSING, FAILURE_FILENAME)));
    } catch (error) {
        console.error('  TEST 2 UNEXPECTED ERROR:', error.message);
        failed++;
    }

    await cleanup();

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    db.close();
    if (failed > 0) process.exit(1);
}

runTests().catch((error) => {
    console.error('FATAL TEST ERROR:', error);
    db.close();
    process.exit(1);
});
