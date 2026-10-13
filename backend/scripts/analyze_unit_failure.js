const { db, all } = require('../src/config/db.js');

async function main() {
    console.log('=== PHÂN TÍCH CHI TIẾT TỪNG BCVH TỤT CHẤT LƯỢNG ===');

    const targets = ['BCVH A Lưới', 'BCVH Hương Trà', 'BCVH Thuận An', 'BCVH Hương Thủy', 'BCVH Phú Lộc'];

    for (const bcvh of targets) {
        console.log(`\n============================= ${bcvh} =============================`);
        // 1. So sánh tổng quát
        const summary = await all(`
            SELECT 
                ngay_do_kiem,
                COUNT(*) as sl,
                SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat,
                ROUND(SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/COUNT(*), 1) as ty_le,
                -- Phân loại Không Đạt
                SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as khong_dat,
                SUM(CASE WHEN danh_gia_2026 IS NULL OR danh_gia_2026 = '' THEN 1 ELSE 0 END) as chuyen_hoan,
                -- COD và Nộp tiền
                SUM(CASE WHEN so_tien_cod > 0 THEN 1 ELSE 0 END) as co_cod,
                SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND (thoi_gian_nop_tien IS NULL OR thoi_gian_nop_tien = '') THEN 1 ELSE 0 END) as kd_thieu_nop_tien,
                -- Độ trễ phát quá chỉ tiêu
                SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND thoi_gian_nop_tien IS NOT NULL AND thoi_gian_nop_tien != '' THEN 1 ELSE 0 END) as kd_qua_gio_chi_tieu
            FROM fact_f13
            WHERE ten_bcvh = ? AND ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
            GROUP BY ngay_do_kiem
            ORDER BY ngay_do_kiem
        `, [bcvh]);
        console.table(summary);

        // 2. Tuyến phát bị giảm nặng nhất ở BCVH này trong ngày CN (11/10) hoặc T7 (10/10)
        const routes = await all(`
            SELECT 
                ma_tuyen,
                ten_tuyen,
                SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as w40_sl,
                ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                      NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1.0 ELSE 0 END), 0), 1) as w40_tl,
                SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) as w41_sl,
                ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                      NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1.0 ELSE 0 END), 0), 1) as w41_tl
            FROM fact_f13
            WHERE ten_bcvh = ? AND ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
            GROUP BY ma_tuyen, ten_tuyen
            HAVING w41_sl >= 10
            ORDER BY (w41_tl - w40_tl) ASC
            LIMIT 5
        `, [bcvh]);
        console.log(`Top tuyến giảm sâu nhất tại ${bcvh}:`);
        console.table(routes);

        // 3. Phân tích bưu gửi không đạt: thực tế đến lúc nào, phát lúc nào
        const delaySample = await all(`
            SELECT 
                ma_bg,
                thoi_gian_bckt_tinh_xnd_bd8,
                thoi_gian_bd10_quet_tms,
                thoi_gian_ptc,
                thoi_gian_nop_tien,
                thoi_gian_thuc_hien_thuc_te_gio,
                thoi_gian_chi_tieu
            FROM fact_f13
            WHERE ten_bcvh = ? 
              AND ngay_do_kiem IN ('2026-10-10', '2026-10-11')
              AND danh_gia_2026 = 'Không đạt'
            ORDER BY thoi_gian_thuc_hien_thuc_te_gio DESC
            LIMIT 3
        `, [bcvh]);
        console.log(`Mẫu bưu gửi không đạt tại ${bcvh}:`);
        console.table(delaySample);
    }

    db.close();
}

main().catch(console.error);
