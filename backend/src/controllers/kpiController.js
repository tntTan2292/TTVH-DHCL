const { get, all } = require('../config/db');
const ruleEngineService = require('../services/ruleEngineService');
const timelineService = require('../services/timelineService');
const messageGenerationService = require('../services/messageGenerationService');

const isValidDate = (dateString) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

// GET /api/f13/dashboard/kpi
// SSOT References:
// - F13_001: KPI F1.3 (Bưu gửi Đạt / Tổng Bưu gửi)
// - F13_101: Tổng Bưu gửi
// - F13_102: Bưu gửi Đạt
// - F13_103: Bưu gửi Không đạt
// - F13_104: Tỷ lệ Không đạt
// - SWC (business_rules.md § 5): Current Date vs Current Date - 7 ngày
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

    // Helper query generator for a specific date range
    const getMetricsForRange = async (start, end) => {
        let p = [start, end, ...params];
        let sql = `
            SELECT 
                COUNT(*) as tong_buu_gui,
                SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as buu_gui_dat,
                SUM(CASE WHEN ket_qua_f13 = 'Không đạt' THEN 1 ELSE 0 END) as buu_gui_khong_dat
            FROM fact_f13
            WHERE ngay_do_kiem BETWEEN ? AND ? ${bcvhFilter}
        `;
        const r = await get(sql, p);
        const t = r.tong_buu_gui || 0;
        const dat = r.buu_gui_dat || 0;
        const khong_dat = r.buu_gui_khong_dat || 0;
        const kpi = t > 0 ? (dat / t * 100) : 0;
        const ty_le_khong_dat = t > 0 ? (khong_dat / t * 100) : 0;
        return {
            tong_buu_gui: t,
            buu_gui_dat: dat,
            buu_gui_khong_dat: khong_dat,
            kpi: kpi,
            ty_le_khong_dat: ty_le_khong_dat
        };
    };

    try {
        // According to business rules, SWC is Current Date vs Current Date - 7.
        // We use toDate as the Current Date for "Today" metric.
        const toDateObj = new Date(toDate);
        
        // Yesterday (toDate - 1)
        const yesterdayObj = new Date(toDateObj);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);
        const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

        // SWC (toDate - 7)
        const swcObj = new Date(toDateObj);
        swcObj.setDate(swcObj.getDate() - 7);
        const swcStr = swcObj.toISOString().split('T')[0];

        // Fetch metrics
        const todayMetrics = await getMetricsForRange(toDate, toDate); // Snapshot today
        const yesterdayMetrics = await getMetricsForRange(yesterdayStr, yesterdayStr); // Snapshot yesterday
        const swcMetrics = await getMetricsForRange(swcStr, swcStr); // Snapshot SWC
        
        // Aggregate for the selected period [fromDate, toDate]
        const periodMetrics = await getMetricsForRange(fromDate, toDate);

        // Fetch rank if ma_bcvh is provided
        let currentRank = 1, yesterdayRank = 1, swcRank = 1;
        
        let defaultProvinceCode = null;
        try {
            const row = await get("SELECT config_value FROM system_config WHERE config_key = 'default_province_code'");
            if (row && row.config_value) {
                defaultProvinceCode = row.config_value;
            }
        } catch (e) {
            console.error('[getDashboardKpi] Error loading default_province_code:', e.message);
        }

        if (!defaultProvinceCode) {
            return res.status(500).json({ error: "Missing system configuration: default_province_code" });
        }

        if (ma_bcvh && ma_bcvh !== 'all') {
            const getRank = async (dateStr) => {
                const sql = `
                    SELECT ma_bcvh, (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) as rate
                    FROM fact_f13
                    WHERE ngay_do_kiem = ?
                    GROUP BY ma_bcvh
                    ORDER BY rate DESC, COUNT(*) DESC
                `;
                const rows = await all(sql, [dateStr]);
                const idx = rows.findIndex(r => r.ma_bcvh === ma_bcvh);
                return idx !== -1 ? idx + 1 : rows.length + 1; // if not found, put at the end
            };
            currentRank = await getRank(toDate);
            yesterdayRank = await getRank(yesterdayStr);
            swcRank = await getRank(swcStr);
        } else {
            // National Ranking for configured province
            const getNationalRank = async (dateStr) => {
                const sql = `
                    SELECT ma_tinh_phat, tl_ptc_dung_qd_ct as rate
                    FROM fact_f13_national
                    WHERE ngay_do_kiem = ?
                    ORDER BY rate DESC, sl_bg_ptc DESC
                `;
                const rows = await all(sql, [dateStr]);
                const idx = rows.findIndex(r => r.ma_tinh_phat === defaultProvinceCode);
                // if not found, put at the end or return null (if no data yet). Returning rows.length + 1 is fine or just 1 if no rows.
                return rows.length === 0 ? 0 : (idx !== -1 ? idx + 1 : rows.length + 1);
            };
            currentRank = await getNationalRank(toDate);
            yesterdayRank = await getNationalRank(yesterdayStr);
            swcRank = await getNationalRank(swcStr);
        }

        res.json({
            success: true,
            data: {
                // KPI
                today: parseFloat(todayMetrics.kpi.toFixed(2)),
                yesterday: parseFloat(yesterdayMetrics.kpi.toFixed(2)),
                dod: parseFloat((todayMetrics.kpi - yesterdayMetrics.kpi).toFixed(2)),
                swc: parseFloat((todayMetrics.kpi - swcMetrics.kpi).toFixed(2)),
                
                // Sản lượng (Total)
                tong_buu_gui: todayMetrics.tong_buu_gui,
                tong_buu_gui_dod: todayMetrics.tong_buu_gui - yesterdayMetrics.tong_buu_gui,
                tong_buu_gui_swc: todayMetrics.tong_buu_gui - swcMetrics.tong_buu_gui,
                
                // Đạt (Passed)
                buu_gui_dat: todayMetrics.buu_gui_dat,
                buu_gui_dat_dod: todayMetrics.buu_gui_dat - yesterdayMetrics.buu_gui_dat,
                buu_gui_dat_swc: todayMetrics.buu_gui_dat - swcMetrics.buu_gui_dat,
                
                // Không đạt (Failed)
                buu_gui_khong_dat: todayMetrics.buu_gui_khong_dat,
                buu_gui_khong_dat_dod: todayMetrics.buu_gui_khong_dat - yesterdayMetrics.buu_gui_khong_dat,
                buu_gui_khong_dat_swc: todayMetrics.buu_gui_khong_dat - swcMetrics.buu_gui_khong_dat,
                
                // Tỷ lệ Không đạt
                ty_le_khong_dat: parseFloat(todayMetrics.ty_le_khong_dat.toFixed(2)),

                // Xếp hạng (Rank)
                rank: currentRank,
                rankDod: currentRank - yesterdayRank, // if rank goes down (number increases), meaning rankDod > 0 is bad
                rankSwc: currentRank - swcRank
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
        const allowedBcvh = ['537015', '535790', '533140', '536250', '535470', '537220'];
        const bcvhFilter = `AND ma_bcvh IN (${allowedBcvh.map(id => `'${id}'`).join(',')})`;

        // 1. Lowest 2 BCVH
        const sqlLowest = `
            SELECT 
                ma_bcvh, ten_bcvh,
                COUNT(*) as total,
                SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed
            FROM fact_f13
            WHERE ngay_do_kiem BETWEEN ? AND ? ${bcvhFilter}
            GROUP BY ma_bcvh, ten_bcvh
            ORDER BY (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) ASC, COUNT(*) DESC
            LIMIT 2
        `;
        const lowestRows = await all(sqlLowest, [fromDate, toDate]);
        const lowest = lowestRows.map(r => ({
            ma_bcvh: r.ma_bcvh,
            ten_bcvh: r.ten_bcvh,
            kpi_rate: parseFloat((r.total > 0 ? (r.passed / r.total * 100) : 0).toFixed(2))
        }));

        // 2. Best 2 BCVH
        const sqlBest = `
            SELECT 
                ma_bcvh, ten_bcvh,
                COUNT(*) as total,
                SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed
            FROM fact_f13
            WHERE ngay_do_kiem BETWEEN ? AND ? ${bcvhFilter}
            GROUP BY ma_bcvh, ten_bcvh
            ORDER BY (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) DESC, COUNT(*) DESC
            LIMIT 2
        `;
        const bestRows = await all(sqlBest, [fromDate, toDate]);
        const best = bestRows.map(r => ({
            ma_bcvh: r.ma_bcvh,
            ten_bcvh: r.ten_bcvh,
            kpi_rate: parseFloat((r.total > 0 ? (r.passed / r.total * 100) : 0).toFixed(2))
        }));

        res.json({
            success: true,
            data: {
                best,
                lowest
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

// GET /api/f13/bcvh-list
// Returns distinct BCVH list for the GlobalFilter dropdown.
// Source: fact_f13 table (data_blueprint.md § 2 Entity 01 - BCVH)
async function getBcvhList(req, res) {
    const sql = `
        SELECT DISTINCT ma_bcvh, ten_bcvh
        FROM fact_f13
        WHERE ma_bcvh IS NOT NULL AND ten_bcvh IS NOT NULL
        ORDER BY ten_bcvh ASC
    `;
    try {
        const rows = await all(sql, []);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/f13/dashboard/recommendations
async function getRecommendations(req, res) {
    let { fromDate, toDate } = req.query;
    if (!fromDate || !toDate || !isValidDate(fromDate) || !isValidDate(toDate)) {
        return res.status(400).json({ error: "Invalid date" });
    }

    try {
        const recommendations = await ruleEngineService.evaluate(fromDate, toDate);
        res.json({ success: true, data: recommendations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/f13/dashboard/quality-timeline
async function getQualityTimeline(req, res) {
    let { toDate, ma_bcvh } = req.query;
    if (!toDate || !isValidDate(toDate)) {
        return res.status(400).json({ error: "Invalid date" });
    }

    try {
        const timelineData = await timelineService.getQualityTimeline(toDate, ma_bcvh);
        res.json({ success: true, data: timelineData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/f13/dashboard/message
async function getDashboardMessage(req, res) {
    let { toDate } = req.query;
    if (!toDate || !isValidDate(toDate)) {
        return res.status(400).json({ error: "Invalid date" });
    }

    try {
        const messages = await messageGenerationService.generateMessages(toDate);
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET /api/f13/dashboard/meta
async function getDashboardMeta(req, res) {
    try {
        const { max_date } = await get(`SELECT MAX(ngay_do_kiem) as max_date FROM fact_f13`);
        res.json({ success: true, data: { max_date } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getDashboardKpi,
    getDashboardTrend,
    getDashboardTop,
    getBcvhRanking,
    getBcvhList,
    getRecommendations,
    getQualityTimeline,
    getDashboardMessage,
    getDashboardMeta
};
