const XLSX = require('xlsx');
const wb = XLSX.readFile('D:/Antigravity - Project/TTVH - He thong dieu hanh chat luong/exports/533140_Thuan_Hoa_BG_khong_dat_tuan38_2026-09-17_23.xlsx');
console.log('Sheets:', wb.SheetNames);
const ws = wb.Sheets['Lô BG'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
console.log('Header row2 (index1):', JSON.stringify(rows[1]));
console.log('Row sample idx2:', JSON.stringify(rows[2]));
console.log('Row sample idx3:', JSON.stringify(rows[3]));
