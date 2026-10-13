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

  let csvContent = 'Hang,Ma Tinh,Ten Buu Dien Tinh/Thanh Pho,Tong So BG PTC,Dung Quy Dinh Chi Tieu,Ty Le Dung Quy Dinh (%)\n';
  rows.forEach((r, i) => {
    csvContent += `${i + 1},${r.ma_tinh_phat},"${r.ten_tinh_phat}",${r.total_bg_ptc},${r.total_dung_ct},${r.tl_dung_ct}%\n`;
  });

  const filePath = path.join(__dirname, 'portal-downloads', 'Bang_Xep_Hang_34_BDT_Thang_07_2026.csv');
  fs.writeFileSync(filePath, '\uFEFF' + csvContent, 'utf8');
  console.log('Exported CSV successfully to:', filePath);
})();
