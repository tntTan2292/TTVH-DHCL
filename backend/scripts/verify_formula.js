const { db, all } = require('../src/config/db.js');

async function main() {
    const dates = ['2026-10-10', '2026-10-11', '2026-10-03', '2026-10-04'];
    for (const d of dates) {
        const stats = await all(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as dat_ket_qua,
                SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_2026,
                ROUND(SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 1) as pct_ket_qua,
                ROUND(SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 1) as pct_2026
            FROM fact_f13
            WHERE ngay_do_kiem = ?
        `, [d]);
        console.log(`Date ${d}:`, stats[0]);
    }
    
    // Per BCVH on 2026-10-10
    const bcvhStats = await all(`
        SELECT 
            ten_bcvh,
            COUNT(*) as total,
            SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat_2026,
            SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as dat_ket_qua
        FROM fact_f13
        WHERE ngay_do_kiem = '2026-10-10'
        GROUP BY ten_bcvh
    `);
    console.log('2026-10-10 BCVH stats:');
    console.table(bcvhStats);

    db.close();
}

main().catch(console.error);
