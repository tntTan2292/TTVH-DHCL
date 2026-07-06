const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sqlite.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Lỗi kết nối SQLite:', err.message);
    } else {
        console.log('Đã kết nối thành công tới SQLite database.');
        
        // Bật FOREIGN KEY constraints để đảm bảo Data Integrity
        db.run('PRAGMA foreign_keys = ON;', (err) => {
            if (err) {
                console.error('Lỗi bật foreign_keys:', err.message);
            }
        });
        
        // PRAGMA strict (Cơ chế tùy chọn nếu môi trường hỗ trợ, đối với các version cũ lệnh này bị bỏ qua)
        // SQLite áp dụng Strict Tables từ v3.37.0 trở lên.
        db.run('PRAGMA strict = ON;', (err) => {
            if (err) {
                // Không throw error nếu môi trường không hỗ trợ, chỉ log cảnh báo nhẹ
                console.warn('Môi trường SQLite hiện tại không hỗ trợ PRAGMA strict:', err.message);
            }
        });
    }
});

module.exports = db;
