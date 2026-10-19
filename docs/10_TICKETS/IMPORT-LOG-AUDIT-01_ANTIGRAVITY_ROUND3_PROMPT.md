# IMPORT-LOG-AUDIT-01 vòng 3 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `IMPORT-LOG-AUDIT-01` — đọc thẳng manifest, **Mục 12** (và Mục 4, 9–11 để biết các nút đã có).

**Mục tiêu:** khi bộ lọc chỉ tiêu là "Tất cả", mỗi ngày hiện **một dòng** thay vì 4 dòng (mỗi chỉ tiêu một dòng). Dòng ngày có 4 ô chỉ tiêu cạnh nhau (F1.1, F1.2, F1.3, F4.1), mỗi ô gọn gàng thể hiện trạng thái HUE/TCT và có tick hoặc "Nhập lại" riêng; một điều khiển cho cả ngày gọi `onSelectDayAllIndicators(date)` (đã nối sẵn) và cho biết ngày đang chọn đủ, một phần hay chưa chọn. Có thể thêm điều khiển ở đầu cột cho từng chỉ tiêu. PO muốn chọn nhiều ngày × 4 chỉ tiêu chỉ vài cú click, không phải kéo dài. Bạn toàn quyền sáng tạo về bố cục, mật độ, màu; dùng tốt từ 1280px trở xuống. Lọc một chỉ tiêu giữ bố cục hiện tại.

**Bắt buộc:** chỉ đổi hiển thị. Không đổi API, payload, `getItemKey`, dạng trạng thái chọn, modal, handler; dùng các prop sẵn có (`onToggleSelectItem`, `onSelectDayAllIndicators`, `onReimportClick`, `onAnchorRunClick`, `selectedBulkKeys`, `selectedReimportKeys`). Logic mới trong helper thuần có test; test cũ chạy nguyên không sửa; giữ bảng phẳng làm đường lui.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket.

Hoàn tất: build + lint + test, cập nhật manifest Mục 12, báo cáo ngắn cho Claude/CTO.
