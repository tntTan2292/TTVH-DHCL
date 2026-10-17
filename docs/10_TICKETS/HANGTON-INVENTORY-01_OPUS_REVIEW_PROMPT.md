# HANGTON-INVENTORY-01 — Prompt review độc lập cho Claude Code (Opus)

Dự án QIS V2, workspace `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập: **không sửa code**, chỉ báo lỗi. Người làm: Claude Code/Sonnet. Phạm vi review: commit `1c22c62` (4 yêu cầu PO 2026-10-17).

Đọc: `docs/10_TICKETS/HANGTON-INVENTORY-01_MANIFEST.md` (Mục 2 quyết định D1–D13, **Mục 9**), rồi `git show 1c22c62`.

**Soi kỹ:**
1. **Tự khởi động/tự chạy lại** (`scripts/qis-supervisor.ps1`, `install-qis-autostart.ps1`, `qis-supervisor-launch.bat`, `TTVH_ControlCenter.ps1`): logic cổng/thời gian chờ (`GraceSeconds`), chống vòng lặp lỗi (5 lần/10 phút) có thật sự hoạt động không (list/`RemoveAll`, biến phạm vi trong `Ensure-Service`); tệp tạm dừng `logs/supervisor.pause` có đua với Stop/Start không, có bị bỏ quên làm hệ thống không bao giờ tự lên lại không; mutex `Global\` một thể hiện; tìm `node`/`npm` (đường dẫn cứng theo máy này, PATH lúc đăng nhập); log không phình vô hạn; có khả năng bật **hai** backend (race giữa Control Center và giám sát) hay không, nhất là khi backend mất >60 s mới nghe cổng; quote đường dẫn có dấu cách; cài đặt lặp lại an toàn, `-Remove` gỡ sạch. Không đụng tệp `START_V2_AUTO.vbs` của dự án khác.
2. **Chữ to hơn:** đổi cỡ chữ hàng loạt có làm vỡ bố cục (cột bảng bưu cục có 9 mức + tổng + so sánh, sticky cột đầu, thẻ KPI, thanh tab, hộp chọn mốc) hay chữ bị cắt/`truncate` mất nội dung không; còn chữ <12 px sót ở đâu; thành phần dùng chung (`SortableTh`, `BlockCaptureButton`) không bị sửa.
3. **Ẩn cột** (`HangTonByOfficeTab.jsx`, `hangtonLevels.js`): cột tiêu đề nhóm `colSpan` khi ẩn hết/ẩn một phần; thân bảng, hàng TỔNG CỘNG và tiêu đề luôn cùng tập cột; sắp xếp theo cột đang ẩn; giá trị `localStorage` hỏng/không có quyền ghi; bảng chọn cột không lọt vào ảnh chụp (`data-no-capture`); "Tổng tồn" vẫn đủ mọi mức; `<th>` lồng `<th>` đã gỡ.
4. **Module như các F:** đường dẫn `/hangton` → `/hangton/overview`, `/hangton/:tab` với tab lạ; vai trò admin/viewer; menu và thanh tab đồng bộ qua URL; chuyển tab không tải lại dữ liệu thừa và không mất bộ lọc/mốc đang chọn; bấm tên bưu cục sang Chi tiết vẫn lọc đúng; `Sidebar.jsx` và `appNavigation.jsx` không lệch nhau; thứ tự F1.1→F1.2→F1.3→F4.1→Hàng tồn.
5. **Test:** có che lỗi thật không (assert đọc mã nguồn bằng regex quá lỏng, thiếu test hành vi cho ẩn cột/điều hướng).

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập; **không chạy** `install-qis-autostart.ps1`, không chạy giám sát thật, không dừng/khởi động tiến trình node đang chạy. Chỉ được thử giám sát bằng `powershell -File scripts/qis-supervisor.ps1 -Once -DryRun -BackendPort 59990 -FrontendPort 59991`. Test frontend: `node --test "src/**/*.test.js"` trong `frontend`; build `npm run build`; lint `npx oxlint src/features/hangton`.

**Báo cáo:** mỗi phát hiện ghi mức (blocker / nên sửa / ghi chú), `file:dòng`, kịch bản sai cụ thể. Kết luận PASS hoặc FAIL. Không tự tuyên bố PO UI PASS.
