# F13-ROUTE-POSTMAN-IDENTITY-01 — Focused Re-Review 003 (remediation of Backend Review 002)

- Ticket: `F13-ROUTE-POSTMAN-IDENTITY-01`
- Reviewed commit: `72d58e0` (`fix(f13): remediate backend review 002 findings (B1 blocking + M2-M5)`); prior states `4f339b1` (implementation) and `55319f9` (review 002)
- Reviewer: Claude Code (Opus 5) — same independent reviewer who raised B1/M2–M5
- Date: 2026-09-19
- Scope: only the findings of `F13-ROUTE-POSTMAN-IDENTITY-01_BACKEND_REVIEW_002.md`, plus the four confirmations the Product Owner asked for. Read-only: `SELECT`-only access to the live database, production code paths exercised on isolated temp databases, test runs. No source, schema or database change; no Browser/Playwright.

## 1. Verdict — plain language

**PASS. Lỗi đã được sửa đúng, không phát sinh lỗi mới. Có thể bắt đầu Phase 3 (giao diện).**

Lỗi gộp bưu tá đã hết: kiểm tra lại **toàn bộ** dữ liệu — 92 ngày, 9.269 lượt (tuyến × ngày), 12.445 dòng bưu tá — không còn mã nào bị mất, không còn sản lượng bị cộng nhầm, và tổng sản lượng của từng tuyến giữ nguyên. Bốn điểm nhỏ cũng đã xử lý đúng. 198 bưu tá và dữ liệu nghiệp vụ không bị đụng tới, KPI/xếp hạng F1.3 không đổi, và 4 test chưa đạt vẫn đúng là lỗi cũ.

## 2. B1 — lỗi chặn đã sửa

Cách sửa đúng gốc rễ: câu truy vấn trong `backend/src/services/postmanRankingService.js` không còn gom nhóm theo tên rút gọn trùng với tên cột của bảng danh bạ, mà gom theo chính mã bưu tá trong dữ liệu phát.

| Kiểm tra | Kết quả |
| --- | --- |
| Tuyến `533140131` ngày 17/08/2026 (ví dụ PO nêu) | `53A152 = 65` **và** `53B246 = 17`, hiển thị thành hai dòng riêng, cả hai đều chưa có tên. Trước đây là một dòng gộp `53A152 = 82` và mất `53B246` |
| Đối soát **toàn bộ** dữ liệu: 92 ngày, 9.269 lượt (tuyến × ngày), 12.445 dòng bưu tá | **0 mã bị mất, 0 sản lượng sai, 0 mã thừa, 0 lượt sai tổng tuyến** |
| Riêng nhóm 232 lượt (tuyến × ngày) từng bị ảnh hưởng, 1.112 dòng bưu tá | **0 trường hợp còn sai** |
| Tổng sản lượng tuyến trước/sau khi gắn thông tin bưu tá | Giữ nguyên trên tất cả 9.269 lượt (tổng các dòng bưu tá luôn bằng đúng số bưu gửi của tuyến hôm đó) |
| Bảng xếp hạng ngày 17/08/2026, BCVH 533140 | Khớp dữ liệu gốc **31/31 tuyến** (trước khi sửa là 30/31); số dòng bưu tá tăng từ 45 lên 46 — đúng bằng mã `53B246` được trả lại |
| Xem theo kỳ | Vẫn neo đúng một ngày đánh giá; 0 dòng lệch so với dữ liệu gốc của ngày đó |
| Tốc độ | 20 ms cho 102 tuyến, vẫn dùng đúng index mới (`SEARCH dp USING COVERING INDEX`) — không chậm đi sau khi sửa |
| Test | 4 test hồi quy mới cho đúng tình huống từng lọt lưới (hai bưu tá đều chưa có tên trên cùng tuyến/ngày); toàn bộ 37 test của nhóm chức năng này đạt |

## 3. Bốn điểm nhỏ

| Điểm | Yêu cầu | Kết quả kiểm chứng độc lập |
| --- | --- | --- |
| **M2** | Tên nhập tay được bảo vệ, nhưng bưu cục/trạng thái vẫn cập nhật | **PASS.** Bản ghi nhập tay + file mới cùng tên: bưu cục đổi `530001 → 539999`, trạng thái đổi `Hoạt động → Nghỉ việc`, tên giữ nguyên `TEN NHAP TAY`, quyền sở hữu vẫn là `MANUAL`. File mới khác tên: không ghi đè gì, đưa vào danh sách xung đột |
| **M3** | Rollback đóng đúng xung đột liên quan, không xoá quyết định xử lý phát sinh sau đó | **PASS, cả hai vế.** (a) Quyết định xử lý xung đột nay mang mã đợt riêng (`resolve-conflict-…`), không còn dùng mã đợt của lần nạp file; khôi phục lần nạp file đó **không** làm mất quyết định (tên sau khôi phục vẫn là tên đã được PO duyệt). (b) Khôi phục một đợt còn xung đột đang mở thì xung đột đó được đóng lại (`KEPT_MANUAL`, ghi rõ "auto-closed by rollback") và tên nhập tay không bị đụng |
| **M4** | Migration an toàn trên database mới/rỗng và vẫn idempotent | **PASS.** Chạy trên file database rỗng hoàn toàn: thành công, tạo đủ 3 bảng + index (trước đây lỗi `no such table/column`). Chạy lần hai: nhận ra 3/3 bảng đã có, không làm gì thêm. Trong chuỗi khởi động máy chủ vẫn là no-op vì các bước trước đã chạy |
| **M5** | Manifest sửa đúng số liệu test | **PASS.** Mục 11 nay ghi đúng: 2 test thuộc `DashboardController.r6.integration.test.js`, 1 thuộc `DashboardController.recovery.test.js`, 1 thuộc `timelineService.recovery.test.js` |

Ghi chú (không phải lỗi): khi file mới **khác tên** với bản ghi nhập tay, hệ thống không ghi gì cả — kể cả bưu cục/trạng thái — cho tới khi PO xử lý xung đột. Đây đúng theo quyết định D1 ("không ghi đè"), và sau khi PO chọn "lấy theo file" thì bưu cục/trạng thái được cập nhật cùng lúc.

## 4. Bốn xác nhận theo yêu cầu

1. **198 bưu tá và dữ liệu nghiệp vụ không đổi.** Live database: `dm_buu_ta` 198 dòng / 198 mã, `dm_buu_ta_event` 198 bản ghi trong đúng 1 đợt, 0 xung đột, 0 dòng nguồn khác `IMPORT`, lần cập nhật cuối vẫn là `2026-09-18 03:31:58` (đợt nạp gốc). `fact_f13` 817.115 và `network_delivery_point` 440.091 — y hệt trước. Bản vá không nạp lại và không sửa dữ liệu.
2. **KPI / xếp hạng F1.3 không đổi.** Hai file tính KPI (`F13DashboardService.js`, `routePeriodService.js`) giống hệt bản `4f339b1` (cùng mã băm nội dung), tức lần sửa này không chạm vào chúng. Tính lại `total_bg`/`passed` trực tiếp từ `fact_f13`: khớp **31/31 tuyến**.
3. **4 test chưa đạt vẫn là lỗi cũ.** Chạy cùng điều kiện tại `72d58e0`: **394/398 đạt, 4 hỏng** — đúng 4 test cũ. Cả 5 file liên quan (3 file test và 2 file bị test kiểm tra) giống hệt nhau từng byte ở cả ba mốc `b15d648`, `4f339b1`, `72d58e0`, nên không thể do các thay đổi này gây ra. Số test tăng 389 → 398 (9 test mới), tất cả đều đạt.
4. **Không phát sinh lỗi mới.** Ngoài 4 lỗi cũ, không có test nào hỏng. Chạy lại toàn bộ kịch bản đã kiểm ở review 002 trên database cách ly: nạp 198/198, nạp lại cho ra 198 "không đổi" (không sinh trùng), bảo vệ tên nhập tay, giữ và đánh dấu mã vắng mặt, khôi phục đúng và vẫn từ chối khi đợt sau đã tác động (`BLOCKED_BY_LATER_BATCH`). Tốc độ truy vấn không giảm.

## 5. Kết luận và bước tiếp theo

- **B1: CLOSED.** M2, M3, M4, M5: **CLOSED.** Không còn tồn đọng nào từ Backend Review 002.
- **Phase 3 (giao diện) được mở khoá** cho Antigravity theo Design of Record v2; PO UI acceptance chỉ diễn ra ở cuối Phase 3 và không được tự cấp.
- Phase 4 (tự động lấy BF hằng ngày) và Phase 5 (BCCP định vị) vẫn chờ PO cung cấp nguồn/cách lấy và file mẫu — không đổi.
