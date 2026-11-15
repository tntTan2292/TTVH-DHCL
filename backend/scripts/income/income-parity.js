'use strict';
/**
 * INC-PHAT-02 parity harness: runs the pure calculators for periods PMTL already calculated and compares with PMTL's stored kq_phat.
 *
 *   node scripts/income/income-parity.js --db <COPY of the QIS database> --fixtures <folder from export_pmtl_parity_fixture.py> 2026-08 2026-09
 *
 * Three runs per period, all with the period's own PMTL parameters and catalogues (never the 97-102 % limit):
 *   A  PMTL's parcel rows in PMTL's order (rowid)        -> proves the logic: expected 0 difference against the stored result
 *   B  QIS fact_bf_phat in QIS order (ngay_bf, id)       -> the real parity: what the QIS source gives
 *   C  the same QIS rows re-ordered to PMTL's order      -> B vs C is the effect of the row order alone; C vs stored is the effect of the data
 * Reads the QIS copy read-only. Writes only <fixtures>/parity_report_<ky>.json (names and pay: keep outside git). Calculates; stores nothing in inc_*.
 */
const fs = require('fs');
const path = require('path');
const { open, all, close } = require('../../src/services/income/incSqlite');
const { parseCsv } = require('../../src/services/income/incPmtlResultImporter');
const { makeParamReader, khongSlRoutes, priceMap } = require('../../src/services/income/incParams');
const { calculateHscl, hsclLimits } = require('../../src/services/income/hsclCalculator');
const { calculatePhat } = require('../../src/services/income/phatCalculator');
const { parseArgs, requireCopyDb } = require('./_cli');

const TARGETS = ['cp_buu_gui', 'cp_ph', 'cp_dieu_chinh', 'cp_trai_giam', 'bo_sung_ctv', 'hscl', 'tong'];
const ALSO = ['so_ptc', 'cp_dhl', 'cp_bpt', 'cp_phbc', 'tong_khong_phbc', 'cp_truoc_hscl', 'cp_sau_hscl'];
const TEXT = ['ma_buu_ta', 'don_vi'];

const nfc = (v) => (v == null ? '' : String(v).normalize('NFC').trim());
const rowKey = (r) => [r.so_hieu, r.ma_buu_ta, r.ma_tuyen, r.trang_thai, r.service_code, r.type_code, r.service_name, r.area, r.kg_gram, r.quantity, r.ma_lo].join('\u0001');

function readCsvObjects(file) {
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));
    const head = rows[0];
    return rows.slice(1).map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i]])));
}

function loadPmtlParcels(file) {
    return readCsvObjects(file).map((r) => ({
        so_hieu: r.so_hieu, ma_buu_ta: r.ma_buu_ta, ma_tuyen: r.ma_tuyen, trang_thai: r.trang_thai, service_code: r.service_code, type_code: r.type_code,
        service_name: r.service_name, area: r.area, kg_gram: Number(r.kg_gram), quantity: Number(r.quantity), ma_lo: r.ma_lo || '', ngay: r.ngay,
    }));
}

/** QIS fact_bf_phat -> parcel rows normalised like PMTL's importer (importers.py import_chi_tiet): trimmed NFC text, upper-case codes, integer QUANTITY. */
async function loadQisParcels(dbPath, ky) {
    const db = await open(dbPath, { readOnly: true });
    try {
        const last = new Date(Number(ky.slice(0, 4)), Number(ky.slice(5, 7)), 0).getDate();
        const rows = await all(db, `SELECT id, ngay_bf, lading_code, postman_code, route_po_code, status_code, type_code_payroll, service_name_payroll, kg, area_code, service_code, quantity, ma_lo
                                    FROM fact_bf_phat WHERE ngay_bf BETWEEN ? AND ? ORDER BY ngay_bf, id`, [`${ky}-01`, `${ky}-${String(last).padStart(2, '0')}`]);
        return rows.map((r) => ({
            id: r.id, so_hieu: nfc(r.lading_code), ma_buu_ta: nfc(r.postman_code), ma_tuyen: nfc(r.route_po_code), trang_thai: nfc(r.status_code).toUpperCase(),
            service_code: nfc(r.service_code).toUpperCase(), type_code: nfc(r.type_code_payroll).toUpperCase(), service_name: nfc(r.service_name_payroll),
            area: nfc(r.area_code).toUpperCase(), kg_gram: Number(r.kg) || 0, quantity: Math.trunc(Number(r.quantity) || 1), ma_lo: nfc(r.ma_lo), ngay: r.ngay_bf.replace(/-/g, ''),
        }));
    } finally { await close(db); }
}

function buildInputs(catalog, ky) {
    const param = makeParamReader(catalog.params, ky);
    const limits = hsclLimits(param);
    const hscl = calculateHscl({
        f42Rows: catalog.hscl_f42,
        mien: new Map(catalog.hscl_mien.map((m) => [m.ma_buu_ta, m.ly_do || 'miễn'])),
        penalties: new Map(catalog.penalties.map((p) => [p.ma_buu_ta, p.diem])),
        limits,
    });
    return {
        ky, param, hscl,
        catalog: {
            routeGroups: new Map(catalog.routes.map((r) => [r.ma_tuyen, { nhom: r.nhom, ten_bc: r.ten_bc }])),
            postmen: new Map(catalog.postmen.map((p) => [p.ma_buu_ta, p])),
            employees: new Map(catalog.employees.map((e) => [e.ma_hrm, e])),
            ctv: new Set(catalog.ctv), postmanUnit: new Map(catalog.postman_unit.map((u) => [u.ma_buu_ta, u.don_vi])), khongSl: khongSlRoutes(catalog.params, ky),
        },
        prices: { phat: priceMap(catalog.prices.PHAT.rows), phatMa: priceMap(catalog.prices.PHAT_MA.rows) },
        adjustments: new Map(catalog.adjustments.map((a) => [a.ma_hrm, a.so_tien])),
        traiGiam: catalog.trai_giam,
    };
}

function compare(label, calculated, stored) {
    const byHrm = new Map(calculated.rows.map((r) => [r.ma_hrm, r]));
    const stor = new Map(stored.map((r) => [r.ma_hrm, r]));
    const hrms = [...new Set([...byHrm.keys(), ...stor.keys()])].sort();
    const diffs = [];
    const perColumn = Object.fromEntries([...TARGETS, ...ALSO].map((c) => [c, { hrmWithDiff: 0, sumAbs: 0 }]));
    for (const hrm of hrms) {
        const a = byHrm.get(hrm); const b = stor.get(hrm);
        if (!a || !b) { diffs.push({ hrm, missing: !a ? 'not calculated' : 'not in PMTL', columns: {} }); continue; }
        const columns = {};
        for (const c of [...TARGETS, ...ALSO]) {
            const x = Number(a[c]); const y = Number(b[c]);
            if (c === 'hscl' ? x !== y : Math.abs(x - y) > 0) { columns[c] = { qis: x, pmtl: y, delta: x - y }; perColumn[c].hrmWithDiff += 1; perColumn[c].sumAbs += Math.abs(x - y); }
        }
        for (const c of TEXT) if (String(a[c]) !== String(b[c])) columns[c] = { qis: a[c], pmtl: b[c] };
        if (Object.keys(columns).length) diffs.push({ hrm, columns });
    }
    return { label, hrmCalculated: byHrm.size, hrmStored: stor.size, hrmWithAnyDiff: diffs.length, targetsDiff: diffs.filter((d) => d.missing || TARGETS.some((c) => d.columns[c])).length, perColumn, diffs };
}

/** Rows of B that are not in A and vice versa (as multisets), counted per postman: the cause of a difference between the two sources. */
function rowDifferencesByPostman(a, b) {
    const count = new Map();
    for (const r of a) count.set(rowKey(r), (count.get(rowKey(r)) || 0) + 1);
    const onlyB = []; const left = new Map(count);
    for (const r of b) { const k = rowKey(r); if ((left.get(k) || 0) > 0) left.set(k, left.get(k) - 1); else onlyB.push(r); }
    const onlyA = []; const idx = new Map();
    for (const r of a) { const k = rowKey(r); idx.set(k, (idx.get(k) || 0) + 1); }
    for (const r of b) { const k = rowKey(r); if (idx.get(k) > 0) idx.set(k, idx.get(k) - 1); }
    for (const r of a) { const k = rowKey(r); if ((idx.get(k) || 0) > 0) { onlyA.push(r); idx.set(k, idx.get(k) - 1); } }
    const per = new Map();
    const bump = (r, field) => { const e = per.get(r.ma_buu_ta) || { onlyPmtl: 0, onlyQis: 0, examples: [] }; e[field] += 1; if (e.examples.length < 3) e.examples.push(`${field === 'onlyPmtl' ? 'PMTL' : 'QIS'}: ${r.so_hieu} ${r.trang_thai} q=${r.quantity} ${r.ma_tuyen}`); per.set(r.ma_buu_ta, e); };
    onlyA.forEach((r) => bump(r, 'onlyPmtl')); onlyB.forEach((r) => bump(r, 'onlyQis'));
    return { onlyPmtl: onlyA.length, onlyQis: onlyB.length, per };
}

/** QIS rows sorted by the position PMTL has for the same row (matched as multiset occurrences); unmatched rows go last in QIS order. */
function reorderLikePmtl(qis, pmtl) {
    const queues = new Map();
    pmtl.forEach((r, i) => { const k = rowKey(r); if (!queues.has(k)) queues.set(k, []); queues.get(k).push(i); });
    const heads = new Map();
    const tagged = qis.map((r, i) => {
        const k = rowKey(r); const q = queues.get(k); const h = heads.get(k) || 0;
        heads.set(k, h + 1);
        return { r, pos: q && h < q.length ? q[h] : Infinity, i };
    });
    tagged.sort((x, y) => (x.pos - y.pos) || (x.i - y.i));
    return tagged.map((t) => t.r);
}

function duplicateOrderImpact(pmtl, qis) {
    const firstUsable = (rows) => { const m = new Map(); for (const r of rows) { if (r.quantity < 0) continue; const k = `${r.so_hieu}\u0001${r.trang_thai}`; if (!m.has(k)) m.set(k, r); } return m; };
    const count = (rows) => { const m = new Map(); for (const r of rows) { const k = `${r.so_hieu}\u0001${r.trang_thai}`; m.set(k, (m.get(k) || 0) + 1); } return m; };
    const a = firstUsable(pmtl); const b = firstUsable(qis); const dup = count(pmtl);
    let groups = 0; let different = 0; const postmen = new Set();
    for (const [k, ra] of a) {
        if ((dup.get(k) || 0) < 2) continue;
        groups += 1;
        const rb = b.get(k);
        if (rb && (rb.ma_buu_ta !== ra.ma_buu_ta || rb.ma_tuyen !== ra.ma_tuyen || rb.service_code !== ra.service_code || rb.type_code !== ra.type_code || rb.service_name !== ra.service_name || rb.area !== ra.area || rb.kg_gram !== ra.kg_gram)) { different += 1; postmen.add(ra.ma_buu_ta); postmen.add(rb.ma_buu_ta); }
    }
    return { repeatedParcelNumbers: groups, firstUsableRowDiffers: different, postmenInvolved: postmen.size };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const dbPath = requireCopyDb(args);
    const dir = path.resolve(args.fixtures || '');
    if (!args.fixtures || !fs.existsSync(dir)) { console.error('--fixtures <folder> is required'); process.exit(2); }
    const periods = args._;
    if (!periods.length) { console.error('Usage: <ky> [<ky> ...] --db <copy> --fixtures <folder>'); process.exit(2); }
    for (const ky of periods) {
        const catalog = JSON.parse(fs.readFileSync(path.join(dir, `catalog_${ky}.json`), 'utf8'));
        const external = JSON.parse(fs.readFileSync(path.join(dir, `external_${ky}.json`), 'utf8'));
        const stored = readCsvObjects(path.join(dir, `kq_phat_${ky}.csv`)).map((r) => ({ ...r, ...Object.fromEntries([...TARGETS, ...ALSO].map((c) => [c, Number(r[c])])) }));
        const base = buildInputs(catalog, ky);
        const run = (parcels) => calculatePhat({ ...base, parcels, external: { lines: external.lines, dhlByHrm: new Map(Object.entries(external.dhl_by_hrm)) } });
        const pmtl = loadPmtlParcels(path.join(dir, `parcels_${ky}.csv`));
        const qis = await loadQisParcels(dbPath, ky);
        const qisLikePmtl = reorderLikePmtl(qis, pmtl);
        const A = compare('A PMTL rows, PMTL order', run(pmtl), stored);
        const B = compare('B QIS rows, QIS order (ngay_bf, id)', run(qis), stored);
        const C = compare('C QIS rows, PMTL order', run(qisLikePmtl), stored);
        const orderEffect = compare('B vs C (order alone)', run(qis), run(qisLikePmtl).rows.map((r) => r));
        const rowDiff = rowDifferencesByPostman(pmtl, qis);
        const impact = duplicateOrderImpact(pmtl, qis);
        // sensitivity: the comparison must SEE a wrong rule - run A with the switches flipped; every flip has to produce differences
        const flip = (name, to) => (k, d) => (k === name ? to : base.param(k, d));
        const sensitivity = {
            quantityRuleFlipped: compare('x', calculatePhat({ ...base, param: flip('PTC_MOT_LAN_SO_HIEU', base.param('PTC_MOT_LAN_SO_HIEU', 0) ? 0 : 1), parcels: pmtl, external: { lines: external.lines, dhlByHrm: new Map(Object.entries(external.dhl_by_hrm)) } }), stored).targetsDiff,
            hsclScopeFlipped: compare('x', calculatePhat({ ...base, param: flip('HSCL_PHAT_TOAN_BO', base.param('HSCL_PHAT_TOAN_BO', 0) ? 0 : 1), parcels: pmtl, external: { lines: external.lines, dhlByHrm: new Map(Object.entries(external.dhl_by_hrm)) } }), stored).targetsDiff,
            hsclOff: compare('x', calculatePhat({ ...base, hscl: new Map(), parcels: pmtl, external: { lines: external.lines, dhlByHrm: new Map(Object.entries(external.dhl_by_hrm)) } }), stored).targetsDiff,
            pricesOnePercentHigher: compare('x', calculatePhat({ ...base, prices: { phat: base.prices.phat, phatMa: new Map([...base.prices.phatMa].map(([k, v]) => [k, v * 1.01])) }, parcels: pmtl, external: { lines: external.lines, dhlByHrm: new Map(Object.entries(external.dhl_by_hrm)) } }), stored).targetsDiff,
        };
        const orderChanged = qis.some((r, i) => r !== qisLikePmtl[i]);

        // cause of every HRM that differs in B: the rows (by postman) that exist only in one source
        const causes = B.diffs.map((d) => {
            const bts = String((catalog.postmen.filter((p) => p.ma_hrm === d.hrm).map((p) => p.ma_buu_ta)).join(',')).split(',').filter(Boolean);
            const rowsDiff = bts.map((b) => rowDiff.per.get(b)).filter(Boolean);
            const inC = C.diffs.some((x) => x.hrm === d.hrm);
            return { hrm: d.hrm, columns: Object.keys(d.columns), rowsOnlyInPmtl: rowsDiff.reduce((s, e) => s + e.onlyPmtl, 0), rowsOnlyInQis: rowsDiff.reduce((s, e) => s + e.onlyQis, 0), stillDiffersWithPmtlOrder: inC,
                examples: rowsDiff.flatMap((e) => e.examples).slice(0, 3) };
        });
        const report = { ky, rows: { pmtl: pmtl.length, qis: qis.length, onlyInPmtl: rowDiff.onlyPmtl, onlyInQis: rowDiff.onlyQis }, rowOrderDiffersFromPmtl: orderChanged, orderImpact: impact, sensitivityHrmWithDiffWhenRuleIsWrong: sensitivity,
            runs: [A, B, C].map(({ diffs, ...rest }) => ({ ...rest, diffedHrm: diffs.length })), orderAloneBvsC: { hrmWithDiff: orderEffect.hrmWithAnyDiff, perColumn: orderEffect.perColumn },
            pmtlDiffs: { A: A.diffs, B: B.diffs }, causes };
        fs.writeFileSync(path.join(dir, `parity_report_${ky}.json`), JSON.stringify(report, null, 1));
        console.log(`\n=== ${ky}: PMTL rows ${pmtl.length}, QIS rows ${qis.length} (only in PMTL ${rowDiff.onlyPmtl}, only in QIS ${rowDiff.onlyQis}); QIS order differs from PMTL: ${orderChanged}`);
        for (const x of [A, B, C]) console.log(`${x.label}: HRM ${x.hrmCalculated}/${x.hrmStored}, HRM with a target-column difference ${x.targetsDiff}, any column ${x.hrmWithAnyDiff}`);
        console.log('sensitivity (HRM with a difference when a rule is deliberately wrong):', JSON.stringify(sensitivity));
        console.log(`order alone (B vs C): HRM with any difference ${orderEffect.hrmWithAnyDiff}; repeated parcel numbers ${impact.repeatedParcelNumbers}, first usable row differs ${impact.firstUsableRowDiffers}`);
    }
}

if (require.main === module) {
    main().catch((error) => { console.error('[FAIL]', error.stack || error.message); process.exit(1); });
}

module.exports = { readCsvObjects, loadPmtlParcels, loadQisParcels, buildInputs, compare, TARGETS, ALSO };
