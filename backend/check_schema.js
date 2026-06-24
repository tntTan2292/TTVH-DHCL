const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/db/database.sqlite');
db.all("PRAGMA table_info(import_log);", [], (err, rows) => {
    console.log(rows);
});
