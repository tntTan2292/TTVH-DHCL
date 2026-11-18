'use strict';

// PROV-PKG-01 (T5): "golden" payload hashes of the Hue edition, so a refactor that reads the province code
// from configuration can be proven byte-identical. Service layer only (no HTTP, no login, no write).
//
//   NODE_ENV=test QIS_TEST_DB_PATH=<frozen copy> node scripts/prov-pkg-golden.js [--dump <dir>] [--out <file>]
//
// The frozen copy is made once with `VACUUM INTO` (backend/src/db/backups/prov-pkg-golden.sqlite, git-ignored).
// Every payload is normalised (keys sorted, generation-time fields removed) and hashed with SHA-256; the
// hashes before and after a change must be equal. Errors are part of the payload (message only) so a call that
// fails the same way before and after still compares equal.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV !== 'test' || !process.env.QIS_TEST_DB_PATH) {
    console.error('Refusing to run: set NODE_ENV=test and QIS_TEST_DB_PATH to the frozen copy of the Hue database.');
    process.exit(2);
}

const DAY = '2026-11-15';
const WEEK_FROM = '2026-11-12'; // Thursday-Wednesday week that contains DAY
const WEEK_TO = '2026-11-18';
const MONTH_FROM = '2026-11-01';
const MONTH_TO = '2026-11-30';
const RANGES = Object.freeze([['day', DAY, DAY], ['week', WEEK_FROM, WEEK_TO], ['month', MONTH_FROM, MONTH_TO]]);
const PERIODS = Object.freeze(['day', 'week', 'month']);
const BCVH = Object.freeze(['533140', '535470', '535790', '536250', '537015', '537220']);

// Fields that carry the time the payload was produced, not data.
const VOLATILE_KEYS = new Set(['generated_at', 'computed_at', 'generatedAt', 'computedAt', 'now', 'timestamp', 'served_at', 'cached_at']);

function normalise(value) {
    if (Array.isArray(value)) return value.map(normalise);
    if (value && typeof value === 'object') {
        const out = {};
        Object.keys(value).sort().forEach((key) => {
            if (!VOLATILE_KEYS.has(key)) out[key] = normalise(value[key]);
        });
        return out;
    }
    return value === undefined ? null : value;
}

async function capture(fn) {
    try {
        return { ok: await fn() };
    } catch (error) {
        return { error: String((error && error.message) || error) };
    }
}

function fakeRes() {
    const res = { statusCode: 200, body: null, headers: {} };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    res.set = (k, v) => { res.headers[k] = v; return res; };
    return res;
}

async function callController(handler, query = {}, params = {}) {
    const res = fakeRes();
    await handler({ query, params, body: {}, user: null }, res);
    return { status: res.statusCode, body: res.body };
}

function buildTasks() {
    const tasks = [];
    const add = (name, fn) => tasks.push([name, fn]);

    const { homeExecutiveService } = require('../src/services/HomeExecutiveService');
    const { f11RankingService } = require('../src/services/F11RankingService');
    const { f12RankingService } = require('../src/services/F12RankingService');
    const { f41RankingService } = require('../src/services/F41RankingService');
    const f13 = require('../src/services/F13DashboardService');
    const kpi = require('../src/controllers/kpiController');

    PERIODS.forEach((period) => {
        add(`home.executive.${period}`, () => homeExecutiveService.getExecutive({ anchorDate: DAY, period, offset: 0 }));
        ['f11', 'f12', 'f13', 'f41', 'f42'].forEach((indicator) => {
            add(`home.national.${indicator}.${period}`, () => homeExecutiveService.getNationalRanking({ indicator, period, anchorDate: DAY, offset: 0 }));
        });
    });

    RANGES.forEach(([label, from, to]) => {
        // F1.1
        add(`f11.summary.${label}`, () => f11RankingService.getSummary(from, to, {}));
        add(`f11.trend.${label}`, () => f11RankingService.getDailyTrend(from, to, {}));
        add(`f11.bcvhRanking.${label}`, () => f11RankingService.getBcvhRanking(from, to, 1, 20));
        add(`f11.national.${label}`, () => f11RankingService.getNationalRanking(from, to));
        add(`f11.nationalSummary.${label}`, () => f11RankingService.nationalRankService.getNationalRankSummary(from, to));
        add(`f11.pairTable.${label}`, () => f11RankingService.getPairTable({ period: label, anchorDate: DAY, fromDate: from, toDate: to }));
        // F1.2
        add(`f12.summary.${label}`, () => f12RankingService.getSummary(from, to, {}));
        add(`f12.trend.${label}`, () => f12RankingService.getDailyTrend(from, to, {}));
        add(`f12.bcvhRanking.${label}`, () => f12RankingService.getBcvhRanking(from, to, 1, 20));
        add(`f12.national.${label}`, () => f12RankingService.getNationalRanking(from, to));
        add(`f12.officeRanking.${label}`, () => f12RankingService.getOfficeRanking(from, to, 1, 100));
        add(`f12.officeTable.${label}`, () => f12RankingService.getOfficeTable({ period: label, anchorDate: DAY, fromDate: from, toDate: to }));
        // F1.3
        add(`f13.kpi.${label}`, () => f13.getDashboardKpi(from, to, {}));
        add(`f13.trend.${label}`, () => f13.getDailyTrend(from, to, {}));
        add(`f13.bcvhRanking.${label}`, () => f13.getBcvhRanking(from, to, 1, 20, 'ty_le_dat', 'desc'));
        add(`f13.nationalSummary.${label}`, () => f13.getNationalRankSummary(from, to));
        add(`f13.ctrl.kpi.${label}`, () => callController(kpi.getDashboardKpi, { fromDate: from, toDate: to, ma_bcvh: 'all' }));
        add(`f13.ctrl.kpi.bcvh.${label}`, () => callController(kpi.getDashboardKpi, { fromDate: from, toDate: to, ma_bcvh: '535470' }));
        add(`f13.ctrl.ranking.${label}`, () => callController(kpi.getBcvhRanking, { fromDate: from, toDate: to }));
        // F4.1
        add(`f41.summary.${label}`, () => f41RankingService.getSummary(from, to, {}));
        add(`f41.trend.${label}`, () => f41RankingService.getDailyTrend(from, to, {}));
        add(`f41.bcvhRanking.${label}`, () => f41RankingService.getBcvhRanking(from, to, 1, 20));
        add(`f41.nationalSummary.${label}`, () => f41RankingService.nationalRankService.getNationalRankSummary(from, to));
    });

    // F1.3 route level (the 53% prefix queries) and the day-level helpers
    ['all', ...BCVH].forEach((bcvh) => {
        ['postman', 'all'].forEach((routeType) => {
            add(`f13.routeRanking.${bcvh}.${routeType}`, () => f13.getRouteRanking(DAY, bcvh, 1, 50, 'total_bg', 'desc', { routeType }));
        });
        add(`f13.pareto.${bcvh}`, () => f13.getParetoAnalysis(DAY, bcvh));
    });
    add('f13.nationalRanksForDates', () => f13.getNationalRanksForDates([DAY, '2026-11-14', '2026-11-13']));
    add('f11.nationalRanksForDates', () => f11RankingService.nationalRankService.getNationalRanksForDates([DAY, '2026-11-14']));
    add('f41.nationalRanksForDates', () => f41RankingService.nationalRankService.getNationalRanksForDates([DAY, '2026-11-14']));

    // Weekly / monthly comparison (periodResolve -> bcvhWeeklyComparisonService)
    [['f11', f11RankingService], ['f12', f12RankingService], ['f41', f41RankingService]].forEach(([id, svc]) => {
        add(`${id}.overview`, () => svc.getOverview(DAY));
        add(`${id}.weeks`, () => svc.listWeeks());
        add(`${id}.months`, () => svc.listMonths());
        add(`${id}.rolling`, () => svc.compareRollingWindow(DAY, {}));
    });

    add('meta.f11', () => f11RankingService.getDashboardMeta());
    add('meta.f12', () => f12RankingService.getDashboardMeta());
    add('meta.f13.ctrl', () => callController(kpi.getDashboardMeta));
    add('f13.ctrl.bcvhList', () => callController(kpi.getBcvhList));
    return tasks;
}

(async () => {
    const dumpIdx = process.argv.indexOf('--dump');
    const outIdx = process.argv.indexOf('--out');
    const dumpDir = dumpIdx > 0 ? path.resolve(process.argv[dumpIdx + 1]) : null;
    const outFile = outIdx > 0 ? path.resolve(process.argv[outIdx + 1]) : null;
    if (dumpDir) fs.mkdirSync(dumpDir, { recursive: true });

    const hashes = {};
    for (const [name, fn] of buildTasks()) {
        const payload = normalise(await capture(fn));
        const text = JSON.stringify(payload);
        hashes[name] = crypto.createHash('sha256').update(text).digest('hex');
        if (dumpDir) fs.writeFileSync(path.join(dumpDir, `${name}.json`), text);
    }
    const body = JSON.stringify(hashes, null, 2);
    if (outFile) fs.writeFileSync(outFile, body);
    const errors = Object.keys(hashes).length;
    console.log(`golden: ${errors} payloads hashed (day ${DAY}, week ${WEEK_FROM}..${WEEK_TO}, month ${MONTH_FROM}..${MONTH_TO})`);
    if (!outFile) console.log(body);
    process.exit(0);
})().catch((error) => {
    console.error('golden failed:', error);
    process.exit(1);
});
