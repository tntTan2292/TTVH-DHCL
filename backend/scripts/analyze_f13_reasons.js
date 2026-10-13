const { db, all } = require('../src/config/db.js');
const { violationReasonCaseSql, delayHoursSql } = require('../src/services/evidenceReasonSql.js');

async function main() {
    console.log('=== PHÂN TÍCH NGUYÊN NHÂN CUỐI TUẦN 41 (10-11/10) VS CUỐI TUẦN 40 (03-04/10) ===\n');

    // 1. Phân loại Không Đạt theo Nguyên Nhân (Chậm nộp tiền > 3h vs Không đạt khác vs Chuyển hoàn/null)
    const reasonBreakdown = await all(`
        SELECT 
            CASE 
                WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 'Cuối tuần 40 (03-04/10)'
                WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 'Cuối tuần 41 (10-11/10)'
            END as giai_doan,
            COUNT(*) as tong_sl,
            SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as sl_dat,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as sl_khong_dat,
            SUM(CASE WHEN danh_gia_2026 IS NULL OR danh_gia_2026 = '' THEN 1 ELSE 0 END) as sl_chuyen_hoan,
            -- Lý do không đạt
            SUM(CASE WHEN (${violationReasonCaseSql()}) = 'Chậm nộp tiền' THEN 1 ELSE 0 END) as khong_dat_cham_nop_tien,
            SUM(CASE WHEN (${violationReasonCaseSql()}) = 'Không đạt khác' THEN 1 ELSE 0 END) as khong_dat_khac,
            SUM(CASE WHEN (${violationReasonCaseSql()}) = 'Chưa xác định nguyên nhân' THEN 1 ELSE 0 END) as khong_dat_chua_ro_nn
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY giai_doan
    `);
    console.log('1. PHÂN BỐ LÝ DO KHÔNG ĐẠT (CUỐI TUẦN):');
    console.table(reasonBreakdown);

    // 2. Tương tự cho CẢ TUẦN 40 vs CẢ TUẦN 41
    const weekReasonBreakdown = await all(`
        SELECT 
            CASE 
                WHEN ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' THEN 'Tuần 40 (28/09 - 04/10)'
                WHEN ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' THEN 'Tuần 41 (05/10 - 11/10)'
            END as giai_doan,
            COUNT(*) as tong_sl,
            SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as sl_dat,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as sl_khong_dat,
            SUM(CASE WHEN danh_gia_2026 IS NULL OR danh_gia_2026 = '' THEN 1 ELSE 0 END) as sl_chuyen_hoan,
            SUM(CASE WHEN (${violationReasonCaseSql()}) = 'Chậm nộp tiền' THEN 1 ELSE 0 END) as khong_dat_cham_nop_tien,
            SUM(CASE WHEN (${violationReasonCaseSql()}) = 'Không đạt khác' THEN 1 ELSE 0 END) as khong_dat_khac,
            SUM(CASE WHEN (${violationReasonCaseSql()}) = 'Chưa xác định nguyên nhân' THEN 1 ELSE 0 END) as khong_dat_chua_ro_nn
        FROM fact_f13
        WHERE ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-11'
        GROUP BY giai_doan
    `);
    console.log('2. PHÂN BỐ LÝ DO KHÔNG ĐẠT (CẢ TUẦN):');
    console.table(weekReasonBreakdown);

    // 3. Phân tích chi tiết từng BCVH cuối tuần: Chậm nộp tiền vs Chuyển hoàn vs Không đạt khác
    const bcvhDetailWeekend = await all(`
        SELECT 
            ten_bcvh,
            -- Tuần 40
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as w40_sl,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as w40_dat,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND (${violationReasonCaseSql()}) = 'Chậm nộp tiền' THEN 1 ELSE 0 END) as w40_cham_nop,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND (${violationReasonCaseSql()}) = 'Không đạt khác' THEN 1 ELSE 0 END) as w40_kd_khac,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND (danh_gia_2026 IS NULL OR danh_gia_2026 = '') THEN 1 ELSE 0 END) as w40_chuyen_hoan,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END), 0), 1) as w40_rate,
            -- Tuần 41
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) as w41_sl,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as w41_dat,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND (${violationReasonCaseSql()}) = 'Chậm nộp tiền' THEN 1 ELSE 0 END) as w41_cham_nop,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND (${violationReasonCaseSql()}) = 'Không đạt khác' THEN 1 ELSE 0 END) as w41_kd_khac,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND (danh_gia_2026 IS NULL OR danh_gia_2026 = '') THEN 1 ELSE 0 END) as w41_chuyen_hoan,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END), 0), 1) as w41_rate
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY ten_bcvh
        ORDER BY w41_sl DESC
    `);
    console.log('3. CHI TIẾT TỪNG BCVH CUỐI TUẦN:');
    console.table(bcvhDetailWeekend);

    db.close();
}

main().catch(console.error);
