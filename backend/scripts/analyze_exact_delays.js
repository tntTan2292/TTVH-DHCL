const { db, all } = require('../src/config/db.js');

async function main() {
    const remainFail = await all(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN thoi_gian_ptc IS NULL OR thoi_gian_ptc = '' THEN 1 ELSE 0 END) as ptc_null,
            SUM(CASE WHEN thoi_gian_thuc_hien_thuc_te_gio IS NULL OR thoi_gian_thuc_hien_thuc_te_gio = '' THEN 1 ELSE 0 END) as tg_null,
            SUM(CASE WHEN CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) <= CAST(thoi_gian_chi_tieu AS FLOAT) THEN 1 ELSE 0 END) as dung_gio_nhung_khong_dat
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-10', '2026-10-11')
          AND danh_gia_2026 = 'Không đạt'
    `);
    console.log('Phân tích Không đạt cuối tuần 41:', remainFail);

    // Mẫu các bưu gửi đúng giờ nhưng không đạt (nếu có)
    const sample = await all(`
        SELECT ma_bg, thoi_gian_bckt_tinh_xnd_bd8, thoi_gian_bd10_quet_tms, thoi_gian_ptc, thoi_gian_thuc_hien_thuc_te_gio, thoi_gian_chi_tieu, ket_qua_f13, danh_gia_2026
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-10', '2026-10-11')
          AND danh_gia_2026 = 'Không đạt'
          AND CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) <= CAST(thoi_gian_chi_tieu AS FLOAT)
        LIMIT 5
    `);
    console.log('Mẫu đúng giờ nhưng không đạt:', sample);

    // So sánh thời gian trễ của Cuối tuần 40 vs Cuối tuần 41
    const delayCompare = await all(`
        SELECT 
            CASE 
                WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 'Cuối tuần 40'
                WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 'Cuối tuần 41'
            END as giai_doan,
            COUNT(*) as tong_sl,
            SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as sl_dat,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as sl_khong_dat,
            -- Số bưu gửi phát trễ quá giờ chỉ tiêu
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) > CAST(thoi_gian_chi_tieu AS FLOAT) THEN 1 ELSE 0 END) as sl_tre_chi_tieu,
            ROUND(AVG(CASE WHEN danh_gia_2026 = 'Không đạt' THEN CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) END), 1) as avg_gio_thuc_te_khong_dat,
            -- Phân loại mức độ trễ
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) BETWEEN 13 AND 24 THEN 1 ELSE 0 END) as tre_13_24h,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) BETWEEN 25 AND 48 THEN 1 ELSE 0 END) as tre_25_48h,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' AND CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) > 48 THEN 1 ELSE 0 END) as tre_tren_48h
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY giai_doan
    `);
    console.log('So sánh chi tiết mức độ phát trễ W40 vs W41:');
    console.table(delayCompare);

    db.close();
}

main().catch(console.error);
