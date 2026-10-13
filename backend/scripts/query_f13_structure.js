const { db, all } = require('../src/config/db.js');

async function main() {
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.map(t => t.name));
    
    // Check tables related to F13 or fact
    for (const t of tables) {
        if (t.name.toLowerCase().includes('f13') || t.name.toLowerCase().includes('fact')) {
            console.log('--- ' + t.name + ' ---');
            const cols = await all(`PRAGMA table_info(${t.name})`);
            console.log(cols.map(c => c.name).join(', '));
        }
    }
    db.close();
}

main().catch(console.error);
