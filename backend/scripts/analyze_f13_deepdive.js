const { db, all } = require('../src/config/db.js');

async function main() {
    console.log('=== PHÂN TÍCH CHUYÊN SÂU NGUYÊN NHÂN F1.3 GIẢM TUẦN 41 SO VỚI TUẦN 40 ===\n');

    // 1. Phân tích hàng lô (so_hieu_lo) và khách hàng lớn (ten_khl)
    const loStats = await all(`
        SELECT 
            CASE 
                WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 'Cuối tuần 40 (03-04/10)'
                WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 'Cuối tuần 41 (10-11/10)'
            END as giai_doan,
            -- Hàng lô
            COUNT(*) as tong_sl,
            SUM(CASE WHEN so_hieu_lo IS NOT NULL AND TRIM(so_hieu_lo) != '' THEN 1 ELSE 0 END) as sl_hang_lo,
            SUM(CASE WHEN so_hieu_lo IS NOT NULL AND TRIM(so_hieu_lo) != '' AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as sl_lo_dat,
            ROUND(SUM(CASE WHEN so_hieu_lo IS NOT NULL AND TRIM(so_hieu_lo) != '' AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN so_hieu_lo IS NOT NULL AND TRIM(so_hieu_lo) != '' THEN 1 ELSE 0 END), 0), 1) as ty_le_lo_dat,
            -- Hàng lẻ (không lô)
            SUM(CASE WHEN so_hieu_lo IS NULL OR TRIM(so_hieu_lo) = '' THEN 1 ELSE 0 END) as sl_hang_le,
            SUM(CASE WHEN (so_hieu_lo IS NULL OR TRIM(so_hieu_lo) = '') AND danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as sl_le_dat,
            ROUND(SUM(CASE WHEN (so_hieu_lo IS NULL OR TRIM(so_hieu_lo) = '') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN so_hieu_lo IS NULL OR TRIM(so_hieu_lo) = '' THEN 1 ELSE 0 END), 0), 1) as ty_le_le_dat
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY giai_doan
    `);
    console.log('1. TÁC ĐỘNG HÀNG LÔ VS HÀNG LẺ (CUỐI TUẦN):');
    console.table(loStats);

    // 2. Phân tích theo Dịch vụ / Loại dịch vụ
    const dvStats = await all(`
        SELECT 
            dich_vu,
            -- W40
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END) as w40_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 1 ELSE 0 END), 0), 1) as w40_rate,
            -- W41
            SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END) as w41_sl,
            ROUND(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') AND danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 1 ELSE 0 END), 0), 1) as w41_rate
        FROM fact_f13
        WHERE ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
        GROUP BY dich_vu
        ORDER BY w41_sl DESC
    `);
    console.log('2. TÁC ĐỘNG THEO DỊCH VỤ:');
    console.table(dvStats);

    // 3. Phân tích chi tiết tại đơn vị giảm sâu: A Lưới (-21.3%), Hương Trà (-5.5%), Thuận An (-5.8%), Hương Thủy (-4.3%)
    console.log('3. CHI TIẾT TẠI CÁC ĐƠN VỊ GIẢM SÂU:');
    const units = ['BCVH A Lưới', 'BCVH Hương Trà', 'BCVH Thuận An', 'BCVH Hương Thủy', 'BCVH Phú Lộc', 'BCVH Thuận Hóa'];
    for (const u of units) {
        const uRes = await all(`
            SELECT 
                CASE 
                    WHEN ngay_do_kiem IN ('2026-10-03', '2026-10-04') THEN 'Cuối tuần 40'
                    WHEN ngay_do_kiem IN ('2026-10-10', '2026-10-11') THEN 'Cuối tuần 41'
                END as giai_doan,
                COUNT(*) as sl,
                SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1 ELSE 0 END) as dat,
                ROUND(SUM(CASE WHEN danh_gia_2026 = 'Đạt' THEN 1.0 ELSE 0 END)*100.0/COUNT(*), 1) as tl_dat,
                -- COD & Nộp tiền
                SUM(CASE WHEN so_tien_cod > 0 THEN 1 ELSE 0 END) as sl_cod,
                SUM(CASE WHEN thoi_gian_nop_tien IS NULL OR thoi_gian_nop_tien = '' THEN 1 ELSE 0 END) as sl_nop_null,
                -- Hàng lô
                SUM(CASE WHEN so_hieu_lo IS NOT NULL AND TRIM(so_hieu_lo) != '' THEN 1 ELSE 0 END) as sl_hang_lo,
                SUM(CASE WHEN (danh_gia_2026 IS NULL OR danh_gia_2026 = '') THEN 1 ELSE 0 END) as sl_chuyen_hoan
            FROM fact_f13
            WHERE ten_bcvh = ?
              AND ngay_do_kiem IN ('2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11')
            GROUP BY giai_doan
        `, [u]);
        console.log(`\n--- ${u} ---`);
        console.table(uRes);
    }

    db.close();
}

main().catch(console.error);
