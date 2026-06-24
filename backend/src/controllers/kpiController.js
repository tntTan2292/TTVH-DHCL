const { get, all } = require('../config/db');

const isValidDate = (dateString) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

// GET /api/f13/dashboard/kpi
async function getDashboardKpi(req, res) {
    let { fromDate, toDate, ma_bcvh } = req.query;
    if (!fromDate || !toDate || !isValidDate(fromDate) || !isValidDate(toDate)) {
        return res.status(400).json({ error: "Invalid date" });
    }

    let bcvhFilter = '';
    let params = [];
    if (ma_bcvh && ma_bcvh !== 'all') {
        bcvhFilter = 'AND ma_bcvh = ?';
        params.push(ma_bcvh);
    }

    // Helper query generator
    const getKpiForRange = async (start, end) => {
        let p = [start, end, ...params];
        let sql = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed
            FROM fact_f13
            WHERE ngay_do_kiem BETWEEN ? AND ? ${bcvhFilter}
        `;
        const r = await get(sql, p);
        const t = r.total || 0;
        const p_val = r.passed || 0;
        return t > 0 ? (p_val / t * 100) : 0;
    };

    try {
        // Today = toDate (mặc định today-1 theo quy ước, nhưng query truyền toDate là điểm cuối)
        const toDateObj = new Date(toDate);
        
        // Yesterday
        const yesterdayObj = new Date(toDateObj);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);
        const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

        // SWC (Same Weekday Comparison): toDate - 7
        const swcObj = new Date(toDateObj);
        swcObj.setDate(swcObj.getDate() - 7);
        const swcStr = swcObj.toISOString().split('T')[0];

        // Week Acc (from toDate - 6 to toDate) -> 7 days
        const weekStartObj = new Date(toDateObj);
        weekStartObj.setDate(weekStartObj.getDate() - 6);
        const weekStartStr = weekStartObj.toISOString().split('T')[0];

        // Month Acc (from 1st of month to toDate)
        const monthStartStr = `${toDate.substring(0, 7)}-01`;

        const todayKpi = await getKpiForRange(toDate, toDate); // using toDate as 'Today'
        const yesterdayKpi = await getKpiForRange(yesterdayStr, yesterdayStr);
        const swcKpi = await getKpiForRange(swcStr, swcStr);
        const weekAccKpi = await getKpiForRange(weekStartStr, toDate);
        const monthAccKpi = await getKpiForRange(monthStartStr, toDate);

        res.json({
            success: true,
            data: {
                today: parseFloat(todayKpi.toFixed(2)),
                yesterday: parseFloat(yesterdayKpi.toFixed(2)),
                dod: parseFloat((todayKpi - yesterdayKpi).toFixed(2)),
                swc: parseFloat((todayKpi - swcKpi).toFixed(2)),
                weekAcc: parseFloat(weekAccKpi.toFixed(2)),
                monthAcc: parseFloat(monthAccKpi.toFixed(2))
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/f13/dashboard/trend
async function getDashboardTrend(req, res) {
    let { toDate, ma_bcvh } = req.query;
    if (!toDate || !isValidDate(toDate)) {
        return res.status(400).json({ error: "Invalid date" });
    }

    const toDateObj = new Date(toDate);
    const startObj = new Date(toDateObj);
    startObj.setDate(startObj.getDate() - 29); // 30 days including toDate
    const startStr = startObj.toISOString().split('T')[0];

    let bcvhFilter = '';
    let params = [startStr, toDate];
    if (ma_bcvh && ma_bcvh !== 'all') {
        bcvhFilter = 'AND ma_bcvh = ?';
        params.push(ma_bcvh);
    }

    const sql = `
        SELECT 
            ngay_do_kiem,
            COUNT(*) as total,
            SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed
        FROM fact_f13
        WHERE ngay_do_kiem BETWEEN ? AND ? ${bcvhFilter}
        GROUP BY ngay_do_kiem
        ORDER BY ngay_do_kiem ASC
    `;

    try {
        const rows = await all(sql, params);
        const data = rows.map(r => {
            const kpi = r.total > 0 ? (r.passed / r.total * 100) : 0;
            return {
                date: r.ngay_do_kiem,
                kpi_rate: parseFloat(kpi.toFixed(2))
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/f13/dashboard/top
async function getDashboardTop(req, res) {
    let { fromDate, toDate } = req.query; // Top only depends on date range
    if (!fromDate || !toDate || !isValidDate(fromDate) || !isValidDate(toDate)) {
        return res.status(400).json({ error: "Invalid date" });
    }

    try {
        // 1. Lowest 3 BCVH
        const sqlLowest = `
            SELECT 
                ma_bcvh, ten_bcvh,
                COUNT(*) as total,
                SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed
            FROM fact_f13
            WHERE ngay_do_kiem BETWEEN ? AND ?
            GROUP BY ma_bcvh, ten_bcvh
            ORDER BY (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) ASC
            LIMIT 3
        `;
        const lowestRows = await all(sqlLowest, [fromDate, toDate]);
        const top3Lowest = lowestRows.map(r => ({
            ma_bcvh: r.ma_bcvh,
            ten_bcvh: r.ten_bcvh,
            kpi_rate: parseFloat((r.total > 0 ? (r.passed / r.total * 100) : 0).toFixed(2))
        }));

        // 2. Top 3 Impact
        // Impact = Fail của BCVH / Fail toàn mạng
        // Bước 1: Tính Fail toàn mạng
        const sqlTotalFail = `SELECT COUNT(*) as total_fail FROM fact_f13 WHERE ngay_do_kiem BETWEEN ? AND ? AND ket_qua_f13='Không đạt'`;
        const { total_fail } = await get(sqlTotalFail, [fromDate, toDate]);

        let top3Impact = [];
        if (total_fail > 0) {
            const sqlImpact = `
                SELECT 
                    ma_bcvh, ten_bcvh,
                    COUNT(*) as fail_count
                FROM fact_f13
                WHERE ngay_do_kiem BETWEEN ? AND ? AND ket_qua_f13='Không đạt'
                GROUP BY ma_bcvh, ten_bcvh
                ORDER BY COUNT(*) DESC
                LIMIT 3
            `;
            const impactRows = await all(sqlImpact, [fromDate, toDate]);
            top3Impact = impactRows.map(r => ({
                ma_bcvh: r.ma_bcvh,
                ten_bcvh: r.ten_bcvh,
                fail_count: r.fail_count,
                impact_rate: parseFloat(((r.fail_count / total_fail) * 100).toFixed(2))
            }));
        }

        res.json({
            success: true,
            data: {
                top3Lowest,
                top3Impact
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/f13/bcvh-ranking
async function getBcvhRanking(req, res) {
    let { fromDate, toDate, ma_bcvh } = req.query;
    if (!fromDate || !toDate || !isValidDate(fromDate) || !isValidDate(toDate)) {
        return res.status(400).json({ error: "Invalid date" });
    }

    let bcvhFilter = '';
    let params = [fromDate, toDate];
    if (ma_bcvh && ma_bcvh !== 'all') {
        bcvhFilter = 'AND ma_bcvh = ?';
        params.push(ma_bcvh);
    }

    const sql = `
        SELECT 
            ma_bcvh,
            ten_bcvh,
            COUNT(*) as total_bg,
            SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed_bg,
            SUM(CASE WHEN ket_qua_f13 = 'Không đạt' THEN 1 ELSE 0 END) as failed_bg
        FROM fact_f13
        WHERE ngay_do_kiem BETWEEN ? AND ? ${bcvhFilter}
        GROUP BY ma_bcvh, ten_bcvh
        ORDER BY (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) DESC, total_bg DESC
    `;

    try {
        const rows = await all(sql, params);
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

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getDashboardKpi,
    getDashboardTrend,
    getDashboardTop,
    getBcvhRanking
};
