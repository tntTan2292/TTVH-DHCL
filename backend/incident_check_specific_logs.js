'use strict';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('./src/db/database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

db.all("SELECT * FROM import_log WHERE id BETWEEN 670 AND 678 ORDER BY id DESC", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
});
