# UI-GLASS-THEME-01 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `UI-GLASS-THEME-01` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/UI-GLASS-THEME-01_MANIFEST.md` (phạm vi, ràng buộc, Required Reading).

**Mục tiêu (Giai đoạn A):** làm lại giao diện hệ thống theo **theme sáng dạng kính trong suốt (Glass)**: bộ token/theme, menu bên trái, thanh trên, nút bấm và các control dùng chung hiện đại, có hiệu ứng rê chuột, nhấn, focus, disabled, loading; trang đăng nhập làm mẫu. PO cho bạn **toàn quyền sáng tạo** về phong cách, màu, bo góc, đổ bóng, chuyển động; cần thật "xịn xò", chuyên nghiệp, nhất quán. Chỉ làm theme sáng.

**Bắt buộc:** không đụng chức năng (Mục 4 manifest): logic, route, phân quyền, `appNavigation.jsx`, API, backend; test cũ chạy nguyên không sửa. **Khối báo cáo giữ nền đặc**, không `backdrop-filter` (nút camera dùng `html-to-image`); giữ chuẩn Report Block UI và màu F1.1 xanh lá / F1.3 xanh dương / F4.1 cam. Không sửa `src/features/networkMap/*` (giai đoạn B). Có fallback khi không hỗ trợ blur / giảm chuyển động.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`; không đụng file ngoài ticket (có file của phiên khác đang sửa dở).

Hoàn tất: build + lint + test, cập nhật manifest Mục 7, báo cáo ngắn cho Claude/CTO kèm checklist PO ngắn.
