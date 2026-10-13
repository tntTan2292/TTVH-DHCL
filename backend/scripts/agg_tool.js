#!/usr/bin/env node
/**
 * agg_tool.js - PERF-LOAD-01 Phase 2: build / verify / rebuild the pre-aggregated day tables.
 * Design: docs/04_TECHNICAL_PLANNING/Feature/PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md section 6.
 *
 *   node scripts/agg_tool.js status  [--db path]
 *   node scripts/agg_tool.js build   [--indicator F4.1] [--from 2026-01-01] [--to 2026-10-12] [--missing-only] [--db path]
 *   node scripts/agg_tool.js verify  [--indicator F4.1] [--db path]
 *   node scripts/agg_tool.js rebuild [--indicator F4.1] [--db path]     (full build; never empties the table first)
 *
 * build works day by day, one short transaction per day (WAL keeps readers running) and is safe to
 * repeat or to run beside an import: every day is rebuilt from the detail rows, never added up.
 * verify compares, for every day and key, the agg counters with a fresh GROUP BY of the detail table
 * (the very SELECT that builds them) and exits 1 on any difference.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3');
const {
    AGG_DEFINITIONS,
    aggColumnList,
    buildAggSelectSql,
    rebuildAggForDate,
} = require('../src/services/aggMaintenance');
const { applyPerfLoad01AggSchema } = require('../migrate_perf_load_01_agg_schema');

function parseArgs(argv) {
    const args = { command: argv[0], flags: new Set(), values: {} };
    for (let i = 1; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) { args.values[key] = next; i += 1; } else { args.flags.add(key); }
    }
    return args;
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve(db)));
    });
}

function makeHelpers(db) {
    const run = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) { return err ? reject(err) : resolve(this); });
    });
    const get = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
    const all = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
    return { run, get, all };
}

function selectIndicators(values) {
    if (!values.indicator) return Object.keys(AGG_DEFINITIONS);
    if (!AGG_DEFINITIONS[values.indicator]) {
        throw new Error(`Unknown indicator ${values.indicator}; use one of ${Object.keys(AGG_DEFINITIONS).join(', ')}`);
    }
    return [values.indicator];
}

async function setState(helpers, indicator, patch) {
    await helpers.run(`INSERT OR IGNORE INTO agg_state (indicator) VALUES (?)`, [indicator]);
    const sets = Object.keys(patch).map((k) => `${k} = ?`).join(', ');
    await helpers.run(`UPDATE agg_state SET ${sets} WHERE indicator = ?`, [...Object.values(patch), indicator]);
}

async function buildIndicator(helpers, indicator, { from, to, missingOnly }) {
    const def = AGG_DEFINITIONS[indicator];
    const where = ['ngay_do_kiem IS NOT NULL'];
    const params = [];
    if (from) { where.push('ngay_do_kiem >= ?'); params.push(from); }
    if (to) { where.push('ngay_do_kiem <= ?'); params.push(to); }
    let dates = (await helpers.all(
        `SELECT DISTINCT ngay_do_kiem FROM ${def.factTable} WHERE ${where.join(' AND ')} ORDER BY ngay_do_kiem`,
        params
    )).map((r) => r.ngay_do_kiem);

    if (missingOnly) {
        const have = new Set((await helpers.all(`SELECT DISTINCT ngay_do_kiem FROM ${def.aggTable}`)).map((r) => r.ngay_do_kiem));
        dates = dates.filter((d) => !have.has(d));
    }

    const started = Date.now();
    let built = 0;
    let rows = 0;
    for (const date of dates) {
        await helpers.run('BEGIN IMMEDIATE');
        try {
            const result = await rebuildAggForDate(helpers.run, helpers.get, indicator, date);
            await helpers.run('COMMIT');
            built += 1;
            rows += result.rows || 0;
        } catch (error) {
            try { await helpers.run('ROLLBACK'); } catch { /* keep the original error */ }
            throw new Error(`${indicator} ${date}: ${error.message}`);
        }
        if (built % 50 === 0) console.log(`  ${indicator}: ${built}/${dates.length} days...`);
    }

    // A day that no longer exists in the detail table must not linger in the aggregate or its signature.
    const orphan = await helpers.run(
        `DELETE FROM ${def.aggTable} WHERE ngay_do_kiem NOT IN (SELECT DISTINCT ngay_do_kiem FROM ${def.factTable})`
    );
    await helpers.run(
        `DELETE FROM agg_day_sig WHERE indicator = ? AND ngay_do_kiem NOT IN (SELECT DISTINCT ngay_do_kiem FROM ${def.factTable})`,
        [indicator]
    );
    const complete = !from && !to && !missingOnly;
    if (complete) await setState(helpers, indicator, { last_full_build_at: new Date().toISOString() });
    console.log(`[build] ${indicator}: ${built} day(s), ${rows} agg row(s), ${orphan.changes || 0} orphan row(s) removed, ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

async function verifyIndicator(helpers, indicator) {
    const def = AGG_DEFINITIONS[indicator];
    const columns = aggColumnList(indicator).join(', ');
    const factSql = `SELECT ${columns} FROM (${buildAggSelectSql(indicator, '1 = 1')})`;
    const aggSql = `SELECT ${columns} FROM ${def.aggTable}`;

    const missingInAgg = await helpers.all(`SELECT DISTINCT ngay_do_kiem FROM (${factSql} EXCEPT ${aggSql}) ORDER BY 1 LIMIT 50`);
    const extraInAgg = await helpers.all(`SELECT DISTINCT ngay_do_kiem FROM (${aggSql} EXCEPT ${factSql}) ORDER BY 1 LIMIT 50`);
    const totals = await helpers.get(
        `SELECT (SELECT COUNT(*) FROM ${def.factTable}) AS fact_rows,
                (SELECT COALESCE(SUM(n_rows), 0) FROM ${def.aggTable}) AS agg_rows,
                (SELECT COUNT(DISTINCT ngay_do_kiem) FROM ${def.factTable}) AS fact_days,
                (SELECT COUNT(DISTINCT ngay_do_kiem) FROM ${def.aggTable}) AS agg_days,
                (SELECT COUNT(*) FROM ${def.aggTable}) AS agg_keys`
    );
    // Day signatures (the fuse of the read side): detail (rows, MAX(id)) per day must equal what was stored.
    const sigDiff = await helpers.all(
        `SELECT d FROM (
            SELECT ngay_do_kiem AS d, COUNT(*) AS c, MAX(id) AS m FROM ${def.factTable} GROUP BY ngay_do_kiem
            EXCEPT
            SELECT ngay_do_kiem, fact_rows, fact_max_id FROM agg_day_sig WHERE indicator = ?
         ) UNION SELECT d FROM (
            SELECT ngay_do_kiem AS d, fact_rows AS c, fact_max_id AS m FROM agg_day_sig WHERE indicator = ?
            EXCEPT
            SELECT ngay_do_kiem, COUNT(*), MAX(id) FROM ${def.factTable} GROUP BY ngay_do_kiem
         ) ORDER BY 1 LIMIT 50`,
        [indicator, indicator]
    );
    const ok = missingInAgg.length === 0 && extraInAgg.length === 0 && sigDiff.length === 0
        && totals.fact_rows === totals.agg_rows && totals.fact_days === totals.agg_days;
    await setState(helpers, indicator, { last_verified_at: new Date().toISOString(), last_verify_ok: ok ? 1 : 0 });

    console.log(`[verify] ${indicator}: ${ok ? 'OK' : 'MISMATCH'} | detail rows ${totals.fact_rows} = agg SUM(n_rows) ${totals.agg_rows}`
        + ` | days ${totals.fact_days}/${totals.agg_days} | agg keys ${totals.agg_keys}`);
    if (!ok) {
        if (missingInAgg.length) console.log(`  days whose detail group is missing or different in agg: ${missingInAgg.map((r) => r.ngay_do_kiem).join(', ')}`);
        if (extraInAgg.length) console.log(`  days whose agg group has no equal detail group: ${extraInAgg.map((r) => r.ngay_do_kiem).join(', ')}`);
        if (sigDiff.length) console.log(`  days whose detail signature (rows, MAX(id)) differs from the stored one: ${sigDiff.map((r) => r.d).join(', ')}`);
    }
    return ok;
}

async function status(helpers) {
    for (const indicator of Object.keys(AGG_DEFINITIONS)) {
        const def = AGG_DEFINITIONS[indicator];
        let line;
        try {
            const a = await helpers.get(`SELECT COUNT(*) AS keys, COALESCE(SUM(n_rows), 0) AS rows, MIN(ngay_do_kiem) AS d0, MAX(ngay_do_kiem) AS d1 FROM ${def.aggTable}`);
            const s = await helpers.get(`SELECT * FROM agg_state WHERE indicator = ?`, [indicator]);
            line = `${a.keys} keys, ${a.rows} source rows, ${a.d0 || '-'}..${a.d1 || '-'}, built ${s?.last_full_build_at || 'never'}, verified ${s?.last_verified_at || 'never'} (${s?.last_verify_ok === 1 ? 'ok' : s?.last_verify_ok === 0 ? 'MISMATCH' : 'n/a'})`;
        } catch (error) {
            line = `not provisioned (${error.message})`;
        }
        console.log(`[status] ${indicator} ${def.aggTable}: ${line}`);
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!['status', 'build', 'verify', 'rebuild'].includes(args.command)) {
        console.error('Usage: node scripts/agg_tool.js <status|build|verify|rebuild> [--indicator F4.1] [--from D] [--to D] [--missing-only] [--db path]');
        process.exit(2);
    }
    const dbPath = args.values.db ? path.resolve(args.values.db) : path.resolve(__dirname, '../src/db/database.sqlite');
    console.log(`DB: ${dbPath}`);

    if (args.command !== 'status') await applyPerfLoad01AggSchema(dbPath);
    const db = await openDb(dbPath);
    const helpers = makeHelpers(db);
    await helpers.run('PRAGMA busy_timeout = 60000');
    await helpers.run('PRAGMA cache_size = -262144');

    let exitCode = 0;
    try {
        const indicators = selectIndicators(args.values);
        if (args.command === 'status') {
            await status(helpers);
        } else if (args.command === 'verify') {
            for (const indicator of indicators) {
                if (!(await verifyIndicator(helpers, indicator))) exitCode = 1;
            }
        } else {
            for (const indicator of indicators) {
                // `rebuild` = a full build. It must NOT empty the table first: a running backend with the
                // aggregate switched on would answer from an empty table until every day is rebuilt.
                await buildIndicator(helpers, indicator, {
                    from: args.values.from,
                    to: args.values.to,
                    missingOnly: args.flags.has('missing-only'),
                });
            }
        }
    } finally {
        await new Promise((resolve) => db.close(resolve));
    }
    process.exit(exitCode);
}

if (require.main === module) {
    main().catch((error) => { console.error('[agg_tool] FAILED:', error.message); process.exit(1); });
}

module.exports = { buildIndicator, verifyIndicator, makeHelpers };
