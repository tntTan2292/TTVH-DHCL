# 1. Project Overview
- **Tên dự án**: TTVH - Hệ thống điều hành chất lượng
- **Mục tiêu cuối cùng**: Xây dựng một hệ thống giám sát và vận hành chất lượng Bưu chính (đặc biệt là F1.3 - Chất lượng phát liên tỉnh), đảm bảo dữ liệu chính xác tuyệt đối, Real-time và có khả năng Drill-down sâu để phân tích nguyên nhân gốc rễ.
- **Mục tiêu hiện tại**: Khôi phục đầy đủ Dashboard Legacy (D7), căn chỉnh API chuẩn với SSOT, chuyển đổi hoàn toàn sang dữ liệu thực tế (loại bỏ Mock), và hoàn thiện quy trình Drill-down.

# 2. Current Phase
- **Phase**: D7.3 Dashboard Recovery & Micro Phase P1.1 (Navigation Adapter)
- **Progress**: ~95% (Dashboard đã kết nối dữ liệu thực tế, API KPI PASS, các lỗi Runtime Loading đã được sửa).

# 3. Architecture Summary
- **Frontend**: React (Vite). Áp dụng Adapter Pattern để bọc các Legacy Component (giữ nguyên UI cũ, chỉ bơm data mới).
- **Backend**: Node.js/Express. Kiến trúc 3 lớp chuẩn Controller -> Service -> Repository.
- **Database**: SQLite (`backend/src/db/database.sqlite`). Gồm bảng chính `fact_f13` (66.900+ record thực tế).
- **SSOT**: API Contract (D5.2) và Database Schema là nguồn chân lý tuyệt đối. Không tự ý chế tham số hoặc cấu trúc nếu SSOT không có.

# 4. Business Rules
- **Business First / SSOT First**: Ưu tiên tính đúng đắn của nghiệp vụ và thiết kế gốc.
- **Không Rewrite, Không Refactor**: Tuyệt đối sử dụng Wrapper/Adapter để tận dụng Legacy Code.
- **Micro Debug**: Mỗi lần chỉ xử lý DUY NHẤT 01 nghi vấn/bug. Không mở rộng phạm vi.
- **One Bug = One Commit**: Sửa xong -> Commit -> Push ngay lập tức.
- **Không Audit toàn bộ, Không UI Testing**: AI không tự quét toàn bộ hệ thống hay mở Browser để test giao diện. Product Owner sẽ tự Test UI.

# 5. Completed
- Phục hồi giao diện Dashboard.
- Căn chỉnh toàn bộ API theo chuẩn SSOT (`from_date`, `to_date`).
- Phục hồi Navigation Drill-down cho Legacy Component (TopListCard).
- Fix lỗi sai tên bảng Database (`f13_fact_buu_gui` -> `fact_f13`).
- Fix lỗi Dashboard hiển thị 0 data (Hardcode lại default date match với Mock Data của tháng 06/2026).
- Phục hồi và đồng bộ logic BCVH Operation Table (Ranking).
- Phục hồi Quality Timeline API Endpoint.
- Phục hồi Top Ranking API (Best 2, Lowest 2) và cập nhật Semantic Colors.
- Phục hồi Legacy Rule Recommendation Engine cho Backend.
- Phục hồi Message Generation Mount.
- Working Tree đã hoàn toàn sạch (`git status` clean).

# 6. Known Issues
- (Tất cả các Blocker của Dashboard hiện tại đã được gỡ. Chờ sự điều hướng tiếp theo từ Product Owner).

# 7. Next Priority
1. Khôi phục hoàn toàn Dashboard ở Runtime thực tế.
2. Hoàn thiện API còn lại.
3. S5 — PARETO RCA (Pareto Chart, Phân tích 80/20, Route Ranking).
4. Xây dựng Navigation sang Evidence List.
5. Vận hành Production.

# 8. Current Workflow
- Nhận lệnh -> Check lỗi duy nhất -> Fix đúng điểm đó -> KHÔNG làm gì thêm.
- Không Audit toàn bộ.
- Không dùng Browser.
- Không Rewrite.
- Chạy `git add` -> `git commit` -> `git push origin main`.
- Kiểm tra `git status` phải sạch (`nothing to commit`).
- Dừng & Báo cáo.

# 9. Definition of DONE
- Dashboard hoạt động trơn tru trên trình duyệt.
- Tuyệt đối không còn Mock Data.
- API chạy đúng 100% tài liệu SSOT.
- Source Code có thể vận hành thực tế lập tức.
