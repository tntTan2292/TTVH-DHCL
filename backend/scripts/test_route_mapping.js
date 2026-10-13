const { db, all } = require('../src/config/db.js');

async function main() {
    const routeMapping = await all(`
        SELECT DISTINCT ndp.route_po_code, ndp.postman_code, bt.ten_buu_ta, bt.ten_bcvh
        FROM network_delivery_point ndp
        LEFT JOIN dm_buu_ta bt ON ndp.postman_code = bt.ma_buu_ta
        WHERE ndp.route_po_code IS NOT NULL
        LIMIT 25
    `);
    console.table(routeMapping);

    // Check mapping match against fact_f13 ma_tuyen
    const matchCount = await all(`
        SELECT COUNT(DISTINCT f.ma_tuyen) as total_f13_routes,
               COUNT(DISTINCT ndp.route_po_code) as mapped_routes
        FROM fact_f13 f
        LEFT JOIN network_delivery_point ndp ON f.ma_tuyen = ndp.route_po_code
        WHERE f.ngay_do_kiem IN ('2026-10-10', '2026-10-11')
    `);
    console.log('Match stats:', matchCount);

    db.close();
}

main().catch(console.error);
