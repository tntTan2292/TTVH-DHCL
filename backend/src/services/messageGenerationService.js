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

        // Tin Báo Cáo Template (SSOT)
        const baoCaoText = `BÁO CÁO KẾT QUẢ ĐIỀU HÀNH CHẤT LƯỢNG F1.3 NGÀY ${formatDate(toDate)}

Kính gửi: Lãnh đạo BĐTP và các phòng ban liên quan,

BĐTP xin báo cáo kết quả thực hiện chỉ tiêu F1.3 toàn mạng lưới như sau:

1. F1.3 toàn BĐTP:
- Tổng sản lượng phát sinh: ${curr.total.toLocaleString('vi-VN')} bưu gửi
- Số lượng đạt: ${curr.passed.toLocaleString('vi-VN')} bưu gửi
- Số lượng không đạt: ${curr.failed.toLocaleString('vi-VN')} bưu gửi
- Tỷ lệ KPI đạt: ${curr.kpi.toFixed(2)}% (Biến động: ${dodKpi > 0 ? '+' : ''}${dodKpi.toFixed(2)}% so với hôm qua; ${swcKpi > 0 ? '+' : ''}${swcKpi.toFixed(2)}% so với cùng kỳ)

2. Xếp hạng BCVH:
- Top BCVH xuất sắc: ${topBcvh || 'Không có'}
- Bottom BCVH thấp nhất: ${bottomBcvh || 'Không có'}
- BCVH cải thiện tốt: ${improved.length > 0 ? improved.join(', ') : 'Không có'}
- BCVH giảm sút: ${declined.length > 0 ? declined.join(', ') : 'Không có'}

3. Nhận định:
- ${nhanDinh}

Trân trọng báo cáo.`;

        // Tin Điều Hành Template (SSOT)
        const dieuHanhText = `THÔNG BÁO ĐIỀU HÀNH CHẤT LƯỢNG F1.3 NGÀY ${formatDate(toDate)}

Kính gửi: Giám đốc các Bưu cục Văn hóa,

Căn cứ vào kết quả đo kiểm chất lượng F1.3, BĐTP thông báo tình hình thực hiện trong ngày như sau:

1. F1.3 toàn BĐTP:
- Tỷ lệ KPI đạt: ${curr.kpi.toFixed(2)}% (Sản lượng: ${curr.total.toLocaleString('vi-VN')} bưu gửi)
- Tồn đọng (Không đạt): ${curr.failed.toLocaleString('vi-VN')} bưu gửi
- Xu hướng: ${dodKpi > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(dodKpi).toFixed(2)}% so với ngày hôm qua.

2. Đánh giá đơn vị:
- Top BCVH: ${topBcvh || 'Không có'}
- Bottom BCVH: ${bottomBcvh || 'Không có'}
- Cải thiện: ${improved.length > 0 ? improved.join(', ') : 'Không có'}
- Giảm sút: ${declined.length > 0 ? declined.join(', ') : 'Không có'}

3. Nhận định:
- ${nhanDinh}

4. Đề nghị (Chỉ đạo):
- ${chiDao}

Đề nghị các đơn vị khẩn trương triển khai thực hiện.`;

        return {
            bao_cao: baoCaoText,
            dieu_hanh: dieuHanhText
        };
    }
}

module.exports = new MessageGenerationService();
