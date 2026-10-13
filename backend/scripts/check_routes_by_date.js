const { db, all } = require('../src/config/db.js');

async function main() {
    const routeByDate = await all(`
        SELECT 
            ngay_do_kiem,
            COUNT(*) as total,
            SUM(CASE WHEN ma_tuyen = 'Khong Xac Dinh' OR ma_tuyen IS NULL THEN 1 ELSE 0 END) as sl_kxd,
            ROUND(SUM(CASE WHEN ma_tuyen = 'Khong Xac Dinh' OR ma_tuyen IS NULL THEN 1.0 ELSE 0 END)*100.0/COUNT(*), 1) as pct_kxd
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY ngay_do_kiem
    `);
    console.log('Tuyến Không Xác Định theo từng ngày:');
    console.table(routeByDate);

    // Kiểm tra thêm ngày 04/10 (Chủ nhật tuần 40)
    const sundayW40 = await all(`
        SELECT ngay_do_kiem, ma_tuyen, COUNT(*) as cnt 
        FROM fact_f13 
        WHERE ngay_do_kiem = '2026-10-04' 
        GROUP BY ma_tuyen 
        LIMIT 10
    `);
    console.log('Sample routes on 2026-10-04:');
    console.table(sundayW40);

    const sundayW41 = await all(`
        SELECT ngay_do_kiem, ma_tuyen, ten_bcvh, COUNT(*) as cnt, SUM(danh_gia_2026='Đạt') as dat
        FROM fact_f13 
        WHERE ngay_do_kiem = '2026-10-11' 
        GROUP BY ma_tuyen, ten_bcvh 
        LIMIT 10
    `);
    console.log('Sample routes on 2026-10-11:');
    console.table(sundayW41);

    db.close();
}

main().catch(console.error);
