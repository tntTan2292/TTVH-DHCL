# F12-PHASE-3 — Prompt cho Antigravity (Gemini)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Ticket song song `F12-PHASE-3` — không trùng Current Ticket trong `PROJECT_SNAPSHOT.md` là bình thường, đọc thẳng manifest.

Đọc: `docs/10_TICKETS/F12-PHASE-3_MANIFEST.md` (Mục 3–7: bằng chứng cổng và bảng 6 file cần viết), rồi `docs/10_TICKETS/F11-PHASE-3_MANIFEST.md` Mục 13 (khuôn F1.1).

**Mục tiêu:** viết phần tự tải F1.2 từ DKCL (HUE chi tiết, TCT toàn quốc) bằng cách chép khuôn F1.1 Phase 3 từng file, chỉ đổi những điểm khác ghi ở manifest F1.2 Mục 7. Bộ đọc file và Import F1.2 đã có sẵn (`f12HueExcelParser`, `f12TctExcelParser`, registry `F1.2`) — dùng lại, không viết lại.

**Bắt buộc:** request phải trùng từng ký tự với request ghi ở manifest Mục 3–4 (kể cả `stMaTinhNhan=N'53'`, `iDetailReport=6`). Đối soát HUE: số dòng / Đạt / Không đạt của file = dòng tổng trên cổng, khớp tuyệt đối. Test `backend/test_f12PortalAdapter.js` dùng 2 file thật `Data DKCL/F1.2-2026.10.10.xlsx`, `Data DKCL/F1.2-TCT-2026.10.10.xlsx` làm đáp án. Registry giữ `PLANNED` / `MANUAL_ONLY`, executor **chưa đăng ký**.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập, gọi cổng DKCL, sửa database thật. Không sửa bất kỳ file F1.1 nào (phiên khác đang sửa dở). Commit theo pathspec, không `git add -A`.

Hoàn tất: `node --test --experimental-sqlite test_f12PortalAdapter.js` xanh; test F1.2 hiện có, test executor F1.1/F1.3/F4.1 không đổi; sweep backend không thêm lỗi mới. Cập nhật manifest Mục 8 (Implementation), báo cáo ngắn cho Claude/CTO, dừng ở `READY FOR REVIEW`.
