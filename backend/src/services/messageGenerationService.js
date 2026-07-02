const { all } = require('../config/db');

class MessageGenerationService {
    
    async generateMessages(toDate) {
        // Fetch data for toDate, yesterday, and swc
        const d = new Date(toDate);
        
        const yesterday = new Date(d);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];

        const swc = new Date(d);
        swc.setDate(swc.getDate() - 7);
        const swcStr = swc.toISOString().split('T')[0];

        const getMetrics = async (dateStr) => {
            const sql = `
                SELECT 
                    ma_bcvh, ten_bcvh,
                    COUNT(*) as total,
                    SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1 ELSE 0 END) as passed,
                    SUM(CASE WHEN ket_qua_f13 = 'Không đạt' THEN 1 ELSE 0 END) as failed
                FROM fact_f13
                WHERE ngay_do_kiem = ?
                GROUP BY ma_bcvh, ten_bcvh
                ORDER BY (SUM(CASE WHEN ket_qua_f13 = 'Đạt' THEN 1.0 ELSE 0.0 END) / COUNT(*)) DESC, COUNT(*) DESC
            `;
            const rows = await all(sql, [dateStr]);
            
            let total = 0, passed = 0, failed = 0;
            rows.forEach(r => {
                total += r.total; passed += r.passed; failed += r.failed;
                r.kpi = r.total > 0 ? (r.passed / r.total) * 100 : 0;
            });
            
            const kpi = total > 0 ? (passed / total) * 100 : 0;
            return { rows, total, passed, failed, kpi };
        };

        const [curr, yest, lastW] = await Promise.all([
            getMetrics(toDate),
            getMetrics(yStr),
            getMetrics(swcStr)
        ]);

        if (curr.total === 0) {
            return {
                dieu_hanh: "Chưa có dữ liệu cho ngày được chọn.",
                bao_cao: "Chưa có dữ liệu cho ngày được chọn."
            };
        }

        // Calculations
        const dodKpi = curr.kpi - yest.kpi;
        const swcKpi = curr.kpi - lastW.kpi;
        
        const topBcvh = curr.rows.slice(0, 3).map(r => `${r.ten_bcvh} (${r.kpi.toFixed(2)}%)`).join(', ');
        const bottomBcvh = curr.rows.slice(-3).map(r => `${r.ten_bcvh} (${r.kpi.toFixed(2)}%)`).join(', ');
        
        // Find improvements and declines compared to yesterday
        let improved = [];
        let declined = [];
        
        const yMap = {};
        yest.rows.forEach(r => yMap[r.ma_bcvh] = r.kpi);
        
        curr.rows.forEach(r => {
            if (yMap[r.ma_bcvh] !== undefined) {
                const diff = r.kpi - yMap[r.ma_bcvh];
                if (diff > 2) improved.push(`${r.ten_bcvh} (+${diff.toFixed(2)}%)`);
                else if (diff < -2) declined.push(`${r.ten_bcvh} (${diff.toFixed(2)}%)`);
            }
        });

        const formatDate = (dateStr) => {
            const parts = dateStr.split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        };

        // Nhận định
        let nhanDinh = "Hoạt động ổn định.";
        if (curr.kpi < 90) nhanDinh = "Chất lượng toàn mạng lưới ở mức BÁO ĐỘNG. Rủi ro trễ phát cao.";
        else if (dodKpi < -2) nhanDinh = "Chất lượng sụt giảm mạnh so với hôm qua. Cần lưu ý các điểm nghẽn.";
        else if (dodKpi > 2) nhanDinh = "Hệ thống có sự phục hồi mạnh mẽ về tỷ lệ phát đạt.";

        // Chỉ đạo (Chỉ cho tin điều hành)
        let chiDao = "Đề nghị các đơn vị tiếp tục duy trì tiến độ.";
        if (curr.kpi < 90 || declined.length > 0) {
            chiDao = "YÊU CẦU GẤP:\n1. Các đơn vị Bottom (Đặc biệt: " + (curr.rows[curr.rows.length-1]?.ten_bcvh || "đơn vị chót bảng") + ") lập tức giải trình nguyên nhân.\n2. Tăng cường xe thư báo cho ca chiều.\n3. Rà soát ngay các bưu gửi đang lưu kho quá 14 giờ.";
        }

        // Tin Báo Cáo Template
        const baoCaoText = `BÁO CÁO CHẤT LƯỢNG F1.3 (Ngày ${formatDate(toDate)})

1. Toàn BĐTP:
- Sản lượng: ${curr.total.toLocaleString('vi-VN')} bưu gửi
- Đạt: ${curr.passed.toLocaleString('vi-VN')}
- Không đạt: ${curr.failed.toLocaleString('vi-VN')}
- KPI F1.3: ${curr.kpi.toFixed(2)}%

2. So sánh:
- So với hôm qua: ${dodKpi > 0 ? '+' : ''}${dodKpi.toFixed(2)}%
- So với cùng kỳ tuần trước: ${swcKpi > 0 ? '+' : ''}${swcKpi.toFixed(2)}%

3. Xếp hạng BCVH:
- Top 3 (Tốt nhất): ${topBcvh || 'Không có'}
- Bottom 3 (Cần cải thiện): ${bottomBcvh || 'Không có'}

4. Biến động đáng chú ý (so với hôm qua):
- Cải thiện mạnh (>2%): ${improved.length > 0 ? improved.join(', ') : 'Không có'}
- Giảm sút mạnh (<-2%): ${declined.length > 0 ? declined.join(', ') : 'Không có'}

5. Nhận định chung:
${nhanDinh}`;

        // Tin Điều Hành Template (Includes Directives)
        const dieuHanhText = `THÔNG BÁO ĐIỀU HÀNH F1.3 (Ngày ${formatDate(toDate)})

Tình hình chất lượng mạng lưới:
- Tỷ lệ Đạt: ${curr.kpi.toFixed(2)}% (Sản lượng: ${curr.total.toLocaleString('vi-VN')})
- Tồn đọng (Không đạt): ${curr.failed.toLocaleString('vi-VN')} bưu gửi
- Biến động: ${dodKpi > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(dodKpi).toFixed(2)}% so với hôm qua.

Ghi nhận các đơn vị:
- Hoàn thành xuất sắc: ${topBcvh}
- Sụt giảm nguy hiểm: ${declined.length > 0 ? declined.join(', ') : (bottomBcvh || 'Không có')}

Nhận định: ${nhanDinh}

CHỈ ĐẠO ĐIỀU HÀNH:
${chiDao}

Đề nghị các Bưu cục Văn hóa nghiêm túc triển khai thực hiện.`;

        return {
            bao_cao: baoCaoText,
            dieu_hanh: dieuHanhText
        };
    }
}

module.exports = new MessageGenerationService();
