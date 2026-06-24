const { get, all } = require('../config/db');

// Helper to check valid date format YYYY-MM-DD
const isValidDate = (dateString) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

// GET /api/kpi/summary
// Fetches the top-level network KPI using the covering index (ngay_do_kiem, ma_bcvh, ket_qua_f13)
async function getSummary(req, res) {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate || !isValidDate(startDate) || !isValidDate(endDate)) {
        return res.status(400).json({ error: "Invalid or missing startDate / endDate. Format: YYYY-MM-DD" });
    }

    const sql = `
        SELECT 
            COUNT(*) as total_bg,
            SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed_bg,
            SUM(CASE WHEN ket_qua_f13 = 'Không đạt' THEN 1 ELSE 0 END) as failed_bg
        FROM fact_f13
        WHERE ngay_do_kiem BETWEEN ? AND ?
    `;

    try {
        const result = await get(sql, [startDate, endDate]);
        const total = result.total_bg || 0;
        const passed = result.passed_bg || 0;
        const failed = result.failed_bg || 0;
        const kpi_rate = total > 0 ? (passed / total * 100) : 0;

        res.json({
            success: true,
            data: {
                total_bg: total,
                passed_bg: passed,
                failed_bg: failed,
                kpi_rate: parseFloat(kpi_rate.toFixed(2))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/kpi/bcvh-ranking
// Fetches BCVH ranking sorted by KPI rate
async function getBcvhRanking(req, res) {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate || !isValidDate(startDate) || !isValidDate(endDate)) {
        return res.status(400).json({ error: "Invalid or missing startDate / endDate. Format: YYYY-MM-DD" });
    }

    const sql = `
        SELECT 
            ma_bcvh,
            ten_bcvh,
            COUNT(*) as total_bg,
            SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed_bg,
            SUM(CASE WHEN ket_qua_f13 = 'Không đạt' THEN 1 ELSE 0 END) as failed_bg
        FROM fact_f13
        WHERE ngay_do_kiem BETWEEN ? AND ?
        GROUP BY ma_bcvh, ten_bcvh
        ORDER BY (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) DESC, total_bg DESC
    `;

    try {
        const rows = await all(sql, [startDate, endDate]);
        const data = rows.map((row, index) => {
            const total = row.total_bg || 0;
            const passed = row.passed_bg || 0;
            const failed = row.failed_bg || 0;
            const kpi_rate = total > 0 ? (passed / total * 100) : 0;
            return {
                rank: index + 1,
                ma_bcvh: row.ma_bcvh,
                ten_bcvh: row.ten_bcvh,
                total_bg: total,
                passed_bg: passed,
                failed_bg: failed,
                kpi_rate: parseFloat(kpi_rate.toFixed(2))
            };
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getSummary,
    getBcvhRanking
};
