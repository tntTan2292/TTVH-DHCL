'use strict';
/**
 * INC-PHAT-01 - loaders of the catalogues and per-period inputs of công phát, from the files PMTL uses (xlsx; the csv seeds are accepted too).
 * Header rows are found by column name as PMTL does (importers.py). Each loader runs in one transaction, writes one inc_audit_log row,
 * returns counts, and does nothing to a frozen (KHOA) period (the triggers refuse it). Nothing here reads dm_buu_ta.
 * Employees: only code, name, unit, title, contract type, status are read (never ID number, bank account, phone, birth date).
 */
const fs = require('fs');
const { open, run, all, get, close, inTransaction, audit } = require('./incSqlite');
const { readSheets, findTable, norm, text, num } = require('./incExcelReader');

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
const padHrm = (v) => { const s = text(v); return /^\d{5,8}$/.test(s) ? s.padStart(8, '0') : s; };

async function withDb(dbPath, label, actor, fn, { dryRun = false } = {}) {
    const db = await open(dbPath);
    try {
        return await inTransaction(db, async () => {
            const result = await fn(db);
            await audit(db, actor, label, null, { ...result, dryRun });
            return result;
        }, { dryRun });
    } finally { await close(db); }
}

function dataRows(table) { return table.sheet.rows.slice(table.headerRow + 1).filter((r) => r && r.some((c) => c !== null && c !== '')); }
const col = (table, ...names) => names.map(norm).map((n) => table.header.get(n)).find((c) => c !== undefined);

// ---- route -> price group (columns: mã tuyến, Mã nhóm, Nhóm tuyến, Mã BC phát, Tên BC phát | csv: ma_tuyen, nhom, ten_tuyen, ma_bc, ten_bc)
async function importRouteGroups({ db: dbPath, file, actor, dryRun }) {
    const table = findTable(await readSheets(file), [['mã tuyến', 'ma_tuyen'], ['Mã nhóm', 'nhom']]);
    if (!table) throw new Error('Route sheet not found (need columns mã tuyến and Mã nhóm)');
    const [cMa, cNhom] = table.index;
    const cTen = col(table, 'Nhóm tuyến', 'ten_tuyen'); const cBc = col(table, 'Mã BC phát', 'ma_bc'); const cTenBc = col(table, 'Tên BC phát', 'ten_bc');
    return withDb(dbPath, 'import_route_groups', actor, async (db) => {
        let written = 0; let skipped = 0;
        for (const r of dataRows(table)) {
            const ma = text(r[cMa]);
            if (!/^\d+$/.test(ma) || r[cNhom] == null || r[cNhom] === '') { skipped += 1; continue; }
            await run(db, 'INSERT OR REPLACE INTO inc_route_group (ma_tuyen, ten_tuyen, nhom, ma_bc, ten_bc) VALUES (?,?,?,?,?)',
                [ma, cTen === undefined ? '' : text(r[cTen]), Math.trunc(num(r[cNhom])), cBc === undefined ? '' : text(r[cBc]), cTenBc === undefined ? '' : text(r[cTenBc])]);
            written += 1;
        }
        return { written, skipped };
    }, { dryRun });
}

// ---- unit prices by reference code: sheet DB-Dongia, block "1085 đc", column "Tham chiếu", columns "NHÓM n" | csv: khoa, nhom_n
function readPriceByCode(sheets) {
    const csv = findTable(sheets, ['khoa']);
    if (csv && [...csv.header.keys()].some((k) => /^nhom\d+$/.test(k))) {
        const nhomCols = [...csv.header.entries()].filter(([k]) => /^nhom\d+$/.test(k)).map(([k, c]) => [c, Number(k.slice(4))]);
        const out = new Map();
        for (const r of dataRows(csv)) {
            const khoa = text(r[csv.index[0]]);
            if (!khoa) continue;
            const d = {}; for (const [c, n] of nhomCols) if (typeof r[c] === 'number') d[n] = r[c];
            if (Object.keys(d).length) out.set(khoa, d);
        }
        return { groups: [...new Set(nhomCols.map(([, n]) => n))], prices: out };
    }
    const sheet = sheets.find((s) => norm(s.name).includes('dongia')) || sheets[0];
    if (!sheet) throw new Error('Empty workbook');
    let c0; let hdr; let ref;
    sheet.rows.slice(0, 5).forEach((row, i) => row.forEach((x, j) => {
        // a merged label repeats its text in every merged cell (exceljs): the block starts at the first of them (PMTL, on openpyxl, sees only the master cell)
        if (norm(x) === '1085dc' && c0 === undefined) c0 = j;
        if (norm(x) === 'thamchieu') { hdr = i; ref = j; }
    }));
    if (c0 === undefined || ref === undefined) throw new Error("Block '1085 đc' or column 'Tham chiếu' not found (sheet DB-Dongia)");
    const nhomCols = [];
    for (let j = c0; j < c0 + 15; j += 1) {
        const m = /^nhom(\d+)$/.exec(norm(sheet.rows[hdr][j]));
        if (!m) { if (nhomCols.length) break; continue; }
        nhomCols.push([j, Number(m[1])]);
    }
    if (!nhomCols.length) throw new Error("Group columns of block '1085 đc' not found");
    const out = new Map();
    for (const r of sheet.rows.slice(hdr + 1)) {
        const khoa = text(r && r[ref]);
        if (!khoa || /^\d+$/.test(khoa)) continue;
        const d = {}; for (const [j, n] of nhomCols) if (typeof r[j] === 'number') d[n] = r[j];
        if (Object.keys(d).length) out.set(khoa.normalize('NFC'), d);
    }
    return { groups: nhomCols.map(([, n]) => n), prices: out };
}

async function replacePriceTable(db, { loai, vanBan, hieuLuc, moTa }, rows) {
    for (const t of await all(db, 'SELECT id FROM inc_price_table WHERE loai = ? AND hieu_luc_tu = ? AND van_ban IS ?', [loai, hieuLuc, vanBan])) {
        await run(db, 'DELETE FROM inc_price_row WHERE price_table_id = ?', [t.id]);
        await run(db, 'DELETE FROM inc_price_table WHERE id = ?', [t.id]);
    }
    const { lastID } = await run(db, 'INSERT INTO inc_price_table (loai, van_ban, hieu_luc_tu, mo_ta) VALUES (?,?,?,?)', [loai, vanBan, hieuLuc, moTa || null]);
    for (const [khoan, nhom, donGia] of rows) await run(db, 'INSERT INTO inc_price_row (price_table_id, khoan, nhom, don_gia) VALUES (?,?,?,?)', [lastID, khoan, nhom, donGia]);
    return lastID;
}

async function importPriceByCode({ db: dbPath, file, hieuLucTu, vanBan = 'DB-Dongia (ĐG BĐTP ĐC từ 1085)', actor, dryRun }) {
    if (!PERIOD.test(hieuLucTu || '')) throw new Error('hieuLucTu must be YYYY-MM');
    const { groups, prices } = readPriceByCode(await readSheets(file));
    return withDb(dbPath, 'import_price_by_code', actor, async (db) => {
        const rows = [...prices].flatMap(([khoa, d]) => Object.entries(d).map(([n, v]) => [khoa, Number(n), v]));
        await replacePriceTable(db, { loai: 'PHAT_MA', vanBan, hieuLuc: hieuLucTu, moTa: 'Đơn giá phát theo mã tham chiếu SERVICE+TYPE+NAME+AREA (khối 1085 đc)' }, rows);
        return { codes: prices.size, groups, written: rows.length };
    }, { dryRun });
}

// ---- document price tables PHAT / PHBC / DHL: PMTL seed/don_gia.json (bang_gia[] with dong{khoan:[price per group]} and top-level nhom[]),
//      or a long sheet: loai, van_ban, hieu_luc_tu, mo_ta, khoan, nhom, don_gia
async function readPriceTables(file) {
    if (file.toLowerCase().endsWith('.json')) {
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        const groups = json.nhom;
        return (json.bang_gia || []).map((b) => ({
            loai: b.loai, vanBan: b.van_ban || null, hieuLuc: b.hieu_luc_tu, moTa: b.mo_ta,
            rows: Object.entries(b.dong || {}).flatMap(([khoan, prices]) => prices.map((v, i) => [khoan, groups[i], v]).filter(([, g, v]) => g != null && v != null)),
        }));
    }
    const table = findTable(await readSheets(file), ['loai', 'hieu_luc_tu', 'khoan', 'nhom', 'don_gia']);
    if (!table) throw new Error('Price sheet not found (need loai, hieu_luc_tu, khoan, nhom, don_gia)');
    const [cLoai, cHl, cKhoan, cNhom, cGia] = table.index; const cVb = col(table, 'van_ban'); const cMt = col(table, 'mo_ta');
    const byKey = new Map();
    for (const r of dataRows(table)) {
        const key = [text(r[cLoai]), text(r[cHl]), cVb === undefined ? '' : text(r[cVb])].join('|');
        if (!byKey.has(key)) byKey.set(key, { loai: text(r[cLoai]).toUpperCase(), vanBan: cVb === undefined ? null : text(r[cVb]) || null, hieuLuc: text(r[cHl]), moTa: cMt === undefined ? null : text(r[cMt]), rows: [] });
        byKey.get(key).rows.push([text(r[cKhoan]), Math.trunc(num(r[cNhom])), num(r[cGia])]);
    }
    return [...byKey.values()];
}

async function importPriceTables({ db: dbPath, file, actor, dryRun }) {
    const tables = await readPriceTables(file);
    for (const t of tables) if (!['PHAT', 'PHAT_MA', 'PHBC', 'DHL'].includes(t.loai) || !PERIOD.test(t.hieuLuc || '')) throw new Error(`Invalid price table (${t.loai} / ${t.hieuLuc})`);
    return withDb(dbPath, 'import_price_tables', actor, async (db) => {
        let written = 0;
        for (const t of tables) { await replacePriceTable(db, t, t.rows); written += t.rows.length; }
        return { tables: tables.length, written };
    }, { dryRun });
}

// ---- parameters by validity period: don_gia.json tham_so[] {khoa, gia_tri, hieu_luc_tu, mo_ta} or sheet khoa, gia_tri, hieu_luc_tu, mo_ta
async function importParams({ db: dbPath, file, actor, dryRun }) {
    let params;
    if (file.toLowerCase().endsWith('.json')) {
        params = (JSON.parse(fs.readFileSync(file, 'utf8')).tham_so || []).map((p) => ({ khoa: p.khoa, gia: p.gia_tri, hl: p.hieu_luc_tu, mo: p.mo_ta }));
    } else {
        const table = findTable(await readSheets(file), ['khoa', 'gia_tri', 'hieu_luc_tu']);
        if (!table) throw new Error('Parameter sheet not found (need khoa, gia_tri, hieu_luc_tu)');
        const cMo = col(table, 'mo_ta');
        params = dataRows(table).map((r) => ({ khoa: text(r[table.index[0]]), gia: num(r[table.index[1]]), hl: text(r[table.index[2]]), mo: cMo === undefined ? null : text(r[cMo]) }));
    }
    for (const p of params) if (!p.khoa || typeof p.gia !== 'number' || !PERIOD.test(p.hl || '')) throw new Error(`Invalid parameter row (${p.khoa} / ${p.hl})`);
    return withDb(dbPath, 'import_params', actor, async (db) => {
        for (const p of params) await run(db, 'INSERT OR REPLACE INTO inc_param (khoa, hieu_luc_tu, gia_tri, mo_ta) VALUES (?,?,?,?)', [p.khoa, p.hl, p.gia, p.mo || null]);
        return { written: params.length };
    }, { dryRun });
}

// ---- postman -> HRM (file "Buu ta.xlsx": Mã HRM, Mã bưu tá, Tên bưu tá | csv: ma_buu_ta, ma_hrm, ho_ten). Adds new codes, fills a blank HRM, never overwrites.
async function importPostmanHrm({ db: dbPath, file, actor, dryRun }) {
    const table = findTable(await readSheets(file), [['Mã HRM', 'ma_hrm'], ['Mã bưu tá', 'ma_buu_ta']]);
    if (!table) throw new Error('Postman sheet not found (need columns Mã HRM and Mã bưu tá)');
    const [cHrm, cMa] = table.index; const cTen = col(table, 'Tên bưu tá', 'ho_ten');
    return withDb(dbPath, 'import_postman_hrm', actor, async (db) => {
        let added = 0; let filled = 0; let skipped = 0;
        for (const r of dataRows(table)) {
            const ma = text(r[cMa]); const hrm = padHrm(r[cHrm]);
            if (!ma) { skipped += 1; continue; }
            const old = await get(db, 'SELECT ma_hrm FROM inc_postman_hrm WHERE ma_buu_ta = ?', [ma]);
            if (!old) { await run(db, 'INSERT INTO inc_postman_hrm (ma_buu_ta, ma_hrm, ho_ten) VALUES (?,?,?)', [ma, hrm, cTen === undefined ? '' : text(r[cTen])]); added += 1; }
            else if (!old.ma_hrm && hrm) { await run(db, 'UPDATE inc_postman_hrm SET ma_hrm = ? WHERE ma_buu_ta = ?', [hrm, ma]); filled += 1; }
        }
        return { added, filled, skipped };
    }, { dryRun });
}

// ---- employees ("Danh sách lao động Full": Mã nhân sự, Tên nhân viên, Bộ phận, Đơn vị, Chức danh, Loại hợp đồng, Trạng thái | csv: ma_hrm, ho_ten, don_vi, chuc_danh, loai_hd, trang_thai)
function donViTuBoPhan(bp) {
    const seg = String(bp || '').split('/').map((x) => x.trim()).filter(Boolean);
    const i = seg.findIndex((x) => ['đơn vị trực thuộc', 'khối văn phòng'].includes(x.toLowerCase()));
    if (i < 0 || i + 1 >= seg.length) return '';
    let dv = seg[i + 1]; const low = dv.toLowerCase();
    if (low.startsWith('bưu điện phường ')) dv = `Phường ${dv.slice(16)}`;
    else if (low.startsWith('bưu điện xã ')) dv = `Xã ${dv.slice(12)}`;
    else if (low === 'bưu cục khai thác') dv = 'Bưu cục Khai thác';
    return dv;
}
const loaiHd = (raw) => { const s = text(raw).toLowerCase(); return s.includes('cộng tác') ? 'CTV' : s.includes('khoán') ? 'LĐTK' : (s.includes('hđlđ') || s.includes('lao động')) ? 'HĐLĐ' : text(raw); };

async function importEmployees({ db: dbPath, file, actor, dryRun }) {
    const sheets = await readSheets(file);
    const rows = [];
    const pmtl = []; for (const sheet of sheets) { const t = findTable([sheet], ['Mã nhân sự', 'Tên nhân viên']); if (t) pmtl.push(t); }
    if (pmtl.length) {
        for (const t of pmtl) {
            const [cMa, cTen] = t.index; const cCd = [...t.header.entries()].find(([k]) => k.includes('chucdanh'))?.[1];
            const cLhd = [...t.header.entries()].find(([k]) => k.includes('loaihopdong'))?.[1];
            const cBp = col(t, 'Bộ phận'); const cDv = col(t, 'Đơn vị'); const cTt = col(t, 'Trạng thái');
            for (const r of dataRows(t)) {
                const ma = text(r[cMa]); if (!/^\d+$/.test(ma)) continue;
                let donVi = cDv === undefined ? '' : text(r[cDv]);
                if (!donVi && cBp !== undefined) {
                    donVi = donViTuBoPhan(text(r[cBp]));
                    if (!donVi) { donVi = text(r[cBp]).split('/').pop().trim(); if (/^\d+$/.test(donVi.replace(/ /g, '')) || donVi.toLowerCase().includes('tổng công ty')) donVi = ''; }
                }
                rows.push([ma.padStart(8, '0'), text(r[cTen]), donVi, cCd === undefined ? '' : text(r[cCd]), cLhd === undefined ? '' : loaiHd(r[cLhd]), cTt === undefined ? '' : text(r[cTt])]);
            }
        }
    } else {
        const t = findTable(sheets, [['ma_hrm', 'Mã nhân sự'], ['ho_ten', 'Tên nhân viên']]);
        if (!t) throw new Error('Employee sheet not found (need Mã nhân sự + Tên nhân viên, or ma_hrm + ho_ten)');
        for (const r of dataRows(t)) {
            const g = (...n) => { const c = col(t, ...n); return c === undefined ? '' : text(r[c]); };
            const ma = padHrm(r[t.index[0]]); if (!ma) continue;
            rows.push([ma, text(r[t.index[1]]), g('don_vi'), g('chuc_danh'), g('loai_hd'), g('trang_thai')]);
        }
    }
    return withDb(dbPath, 'import_employees', actor, async (db) => {
        for (const r of rows) await run(db, 'INSERT OR REPLACE INTO inc_employee (ma_hrm, ho_ten, don_vi, chuc_danh, loai_hd, trang_thai) VALUES (?,?,?,?,?,?)', r);
        return { written: rows.length };
    }, { dryRun });
}

// ---- per-period / catalogue inputs, csv seeds of PMTL
async function importHsclExempt({ db: dbPath, file, actor, dryRun }) {
    const t = findTable(await readSheets(file), ['ky', 'ma_buu_ta']);
    if (!t) throw new Error('Exemption sheet not found (need ky, ma_buu_ta)');
    const rows = dataRows(t).map((r) => [text(r[t.index[0]]), text(r[t.index[1]]), ...['ho_ten', 'don_vi', 'tuyen', 'ly_do'].map((n) => { const c = col(t, n); return c === undefined ? '' : text(r[c]); })]);
    for (const r of rows) if (!PERIOD.test(r[0]) || !r[1]) throw new Error(`Invalid exemption row (${r[0]} / ${r[1]})`);
    return withDb(dbPath, 'import_hscl_exempt', actor, async (db) => {
        for (const r of rows) await run(db, 'INSERT OR REPLACE INTO inc_hscl_exempt (ky, ma_buu_ta, ho_ten, don_vi, tuyen, ly_do) VALUES (?,?,?,?,?,?)', r);
        return { written: rows.length, periods: [...new Set(rows.map((r) => r[0]))] };
    }, { dryRun });
}

async function importPenalty({ db: dbPath, file, actor, dryRun }) {
    const t = findTable(await readSheets(file), ['ky', 'ma_buu_ta', 'diem']);
    if (!t) throw new Error('Penalty sheet not found (need ky, ma_buu_ta, diem)');
    const cGc = col(t, 'ghi_chu');
    const rows = dataRows(t).map((r) => [text(r[t.index[0]]), text(r[t.index[1]]), num(r[t.index[2]]), cGc === undefined ? '' : text(r[cGc])]);
    for (const r of rows) if (!PERIOD.test(r[0]) || !r[1] || r[2] < 0) throw new Error(`Invalid penalty row (${r[0]} / ${r[1]} / ${r[2]})`);
    return withDb(dbPath, 'import_penalty', actor, async (db) => {
        for (const r of rows) await run(db, 'INSERT OR REPLACE INTO inc_penalty (ky, ma_buu_ta, diem, ghi_chu) VALUES (?,?,?,?)', r);
        return { written: rows.length, periods: [...new Set(rows.map((r) => r[0]))] };
    }, { dryRun });
}

function simpleLoader(label, table, required, columns) {
    return async function load({ db: dbPath, file, actor, dryRun }) {
        const t = findTable(await readSheets(file), required);
        if (!t) throw new Error(`${label}: sheet not found (need ${required.join(', ')})`);
        const rows = dataRows(t).map((r) => columns.map((n) => { const c = col(t, n); return c === undefined ? '' : text(r[c]); })).filter((r) => r[0]);
        return withDb(dbPath, `import_${label}`, actor, async (db) => {
            for (const r of rows) await run(db, `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(',')})`, r);
            return { written: rows.length };
        }, { dryRun });
    };
}
const importCtv = simpleLoader('ctv', 'inc_ctv', ['ma_buu_ta'], ['ma_buu_ta', 'ho_ten', 'don_vi']);
const importPostmanUnit = simpleLoader('postman_unit', 'inc_postman_unit', ['ma_buu_ta', 'don_vi'], ['ma_buu_ta', 'ho_ten', 'don_vi']);
const importDhlRoute = simpleLoader('dhl_route', 'inc_dhl_route', ['ma_buu_ta', 'ma_tuyen'], ['ma_buu_ta', 'ma_tuyen', 'ghi_chu']);

module.exports = {
    importRouteGroups, importPriceByCode, importPriceTables, importParams, importPostmanHrm, importEmployees,
    importHsclExempt, importPenalty, importCtv, importPostmanUnit, importDhlRoute, padHrm, donViTuBoPhan,
};
