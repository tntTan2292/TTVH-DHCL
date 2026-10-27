# UI-IMPORT-PROCESS-LOG-01 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `UI-IMPORT-PROCESS-LOG-01` — đọc thẳng manifest `docs/10_TICKETS/UI-IMPORT-PROCESS-LOG-01_MANIFEST.md` (**Mục 2 kiểm kê, Mục 3 API đã xong, Mục 4 việc của bạn**).

**Mục tiêu** (Trung tâm Import Dữ liệu → "Bù dữ liệu tự động"), thiết kế lại với toàn quyền sáng tạo bố cục:
1. Khung **"Tất cả tiến trình đang mở"**: hiện cả tổng thật (đang có 548 tiến trình mở, không phải 50), tóm tắt theo nguồn và trạng thái, cái gì đang chặn, giữ các nút "Mở đăng nhập" và "Tiếp tục Run"; xem từng run bằng phân trang và lọc, gộp hợp lý các run một job.
2. Màn hình **"Nhật ký import" đầy đủ** trên `GET /import/auto-backfill/jobs`: lọc ngày dữ liệu, chỉ tiêu, nguồn, trạng thái (chip kèm số đếm), người chạy, chế độ; cột giờ Việt Nam, ngày dữ liệu, chỉ tiêu, nguồn, trạng thái (cả thành công và thất bại), người chạy, chế độ, số lần thử, số dòng, thời lượng, lỗi kèm hướng xử lý; bấm một dòng xem chi tiết. Lỗi dễ thấy và dễ đọc (mã lỗi đã biết đổi sang tiếng Việt, mã lạ hiện nguyên mã).
3. Giữ "Lịch sử Import" (nhật ký file) và làm rõ khác biệt với nhật ký job.

**Bắt buộc:** chỉ đổi hiển thị; không đổi API, payload, `getItemKey`, trạng thái chọn, modal, handler hiện có. Logic mới trong helper thuần có test; test cũ chạy nguyên không sửa; chỉ admin thấy. Dùng tốt từ 1280px trở xuống. Mọi chuỗi chữ mới phải đúng tên chính thức, không bịa nhãn.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec, không `git add -A`.

Hoàn tất: build + lint + test, cập nhật manifest Mục 4, báo cáo ngắn cho Claude/CTO.
