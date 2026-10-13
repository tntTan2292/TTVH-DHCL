const XLSX = require('xlsx');
const wb = XLSX.readFile('D:/Antigravity - Project/TTVH - He thong dieu hanh chat luong/exports/533140_Thuan_Hoa_BG_khong_dat_tuan38_2026-09-17_23.xlsx');
const ws = wb.Sheets['Lô BG'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
const header = rows[1];
const idxThamChieu = header.indexOf('Tham chiếu');
const idxNguyenNhan = header.indexOf('Nguyên nhân');
const data = rows.slice(2).filter(r=>r[0]);
const distinctThamChieu = [...new Set(data.map(r=>r[idxThamChieu]))];
console.log('idxThamChieu', idxThamChieu, 'idxNguyenNhan', idxNguyenNhan);
console.log('Distinct Tham chieu values:', JSON.stringify(distinctThamChieu));

// check Tong hop sheet too
const wsT = wb.Sheets['Tổng hợp lô BG'];
const rowsT = XLSX.utils.sheet_to_json(wsT, { defval: null });
console.log('Tong hop header:', Object.keys(rowsT[0]));
