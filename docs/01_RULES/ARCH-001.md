# ARCH-001: Presentation Layer Principle

> **STATUS: FROZEN**
> Tài liệu quy định nguyên tắc kiến trúc tối thượng dành cho Presentation Layer (Frontend) và sự phân định trách nhiệm với Backend trong toàn bộ dự án TTVH Quality Intelligence System (QIS).

## 1. Mục tiêu
Chuẩn hóa kiến trúc toàn dự án, tách bạch hoàn toàn lớp xử lý dữ liệu/nghiệp vụ khỏi lớp hiển thị. Đảm bảo Frontend luôn nhẹ, dễ bảo trì và không chứa bất kỳ quy tắc nghiệp vụ (Business Logic) nào. 

## 2. Chuẩn hóa kiến trúc (Architecture Pipeline)
Luồng dữ liệu và trách nhiệm của hệ thống bắt buộc phải tuân theo tuần tự (từ trái qua phải):

`Data Engine`
→ `Operation Engine`
→ `Rule Provider`
→ `Rule Engine`
→ `Recommendation Engine`
→ `Template Engine`
→ `REST API`
→ **`Frontend (Presentation Layer)`**

## 3. Nguyên tắc hoạt động của Frontend (Presentation Layer)
Lớp Frontend có duy nhất một nhiệm vụ: **Render UI (Hiển thị giao diện)**.
Tuyệt đối tuân thủ các quy tắc cấm sau tại Frontend:
- **KHÔNG** IF/ELSE nghiệp vụ.
- **KHÔNG** Business Rule.
- **KHÔNG** KPI Formula (Không tính toán lại công thức KPI).
- **KHÔNG** Threshold (Không hardcode các ngưỡng nghiệp vụ, ví dụ 90% hay 95%).
- **KHÔNG** Recommendation (Không tự suy luận hay ghép câu khuyến nghị).
- **KHÔNG** Template Generation (Không sử dụng Regex Replace để sinh tin nhắn).

## 4. Trách nhiệm của Backend
Toàn bộ logic "chất xám" của hệ thống sẽ do Backend gánh vác hoàn toàn:
- **Business Logic:** Tính toán mọi công thức, phép trừ, % biến thiên (DoD, SWC), thứ hạng.
- **Rule Engine:** Lưu trữ và đánh giá tập quy tắc nghiệp vụ.
- **Recommendation Engine:** Sinh ra các nội dung văn bản (Actionable Insights) dựa trên Rule.
- **Template Engine:** Nội suy dữ liệu vào các Template tĩnh để xuất tin nhắn.
- **Decision Logic:** Quyết định màu sắc hiển thị (Xanh, Đỏ, Cam), Priority (P1, P2), Level (HOT, WATCH).
- **KPI Formula:** Đảm bảo là Single Source Of Truth (SSOT) cho mọi con số KPI.

## 5. Ràng buộc thi hành (Enforcement)
Mọi tài liệu Specification (UI/UX, Module, Dashboard) và tiến trình Code Review đều phải lấy **ARCH-001** làm hệ quy chiếu bắt buộc. Bất kỳ đoạn mã Frontend nào vi phạm nguyên tắc "Presentation Layer" đều sẽ bị reject.
