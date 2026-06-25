---
title: Project Context
purpose: Tài liệu Onboarding định hướng kiến trúc và triết lý hệ thống QIS
owner: Product Owner
ssot: True
dependencies: None
version: 1.0.0
---

# PROJECT CONTEXT: TTVH QUALITY INTELLIGENCE SYSTEM (QIS)

Chào mừng bạn đến với dự án **TTVH Quality Intelligence System (QIS)**. 
Đây là tài liệu định hướng cốt lõi (Onboarding) dành cho tất cả thành viên dự án và AI Agents.

---

## 1. Mục Tiêu Dự Án QIS
QIS là một hệ thống điều hành chất lượng thông minh, quản trị dựa trên các chỉ số KPI, dữ liệu vận hành và nghiệp vụ Bưu chính. Hệ thống hỗ trợ TTVH:
- Giám sát chất lượng tự động hóa.
- Phân tích nguyên nhân gốc rễ (Root Cause Analysis - RCA).
- Điều hành xuyên suốt từ cấp Toàn mạng -> Bưu cục Văn hóa (BCVH) -> Tuyến phát -> Bưu gửi.
- Ứng dụng AI Context vào việc định vị chính xác nguyên nhân yếu kém.

---

## 2. Kiến Trúc Tài Liệu (Documentation Architecture)
Dự án áp dụng **Knowledge-first Organization**. Toàn bộ tài liệu tuân theo cấu trúc cây thư mục nghiêm ngặt (Architecture Freeze v1.0):
- `00_README`: Tài liệu định hướng, giới thiệu.
- `01_RULES`: Các hiến pháp, quy tắc quản trị, quy chuẩn công nghệ.
- `02_AI_CONTEXT`: System prompts và Context map dành cho AI.
- `03_SHARED_BUSINESS`: Business dictionary, Global Frameworks.
- `04_DOMAINS`: Phân chia theo từng Indicator độc lập.
- `05_TECHNICAL_IMPLEMENTATION`: Cấu trúc DB, API, Deployment.
- `06_ARCHIVE`: Lưu trữ tài liệu cũ hoặc các Indicator bị loại bỏ.

---

## 3. Triết Lý Kinh Doanh & Kỹ Thuật (Business-first Philosophy)
- **Business-first**: QIS là hệ thống điều hành nghiệp vụ. Kiến trúc Documentation phản ánh Business Domain trước, Technical chỉ là lớp hỗ trợ phía sau. KHÔNG sử dụng Layer-first.
- **Kỹ thuật phục vụ Nghiệp vụ**: Database Schema, API Contracts phải được triển khai để giải bài toán trong `04_DOMAINS` thay vì ngược lại. Không để Business Logic lọt vào Technical Documentation.

---

## 4. Kiến Trúc SSOT (Single Source Of Truth)
Mỗi Indicator (Ví dụ: F1.3, F1.1...) là một **Independent Knowledge Package** hoàn toàn độc lập và là SSOT duy nhất của Indicator đó.
- Không có bất kỳ sự nhân bản (duplicate) kiến thức nào.
- Một chỉ số chỉ có duy nhất một công thức tại file `measurement.md`.
- Bất kỳ Dashboard, RCA, hay Technical layer nào muốn sử dụng logic nghiệp vụ đều phải thực hiện **Reference** (tham chiếu) về Package của Indicator tương ứng, tuyệt đối không copy.

---

## 5. Thứ Tự Đọc Tài Liệu (Reading Order)
Tùy vào vai trò trong dự án, thứ tự tiếp cận tài liệu như sau:
- **Product Owner (PO)**: `00_README` -> `01_RULES` -> `03_SHARED_BUSINESS` -> `04_DOMAINS (core_knowledge, business_rules)`.
- **Business Analyst (BA)**: `03_SHARED_BUSINESS` -> `04_DOMAINS (toàn bộ file)` -> `05_TECHNICAL_IMPLEMENTATION`.
- **AI Agent**: Đọc `02_AI_CONTEXT/system_prompt.md` đầu tiên -> `00_README/PROJECT_CONTEXT.md` -> Truy xuất `04_DOMAINS` theo yêu cầu.
- **Developer**: `05_TECHNICAL_IMPLEMENTATION` -> Reference ngược về `04_DOMAINS (data_blueprint, measurement)`.
- **QA / Tester**: `04_DOMAINS (testing_scenarios, business_rules)`.

---

## 6. Trạng Thái Hiện Tại (Current Status)
- **Kiến trúc tài liệu**: ĐÃ ĐÓNG BĂNG (Architecture Freeze v1.0).
- **Indicator F1.3 (Chất lượng phát liên tỉnh)**: **ACTIVE & FREEZE**. Đây là bản mẫu (SSOT hiện hành) cho toàn bộ cấu trúc Indicator.
- **Các Indicator khác (F1.1, F1.2, F4.1...)**: **HOLD**. Chờ Product Owner cung cấp tài liệu nguồn để thực hiện Documentation Migration theo đúng chuẩn của F1.3.

---

## 7. Lộ Trình Phát Triển (Development Roadmap)
1. **Phase 1-5**: Đã hoàn tất Business Domain, Knowledge Model, Indicator Asset/Metadata Model và Final Documentation Structure.
2. **Phase 6 - Documentation Implementation**: Hiện đang diễn ra. Tập trung ánh xạ (Map) tài liệu từ Legacy sang chuẩn SSOT mới. Đã hoàn tất F1.3. Tiếp tục Migration cuốn chiếu các Indicator còn lại.
3. **Phase 7 - System Implementation**: Viết mã nguồn (Backend/Frontend) dựa trên SSOT Documentation đã đóng băng.
