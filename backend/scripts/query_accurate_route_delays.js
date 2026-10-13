const { db, all } = require('../src/config/db.js');

async function main() {
    console.log('=== PHÂN TÍCH THỜI GIAN TRỄ THEO TỪNG TUYẾN PHÁT (ĐÚNG BẢN CHẤT PTC VS CHỈ TIÊU) ===\n');

    // Tuyến ngày CN 11/10 vs 04/10
    const routeDelays = await all(`
        SELECT 
            f.ten_bcvh,
            f.ma_tuyen,
            f.ten_tuyen,
            -- CN W40
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1 ELSE 0 END) as sl_w40,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0), 1) as tl_w40,
            -- CN W41
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1 ELSE 0 END) as sl_w41,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0), 1) as tl_w41,
            -- Tăng giảm
            ROUND(
                (SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0)) -
                (SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0))
            , 1) as diff_tl,
            -- Số lượng Không đạt (phát trễ chỉ tiêu) ngày 11/10
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as sl_kd_w41,
            -- Phân loại mức độ trễ của các BG Không đạt ngày 11/10
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) <= 24 THEN 1 ELSE 0 END) as tre_duoi_24h,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) BETWEEN 25 AND 48 THEN 1 ELSE 0 END) as tre_25_48h,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) > 48 THEN 1 ELSE 0 END) as tre_tren_48h_hang_ton,
            -- Thời gian thực tế bình quân của BG không đạt
            ROUND(AVG(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' THEN CAST(SUBSTR(f.thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(f.thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) END), 1) as avg_thuc_te_kd
        FROM fact_f13 f
        WHERE f.ngay_do_kiem IN ('2026-10-04', '2026-10-11')
        GROUP BY f.ten_bcvh, f.ma_tuyen, f.ten_tuyen
        HAVING sl_w41 >= 10
        ORDER BY diff_tl ASC
    `);

    console.table(routeDelays.slice(0, 20));
    db.close();
}

main().catch(console.error);
