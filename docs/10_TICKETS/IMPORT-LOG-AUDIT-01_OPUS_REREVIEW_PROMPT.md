# IMPORT-LOG-AUDIT-01 — Prompt re-review cho Claude Code (Opus)

Dự án QIS V2, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập: **không sửa code**. Chỉ kiểm các sửa lỗi của commit `61d14fe` (`git show 61d14fe`) so với kết quả review trước (manifest `docs/10_TICKETS/IMPORT-LOG-AUDIT-01_MANIFEST.md` Mục 7).

**Kiểm từng điểm:**
1. Blocker: hộp xác nhận "Bù 3 ngày" đếm ô ghi đè trên coverage **không lọc** (còn đúng khi đang lọc chỉ tiêu/nguồn); hộp không mở sai khi lấy coverage lỗi hoặc chậm; không rò effect khi đóng hộp.
2. Tooltip: không còn lấy log của nguồn khác; `GET /import/log?latest=1` trả đúng dòng mới nhất mỗi (ngày dữ liệu, chỉ tiêu, nguồn), SQL tham số hóa, không phân trang sai; chỉ admin gọi.
3. `AUTO_BACKFILL_ANCHOR_CONFIRM_REQUIRED` (409): chỉ đòi khi có ngày đã hoàn tất bị ghi đè; màn hình luôn gửi `confirm_replace_completed`; `createRun` cũ và Nhập lại không đổi hành vi.
4. `anchor.job_count/replace_count` đúng với job thật tạo ra (yêu cầu trùng = 0); toast khớp.
5. Test mới có thật sự khóa các điểm trên không.

**Cấm:** browser, Playwright, chụp màn hình, dev server, đăng nhập. Test chạy theo file với `node --test --experimental-sqlite`; hai lỗi `test_f11ImportPipeline.js` đã biết.

**Báo cáo ngắn:** mỗi điểm 1–5 ghi PASS/FAIL kèm `file:dòng` nếu FAIL; phát hiện mới (nếu có) ghi mức và kịch bản sai; kết luận PASS hoặc FAIL. Không tự tuyên bố PO UI PASS.
