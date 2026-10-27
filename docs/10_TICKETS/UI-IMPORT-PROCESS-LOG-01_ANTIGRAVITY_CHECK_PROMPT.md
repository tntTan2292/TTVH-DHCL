# UI-IMPORT-PROCESS-LOG-01 + UI-IMPORT-BULK-ITEMS-01 — Prompt kiểm tra tiến độ và làm nốt (Antigravity)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Đọc `docs/10_TICKETS/UI-IMPORT-PROCESS-LOG-01_MANIFEST.md` (Mục 4, 5, 6) và `UI-IMPORT-BULK-ITEMS-01_ANTIGRAVITY_PROMPT.md`.

**Bước 1 — tự kiểm tra, trả lời từng mục "ĐÃ LÀM (commit …)" hoặc "CHƯA LÀM":**
1. Khung "Tất cả tiến trình đang mở": hiện tổng thật từ `data.total` (không phải "(50)"), tóm tắt theo nguồn và trạng thái, cái đang chặn, giữ nút "Mở đăng nhập" và "Tiếp tục Run", xem từng run có phân trang và lọc, gộp run một job.
2. Màn hình "Nhật ký import" trên `GET /import/auto-backfill/jobs`: lọc (ngày dữ liệu, chỉ tiêu, nguồn, chip trạng thái kèm `stateCounts`, người chạy, chế độ, ngày tạo), phân trang, giờ Việt Nam, đủ cột, cả thành công và thất bại, lỗi hiện `last_error_message` kèm `action_required` (mã lỗi đã biết đổi tiếng Việt, mã lạ hiện nguyên mã), bấm một dòng xem chi tiết run.
3. "Lịch sử Import" (nhật ký file) vẫn truy cập được và rõ khác nhật ký job.
4. Hai nút hàng loạt gửi một yêu cầu `items` (commit `36d62dc6`) — đã có; còn thiếu: cập nhật manifest Mục 6.
5. Manifest Mục 4 và trạng thái ticket đã cập nhật chưa.

(Mình thấy trong git: mục 1, 2, 3 chưa có commit nào; mục 4 có code nhưng chưa cập nhật manifest.)

**Bước 2 — làm nốt các mục CHƯA LÀM** theo đúng manifest. Bắt buộc: chỉ đổi hiển thị; không đổi API, `getItemKey`, trạng thái chọn, modal, handler hiện có; logic mới trong helper thuần có test; test cũ chạy nguyên; chỉ admin; dùng tốt từ 1280px; chuỗi chữ mới đúng tên chính thức, không bịa nhãn.

**Cấm:** browser, Playwright, chụp màn hình, dev server, đăng nhập. Không tự tuyên bố PO UI PASS; dừng ở `READY FOR PO UI CHECK`. Commit theo pathspec.

Hoàn tất: build + lint + test, cập nhật cả hai manifest, báo cáo ngắn cho Claude/CTO.
