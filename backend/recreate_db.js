/**
 * recreate_db.js
 *
 * M2 - Application Bootstrap - Phương Án A
 * Mục đích: Xóa database.sqlite cũ và khởi tạo lại hoàn toàn từ schema.sql
 *
 * SSOT: schema.sql là nguồn duy nhất của schema.
 * Sử dụng db.exec() để chạy toàn bộ schema SQL trong một lần.
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH     = path.resolve(__dirname, 'src/db/database.sqlite');
const SCHEMA_PATH = path.resolve(__dirname, 'src/db/schema.sql');

console.log('=== M2 Phương Án A: Recreate Database ===');
console.log(`DB Path   : ${DB_PATH}`);
console.log(`Schema    : ${SCHEMA_PATH}`);
console.log('');

// Step 1: Delete existing database
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('[OK] Đã xóa database.sqlite cũ.');
} else {
    console.log('[INFO] Không tìm thấy database.sqlite cũ — bỏ qua bước xóa.');
}

// Step 2: Read schema.sql
const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
console.log('[OK] Đã đọc schema.sql.');

// Step 3: Create new database and execute entire schema at once
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[FAIL] Không thể tạo database:', err.message);
        process.exit(1);
    }
    console.log('[OK] Database mới được tạo tại:', DB_PATH);

    // db.exec runs the entire SQL script — preserves statement order
    db.exec(schemaSql, (execErr) => {
        if (execErr) {
            console.error('[FAIL] Schema execution failed:', execErr.message);
            process.exit(1);
        }
        console.log('[OK] Schema đã được thực thi thành công.');

        // Verify tables exist
        db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;", [], (err, tables) => {
            if (err) {
                console.error('[FAIL] Không thể đọc danh sách tables:', err.message);
                process.exit(1);
            }
            console.log('');
            console.log('[OK] Tables đã tạo:');
            tables.forEach(t => console.log(`     - ${t.name}`));

            // Verify import_log has created_at column (SSOT: schema.sql)
            db.all("PRAGMA table_info(import_log);", [], (err, cols) => {
                if (err) {
                    console.error('[FAIL] Không thể đọc schema import_log:', err.message);
                    process.exit(1);
                }
                console.log('');
                console.log('[OK] Schema import_log (PRAGMA):');
                cols.forEach(c => console.log(`     - ${c.name} (${c.type}) default=${c.dflt_value}`));

                const hasCreatedAt = cols.some(c => c.name === 'created_at');
                const hasImportDate = cols.some(c => c.name === 'import_date');

                if (hasCreatedAt) {
                    console.log('');
                    console.log('[PASS] created_at xác nhận tồn tại — khớp SSOT schema.sql ✓');
                } else if (hasImportDate) {
                    console.error('[FAIL] Tìm thấy import_date thay vì created_at — schema chưa đúng!');
                    process.exit(1);
                } else {
                    console.error('[FAIL] Không tìm thấy created_at — schema lỗi!');
                    process.exit(1);
                }

                // Verify fact_f13 unique constraint
                db.all("PRAGMA table_info(fact_f13);", [], (err, f13cols) => {
                    if (err) {
                        console.error('[FAIL]:', err.message);
                        process.exit(1);
                    }
                    console.log('');
                    console.log('[OK] fact_f13 columns:', f13cols.length, 'cột (expected: 43)');
                    const hasMaBg = f13cols.some(c => c.name === 'ma_bg');
                    const hasKetQua = f13cols.some(c => c.name === 'ket_qua_f13');
                    console.log(`     ma_bg: ${hasMaBg ? 'OK' : 'MISSING'}`);
                    console.log(`     ket_qua_f13: ${hasKetQua ? 'OK' : 'MISSING'}`);

                    console.log('');
                    console.log('=== Database recreate HOÀN TẤT ===');
                    db.close();
                    process.exit(0);
                });
            });
        });
    });
});
