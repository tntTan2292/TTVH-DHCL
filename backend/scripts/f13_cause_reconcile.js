/**
 * F13-WHY-AGG-01 P4 - reconciliation report of the cause layer against the official F1.3 readers. READ ONLY.
 *
 *   node scripts/f13_cause_reconcile.js --db <copy.sqlite> [--out <file.txt>] [--bg-csv <file.csv>]
 *
 * Periods: week 43 (22-28/10/2026), October 2026, April 2026, week 09-15/04/2026. For each, per canonical BCVH: the layer (`CauseAggQueryService`)
 * against raw `fact_f13`, `agg_f13_day` and `getBcvhRanking`; per route against `getRouteRanking` (confirmed non-postman list) and raw SQL for
 * the buckets; postmen and routes add up to the BCVH; cause lines add up to the failed parcels (rules v5); and every figure is traced to its
 * BG list (the `parcels` endpoint returns exactly the figure it was opened from). Always pinned to a database copy (NODE_ENV=test).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function arg(name) {
    const index = process.argv.indexOf(`--${name}`);
    return index !== -1 ? process.argv[index + 1] : null;
}

const dbPath = arg('db') ? path.resolve(arg('db')) : null;
if (!dbPath) { console.error('Usage: node scripts/f13_cause_reconcile.js --db <copy.sqlite> [--out file] [--bg-csv file]'); process.exit(2); }
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbPath;

const { db } = require('../src/config/db');
const { CauseAggQueryService } = require('../src/services/f13v2/CauseAggQueryService');
const factBuuGuiRepo = require('../src/repositories/FactBuuGuiRepository');
const { CANONICAL_BCVH_UNITS } = require('../src/config/canonicalBcvhUnits');
const { CONFIRMED_NON_POSTMAN_ROUTES } = require('../src/config/f13RouteClassificationCatalog');
const { shiftIsoDate } = require('../src/services/f13v2/JourneyService');

const CITY = { bcvhId: null, allowedCodes: null, canSeeCity: true };
const CODES = CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh);
const NON_POSTMAN = CONFIRMED_NON_POSTMAN_ROUTES.map((route) => route.ma_tuyen);
const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows))));
const service = new CauseAggQueryService({ db });

const PERIODS = [
    { name: 'Week 43 (22-28/10/2026)', from: '2026-10-22', to: '2026-10-28', deep: true },
    { name: 'October 2026', from: '2026-10-01', to: '2026-10-31', deep: false },
    { name: 'April 2026', from: '2026-04-01', to: '2026-04-30', deep: false },
    { name: 'Week 09-15/04/2026', from: '2026-04-09', to: '2026-04-15', deep: true },
];

// DATA-02 manifest section 8 (rules v5, six BCVH): failed, KTL, KT, VC, KT-VC, chậm giao, phát sau giao, phát không chi tiết, chờ CQ, chưa đủ căn cứ.
const DATA02 = {
    'October 2026': [38820, 2328, 1769, 197, 1139, 15599, 14934, 708, 2146, 0],
    'April 2026': [35522, 1257, 0, 0, 3071, 8948, 13508, 742, 7969, 27],
};

const lines = [];
let differences = 0;
let checks = 0;
const out = (text = '') => { lines.push(text); };
const check = (label, actual, expected) => {
    checks += 1;
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        differences += 1;
        out(`  DIFF ${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
    }
};
const quad = (row) => [Number(row.n), Number(row.d), Number(row.k), Number(row.b)];
const COUNTERS = (col) => `COUNT(*) AS n, SUM(${col} = 'Đạt') AS d, SUM(${col} = 'Không đạt') AS k, SUM(${col} IS NULL OR TRIM(${col}) = '') AS b`;
const ph = CODES.map(() => '?').join(',');

/** Cause lines of a mix: the six causes (Phát split in two + no detail), Chờ Chuyên quản, chưa đủ căn cứ, unclassified add up to the failed parcels. */
function checkMix(label, mix, failed) {
    const lineCount = (code) => mix.lines.find((line) => line.code === code)?.count ?? 0;
    const parts = ['KHONG_TRON_LO', 'KHAI_THAC', 'VAN_CHUYEN', 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', 'GIAO_BUU_TA_QUA_GIO', 'PHAT_MUON', 'PHAT_KHONG_CHI_TIET'].reduce((s, c) => s + lineCount(c), 0);
    check(`${label} cause lines + Chờ CQ + chưa đủ căn cứ + unclassified = failed`, parts + mix.cho_chuyen_quan.count + mix.chua_du_can_cu.count + mix.unclassified, failed);
    check(`${label} failed in mix`, mix.failed, failed);
}

function lineFilter(code) { return { cause: code }; }

async function traceRow(label, row, base, withLines) {
    const list = async (extra) => (await service.parcels({ ...base, ...row.filter, ...extra, page_size: 1 }, CITY)).meta.total;
    check(`${label} BG list = rows`, await list({}), row.volume);
    check(`${label} BG list failed`, await list({ verdict: 'Không đạt' }), row.failed);
    check(`${label} BG list unrated`, await list({ verdict: 'CHUA_DANH_GIA' }), row.unrated);
    if (!withLines) return;
    for (const line of row.cause_mix.lines) check(`${label} BG list line ${line.code}`, await list(lineFilter(line.code)), line.count);
    check(`${label} BG list Chờ Chuyên quản`, await list({ cause: 'CHO_CHUYEN_QUAN' }), row.cause_mix.cho_chuyen_quan.count);
    check(`${label} BG list chưa đủ căn cứ`, await list({ cause: 'CHUA_DU_CAN_CU' }), row.cause_mix.chua_du_can_cu.count);
    for (const [reason, count] of Object.entries(row.cause_mix.cho_chuyen_quan.by_reason)) check(`${label} BG list reason ${reason}`, await list({ cause: 'CHO_CHUYEN_QUAN', reason }), count);
}

async function reconcile(period) {
    const { from, to, name } = period;
    const base = { from, to };
    out(`=== ${name} (${from}..${to})`);
    const layer = await service.bcvh(base, CITY);
    const fact = new Map((await all(`SELECT ma_bcvh, ${COUNTERS('danh_gia_2026')} FROM fact_f13 WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bcvh IN (${ph}) GROUP BY ma_bcvh`, [from, to, ...CODES])).map((row) => [row.ma_bcvh, row]));
    const agg = new Map((await all(`SELECT ma_bcvh, SUM(n_rows) AS n, SUM(n_dat) AS d, SUM(n_khong_dat) AS k, SUM(n_blank) AS b FROM agg_f13_day WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bcvh IN (${ph}) GROUP BY ma_bcvh`, [from, to, ...CODES])).map((row) => [row.ma_bcvh, row]));
    const ranking = new Map((await factBuuGuiRepo.getBcvhRanking(from, to, 1, 50, 'total_bg', 'desc')).data.map((row) => [row.ma_bcvh, row]));
    out('BCVH | layer rows/Đạt/KĐ/blank | rate | fact_f13 | agg_f13_day | getBcvhRanking rows/Đạt/KĐ | distinct');
    for (const row of layer.rows) {
        const f = quad(fact.get(row.ma_bcvh));
        const a = quad(agg.get(row.ma_bcvh));
        const r = ranking.get(row.ma_bcvh);
        const mine = [row.volume, row.passed, row.failed, row.unrated];
        check(`${name} ${row.ma_bcvh} layer = fact_f13`, mine, f);
        check(`${name} ${row.ma_bcvh} layer = agg_f13_day`, mine, a);
        check(`${name} ${row.ma_bcvh} layer = getBcvhRanking`, mine.slice(0, 3), [r.total_bg, r.total_passed, r.total_failed]);
        check(`${name} ${row.ma_bcvh} rate = Đạt / rows`, row.rate, Math.round((f[1] / f[0]) * 1000) / 10);
        out(`${row.ten_bcvh} | ${mine.join('/')} | ${row.rate}% | ${f.join('/')} | ${a.join('/')} | ${r.total_bg}/${r.total_passed}/${r.total_failed} | ${row.distinct_bg} (repeat ${row.repeat})`);
        checkMix(`${name} ${row.ma_bcvh}`, row.cause_mix, row.failed);
    }
    check(`${name} six BCVH present`, layer.rows.length, 6);
    const total = (await service.summary(base, CITY)).totals;
    const sum = quad({ n: [...fact.values()].reduce((s, r) => s + Number(r.n), 0), d: [...fact.values()].reduce((s, r) => s + Number(r.d), 0), k: [...fact.values()].reduce((s, r) => s + Number(r.k), 0), b: [...fact.values()].reduce((s, r) => s + Number(r.b), 0) });
    check(`${name} six BCVH total = fact_f13`, [total.volume, total.passed, total.failed, total.unrated], sum);
    const meta = (await service.summary(base, CITY)).meta;
    out(`six BCVH: rows ${total.volume}, Đạt ${total.passed}, KĐ ${total.failed}, unrated ${total.unrated}, rate ${total.rate}%, distinct BG ${total.distinct_bg} (extra rows ${meta.repeats.extra}), rate on BG-day rows (official basis)`);
    out(`freshness: complete ${meta.freshness.complete}, stale ${meta.freshness.stale_days.length}, missing ${meta.freshness.missing_days.length}, check ${meta.freshness.check}`);
    check(`${name} freshness complete`, meta.freshness.complete, true);
    checkMix(`${name} six BCVH`, total.cause_mix, total.failed);
    const m = total.cause_mix;
    const lc = (code) => m.lines.find((line) => line.code === code)?.count ?? 0;
    const v5 = [m.failed, lc('KHONG_TRON_LO'), lc('KHAI_THAC'), lc('VAN_CHUYEN'), lc('KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET'), lc('GIAO_BUU_TA_QUA_GIO'), lc('PHAT_MUON'), lc('PHAT_KHONG_CHI_TIET'), m.cho_chuyen_quan.count, m.chua_du_can_cu.count];
    out(`cause lines (rules v5): failed ${v5[0]} = Không trọn lô ${v5[1]} + Khai thác ${v5[2]} + Vận chuyển ${v5[3]} + KT-VC chưa phân biệt ${v5[4]} + Phát [chậm giao bưu tá ${v5[5]} + phát chậm sau khi giao ${v5[6]} + không chi tiết ${v5[7]}] + Chờ Chuyên quản ${v5[8]} + chưa đủ căn cứ ${v5[9]}`);
    out(`  Chờ Chuyên quản by reason ${JSON.stringify(m.cho_chuyen_quan.by_reason)}; arrival source ${JSON.stringify(total.arrival_source)}; basis ${JSON.stringify(total.basis)}; hints ${JSON.stringify(total.hints)}`);
    if (DATA02[name]) {
        check(`${name} cause lines = F13-WHY-DATA-02 manifest section 8`, v5, DATA02[name]);
        out(`  equals F13-WHY-DATA-02 section 8 figures: ${JSON.stringify(v5) === JSON.stringify(DATA02[name])}`);
    }

    // routes: ranked routes against getRouteRanking summed over the days; buckets against raw SQL; routes + buckets = BCVH
    const days = (await all('SELECT DISTINCT ngay_do_kiem AS d FROM fact_f13 WHERE ngay_do_kiem BETWEEN ? AND ? ORDER BY 1', [from, to])).map((row) => row.d);
    const nonPostmanSql = NON_POSTMAN.map((code) => `'${code}'`).join(',');
    let routeRows = 0;
    let postmanRows = 0;
    for (const row of layer.rows) {
        const routes = await service.routes({ ...base, bcvh: row.ma_bcvh }, CITY);
        const postmen = await service.postmen({ ...base, bcvh: row.ma_bcvh }, CITY);
        const official = new Map();
        for (const day of days) {
            const rank = (await factBuuGuiRepo.getRouteRanking(day, row.ma_bcvh, 1, 2000, 'total_bg', 'desc', { confirmedNonPostmanRouteCodes: NON_POSTMAN })).data;
            for (const r of rank) {
                const cur = official.get(r.ma_tuyen) || [0, 0, 0, 0];
                official.set(r.ma_tuyen, [cur[0] + r.total_bg, cur[1] + r.total_passed, cur[2] + r.total_failed, cur[3] + r.total_returned]);
            }
        }
        const ranked = routes.rows.filter((r) => r.route_scope === 'POSTMAN');
        check(`${name} ${row.ma_bcvh} ranked routes count = getRouteRanking`, ranked.length, official.size);
        for (const r of ranked) check(`${name} ${row.ma_bcvh} route ${r.ma_tuyen} = getRouteRanking`, [r.volume, r.passed, r.failed, r.unrated], official.get(r.ma_tuyen) || null);
        const rawBuckets = await all(`SELECT CASE WHEN ma_tuyen IN (${nonPostmanSql}) THEN 'NON_POSTMAN' WHEN ma_tuyen LIKE '53%' THEN 'POSTMAN' ELSE 'OTHER' END AS s, ${COUNTERS('danh_gia_2026')} FROM fact_f13 WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bcvh = ? GROUP BY s`, [from, to, row.ma_bcvh]);
        for (const bucket of routes.rows.filter((r) => r.route_scope !== 'POSTMAN')) {
            const raw = rawBuckets.find((r) => r.s === bucket.route_scope);
            check(`${name} ${row.ma_bcvh} bucket ${bucket.route_scope} = raw fact_f13`, [bucket.volume, bucket.passed, bucket.failed, bucket.unrated], raw ? quad(raw) : null);
        }
        const rawPostman = rawBuckets.find((r) => r.s === 'POSTMAN');
        check(`${name} ${row.ma_bcvh} ranked routes = raw POSTMAN scope`, [ranked.reduce((s, r) => s + r.volume, 0), ranked.reduce((s, r) => s + r.passed, 0), ranked.reduce((s, r) => s + r.failed, 0), ranked.reduce((s, r) => s + r.unrated, 0)], rawPostman ? quad(rawPostman) : [0, 0, 0, 0]);
        const sumOf = (rows, key) => rows.reduce((s, r) => s + r[key], 0);
        for (const [label, rows] of [['routes + buckets', routes.rows], ['postmen (+ Chưa có bưu tá)', postmen.rows]]) {
            check(`${name} ${row.ma_bcvh} ${label} = BCVH`, ['volume', 'passed', 'failed', 'unrated', 'shortfall_x10'].map((key) => sumOf(rows, key)), ['volume', 'passed', 'failed', 'unrated', 'shortfall_x10'].map((key) => row[key]));
        }
        routeRows += routes.rows.length;
        postmanRows += postmen.rows.length;
        // every figure to its BG list
        await traceRow(`${name} ${row.ma_bcvh}`, row, base, true);
        for (const r of routes.rows) { checkMix(`${name} ${row.ma_bcvh} route ${r.key}`, r.cause_mix, r.failed); await traceRow(`${name} ${row.ma_bcvh} route ${r.key}`, r, base, true); }
        for (const r of postmen.rows) { checkMix(`${name} ${row.ma_bcvh} postman ${r.key}`, r.cause_mix, r.failed); await traceRow(`${name} ${row.ma_bcvh} postman ${r.key}`, r, base, period.deep); }
        out(`  ${row.ten_bcvh}: ${ranked.length} ranked routes + ${routes.rows.length - ranked.length} bucket(s) = BCVH; ${postmen.rows.length} postman row(s) (incl. Chưa có bưu tá) = BCVH`);
    }
    out(`checked: ${routeRows} route rows, ${postmanRows} postman rows, every row with its BG list (volume, failed, unrated${period.deep ? ', every cause line and Chờ CQ reason' : '; cause lines for BCVH and routes'})`);
    out();
}

(async () => {
    const started = Date.now();
    out(`F13-WHY-AGG-01 P4 reconciliation (read only) on ${path.basename(dbPath)} - ${new Date().toISOString()}`);
    for (const period of PERIODS) {
        const t = Date.now();
        await reconcile(period);
        out(`  [${period.name}: ${((Date.now() - t) / 1000).toFixed(1)} s]`);
        out();
    }
    out(`CHECKS: ${checks}, TOTAL DIFFERENCES: ${differences}`);
    const text = lines.join('\n');
    if (arg('out')) fs.writeFileSync(path.resolve(arg('out')), text + '\n', 'utf8');
    else console.log(text);
    if (arg('bg-csv')) {
        const rows = await all(`SELECT ngay_do_kiem, ma_bg, ma_bcvh, route_scope, ma_tuyen, ma_buu_ta_first, ma_buu_ta_shown, danh_gia, cause_status, cause_code, cause_detail, cause_reason, cause_step, flags, hints, a_source, basis
            FROM f13_cause_parcel WHERE ngay_do_kiem BETWEEN '2026-10-22' AND '2026-10-28' ORDER BY ma_bcvh, ngay_do_kiem, ma_bg`);
        const cell = (value) => (value === null || value === undefined ? '' : `"${String(value).replace(/"/g, '""')}"`);
        const header = Object.keys(rows[0]);
        fs.writeFileSync(path.resolve(arg('bg-csv')), '﻿' + [header.join(','), ...rows.map((row) => header.map((key) => cell(row[key])).join(','))].join('\n') + '\n', 'utf8');
    }
    console.log(`done in ${((Date.now() - started) / 1000).toFixed(0)} s; checks ${checks}; differences ${differences}`);
    process.exit(differences ? 1 : 0);
})().catch((error) => { console.error('[f13_cause_reconcile] FAILED:', error); process.exit(1); });
