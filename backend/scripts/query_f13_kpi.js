const { db, all } = require('../src/config/db.js');

async function main() {
    console.log('--- DISTINCT RESULT VALUES ---');
    const ketQuaDist = await all(`
        SELECT ket_qua_f13, danh_gia_2026, count(*) as cnt 
        FROM fact_f13 
        WHERE ngay_do_kiem >= '2026-09-28' AND ngay_do_kiem <= '2026-10-11'
        GROUP BY ket_qua_f13, danh_gia_2026
    `);
    console.log(ketQuaDist);

    db.close();
}

main().catch(console.error);
