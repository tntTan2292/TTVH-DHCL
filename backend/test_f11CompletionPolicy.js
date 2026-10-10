'use strict';

// F11-PHASE-3 enablement fix (Opus review 2026-10-10, item 5): the F1.1 completion policies as the
// auto backfill evaluates them after an Import, inside a temporary sandbox (own database, own Data
// tree). HUE: one row per parcel code. TCT: one row per accepting province x delivering province,
// complete only when all 34 ranked delivering provinces are present.
// Run per file: node --test --experimental-sqlite test_f11CompletionPolicy.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f11-policy-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F11 = path.join(sandbox, 'F1.1');

const { db, run, get, all } = require('./src/config/db');
const { executeImport } = require('./src/services/importPipeline');
const { getIndicatorConfig, getLaneConfig } = require('./src/services/importIndicatorRegistry');
const { createSqliteImportCompletionPolicy } = require('./src/services/autoBackfillCompletionPolicies');
const { initSchema } = require('./test/importTestSandbox');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./src/services/nationalExcelParser');
const { buildTctWorkbookBuffer, defaultSpecs } = require('./test/f11TctFixture');

const REAL_HUE = path.resolve(__dirname, '../Data DKCL/F1.1-2026.10.07.xlsx');
const REAL_TCT = path.resolve(__dirname, '../Data DKCL/F1.1/Processed/TCT/F1.1-2026.10.07.xlsx');
const dbApi = { get, all };

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function evaluate(lane, businessDate) {
    const indicator = getIndicatorConfig('F1.1');
    return getLaneConfig('F1.1', lane).completionPolicy.evaluate({
        db: dbApi, fs, indicator, lane: getLaneConfig('F1.1', lane), businessDate,
    });
}

async function importTct(date, buffer) {
    const incoming = path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Incoming', 'TCT');
    ensureDir(incoming);
    const file = path.join(incoming, `F1.1-${date.replace(/-/g, '.')}.xlsx`);
    fs.writeFileSync(file, buffer);
    return executeImport({ filePath: file, indicator: 'F1.1', lane: 'TCT', source: 'MANUAL', forceReimport: true });
}

test.before(async () => { await initSchema(db); });
test.after(async () => {
    await new Promise((resolve) => db.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
});

test('policy factory: several key columns, safe identifiers, required values validated', () => {
    assert.throws(() => createSqliteImportCompletionPolicy({ id: 'X', distinctColumn: [] }), /must not be empty/);
    assert.throws(() => createSqliteImportCompletionPolicy({ id: 'X', distinctColumn: ['a', 'b; DROP TABLE x'] }), /safe SQL identifier/);
    assert.throws(() => createSqliteImportCompletionPolicy({ id: 'X', distinctColumn: 'a', requiredValues: { column: 'a', values: [] } }), /non-empty array/);
    assert.throws(() => createSqliteImportCompletionPolicy({ id: 'X', distinctColumn: 'a', requiredValues: { column: 'a;--', values: ['1'] } }), /safe SQL identifier/);
});

test('TCT: a complete file (34 provinces, extra accepting-province rows) is SUCCESS, not an integrity mismatch', async () => {
    const result = await importTct('2026-10-11', buildTctWorkbookBuffer([...defaultSpecs(), { acc: '01', del: 10, den: 5, ok: 4 }, { acc: '70', del: 10, den: 3, ok: 3 }]));
    assert.equal(result.inserted, 36);
    // the rows repeat ma_tinh_phat (that is what broke the single-column policy)
    const distinctDelivering = (await get("SELECT COUNT(DISTINCT ma_tinh_phat) AS n FROM fact_f11_national WHERE ngay_do_kiem = '2026-10-11'")).n;
    assert.equal(distinctDelivering, 34);
    const outcome = await evaluate('TCT', '2026-10-11');
    assert.equal(outcome.status, 'SUCCESS');
    assert.equal(outcome.evidence.row_count, 36);
    assert.equal(outcome.evidence.distinct_count, 36);
    assert.equal(outcome.evidence.required_values_expected, 34);
    assert.equal(outcome.evidence.required_values_present, 34);
});

test('TCT: a day with a ranked delivering province missing is MANUAL_REVIEW_REQUIRED', async () => {
    await importTct('2026-10-12', buildTctWorkbookBuffer());
    assert.equal((await evaluate('TCT', '2026-10-12')).status, 'SUCCESS');
    await run("DELETE FROM fact_f11_national WHERE ngay_do_kiem = '2026-10-12' AND ma_tinh_phat = '39'");
    const outcome = await evaluate('TCT', '2026-10-12');
    assert.equal(outcome.status, 'MANUAL_REVIEW_REQUIRED');
    assert.equal(outcome.reason, 'COMMITTED_DATA_INTEGRITY_MISMATCH');
    assert.equal(outcome.evidence.required_values_present, 33);
});

test('TCT: a duplicated (accepting, delivering) pair is an integrity mismatch', async () => {
    await importTct('2026-10-13', buildTctWorkbookBuffer());
    // the real table's UNIQUE index forbids a true duplicate, so run the same policy over a relaxed copy
    await run("CREATE TABLE tmp_pair AS SELECT * FROM fact_f11_national WHERE ngay_do_kiem = '2026-10-13'");
    await run("INSERT INTO tmp_pair SELECT * FROM tmp_pair WHERE ma_tinh_phat = '53'");
    const policy = createSqliteImportCompletionPolicy({
        id: 'TMP_PAIR_POLICY',
        distinctColumn: ['ma_tinh_chap_nhan', 'ma_tinh_phat'],
        requiredValues: { column: 'ma_tinh_phat', values: NATIONAL_RANKED_PROVINCE_CODES },
    });
    const outcome = await policy.evaluate({ db: dbApi, fs, indicator: getIndicatorConfig('F1.1'), lane: { code: 'TCT', targetTable: 'tmp_pair' }, businessDate: '2026-10-13' });
    assert.equal(outcome.status, 'MANUAL_REVIEW_REQUIRED');
    assert.deepEqual({ rows: outcome.evidence.row_count, distinct: outcome.evidence.distinct_count }, { rows: 35, distinct: 34 });
    await run('DROP TABLE tmp_pair');
});

test('HUE: one row per parcel code is SUCCESS, an empty day stays MISSING', async () => {
    assert.equal((await evaluate('HUE', '2026-10-20')).status, 'MISSING');
    assert.equal((await evaluate('TCT', '2026-10-20')).status, 'MISSING');
});

test('real files (07/10): HUE 2.621 rows and TCT 84 pairs both evaluate to SUCCESS', { skip: fs.existsSync(REAL_HUE) && fs.existsSync(REAL_TCT) ? false : 'PO files not present on this machine' }, async () => {
    const hueIncoming = path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Incoming', 'HUE');
    ensureDir(hueIncoming);
    const hueFile = path.join(hueIncoming, 'F1.1-2026.10.07.xlsx');
    fs.copyFileSync(REAL_HUE, hueFile); // COPY: the PO file is never moved
    await executeImport({ filePath: hueFile, indicator: 'F1.1', lane: 'HUE', source: 'MANUAL', forceReimport: true });
    const tctIncoming = path.join(process.env.QIS_TEST_DATA_ROOT_F11, 'Incoming', 'TCT');
    ensureDir(tctIncoming);
    const tctFile = path.join(tctIncoming, 'F1.1-2026.10.07.xlsx');
    fs.copyFileSync(REAL_TCT, tctFile);
    await executeImport({ filePath: tctFile, indicator: 'F1.1', lane: 'TCT', source: 'MANUAL', forceReimport: true });

    const hue = await evaluate('HUE', '2026-10-07');
    assert.equal(hue.status, 'SUCCESS');
    assert.deepEqual({ r: hue.evidence.row_count, d: hue.evidence.distinct_count }, { r: 2621, d: 2621 });
    const tct = await evaluate('TCT', '2026-10-07');
    assert.equal(tct.status, 'SUCCESS');
    assert.deepEqual({ r: tct.evidence.row_count, d: tct.evidence.distinct_count, p: tct.evidence.required_values_present }, { r: 84, d: 84, p: 34 });
    // the old single-column rule would have rejected this very day: 84 rows, fewer distinct delivering provinces
    const old = await get("SELECT COUNT(*) AS n, COUNT(DISTINCT ma_tinh_phat) AS d FROM fact_f11_national WHERE ngay_do_kiem = '2026-10-07'");
    assert.equal(old.n, 84);
    assert.ok(old.d < old.n);
    assert.equal(fs.existsSync(REAL_HUE) && fs.existsSync(REAL_TCT), true, 'PO files still in place');
});
