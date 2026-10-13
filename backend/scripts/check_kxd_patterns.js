const { db, all } = require('../src/config/db.js');

async function main() {
    const kxdOn10 = await all(`
        SELECT ten_bcvh, ma_phuong_xa_phat, ten_phuong_xa_phat, dia_ban_phat, loai_bc_phat, COUNT(*) as cnt
        FROM fact_f13
        WHERE ngay_do_kiem = '2026-10-10' AND ma_tuyen = 'Khong Xac Dinh'
        GROUP BY ten_bcvh, ten_phuong_xa_phat
        LIMIT 20
    `);
    console.log('Phân bố không xác định tuyến ngày 10/10:');
    console.table(kxdOn10);

    // Kiểm tra các ngày khác có bị không
    const kxdAll = await all(`
        SELECT ngay_do_kiem, 
               COUNT(*) as total,
               SUM(CASE WHEN ma_tuyen = 'Khong Xac Dinh' OR ma_tuyen IS NULL OR TRIM(ma_tuyen) = '' THEN 1 ELSE 0 END) as kxd_cnt
        FROM fact_f13
        WHERE ngay_do_kiem >= '2026-09-28'
        GROUP BY ngay_do_kiem
        ORDER BY ngay_do_kiem
    `);
    console.table(kxdAll);

    db.close();
}

main().catch(console.error);
