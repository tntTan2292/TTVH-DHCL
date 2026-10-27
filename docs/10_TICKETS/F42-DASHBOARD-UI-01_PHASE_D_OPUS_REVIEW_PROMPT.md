# F42-DASHBOARD-UI-01 – Prompt review giai đoạn D (Opus)

Dán nguyên văn cho phiên Claude Code chạy Opus. Chỉ đọc và chạy lệnh kiểm tra, không sửa mã, không commit.

---

Review độc lập (chỉ đọc, không sửa, không commit, không mở trình duyệt, không đăng nhập) giai đoạn D của F42-DASHBOARD-UI-01. Các commit: 526e60f1 (backend thẻ F4.2 của trang chủ, Claude Code), 9b3ea1e3 (Antigravity: khối xu hướng một bưu tá và thẻ F4.2), e47d1131, f5aa18ce, a74f3d53 (sửa trang chủ theo PO: 5 thẻ không đè chữ, bỏ nút chụp ảnh ở thẻ và khối, nhãn ngắn). Xem bằng `git show <hash>`.

Đọc trước: `docs/10_TICKETS/F42-DASHBOARD-UI-01_PHASE_D_ANTIGRAVITY_PROMPT.md`, `F42-POSTMAN-API-01_MANIFEST.md`, `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`.

Câu hỏi bắt buộc:
1. Backend: `HomeExecutiveService` thêm f42 đúng chưa (mục tiêu 90, danh sách 6 BCVH, hạng 34 tỉnh, `getNationalRanking` nhận f42)? Có chỗ nào còn giả định 4 chỉ tiêu (route, controller, cache, test, frontend)?
2. Phân quyền: `/api/home/executive` không lọc theo module. Người dùng theo BCVH hoặc không có quyền f42 có thấy số liệu F4.2 cấp thành phố qua trang chủ không? Frontend có ẩn thẻ theo quyền không? Đánh giá mức độ và đề xuất cách sửa, không sửa.
3. Khối xu hướng bưu tá (`F42PostmanTrendModal.jsx`): gọi đúng `/f42/dashboard/postman-trend`, ngày không phát sinh để trống, đường 90 %, kỳ kết thúc ở ngày đang chọn; người dùng theo BCVH chỉ mở được bưu tá của mình (403 và rỗng hiện thông báo, không lỗi đỏ); màu đường kẻ lấy từ theme hay mã cứng (`#0284C7`); cửa sổ có vừa màn hình 1366×768 ở zoom 90 %, đóng bằng Esc và bấm nền.
4. Trang chủ 5 thẻ: ước lượng chiều rộng mỗi thẻ ở 1366 px và zoom 90 %, còn nhãn nào có thể xuống hàng? Chiều cao hàng thẻ sau khi chuyển ba dòng "Chênh mục tiêu", "Tỷ lệ so…", "Hạng so…" xuống dưới ô số. Khi API chỉ trả 4 thẻ thì giao diện có đúng như cũ không?
5. Trang chủ không còn nút chụp ngoài nút chụp cả trang: có chỗ nào còn tham chiếu `targetRef` mà không dùng, hay phần chụp cả trang bị mất nội dung vì các ref? Test khóa nhãn cũ đã được đổi đúng ý (PO 2026-10-27 chọn nhãn ngắn, bỏ camera)?
6. Phạm vi và hồi quy: commit có file ngoài F4.2 và Home không? F1.x và F4.1 có đổi hành vi không?

Chạy trong `frontend/`: `node --test "src/**/*.test.js"`, `npx oxlint src/features/home src/features/f42`, `npx vite build`. Trong `backend/`: `node --experimental-sqlite --test src/services/HomeExecutiveService.test.js`.

Báo cáo ngắn: PASS / PASS CÓ ĐIỀU KIỆN / FAIL, phát hiện theo mức nghiêm trọng (file:dòng), lệnh đã chạy và kết quả thật. Không tự cấp PO PASS.
