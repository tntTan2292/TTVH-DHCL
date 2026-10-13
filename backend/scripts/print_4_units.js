const { db, all } = require('../src/config/db.js');

async function main() {
    const units = ['BCVH A Lưới', 'BCVH Hương Trà', 'BCVH Thuận An', 'BCVH Hương Thủy'];
    for (const bcvh of units) {
        console.log(`\n=== ${bcvh} ===`);
        const summary = await all(`
            SELECT 
                ngay_do_kiem,
                COUNT(*) as sl,
                SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat,
                ROUND(SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/COUNT(*), 1) as ty_le,
                SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as khong_dat,
                SUM(CASE WHEN danh_gia_2026 IS NULL OR danh_gia_2026 = '' THEN 1 ELSE 0 END) as chuyen_hoan,
                SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND (thoi_gian_nop_tien IS NULL OR thoi_gian_nop_tien = '') THEN 1 ELSE 0 END) as kd_thieu_nop_tien,
                SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND thoi_gian_nop_tien IS NOT NULL AND thoi_gian_nop_tien != '' THEN 1 ELSE 0 END) as kd_qua_gio_chi_tieu
            FROM fact_f13
            WHERE ten_bcvh = ? AND ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
            GROUP BY ngay_do_kiem
            ORDER BY ngay_do_kiem
        `, [bcvh]);
        console.table(summary);
    }
    db.close();
}

main().catch(console.error);
