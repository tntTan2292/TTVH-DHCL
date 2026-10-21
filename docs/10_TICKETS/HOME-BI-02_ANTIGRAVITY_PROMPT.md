# HOME-BI-02 — Prompt giao diện cho Antigravity

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `HOME-BI-02` (backend và chức năng đã xong, đã qua Opus review).

Đọc: `docs/10_TICKETS/HOME-BI-02_MANIFEST.md` **Mục 10** (yêu cầu nhìn của PO, tệp trong phạm vi, số đo thật, danh sách lỗi bố cục đã gặp) và `report_block_ui_standard.md`.

**Mục tiêu:** làm lại phần trình bày Trang chủ điều hành. PO thấy bản hiện tại (`d60c4dc`) quá hẹp, chi chít chữ, không đẹp; bản `0e0478c` đẹp hơn. Lấy `0e0478c` làm gốc nhìn (`git show 0e0478c:<tệp>`), giữ phong cách thoáng, số lớn, bo góc lớn; chỉ gọn bằng cách bố cục thông minh (cho phép cuộn dọc ở phần dưới, nhưng màn hình đầu ở laptop 1366 x 768 phải thấy trọn thanh đầu + 4 thẻ + đầu bảng xếp hạng). Cách bố trí do bạn quyết, miễn đạt Mục 10 và không nhồi chữ.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập; đổi backend, dữ liệu, `homePeriod.js`, tên prop, hay bất kỳ chức năng nào ở Mục 10. Dừng ở `READY FOR PO CHECK`; commit theo pathspec (phiên khác dùng chung worktree).

Hoàn tất: build + lint + test home xanh, ghi tóm tắt vào manifest Mục 10, báo cáo ngắn kèm danh sách PO tự kiểm.
