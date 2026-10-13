const { db, all } = require('../src/config/db.js');

async function main() {
    const sample = await all(`
        SELECT 
            ngay_do_kiem,
            ma_bcvh,
            ten_bcvh,
            ma_bg,
            danh_gia_2026,
            ket_qua_f13,
            thoi_gian_ptc,
            thoi_gian_nop_tien,
            thoi_gian_bckt_tinh_xnd_bd8,
            thoi_gian_bd10_xnd_kttp,
            thoi_gian_bd10_quet_tms,
            thoi_gian_thuc_hien_thuc_te_gio,
            thoi_gian_chi_tieu
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-10', '2026-10-11')
          AND danh_gia_2026 = 'Không đạt'
        LIMIT 10
    `);
    console.log('Sample "Không đạt" rows on 10-11/10:');
    console.table(sample);

    const timeNullStats = await all(`
        SELECT 
            ngay_do_kiem,
            COUNT(*) as total_khong_dat,
            SUM(CASE WHEN thoi_gian_ptc IS NULL OR thoi_gian_ptc = '' THEN 1 ELSE 0 END) as ptc_null,
            SUM(CASE WHEN thoi_gian_nop_tien IS NULL OR thoi_gian_nop_tien = '' THEN 1 ELSE 0 END) as noptien_null,
            SUM(CASE WHEN thoi_gian_ptc IS NOT NULL AND thoi_gian_ptc != '' AND (thoi_gian_nop_tien IS NULL OR thoi_gian_nop_tien = '') THEN 1 ELSE 0 END) as ptc_has_nop_null,
            SUM(CASE WHEN (thoi_gian_ptc IS NULL OR thoi_gian_ptc = '') AND (thoi_gian_nop_tien IS NULL OR thoi_gian_nop_tien = '') THEN 1 ELSE 0 END) as both_null
        FROM fact_f13
        WHERE danh_gia_2026 = 'Không đạt'
          AND ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY ngay_do_kiem
    `);
    console.log('Time null stats on weekend:');
    console.table(timeNullStats);

    db.close();
}

main().catch(console.error);
