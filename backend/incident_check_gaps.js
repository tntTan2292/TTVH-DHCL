'use strict';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('./src/db/database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

// Find gaps in import_log IDs
db.all("SELECT id, status, ngay_do_kiem, file_name, created_at, total_records FROM import_log ORDER BY id DESC LIMIT 50", [], (err, rows) => {
    console.log('\n=== LATEST IMPORT LOGS ===');
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));

    // Find any gaps in fact_f13 IDs
    db.all("SELECT id FROM fact_f13 WHERE id > 650000 ORDER BY id ASC", [], (err, ids) => {
        console.log('\n=== fact_f13 ID ranges > 650000 ===');
        if (err) {
            console.error(err);
        } else {
            if (ids.length === 0) {
                console.log('No IDs > 650000');
            } else {
                console.log(`Found ${ids.length} rows. Min ID: ${ids[0].id}, Max ID: ${ids[ids.length-1].id}`);
                // Find continuous chunks
                let gaps = [];
                for (let i = 1; i < ids.length; i++) {
                    if (ids[i].id !== ids[i-1].id + 1) {
                        gaps.push({ from: ids[i-1].id, to: ids[i].id, gapSize: ids[i].id - ids[i-1].id - 1 });
                    }
                }
                console.log('Gaps in fact_f13 IDs > 650000:', JSON.stringify(gaps.slice(0, 10), null, 2));
            }
        }
        db.close();
    });
});
