const { db, all } = require('../src/config/db.js');

async function main() {
    console.log('=== 1. TOÀN TUẦN 40 VS TUẦN 41 ===');
    const weekStats = await all(`
        SELECT 
            CASE 
                WHEN ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' THEN 'Tuần 40 (28/09 - 04/10)'
                WHEN ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' THEN 'Tuần 41 (05/10 - 11/10)'
            END as tuan,
            COUNT(*) as san_luong,
            SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as sl_dat,
            SUM(CASE WHEN danh_gia_2026 = 'Không đạt' THEN 1 ELSE 0 END) as sl_khong_dat,
            SUM(CASE WHEN danh_gia_2026 IS NULL THEN 1 ELSE 0 END) as sl_null,
            ROUND(SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 2) as ty_le_dat
        FROM fact_f13
        WHERE ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-11'
        GROUP BY tuan
        ORDER BY tuan
    `);
    console.table(weekStats);

    console.log('=== 2. TỪNG NGÀY TRONG TUẦN 40 VÀ TUẦN 41 ===');
    const dailyStats = await all(`
        SELECT 
            ngay_do_kiem,
            strftime('%w', ngay_do_kiem) as day_of_week,
            COUNT(*) as san_luong,
            SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as sl_dat,
            ROUND(SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 2) as ty_le_dat
        FROM fact_f13
        WHERE ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-11'
        GROUP BY ngay_do_kiem
        ORDER BY ngay_do_kiem
    `);
    console.table(dailyStats);

    console.log('=== 3. SO SÁNH THEO ĐƠN VỊ (BCVH) TOÀN TUẦN 40 VS 41 ===');
    const bcvhFullWeek = await all(`
        SELECT 
            ten_bcvh,
            -- Tuần 40
            SUM(CASE WHEN ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' THEN 1 ELSE 0 END) as w40_sl,
            SUM(CASE WHEN ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as w40_dat,
            ROUND(SUM(CASE WHEN ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-04' THEN 1 ELSE 0 END), 0), 2) as w40_rate,
            -- Tuần 41
            SUM(CASE WHEN ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' THEN 1 ELSE 0 END) as w41_sl,
            SUM(CASE WHEN ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as w41_dat,
            ROUND(SUM(CASE WHEN ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN ngay_do_kiem BETWEEN '2026-10-05' AND '2026-10-11' THEN 1 ELSE 0 END), 0), 2) as w41_rate
        FROM fact_f13
        WHERE ngay_do_kiem BETWEEN '2026-09-28' AND '2026-10-11'
        GROUP BY ten_bcvh
        ORDER BY w41_sl DESC
    `);
    console.table(bcvhFullWeek);

    console.log('=== 4. SO SÁNH THEO ĐƠN VỊ (BCVH) CUỐI TUẦN (T7, CN) ===');
    const bcvhWeekend = await all(`
        SELECT 
            ten_bcvh,
            -- Tuần 40 Cuối tuần
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as w40_wknd_sl,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as w40_wknd_dat,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END), 0), 2) as w40_wknd_rate,
            -- Tuần 41 Cuối tuần
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) as w41_wknd_sl,
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as w41_wknd_dat,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END), 0), 2) as w41_wknd_rate
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY ten_bcvh
        ORDER BY w41_wknd_sl DESC
    `);
    console.table(bcvhWeekend);

    db.close();
}

main().catch(console.error);
