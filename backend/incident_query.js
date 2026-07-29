'use strict';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('./src/db/database.sqlite');
console.log('DB Path:', dbPath);
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

// 1. Check fact_f13 columns
db.all("PRAGMA table_info(fact_f13);", [], (err, cols) => {
    if (err) { console.error('SCHEMA ERROR:', err.message); }
    else {
        console.log('\n=== FACT_F13 SCHEMA ===');
        cols.forEach(c => console.log(c.cid, c.name, c.type));
    }
});

// 2. Row counts per date Jul 17-23
db.all(`
  SELECT ngay_do_kiem, COUNT(*) as row_count, MAX(created_at) as max_created
  FROM fact_f13
  WHERE ngay_do_kiem >= '2026-07-17' AND ngay_do_kiem <= '2026-07-23'
  GROUP BY ngay_do_kiem
  ORDER BY ngay_do_kiem
`, [], (err, rows) => {
    if (err) { console.error('ROW COUNT ERROR:', err.message); return; }
    console.log('\n=== fact_f13 ROW COUNTS 2026-07-17 to 2026-07-23 ===');
    console.log(JSON.stringify(rows, null, 2));
});

// 3. Check for EXTRA dates if any data under nearby dates
db.all(`
  SELECT ngay_do_kiem, COUNT(*) as row_count
  FROM fact_f13
  WHERE ngay_do_kiem >= '2026-07-15' AND ngay_do_kiem <= '2026-07-25'
  GROUP BY ngay_do_kiem
  ORDER BY ngay_do_kiem
`, [], (err, rows) => {
    if (err) { console.error('RANGE ERROR:', err.message); return; }
    console.log('\n=== ALL DATES Jul 15-25 ===');
    console.log(JSON.stringify(rows, null, 2));
});

// 4. Import log for 18, 19, 23
db.all(`
  SELECT id, file_name, ngay_do_kiem, created_at, status, total_records, error_records, skipped_records
  FROM import_log
  WHERE ngay_do_kiem IN ('2026-07-18', '2026-07-19', '2026-07-23')
  ORDER BY ngay_do_kiem, id
`, [], (err, rows) => {
    if (err) { console.error('IMPORT LOG ERROR:', err.message); return; }
    console.log('\n=== IMPORT LOG for 18, 19, 23 ===');
    console.log(JSON.stringify(rows, null, 2));
});

// 5. All import log entries in the range
db.all(`
  SELECT id, file_name, ngay_do_kiem, created_at, status, total_records
  FROM import_log
  WHERE ngay_do_kiem >= '2026-07-17' AND ngay_do_kiem <= '2026-07-23'
  ORDER BY ngay_do_kiem, id
`, [], (err, rows) => {
    if (err) { console.error('IMPORT RANGE ERROR:', err.message); return; }
    console.log('\n=== IMPORT LOG Jul 17-23 ===');
    console.log(JSON.stringify(rows, null, 2));

    setTimeout(() => db.close(), 500);
});
