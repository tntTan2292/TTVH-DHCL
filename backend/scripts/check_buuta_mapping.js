const { db, all } = require('../src/config/db.js');

async function main() {
    const buutaInfo = await all(`PRAGMA table_info(dm_buu_ta)`);
    console.log('dm_buu_ta cols:', buutaInfo.map(c => c.name));

    const sampleBuuta = await all(`SELECT * FROM dm_buu_ta LIMIT 5`);
    console.log('Sample buu ta:', sampleBuuta);

    const deliveryPointCols = await all(`PRAGMA table_info(network_delivery_point)`);
    console.log('network_delivery_point cols:', deliveryPointCols.map(c => c.name));

    const sampleDeliv = await all(`SELECT * FROM network_delivery_point LIMIT 5`);
    console.log('Sample delivery point:', sampleDeliv);

    db.close();
}

main().catch(console.error);
