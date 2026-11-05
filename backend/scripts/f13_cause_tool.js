#!/usr/bin/env node
/**
 * f13_cause_tool.js - F13-WHY-AGG-01 Phase 1: build / rebuild / verify the derived per-parcel cause table.
 * Design: docs/04_TECHNICAL_PLANNING/Feature/F13-WHY-AGG-01_DESIGN_OF_RECORD.md sections 5 and 8.
 *
 *   node scripts/f13_cause_tool.js build   --from 2026-10-22 --to 2026-10-28 [--db path]   missing, stale or changed days only
 *   node scripts/f13_cause_tool.js rebuild --from 2026-10-22 --to 2026-10-28 [--db path]   every day of the range
 *   node scripts/f13_cause_tool.js verify  --from 2026-10-22 --to 2026-10-28 [--db path]   compare with fact_f13 and agg_f13_day
 *
 * build/rebuild work day by day, one transaction per day. verify only reads and never "corrects" anything: for each day and each of the
 * six canonical BCVH it compares rows, Đạt, Không đạt and blank of the table with fact_f13 and agg_f13_day (rows of other units are reported
 * separately, never as a difference). Exit code 1 when a difference is found, 2 on a usage error.
 */
'use strict';

const path = require('path');

function parseArgs(argv) {
    const args = { command: argv[0], values: {} };
    for (let i = 1; i < argv.length; i += 1) {
        if (!argv[i].startsWith('--')) continue;
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) { args.values[argv[i].slice(2)] = next; i += 1; } else args.values[argv[i].slice(2)] = true;
    }
    return args;
}

function isDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

const BLANK = `(danh_gia_COL IS NULL OR TRIM(danh_gia_COL) = '')`;

function counterSql(column) {
    return `COUNT(*) AS n_rows,
        SUM(CASE WHEN ${column} = 'Đạt' THEN 1 ELSE 0 END) AS n_dat,
        SUM(CASE WHEN ${column} = 'Không đạt' THEN 1 ELSE 0 END) AS n_khong_dat,
        SUM(CASE WHEN ${BLANK.replace(/danh_gia_COL/g, column)} THEN 1 ELSE 0 END) AS n_blank`;
}

const keyOf = (row) => `${row.ngay_do_kiem}|${row.ma_bcvh}`;
const triple = (row) => (row ? `${row.n_rows} / ${row.n_dat} / ${row.n_khong_dat} / ${row.n_blank}` : 'none');
const same = (a, b) => a && b && a.n_rows === b.n_rows && a.n_dat === b.n_dat && a.n_khong_dat === b.n_khong_dat && a.n_blank === b.n_blank;

/**
 * Per day and canonical BCVH: table against fact_f13 and agg_f13_day. Read only.
 * @param helpers {all, get} promise helpers over the database
 * @returns {Promise<{ok, differences: string[], days: number, keys: number, totals, otherUnits, notFresh: string[], aggChecked}>}
 */
async function verifyRange(helpers, { from, to, canonicalCodes }) {
    const placeholders = canonicalCodes.map(() => '?').join(',');
    const load = async (sql, params) => new Map((await helpers.all(sql, params)).map((row) => [keyOf(row), row]));

    const table = await load(
        `SELECT ngay_do_kiem, ma_bcvh, ${counterSql('danh_gia')} FROM f13_cause_parcel
         WHERE ngay_do_kiem BETWEEN ? AND ? GROUP BY ngay_do_kiem, ma_bcvh`, [from, to]);
    const fact = await load(
        `SELECT ngay_do_kiem, ma_bcvh, ${counterSql('danh_gia_2026')} FROM fact_f13
         WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bcvh IN (${placeholders}) GROUP BY ngay_do_kiem, ma_bcvh`, [from, to, ...canonicalCodes]);

    const aggExists = Boolean(await helpers.get(`SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = 'agg_f13_day'`));
    const agg = aggExists
        ? await load(
            `SELECT ngay_do_kiem, ma_bcvh, SUM(n_rows) AS n_rows, SUM(n_dat) AS n_dat, SUM(n_khong_dat) AS n_khong_dat, SUM(n_blank) AS n_blank
             FROM agg_f13_day WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bcvh IN (${placeholders}) GROUP BY ngay_do_kiem, ma_bcvh`, [from, to, ...canonicalCodes])
        : null;

    const keys = [...new Set([...table.keys(), ...fact.keys(), ...(agg ? agg.keys() : [])])].sort();
    const differences = [];
    for (const key of keys) {
        const t = table.get(key);
        const f = fact.get(key);
        if (!same(t, f)) differences.push(`${key}: table ${triple(t)} != fact_f13 ${triple(f)} (rows / Đạt / Không đạt / blank)`);
        if (agg && !same(t, agg.get(key))) differences.push(`${key}: table ${triple(t)} != agg_f13_day ${triple(agg.get(key))}`);
    }

    const sum = (map, field) => [...map.values()].reduce((total, row) => total + row[field], 0);
    const totals = { table: {}, fact: {}, agg: agg ? {} : null };
    for (const field of ['n_rows', 'n_dat', 'n_khong_dat', 'n_blank']) {
        totals.table[field] = sum(table, field);
        totals.fact[field] = sum(fact, field);
        if (agg) totals.agg[field] = sum(agg, field);
    }

    // Units outside the six canonical BCVH are not in the table by design (JourneyService keeps the six): information, never a difference.
    const other = await helpers.get(
        `SELECT COUNT(*) AS n_rows, COUNT(DISTINCT ngay_do_kiem) AS days FROM fact_f13
         WHERE ngay_do_kiem BETWEEN ? AND ? AND (ma_bcvh IS NULL OR ma_bcvh NOT IN (${placeholders}))`, [from, to, ...canonicalCodes]);
    const notFresh = (await helpers.all(
        `SELECT ngay_do_kiem FROM f13_cause_day WHERE ngay_do_kiem BETWEEN ? AND ? AND state <> 'FRESH' ORDER BY 1`, [from, to])).map((row) => row.ngay_do_kiem);

    return {
        ok: differences.length === 0,
        differences,
        days: new Set(keys.map((key) => key.split('|')[0])).size,
        keys: keys.length,
        totals,
        otherUnits: { rows: other.n_rows, days: other.days },
        notFresh,
        aggChecked: aggExists,
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const { command, values } = args;
    if (!['build', 'rebuild', 'verify'].includes(command) || !isDate(values.from) || !isDate(values.to) || values.from > values.to) {
        console.error('Usage: node scripts/f13_cause_tool.js <build|rebuild|verify> --from YYYY-MM-DD --to YYYY-MM-DD [--db path]');
        process.exit(2);
    }
    const defaultPath = path.resolve(__dirname, '../src/db/database.sqlite');
    const dbPath = values.db && values.db !== true ? path.resolve(values.db) : defaultPath;
    if (dbPath !== defaultPath) {
        // Read the same file through the shared repository connection too: db.js picks its file from these variables.
        process.env.NODE_ENV = 'test';
        process.env.QIS_TEST_DB_PATH = dbPath;
    }
    console.log(`DB: ${dbPath}`);

    const sqlite3 = require('sqlite3');
    const { applyF13WhyAgg01Schema } = require('../migrate_f13_why_agg_01_schema');
    const { JourneyService } = require('../src/services/f13v2/JourneyService');
    const { F13JourneyRepository } = require('../src/repositories/F13JourneyRepository');
    const { CauseAggBuilder } = require('../src/services/f13v2/CauseAggBuilder');
    const { CANONICAL_BCVH_UNITS } = require('../src/config/canonicalBcvhUnits');

    const open = () => new Promise((resolve, reject) => {
        const database = new sqlite3.Database(dbPath, (error) => (error ? reject(error) : resolve(database)));
    });
    const exec = (database, sql) => new Promise((resolve, reject) => database.exec(sql, (error) => (error ? reject(error) : resolve())));

    let exitCode = 0;
    if (command === 'verify') {
        const database = await open();
        await exec(database, 'PRAGMA busy_timeout = 60000');
        const helpers = {
            all: (sql, params = []) => new Promise((resolve, reject) => database.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows)))),
            get: (sql, params = []) => new Promise((resolve, reject) => database.get(sql, params, (e, row) => (e ? reject(e) : resolve(row)))),
        };
        try {
            const result = await verifyRange(helpers, { from: values.from, to: values.to, canonicalCodes: CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh) });
            const t = result.totals;
            console.log(`[verify] ${values.from}..${values.to}: ${result.ok ? 'OK' : 'MISMATCH'} | ${result.days} day(s), ${result.keys} day x BCVH key(s)`);
            console.log(`  table      rows ${t.table.n_rows}, Đạt ${t.table.n_dat}, Không đạt ${t.table.n_khong_dat}, blank ${t.table.n_blank}`);
            console.log(`  fact_f13   rows ${t.fact.n_rows}, Đạt ${t.fact.n_dat}, Không đạt ${t.fact.n_khong_dat}, blank ${t.fact.n_blank}`);
            if (t.agg) console.log(`  agg_f13_day rows ${t.agg.n_rows}, Đạt ${t.agg.n_dat}, Không đạt ${t.agg.n_khong_dat}, blank ${t.agg.n_blank}`);
            else console.log('  agg_f13_day: table not present, not compared');
            console.log(`  other units (not in the table by design, not a difference): ${result.otherUnits.rows} fact_f13 row(s) on ${result.otherUnits.days} day(s)`);
            if (result.notFresh.length) console.log(`  days not FRESH: ${result.notFresh.join(', ')}`);
            result.differences.slice(0, 50).forEach((line) => console.log(`  DIFF ${line}`));
            if (result.differences.length > 50) console.log(`  ... ${result.differences.length - 50} more`);
            if (!result.ok) exitCode = 1;
        } finally {
            await new Promise((resolve) => database.close(resolve));
        }
    } else {
        await applyF13WhyAgg01Schema(dbPath);
        const writer = await open();
        const reader = await open();
        await exec(writer, 'PRAGMA busy_timeout = 60000; PRAGMA cache_size = -262144');
        await exec(reader, 'PRAGMA busy_timeout = 60000; PRAGMA cache_size = -262144');
        try {
            const builder = new CauseAggBuilder({ db: writer, journeyService: new JourneyService({ repository: new F13JourneyRepository(reader) }) });
            const started = Date.now();
            const outcome = await builder.run({ from: values.from, to: values.to, mode: command, trigger: `tool:${command}` });
            for (const result of outcome.results) {
                console.log(result.error ? `  ${result.date}: FAILED ${result.error}` : `  ${result.date}: ${result.rows} row(s), ${result.ms} ms`);
            }
            console.log(`[${command}] ${outcome.status}: ${outcome.daysDone} day(s) built, ${outcome.daysFailed} failed, ${((Date.now() - started) / 1000).toFixed(1)} s (run ${outcome.runId}, classifier ${builder.classifierVersion.slice(0, 12)})`);
            if (outcome.daysFailed) exitCode = 1;
        } finally {
            await new Promise((resolve) => writer.close(resolve));
            await new Promise((resolve) => reader.close(resolve));
        }
    }
    process.exit(exitCode);
}

if (require.main === module) {
    main().catch((error) => { console.error('[f13_cause_tool] FAILED:', error.message); process.exit(1); });
}

module.exports = { verifyRange, parseArgs };
