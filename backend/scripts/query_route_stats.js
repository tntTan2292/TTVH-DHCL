const { db, all } = require('../src/config/db.js');
const { violationReasonCaseSql } = require('../src/services/evidenceReasonSql.js');

async function main() {
    console.log('=== 1. SO SÁNH TUYẾN NGÀY CHỦ NHẬT (11/10 vs 04/10) ===');
    const sundayRoutes = await all(`
        SELECT 
            f.ten_bcvh,
            f.ma_tuyen,
            f.ten_tuyen,
            -- CN tuần 40 (04/10)
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1 ELSE 0 END) as sl_w40,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_w40,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0), 1) as tl_w40,
            -- CN tuần 41 (11/10)
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1 ELSE 0 END) as sl_w41,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_w41,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0), 1) as tl_w41,
            -- Chênh lệch
            ROUND(
                (SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' THEN 1.0 ELSE 0 END), 0)) -
                (SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem = '2026-10-04' THEN 1.0 ELSE 0 END), 0))
            , 1) as diff_tl,
            -- Phân loại lỗi CN tuần 41
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND (${violationReasonCaseSql()}) = 'Chậm nộp tiền' THEN 1 ELSE 0 END) as w41_cham_nop,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND (f.thoi_gian_nop_tien IS NULL OR f.thoi_gian_nop_tien = '') THEN 1 ELSE 0 END) as w41_thieu_nop,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND f.danh_gia_2026 = 'Không đạt' AND f.thoi_gian_nop_tien IS NOT NULL AND f.thoi_gian_nop_tien != '' THEN 1 ELSE 0 END) as w41_qua_gio,
            SUM(CASE WHEN f.ngay_do_kiem = '2026-10-11' AND (f.danh_gia_2026 IS NULL OR f.danh_gia_2026 = '') THEN 1 ELSE 0 END) as w41_chuyen_hoan
        FROM fact_f13 f
        WHERE f.ngay_do_kiem IN ('2026-10-04', '2026-10-11')
        GROUP BY f.ten_bcvh, f.ma_tuyen, f.ten_tuyen
        HAVING sl_w41 >= 10
        ORDER BY diff_tl ASC
    `);
    console.table(sundayRoutes.slice(0, 25));

    console.log('\n=== 2. SO SÁNH TUYẾN CẢ TUẦN 41 VS TUẦN 40 (CÁC NGÀY CÓ MÃ TUYẾN) ===');
    const fullWeekRoutes = await all(`
        SELECT 
            f.ten_bcvh,
            f.ma_tuyen,
            f.ten_tuyen,
            -- Tuần 40
            SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' THEN 1 ELSE 0 END) as w40_sl,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' THEN 1.0 ELSE 0 END), 0), 1) as w40_tl,
            -- Tuần 41
            SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' THEN 1 ELSE 0 END) as w41_sl,
            ROUND(SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  NULLIF(SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' THEN 1.0 ELSE 0 END), 0), 1) as w41_tl,
            -- Chênh lệch
            ROUND(
                (SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' THEN 1.0 ELSE 0 END), 0)) -
                (SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' AND f.danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                 NULLIF(SUM(CASE WHEN f.ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' THEN 1.0 ELSE 0 END), 0))
            , 1) as diff_tl
        FROM fact_f13 f
        WHERE f.ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-11'
          AND f.ma_tuyen != 'Khong Xac Dinh' AND f.ma_tuyen IS NOT NULL
        GROUP BY f.ten_bcvh, f.ma_tuyen, f.ten_tuyen
        HAVING w41_sl >= 50
        ORDER BY diff_tl ASC
    `);
    console.table(fullWeekRoutes.slice(0, 25));

    db.close();
}

main().catch(console.error);
