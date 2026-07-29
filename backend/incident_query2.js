'use strict';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('./src/db/database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

// Check if 18, 19, 23 EVER appeared in import_log (by any date or file)
db.all(`
  SELECT id, file_name, ngay_do_kiem, created_at, status, total_records
  FROM import_log
  WHERE file_name LIKE '%2026.07.18%'
     OR file_name LIKE '%2026.07.19%'
     OR file_name LIKE '%2026.07.23%'
  ORDER BY id
`, [], (err, rows) => {
    if (err) { console.error(err.message); return; }
    console.log('\n=== IMPORT LOG: any 18, 19, 23 file references ===');
    console.log(JSON.stringify(rows, null, 2));
});

// Check distinct import_log file names Jul 17-24 (full history)
db.all(`
  SELECT file_name, ngay_do_kiem, COUNT(*) as log_entries, MAX(status) as last_status, MAX(total_records) as max_records
  FROM import_log
  WHERE ngay_do_kiem >= '2026-07-17' AND ngay_do_kiem <= '2026-07-24'
     OR file_name LIKE '%F1.3-2026%'
  GROUP BY file_name, ngay_do_kiem
  ORDER BY ngay_do_kiem, id
`, [], (err, rows) => {
    if (err) { console.error(err.message); return; }
    console.log('\n=== IMPORT LOG grouped by file+date Jul 17-24 ===');
    console.log(JSON.stringify(rows, null, 2));
});

// How many fact_f13 rows for EACH date in full db
db.all(`
  SELECT ngay_do_kiem, COUNT(*) as row_count, MIN(created_at) as min_c, MAX(created_at) as max_c
  FROM fact_f13
  WHERE ngay_do_kiem >= '2026-07-01' AND ngay_do_kiem <= '2026-07-25'
  GROUP BY ngay_do_kiem
  ORDER BY ngay_do_kiem
`, [], (err, rows) => {
    if (err) { console.error(err.message); return; }
    console.log('\n=== fact_f13 ALL JULY DATES (1-25) ===');
    console.log(JSON.stringify(rows, null, 2));
    setTimeout(() => db.close(), 500);
});
