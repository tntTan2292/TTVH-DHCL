const fs = require('fs');
const path = require('path');
const db = require('./sqlite');

const direction = process.argv[2] === 'down' ? 'down' : 'up';
const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
    try {
        if (!fs.existsSync(migrationsDir)) {
            console.log(`Thư mục migrations không tồn tại: ${migrationsDir}`);
            process.exit(0);
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith(`_${direction}.sql`))
            .sort();

        // Chạy migration down theo thứ tự ngược
        if (direction === 'down') {
            files.reverse();
        }

        if (files.length === 0) {
            console.log(`Không tìm thấy file migration cho hướng: ${direction}`);
            process.exit(0);
        }

        // Chạy qua db.exec hỗ trợ chạy một khối SQL text lớn chứa nhiều câu lệnh
        console.log(`Bắt đầu chạy migration ${direction}...`);
        
        let processedCount = 0;
        
        // Vì db.exec là bất đồng bộ và sqlite3 serialize execution
        db.serialize(() => {
            // Không chạy file migration trong một Transaction tổng nếu SQL chứa CREATE TABLE. 
            // Ta để db.exec xử lý file sql.
            files.forEach(file => {
                const filePath = path.join(migrationsDir, file);
                console.log(`- Thực thi: ${file}`);
                const sql = fs.readFileSync(filePath, 'utf8');

                db.exec(sql, (err) => {
                    if (err) {
                        console.error(`Lỗi tại file ${file}:`, err.message);
                        process.exit(1);
                    }
                    processedCount++;
                    if (processedCount === files.length) {
                        console.log(`Hoàn tất chạy ${processedCount} file migration hướng ${direction}.`);
                        process.exit(0);
                    }
                });
            });
        });

    } catch (err) {
        console.error('Lỗi hệ thống khi chạy migrate:', err);
        process.exit(1);
    }
}

runMigrations();
