const { db, all } = require('../src/config/db.js');

async function main() {
    // 1. Kiểm tra mối quan hệ giữa so_tien_cod và thoi_gian_nop_tien
    const codCheck = await all(`
        SELECT 
            CASE WHEN so_tien_cod > 0 THEN 'Có COD' ELSE 'Không COD (hoặc = 0)' END as loai_cod,
            COUNT(*) as total,
            SUM(CASE WHEN thoi_gian_nop_tien IS NOT NULL AND thoi_gian_nop_tien != '' THEN 1 ELSE 0 END) as co_tg_nop_tien,
            SUM(CASE WHEN thoi_gian_nop_tien IS NULL OR thoi_gian_nop_tien = '' THEN 1 ELSE 0 END) as khong_tg_nop_tien
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-10', '2026-10-11')
        GROUP BY loai_cod
    `);
    console.log('1. COD vs thoi_gian_nop_tien:');
    console.table(codCheck);

    // 2. Kiểm tra thoi_gian_ptc vs thoi_gian_nop_tien ở những bưu gửi có thời gian nộp tiền
    const timeCompare = await all(`
        SELECT 
            COUNT(*) as total_has_both,
            SUM(CASE WHEN thoi_gian_ptc = thoi_gian_nop_tien THEN 1 ELSE 0 END) as ptc_equal_nop,
            SUM(CASE WHEN thoi_gian_ptc != thoi_gian_nop_tien THEN 1 ELSE 0 END) as ptc_diff_nop
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-10', '2026-10-11')
          AND thoi_gian_ptc IS NOT NULL AND thoi_gian_nop_tien IS NOT NULL
    `);
    console.log('2. thoi_gian_ptc vs thoi_gian_nop_tien:');
    console.table(timeCompare);

    // 3. Tại sao "Không đạt"? Kiểm tra các bưu gửi "Không đạt"
    // Cột thoi_gian_thuc_hien_thuc_te_gio vs thoi_gian_chi_tieu
    const failSample = await all(`
        SELECT 
            ma_bg,
            so_tien_cod,
            thoi_gian_bckt_tinh_xnd_bd8,
            thoi_gian_bd10_xnd_kttp,
            thoi_gian_bd10_quet_tms,
            thoi_gian_ptc,
            thoi_gian_nop_tien,
            thoi_gian_thuc_hien_thuc_te_gio,
            thoi_gian_chi_tieu,
            ket_qua_f13,
            danh_gia_2026
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-10', '2026-10-11')
          AND danh_gia_2026 = 'Không đạt'
        LIMIT 10
    `);
    console.log('3. Sample Không đạt rows:');
    console.table(failSample);

    // 4. So sánh số giờ thực hiện thực tế vs chỉ tiêu của toàn bộ Không đạt
    const timeDiffAnalysis = await all(`
        SELECT 
            danh_gia_2026,
            COUNT(*) as total,
            -- Tách giờ thực tế
            AVG(CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT)) as avg_thuc_te_h,
            AVG(CAST(thoi_gian_chi_tieu AS FLOAT)) as avg_chi_tieu_h,
            SUM(CASE WHEN CAST(SUBSTR(thoi_gian_thuc_hien_thuc_te_gio, 1, INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') - 1) AS FLOAT) > CAST(thoi_gian_chi_tieu AS FLOAT) THEN 1 ELSE 0 END) as sl_thuc_te_lon_hon_chi_tieu
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-10', '2026-10-11')
          AND thoi_gian_thuc_hien_thuc_te_gio IS NOT NULL AND INSTR(thoi_gian_thuc_hien_thuc_te_gio, ':') > 0
        GROUP BY danh_gia_2026
    `);
    console.log('4. Thời gian thực tế vs chỉ tiêu:');
    console.table(timeDiffAnalysis);

    db.close();
}

main().catch(console.error);
