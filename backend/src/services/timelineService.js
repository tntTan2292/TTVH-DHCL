const { all } = require('../config/db');

class TimelineService {
    async getQualityTimeline(toDate, ma_bcvh) {
        // Query data for the last 90 days to establish strong patterns
        const endDate = new Date(toDate);
        const startDate = new Date(toDate);
        startDate.setDate(startDate.getDate() - 89); // 90 days total

        const endStr = endDate.toISOString().split('T')[0];
        const startStr = startDate.toISOString().split('T')[0];

        let bcvhFilter = '';
        let params = [startStr, endStr];
        if (ma_bcvh && ma_bcvh !== 'all') {
            bcvhFilter = 'AND ma_bcvh = ?';
            params.push(ma_bcvh);
        }

        const sql = `
            SELECT 
                ngay_do_kiem,
                COUNT(*) as total_bg,
                SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed_bg
            FROM fact_f13
            WHERE ngay_do_kiem BETWEEN ? AND ? ${bcvhFilter}
            GROUP BY ngay_do_kiem
            ORDER BY ngay_do_kiem ASC
        `;

        const rows = await all(sql, params);
        
        // Build base map
        const dataMap = {};
        rows.forEach(r => {
            dataMap[r.ngay_do_kiem] = {
                date: r.ngay_do_kiem,
                total: r.total_bg,
                passed: r.passed_bg,
                kpi_rate: r.total_bg > 0 ? (r.passed_bg / r.total_bg) * 100 : 0
            };
        });

        // Generate all dates in the 90-day range to ensure no gaps
        const allDates = [];
        let curr = new Date(startStr);
        while (curr <= endDate) {
            allDates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        const fullData = allDates.map(d => {
            if (dataMap[d]) return dataMap[d];
            return { date: d, total: 0, passed: 0, kpi_rate: 0, isEmpty: true };
        });

        // 1. Daily Timeline (last 30 days only)
        const dailyTimeline = fullData.slice(-30).map(d => ({
            date: d.date,
            kpi_rate: parseFloat(d.kpi_rate.toFixed(2)),
            color: d.kpi_rate >= 70 ? 'green' : (d.kpi_rate >= 60 ? 'pink' : (d.kpi_rate >= 50 ? 'yellow' : 'red'))
        }));

        // 2. Weekly Pattern (Average by day of week over 90 days)
        const weekDays = [
            { id: 1, name: 'T2', sum: 0, count: 0 },
            { id: 2, name: 'T3', sum: 0, count: 0 },
            { id: 3, name: 'T4', sum: 0, count: 0 },
            { id: 4, name: 'T5', sum: 0, count: 0 },
            { id: 5, name: 'T6', sum: 0, count: 0 },
            { id: 6, name: 'T7', sum: 0, count: 0 },
            { id: 0, name: 'CN', sum: 0, count: 0 }
        ];

        fullData.forEach(d => {
            if (!d.isEmpty) {
                const dayOfWeek = new Date(d.date).getDay();
                const target = weekDays.find(w => w.id === dayOfWeek);
                if (target) {
                    target.sum += d.kpi_rate;
                    target.count += 1;
                }
            }
        });

        const weeklyPattern = weekDays.map(w => {
            const avg = w.count > 0 ? w.sum / w.count : 0;
            return {
                day: w.name,
                avg_kpi: parseFloat(avg.toFixed(2)),
                color: avg >= 70 ? 'green' : (avg >= 60 ? 'pink' : (avg >= 50 ? 'yellow' : 'red'))
            };
        });
        // Reorder so T2 is first, CN is last
        const orderedWeekly = [
            ...weeklyPattern.filter(w => w.day !== 'CN'),
            weeklyPattern.find(w => w.day === 'CN')
        ];

        // 3. Monthly Pattern (Average by day of month over 90 days)
        const monthDays = Array.from({ length: 31 }, (_, i) => ({ day: i + 1, sum: 0, count: 0 }));
        fullData.forEach(d => {
            if (!d.isEmpty) {
                const dom = new Date(d.date).getDate();
                const target = monthDays.find(m => m.day === dom);
                if (target) {
                    target.sum += d.kpi_rate;
                    target.count += 1;
                }
            }
        });

        const monthlyPattern = monthDays.map(m => {
            const avg = m.count > 0 ? m.sum / m.count : 0;
            return {
                day: `Ngày ${m.day}`,
                avg_kpi: parseFloat(avg.toFixed(2)),
                color: avg >= 70 ? '#22c55e' : (avg >= 60 ? '#ec4899' : (avg >= 50 ? '#eab308' : '#ef4444')) // Direct hex for Recharts Area
            };
        });

        // 4. Quality Calendar (Heatmap for last 30 days)
        // Group into weeks for easier rendering
        const calendarData = [];
        const last30 = fullData.slice(-30);
        let currentWeek = [];
        
        // Pad the first week to start on Monday
        if (last30.length > 0) {
            let firstDay = new Date(last30[0].date).getDay();
            let padDays = firstDay === 0 ? 6 : firstDay - 1;
            for (let i = 0; i < padDays; i++) {
                currentWeek.push(null);
            }
        }

        last30.forEach((d, index) => {
            currentWeek.push({
                date: d.date,
                kpi_rate: parseFloat(d.kpi_rate.toFixed(2)),
                dod: index > 0 && !last30[index-1].isEmpty && !d.isEmpty ? parseFloat((d.kpi_rate - last30[index-1].kpi_rate).toFixed(2)) : 0,
                color: d.isEmpty ? 'gray' : (d.kpi_rate >= 70 ? 'green' : (d.kpi_rate >= 60 ? 'pink' : (d.kpi_rate >= 50 ? 'yellow' : 'red')))
            });
            if (currentWeek.length === 7) {
                calendarData.push(currentWeek);
                currentWeek = [];
            }
        });
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            calendarData.push(currentWeek);
        }

        // 5. Quality Pulse (Momentum of last 3 days vs previous 3 days)
        let pulse = {
            status: 'NEUTRAL',
            text: 'Chưa đủ dữ liệu để phân tích nhịp đập chất lượng.',
            color: 'gray'
        };

        if (last30.length >= 6) {
            const validLast30 = last30.filter(d => !d.isEmpty);
            if (validLast30.length >= 6) {
                const latest3 = validLast30.slice(-3);
                const prev3 = validLast30.slice(-6, -3);
                
                const avgLatest = latest3.reduce((acc, curr) => acc + curr.kpi_rate, 0) / 3;
                const avgPrev = prev3.reduce((acc, curr) => acc + curr.kpi_rate, 0) / 3;
                
                const diff = avgLatest - avgPrev;

                if (diff < -2) {
                    pulse = { status: 'DANGER', text: `Hệ thống đang rơi tự do (giảm ${Math.abs(diff).toFixed(2)}% so với 3 ngày trước). Cần can thiệp gấp!`, color: 'red' };
                } else if (diff < -0.5) {
                    pulse = { status: 'WARNING', text: `Chất lượng đang có xu hướng đi xuống nhẹ (giảm ${Math.abs(diff).toFixed(2)}%). Cần theo dõi sát.`, color: 'orange' };
                } else if (diff > 1) {
                    pulse = { status: 'SUCCESS', text: `Hệ thống đang phục hồi mạnh mẽ (tăng ${diff.toFixed(2)}%). Tiếp tục duy trì nguồn lực!`, color: 'green' };
                } else {
                    pulse = { status: 'STABLE', text: `Chất lượng đang duy trì ổn định (biến thiên ${diff.toFixed(2)}%).`, color: 'blue' };
                }
            }
        }

        return {
            daily: dailyTimeline,
            weekly: orderedWeekly,
            monthly: monthlyPattern,
            heatmap: calendarData,
            pulse: pulse
        };
    }
}

module.exports = new TimelineService();
