const fs = require('fs');
const path = require('path');
const { all } = require('./backend/src/config/db');

(async () => {
  const rows = await all(`
    SELECT 
      ma_tinh_phat, 
      ten_tinh_phat, 
      SUM(sl_bg_ptc) as total_bg_ptc,
      SUM(sl_ptc_dung_qd_ct) as total_dung_ct,
      ROUND(CAST(SUM(sl_ptc_dung_qd_ct) AS REAL) / NULLIF(SUM(sl_bg_ptc), 0) * 100, 2) as tl_dung_ct
    FROM fact_f13_national 
    WHERE ngay_do_kiem LIKE '2026-07%'
    GROUP BY ma_tinh_phat, ten_tinh_phat
    ORDER BY tl_dung_ct DESC, total_bg_ptc DESC
  `);

  // 1. Generate CSV File
  let csvContent = 'Hạng,Mã Tỉnh,Tên Bưu Điện Tỉnh/Thành Phố,Tổng Số BG PTC,Đúng Quy Định Chỉ Tiêu,Tỷ Lệ Đúng Quy Định (%)\n';
  rows.forEach((r, i) => {
    csvContent += `${i + 1},${r.ma_tinh_phat},"${r.ten_tinh_phat}",${r.total_bg_ptc},${r.total_dung_ct},${r.tl_dung_ct}%\n`;
  });

  const csvPath = path.join(__dirname, 'portal-downloads', 'Bang_Xep_Hang_34_Tinh_Thanh_Thang_07_2026.csv');
  fs.writeFileSync(csvPath, '\uFEFF' + csvContent, 'utf8');

  // 2. Generate Excel (.xls) File
  let htmlExcel = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"/></head>
  <body>
    <table border="1">
      <thead>
        <tr style="background-color: #003366; color: #ffffff; font-weight: bold;">
          <th>Hạng</th>
          <th>Mã Tỉnh</th>
          <th>Tên Bưu điện Tỉnh / Thành phố</th>
          <th>Tổng BG PTC</th>
          <th>Đúng QĐ CT</th>
          <th>Tỷ lệ Đúng QĐ CT (%)</th>
        </tr>
      </thead>
      <tbody>`;
  
  rows.forEach((r, i) => {
    htmlExcel += `
        <tr>
          <td>${i + 1}</td>
          <td>${r.ma_tinh_phat}</td>
          <td>${r.ten_tinh_phat}</td>
          <td>${r.total_bg_ptc}</td>
          <td>${r.total_dung_ct}</td>
          <td>${r.tl_dung_ct}%</td>
        </tr>`;
  });
  htmlExcel += `
      </tbody>
    </table>
  </body>
  </html>`;

  const xlsPath = path.join(__dirname, 'portal-downloads', 'Bang_Xep_Hang_34_Tinh_Thanh_Thang_07_2026.xls');
  fs.writeFileSync(xlsPath, '\uFEFF' + htmlExcel, 'utf8');

  console.log('Successfully generated both CSV and Excel files!');
})();
