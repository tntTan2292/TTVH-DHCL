// INC-PHAT-01 - import of stored PMTL results, on a temporary database and FAKE results only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { applyIncPhat01Schema } = require('../../../migrate_inc_phat_01_schema');
const { importPmtlResults, parseCsv, KQ_COLUMNS, CT_COLUMNS } = require('./incPmtlResultImporter');
const { open, all, run, close } = require('./incSqlite');

const tmp = (name) => path.join(os.tmpdir(), `inc-pmtl-${Date.now()}-${Math.random().toString(16).slice(2)}-${name}`);
const csvLine = (cells) => cells.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(',');

function kqRow(ky, hrm, over = {}) {
    const base = { ky, ma_hrm: hrm, ma_buu_ta: `53F${hrm.slice(-3)}`, ho_ten: 'NGUOI GIA', loai_hd: 'HĐLĐ', so_ptc: 10, cp_buu_gui: 1000, cp_dhl: 200, cp_bpt: 30, cp_ph: 40, cp_dieu_chinh: 0,
        tong_khong_phbc: 1270, cp_phbc: 500, bo_sung_ctv: 0, tong: 1770, don_vi: 'BCVH Gia, Mot', hscl: 0.9876, cp_truoc_hscl: 1300, cp_sau_hscl: 1270, cp_trai_giam: 0 };
    return { ...base, ...over };
}
function files(ky, rows, ctRows) {
    const kq = tmp('kq.csv'); const ct = tmp('ct.csv');
    fs.writeFileSync(kq, `﻿${[KQ_COLUMNS.join(','), ...rows.map((r) => csvLine(KQ_COLUMNS.map((c) => r[c])))].join('\n')}\n`);
    fs.writeFileSync(ct, `﻿${[CT_COLUMNS.join(','), ...ctRows.map((r) => csvLine(CT_COLUMNS.map((c) => r[c])))].join('\n')}\n`);
    return { kq, ct };
}
const phbcRow = (ky) => ({ ky, ma_buu_ta: '53F001', ma_tuyen: '1000001', nhom: 3, khoan: 'PHBC', so_luong: 5, thanh_tien: 500 });
const ctRow = (ky, over = {}) => ({ ky, ma_buu_ta: '53F001', ma_tuyen: '1000001', nhom: 3, khoan: 'EMS', so_luong: 5, thanh_tien: 1000, ...over });
async function newDb() { const p = tmp('db.sqlite'); await applyIncPhat01Schema(p); return p; }
async function q(dbPath, sql, params = []) { const db = await open(dbPath); try { return await all(db, sql, params); } finally { await close(db); } }
const cleanup = (...fs_) => fs_.forEach((f) => fs.rmSync(f, { force: true }));

test('csv reader keeps leading zeros and quoted commas as text', () => {
    assert.deepEqual(parseCsv('﻿a,b\n00061885,"x, y"\r\n"he said ""hi""",z\n'), [['a', 'b'], ['00061885', 'x, y'], ['he said "hi"', 'z']]);
});

test('imports one period as it was, stores every HRM equal to its source, locks the period, audits', async () => {
    const db = await newDb(); const ky = '2026-08';
    const rows = [kqRow(ky, '00000001'), kqRow(ky, '00000002', { cp_phbc: 0, tong: 1270, ho_ten: 'NGUOI GIA, HAI' })];
    const { kq, ct } = files(ky, rows, [ctRow(ky), ctRow(ky, { khoan: 'PHBC', thanh_tien: 500, ma_buu_ta: '53F001' })]);
    try {
        const result = await importPmtlResults({ db, ky, kqFile: kq, ctFile: ct, expected: { n: 2, bg: 2000, tong: 3040 }, actor: 'tester' });
        assert.equal(result.status, 'KHOA'); assert.equal(result.hrmRows, 2); assert.equal(result.detailRows, 2); assert.equal(result.totals.tong, 3040);
        const stored = await q(db, 'SELECT * FROM inc_result ORDER BY ma_hrm');
        assert.equal(stored.length, 2); assert.equal(stored[0].ma_hrm, '00000001'); assert.equal(stored[0].hscl, 0.9876); assert.equal(stored[1].ho_ten, 'NGUOI GIA, HAI');
        assert.ok(stored.every((r) => r.nguon === 'PMTL'));
        const period = (await q(db, 'SELECT * FROM inc_period'))[0];
        assert.deepEqual([period.ky, period.trang_thai, period.nguon, period.locked_by], [ky, 'KHOA', 'PMTL', 'tester']); assert.match(period.source_fingerprint, /^[0-9a-f]{64}$/);
        assert.equal((await q(db, "SELECT COUNT(*) AS n FROM inc_audit_log WHERE action = 'import_pmtl_results' AND ky = ?", [ky]))[0].n, 1);
        // frozen: nothing can be changed, recalculated in place, or imported again
        const conn = await open(db);
        await assert.rejects(() => run(conn, "UPDATE inc_result SET tong = 1 WHERE ky = '2026-08'"), /locked/);
        await assert.rejects(() => run(conn, "DELETE FROM inc_result_detail WHERE ky = '2026-08'"), /locked/);
        await close(conn);
        await assert.rejects(() => importPmtlResults({ db, ky, kqFile: kq, ctFile: ct, actor: 'tester' }), /already exists/);
    } finally { cleanup(db, kq, ct); }
});

test('dry run writes nothing', async () => {
    const db = await newDb(); const ky = '2026-08';
    const { kq, ct } = files(ky, [kqRow(ky, '00000001')], [ctRow(ky), phbcRow(ky)]);
    try {
        const result = await importPmtlResults({ db, ky, kqFile: kq, ctFile: ct, actor: 't', dryRun: true });
        assert.equal(result.dryRun, true);
        for (const t of ['inc_period', 'inc_result', 'inc_result_detail', 'inc_audit_log']) assert.equal((await q(db, `SELECT COUNT(*) AS n FROM ${t}`))[0].n, 0, t);
    } finally { cleanup(db, kq, ct); }
});

test('refuses, and writes nothing, when a check fails: wrong period, duplicate HRM, broken sum, wrong expected totals, bad header', async () => {
    const db = await newDb(); const ky = '2026-08';
    const cases = [
        [[kqRow('2026-09', '00000001')], [ctRow('2026-09')], undefined, /has period 2026-09/],
        [[kqRow(ky, '00000001'), kqRow(ky, '00000001')], [ctRow(ky)], undefined, /duplicate ma_hrm/],
        [[kqRow(ky, '00000001', { tong: 9999 })], [ctRow(ky)], undefined, /tong is not/],
        [[kqRow(ky, '00000001', { tong_khong_phbc: 5 })], [ctRow(ky)], undefined, /not the sum of its parts/],
        [[kqRow(ky, '00000001')], [ctRow(ky, { khoan: 'PHBC', thanh_tien: 100 })], undefined, /PHBC detail/],
        [[kqRow(ky, '00000001')], [ctRow(ky)], { n: 2 }, /row count/],
        [[kqRow(ky, '00000001')], [ctRow(ky)], { tong: 1 }, /sum of tong/],
    ];
    try {
        for (const [rows, ctRows, expected, pattern] of cases) {
            const { kq, ct } = files(ky, rows, ctRows);
            try { await assert.rejects(() => importPmtlResults({ db, ky, kqFile: kq, ctFile: ct, expected, actor: 't' }), pattern); } finally { cleanup(kq, ct); }
        }
        const bad = tmp('bad.csv'); const { ct } = files(ky, [kqRow(ky, '00000001')], [ctRow(ky)]);
        fs.writeFileSync(bad, 'ky,ma_hrm\n2026-08,00000001\n');
        await assert.rejects(() => importPmtlResults({ db, ky, kqFile: bad, ctFile: ct, actor: 't' }), /unexpected header/);
        cleanup(bad, ct);
        for (const t of ['inc_period', 'inc_result', 'inc_result_detail']) assert.equal((await q(db, `SELECT COUNT(*) AS n FROM ${t}`))[0].n, 0, t);
        await assert.rejects(() => importPmtlResults({ db, ky: '2026-8', kqFile: 'x', ctFile: 'y' }), /YYYY-MM/);
    } finally { cleanup(db); }
});

test('a row of another period cannot sneak into a period that is already locked (failure after a first good import leaves it intact)', async () => {
    const db = await newDb();
    const a = files('2026-08', [kqRow('2026-08', '00000001')], [ctRow('2026-08'), phbcRow('2026-08')]);
    const b = files('2026-09', [kqRow('2026-09', '00000001', { tong: 1 })], [ctRow('2026-09'), phbcRow('2026-09')]);
    try {
        await importPmtlResults({ db, ky: '2026-08', kqFile: a.kq, ctFile: a.ct, actor: 't' });
        await assert.rejects(() => importPmtlResults({ db, ky: '2026-09', kqFile: b.kq, ctFile: b.ct, actor: 't' }), /tong is not/);
        assert.deepEqual(await q(db, 'SELECT ky, COUNT(*) AS n FROM inc_result GROUP BY ky'), [{ ky: '2026-08', n: 1 }]);
    } finally { cleanup(db, a.kq, a.ct, b.kq, b.ct); }
});
