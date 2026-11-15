// INC-PHAT-01 - catalogue loaders, on a temporary database and FAKE data only (no real names, HRM codes or pay).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');

const { applyIncPhat01Schema } = require('../../../migrate_inc_phat_01_schema');
const imp = require('./incCatalogImporters');
const { open, all, get, run, close } = require('./incSqlite');

const tmp = (name) => path.join(os.tmpdir(), `inc-cat-${Date.now()}-${Math.random().toString(16).slice(2)}-${name}`);
async function newDb() { const p = tmp('db.sqlite'); await applyIncPhat01Schema(p); return p; }
async function q(dbPath, sql, params = []) { const db = await open(dbPath); try { return await all(db, sql, params); } finally { await close(db); } }
async function workbook(file, build) { const wb = new ExcelJS.Workbook(); build(wb); await wb.xlsx.writeFile(file); return file; }

test('routes: finds the header by name, skips rows without a numeric route or a group, upserts, audits', async () => {
    const db = await newDb(); const file = tmp('tuyen.xlsx');
    try {
        await workbook(file, (wb) => {
            const ws = wb.addWorksheet('Tuyen');
            ws.addRow(['title']); ws.addRow(['mã tuyến', 'Nhóm tuyến', 'Mã nhóm', 'Mã BC phát', 'Tên BC phát']);
            ws.addRow([1000001, 'Tuyen A', 3, '100001', 'BCP Gia']); ws.addRow(['x', 'bad', 2]); ws.addRow([1000002, 'Tuyen B', null]);
        });
        const dry = await imp.importRouteGroups({ db, file, actor: 't', dryRun: true });
        assert.deepEqual([dry.written, dry.skipped], [1, 2]);
        assert.equal((await q(db, 'SELECT COUNT(*) AS n FROM inc_route_group'))[0].n, 0, 'dry run writes nothing');
        await imp.importRouteGroups({ db, file, actor: 't' });
        assert.deepEqual(await q(db, 'SELECT ma_tuyen, nhom, ten_bc FROM inc_route_group'), [{ ma_tuyen: '1000001', nhom: 3, ten_bc: 'BCP Gia' }]);
        assert.equal((await q(db, "SELECT COUNT(*) AS n FROM inc_audit_log WHERE action = 'import_route_groups'"))[0].n, 1);
    } finally { fs.rmSync(db, { force: true }); fs.rmSync(file, { force: true }); }
});

test('price by code: DB-Dongia layout (block 1085 đc, Tham chiếu, NHÓM n) replaces the table of the same validity', async () => {
    const db = await newDb(); const file = tmp('dongia.xlsx');
    try {
        await workbook(file, (wb) => {
            const ws = wb.addWorksheet('DB-Dongia');
            ws.addRow([null, 'ĐG 1054']); ws.addRow([null, null, null, '1085 đc']);
            ws.addRow(['Tên nhóm', 'NHÓM 1', 'NHÓM 2', 'NHÓM 3', 'Tham chiếu']);
            // the real sheet keeps the group columns of the 1085 block right of its label; fake layout: block label above the first group column
            ws.getRow(2).getCell(2).value = '1085 đc'; ws.getRow(2).getCell(4).value = null;
            ws.mergeCells(2, 2, 2, 4); // as in the real sheet: the label of the block is merged over its group columns
            ws.addRow(['Mã nhóm', 1, 2, 3, 'CODE_A']); ws.addRow(['x', 100.5, 200, 300, 'CODE_B']); ws.addRow(['y', 1, 2, 3, '12345']);
        });
        const r = await imp.importPriceByCode({ db, file, hieuLucTu: '2026-05', actor: 't' });
        assert.equal(r.codes, 2); assert.deepEqual(r.groups, [1, 2, 3]);
        const rows = await q(db, "SELECT r.khoan, r.nhom, r.don_gia FROM inc_price_row r JOIN inc_price_table t ON t.id = r.price_table_id WHERE t.loai = 'PHAT_MA' ORDER BY r.khoan, r.nhom");
        assert.equal(rows.length, 6); assert.deepEqual(rows.find((x) => x.khoan === 'CODE_B' && x.nhom === 1), { khoan: 'CODE_B', nhom: 1, don_gia: 100.5 });
        await imp.importPriceByCode({ db, file, hieuLucTu: '2026-05', actor: 't' });
        assert.equal((await q(db, 'SELECT COUNT(*) AS n FROM inc_price_table'))[0].n, 1, 're-load replaces, it does not duplicate');
        await assert.rejects(() => imp.importPriceByCode({ db, file, hieuLucTu: '2026-5' }), /YYYY-MM/);
    } finally { fs.rmSync(db, { force: true }); fs.rmSync(file, { force: true }); }
});

test('price tables and parameters from the PMTL don_gia.json shape, and from long sheets', async () => {
    const db = await newDb(); const json = tmp('don_gia.json'); const longFile = tmp('gia.xlsx');
    try {
        fs.writeFileSync(json, JSON.stringify({
            nhom: [1, 2], bang_gia: [{ loai: 'PHAT', van_ban: 'VB-FAKE', hieu_luc_tu: '2026-05', mo_ta: 'm', dong: { EMS: [10, 20], BK: [30, null] } }],
            tham_so: [{ khoa: 'TRAN_BUU_GUI', gia_tri: 120000, hieu_luc_tu: '2026-05', mo_ta: 'tran' }, { khoa: 'HSCL_PHAT_MAX', gia_tri: 1.1, hieu_luc_tu: '2026-09' }],
        }));
        assert.deepEqual(await imp.importPriceTables({ db, file: json }), { tables: 1, written: 3 });
        assert.equal((await imp.importParams({ db, file: json })).written, 2);
        assert.deepEqual(await q(db, 'SELECT khoa, hieu_luc_tu, gia_tri FROM inc_param ORDER BY khoa'), [{ khoa: 'HSCL_PHAT_MAX', hieu_luc_tu: '2026-09', gia_tri: 1.1 }, { khoa: 'TRAN_BUU_GUI', hieu_luc_tu: '2026-05', gia_tri: 120000 }]);
        await workbook(longFile, (wb) => { const ws = wb.addWorksheet('g'); ws.addRow(['loai', 'van_ban', 'hieu_luc_tu', 'mo_ta', 'khoan', 'nhom', 'don_gia']); ws.addRow(['DHL', 'VB2', '2026-06', '', 'DEN_10KG', 1, 5000]); ws.addRow(['BAD', 'VB2', '2026-06', '', 'X', 1, 1]); });
        await assert.rejects(() => imp.importPriceTables({ db, file: longFile }), /Invalid price table/);
        await assert.rejects(() => imp.importParams({ db, file: (fs.writeFileSync(json, JSON.stringify({ tham_so: [{ khoa: 'A', gia_tri: 1, hieu_luc_tu: 'x' }] })), json) }), /Invalid parameter/);
    } finally { fs.rmSync(db, { force: true }); fs.rmSync(json, { force: true }); fs.rmSync(longFile, { force: true }); }
});

test('postman -> HRM: adds new codes, pads HRM, fills a blank HRM, never overwrites, does not use dm_buu_ta', async () => {
    const db = await newDb(); const file = tmp('buuta.xlsx'); const file2 = tmp('buuta2.xlsx');
    try {
        await workbook(file, (wb) => { const ws = wb.addWorksheet('mã BT'); ws.addRow([]); ws.addRow([]); ws.addRow([null, null, null, 'Mã HRM', 'Mã bưu tá', 'Tên bưu tá', 'Mã HRM']); ws.addRow([null, null, null, '00000011', '53X001', 'NGUOI GIA A', { formula: 'D4', result: '00000011' }]); ws.addRow([null, null, null, 61936, '53X002', 'NGUOI GIA B']); ws.addRow([null, null, null, '', '53X003', 'NGUOI GIA C']); });
        assert.deepEqual(await imp.importPostmanHrm({ db, file }), { added: 3, filled: 0, skipped: 0 });
        assert.deepEqual((await q(db, "SELECT ma_hrm FROM inc_postman_hrm WHERE ma_buu_ta = '53X002'"))[0], { ma_hrm: '00061936' });
        await workbook(file2, (wb) => { const ws = wb.addWorksheet('x'); ws.addRow(['Mã HRM', 'Mã bưu tá', 'Tên bưu tá']); ws.addRow(['00000033', '53X003', 'NGUOI GIA C']); ws.addRow(['00000099', '53X001', 'DOI TEN']); });
        assert.deepEqual(await imp.importPostmanHrm({ db, file: file2 }), { added: 0, filled: 1, skipped: 0 });
        const rows = await q(db, 'SELECT ma_buu_ta, ma_hrm, ho_ten FROM inc_postman_hrm ORDER BY ma_buu_ta');
        assert.deepEqual(rows.map((r) => r.ma_hrm), ['00000011', '00061936', '00000033'], 'an existing HRM is never overwritten');
        assert.equal(rows[0].ho_ten, 'NGUOI GIA A');
    } finally { fs.rmSync(db, { force: true }); fs.rmSync(file, { force: true }); fs.rmSync(file2, { force: true }); }
});

test('employees: reads only the six allowed columns (an ID-number column is never stored), derives the unit from the department path', async () => {
    const db = await newDb(); const file = tmp('ld.xlsx');
    try {
        await workbook(file, (wb) => {
            const ws = wb.addWorksheet('DS');
            ws.addRow(['Mã nhân sự', 'Tên nhân viên', 'Số CCCD', 'Số điện thoại', 'Bộ phận', 'Chức danh', 'Loại hợp đồng', 'Trạng thái']);
            ws.addRow(['11', 'NGUOI GIA A', '000000000001', '0900000000', 'TCT / BĐ Huế / Đơn vị trực thuộc / Bưu điện phường Gia Một / Tổ', '1 - Nhân viên', 'Hợp đồng lao động', 'Xác nhận']);
            ws.addRow(['abc', 'bad', '', '', '', '', '', '']);
        });
        assert.deepEqual(await imp.importEmployees({ db, file }), { written: 1 });
        const rows = await q(db, 'SELECT * FROM inc_employee');
        assert.deepEqual(rows, [{ ma_hrm: '00000011', ho_ten: 'NGUOI GIA A', don_vi: 'Phường Gia Một', chuc_danh: '1 - Nhân viên', loai_hd: 'HĐLĐ', trang_thai: 'Xác nhận' }]);
        assert.deepEqual((await q(db, 'PRAGMA table_info(inc_employee)')).map((c) => c.name), ['ma_hrm', 'ho_ten', 'don_vi', 'chuc_danh', 'loai_hd', 'trang_thai']);
        assert.ok(!JSON.stringify(await q(db, 'SELECT * FROM inc_audit_log')).includes('000000000001'));
    } finally { fs.rmSync(db, { force: true }); fs.rmSync(file, { force: true }); }
});

test('HSCL exemptions and penalties: valid rows load; a locked period refuses; bad rows refuse the whole file', async () => {
    const db = await newDb(); const mien = tmp('mien.csv'); const phat = tmp('phat.csv'); const bad = tmp('bad.csv');
    try {
        fs.writeFileSync(mien, '﻿ky,ma_buu_ta,ho_ten,don_vi,tuyen,ly_do\n2026-08,53X001,NGUOI GIA A,BCVH X,Tuyen 1,thu viec\n');
        fs.writeFileSync(phat, 'ky,ma_buu_ta,diem,ghi_chu\n2026-08,53X001,5,loi\n');
        assert.equal((await imp.importHsclExempt({ db, file: mien })).written, 1);
        assert.equal((await imp.importPenalty({ db, file: phat })).written, 1);
        fs.writeFileSync(bad, 'ky,ma_buu_ta,diem\n2026-08,53X001,3\n2026-13,53X002,1\n');
        await assert.rejects(() => imp.importPenalty({ db, file: bad }), /Invalid penalty/);
        assert.equal((await q(db, 'SELECT diem FROM inc_penalty'))[0].diem, 5, 'the bad file changed nothing');
        const conn = await open(db); await run(conn, "INSERT INTO inc_period (ky, trang_thai, nguon, created_at) VALUES ('2026-08', 'KHOA', 'PMTL', 't')"); await close(conn);
        await assert.rejects(() => imp.importPenalty({ db, file: phat }), /locked/);
    } finally { for (const f of [db, mien, phat, bad]) fs.rmSync(f, { force: true }); }
});

test('csv seeds of PMTL load as they are (ctv, postman unit, DHL route) and the file type is checked', async () => {
    const db = await newDb(); const ctv = tmp('ctv.csv'); const dv = tmp('pb.csv'); const dhl = tmp('dhl.csv'); const odd = tmp('x.txt');
    try {
        fs.writeFileSync(ctv, 'ma_buu_ta,ho_ten,don_vi\n53C001,NGUOI GIA C,BCVH X\n');
        fs.writeFileSync(dv, 'ma_buu_ta,ho_ten,don_vi\n53C002,NGUOI GIA D,BCVH Y\n');
        fs.writeFileSync(dhl, 'ma_buu_ta,ma_tuyen,ghi_chu\n53C003,1000001,note\n');
        await imp.importCtv({ db, file: ctv }); await imp.importPostmanUnit({ db, file: dv }); await imp.importDhlRoute({ db, file: dhl });
        assert.equal((await q(db, 'SELECT COUNT(*) AS n FROM inc_ctv'))[0].n, 1);
        assert.equal((await q(db, 'SELECT ma_tuyen FROM inc_dhl_route'))[0].ma_tuyen, '1000001');
        fs.writeFileSync(odd, 'x');
        await assert.rejects(() => imp.importCtv({ db, file: odd }), /Unsupported file type/);
    } finally { for (const f of [db, ctv, dv, dhl, odd]) fs.rmSync(f, { force: true }); }
});
