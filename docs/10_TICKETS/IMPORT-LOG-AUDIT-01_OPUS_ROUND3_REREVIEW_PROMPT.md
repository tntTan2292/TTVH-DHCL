# IMPORT-LOG-AUDIT-01 vòng 3 — Prompt re-review cho Claude Code (Opus)

Dự án QIS V2, nhánh `codex/da-impl-006`. Bạn là reviewer độc lập: **không sửa code**. Chỉ kiểm bản sửa của commit `8b2d451` (`git show 8b2d451`) so với kết quả review trước (manifest `docs/10_TICKETS/IMPORT-LOG-AUDIT-01_MANIFEST.md` Mục 13).

**Kiểm từng điểm:**
1. **B1:** tick đầu cột chỉ tiêu (`handleToggleCells` → `mergeDayCellsIntoSelection`): cột lẫn ô hoàn tất và còn thiếu chọn được cả hai, lên trạng thái "đủ", bấm lại thì bỏ chọn; cột chỉ toàn ô hoàn tất không còn "chết"; không làm mất ngày đã chọn trước; chế độ Nhập mới / Nhập lại đúng (có ô hoàn tất thì cả lựa chọn là Nhập lại); ngày nghỉ/ngoại lệ không bị chọn.
2. **S2:** nút "Thu hồi" lịch nghỉ hiện lại dưới nhãn "Nghỉ lễ" cho admin và gọi đúng handler với đúng đối tượng; nút "Chọn cả 4 chỉ tiêu" ẩn ở ngày nghỉ; không còn mã chết.
3. **S1:** độ rộng tối thiểu mới (tính lại tổng) có hợp lý với vùng nội dung ở 1280px khi sidebar mở; có ô/chip nào bị cắt chữ hoặc chồng nhau do hẹp hơn không (suy từ mã).
4. **Không hồi quy:** chức năng cũ (Nhập lại từng ô, tick ngày, nút bù 3 ngày, bảng phẳng, lọc một chỉ tiêu) không đổi; không biến chưa khai báo; test cũ chạy nguyên không sửa (`node --test` cho `autoBackfillAuditHelpers.test.js`, `AutoBackfillOperatorPanel.test.js`, `autoBackfillDayViewHelpers.test.js`); test 14 mới có thật sự khóa B1 không.

**Cấm:** mở browser, Playwright, chụp màn hình, chạy dev server, đăng nhập.

**Báo cáo ngắn:** mỗi điểm 1–4 ghi PASS/FAIL kèm `file:dòng` nếu FAIL; phát hiện mới (nếu có) ghi mức và kịch bản sai; kết luận PASS hoặc FAIL. Không tự tuyên bố PO UI PASS.
