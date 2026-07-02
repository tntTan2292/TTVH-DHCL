const { all } = require('../config/db');

/**
 * ARCH-001: Backend Service for Rule Engine & Recommendation Generation.
 */

// Business Thresholds (SSOT)
const THRESHOLD = {
    DANGER: 90,
    WARNING: 95
};

// Priority Levels
const PRIORITY = {
    P1: { id: 'P1', level: 'Nguy hiểm', color: 'red', icon: 'AlertTriangle' },
    P2: { id: 'P2', level: 'Cảnh báo', color: 'orange', icon: 'AlertCircle' },
    P3: { id: 'P3', level: 'Lưu ý', color: 'blue', icon: 'Info' },
    P4: { id: 'P4', level: 'Theo dõi', color: 'gray', icon: 'Info' }
};

class RuleEngineService {
    
    async evaluate(fromDate, toDate) {
        const recommendations = [];
        
        // 1. Fetch raw data required for evaluation
        // We need today's performance, yesterday's performance for all BCVHs
        const d = new Date(toDate);
        d.setDate(d.getDate() - 1);
        const yesterdayStr = d.toISOString().split('T')[0];

        const todaySql = `
            SELECT ma_bcvh, ten_bcvh, 
                   COUNT(*) as total_bg,
                   SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed_bg,
                   SUM(CASE WHEN ket_qua_f13 = 'Không đạt' THEN 1 ELSE 0 END) as failed_bg,
                   (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100 as kpi_rate
            FROM fact_f13
            WHERE ngay_do_kiem BETWEEN ? AND ?
            GROUP BY ma_bcvh, ten_bcvh
        `;
        
        const yesterdaySql = `
            SELECT ma_bcvh, 
                   (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100 as kpi_rate
            FROM fact_f13
            WHERE ngay_do_kiem = ?
            GROUP BY ma_bcvh
        `;

        const todayData = await all(todaySql, [fromDate, toDate]);
        const yesterdayData = await all(yesterdaySql, [yesterdayStr]);

        const yMap = {};
        yesterdayData.forEach(r => yMap[r.ma_bcvh] = r.kpi_rate);

        // Sort to get Top 1 failed
        const topFailed = [...todayData].sort((a, b) => b.failed_bg - a.failed_bg)[0];

        // 2. Evaluate Rules (Rule Provider)
        for (const bcvh of todayData) {
            const kpi = bcvh.kpi_rate;
            const yKpi = yMap[bcvh.ma_bcvh] || kpi;
            const drop = yKpi - kpi;
            
            let ruleTriggered = false;

            // RULE P1: KPI giảm sâu đột biến (>5% so với hôm qua) HOẶC rớt khỏi ngưỡng 90%
            if (kpi < THRESHOLD.DANGER || drop > 5) {
                recommendations.push({
                    id: `rec_${bcvh.ma_bcvh}_P1`,
                    priority: 'P1',
                    level: PRIORITY.P1.level,
                    color: PRIORITY.P1.color,
                    icon: PRIORITY.P1.icon,
                    category: kpi < THRESHOLD.DANGER ? 'Chất lượng kém' : 'Tụt hạng',
                    ten_bcvh: bcvh.ten_bcvh,
                    condition: `${bcvh.ten_bcvh} có KPI ${kpi.toFixed(2)}%${drop > 5 ? ` (giảm mạnh ${drop.toFixed(2)}% so với hôm qua)` : ' (nằm dưới ngưỡng 90%)'}.`,
                    impact: 'Nguy cơ ảnh hưởng nghiêm trọng đến KPI toàn mạng lưới.',
                    action: 'Lập tức rà soát tồn đọng ca chiều, tăng cường lực lượng xử lý.'
                });
                ruleTriggered = true;
            }

            // RULE P2: Rớt khỏi ngưỡng 95% HOẶC lỗi nhiều nhất toàn mạng
            if (!ruleTriggered && (kpi < THRESHOLD.WARNING || (topFailed && bcvh.ma_bcvh === topFailed.ma_bcvh))) {
                recommendations.push({
                    id: `rec_${bcvh.ma_bcvh}_P2`,
                    priority: 'P2',
                    level: PRIORITY.P2.level,
                    color: PRIORITY.P2.color,
                    icon: PRIORITY.P2.icon,
                    category: (topFailed && bcvh.ma_bcvh === topFailed.ma_bcvh) ? 'Lỗi tập trung' : 'Chất lượng kém',
                    ten_bcvh: bcvh.ten_bcvh,
                    condition: (topFailed && bcvh.ma_bcvh === topFailed.ma_bcvh) 
                        ? `${bcvh.ten_bcvh} đang có ${bcvh.failed_bg} bưu gửi lỗi, cao nhất toàn mạng.`
                        : `${bcvh.ten_bcvh} rớt khỏi ngưỡng an toàn 95% (hiện tại ${kpi.toFixed(2)}%).`,
                    impact: 'Dấu hiệu rủi ro, có thể trượt xuống mức nguy hiểm nếu không xử lý.',
                    action: 'Kiểm tra nguyên nhân trễ phát tại các tuyến vùng sâu hoặc điều phối xe.'
                });
                ruleTriggered = true;
            }

            // RULE P3/P4 could be implemented similarly. For brevity, we stick to P1 and P2 for core issues.
        }

        // 3. Sort Recommendations by Priority
        recommendations.sort((a, b) => {
            if (a.priority < b.priority) return -1;
            if (a.priority > b.priority) return 1;
            return 0;
        });

        return recommendations;
    }
}

module.exports = new RuleEngineService();
