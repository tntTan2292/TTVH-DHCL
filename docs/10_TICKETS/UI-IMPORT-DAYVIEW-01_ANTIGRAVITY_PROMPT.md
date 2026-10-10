# UI-IMPORT-DAYVIEW-01 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `UI-IMPORT-DAYVIEW-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/UI-IMPORT-DAYVIEW-01_MANIFEST.md` (đủ phạm vi, thiết kế, ràng buộc).

**Mục tiêu:** trong Trung tâm Import Dữ liệu → "Bù dữ liệu tự động" → chế độ "Nhóm theo Tháng", mỗi ngày chỉ còn **một dòng** với hai ô nguồn HUE và TCT cạnh nhau (trạng thái + nút riêng từng nguồn), ô tick theo ngày tự chọn các nguồn còn thiếu, đầu tháng đếm theo ngày, tháng mới nhất còn thiếu tự mở. Chế độ "Bảng Chi tiết" giữ nguyên.

**Bắt buộc:** chỉ đổi cách hiển thị. Không đổi API, payload, `getItemKey`, trạng thái chọn, modal, handler, backend. Logic mới đặt trong helper thuần (`autoBackfillUiHelpers.js`) kèm test; test cũ chạy nguyên không sửa.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket (có file của phiên khác đang sửa dở).

Hoàn tất: build + lint + test, cập nhật manifest/handoff theo chuẩn, báo cáo ngắn cho Claude/CTO.
