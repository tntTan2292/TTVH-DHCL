const { db, all } = require('../src/config/db.js');

async function main() {
    console.log('=== 1. TĂNG TRƯỞNG SẢN LƯỢNG CUỐI TUẦN THEO BCVH ===');
    const volumeChange = await all(`
        SELECT 
            ten_bcvh,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as sl_w40,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) as sl_w41,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) - 
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as tang_sl,
            ROUND((SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1.0 ELSE 0 END) - 
                   SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1.0 ELSE 0 END)) * 100.0 /
                   SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1.0 ELSE 0 END), 1) as pct_tang_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1.0 ELSE 0 END), 1) as ty_le_w40,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/
                  SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1.0 ELSE 0 END), 1) as ty_le_w41
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY ten_bcvh
        ORDER BY tang_sl DESC
    `);
    console.table(volumeChange);

    console.log('\n=== 2. THỜI GIAN THỰC HIỆN THỰC TẾ SO VỚI CHỈ TIÊU CỦA BƯU GỬI KHÔNG ĐẠT ===');
    // Phân tích cột thoi_gian_thuc_hien_thuc_te_gio và thoi_gian_chi_tieu
    const delayDist = await all(`
        SELECT 
            CASE 
                WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 'Cuối tuần 40'
                WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 'Cuối tuần 41'
            END as giai_doan,
            danh_gia_2026,
            COUNT(*) as sl,
            AVG(CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT)) as avg_thuc_te_gio,
            AVG(CAST(thoi_gian_chi_tieu AS FLOAT)) as avg_chi_tieu_gio
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
          AND thoi_gian_thuc_hien_thuc_te_gio IS NOT NULL 
          AND INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') > 0
        GROUP BY giai_doan, danh_gia_2026
    `);
    console.table(delayDist);

    console.log('\n=== 3. PHÂN BỐ GIỜ PHÁT THÀNH CÔNG (PTC) THEO KHUNG GIỜ ===');
    const hourDist = await all(`
        SELECT 
            SUBSTR(thoi_gian_ptc, 12, 2) as gio_ptc,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as sl_w40,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_w40,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) as sl_w41,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_w41
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
          AND thoi_gian_ptc IS NOT NULL AND LENGTH(thoi_gian_ptc) >= 13
        GROUP BY gio_ptc
        ORDER BY gio_ptc
    `);
    console.table(hourDist);

    console.log('\n=== 4. PHÂN TÍCH TUYẾN PHÁT TẠI CÁC ĐƠN VỊ TỤT NẶNG (A LƯỚI, HƯƠNG TRÀ, THUẬN AN, HƯƠNG THỦY) ===');
    const routeDrop = await all(`
        SELECT 
            ten_bcvh,
            ma_tuyen,
            ten_tuyen,
            -- Tuần 40
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as w40_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0 /
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1.0 ELSE 0 END), 0), 1) as w40_rate,
            -- Tuần 41
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) as w41_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0 /
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1.0 ELSE 0 END), 0), 1) as w41_rate
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
          AND ten_bcvh IN ('BCVH A Lưới', 'BCVH Hương Trà', 'BCVH Thuận An', 'BCVH Hương Thủy')
        GROUP BY ten_bcvh, ma_tuyen, ten_tuyen
        HAVING w41_sl >= 20
        ORDER BY ten_bcvh, (w41_rate - w40_rate) ASC
    `);
    console.table(routeDrop);

    db.close();
}

main().catch(console.error);
