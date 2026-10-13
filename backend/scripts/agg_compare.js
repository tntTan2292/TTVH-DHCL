#!/usr/bin/env node
/**
 * agg_compare.js - PERF-LOAD-01 Phase 2 "V1": runs EVERY aggregate read method of an indicator's
 * repository twice - once from the detail table (mode off) and once from the pre-aggregated table
 * (mode on) - and requires byte-identical results, over many anchors, ranges and unit sets.
 * Prints fact vs agg time per method.
 *
 *   node scripts/agg_compare.js --indicator F4.1 [--heavy 4] [--db-readonly]
 *
 * Uses the operational database read-only (it only runs SELECTs). The same `compareIndicator`
 * function is used by test_aggReadF41.js against a synthetic sandbox database.
 */
'use strict';

const policy = require('../src/services/aggReadPolicy');

const ENV = {
    'F1.3': 'QIS_AGG_READ_F13',
    'F4.1': 'QIS_AGG_READ_F41',
    'F1.1': 'QIS_AGG_READ_F11',
    'F1.2': 'QIS_AGG_READ_F12',
};

function pick(list, count) {
    if (list.length <= count) return list.slice();
    const out = new Set();
    for (let i = 0; i < count; i += 1) out.add(list[Math.round((i * (list.length - 1)) / (count - 1))]);
    return [...out];
}

function addDays(iso, days) {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function weekStart(iso) { // Thursday on/before
    const d = new Date(`${iso}T00:00:00Z`);
    const back = (d.getUTCDay() - 4 + 7) % 7;
    return addDays(iso, -back);
}

/**
 * @param {object} repo  repository instance exposing the aggregate read methods
 * @param {string} indicator
 * @param {object} data  { dates: string[] sorted, codes: string[], unitFor: string }
 * @param {object} [opts] { heavy: number of anchors for overview methods, light: number for the rest }
 */
async function compareIndicator(repo, indicator, data, opts = {}) {
    const envKey = ENV[indicator];
    const heavyAnchors = pick(data.dates, opts.heavy ?? 6);
    const lightAnchors = pick(data.dates, opts.light ?? 12);
    const min = data.dates[0];
    const max = data.dates[data.dates.length - 1];
    const codeSets = [data.codes, data.codes.slice(0, 3), [data.codes[0]], [...data.codes.slice(0, 2), 'NOT_A_UNIT'], []];

    const cases = [];
    const add = (name, fn) => cases.push({ name, fn });

    for (const codes of codeSets) {
        const tag = `codes=${codes.length}`;
        for (const anchor of heavyAnchors) {
            add(`getBcvhOverviewMonthly ${anchor} ${tag}`, () => repo.getBcvhOverviewMonthly(anchor, codes));
            add(`getBcvhOverviewDaily ${anchor} ${tag}`, () => repo.getBcvhOverviewDaily(anchor, codes));
            add(`getBcvhOverviewMtd ${anchor} ${tag}`, () => repo.getBcvhOverviewMtd(anchor, codes));
        }
        add(`getBcvhWeeksList ${tag}`, () => repo.getBcvhWeeksList(codes));
        add(`getBcvhMonthsList ${tag}`, () => repo.getBcvhMonthsList(codes));
        add(`getBcvhWeeklyTrendAggregate full ${tag}`, () => repo.getBcvhWeeklyTrendAggregate(min, max, codes));
        for (const anchor of lightAnchors) {
            const from = addDays(anchor, -20);
            const to = addDays(anchor, 8);
            add(`getBcvhWeeklyTrendAggregate ${from}..${to} ${tag}`, () => repo.getBcvhWeeklyTrendAggregate(from, to, codes));
            add(`getBcvhOperationMetricsBetween ${from}..${anchor} ${tag}`, () => repo.getBcvhOperationMetricsBetween(from, anchor, codes));
            const a = { from: weekStart(addDays(anchor, -7)), to: addDays(weekStart(addDays(anchor, -7)), 6) };
            const b = { from: weekStart(anchor), to: addDays(weekStart(anchor), 6) };
            add(`getBcvhWeeklyComparisonAggregate ${a.from} vs ${b.from} ${tag}`, () => repo.getBcvhWeeklyComparisonAggregate(a, b, codes));
        }
    }
    add('getBcvhOverviewMonthly beyond max', () => repo.getBcvhOverviewMonthly(addDays(max, 40), data.codes));
    add('getBcvhOverviewMonthly before min', () => repo.getBcvhOverviewMonthly(addDays(min, -40), data.codes));
    add('getBcvhOperationMetricsBetween empty window', () => repo.getBcvhOperationMetricsBetween('1999-01-01', '1999-01-31', data.codes));

    for (const anchor of lightAnchors) {
        const from = addDays(anchor, -14);
        add(`getDailyTrendData ${from}..${anchor}`, () => repo.getDailyTrendData(from, anchor, {}));
        add(`getDailyTrendData unit ${from}..${anchor}`, () => repo.getDailyTrendData(from, anchor, { bcvhId: data.unitFor }));
        add(`getKpiMetrics ${from}..${anchor}`, () => repo.getKpiMetrics(from, anchor, {}));
        add(`getKpiMetrics unit ${from}..${anchor}`, () => repo.getKpiMetrics(from, anchor, { bcvhId: data.unitFor }));
    }
    add('getKpiMetrics full range', () => repo.getKpiMetrics(min, max, {}));
    add('getKpiMetrics empty window', () => repo.getKpiMetrics('1999-01-01', '1999-01-31', {}));
    add('getDailyTrendData empty window', () => repo.getDailyTrendData('1999-01-01', '1999-01-05', {}));
    add('getMeta', () => repo.getMeta());
    add('hasNonCanonicalBcvhRows all', () => repo.hasNonCanonicalBcvhRows(data.codes));
    add('hasNonCanonicalBcvhRows subset', () => repo.hasNonCanonicalBcvhRows(data.codes.slice(0, 2)));

    const previous = process.env[envKey];
    const report = { compared: 0, mismatches: [], factMs: 0, aggMs: 0, byMethod: new Map() };
    try {
        for (const testCase of cases) {
            process.env[envKey] = 'off';
            let t = Date.now();
            const factResult = await testCase.fn();
            const factMs = Date.now() - t;

            process.env[envKey] = 'on';
            t = Date.now();
            const aggResult = await testCase.fn();
            const aggMs = Date.now() - t;

            report.compared += 1;
            report.factMs += factMs;
            report.aggMs += aggMs;
            const method = testCase.name.split(' ')[0];
            const m = report.byMethod.get(method) || { n: 0, factMs: 0, aggMs: 0 };
            m.n += 1; m.factMs += factMs; m.aggMs += aggMs;
            report.byMethod.set(method, m);

            if (JSON.stringify(factResult) !== JSON.stringify(aggResult)) {
                report.mismatches.push({
                    name: testCase.name,
                    fact: JSON.stringify(factResult).slice(0, 400),
                    agg: JSON.stringify(aggResult).slice(0, 400),
                });
            }
        }
    } finally {
        if (previous === undefined) delete process.env[envKey]; else process.env[envKey] = previous;
    }
    return report;
}

async function main() {
    process.env.QIS_SQLITE_WAL = 'off';
    const argv = process.argv.slice(2);
    const arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
    const indicator = arg('indicator', 'F4.1');
    const heavy = Number(arg('heavy', 4));
    if (indicator !== 'F4.1') {
        console.error(`P2.1 only wires F4.1 so far (asked: ${indicator}).`);
        process.exit(2);
    }
    const { all } = require('../src/config/db');
    const { factF41Repository } = require('../src/repositories/FactF41Repository');
    const dates = (await all('SELECT DISTINCT ngay_do_kiem AS d FROM fact_f41 ORDER BY d')).map((r) => r.d);
    const codes = (await all(
        `SELECT ma_bc_phat AS c, COUNT(*) AS n FROM fact_f41 WHERE ma_bc_phat IS NOT NULL AND TRIM(ma_bc_phat) <> '' GROUP BY ma_bc_phat ORDER BY n DESC LIMIT 7`
    )).map((r) => r.c);
    await policy.aggUsable('F4.1', require('../src/config/db').db, { force: true });
    console.log(`Comparing ${indicator}: ${dates.length} days ${dates[0]}..${dates[dates.length - 1]}, ${codes.length} units, heavy anchors ${heavy}`);
    const report = await compareIndicator(factF41Repository, indicator, { dates, codes, unitFor: codes[0] }, { heavy, light: 10 });
    console.log(`\nCompared ${report.compared} calls: ${report.mismatches.length} mismatch(es)`);
    console.log(`Total time  detail ${(report.factMs / 1000).toFixed(1)} s   aggregate ${(report.aggMs / 1000).toFixed(1)} s\n`);
    console.log('method'.padEnd(36), 'calls', 'detail avg ms', 'agg avg ms');
    for (const [method, m] of report.byMethod) {
        console.log(method.padEnd(36), String(m.n).padStart(5), String(Math.round(m.factMs / m.n)).padStart(13), String(Math.round(m.aggMs / m.n)).padStart(10));
    }
    for (const mismatch of report.mismatches.slice(0, 10)) {
        console.log(`\nMISMATCH ${mismatch.name}\n  detail: ${mismatch.fact}\n  agg:    ${mismatch.agg}`);
    }
    process.exit(report.mismatches.length === 0 ? 0 : 1);
}

if (require.main === module) {
    main().catch((error) => { console.error('[agg_compare] FAILED:', error); process.exit(1); });
}

module.exports = { compareIndicator, addDays, weekStart, pick };
