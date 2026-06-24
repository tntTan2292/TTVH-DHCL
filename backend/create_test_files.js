const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const INCOMING_DIR = path.resolve(__dirname, 'DataFKCL/F1.3/Incoming');
if (!fs.existsSync(INCOMING_DIR)) fs.mkdirSync(INCOMING_DIR, { recursive: true });

function createExcel(filename, data) {
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    xlsx.writeFile(wb, path.join(INCOMING_DIR, filename));
    console.log("Created", filename);
}

// 1. Valid file 1
createExcel('F1.3-2026.06.15.xlsx', [
    { 'Số hiệu bưu gửi': 'BG001', 'Mã BC phát': 'PhuLoc', 'Tên BC phát': 'Phú Lộc', 'Đánh giá (Đạt/Không đạt)': 'Đạt' },
    { 'Số hiệu bưu gửi': 'BG002', 'Mã BC phát': 'PhuLoc', 'Tên BC phát': 'Phú Lộc', 'Đánh giá (Đạt/Không đạt)': 'Không đạt' }
]);

// 2. Valid file 2 (for sequential test)
createExcel('F1.3-2026.06.16.xlsx', [
    { 'Số hiệu bưu gửi': 'BG003', 'Mã BC phát': 'HuongThuy', 'Tên BC phát': 'Hương Thủy', 'Đánh giá (Đạt/Không đạt)': 'Đạt' }
]);

// 3. Re-import file 1
setTimeout(() => {
    createExcel('F1.3-2026.06.15.xlsx', [
        { 'Số hiệu bưu gửi': 'BG001', 'Mã BC phát': 'PhuLoc', 'Tên BC phát': 'Phú Lộc', 'Đánh giá (Đạt/Không đạt)': 'Không đạt' }
    ]);
}, 2000);

// 4. Invalid prefix
setTimeout(() => {
    createExcel('F4.1-2026.06.15.xlsx', [
        { 'Số hiệu bưu gửi': 'BG004' }
    ]);
}, 4000);

// 5. Missing columns
setTimeout(() => {
    createExcel('F1.3-2026.06.17.xlsx', [
        { 'Số hiệu bưu gửi': 'BG005', 'Mã BC phát': 'HuongThuy' } // Missing Đánh giá
    ]);
}, 6000);
