/**
 * test_e2e_import_engine.js — End-to-End Integration Test
 * Import Engine: excelParser → importParsedData → fact_f13 + import_log
 *
 * Tests:
 *   E2E-1: First import (parse + insert + verify DB)
 *   E2E-2: Duplicate within file (INSERT OR IGNORE, error_records counted)
 *   E2E-3: Re-import confirmation flow (processImport returns requiresConfirmation)
 *   E2E-4: Force reimport (DELETE old + INSERT new)
 *   E2E-5: Record classification consistency
 *   E2E-6: Validation errors (bad filename, missing required column)
 *   E2E-7: API response shape matches TD § 2.2
 *
 * Run: node test_e2e_import_engine.js
 */
'use strict';

const xlsx = require('xlsx');
const { run, all, get } = require('./src/config/db');
const { parseF13Excel, extractDateFromFilename } = require('./src/services/excelParser');
const { importParsedData }  = require('./src/services/importProcessor');
const { processImport }     = require('./src/services/importService');

const E2E_DATE     = '2098-06-25';
const E2E_FILENAME = 'F1.3-2098.06.25.xlsx';

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

/**
 * Build a synthetic F1.3-format Excel buffer.
 * Uses real column headers matching COLUMN_MAPPING in excelParser.js.
 */
function buildF13Excel(rows) {
    const headers = [
        'Số hiệu bưu gửi', 'Mã BC phát', 'Tên BC phát', 'Mã tuyến phát', 'Tên tuyến phát',
        'Loại BG', 'Loại DV', 'Ngày gửi', 'Tên người gửi', 'Địa chỉ người gửi',
        'Tỉnh người gửi', 'Tên người nhận', 'Địa chỉ người nhận', 'Tỉnh người nhận',
        'Trọng lượng (g)', 'Cước phí', 'Số tiền COD', 'Thời gian PTC', 'Thời gian nộp tiền',
        'Trạng thái', 'Ghi chú', 'Mã nhân viên', 'Tên nhân viên', 'Ca làm việc',
        'Hình thức PT', 'Khu vực', 'Tuyến PT nội', 'Thứ tự điểm', 'Thời gian phát',
        'Kết quả phát lần 1', 'Lý do không phát lần 1', 'Số lần phát', 'Kết quả phát cuối',
        'Lý do không phát cuối', 'Thời gian nộp hoàn', 'Ngày kết thúc', 'SL phát thành công',
        'SL không phát được', 'Thời gian phát cuối', 'Đánh giá (Đạt/Không đạt)', 'Ghi chú 2'
    ];
    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/** Build a row with 41 values. Only the specified overrides differ from null. */
function makeRow(overrides = {}) {
    const defaults = {
        'Số hiệu bưu gửi'          : null,
        'Mã BC phát'                : null,
        'Tên BC phát'               : null,
        'Mã tuyến phát'             : null,
        'Tên tuyến phát'            : null,
        'Loại BG'                   : null,
        'Loại DV'                   : null,
        'Ngày gửi'                  : null,
        'Tên người gửi'             : null,
        'Địa chỉ người gửi'         : null,
        'Tỉnh người gửi'            : null,
        'Tên người nhận'            : null,
        'Địa chỉ người nhận'        : null,
        'Tỉnh người nhận'           : null,
        'Trọng lượng (g)'           : null,
        'Cước phí'                  : null,
        'Số tiền COD'               : null,
        'Thời gian PTC'             : null,
        'Thời gian nộp tiền'        : null,
        'Trạng thái'                : null,
        'Ghi chú'                   : null,
        'Mã nhân viên'              : null,
        'Tên nhân viên'             : null,
        'Ca làm việc'               : null,
        'Hình thức PT'              : null,
        'Khu vực'                   : null,
        'Tuyến PT nội'              : null,
        'Thứ tự điểm'               : null,
        'Thời gian phát'            : null,
        'Kết quả phát lần 1'        : null,
        'Lý do không phát lần 1'    : null,
        'Số lần phát'               : null,
        'Kết quả phát cuối'         : null,
        'Lý do không phát cuối'     : null,
        'Thời gian nộp hoàn'        : null,
        'Ngày kết thúc'             : null,
        'SL phát thành công'        : null,
        'SL không phát được'        : null,
        'Thời gian phát cuối'       : null,
        'Đánh giá (Đạt/Không đạt)' : null,
        'Ghi chú 2'                 : null
    };
    const merged = { ...defaults, ...overrides };
    return Object.values(merged);
}

async function cleanup() {
    await run('DELETE FROM fact_f13   WHERE ngay_do_kiem = ?', [E2E_DATE]);
    await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [E2E_DATE]);
}

async function countF13() {
    const r = await get('SELECT COUNT(*) as c FROM fact_f13 WHERE ngay_do_kiem = ?', [E2E_DATE]);
    return r.c;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
    await cleanup();
    console.log(`\n${'─'.repeat(60)}`);
    console.log('E2E Integration Test — Import Engine');
    console.log(`Test date: ${E2E_DATE} | File: ${E2E_FILENAME}`);
    console.log(`${'─'.repeat(60)}`);

    // =========================================================================
    // E2E-1: First import (parse → import → verify DB)
    // =========================================================================
    console.log('\n🔷 E2E-1: First import — Parse + Import + Verify');
    try {
        const excelBuffer = buildF13Excel([
            makeRow({ 'Số hiệu bưu gửi': 'VN001', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BCVH 01', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
            makeRow({ 'Số hiệu bưu gửi': 'VN002', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BCVH 01', 'Đánh giá (Đạt/Không đạt)': 'Không đạt' }),
            makeRow({ 'Số hiệu bưu gửi': 'VN003', 'Mã BC phát': 'BC02', 'Tên BC phát': 'BCVH 02', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
            makeRow({}),                                    // empty row — skipped by parser
        ]);

        // Step A: Parse
        const { parsedData, totalParsed } = parseF13Excel(excelBuffer);

        assert('Parser: returns 3 rows (empty row skipped)',  totalParsed === 3,   `Got: ${totalParsed}`);
        assert('Parser: row[0].ma_bg = VN001',               parsedData[0].ma_bg === 'VN001');
        assert('Parser: row[0].ket_qua_f13 = Đạt',          parsedData[0].ket_qua_f13 === 'Đạt');
        assert('Parser: row[1].ket_qua_f13 = Không đạt',    parsedData[1].ket_qua_f13 === 'Không đạt');
        assert('Parser: ngay_do_kiem NOT in parsedData row', !('ngay_do_kiem' in parsedData[0]));

        // Step B: Extract date from filename (SSOT)
        const ngay_do_kiem = extractDateFromFilename(E2E_FILENAME);
        assert('extractDateFromFilename = ' + E2E_DATE, ngay_do_kiem === E2E_DATE);

        // Step C: Import to DB
        const result = await importParsedData({
            parsedData,
            ngay_do_kiem,
            filename    : E2E_FILENAME,
            forceReimport: false
        });

        assert('importParsedData: success = true',      result.success   === true);
        assert('importParsedData: total = 3',           result.total     === 3,   `Got: ${result.total}`);
        assert('importParsedData: inserted = 3',        result.inserted  === 3,   `Got: ${result.inserted}`);
        assert('importParsedData: errors = 0',          result.errors    === 0,   `Got: ${result.errors}`);

        // Step D: Verify fact_f13
        const rows = await all(
            'SELECT ma_bg, ket_qua_f13, ngay_do_kiem, import_log_id FROM fact_f13 WHERE ngay_do_kiem = ? ORDER BY ma_bg',
            [E2E_DATE]
        );
        assert('fact_f13: 3 rows committed', rows.length === 3, `Got: ${rows.length}`);
        assert('fact_f13: VN001 is Đạt',    rows[0].ket_qua_f13 === 'Đạt');
        assert('fact_f13: VN002 is Không đạt', rows[1].ket_qua_f13 === 'Không đạt');
        assert('fact_f13: ngay_do_kiem set correctly', rows[0].ngay_do_kiem === E2E_DATE);
        assert('fact_f13: import_log_id set', rows[0].import_log_id === result.import_log_id);

        // Step E: Verify import_log
        const log = await get(
            'SELECT * FROM import_log WHERE id = ?', [result.import_log_id]
        );
        assert('import_log: status = SUCCESS',        log.status          === 'SUCCESS');
        assert('import_log: total_records = 3',       log.total_records   === 3);
        assert('import_log: error_records = 0',       log.error_records   === 0);
        assert('import_log: skipped_records = 0',     log.skipped_records === 0);
        assert('import_log: file_name matches',       log.file_name       === E2E_FILENAME);
        assert('import_log: ngay_do_kiem matches',    log.ngay_do_kiem    === E2E_DATE);

    } catch (e) {
        console.error('  E2E-1 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // E2E-2: Duplicate within-file (INSERT OR IGNORE)
    // VN001 already in DB — sending another file with VN001 + VN004 + VN005
    // Expected: 2 inserted (VN004, VN005), 1 error (VN001 duplicate)
    // =========================================================================
    console.log('\n🔷 E2E-2: Within-file duplicate — INSERT OR IGNORE (error_records)');
    try {
        const excelBuffer = buildF13Excel([
            makeRow({ 'Số hiệu bưu gửi': 'VN004', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BCVH 01', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
            makeRow({ 'Số hiệu bưu gửi': 'VN001', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BCVH 01', 'Đánh giá (Đạt/Không đạt)': 'Không đạt' }),  // duplicate!
            makeRow({ 'Số hiệu bưu gửi': 'VN005', 'Mã BC phát': 'BC02', 'Tên BC phát': 'BCVH 02', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
        ]);
        const { parsedData } = parseF13Excel(excelBuffer);

        const result = await importParsedData({
            parsedData,
            ngay_do_kiem : E2E_DATE,
            filename     : E2E_FILENAME,
            forceReimport: false
        });

        assert('total = 3 (all parsed rows)', result.total    === 3,   `Got: ${result.total}`);
        assert('inserted = 2 (VN001 skipped)', result.inserted === 2,   `Got: ${result.inserted}`);
        assert('errors = 1 (VN001 duplicate)', result.errors   === 1,   `Got: ${result.errors}`);
        assert('TD: errors = total - inserted', result.errors === result.total - result.inserted);

        // SSOT: process continues despite duplicate — 5 rows total in DB
        const total = await countF13();
        assert('SSOT: no abort on duplicate, DB has 5 rows', total === 5, `Got: ${total}`);

        // import_log accurately records the skip count
        const log = await get('SELECT * FROM import_log WHERE id = ?', [result.import_log_id]);
        assert('import_log: error_records = 1', log.error_records === 1, `Got: ${log.error_records}`);

    } catch (e) {
        console.error('  E2E-2 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // E2E-3: Reimport confirmation flow (via processImport, forceReimport=false)
    // Date already has data → should return { requiresConfirmation: true }
    // =========================================================================
    console.log('\n🔷 E2E-3: Reimport confirmation (processImport returns requiresConfirmation)');
    try {
        const excelBuffer = buildF13Excel([
            makeRow({ 'Số hiệu bưu gửi': 'VN_NEW', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BCVH 01', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
        ]);

        // processImport (not importParsedData) — goes through service layer
        const result = await processImport(E2E_FILENAME, excelBuffer, false /* forceReimport */);

        assert('requiresConfirmation = true (data already exists)', result.requiresConfirmation === true);
        assert('ngay_do_kiem returned for UI display', result.ngay_do_kiem === E2E_DATE);

        // Verify no new rows were inserted
        const total = await countF13();
        assert('DB unchanged: still 5 rows (no premature insert)', total === 5, `Got: ${total}`);

    } catch (e) {
        console.error('  E2E-3 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // E2E-4: Force reimport (DELETE old + INSERT new per SSOT § 4)
    // =========================================================================
    console.log('\n🔷 E2E-4: Force reimport (forceReimport=true → DELETE + re-insert)');
    try {
        const countBefore = await countF13();
        assert(`Before reimport: ${countBefore} existing rows`, countBefore > 0);

        const excelBuffer = buildF13Excel([
            makeRow({ 'Số hiệu bưu gửi': 'RI001', 'Mã BC phát': 'BC_RI', 'Tên BC phát': 'BCVH Reimport', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
            makeRow({ 'Số hiệu bưu gửi': 'RI002', 'Mã BC phát': 'BC_RI', 'Tên BC phát': 'BCVH Reimport', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
        ]);

        const result = await processImport(E2E_FILENAME, excelBuffer, true /* forceReimport */);

        assert('success = true after force reimport', result.success   === true);
        assert('total = 2',                           result.total     === 2,   `Got: ${result.total}`);
        assert('inserted = 2',                        result.inserted  === 2,   `Got: ${result.inserted}`);
        assert('errors = 0 (no within-file dups)',    result.errors    === 0,   `Got: ${result.errors}`);

        // SSOT: old data replaced, only 2 new rows in DB
        const total = await countF13();
        assert('DB: exactly 2 rows (old data deleted)', total === 2, `Got: ${total}`);

        const rows = await all('SELECT ma_bg FROM fact_f13 WHERE ngay_do_kiem = ? ORDER BY ma_bg', [E2E_DATE]);
        const bgs  = rows.map(r => r.ma_bg);
        assert('DB: RI001 present', bgs.includes('RI001'));
        assert('DB: RI002 present', bgs.includes('RI002'));
        assert('DB: VN001 gone (replaced)', !bgs.includes('VN001'));

    } catch (e) {
        console.error('  E2E-4 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // E2E-5: Record Classification Consistency Check
    // =========================================================================
    console.log('\n🔷 E2E-5: Record Classification — total / inserted / errors consistency');
    try {
        // Fresh import: 4 rows, 2 duplicates within file (same ma_bg pair)
        await run('DELETE FROM fact_f13   WHERE ngay_do_kiem = ?', [E2E_DATE]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [E2E_DATE]);

        const excelBuffer = buildF13Excel([
            makeRow({ 'Số hiệu bưu gửi': 'CLASS001', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BC01', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
            makeRow({ 'Số hiệu bưu gửi': 'CLASS002', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BC01', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
            makeRow({ 'Số hiệu bưu gửi': 'CLASS001', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BC01', 'Đánh giá (Đạt/Không đạt)': 'Không đạt' }),  // dup
            makeRow({ 'Số hiệu bưu gửi': 'CLASS002', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BC01', 'Đánh giá (Đạt/Không đạt)': 'Không đạt' }),  // dup
        ]);
        const { parsedData } = parseF13Excel(excelBuffer);

        const result = await importParsedData({
            parsedData,
            ngay_do_kiem : E2E_DATE,
            filename     : E2E_FILENAME,
            forceReimport: false
        });

        // Classification rules per Technical Design § 2.1:
        const totalFromParser    = parsedData.length;            // 4 rows from parse step
        const insertedInDb       = result.inserted;              // 2 (CLASS001, CLASS002)
        const duplicatesSkipped  = result.errors;                // 2 (dup CLASS001, dup CLASS002)
        const tdCheck            = result.total - result.inserted; // must equal errors

        assert('Classification: total = 4 (all valid rows)',         result.total    === 4,   `Got: ${result.total}`);
        assert('Classification: inserted = 2 (unique ma_bg)',        result.inserted === 2,   `Got: ${result.inserted}`);
        assert('Classification: errors = 2 (duplicate rows skipped)', result.errors   === 2,   `Got: ${result.errors}`);
        assert('TD § 2.1: errors = total - inserted',                 tdCheck === result.errors);
        assert('Classification: total = inserted + errors',           result.total === result.inserted + result.errors);

        // Verify import_log matches
        const log = await get('SELECT * FROM import_log WHERE id = ?', [result.import_log_id]);
        assert('import_log total_records matches result.total',   log.total_records  === result.total);
        assert('import_log error_records matches result.errors',  log.error_records  === result.errors);
        assert('import_log skipped_records = 0 (reserved)',       log.skipped_records === 0);

        // Verify only 2 rows in fact_f13
        const dbCount = await countF13();
        assert('DB: 2 rows (duplicates correctly excluded)',  dbCount === 2, `Got: ${dbCount}`);

        console.log('\n  📊 Classification Summary:');
        console.log(`     total_records    = ${result.total}     (all rows from parsedData)`);
        console.log(`     inserted         = ${result.inserted}     (rows committed to fact_f13)`);
        console.log(`     error_records    = ${result.errors}     (rows skipped by INSERT OR IGNORE)`);
        console.log(`     skipped_records  = ${result.skipped}     (reserved, always 0)`);
        console.log(`     Formula: error_records = total - inserted = ${result.total} - ${result.inserted} = ${result.errors} ✅`);

    } catch (e) {
        console.error('  E2E-5 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // E2E-6: Validation Errors (bad filename, missing required column)
    // =========================================================================
    console.log('\n🔷 E2E-6: Validation Errors (TD § 2.3)');
    try {
        // 6a: Bad filename format
        let threw = false;
        try { extractDateFromFilename('KPI-2098.06.25.xlsx'); } catch { threw = true; }
        assert('extractDateFromFilename throws on bad filename', threw);

        // 6b: Missing required column (Số hiệu bưu gửi)
        const ws = xlsx.utils.aoa_to_sheet([
            ['Mã BC phát', 'Tên BC phát', 'Đánh giá (Đạt/Không đạt)'],
            ['BC01', 'BCVH 01', 'Đạt']
        ]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        const badBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        threw = false;
        try { parseF13Excel(badBuffer); } catch (e) { threw = true; }
        assert('parseF13Excel throws on missing Số hiệu bưu gửi', threw);

        // 6c: processImport with bad filename → error from extractDateFromFilename
        threw = false;
        try {
            const validBuffer = buildF13Excel([
                makeRow({ 'Số hiệu bưu gửi': 'TEST', 'Đánh giá (Đạt/Không đạt)': 'Đạt' })
            ]);
            await processImport('BADNAME.xlsx', validBuffer, false);
        } catch { threw = true; }
        assert('processImport throws on bad filename format', threw);

    } catch (e) {
        console.error('  E2E-6 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // =========================================================================
    // E2E-7: API Response Shape (TD § 2.2)
    // =========================================================================
    console.log('\n🔷 E2E-7: API Response Shape matches TD § 2.2');
    try {
        // Cleanup and do a fresh import
        await run('DELETE FROM fact_f13   WHERE ngay_do_kiem = ?', [E2E_DATE]);
        await run('DELETE FROM import_log WHERE ngay_do_kiem = ?', [E2E_DATE]);

        const excelBuffer = buildF13Excel([
            makeRow({ 'Số hiệu bưu gửi': 'API001', 'Mã BC phát': 'BC01', 'Tên BC phát': 'BCVH 01', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }),
        ]);

        const result = await processImport(E2E_FILENAME, excelBuffer, false);

        // TD § 2.2 API 1 response shape: { success, total, inserted, errors }
        assert('API response: has success field',  'success'  in result, `Keys: ${Object.keys(result)}`);
        assert('API response: has total field',    'total'    in result, `Keys: ${Object.keys(result)}`);
        assert('API response: has inserted field', 'inserted' in result, `Keys: ${Object.keys(result)}`);
        assert('API response: has errors field',   'errors'   in result, `Keys: ${Object.keys(result)}`);
        assert('API response: success = true',     result.success === true);
        assert('API response: all fields are numbers', 
            typeof result.total === 'number' &&
            typeof result.inserted === 'number' &&
            typeof result.errors === 'number');

    } catch (e) {
        console.error('  E2E-7 UNEXPECTED ERROR:', e.message);
        failed++;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up E2E test data...');
    await cleanup();
    const remaining = await countF13();
    assert('Cleanup: 0 test rows remain in fact_f13', remaining === 0, `Got: ${remaining}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log('✅ ALL E2E TESTS PASSED — Import Engine hoàn chỉnh.');
    } else {
        console.log('❌ SOME TESTS FAILED — review above.');
        process.exit(1);
    }
    process.exit(0);
}

runTests().catch(err => {
    console.error('FATAL E2E ERROR:', err);
    process.exit(1);
});
