# F13_303 – Tỷ lệ chậm nộp tiền

## 1. Business Meaning
Đo lường tỷ lệ bưu gửi Không đạt F1.3 đồng thời có hiện tượng chậm nộp tiền (>3 giờ). Chỉ số dùng để nhận diện mức độ xuất hiện của hiện tượng chậm nộp tiền trong nhóm bưu gửi Không đạt. Đây là chỉ số thống kê phục vụ Root Cause Analysis, không khẳng định chậm nộp tiền là nguyên nhân duy nhất gây Không đạt F1.3. Đây là KPI duy nhất đại diện cho nhóm "Chậm nộp tiền" trên toàn hệ thống.

## 2. Business Purpose
Phục vụ mục tiêu phân tích nguyên nhân gốc rễ (Root Cause Analysis). Giúp Giám đốc và Điều hành viên xác định chính xác tỷ trọng ảnh hưởng của lỗi nộp tiền muộn đối với tổng số bưu gửi rớt KPI F1.3.

## 3. Formula
- **Tử số:** Số BG chậm nộp tiền (Có kết quả Không đạt).
- **Mẫu số:** Tổng số BG Không đạt.

## 4. Scope
Áp dụng phân tích phân cấp tại:
- Toàn mạng (BĐTP)
- Bưu cục vận hành (BCVH)
- Tuyến phát

## 5. Business Rule
Điều kiện xác định BG chậm nộp tiền:
> Thời gian nộp tiền − Thời gian PTC > 3 giờ

*(Ghi chú: Tỷ lệ F13_303 chỉ được tính toán trên tập Bưu gửi Không đạt KPI F1.3. Loại trừ toàn bộ các bưu gửi Đạt KPI khỏi phép tính).*

## 6. Dashboard Usage
Chỉ số này xuất hiện ở:
- Màn hình 04 (Root Cause Analysis) - Tab Chậm nộp tiền.
- Bảng xếp hạng, biểu đồ nguyên nhân trên Executive Dashboard.

## 7. RCA Usage
Vai trò trong Root Cause Analysis (RCA): Trả lời câu hỏi trọng tâm "Bao nhiêu phần trăm (%) số bưu gửi rớt F1.3 có nguyên nhân liên quan đến việc bưu tá nộp tiền muộn?". Hỗ trợ khoanh vùng chính xác điểm nghẽn nghiệp vụ.

## 8. Recommendation Usage
Hệ thống Recommendation sử dụng F13_303 làm đầu vào để kích hoạt các nhận định Auto-Insight. Khi "Tỷ lệ chậm nộp tiền tăng cao", hệ thống sẽ tự động sinh đề xuất hành động can thiệp cấp tuyến.

## 9. Message Generation Usage
- **Tin điều hành:** Nhắc nhở bưu tá thực hiện nộp tiền đúng quy định (≤ 3 giờ sau khi PTC).
- **Tin báo cáo:** Báo cáo định kỳ tổng kết tỷ lệ chậm nộp tiền gửi đến Lãnh đạo cấp BCVH và BĐTP.

## 10. Related Metrics
Liên kết trực tiếp với:
- **F13_302** (BG chậm nộp tiền): Chỉ số đếm số lượng (Count) dùng làm cơ sở cấu thành tử số.

*(Lưu ý: Không còn tồn tại F13_402 trên hệ thống).*
