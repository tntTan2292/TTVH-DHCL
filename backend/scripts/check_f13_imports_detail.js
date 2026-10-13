const { db, all } = require('../src/config/db.js');

async function main() {
    const logs = await all(`
        SELECT id, file_name, ngay_do_kiem, source_lane, trigger_source, total_records, created_at 
        FROM import_log 
        WHERE indicator = 'F1.3' AND ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        ORDER BY ngay_do_kiem, source_lane
    `);
    console.table(logs);

    // Let's also inspect why 2026-10-10 has ma_tuyen = 'Khong Xac Dinh'
    const sampleKxd = await all(`
        SELECT id, ma_bg, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, thoi_gian_bckt_tinh_xnd_bd8, thoi_gian_ptc, danh_gia_2026
        FROM fact_f13
        WHERE ngay_do_kiem = '2026-10-10' AND ma_tuyen = 'Khong Xac Dinh'
        LIMIT 5
    `);
    console.log('Sample Kxd on 2026-10-10:');
    console.table(sampleKxd);

    db.close();
}

main().catch(console.error);
