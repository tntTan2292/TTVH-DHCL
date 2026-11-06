/**
 * F13-EVIDENCE-01 B1 - count parity between the evidence list and the figures of "Phân tích nguyên nhân". READ ONLY.
 *
 *   node scripts/f13_evidence_parity.js --db <file.sqlite> [--readonly] [--out file.txt]
 *
 * With --readonly the file is opened read-only (the live database): the analysis log, which exists only after the next backend restart, is
 * replaced by an empty TEMP table of the connection (nothing is written to the file), and every query runs inside ONE read transaction, so the
 * figures and the lists are read from the same snapshot even while imports go on. For every BCVH, route and postman row of week 43 (and the
 * BCVH and route rows of October) the evidence total equals the figure, the failed / unrated parts and every cause line and Chờ Chuyên quản reason.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const sqlite3 = require('sqlite3');
const ExcelJS = require('exceljs');

const { CauseAggQueryService } = require('../src/services/f13v2/CauseAggQueryService');
const { EvidenceService } = require('../src/services/f13v2/EvidenceService');
const { JourneyService } = require('../src/services/f13v2/JourneyService');
const { F13JourneyRepository } = require('../src/repositories/F13JourneyRepository');
const { F13_EVIDENCE_01_STATEMENTS } = require('../migrate_f13_evidence_01_schema');

function arg(name) {
    const index = process.argv.indexOf(`--${name}`);
    if (index === -1) return null;
    const next = process.argv[index + 1];
    return next && !next.startsWith('--') ? next : true;
}
const dbFile = arg('db');
if (!dbFile || dbFile === true) {
    console.error('Usage: node scripts/f13_evidence_parity.js --db <file> [--readonly] [--out file]');
    process.exit(2);
}
const readonly = Boolean(arg('readonly'));

const CITY = { bcvhId: null, allowedCodes: null, canSeeCity: true };
const FAILED = 'Không đạt';
const lines = [];
let checks = 0;
let differences = 0;
const out = (text = '') => lines.push(text);
const check = (label, actual, expected) => {
    checks += 1;
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        differences += 1;
        out(`  DIFF ${label}: evidence ${JSON.stringify(actual)} != figure ${JSON.stringify(expected)}`);
    }
};

(async () => {
    const started = Date.now();
    const database = await new Promise((resolve, reject) => {
        const handle = new sqlite3.Database(path.resolve(dbFile), readonly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE, (error) => (error ? reject(error) : resolve(handle)));
    });
    const exec = (sql) => new Promise((resolve, reject) => database.exec(sql, (error) => (error ? reject(error) : resolve())));
    await exec('PRAGMA busy_timeout = 60000; PRAGMA cache_size = -262144');
    const hasLog = await new Promise((resolve, reject) => database.all("SELECT 1 FROM sqlite_master WHERE name = 'f13_analysis_log'", (e, r) => (e ? reject(e) : resolve(r.length > 0))));
    let tempLog = false;
    if (!hasLog) {
        // no analysis log in the file yet: an empty TEMP table of this connection stands in for it (nothing is written to the file)
        for (const statement of F13_EVIDENCE_01_STATEMENTS) {
            if (/CREATE TABLE/i.test(statement)) await exec(statement.replace('CREATE TABLE IF NOT EXISTS f13_analysis_log', 'CREATE TEMP TABLE f13_analysis_log'));
        }
        tempLog = true;
    }
    await exec('BEGIN'); // one snapshot for every read below
    const causeAgg = new CauseAggQueryService({ db: database });
    const journeyService = new JourneyService({ repository: new F13JourneyRepository(database) });
    const evidence = new EvidenceService({ db: database, causeAgg, journeyService });

    out(`F13-EVIDENCE-01 B1 count parity (read only) on ${path.basename(dbFile)}${readonly ? ' [opened read-only]' : ''}${tempLog ? ' [analysis log: empty TEMP table]' : ''} - ${new Date().toISOString()}`);
    const periods = [
        { name: 'Week 43 (22-28/10/2026)', from: '2026-10-22', to: '2026-10-28', full: true },
        { name: 'October 2026', from: '2026-10-01', to: '2026-10-31', full: false },
    ];
    for (const period of periods) {
        const t = Date.now();
        const base = { from: period.from, to: period.to };
        out(`=== ${period.name}`);
        const summary = (await causeAgg.summary(base, CITY)).totals;
        check(`${period.name} six BCVH rows`, await evidence.count(base, CITY), summary.volume);
        if (tempLog) {
            check(`${period.name} analysed (figure) with an empty log`, summary.analysed, 0);
            check(`${period.name} analysed=yes`, await evidence.count({ ...base, analysed: 'yes' }, CITY), 0);
            check(`${period.name} analysed=no`, await evidence.count({ ...base, analysed: 'no' }, CITY), summary.volume);
        }
        let rowsChecked = 0;
        const trace = async (label, row) => {
            const count = (extra) => evidence.count({ ...base, ...row.filter, ...extra }, CITY);
            check(`${label} rows`, await count({}), row.volume);
            check(`${label} failed`, await count({ verdict: FAILED }), row.failed);
            check(`${label} unrated`, await count({ verdict: 'CHUA_DANH_GIA' }), row.unrated);
            check(`${label} passed`, await count({ verdict: 'Đạt' }), row.passed);
            if (tempLog) check(`${label} analysed (empty log)`, row.analysed, 0);
            rowsChecked += 1;
            for (const line of row.cause_mix.lines) check(`${label} line ${line.code}`, await count({ cause: line.code }), line.count);
            check(`${label} Chờ Chuyên quản`, await count({ cause: 'CHO_CHUYEN_QUAN' }), row.cause_mix.cho_chuyen_quan.count);
            check(`${label} chưa đủ căn cứ`, await count({ cause: 'CHUA_DU_CAN_CU' }), row.cause_mix.chua_du_can_cu.count);
            for (const [reason, n] of Object.entries(row.cause_mix.cho_chuyen_quan.by_reason)) check(`${label} reason ${reason}`, await count({ cause: 'CHO_CHUYEN_QUAN', reason }), n);
            for (const [hint, n] of Object.entries(row.hints)) check(`${label} hint ${hint}`, await count({ hint }), n);
        };
        const bcvh = await causeAgg.bcvh(base, CITY);
        for (const row of bcvh.rows) {
            await trace(`${period.name} BCVH ${row.ma_bcvh}`, row);
            for (const r of (await causeAgg.routes({ ...base, bcvh: row.ma_bcvh }, CITY)).rows) await trace(`${period.name} ${row.ma_bcvh} route ${r.key}`, r);
            if (period.full) for (const r of (await causeAgg.postmen({ ...base, bcvh: row.ma_bcvh }, CITY)).rows) await trace(`${period.name} ${row.ma_bcvh} postman ${r.key}`, r);
        }
        out(`${period.name}: ${rowsChecked} figure rows (BCVH${period.full ? ', routes, postmen' : ', routes'}), each with rows / failed / unrated / passed / every cause line / Chờ CQ reasons / hints; six BCVH total ${summary.volume} rows. [${((Date.now() - t) / 1000).toFixed(0)} s]`);
    }

    // Excel: the file of a filter has exactly the rows of the list total (week 43, Thuận An, with the milestones of every day)
    const filter = { from: '2026-10-22', to: '2026-10-28', bcvh: '537015' };
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve) => stream.on('end', resolve));
    const t = Date.now();
    const result = await evidence.exportTo(stream, filter, CITY);
    await finished;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.concat(chunks));
    const sheet = workbook.worksheets[0];
    check('Excel week 43 Thuận An: rows in the file', sheet.rowCount - 1, await evidence.count(filter, CITY));
    check('Excel rows written', result.written, result.total);
    out(`Excel week 43 BCVH 537015: ${sheet.rowCount - 1} rows in the file = list total ${result.total} [${((Date.now() - t) / 1000).toFixed(0)} s]`);
    // a page of the list: milestones come from the journey code path
    const page = await evidence.list({ ...filter, from: '2026-10-28', to: '2026-10-28', page_size: 20 }, CITY);
    const withMilestones = page.items.filter((item) => item.milestones_state === 'OK').length;
    out(`List page (28/10, 537015, 20 rows): milestones OK for ${withMilestones} of ${page.items.length}; total ${page.meta.total}`);
    check('List page milestones state', withMilestones, page.items.length);

    await exec('COMMIT');
    out();
    out(`CHECKS: ${checks}, TOTAL DIFFERENCES: ${differences}`);
    const text = lines.join('\n');
    if (arg('out') && arg('out') !== true) fs.writeFileSync(path.resolve(arg('out')), `${text}\n`, 'utf8'); else console.log(text);
    console.log(`done in ${((Date.now() - started) / 1000).toFixed(0)} s; checks ${checks}; differences ${differences}`);
    process.exit(differences ? 1 : 0);
})().catch((error) => { console.error('[f13_evidence_parity] FAILED:', error); process.exit(1); });
