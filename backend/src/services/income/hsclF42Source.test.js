// INC-PHAT-03 - F4.2 source from fact_f42, temporary database and FAKE rows only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadF42Rows, monthRange, toF42Rows } = require('./hsclF42Source');
const { calculateHscl } = require('./hsclCalculator');
const sqlite3 = require('sqlite3').verbose();
const { open, run, all, close } = require('./incSqlite');

const tmp = () => path.join(os.tmpdir(), `inc-f42-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
async function fakeDb(rows) {
    const p = tmp();
    const db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(p, (e) => (e ? reject(e) : resolve(d))); });
    await run(db, 'CREATE TABLE fact_f42 (id INTEGER PRIMARY KEY, ngay_do_kiem DATE, ma_buu_ta TEXT, ten_buu_ta TEXT, ten_bc_phat TEXT, danh_gia TEXT)');
    for (const r of rows) await run(db, 'INSERT INTO fact_f42 (ngay_do_kiem, ma_buu_ta, ten_buu_ta, ten_bc_phat, danh_gia) VALUES (?,?,?,?,?)', r);
    await close(db); return p;
}

test('month range, including a short month and an invalid period', () => {
    assert.deepEqual(monthRange('2026-02'), ['2026-02-01', '2026-02-28']);
    assert.deepEqual(monthRange('2026-10'), ['2026-10-01', '2026-10-31']);
    assert.throws(() => monthRange('2026-1'), /YYYY-MM/);
});

test('sl_mau counts every row of the postman (also a blank rating), sl_dung only Đạt; other months and blank postmen are left out; a postman at two BC stays two rows', async () => {
    const db = await fakeDb([
        ['2026-09-01', 'P1', 'NGUOI GIA A', 'BCVH Gia', 'Đạt'], ['2026-09-02', 'P1', 'NGUOI GIA A', 'BCVH Gia', 'Đạt'], ['2026-09-30', 'P1', 'NGUOI GIA A', 'BCVH Gia', 'Không đạt'], ['2026-09-15', 'P1', 'NGUOI GIA A', 'BCVH Gia', null],
        ['2026-08-31', 'P1', 'NGUOI GIA A', 'BCVH Gia', 'Đạt'], ['2026-10-01', 'P1', 'NGUOI GIA A', 'BCVH Gia', 'Đạt'],
        ['2026-09-05', ' P2 ', 'NGUOI GIA B', 'BCP Gia', 'Đạt'], ['2026-09-06', 'P2', 'NGUOI GIA B', 'BCVH Gia', 'Không đạt'],
        ['2026-09-07', '', 'KHONG MA', 'BCVH Gia', 'Đạt'], ['2026-09-08', null, 'KHONG MA', 'BCVH Gia', 'Đạt'],
    ]);
    try {
        const rows = await loadF42Rows(db, '2026-09');
        assert.deepEqual(rows, [
            { ma_buu_ta: 'P1', ho_ten: 'NGUOI GIA A', ten_bc: 'BCVH Gia', sl_mau: 4, sl_dung: 2 },
            { ma_buu_ta: 'P2', ho_ten: 'NGUOI GIA B', ten_bc: 'BCP Gia', sl_mau: 1, sl_dung: 1 },
            { ma_buu_ta: 'P2', ho_ten: 'NGUOI GIA B', ten_bc: 'BCVH Gia', sl_mau: 1, sl_dung: 0 },
        ]);
        assert.deepEqual(await loadF42Rows(db, '2026-07'), []);
    } finally { fs.rmSync(db, { force: true }); }
});

test('read only: the database file is byte-for-byte the same after a load, and a write through the connection is impossible', async () => {
    const db = await fakeDb([['2026-09-01', 'P1', 'NGUOI GIA A', 'BCVH Gia', 'Đạt']]);
    try {
        const before = fs.readFileSync(db);
        await loadF42Rows(db, '2026-09');
        assert.ok(before.equals(fs.readFileSync(db)));
        const ro = await open(db, { readOnly: true });
        await assert.rejects(() => run(ro, 'DELETE FROM fact_f42'), /readonly|read-only/i);
        await close(ro);
        const check = await open(db); assert.equal((await all(check, 'SELECT COUNT(*) AS n FROM fact_f42'))[0].n, 1); await close(check);
    } finally { fs.rmSync(db, { force: true }); }
});

test('the rows feed hsclCalculator as they are (rate = Đạt / rows, limits 97-102 %)', async () => {
    const rows = toF42Rows([{ ma_buu_ta: 'P1', ho_ten: 'x', ten_bc: 'BCVH Gia', sl_mau: 100, sl_dung: 92 }, { ma_buu_ta: 'P2', ho_ten: 'x', ten_bc: 'BCVH Gia', sl_mau: 100, sl_dung: 50 }]);
    const hs = calculateHscl({ f42Rows: rows, limits: { kh: 0.9, min: 0.97, max: 1.02, toanBo: true } });
    assert.equal(hs.get('P1').hs, 1.02);   // 0.92 / 0.9 = 1.0222 -> cap
    assert.equal(hs.get('P2').hs, 0.97);   // 0.5556 -> floor
});
