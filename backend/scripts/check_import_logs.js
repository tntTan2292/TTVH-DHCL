const { db, all } = require('../src/config/db.js');

async function main() {
    const cols = await all(`PRAGMA table_info(import_log)`);
    console.log(cols.map(c => c.name));
    const logs = await all(`SELECT * FROM import_log ORDER BY id DESC LIMIT 10`);
    console.table(logs);
    db.close();
}

main().catch(console.error);
