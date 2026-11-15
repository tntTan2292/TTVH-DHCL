'use strict';
/**
 * INC-PHAT-03 report: HSCL from QIS fact_f42 against PMTL's hand-loaded F4.2 (hscl_f42), and a trial for 2026-10. REPORT ONLY: reads a COPY of the
 * QIS database and the PMTL fixture, writes <fixtures>/hscl_f42_report.json (postman codes and pay: keep outside git); nothing goes into inc_*.
 *
 *   node scripts/income/income-hscl-compare.js --db <COPY of the QIS database> --fixtures <fixture folder> [2026-09 2026-08]
 *
 * Per compared period (PMTL parameters of that period): rows that differ (postman x BC), postmen whose HSCL changes, HRM whose hscl or total pay change
 * if the QIS source were used. Then the 2026-10 trial with limits 97-102 %: distribution, postmen at the floor / ceiling, postmen with parcels but
 * no F4.2 and the reverse. The 2026-10 switches that PMTL has no row for are taken from the period before (assumptions are printed).
 */
const fs = require('fs');
const path = require('path');
const { open, all, close } = require('../../src/services/income/incSqlite');
const { loadF42Rows } = require('../../src/services/income/hsclF42Source');
const { calculateHscl, hsclLimits } = require('../../src/services/income/hsclCalculator');
const { calculatePhat } = require('../../src/services/income/phatCalculator');
const { makeParamReader } = require('../../src/services/income/incParams');
const { readCsvObjects, loadQisParcels, buildInputs } = require('./income-parity');
const { parseArgs, requireCopyDb } = require('./_cli');

const sum = (xs) => xs.reduce((s, v) => s + v, 0);
const perPostman = (rows) => { const m = new Map(); for (const r of rows) { const e = m.get(r.ma_buu_ta) || { sl_mau: 0, sl_dung: 0 }; e.sl_mau += r.sl_mau; e.sl_dung += r.sl_dung; m.set(r.ma_buu_ta, e); } return m; };
const key = (r) => `${r.ma_buu_ta}\u0001${r.ten_bc}`;

function diffRows(pmtl, qis) {
    const a = new Map(pmtl.map((r) => [key(r), r])); const b = new Map(qis.map((r) => [key(r), r]));
    const onlyPmtl = [...a].filter(([k]) => !b.has(k)).map(([, r]) => ({ ma_buu_ta: r.ma_buu_ta, ten_bc: r.ten_bc, sl_mau: r.sl_mau, sl_dung: r.sl_dung }));
    const onlyQis = [...b].filter(([k]) => !a.has(k)).map(([, r]) => ({ ma_buu_ta: r.ma_buu_ta, ten_bc: r.ten_bc, sl_mau: r.sl_mau, sl_dung: r.sl_dung }));
    const differing = [...a].filter(([k, r]) => b.has(k) && (b.get(k).sl_mau !== r.sl_mau || b.get(k).sl_dung !== r.sl_dung))
        .map(([k, r]) => ({ ma_buu_ta: r.ma_buu_ta, ten_bc: r.ten_bc, pmtl: [r.sl_mau, r.sl_dung], qis: [b.get(k).sl_mau, b.get(k).sl_dung] }));
    return { pmtlKeys: a.size, qisKeys: b.size, onlyPmtl, onlyQis, differing,
        mauDifferent: differing.filter((d) => d.pmtl[0] !== d.qis[0]).length, dungDifferent: differing.filter((d) => d.pmtl[1] !== d.qis[1]).length,
        totalMau: { pmtl: sum(pmtl.map((r) => r.sl_mau)), qis: sum(qis.map((r) => r.sl_mau)) }, totalDung: { pmtl: sum(pmtl.map((r) => r.sl_dung)), qis: sum(qis.map((r) => r.sl_dung)) } };
}

async function compareWithPmtl(dbPath, dir, ky) {
    const catalog = JSON.parse(fs.readFileSync(path.join(dir, `catalog_${ky}.json`), 'utf8'));
    const external = JSON.parse(fs.readFileSync(path.join(dir, `external_${ky}.json`), 'utf8'));
    const stored = readCsvObjects(path.join(dir, `kq_phat_${ky}.csv`));
    const qisRows = await loadF42Rows(dbPath, ky);
    const rowDiff = diffRows(catalog.hscl_f42, qisRows);
    const base = buildInputs(catalog, ky);
    const limits = hsclLimits(base.param);
    const mien = new Map(catalog.hscl_mien.map((m) => [m.ma_buu_ta, m.ly_do || 'miễn'])); const penalties = new Map(catalog.penalties.map((p) => [p.ma_buu_ta, p.diem]));
    const hsPmtl = calculateHscl({ f42Rows: catalog.hscl_f42, mien, penalties, limits });
    const hsQis = calculateHscl({ f42Rows: qisRows, mien, penalties, limits });
    const postmenChanged = [];
    for (const ma of new Set([...hsPmtl.keys(), ...hsQis.keys()])) {
        const x = hsPmtl.get(ma); const y = hsQis.get(ma);
        if (!x || !y || x.hs !== y.hs) postmenChanged.push({ ma_buu_ta: ma, pmtl: x ? x.hs : null, qis: y ? y.hs : null, pmtlMauDung: x ? [x.sl_mau, x.sl_dung] : null, qisMauDung: y ? [y.sl_mau, y.sl_dung] : null });
    }
    const parcels = await loadQisParcels(dbPath, ky);
    const ext = { lines: external.lines, dhlByHrm: new Map(Object.entries(external.dhl_by_hrm)) };
    const withPmtl = calculatePhat({ ...base, parcels, external: ext, hscl: hsPmtl });
    const withQis = calculatePhat({ ...base, parcels, external: ext, hscl: hsQis });
    const a = new Map(withPmtl.rows.map((r) => [r.ma_hrm, r])); const hrmChanged = []; let sumAbs = 0; let sumDelta = 0;
    for (const r of withQis.rows) {
        const o = a.get(r.ma_hrm);
        if (o.hscl !== r.hscl || o.tong !== r.tong) { hrmChanged.push({ hrm: r.ma_hrm, hsclPmtl: o.hscl, hsclQis: r.hscl, tongPmtl: o.tong, tongQis: r.tong, delta: r.tong - o.tong }); sumAbs += Math.abs(r.tong - o.tong); sumDelta += r.tong - o.tong; }
    }
    return { ky, params: { kh: limits.kh, min: limits.min, max: limits.max, toanBo: limits.toanBo }, pmtlStoredMatchesPmtlSourceRun: withPmtl.rows.every((r) => { const s = stored.find((x) => x.ma_hrm === r.ma_hrm); return s && Number(s.tong) === r.tong; }),
        rows: { ...rowDiff, onlyPmtl: rowDiff.onlyPmtl, onlyQis: rowDiff.onlyQis, differing: rowDiff.differing }, postmenWithOtherHscl: postmenChanged.length, postmenChanged,
        hrm: { total: withQis.rows.length, hsclOrTongChanged: hrmChanged.length, hsclChanged: hrmChanged.filter((h) => h.hsclPmtl !== h.hsclQis).length, tongChanged: hrmChanged.filter((h) => h.delta !== 0).length, sumDelta, sumAbsDelta: sumAbs, totalPayPmtl: sum(withPmtl.rows.map((r) => r.tong)), totalPayQis: sum(withQis.rows.map((r) => r.tong)) }, hrmChanged };
}

/** What each way of counting gives against PMTL's biểu, per postman: the evidence behind the sl_mau / sl_dung mapping. */
async function hypotheses(dbPath, dir, ky) {
    const catalog = JSON.parse(fs.readFileSync(path.join(dir, `catalog_${ky}.json`), 'utf8'));
    const pm = perPostman(catalog.hscl_f42);
    const last = new Date(Number(ky.slice(0, 4)), Number(ky.slice(5, 7)), 0).getDate();
    const w = [`${ky}-01`, `${ky}-${String(last).padStart(2, '0')}`];
    const db = await open(dbPath, { readOnly: true });
    try {
        const run = async (sql) => new Map((await all(db, sql, w)).map((r) => [String(r.ma_buu_ta).trim(), r.n]));
        const where = "ngay_do_kiem BETWEEN ? AND ? AND TRIM(IFNULL(ma_buu_ta,'')) <> ''";
        const mau = {
            'every row': await run(`SELECT TRIM(ma_buu_ta) AS ma_buu_ta, COUNT(*) AS n FROM fact_f42 WHERE ${where} GROUP BY 1`),
            'rated rows only (Đạt + Không đạt)': await run(`SELECT TRIM(ma_buu_ta) AS ma_buu_ta, COUNT(*) AS n FROM fact_f42 WHERE ${where} AND danh_gia IS NOT NULL GROUP BY 1`),
            'distinct parcel number': await run(`SELECT TRIM(ma_buu_ta) AS ma_buu_ta, COUNT(DISTINCT ma_bg) AS n FROM fact_f42 WHERE ${where} GROUP BY 1`),
        };
        const dung = {
            'rows rated Đạt': await run(`SELECT TRIM(ma_buu_ta) AS ma_buu_ta, COUNT(*) AS n FROM fact_f42 WHERE ${where} AND danh_gia = 'Đạt' GROUP BY 1`),
            'distinct parcel number rated Đạt': await run(`SELECT TRIM(ma_buu_ta) AS ma_buu_ta, COUNT(DISTINCT ma_bg) AS n FROM fact_f42 WHERE ${where} AND danh_gia = 'Đạt' GROUP BY 1`),
        };
        const score = (cands, field) => Object.fromEntries(Object.entries(cands).map(([name, m]) => {
            let diffPostmen = 0; let abs = 0;
            for (const ma of new Set([...pm.keys(), ...m.keys()])) { const d = (m.get(ma) || 0) - ((pm.get(ma) || {})[field] || 0); if (d !== 0) { diffPostmen += 1; abs += Math.abs(d); } }
            return [name, { postmenDifferent: diffPostmen, sumAbsDifference: abs }];
        }));
        return { ky, sl_mau: score(mau, 'sl_mau'), sl_dung: score(dung, 'sl_dung') };
    } finally { await close(db); }
}

/** 2026-10 trial: limits 97-102 %, PMTL's switches of the last period it has a row for, the exemption list carried forward (PMTL's own rule), no penalty. */
async function trial(dbPath, dir, ky, from) {
    const catalog = JSON.parse(fs.readFileSync(path.join(dir, `catalog_${from}.json`), 'utf8'));
    const base = makeParamReader(catalog.params, ky);
    const limits = { ...hsclLimits(base), min: 0.97, max: 1.02 };
    const f42 = await loadF42Rows(dbPath, ky);
    const mien = new Map(catalog.hscl_mien.map((m) => [m.ma_buu_ta, m.ly_do || 'miễn']));
    const hs = calculateHscl({ f42Rows: f42, mien, penalties: new Map(), limits });
    const list = [...hs].map(([ma, v]) => ({ ma_buu_ta: ma, hs: v.hs, sl_mau: v.sl_mau, sl_dung: v.sl_dung, ly_do: v.ly_do }));
    const exempt = list.filter((x) => x.ly_do.startsWith('miễn'));
    const rated = list.filter((x) => !x.ly_do.startsWith('miễn'));
    const floorN = rated.filter((x) => x.sl_mau && x.hs === limits.min); const capN = rated.filter((x) => x.sl_mau && x.hs === limits.max);
    const buckets = {}; for (const x of rated) { const b = x.sl_mau === 0 ? 'sl_mau = 0' : (x.hs === limits.min ? `${limits.min} (floor)` : x.hs === limits.max ? `${limits.max} (ceiling)` : `${(Math.floor(x.hs * 100) / 100).toFixed(2)}-${(Math.floor(x.hs * 100) / 100 + 0.01).toFixed(2)}`); buckets[b] = (buckets[b] || 0) + 1; }
    const parcels = await loadQisParcels(dbPath, ky);
    const ptc = new Map(); for (const r of parcels) if (r.trang_thai === 'PTC') ptc.set(r.ma_buu_ta, (ptc.get(r.ma_buu_ta) || 0) + 1);
    const inF42 = new Set(f42.map((r) => r.ma_buu_ta));
    const bfNoF42 = [...ptc].filter(([ma]) => !inF42.has(ma)).map(([ma, n]) => ({ ma_buu_ta: ma, ptcRows: n })).sort((x, y) => y.ptcRows - x.ptcRows);
    const f42NoBf = [...perPostman(f42)].filter(([ma]) => !ptc.has(ma)).map(([ma, e]) => ({ ma_buu_ta: ma, ...e })).sort((x, y) => y.sl_mau - x.sl_mau);
    return { ky, assumptions: { switchesFrom: from, limits, exemptionListFrom: catalog.hscl_mien_ky, penalties: 'none (PMTL holds none)' }, postmenInF42: list.length, exempt: exempt.length, rated: rated.length, atFloor: floorN.length, atCeiling: capN.length,
        between: rated.filter((x) => x.sl_mau && x.hs > limits.min && x.hs < limits.max).length, zeroSample: rated.filter((x) => !x.sl_mau).length, buckets,
        hsRange: { min: Math.min(...rated.map((x) => x.hs)), max: Math.max(...rated.map((x) => x.hs)) }, ptcPostmen: ptc.size, ptcRows: sum([...ptc.values()]),
        bfWithoutF42: { postmen: bfNoF42.length, ptcRows: sum(bfNoF42.map((x) => x.ptcRows)), list: bfNoF42 }, f42WithoutBf: { postmen: f42NoBf.length, sampleRows: sum(f42NoBf.map((x) => x.sl_mau)), list: f42NoBf }, list };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const dbPath = requireCopyDb(args);
    const dir = path.resolve(args.fixtures || '');
    if (!args.fixtures || !fs.existsSync(dir)) { console.error('--fixtures <folder> is required'); process.exit(2); }
    const periods = args._.length ? args._ : ['2026-09', '2026-08'];
    const report = { compared: [], hypotheses: [], trial: null };
    for (const ky of periods) {
        const c = await compareWithPmtl(dbPath, dir, ky); report.compared.push(c); report.hypotheses.push(await hypotheses(dbPath, dir, ky));
        console.log(`\n=== ${ky} (PMTL parameters: ${JSON.stringify(c.params)})`);
        console.log(`F4.2 rows PMTL ${c.rows.pmtlKeys} / QIS ${c.rows.qisKeys}; only PMTL ${c.rows.onlyPmtl.length}, only QIS ${c.rows.onlyQis.length}, differing ${c.rows.differing.length} (sl_mau ${c.rows.mauDifferent}, sl_dung ${c.rows.dungDifferent}); totals mau ${JSON.stringify(c.rows.totalMau)} dung ${JSON.stringify(c.rows.totalDung)}`);
        console.log(`postmen with another HSCL: ${c.postmenWithOtherHscl}; HRM ${c.hrm.total}: hscl changed ${c.hrm.hsclChanged}, pay changed ${c.hrm.tongChanged}, sum delta ${c.hrm.sumDelta}, sum |delta| ${c.hrm.sumAbsDelta} (total pay ${c.hrm.totalPayPmtl} -> ${c.hrm.totalPayQis})`);
        console.log('hypotheses:', JSON.stringify(report.hypotheses[report.hypotheses.length - 1]));
    }
    report.trial = await trial(dbPath, dir, '2026-10', '2026-09');
    const t = report.trial;
    console.log(`\n=== 2026-10 trial (97-102 %): postmen in F4.2 ${t.postmenInF42}, exempt ${t.exempt}, rated ${t.rated}: floor ${t.atFloor}, ceiling ${t.atCeiling}, between ${t.between}, sl_mau=0 ${t.zeroSample}; hs range ${JSON.stringify(t.hsRange)}`);
    console.log('buckets', JSON.stringify(t.buckets));
    console.log(`BF PTC postmen ${t.ptcPostmen} (rows ${t.ptcRows}); with PTC but no F4.2: ${t.bfWithoutF42.postmen} (rows ${t.bfWithoutF42.ptcRows}); in F4.2 but no BF PTC: ${t.f42WithoutBf.postmen} (sample ${t.f42WithoutBf.sampleRows})`);
    fs.writeFileSync(path.join(dir, 'hscl_f42_report.json'), JSON.stringify(report, null, 1));
}

main().catch((error) => { console.error('[FAIL]', error.stack || error.message); process.exit(1); });
