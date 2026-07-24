/**
 * test_importPipelineRace.js
 *
 * Focused verification for atomic file claiming in importPipeline.
 * Run: node test_importPipelineRace.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');

const operationalDbPath = path.resolve(__dirname, 'src/db/database.sqlite');
const testDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-import-pipeline-race-'));
const testDbPath = path.join(testDbDir, `database-${process.pid}-${Date.now()}.sqlite`);

process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = testDbPath;

const { run, get, all, db, dbPath, operationalDbPath: configuredOperationalDbPath } = require('./src/config/db');
const { COLUMN_MAPPING } = require('./src/services/excelParser');
const {
    executeImport,
    BASE_INCOMING,
    BASE_PROCESSING,
    BASE_PROCESSED,
    BASE_ERROR,
    BASE_QUARANTINE,
    verifyHueImportCommit,
    getHueCommittedEvidence
} = require('./src/services/importPipeline');

const SUCCESS_DATE = '2026-07-18';
const SUCCESS_FILENAME = 'F1.3-2026.07.18.xlsx';
const FAILURE_DATE = '2026-07-19';
const FAILURE_FILENAME = 'F1.3-2026.07.19.xlsx';
const STALE_DATE = '2026-07-20';
const STALE_FILENAME = 'F1.3-2026.07.20.xlsx';
const COUNT_MISMATCH_DATE = '2026-07-21';
const COUNT_MISMATCH_FILENAME = 'F1.3-2026.07.21.xlsx';
const MOVE_FAILURE_DATE = '2026-07-22';
const MOVE_FAILURE_FILENAME = 'F1.3-2026.07.22.xlsx';
const SCHEMA_PATH = path.resolve(__dirname, 'src/db/schema.sql');
const TEST_DATES = [SUCCESS_DATE, FAILURE_DATE, STALE_DATE, COUNT_MISMATCH_DATE, MOVE_FAILURE_DATE];
const TEST_FILENAMES = [SUCCESS_FILENAME, FAILURE_FILENAME, STALE_FILENAME, COUNT_MISMATCH_FILENAME, MOVE_FAILURE_FILENAME];

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

function sqliteGet(dbFile, sql, params = []) {
    return new Promise((resolve, reject) => {
        const readonlyDb = new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY, (openErr) => {
            if (openErr) {
                reject(openErr);
                return;
            }
            readonlyDb.get(sql, params, (queryErr, row) => {
                readonlyDb.close((closeErr) => {
                    if (queryErr) reject(queryErr);
                    else if (closeErr) reject(closeErr);
                    else resolve(row);
                });
            });
        });
    });
}

async function readOperationalStats() {
    const placeholders = TEST_DATES.map(() => '?').join(',');
    const row = await sqliteGet(
        operationalDbPath,
        `SELECT
            (SELECT COUNT(*) FROM fact_f13 WHERE ngay_do_kiem IN (${placeholders})) AS fact_count,
            (SELECT COUNT(*) FROM import_log WHERE ngay_do_kiem IN (${placeholders})) AS log_count,
            (SELECT COALESCE(SUM(total_records), 0) FROM import_log WHERE ngay_do_kiem IN (${placeholders})) AS log_total_records`,
        [...TEST_DATES, ...TEST_DATES, ...TEST_DATES]
    );
    const stat = fs.statSync(operationalDbPath);
    return {
        fact_count: Number(row?.fact_count || 0),
        log_count: Number(row?.log_count || 0),
        log_total_records: Number(row?.log_total_records || 0),
        size: stat.size,
        mtimeMs: stat.mtimeMs
    };
}

function execSql(sql) {
    return new Promise((resolve, reject) => {
        db.exec(sql, (error) => error ? reject(error) : resolve());
    });
}

function closeDb() {
    return new Promise((resolve, reject) => {
        db.close((error) => error ? reject(error) : resolve());
    });
}

async function initializeTestDb() {
    assert('NODE_ENV=test is active before db.js loads', process.env.NODE_ENV === 'test');
    assert('test DB path is unique OS temp sqlite', dbPath === testDbPath && dbPath.startsWith(testDbDir) && dbPath.endsWith('.sqlite'), dbPath);
    assert('test DB path does not resolve to operational database.sqlite', dbPath !== configuredOperationalDbPath && configuredOperationalDbPath === operationalDbPath);
    await execSql(fs.readFileSync(SCHEMA_PATH, 'utf8'));
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
    const placeholders = TEST_DATES.map(() => '?').join(',');
    await run(`DELETE FROM fact_f13 WHERE ngay_do_kiem IN (${placeholders})`, TEST_DATES);
    await run(`DELETE FROM import_log WHERE ngay_do_kiem IN (${placeholders})`, TEST_DATES);

    for (const base of [BASE_INCOMING, BASE_PROCESSING, BASE_PROCESSED, BASE_ERROR, BASE_QUARANTINE]) {
        ensureDir(path.join(base, 'HUE'));
        for (const filename of TEST_FILENAMES) {
            const target = pathIn(base, filename);
            if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
                fs.rmSync(target, { recursive: true, force: true });
            } else {
                safeUnlink(target);
            }
        }
        if (base === BASE_QUARANTINE) {
            for (const entry of fs.readdirSync(path.join(base, 'HUE'))) {
                if (entry.startsWith('F1.3-2026.07.20.stale-')) {
                    safeUnlink(path.join(base, 'HUE', entry));
                }
            }
        }
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
    let operationalBefore = null;
    await initializeTestDb();
    operationalBefore = await readOperationalStats();

    try {
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
            assert('one SUCCESS log is created in isolated test DB', successLog?.count === 1, `Got: ${JSON.stringify(logRows)}`);
            assert('no FAILED log is created for losing worker', !failedLog, `Got: ${JSON.stringify(logRows)}`);
            assert('two facts imported into isolated test DB', factCount.count === 2, `Got: ${factCount.count}`);
            assert('file moved to Processed', fs.existsSync(pathIn(BASE_PROCESSED, SUCCESS_FILENAME)));
            assert('file not left in Incoming', !fs.existsSync(incomingPath));
            assert('file not left in Processing', !fs.existsSync(pathIn(BASE_PROCESSING, SUCCESS_FILENAME)));
        } catch (error) {
            console.error('  TEST 1 UNEXPECTED ERROR:', error.message);
            failed++;
        }

        try {
            console.log('\nTEST 2: genuine parse failure logs once and moves to Error');
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
            assert('one FAILED log is created in isolated test DB', failedLog?.count === 1, `Got: ${JSON.stringify(logRows)}`);
            assert('no SUCCESS log is created', !successLog, `Got: ${JSON.stringify(logRows)}`);
            assert('no facts imported for failed file', factCount.count === 0, `Got: ${factCount.count}`);
            assert('file moved to Error', fs.existsSync(pathIn(BASE_ERROR, FAILURE_FILENAME)));
            assert('file not left in Incoming', !fs.existsSync(incomingPath));
            assert('file not left in Processing', !fs.existsSync(pathIn(BASE_PROCESSING, FAILURE_FILENAME)));
        } catch (error) {
            console.error('  TEST 2 UNEXPECTED ERROR:', error.message);
            failed++;
        }

        try {
            console.log('\nTEST 3: stale Processed evidence is quarantined and does not block valid import');
            await run(
                `INSERT INTO import_log
                    (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
                 VALUES (?, ?, 'SUCCESS', 2, 0, 0)`,
                [STALE_FILENAME, STALE_DATE]
            );
            const staleProcessedPath = pathIn(BASE_PROCESSED, STALE_FILENAME);
            ensureDir(path.dirname(staleProcessedPath));
            fs.writeFileSync(staleProcessedPath, Buffer.from('stale processed evidence'));
            const incomingPath = pathIn(BASE_INCOMING, STALE_FILENAME);
            fs.writeFileSync(incomingPath, buildValidWorkbook());

            const result = await executeImport({ filePath: incomingPath, forceReimport: false, source: 'TEST-STALE' });
            const facts = await get('SELECT COUNT(*) AS count FROM fact_f13 WHERE ngay_do_kiem = ?', [STALE_DATE]);
            const staleStillExists = fs.existsSync(staleProcessedPath) && fs.readFileSync(staleProcessedPath).toString() === 'stale processed evidence';
            const quarantineFiles = fs.readdirSync(path.join(BASE_QUARANTINE, 'HUE')).filter((name) => name.includes('F1.3-2026.07.20.stale-'));

            assert('stale SUCCESS log without facts does not trigger reimport confirmation', result.success === true && !result.requiresConfirmation);
            assert('valid import commits verified rows after stale evidence', facts.count === 2, `Got: ${facts.count}`);
            assert('stale Processed file is quarantined before final Processed move', staleStillExists === false && quarantineFiles.length === 1, JSON.stringify(quarantineFiles));
            assert('new verified workbook is in Processed', fs.existsSync(pathIn(BASE_PROCESSED, STALE_FILENAME)));
        } catch (error) {
            console.error('  TEST 3 UNEXPECTED ERROR:', error.message);
            failed++;
        }

        try {
            console.log('\nTEST 4: count mismatch prevents SUCCESS without verified fact rows');
            const log = await run(
                `INSERT INTO import_log
                    (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records)
                 VALUES (?, ?, 'SUCCESS', 2, 0, 0)`,
                [COUNT_MISMATCH_FILENAME, COUNT_MISMATCH_DATE]
            );
            let mismatchCode = null;
            try {
                await verifyHueImportCommit({
                    ngay_do_kiem: COUNT_MISMATCH_DATE,
                    importLogId: log.lastID,
                    inserted: 2,
                    filename: COUNT_MISMATCH_FILENAME
                });
            } catch (error) {
                mismatchCode = error.code;
            }
            const mismatchLog = await get('SELECT status, error_records FROM import_log WHERE id = ?', [log.lastID]);
            assert('count mismatch throws explicit verification failure', mismatchCode === 'IMPORT_COMMIT_VERIFICATION_FAILED', mismatchCode);
            assert('count mismatch removes SUCCESS status', mismatchLog.status === 'FAILED' && mismatchLog.error_records === 2, JSON.stringify(mismatchLog));
        } catch (error) {
            console.error('  TEST 4 UNEXPECTED ERROR:', error.message);
            failed++;
        }

        try {
            console.log('\nTEST 5: post-commit Processed move failure preserves DB and records recoverable status');
            const incomingPath = pathIn(BASE_INCOMING, MOVE_FAILURE_FILENAME);
            fs.writeFileSync(incomingPath, buildValidWorkbook());

            const originalRenameSync = fs.renameSync;
            fs.renameSync = (from, to) => {
                if (from === pathIn(BASE_PROCESSING, MOVE_FAILURE_FILENAME) && to === pathIn(BASE_PROCESSED, MOVE_FAILURE_FILENAME)) {
                    const error = new Error('simulated post-commit processed move failure');
                    error.code = 'EACCES';
                    throw error;
                }
                return originalRenameSync(from, to);
            };
            let result = null;
            try {
                result = await executeImport({ filePath: incomingPath, forceReimport: false, source: 'TEST-MOVE-FAIL' });
            } finally {
                fs.renameSync = originalRenameSync;
            }
            const facts = await get('SELECT COUNT(*) AS count FROM fact_f13 WHERE ngay_do_kiem = ?', [MOVE_FAILURE_DATE]);
            const logRow = await get('SELECT status, error_records FROM import_log WHERE ngay_do_kiem = ? ORDER BY id DESC LIMIT 1', [MOVE_FAILURE_DATE]);
            const committedEvidence = await getHueCommittedEvidence(MOVE_FAILURE_DATE);

            assert('file move failure is recoverable and not reported as SUCCESS', result.status === 'FILE_MOVE_FAILED' && result.committed === true && result.recoverable === true);
            assert('DB rows remain committed after file move failure', facts.count === 2, `Got: ${facts.count}`);
            assert('import_log records recoverable file-move status', logRow.status === 'FILE_MOVE_FAILED' && logRow.error_records === 0, JSON.stringify(logRow));
            assert('recoverable committed evidence prevents reimport requirement gaps', committedEvidence?.status === 'FILE_MOVE_FAILED' && committedEvidence.factCount === 2, JSON.stringify(committedEvidence));
            assert('Processing file remains available for file-state recovery', fs.existsSync(pathIn(BASE_PROCESSING, MOVE_FAILURE_FILENAME)));
        } catch (error) {
            console.error('  TEST 5 UNEXPECTED ERROR:', error.message);
            failed++;
        }
    } finally {
        await cleanup().catch((error) => {
            console.error('  CLEANUP ERROR:', error.message);
            failed++;
        });
        const operationalAfter = operationalBefore ? await readOperationalStats() : null;
        if (operationalBefore && operationalAfter) {
            assert('operational database.sqlite unchanged before/after race test', JSON.stringify(operationalAfter) === JSON.stringify(operationalBefore), `Before=${JSON.stringify(operationalBefore)} After=${JSON.stringify(operationalAfter)}`);
        }
        await closeDb().catch((error) => {
            console.error('  DB CLOSE ERROR:', error.message);
            failed++;
        });
        fs.rmSync(testDbDir, { recursive: true, force: true });

        console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
        if (failed > 0) process.exit(1);
    }
}

runTests().catch(async (error) => {
    console.error('FATAL TEST ERROR:', error);
    await closeDb().catch(() => {});
    fs.rmSync(testDbDir, { recursive: true, force: true });
    process.exit(1);
});
