# INCOME-PHAT-01 — Phương án tích hợp module Thu nhập (công phát) vào QIS

Trạng thái: **CTO đã duyệt phương án A (2026-11-15); mục 4–7 đã cập nhật theo quyết định PO 2026-11-15** — chưa có dòng code nào được viết. Ticket mở đầu: INC-PHAT-00 (`docs/10_TICKETS/INC-PHAT-00_MANIFEST.md`). Ngày lập: 2026-11-15. Người lập: Claude Code (Sonnet 5.5).
Nguồn rà soát: `D:\Antigravity - Project\TinhLuongBDTP_20261027_1416\TinhLuongBDTP` (Flask + SQLite, ~6.600 dòng Python), đối chiếu số liệu thật với `backend/src/db/database.sqlite` (chỉ đọc).
Phạm vi: chỉ **lương công phát**. Khai thác BCKT1/BCVH, XLNV, VCC2/3, thu gom, sân bay, bảng lương tổng hợp: ngoài phạm vi.

## 1. Dự án nguồn làm gì (phần công phát)

- `app/calc_phat.py` (339 dòng) tính tiền công từng bưu tá theo mã HRM: bưu gửi có số (đơn giá theo mã tham chiếu × nhóm tuyến, cộng kg >2 kg, trần 120.000 đ, gộp lô), phát hoàn 200 đ, DHL theo kg AWB, PHBC, BP thường, bổ sung CTV (đủ 6.000 đ × PTC), trại giam (500.000 đ/ngày công), điều chỉnh tay.
- `app/hscl.py` (114 dòng): hệ số chất lượng phát = (tỷ lệ PTC đúng ≤ 11,5 h / 90%) × (100 − điểm phạt)/100, chặn min–max, danh sách miễn; nhân vào bưu gửi, BP thường, phát hoàn, DHL, trại giam.
- Quy tắc đã chốt: mỗi số hiệu chỉ tính 1 lần (`PTC_MOT_LAN_SO_HIEU`), HSCL áp mọi bưu cục (`HSCL_PHAT_TOAN_BO`), ngoài giờ +2.000 đ/bưu gửi. Đơn giá, tham số theo kỳ nằm ở `seed/don_gia.json`, `seed/don_gia_ma.csv`.
- Vòng đời kỳ: Nhập liệu → Đã tính → Đã duyệt → Khóa (có sao lưu, nhật ký). Kết quả: `kq_phat`, `kq_phat_ct`, `canh_bao`.

## 2. QIS đã có gì — kết quả đối chiếu số liệu thật

| Đầu vào công phát | Trong QIS | Kết quả đối chiếu |
|---|---|---|
| Sản lượng chi tiết từng bưu gửi (file SanLuongChiTiet) | `fact_bf_phat` (đủ cột: lading_code, postman_code, route_po_code, status_code, type/service payroll, kg, area, service_code, quantity, ma_lo) | **Trùng 100%**: T10 1–26/10 đều 154.047 dòng / 150.521 số hiệu; T09 PTC 149.055 = 149.055. Cùng một nguồn. |
| Chất lượng phát F4.2 (tính HSCL) | `fact_f42` mức từng bưu gửi (ma_buu_ta, danh_gia, thời gian GBT/PTC) | T09 "Đạt" = **128.580**, trùng `sl_dung` của app. Mẫu số: app 161.007, QIS 161.089 dòng (lệch 82, cần làm rõ cách loại trừ). `ma_hrm` trong QIS **rỗng**. |
| Bưu tá → BCVH | `dm_buu_ta` (199 bưu tá) | App có 323 bưu tá kèm mã HRM; QIS **không có mã HRM**. |
| Phân quyền theo BCVH | `qis_user`, `qis_user_bcvh`, capability trong `roles.js` | Dùng lại được. |

**Chưa có trong QIS (dữ liệu danh mục / nhập tay, không phải sản lượng vận hành):**
1. Báo cáo 8,6,11 (PHBC ≈ 145.632 PTC/tháng và BP thường ≈ 31.740; cũng là nguồn ghép bưu tá ↔ HRM ↔ đơn vị). PHBC **không** nằm trong `fact_bf_phat`.
2. TTVH_BC PHÁT DHL (~336 AWB/tháng, kg theo AWB).
3. Bảng tuyến → nhóm đơn giá (`tuyen_phat`, 223 tuyến; nhóm 1–10) — QIS chỉ có mã tuyến.
4. Đơn giá theo văn bản (VB 1699/1905/2618, DB-Dongia) và tham số theo kỳ.
5. Danh sách lao động (mã HRM, họ tên, loại HĐ), ghép tên, CTV, danh sách miễn HSCL, điểm phạt, sheet trại giam, khoản điều chỉnh.

Kết luận: "đủ dữ liệu" **đúng cho phần lõi** (bưu gửi có số + HSCL). PHBC, BP thường, DHL, danh mục tuyến/HRM vẫn phải được đưa vào QIS (nạp file hoặc đọc từ nguồn khác) — không thể tính khớp bảng lương Excel nếu thiếu.

## 3. Phương án tích hợp (CTO chọn)

**A — Chuyển bộ tính sang Node trong backend QIS (ĐỀ XUẤT).** Tính trực tiếp từ `fact_bf_phat`/`fact_f42`, bảng mới tiền tố `inc_`, một hệ thống, một nguồn sự thật. Chi phí: viết lại ~450 dòng logic + nạp danh mục. Rủi ro: lệch số khi dịch → khóa bằng kiểm thử so khớp (mục 6).
**B — Giữ app Python, QIS gọi API/đọc `kq_phat`.** Nhanh nhất nhưng hai hệ thống, hai bản sao BF (đã trùng), thêm tiến trình Python + cổng mới, khó phân quyền theo BCVH.
**C — Chỉ đọc `kq_phat` hiển thị trong QIS (tạm thời).** Gần như không tốn công, không tính lại được, vẫn phải chạy app Python hằng kỳ. Có thể dùng làm cầu nối trong lúc làm A.

Đề xuất: **A**, giữ app Python là hệ thống chính thức và là "bản chuẩn đối chiếu" cho tới khi QIS khớp tuyệt đối 3 kỳ liên tiếp (T08, T09, T10); chưa tắt app cũ.

## 4. Thiết kế mục tiêu (phương án A)

- **Bảng mới** (migration riêng, không sửa bảng hiện có): `inc_period` (trạng thái kỳ, khóa), `inc_price_table/inc_price_row`, `inc_param` (hiệu lực theo kỳ), `inc_route_group`, `inc_postman_hrm`, `inc_employee` (chỉ mã, họ tên, đơn vị, chức danh, loại HĐ — không CCCD/ngân hàng/SĐT), `inc_hscl_exempt`, `inc_penalty`, `inc_adjustment`, `inc_ext_8611`, `inc_ext_dhl`, `inc_result`, `inc_result_detail`, `inc_warning`, `inc_audit_log` (chỉ thêm, trigger chặn sửa/xóa như `f13_analysis_log`).
- **Không sao chép** 150.000 dòng BF/tháng: đọc thẳng `fact_bf_phat` theo khoảng ngày của kỳ; ghi nhận chữ ký dữ liệu lúc tính để biết kết quả có cũ so với BF không.
- **Luồng nhập kết quả lịch sử (quyết định PO 4):** kỳ PMTL đã tính → QIS nhập **nguyên** `kq_phat`/`kq_phat_ct` (Admin nạp Excel/CSV xuất từ PMTL) vào `inc_result`/`inc_result_detail` với `nguon='PMTL'`, **khóa kỳ ngay**, **không tính lại** và không cho tính lại. Kỳ chưa tính → QIS tính mới (`nguon='QIS'`), HSCL 97%–102%, các tham số nạp Excel. Mỗi dòng kết quả ghi nguồn; giao diện hiển thị rõ "Nhập từ PMTL" / "QIS tính".
- **Bộ tính**: `backend/src/services/income/` — `phatCalculator.js`, `hsclCalculator.js`, thuần hàm (đầu vào: dữ liệu đã nạp, đầu ra: kết quả + cảnh báo) để kiểm thử độc lập.
- **HSCL**: lấy tử/mẫu từ `fact_f42` theo bưu tá và kỳ; không còn cần nạp biểu F4.2 tay.
- **API + quyền**: capability mới `income.view`, `income.calc`, `income.approve`, `income.admin`; truy vấn luôn giới hạn theo `qis_user_bcvh` (Giám đốc BCVH chỉ thấy đơn vị mình). Bảng lương là dữ liệu nhạy cảm: log mọi lần xem/xuất.
- **Giao diện** (Antigravity): menu "Thu nhập" → Kỳ công phát; Bảng công phát theo người; Chi tiết người (khoản, HSCL, truy về từng bưu gửi); Cảnh báo dữ liệu; Đối chiếu Excel. Tuân thủ `report_block_ui_standard.md` (nút chụp, sắp xếp theo tiêu đề, theo bộ lọc ngày…).

## 5. Các ticket đề xuất (một lỗi/việc → một ticket → một commit)

| # | Ticket | Nội dung | Người làm | Ghi chú |
|---|---|---|---|---|
| 0 | INC-PHAT-00 | Chốt quy tắc "đóng băng" từ Python + bộ fixture so khớp T08/T09/T10 | Claude Code, Opus review | Cần PO trả lời mục 7 |
| 1 | INC-PHAT-01 | Migration `inc_*` + nạp danh mục Excel (tuyến→nhóm, đơn giá, lao động, bưu tá↔HRM) + **nhập kết quả lịch sử PMTL và khóa kỳ** | Claude Code | Admin nạp Excel |
| 2 | INC-PHAT-02 | Bộ tính bưu gửi có số, phát hoàn, trần, lô, CTV, trại giam | Claude Code | Parity harness bắt buộc |
| 3 | INC-PHAT-03 | HSCL từ `fact_f42` + miễn + điểm phạt | Claude Code | Làm rõ mẫu số (lệch 82) trước |
| 4 | INC-PHAT-04 | Nạp 8,6,11 (PHBC, BP thường) và DHL | Claude Code | Đóng khoảng trống mục 2 |
| 5 | INC-PHAT-05 | API + RBAC + khóa kỳ + nhật ký | Claude Code | Đánh giá độc lập Opus |
| 6 | INC-PHAT-06 | Giao diện Thu nhập | Antigravity | Không mở browser (quy ước), PO tự check UI |
| 7 | INC-PHAT-07 | Chạy song song kỳ chưa tính đầu tiên, báo cáo chênh lệch với PMTL, PO nghiệm thu | Claude Code + PO | Chỉ sau đó mới đề xuất bỏ PMTL cho công phát |

## 6. Kiểm chứng (cách chứng minh đã khớp)

- Phép thử logic: chạy bộ tính QIS cho T08, T09, T10 với **đúng tham số/bảng giá PMTL đã dùng từng kỳ** (`INCOME-PHAT-00_FROZEN_RULES.md` mục 2: T08 98–102 %, T09–T10 70–110 %) — **không** dùng 97–102 % — rồi so từng HRM, từng cột với fixture `kq_phat` (không commit). Đây chỉ chứng minh logic dịch đúng, **không** thay thế kết quả PMTL đã nhập (kỳ đã tính vẫn giữ số của PMTL).
- Kỳ đầu tiên QIS tính thật dùng 97–102 % (kỳ áp dụng do PO xác nhận).
- T10 trong PMTL thiếu DHL/BP thường/PHBC và F4.2 là bản sao T09 nên chỉ so được bưu gửi, phát hoàn, CTV.
- Chạy trên **bản sao DB**, không thử trên DB sống; không chạy test đăng nhập vào backend sống. Backend test: `node --experimental-sqlite --test`.

## 7. Quyết định PO (2026-11-15)

1. Quyền xem theo RBAC hiện có của QIS; không tạo tài khoản bưu tá.
2. 8,6,11 và DHL: nạp Excel.
3. Danh mục (tuyến→nhóm, bưu tá↔HRM, danh sách miễn, điểm phạt, trại giam…): Admin nạp Excel.
4. Kỳ PMTL đã tính: QIS nhập nguyên `kq_phat`, khóa kỳ, không tính lại. Kỳ chưa tính: QIS tính mới, HSCL 97%–102%, nạp Excel. Kỳ áp dụng 97–102 % **chờ PO xác nhận**.
5. PMTL vẫn là hệ thống chính thức cho đến khi nghiệm thu.

## 8. Rủi ro cần CTO lưu ý

- Dữ liệu lương cá nhân + họ tên + HRM là nhạy cảm; thêm bảng/đường dẫn mới là bề mặt tấn công mới → cần đánh giá độc lập (Opus) trước khi mở.
- Worktree hiện có nhiều thay đổi chưa commit của phiên khác (F13/ranking); ticket sẽ commit theo pathspec, không động vào các file đó.
- `fact_bf_phat` được nạp/bù lại bởi backfill tự động → số tiền có thể đổi sau khi tính; cần chữ ký dữ liệu và khóa kỳ.
- Khác biệt định dạng ngày (app cũ `YYYYMMDD`, QIS `YYYY-MM-DD`), mã bưu tá/HRM: cần lớp chuẩn hóa và test.
- Chưa chạm SSOT hay tài liệu đóng băng; ticket mới cần Manifest và cập nhật `PROJECT_SNAPSHOT.md` khi được phê duyệt.

## 9. Trạng thái

CTO đã duyệt (a) phương án A, (b) mở INC-PHAT-00. Các câu hỏi mục 7 đã được PO trả lời; còn mở: kỳ áp dụng HSCL 97–102 % (xem `INCOME-PHAT-00_FROZEN_RULES.md` mục 8).
