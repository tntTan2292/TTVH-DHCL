const { get, all } = require('../config/db');
const fs = require('fs');
const path = require('path');

const INCOMING_DIR = path.resolve(process.cwd(), '../DataFKCL/F1.3/Incoming');

async function getImportStatus(req, res) {
    try {
        // Đếm số file trong Incoming
        let pendingFiles = 0;
        if (fs.existsSync(INCOMING_DIR)) {
            pendingFiles = fs.readdirSync(INCOMING_DIR).filter(f => f.endsWith('.xlsx')).length;
        }

        // Truy vấn DB cho thông kê
        const statsSql = `
            SELECT 
                SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successCount,
                SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failCount,
                MAX(import_date) as lastImportTime
            FROM import_log
        `;
        const stats = await get(statsSql);

        // Truy vấn danh sách lịch sử gần nhất (top 20)
        const logsSql = `
            SELECT id, file_name as ten_file, ngay_do_kiem as ngay_so_lieu, status as trang_thai, total_records as so_luong_bg, import_date as ngay_import
            FROM import_log
            ORDER BY id DESC
            LIMIT 20
        `;
        const logs = await all(logsSql);

        res.json({
            success: true,
            data: {
                pendingCount: pendingFiles,
                successCount: stats.successCount || 0,
                failCount: stats.failCount || 0,
                lastImport: stats.lastImportTime || null,
                recentLogs: logs
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    getImportStatus
};
