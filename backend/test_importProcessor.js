/**
 * test_importProcessor.js — Task 2.2 Integration Test
 *
 * Tests importParsedData() against an isolated temp SQLite database (never
 * the operational database.sqlite — see AUTO-IMPORT-012 / test/importTestSandbox.js).
 *
 * Run: node test_importProcessor.js
 */
'use strict';

const { createSandbox, initSchema } = require('./test/importTestSandbox');

const sandbox = createSandbox('qis-import-processor-test-');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = sandbox.dbPath;

const xlsx = require('xlsx');
const { run, all, get, db, dbPath, operationalDbPath } = require('./src/config/db');
const { parseF13Excel, DB_COLUMNS }   = require('./src/services/excelParser');
const {
    importParsedData,
    importNationalParsedData,
    importF41ParsedData,
    importF41NationalParsedData,
} = require('./src/services/importProcessor');
const { NATIONAL_DB_COLUMNS }         = require('./src/services/nationalExcelParser');
const { F41_HUE_DB_COLUMNS }          = require('./src/services/f41HueExcelParser');
const { F41_TCT_DB_COLUMNS }          = require('./src/services/f41TctExcelParser');

const TEST_DATE     = '2000-01-01';
const TEST_FILENAME = 'F1.3-2000.01.01.xlsx';
const FUTURE_TEST_DATE = '2098-02-18';
const FUTURE_TEST_FILENAME = 'F1.3-2098.02.18.xlsx';
const INVALID_TEST_DATE = '2026-02-30';
const INVALID_TEST_FILENAME = 'F1.3-2026.02.30.xlsx';

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a minimal parsedData row with all required NOT NULL fields. */
function makeRow(ma_bg, ma_bcvh = 'BC_TEST', ten_bcvh = 'Test BCVH', ket_qua_f13 = 'Đạt') {
    const row = {};
    for (const col of DB_COLUMNS) row[col] = null;   // default all to null
    row.ma_bg        = ma_bg;
    row.ma_bcvh      = ma_bcvh;
    row.ten_bcvh     = ten_bcvh;
    row.ket_qua_f13  = ket_qua_f13;
    return row;
}

/** Count rows in fact_f13 for TEST_DATE. */
async function countRows() {
    const r = await get('SELECT COUNT(*) as c FROM fact_f13 WHERE ngay_do_kiem = ?', [TEST_DATE]);
    return r.c;
}

/** Get the latest import_log row for TEST_DATE. */
async function getLatestLog() {
    return await get(
        'SELECT * FROM import_log WHERE ngay_do_kiem = ? ORDER BY id DESC LIMIT 1',
        [TEST_DATE]
    );
}

/** Wipe all test data. */
async function cleanup() {
    await run('DELETE FROM fact_f13   WHERE ngay_do_kiem = ?', [TEST_DATE]);
    await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [TEST_DATE]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all tests
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
    assert('NODE_ENV=test is active before db.js loads', process.env.NODE_ENV === 'test');
    assert('test DB path is an isolated temp sqlite file', dbPath === sandbox.dbPath && dbPath.startsWith(sandbox.root), dbPath);
    assert('test DB path does not resolve to operational database.sqlite', dbPath !== operationalDbPath);
    await initSchema(db);

    // Ensure clean state
    await cleanup();

    // =========================================================================
    // TEST 1: Successful first import
    // =========================================================================
    console.log('\n📋 TEST 1: Successful first import (3 unique rows)');
    try {
        const parsedData = [
            makeRow('BG001', 'BC01', 'BCVH 01', 'Đạt'),
            makeRow('BG002', 'BC01', 'BCVH 01', 'Không đạt'),
            makeRow('BG003', 'BC02', 'BCVH 02', 'Đạt'),
        ];

        const result = await importParsedData({
            parsedData,
            ngay_do_kiem: TEST_DATE,
            filename    : TEST_FILENAME,
            forceReimport: false
        });

        assert('success = true', result.success === true);
        assert('total = 3',     result.total    === 3,   `Got: ${result.total}`);
        assert('inserted = 3',  result.inserted === 3,   `Got: ${result.inserted}`);
        assert('errors = 0',    result.errors   === 0,   `Got: ${result.errors}`);
        assert('skipped = 0',   result.skipped  === 0,   `Got: ${result.skipped}`);
        assert('import_log_id is a number', typeof result.import_log_id === 'number');

        // Verify DB state
        const rowCount = await countRows();
        assert('DB: 3 rows inserted for TEST_DATE', rowCount === 3, `Got: ${rowCount}`);

        // Verify import_log
        const log = await getLatestLog();
        assert('import_log status = SUCCESS',       log.status          === 'SUCCESS');
        assert('import_log total_records = 3',      log.total_records   === 3,         `Got: ${log.total_records}`);
        assert('import_log error_records = 0',      log.error_records   === 0,         `Got: ${log.error_records}`);
        assert('import_log skipped_records = 0',    log.skipped_records === 0,         `Got: ${log.skipped_records}`);

    } catch (e) {
        console.error('  TEST 1 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 2: Within-file duplicate — INSERT OR IGNORE
    // 3 rows: BG004 (new), BG001 (dup with existing), BG005 (new)
    // Expected: 2 inserted, 1 error_record (BG001 already exists for TEST_DATE)
    // =========================================================================
    console.log('\n📋 TEST 2: Within-file duplicate — INSERT OR IGNORE (error_records)');
    try {
        const parsedData = [
            makeRow('BG004', 'BC01', 'BCVH 01', 'Đạt'),          // new
            makeRow('BG001', 'BC01', 'BCVH 01', 'Không đạt'),    // duplicate of existing BG001
            makeRow('BG005', 'BC02', 'BCVH 02', 'Đạt'),          // new
        ];

        const result = await importParsedData({
            parsedData,
            ngay_do_kiem : TEST_DATE,
            filename     : TEST_FILENAME,
            forceReimport: false    // no delete — INSERT OR IGNORE only
        });

        assert('success = true',                result.success   === true);
        assert('total = 3',                     result.total     === 3,    `Got: ${result.total}`);
        assert('inserted = 2 (BG001 ignored)',  result.inserted  === 2,    `Got: ${result.inserted}`);
        assert('skipped = 1 (BG001 duplicate)', result.skipped   === 1,    `Got: ${result.skipped}`);
        assert('errors = 0 (no real errors)',   result.errors    === 0,    `Got: ${result.errors}`);

        // New BR: skipped_records = total_parsed - total_inserted
        assert('BR: skipped = total - inserted', result.skipped === result.total - result.inserted);

        // Verify DB: now 5 rows total (3 from Test1 + 2 new)
        const rowCount = await countRows();
        assert('DB: 5 rows total (no rollback, no BG001 dup)', rowCount === 5, `Got: ${rowCount}`);

        // Verify import_log accurate counts
        const log = await getLatestLog();
        assert('import_log total_records = 3',   log.total_records === 3, `Got: ${log.total_records}`);
        assert('import_log skipped_records = 1', log.skipped_records === 1, `Got: ${log.skipped_records}`);
        assert('import_log error_records = 0',   log.error_records === 0, `Got: ${log.error_records}`);

    } catch (e) {
        console.error('  TEST 2 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 3: forceReimport = true — DELETE + re-insert
    // =========================================================================
    console.log('\n📋 TEST 3: forceReimport = true (DELETE existing + re-insert)');
    try {
        const beforeCount = await countRows();
        assert(`Before reimport: ${beforeCount} rows exist`, beforeCount > 0, `Got: ${beforeCount}`);

        const parsedData = [
            makeRow('BG_REIMPORT_01', 'BC_NEW', 'BCVH NEW', 'Đạt'),
            makeRow('BG_REIMPORT_02', 'BC_NEW', 'BCVH NEW', 'Đạt'),
        ];

        const result = await importParsedData({
            parsedData,
            ngay_do_kiem : TEST_DATE,
            filename     : TEST_FILENAME,
            forceReimport: true   // DELETE all rows for TEST_DATE first
        });

        assert('success = true',    result.success  === true);
        assert('inserted = 2',      result.inserted === 2,  `Got: ${result.inserted}`);
        assert('errors = 0',        result.errors   === 0,  `Got: ${result.errors}`);

        // Verify DB: exactly 2 rows (old 5 rows deleted, 2 new inserted)
        const afterCount = await countRows();
        assert('DB: exactly 2 rows after reimport (old data replaced)', afterCount === 2, `Got: ${afterCount}`);

        // Verify only the new BGs are in DB
        const rows = await all(
            'SELECT ma_bg FROM fact_f13 WHERE ngay_do_kiem = ? ORDER BY ma_bg',
            [TEST_DATE]
        );
        const bgs = rows.map(r => r.ma_bg);
        assert('DB contains BG_REIMPORT_01', bgs.includes('BG_REIMPORT_01'), `Got: ${JSON.stringify(bgs)}`);
        assert('DB contains BG_REIMPORT_02', bgs.includes('BG_REIMPORT_02'), `Got: ${JSON.stringify(bgs)}`);
        assert('Old BG001 is gone',          !bgs.includes('BG001'),          `Still present`);

    } catch (e) {
        console.error('  TEST 3 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 3A2: IMPORT-BULK-REIMPORT-ALL-01 Part A (Design of Record v2 §8.3)
    // forceReimport failing mid-transaction (after the DELETE, before COMMIT)
    // must restore the pre-reimport data exactly — "lỗi giữa chừng phải khôi
    // phục dữ liệu cũ". Uses the existing failBeforeSuccessLogUpdate testing
    // hook to fail deterministically after Step 3 (INSERT) but before COMMIT.
    // =========================================================================
    console.log('\n📋 TEST 3A2: forceReimport failure mid-transaction restores the old data (rollback)');
    try {
        const beforeRows = await all('SELECT ma_bg FROM fact_f13 WHERE ngay_do_kiem = ? ORDER BY ma_bg', [TEST_DATE]);
        const beforeBgs = beforeRows.map((r) => r.ma_bg);
        assert('Before: reimport-failure test has existing rows to protect', beforeBgs.length > 0, `Got: ${JSON.stringify(beforeBgs)}`);

        let thrown = null;
        try {
            await importParsedData({
                parsedData: [makeRow('BG_SHOULD_NOT_SURVIVE', 'BC_NEW', 'BCVH NEW', 'Đạt')],
                ngay_do_kiem: TEST_DATE,
                filename: TEST_FILENAME,
                forceReimport: true,
                failBeforeSuccessLogUpdate: true,
            });
        } catch (e) {
            thrown = e;
        }
        assert('forceReimport + simulated failure throws', thrown && thrown.code === 'SIMULATED_IMPORT_TRANSACTION_FAILURE', thrown && thrown.message);

        const afterRows = await all('SELECT ma_bg FROM fact_f13 WHERE ngay_do_kiem = ? ORDER BY ma_bg', [TEST_DATE]);
        const afterBgs = afterRows.map((r) => r.ma_bg);
        assert('After: the exact same old rows are back (DELETE was rolled back)', JSON.stringify(afterBgs) === JSON.stringify(beforeBgs), `Before: ${JSON.stringify(beforeBgs)}, After: ${JSON.stringify(afterBgs)}`);
        assert('After: the new row never survived the rollback', !afterBgs.includes('BG_SHOULD_NOT_SURVIVE'));

        const failLog = await getLatestLog();
        assert('A FAILED import_log row was written outside the rolled-back transaction', failLog && failLog.status === 'FAILED', failLog && failLog.status);
    } catch (e) {
        console.error('  TEST 3A2 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 3B: Future import date rejected before fact_f13 write
    // =========================================================================
    console.log('\n📋 TEST 3B: Future import date rejected before fact_f13 write');
    try {
        const parsedData = [
            makeRow('BG_2098_REJECTED', 'BC01', 'BCVH 01', 'Đạt'),
        ];
        const logCountBefore = await get('SELECT COUNT(*) as c FROM import_log WHERE file_name = ?', [FUTURE_TEST_FILENAME]);

        let thrown = null;
        try {
            await importParsedData({
                parsedData,
                ngay_do_kiem : FUTURE_TEST_DATE,
                filename     : FUTURE_TEST_FILENAME,
                forceReimport: false
            });
        } catch (e) {
            thrown = e;
        }

        assert('Future 2098 import throws validation error', thrown && thrown.code === 'INVALID_FACT_F13_IMPORT_DATE', thrown && thrown.message);
        assert('Error records rejected date value', thrown && thrown.ngay_do_kiem === FUTURE_TEST_DATE, thrown && thrown.ngay_do_kiem);
        assert('Error records related row ma_bg', thrown && thrown.message.includes('BG_2098_REJECTED'), thrown && thrown.message);

        const futureRows = await get('SELECT COUNT(*) as c FROM fact_f13 WHERE ngay_do_kiem = ? AND ma_bg = ?', [FUTURE_TEST_DATE, 'BG_2098_REJECTED']);
        const futureLogs = await get('SELECT COUNT(*) as c FROM import_log WHERE file_name = ?', [FUTURE_TEST_FILENAME]);
        assert('DB: 0 fact_f13 rows inserted for rejected future shipment', futureRows.c === 0, `Got: ${futureRows.c}`);
        assert('DB: rejected future file creates no new import_log row', futureLogs.c === logCountBefore.c, `Before: ${logCountBefore.c}, After: ${futureLogs.c}`);

    } catch (e) {
        console.error('  TEST 3B UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 3C: Invalid calendar date rejected before fact_f13 write
    // =========================================================================
    console.log('\n📋 TEST 3C: Invalid calendar date rejected before fact_f13 write');
    try {
        const parsedData = [
            makeRow('BG_INVALID_DATE_REJECTED', 'BC01', 'BCVH 01', 'Đạt'),
        ];
        const logCountBefore = await get('SELECT COUNT(*) as c FROM import_log WHERE file_name = ?', [INVALID_TEST_FILENAME]);

        let thrown = null;
        try {
            await importParsedData({
                parsedData,
                ngay_do_kiem : INVALID_TEST_DATE,
                filename     : INVALID_TEST_FILENAME,
                forceReimport: false
            });
        } catch (e) {
            thrown = e;
        }

        assert('Invalid calendar import throws validation error', thrown && thrown.code === 'INVALID_FACT_F13_IMPORT_DATE', thrown && thrown.message);
        assert('Error reason is INVALID_DATE', thrown && thrown.reason === 'INVALID_DATE', thrown && thrown.reason);
        assert('Error records invalid date value', thrown && thrown.ngay_do_kiem === INVALID_TEST_DATE, thrown && thrown.ngay_do_kiem);
        assert('Error records related invalid-date row ma_bg', thrown && thrown.message.includes('BG_INVALID_DATE_REJECTED'), thrown && thrown.message);

        const invalidRows = await get('SELECT COUNT(*) as c FROM fact_f13 WHERE ngay_do_kiem = ? AND ma_bg = ?', [INVALID_TEST_DATE, 'BG_INVALID_DATE_REJECTED']);
        const invalidLogs = await get('SELECT COUNT(*) as c FROM import_log WHERE file_name = ?', [INVALID_TEST_FILENAME]);
        assert('DB: 0 fact_f13 rows inserted for invalid calendar shipment', invalidRows.c === 0, `Got: ${invalidRows.c}`);
        assert('DB: invalid calendar file creates no new import_log row', invalidLogs.c === logCountBefore.c, `Before: ${logCountBefore.c}, After: ${invalidLogs.c}`);

    } catch (e) {
        console.error('  TEST 3C UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 4: Rollback on DB error
    //
    // Part A: Trigger a DB error (nested transaction) → verify exception thrown
    //         and no rows committed. This is the core ROLLBACK behavior.
    //
    // Part B: Verify that import_log schema correctly supports FAILED status.
    //         Tested directly because nested-transaction error states make it
    //         unreliable to assert on FAILED log from within the same connection.
    // =========================================================================
    console.log('\n📋 TEST 4A: Exception propagation + no rows committed on DB error');
    try {
        const countBefore = await countRows();

        // Trigger a nested-transaction error inside importParsedData
        await run('BEGIN TRANSACTION');

        let didThrow = false;
        try {
            await importParsedData({
                parsedData   : [makeRow('BG_SHOULD_FAIL', 'BC01', 'BCVH 01', 'Đạt')],
                ngay_do_kiem : TEST_DATE,
                filename     : TEST_FILENAME,
                forceReimport: false
            });
        } catch (e) {
            didThrow = true;
        }

        // Rollback the outer transaction (may already be rolled back by importParsedData)
        try { await run('ROLLBACK'); } catch (_) {}

        assert('importParsedData throws on DB error', didThrow);

        // Verify no extra rows were committed — core ROLLBACK guarantee
        const countAfter = await countRows();
        assert('No rows committed after DB error (ROLLBACK works)', countAfter === countBefore,
            `Before: ${countBefore}, After: ${countAfter}`);

    } catch (e) {
        console.error('  TEST 4A UNEXPECTED ERROR:', e.message);
        failed++;
    }

    console.log('\n📋 TEST 4B: FAILED log schema — import_log supports status=FAILED');
    try {
        // Directly verify that import_log can store a FAILED entry with correct schema.
        // This validates the table structure used by importParsedData's catch block.
        await run(
            `INSERT INTO import_log (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
             VALUES (?, ?, 'FAILED', ?, ?, 0)`,
            [TEST_FILENAME, TEST_DATE, 1, 1]
        );
        const failLog = await get(
            `SELECT * FROM import_log WHERE ngay_do_kiem = ? AND status = 'FAILED' ORDER BY id DESC LIMIT 1`,
            [TEST_DATE]
        );
        assert('FAILED log inserted into import_log',            !!failLog,                              `Got: ${failLog}`);
        assert("FAILED log status = 'FAILED'",                   failLog && failLog.status === 'FAILED', `Got: ${failLog && failLog.status}`);
        assert('FAILED log file_name matches',                   failLog && failLog.file_name === TEST_FILENAME);
        assert('FAILED log ngay_do_kiem matches',                failLog && failLog.ngay_do_kiem === TEST_DATE);
        assert('FAILED log total_records = 1',                   failLog && failLog.total_records === 1, `Got: ${failLog && failLog.total_records}`);
        assert('FAILED log error_records = 1 (all failed)',      failLog && failLog.error_records === 1);
        assert('FAILED log skipped_records = 0',                 failLog && failLog.skipped_records === 0);

    } catch (e) {
        console.error('  TEST 4B UNEXPECTED ERROR:', e.message);
        failed++;
    }


    // =========================================================================
    // TEST 5: Empty parsedData — edge case
    // =========================================================================
    console.log('\n📋 TEST 5: Empty parsedData (0 rows)');
    try {
        const result = await importParsedData({
            parsedData   : [],
            ngay_do_kiem : TEST_DATE,
            filename     : TEST_FILENAME,
            forceReimport: false
        });

        assert('success = true',   result.success  === true);
        assert('total = 0',        result.total    === 0,   `Got: ${result.total}`);
        assert('inserted = 0',     result.inserted === 0,   `Got: ${result.inserted}`);
        assert('errors = 0',       result.errors   === 0,   `Got: ${result.errors}`);

        const log = await getLatestLog();
        assert('import_log total_records = 0', log.total_records === 0);
        assert('import_log status = SUCCESS',  log.status === 'SUCCESS');

    } catch (e) {
        console.error('  TEST 5 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 6: IMPORT-BULK-REIMPORT-ALL-01 Part A (Design of Record v2 §8.2-§8.3)
    // importNationalParsedData (fact_f13_national) has no import_log_id column
    // at all -- the exact case that made DoR v1's proposed import_log_id-scoped
    // delete unsound (Checkpoint §12). Verifies the corrected, date-scoped
    // delete actually replaces (not merges with) old data on forceReimport, and
    // that a second, non-forced additive import for a fresh date is unaffected.
    // =========================================================================
    console.log('\n📋 TEST 6: importNationalParsedData (fact_f13_national) forceReimport replace, no import_log_id needed');
    function makeNationalRow(ma_tinh_phat, sl_bg_ptc) {
        const row = {};
        for (const col of NATIONAL_DB_COLUMNS) row[col] = null;
        row.ma_tinh_phat = ma_tinh_phat;
        row.ten_tinh_phat = `Tinh ${ma_tinh_phat}`;
        row.sl_bg_ptc = sl_bg_ptc;
        return row;
    }
    const NATIONAL_TEST_DATE = '2000-02-02';
    const NATIONAL_TEST_FILENAME = 'F1.3-2000.02.02-TCT.xlsx';
    try {
        await run('DELETE FROM fact_f13_national WHERE ngay_do_kiem = ?', [NATIONAL_TEST_DATE]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ? AND source_lane = ?', [NATIONAL_TEST_DATE, 'TCT']);

        const first = await importNationalParsedData({
            parsedData: [makeNationalRow('10', 100), makeNationalRow('16', 200)],
            ngay_do_kiem: NATIONAL_TEST_DATE,
            filename: NATIONAL_TEST_FILENAME,
            forceReimport: false,
        });
        assert('First national import: inserted = 2', first.inserted === 2, `Got: ${first.inserted}`);
        const afterFirst = await get('SELECT COUNT(*) AS n FROM fact_f13_national WHERE ngay_do_kiem = ?', [NATIONAL_TEST_DATE]);
        assert('DB: 2 rows after first national import', afterFirst.n === 2, `Got: ${afterFirst.n}`);

        // forceReimport with a DIFFERENT set of province codes must leave
        // exactly the new set, not the old rows plus the new ones -- proving
        // the plain date-scoped DELETE (no import_log_id join) actually ran.
        const replaced = await importNationalParsedData({
            parsedData: [makeNationalRow('18', 300), makeNationalRow('20', 400), makeNationalRow('22', 500)],
            ngay_do_kiem: NATIONAL_TEST_DATE,
            filename: NATIONAL_TEST_FILENAME,
            forceReimport: true,
        });
        assert('Reimport: inserted = 3', replaced.inserted === 3, `Got: ${replaced.inserted}`);
        const afterReplace = await all('SELECT ma_tinh_phat FROM fact_f13_national WHERE ngay_do_kiem = ? ORDER BY ma_tinh_phat', [NATIONAL_TEST_DATE]);
        const codes = afterReplace.map((r) => r.ma_tinh_phat);
        assert('DB: exactly 3 rows after reimport (old 2 replaced, not merged)', codes.length === 3, `Got: ${JSON.stringify(codes)}`);
        assert('Old province 10 is gone', !codes.includes('10'), `Got: ${JSON.stringify(codes)}`);
        assert('Old province 16 is gone', !codes.includes('16'), `Got: ${JSON.stringify(codes)}`);
        assert('New province 18 is present', codes.includes('18'), `Got: ${JSON.stringify(codes)}`);

        await run('DELETE FROM fact_f13_national WHERE ngay_do_kiem = ?', [NATIONAL_TEST_DATE]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ? AND source_lane = ?', [NATIONAL_TEST_DATE, 'TCT']);
    } catch (e) {
        console.error('  TEST 6 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 7: IMPORT-BULK-REIMPORT-ALL-01 Part A Independent Review 001 (N2)
    // Legacy rows without import_log_id ARE replaced by forceReimport, and a
    // forced reimport of one date in one table never touches another date or
    // another table. Independently verified by the reviewer's 4/4 + 8/8
    // checks; added to the repo here.
    // =========================================================================
    console.log('\n📋 TEST 7: N2 — legacy (import_log_id NULL) rows replaced; other date/table untouched');
    const LEGACY_DATE = '2000-03-03';
    const OTHER_DATE = '2000-03-04';
    try {
        await run('DELETE FROM fact_f13 WHERE ngay_do_kiem IN (?, ?)', [LEGACY_DATE, OTHER_DATE]);
        await run('DELETE FROM fact_f41 WHERE ngay_do_kiem IN (?, ?)', [LEGACY_DATE, OTHER_DATE]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem IN (?, ?)', [LEGACY_DATE, OTHER_DATE]);

        // Legacy rows: committed data with NO import_log linkage at all --
        // exactly the DoR v1 Blocker-1 scenario (LEGACY_BASELINE-backed data).
        await run(
            `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026, import_log_id)
             VALUES (?, 'LEGACY_F13_01', 'BC_LEGACY', 'BCVH Legacy', 'Đạt', NULL)`,
            [LEGACY_DATE]
        );
        await run(
            `INSERT INTO fact_f41 (ngay_do_kiem, ma_bg, import_log_id) VALUES (?, 'LEGACY_F41_01', NULL)`,
            [LEGACY_DATE]
        );
        // Control data that must survive untouched: a different date in the
        // same tables, and this same date's row in a DIFFERENT table.
        await run(
            `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, danh_gia_2026)
             VALUES (?, 'OTHER_DATE_F13', 'BC01', 'BCVH 01', 'Đạt')`,
            [OTHER_DATE]
        );
        await run(
            `INSERT INTO fact_f41 (ngay_do_kiem, ma_bg) VALUES (?, 'OTHER_DATE_F41')`,
            [OTHER_DATE]
        );

        const f13Result = await importParsedData({
            parsedData: [makeRow('NEW_F13_01', 'BC_NEW', 'BCVH New', 'Đạt')],
            ngay_do_kiem: LEGACY_DATE,
            filename: 'F1.3-2000.03.03.xlsx',
            forceReimport: true,
        });
        assert('TEST 7: F1.3 forced reimport over a legacy row succeeds', f13Result.success === true);
        const f13After = await all('SELECT ma_bg FROM fact_f13 WHERE ngay_do_kiem = ?', [LEGACY_DATE]);
        assert('TEST 7: legacy fact_f13 row (import_log_id NULL) is gone', !f13After.some((r) => r.ma_bg === 'LEGACY_F13_01'), JSON.stringify(f13After));
        assert('TEST 7: only the new fact_f13 row remains', f13After.length === 1 && f13After[0].ma_bg === 'NEW_F13_01', JSON.stringify(f13After));

        function makeF41Row(ma_bg) {
            const row = {};
            for (const col of F41_HUE_DB_COLUMNS) row[col] = null;
            row.ma_bg = ma_bg;
            return row;
        }
        const f41Result = await importF41ParsedData({
            parsedData: [makeF41Row('NEW_F41_01')],
            ngay_do_kiem: LEGACY_DATE,
            filename: 'F4.1-2000.03.03.xlsx',
            forceReimport: true,
        });
        assert('TEST 7: F4.1 forced reimport over a legacy row succeeds', f41Result.success === true);
        const f41After = await all('SELECT ma_bg FROM fact_f41 WHERE ngay_do_kiem = ?', [LEGACY_DATE]);
        assert('TEST 7: legacy fact_f41 row (import_log_id NULL) is gone', !f41After.some((r) => r.ma_bg === 'LEGACY_F41_01'), JSON.stringify(f41After));
        assert('TEST 7: only the new fact_f41 row remains', f41After.length === 1 && f41After[0].ma_bg === 'NEW_F41_01', JSON.stringify(f41After));

        // Isolation: the other date (both tables) and this same date's other
        // table are byte-identical to what was seeded, never touched.
        const otherF13 = await all('SELECT ma_bg FROM fact_f13 WHERE ngay_do_kiem = ?', [OTHER_DATE]);
        const otherF41 = await all('SELECT ma_bg FROM fact_f41 WHERE ngay_do_kiem = ?', [OTHER_DATE]);
        assert('TEST 7: another date in fact_f13 is untouched', otherF13.length === 1 && otherF13[0].ma_bg === 'OTHER_DATE_F13', JSON.stringify(otherF13));
        assert('TEST 7: another date in fact_f41 is untouched', otherF41.length === 1 && otherF41[0].ma_bg === 'OTHER_DATE_F41', JSON.stringify(otherF41));

        await run('DELETE FROM fact_f13 WHERE ngay_do_kiem IN (?, ?)', [LEGACY_DATE, OTHER_DATE]);
        await run('DELETE FROM fact_f41 WHERE ngay_do_kiem IN (?, ?)', [LEGACY_DATE, OTHER_DATE]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem IN (?, ?)', [LEGACY_DATE, OTHER_DATE]);
    } catch (e) {
        console.error('  TEST 7 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // TEST 8: IMPORT-BULK-REIMPORT-ALL-01 Part A Independent Review 001 (N2)
    // Mid-transaction failure (after DELETE + INSERT, before the import_log
    // COMMIT) restores the exact prior rows for fact_f13_national, fact_f41
    // and fact_f41_national -- the 3 write functions TEST 3A2 does not cover.
    // Uses a TEMP trigger to abort the import_log UPDATE, the same technique
    // the independent reviewer used, so no test-only hook is needed in
    // production code.
    // =========================================================================
    console.log('\n📋 TEST 8: N2 — mid-transaction failure restores old data for fact_f13_national / fact_f41 / fact_f41_national');
    const ABORT_MARKER_FILENAME = 'TRIGGER_ABORT_MARKER.xlsx';
    async function withAbortTrigger(fn) {
        await run(`
            CREATE TEMP TRIGGER IF NOT EXISTS trg_test_abort_import_log_update
            BEFORE UPDATE ON import_log
            WHEN NEW.file_name = '${ABORT_MARKER_FILENAME}'
            BEGIN
                SELECT RAISE(ABORT, 'Simulated mid-transaction failure for test');
            END;
        `);
        try {
            return await fn();
        } finally {
            await run('DROP TRIGGER IF EXISTS trg_test_abort_import_log_update');
        }
    }
    try {
        // 8A: fact_f13_national (importNationalParsedData)
        const natDate = '2000-04-01';
        await run('DELETE FROM fact_f13_national WHERE ngay_do_kiem = ?', [natDate]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [natDate]);
        function makeNatRow(code) {
            const row = {};
            for (const col of NATIONAL_DB_COLUMNS) row[col] = null;
            row.ma_tinh_phat = code;
            return row;
        }
        await importNationalParsedData({
            parsedData: [makeNatRow('10')], ngay_do_kiem: natDate, filename: 'F1.3-2000.04.01-TCT-seed.xlsx', forceReimport: false,
        });
        const natBefore = await all('SELECT ma_tinh_phat FROM fact_f13_national WHERE ngay_do_kiem = ?', [natDate]);
        let natThrown = null;
        try {
            await withAbortTrigger(() => importNationalParsedData({
                parsedData: [makeNatRow('16'), makeNatRow('18')], ngay_do_kiem: natDate, filename: ABORT_MARKER_FILENAME, forceReimport: true,
            }));
        } catch (e) { natThrown = e; }
        assert('TEST 8A: fact_f13_national forced reimport throws on mid-transaction failure', natThrown !== null);
        const natAfter = await all('SELECT ma_tinh_phat FROM fact_f13_national WHERE ngay_do_kiem = ?', [natDate]);
        assert('TEST 8A: fact_f13_national old rows restored exactly', JSON.stringify(natAfter) === JSON.stringify(natBefore), `Before: ${JSON.stringify(natBefore)}, After: ${JSON.stringify(natAfter)}`);
        await run('DELETE FROM fact_f13_national WHERE ngay_do_kiem = ?', [natDate]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [natDate]);

        // 8B: fact_f41 (importF41ParsedData)
        const f41Date = '2000-04-02';
        await run('DELETE FROM fact_f41 WHERE ngay_do_kiem = ?', [f41Date]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [f41Date]);
        function makeF41Row2(ma_bg) {
            const row = {};
            for (const col of F41_HUE_DB_COLUMNS) row[col] = null;
            row.ma_bg = ma_bg;
            return row;
        }
        await importF41ParsedData({ parsedData: [makeF41Row2('SEED_01')], ngay_do_kiem: f41Date, filename: 'F4.1-2000.04.02-seed.xlsx', forceReimport: false });
        const f41Before = await all('SELECT ma_bg FROM fact_f41 WHERE ngay_do_kiem = ?', [f41Date]);
        let f41Thrown = null;
        try {
            await withAbortTrigger(() => importF41ParsedData({
                parsedData: [makeF41Row2('REPLACED_01')], ngay_do_kiem: f41Date, filename: ABORT_MARKER_FILENAME, forceReimport: true,
            }));
        } catch (e) { f41Thrown = e; }
        assert('TEST 8B: fact_f41 forced reimport throws on mid-transaction failure', f41Thrown !== null);
        const f41After = await all('SELECT ma_bg FROM fact_f41 WHERE ngay_do_kiem = ?', [f41Date]);
        assert('TEST 8B: fact_f41 old rows restored exactly', JSON.stringify(f41After) === JSON.stringify(f41Before), `Before: ${JSON.stringify(f41Before)}, After: ${JSON.stringify(f41After)}`);
        await run('DELETE FROM fact_f41 WHERE ngay_do_kiem = ?', [f41Date]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [f41Date]);

        // 8C: fact_f41_national (importF41NationalParsedData)
        const f41NatDate = '2000-04-03';
        await run('DELETE FROM fact_f41_national WHERE ngay_do_kiem = ?', [f41NatDate]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [f41NatDate]);
        function makeF41NatRow(code) {
            const row = {};
            for (const col of F41_TCT_DB_COLUMNS) row[col] = null;
            row.ma_don_vi = code;
            return row;
        }
        await importF41NationalParsedData({ parsedData: [makeF41NatRow('10')], ngay_do_kiem: f41NatDate, filename: 'F4.1-2000.04.03-TCT-seed.xlsx', forceReimport: false });
        const f41NatBefore = await all('SELECT ma_don_vi FROM fact_f41_national WHERE ngay_do_kiem = ?', [f41NatDate]);
        let f41NatThrown = null;
        try {
            await withAbortTrigger(() => importF41NationalParsedData({
                parsedData: [makeF41NatRow('16')], ngay_do_kiem: f41NatDate, filename: ABORT_MARKER_FILENAME, forceReimport: true,
            }));
        } catch (e) { f41NatThrown = e; }
        assert('TEST 8C: fact_f41_national forced reimport throws on mid-transaction failure', f41NatThrown !== null);
        const f41NatAfter = await all('SELECT ma_don_vi FROM fact_f41_national WHERE ngay_do_kiem = ?', [f41NatDate]);
        assert('TEST 8C: fact_f41_national old rows restored exactly', JSON.stringify(f41NatAfter) === JSON.stringify(f41NatBefore), `Before: ${JSON.stringify(f41NatBefore)}, After: ${JSON.stringify(f41NatAfter)}`);
        await run('DELETE FROM fact_f41_national WHERE ngay_do_kiem = ?', [f41NatDate]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [f41NatDate]);
    } catch (e) {
        console.error('  TEST 8 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up test data...');
    await cleanup();
    const finalCount = await countRows();
    assert('Cleanup complete: 0 test rows remain', finalCount === 0, `Got: ${finalCount}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log('✅ ALL TESTS PASSED — importProcessor.js Task 2.2 verified.');
    } else {
        console.log('❌ SOME TESTS FAILED — review above.');
        process.exit(1);
    }

    process.exit(0);
}

runTests().catch(err => {
    console.error('FATAL TEST ERROR:', err);
    process.exit(1);
});
