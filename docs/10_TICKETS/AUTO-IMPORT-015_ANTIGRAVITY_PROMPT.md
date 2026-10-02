# AUTO-IMPORT-015 -- Prompt for Antigravity

Paste the block below into an Antigravity session opened on `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`.

````text
Bạn là Antigravity, executor cho ticket AUTO-IMPORT-015 (QIS V2, repo tntTan2292/TTVH-DHCL, nhánh hiện tại codex/da-impl-006).

ĐỌC TRƯỚC (chỉ 2 file, không đọc cả chuỗi README_AI):
1. docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md
2. docs/10_TICKETS/AUTO-IMPORT-015_MANIFEST.md  (Evidence, Root Causes, Scope, Out Of Scope, Validation đều nằm ở đây — làm đúng theo đó)

BỐI CẢNH NGẮN
Phiên đăng nhập DKCL (SSO) hết hạn qua đêm trong khi backend (PID 8132) và 2 Chromium HUE/TCT chạy liên tục nhiều ngày. Hậu quả:
- Hôm 2026-10-01: nút "Mở đăng nhập" báo ORPHAN_PROCESS_RECOVERY_FAILED (taskkill lỗi trong browserProcessManager.js:547, gọi từ dkclSessionPreflightService.js:289/683), lifecycle kẹt OPENING_BROWSER (set tại dòng 652) nên preflight báo "Đang mở đăng nhập DKCL Huế." mãi.
- Sáng 2026-10-02: job HUE nhận lease GLOBAL_DKCL, openF13Report() rơi vào /sso/login, stopForSecurityChallenge() → waitForManualAuthentication() (dkclHueF13PortalClient.js:1660) chờ 240s trong cửa sổ bị ẩn; UI chỉ hiện RUNNING, trình duyệt không hiện lên; 3 job khác QUEUED phía sau.

NHIỆM VỤ (theo Manifest Section 7, theo thứ tự)
Phase A — Bằng chứng runtime Windows (việc của Antigravity, KHÔNG sửa code ở phase này):
 a. Xác nhận bằng PID/HWND/process tree: cửa sổ Chromium HUE/TCT hiện đang ẩn hay hiện, và có nằm đúng profile Data DKCL/BrowserProfiles/{HUE,TCT} (khớp --user-data-dir tuyệt đối) không.
 b. Tái hiện taskkill thất bại (PID đã thoát / race cây tiến trình) và ghi lại mã thoát + stderr thật của taskkill.exe. Hiện lỗi bị nuốt ở catch của terminateProcessTree.
 c. Ghi kết quả vào docs/06_REVIEWS/Import/AUTO-IMPORT-015_CHECKPOINT_001.md (đăng ký ở DOCUMENT_INDEX).
Phase B — Triển khai (backend + frontend):
 1. Pre-flight phiên trước khi job chạy: hết hạn → job WAITING_AUTH ngay, không giữ GLOBAL_DKCL, không chờ trong cửa sổ ẩn.
 2. "Mở đăng nhập HUE/TCT" phải đưa cửa sổ lên (kiểm HWND visible + foreground); UI ghi rõ việc người dùng cần làm.
 3. Sửa reclaimOrphanedProfile/terminateProcessTree: "process not found" = thành công sau khi kiểm tra lại; mọi lỗi sau OPENING_BROWSER phải đưa entry về SESSION_EXPIRED/NOT_AUTHENTICATED và clear openingPromise. Chỉ kill process khớp CHÍNH XÁC --user-data-dir của profile QIS (giữ nguyên selectExactProfileRootPids); không bao giờ kill Chrome cá nhân.
 4. Trả mã lỗi/thông điệp thật ở interactiveAuthenticate và preflight (controller dkclSharedOperationsController.js:31,52 chỉ dùng thông điệp chung làm fallback) và hiển thị ở UI.
 5. Day-rollover: job đầu ngày nghiệp vụ mới (hoặc khi phiên idle quá hạn định trước) tự re-validate qua đúng pre-flight ở mục 1; không tự kill browser đang thuộc một operation.
 6. Viết test cho 1–5 (backend dùng `node --experimental-sqlite --test <file>`; các file `test_*.js` ở root backend không nằm trong sweep — chạy từng file và báo riêng).

RÀNG BUỘC
- Level 1 validation (kiểm tra có mục tiêu); nâng cấp chỉ khi có lý do một câu.
- KHÔNG đổi SSOT, tài liệu đóng băng, parser/KPI/fact_f13. KHÔNG tự nhập mật khẩu — đăng nhập luôn do người vận hành làm tay.
- KHÔNG làm: tăng timeout 30s bảng kết quả / retry khi DKCL chậm (ticket riêng, đã ghi Out Of Scope).
- Cây làm việc có nhiều thay đổi chưa commit không thuộc ticket (frontend/src/features/networkMap/*, backend/test_dkclSessionPreflightService.js, .claude/, exports/, *.patch, scripts/tmp_*). KHÔNG đụng, KHÔNG stage chúng. Một phiên AI khác có thể commit/reset cùng worktree: commit CHỈ theo pathspec các file của ticket.
- Không tạo clone/worktree anh em; không force push; không --no-verify; không amend commit đã push.
- Không tự cho PO PASS. PO UI Check = Yes → dừng ở READY FOR PO CHECK.
- Model: không tự review chính bản mình viết; ghi rõ cần Opus review độc lập trước khi đóng.

KẾT QUẢ BÀN GIAO (Technical Execution Report gửi Claude/CTO, ngắn gọn, 100–250 từ, mở rộng chỉ khi thật sự cần):
- Kết quả; nguyên nhân/bằng chứng chính; file đã sửa; lệnh validation + output thật; residual thật (nếu có); Git handoff.
- Cập nhật: PROJECT_SNAPSHOT.md (nếu đổi ticket), thêm đúng 1 dòng/section vào PROJECT_PROGRESS.md (append-only), đăng ký tài liệu mới ở DOCUMENT_INDEX.md, Manifest Section 3.
- Chỉ checklist PO ngắn (4 mục Section 10 của Manifest) cho Product Owner.
````
