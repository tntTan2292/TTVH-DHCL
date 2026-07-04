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
        d.setDate(d.getDate() - 7);
        const last7DaysStr = d.toISOString().split('T')[0];

        // Fetch configs
        let anomalyDropThreshold = 5.0;
        let anomalyGapThreshold = 10.0;
        let specialUnitVolThreshold = null;
        let specialUnitPctThreshold = null;

        try {
            const configs = await all("SELECT config_key, config_value FROM system_config WHERE config_key IN ('anomaly_drop_threshold', 'anomaly_gap_threshold', 'special_unit_vol_threshold', 'special_unit_pct_threshold')");
            configs.forEach(c => {
                if (c.config_key === 'anomaly_drop_threshold') anomalyDropThreshold = parseFloat(c.config_value);
                if (c.config_key === 'anomaly_gap_threshold') anomalyGapThreshold = parseFloat(c.config_value);
                if (c.config_key === 'special_unit_vol_threshold') specialUnitVolThreshold = parseInt(c.config_value, 10);
                if (c.config_key === 'special_unit_pct_threshold') specialUnitPctThreshold = parseFloat(c.config_value);
            });
        } catch (e) {
            console.error("Failed to load configs, using defaults.");
        }

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
        
        // Average KPI of each BCVH in the last 7 days
        const avgBcvhSql = `
            SELECT ma_bcvh, 
                   (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100 as avg_kpi
            FROM fact_f13
            WHERE ngay_do_kiem BETWEEN ? AND ?
            GROUP BY ma_bcvh
        `;

        const todayData = await all(todaySql, [fromDate, toDate]);
        const avgBcvhData = await all(avgBcvhSql, [last7DaysStr, toDate]);

        const avgMap = {};
        avgBcvhData.forEach(r => avgMap[r.ma_bcvh] = r.avg_kpi);

        // Province average for today
        const provinceAvg = todayData.reduce((acc, curr) => acc + curr.kpi_rate, 0) / (todayData.length || 1);
        const totalProvinceVol = todayData.reduce((acc, curr) => acc + curr.total_bg, 0);

        const SPECIAL_UNITS = ['Khách hàng lớn', 'Trần Hưng Đạo'];

        // 2. Evaluate Rules (Anomaly Detection & Special Units)
        for (const bcvh of todayData) {
            // Rule: Special Units exclusion logic
            const isSpecialUnit = SPECIAL_UNITS.includes(bcvh.ten_bcvh);
            if (isSpecialUnit) {
                const vol = bcvh.total_bg;
                const pct = totalProvinceVol > 0 ? (vol / totalProvinceVol) * 100 : 0;
                
                let bypass = true;
                if (specialUnitVolThreshold !== null && vol >= specialUnitVolThreshold) bypass = false;
                if (specialUnitPctThreshold !== null && pct >= specialUnitPctThreshold) bypass = false;

                if (bypass) {
                    continue; // Bypass recommendation generation completely
                }
            }
            const kpi = bcvh.kpi_rate;
            const ownAvg = avgMap[bcvh.ma_bcvh] || kpi;
            
            const drop = ownAvg - kpi;
            const gap = provinceAvg - kpi;
            
            let priority = null;
            let condition = '';
            let impact = '';
            let action = '';
            let category = '';

            if (drop >= anomalyDropThreshold && gap >= anomalyGapThreshold) {
                priority = 'P1';
                category = 'Bất thường kép';
                condition = `${bcvh.ten_bcvh} giảm sâu ${drop.toFixed(1)}% so với trung bình tự thân VÀ thấp hơn toàn mạng ${gap.toFixed(1)}%.`;
                impact = 'Dấu hiệu rủi ro hệ thống hoặc ùn ứ cục bộ nghiêm trọng.';
                action = 'Giám đốc trực tiếp chỉ đạo, yêu cầu báo cáo giải trình.';
            } else if (drop >= anomalyDropThreshold) {
                priority = 'P2';
                category = 'Giảm đột biến';
                condition = `${bcvh.ten_bcvh} có KPI giảm mạnh ${drop.toFixed(1)}% so với trung bình tuần của chính đơn vị.`;
                impact = 'Dấu hiệu sa sút phong độ hoặc phát sinh sự cố vận hành hôm nay.';
                action = 'Điều phối viên liên hệ rà soát tồn đọng ca chiều.';
            } else if (gap >= anomalyGapThreshold) {
                priority = 'P2';
                category = 'Tụt hậu toàn mạng';
                condition = `${bcvh.ten_bcvh} có KPI thấp hơn trung bình toàn mạng ${gap.toFixed(1)}%.`;
                impact = 'Làm kéo tụt chất lượng chung của Tỉnh.';
                action = 'Đưa vào diện giám sát đặc biệt, yêu cầu cam kết chất lượng.';
            }

            if (priority) {
                const prioConfig = PRIORITY[priority];
                recommendations.push({
                    id: `rec_${bcvh.ma_bcvh}_${priority}`,
                    priority: priority,
                    level: prioConfig.level,
                    color: prioConfig.color,
                    icon: prioConfig.icon,
                    category: category,
                    ten_bcvh: bcvh.ten_bcvh,
                    condition: condition,
                    impact: impact,
                    action: action,
                    failed_bg: bcvh.failed_bg // Used for tie-breaking
                });
            }
        }

        // 3. Sort Recommendations by Priority and failed volume
        recommendations.sort((a, b) => {
            if (a.priority < b.priority) return -1;
            if (a.priority > b.priority) return 1;
            return b.failed_bg - a.failed_bg;
        });

        // 4. Return max 5 recommendations
        return recommendations.slice(0, 5);
    }
}

module.exports = new RuleEngineService();
