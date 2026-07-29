'use strict';
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('./src/db/database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

// Direct row counts for 18, 19, 23
db.all(`
  SELECT ngay_do_kiem, COUNT(*) as row_count, COUNT(DISTINCT ma_bg) as distinct_ma_bg, MIN(created_at) as min_c, MAX(created_at) as max_c
  FROM fact_f13
  WHERE ngay_do_kiem IN ('2026-07-18','2026-07-19','2026-07-23')
  GROUP BY ngay_do_kiem
`, [], (err, rows) => {
    console.log('\n=== fact_f13 for 18, 19, 23 ===');
    if (err) console.error(err.message);
    else console.log(JSON.stringify(rows, null, 2));
});

// Check import_log 18/19 by file_name for ALL statuses
db.all(`
  SELECT id, file_name, ngay_do_kiem, status, total_records, error_records, skipped_records, created_at
  FROM import_log
  WHERE file_name IN ('F1.3-2026.07.18.xlsx','F1.3-2026.07.19.xlsx','F1.3-2026.07.23.xlsx')
     OR ngay_do_kiem IN ('2026-07-18','2026-07-19','2026-07-23')
  ORDER BY id
`, [], (err, rows) => {
    console.log('\n=== import_log for 18/19/23 (any status, any file) ===');
    if (err) console.error(err.message);
    else console.log(JSON.stringify(rows, null, 2));
});

// HUE Backfill queue items if that table exists
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
    console.log('\n=== ALL TABLES ===');
    if (err) console.error(err.message);
    else console.log(tables.map(t => t.name).join(', '));
});

// Check Dashboard queries - what dates does the 7-day comparison use?
// Look at distinct ngay_do_kiem available
db.all(`
  SELECT DISTINCT ngay_do_kiem FROM fact_f13
  WHERE ngay_do_kiem >= '2026-07-15'
  ORDER BY ngay_do_kiem
`, [], (err, rows) => {
    console.log('\n=== Available dates >= 2026-07-15 in fact_f13 ===');
    if (err) console.error(err.message);
    else console.log(JSON.stringify(rows, null, 2));
    setTimeout(() => db.close(), 500);
});
