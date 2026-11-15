'use strict';
/**
 * INC-PHAT-01 - imports the stored results of a period that PMTL already calculated (kq_phat, kq_phat_ct exported as csv) into
 * inc_result / inc_result_detail with nguon = 'PMTL', then LOCKS the period (KHOA). It never calculates and never overwrites:
 * a period that already exists in inc_period is refused. All or nothing: any failed check rolls the whole import back.
 *
 * Checks (per HRM unless stated):
 *   - exact header, period column equal to the requested period, HRM present and unique
 *   - tong_khong_phbc = cp_buu_gui + cp_dhl + cp_bpt + cp_ph + cp_dieu_chinh + cp_trai_giam ; tong = tong_khong_phbc + cp_phbc + bo_sung_ctv
 *   - detail PHBC lines add up to the HRM total of cp_phbc (PHBC is never multiplied by HSCL), within the rounding of the lines
 *   - optional expected totals (summary.json of the fixture): row count and the column sums
 *   - after the insert, every stored HRM row is read back and compared with its source row, column by column
 */
const crypto = require('crypto');
const fs = require('fs');
const { open, run, all, get, close, inTransaction, audit } = require('./incSqlite');

const KQ_COLUMNS = ['ky', 'ma_hrm', 'ma_buu_ta', 'ho_ten', 'loai_hd', 'so_ptc', 'cp_buu_gui', 'cp_dhl', 'cp_bpt', 'cp_ph', 'cp_dieu_chinh',
    'tong_khong_phbc', 'cp_phbc', 'bo_sung_ctv', 'tong', 'don_vi', 'hscl', 'cp_truoc_hscl', 'cp_sau_hscl', 'cp_trai_giam'];
const KQ_TEXT = new Set(['ky', 'ma_hrm', 'ma_buu_ta', 'ho_ten', 'loai_hd', 'don_vi']);
const CT_COLUMNS = ['ky', 'ma_buu_ta', 'ma_tuyen', 'nhom', 'khoan', 'so_luong', 'thanh_tien'];
const CT_TEXT = new Set(['ky', 'ma_buu_ta', 'ma_tuyen', 'khoan']);
const SUM_COLUMNS = ['so_ptc', 'cp_buu_gui', 'cp_dhl', 'cp_bpt', 'cp_ph', 'cp_dieu_chinh', 'tong_khong_phbc', 'cp_phbc', 'bo_sung_ctv', 'tong', 'cp_trai_giam'];
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/** RFC 4180 reader; keeps every cell as text (so 00061885 stays 00061885). */
function parseCsv(content) {
    const rows = []; let row = []; let cell = ''; let quoted = false;
    const text = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false; } else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i += 1;
            row.push(cell); cell = ''; if (row.some((c) => c !== '')) rows.push(row); row = [];
        } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); if (row.some((c) => c !== '')) rows.push(row); }
    return rows;
}

function readTable(file, columns, textColumns, label) {
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));
    if (!rows.length) throw new Error(`${label}: empty file`);
    if (JSON.stringify(rows[0]) !== JSON.stringify(columns)) throw new Error(`${label}: unexpected header ${rows[0].join(',')}`);
    return rows.slice(1).map((cells, i) => {
        if (cells.length !== columns.length) throw new Error(`${label}: row ${i + 2} has ${cells.length} cells, expected ${columns.length}`);
        const out = {};
        columns.forEach((name, c) => {
            if (textColumns.has(name)) out[name] = cells[c].normalize('NFC');
            else { const v = cells[c] === '' ? 0 : Number(cells[c]); if (!Number.isFinite(v)) throw new Error(`${label}: row ${i + 2} column ${name} is not a number (${cells[c]})`); out[name] = v; }
        });
        return out;
    });
}

function validate(ky, kq, ct, expected) {
    const problems = [];
    const seen = new Set();
    for (const r of kq) {
        if (r.ky !== ky) problems.push(`kq_phat: HRM ${r.ma_hrm} has period ${r.ky}, expected ${ky}`);
        if (!r.ma_hrm) problems.push('kq_phat: a row has no ma_hrm');
        if (seen.has(r.ma_hrm)) problems.push(`kq_phat: duplicate ma_hrm ${r.ma_hrm}`);
        seen.add(r.ma_hrm);
        if (Math.abs(r.tong_khong_phbc - (r.cp_buu_gui + r.cp_dhl + r.cp_bpt + r.cp_ph + r.cp_dieu_chinh + r.cp_trai_giam)) > 0.5) problems.push(`HRM ${r.ma_hrm}: tong_khong_phbc is not the sum of its parts`);
        if (Math.abs(r.tong - (r.tong_khong_phbc + r.cp_phbc + r.bo_sung_ctv)) > 0.5) problems.push(`HRM ${r.ma_hrm}: tong is not tong_khong_phbc + cp_phbc + bo_sung_ctv`);
    }
    for (const r of ct) if (r.ky !== ky) problems.push(`kq_phat_ct: line of ${r.ma_buu_ta} has period ${r.ky}, expected ${ky}`);
    const phbcLines = ct.filter((r) => r.khoan === 'PHBC');
    const phbcDetail = phbcLines.reduce((s, r) => s + r.thanh_tien, 0); const phbcTotal = kq.reduce((s, r) => s + r.cp_phbc, 0);
    if (Math.abs(phbcDetail - phbcTotal) > Math.max(1, phbcLines.length)) problems.push(`PHBC detail ${phbcDetail} does not match cp_phbc total ${phbcTotal}`);
    const totals = { n: kq.length };
    for (const c of SUM_COLUMNS) totals[c] = kq.reduce((s, r) => s + r[c], 0);
    if (expected) {
        if (expected.n !== undefined && expected.n !== totals.n) problems.push(`row count ${totals.n} != expected ${expected.n}`);
        for (const c of SUM_COLUMNS) {
            const key = ({ so_ptc: 'ptc', cp_buu_gui: 'bg', cp_dhl: 'dhl', cp_bpt: 'bpt', cp_ph: 'ph', cp_dieu_chinh: 'dc', cp_phbc: 'phbc', bo_sung_ctv: 'ctv', cp_trai_giam: 'tg' })[c] || c;
            if (expected[key] !== undefined && Math.abs(expected[key] - totals[c]) > 0.5) problems.push(`sum of ${c} ${totals[c]} != expected ${expected[key]}`);
        }
    }
    return { problems, totals };
}

async function importPmtlResults({ db: dbPath, ky, kqFile, ctFile, expected, actor, dryRun = false }) {
    if (!PERIOD.test(ky || '')) throw new Error('ky must be YYYY-MM');
    const kq = readTable(kqFile, KQ_COLUMNS, KQ_TEXT, 'kq_phat');
    const ct = readTable(ctFile, CT_COLUMNS, CT_TEXT, 'kq_phat_ct');
    const { problems, totals } = validate(ky, kq, ct, expected);
    if (problems.length) throw new Error(`Import refused, ${problems.length} problem(s): ${problems.slice(0, 5).join('; ')}`);
    const fingerprint = crypto.createHash('sha256').update(fs.readFileSync(kqFile)).update(fs.readFileSync(ctFile)).digest('hex');

    const db = await open(dbPath);
    try {
        return await inTransaction(db, async () => {
            if (await get(db, 'SELECT 1 FROM inc_period WHERE ky = ?', [ky])) throw new Error(`Period ${ky} already exists in inc_period; PMTL results are never imported over an existing period`);
            const now = new Date().toISOString();
            await run(db, "INSERT INTO inc_period (ky, trang_thai, nguon, note, source_fingerprint, created_at) VALUES (?, 'DA_TINH', 'PMTL', ?, ?, ?)",
                [ky, 'Results of the PMTL calculation imported as they were; not recalculated', fingerprint, now]);
            const columnsSql = `${KQ_COLUMNS.join(', ')}, nguon`;
            for (const r of kq) await run(db, `INSERT INTO inc_result (${columnsSql}) VALUES (${KQ_COLUMNS.map(() => '?').join(',')}, 'PMTL')`, KQ_COLUMNS.map((c) => r[c]));
            for (const r of ct) await run(db, `INSERT INTO inc_result_detail (${CT_COLUMNS.join(', ')}) VALUES (${CT_COLUMNS.map(() => '?').join(',')})`, CT_COLUMNS.map((c) => r[c]));

            // read back: every HRM equals its source row, and the sums equal the source sums
            const stored = new Map((await all(db, 'SELECT * FROM inc_result WHERE ky = ?', [ky])).map((r) => [r.ma_hrm, r]));
            const mismatches = [];
            for (const src of kq) {
                const got = stored.get(src.ma_hrm);
                if (!got) { mismatches.push(`HRM ${src.ma_hrm} missing after insert`); continue; }
                for (const c of KQ_COLUMNS) {
                    const same = KQ_TEXT.has(c) ? String(got[c] ?? '') === src[c] : Number(got[c]) === src[c];
                    if (!same) mismatches.push(`HRM ${src.ma_hrm} column ${c}: stored ${got[c]} source ${src[c]}`);
                }
            }
            if (stored.size !== kq.length) mismatches.push(`stored ${stored.size} rows, source ${kq.length}`);
            const detailCount = (await get(db, 'SELECT COUNT(*) AS n FROM inc_result_detail WHERE ky = ?', [ky])).n;
            if (detailCount !== ct.length) mismatches.push(`stored ${detailCount} detail rows, source ${ct.length}`);
            if (mismatches.length) throw new Error(`Read-back check failed, ${mismatches.length} difference(s): ${mismatches.slice(0, 5).join('; ')}`);

            await run(db, "UPDATE inc_period SET trang_thai = 'KHOA', locked_at = ?, locked_by = ? WHERE ky = ?", [now, actor || 'unknown', ky]);
            const result = { ky, hrmRows: kq.length, detailRows: ct.length, totals, fingerprint, status: 'KHOA', dryRun };
            await audit(db, actor, 'import_pmtl_results', ky, result);
            return result;
        }, { dryRun });
    } finally { await close(db); }
}

module.exports = { importPmtlResults, parseCsv, KQ_COLUMNS, CT_COLUMNS };
