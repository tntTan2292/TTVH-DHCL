const { db, all } = require('../src/config/db.js');

async function main() {
    const dates = await all(`
        SELECT ngay_do_kiem, count(*) as count 
        FROM fact_f13 
        GROUP BY ngay_do_kiem 
        ORDER BY ngay_do_kiem DESC
        LIMIT 30
    `);
    console.log('F13 Dates:', dates);

    const distinctBCVH = await all(`
        SELECT DISTINCT ten_bcvh, ma_bcvh 
        FROM fact_f13
    `);
    console.log('BCVH list:', distinctBCVH);

    db.close();
}

main().catch(console.error);
