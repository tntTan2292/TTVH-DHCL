# INC-PHAT-00 Manifest

## 1. Ticket Information

- Ticket ID: `INC-PHAT-00`
- Name: `Module Thu nhập (công phát): quy tắc đóng băng từ PMTL và fixture so khớp T08–T10`
- Programme: `INCOME-PHAT-01` (đề xuất: `docs/04_TECHNICAL_PLANNING/Feature/INCOME-PHAT-01_INTEGRATION_PROPOSAL.md`, phương án A, CTO đã duyệt 2026-11-15). PMTL = app Python `TinhLuongBDTP` (chỉ đọc).
- Executor: Claude Code / Sonnet 5.5. Opus review ở ticket sau.
- Status: `DOCS DONE (2026-11-15)`. Chạy song song, **không** thay Current Ticket của phiên F13.
- PO UI Check Required: `No`. Validation: `LEVEL 1` (tài liệu + fixture, không code).
- Không làm: migration, bộ tính, API, giao diện.

## 2. PO decisions (2026-11-15)

1. Quyền xem theo RBAC hiện có của QIS; không tạo tài khoản bưu tá.
2. 8,6,11 và DHL: nạp Excel.
3. Danh mục: Admin nạp Excel.
4. Kỳ PMTL đã tính: QIS nhập nguyên `kq_phat`, khóa kỳ, không tính lại. Kỳ chưa tính: QIS tính mới, HSCL 97%–102% (nạp Excel); kỳ áp dụng chờ PO xác nhận.
5. PMTL vẫn là hệ thống chính thức cho đến khi nghiệm thu.

## 3. Deliverables

- `docs/04_TECHNICAL_PLANNING/Feature/INCOME-PHAT-00_FROZEN_RULES.md` — quy tắc công phát đúng như PMTL đang chạy, tham số từng kỳ, điểm mâu thuẫn cần PO.
- Đề xuất INCOME-PHAT-01 mục 4–7 cập nhật theo quyết định 4 (luồng nhập kết quả lịch sử; parity chỉ là phép thử logic).
- Fixture (KHÔNG commit, `backend/storage/income-fixtures/`, đã gitignore qua `backend/storage/`): `kq_phat_<kỳ>.csv`, `kq_phat_ct_<kỳ>.csv`, `params_by_period.json`, `summary.json` cho 2026-08/09/10, lấy từ `data/tinhluong.db` của PMTL (chỉ đọc).

## 4. Findings

**(a) Trạng thái kỳ và HSCL trong PMTL.** `ky_luong`: T08, T09, T10 đều `Đã tính`; **không kỳ nào Đã duyệt hoặc Khóa** (nếu PO muốn "kỳ đã tính → nhập và khóa" thì khóa ở phía QIS lúc nhập, PMTL không đóng dấu). Giới hạn HSCL: T08 **98%–102%**; T09 **70%–110%**; T10 **70%–110%** (kế thừa T09, không có dòng riêng). `HSCL_PHAT_TOAN_BO`: 0 (T08), 1 (T09, T10). 97%–102% **chưa từng** có trong PMTL. Tổng `kq_phat` (đồng): T08 808.992.197 / 196 HRM; T09 766.865.772 / 194 HRM; T10 611.044.448 / 160 HRM. **T10 không hoàn chỉnh:** BF chỉ đến 26/10, không có 8,6,11/DHL/PHBC/BP thường (DHL, BPT, PHBC = 0), F4.2 T10 là bản sao T09 → không nên nhập T10 như kỳ đã chốt.

**(b) Lệch 82 dòng mẫu số F4.2 (T09).** QIS `fact_f42` ngày đo kiểm 01–30/09: 161.089 dòng; PMTL `hscl_f42.sl_mau`: 161.007; `sl_dung` (Đạt) cả hai 128.580. Bảng `fact_f42_national` của QIS cũng ghi `sl_gbt` = 161.089, tức 161.089 là số hiện hành của cổng. Chênh nằm ở **25 bưu tá**: 24 bưu tá QIS nhiều hơn PMTL (1–18 dòng mỗi người), 1 bưu tá ít hơn 1; tổng +82; **phần chênh đều là dòng không "Đạt"**. Nguyên nhân khả dĩ nhất (chưa chứng minh từng dòng): PMTL nạp biểu F4.2 tổng hợp xuất ngày **05/10/2026 17:35**, QIS nạp F4.2 T09 ngày **27/10/2026** (`import_log`), sau cập nhật muộn thông tin GBT của cổng. Lệch T08 lớn hơn (QIS 173.280 so 171.882) cho cùng kiểu nguyên nhân + QIS có thêm 142 bưu tá lệch. Hệ quả: HSCL tính từ QIS sẽ lệch rất nhẹ so với PMTL; không phải lỗi logic. Cách chốt chắc: xuất lại biểu F4.2 T09 từ cổng hiện tại và so từng bưu tá (việc của ticket sau).

**(c) `dm_buu_ta` 199 so với 323 bưu tá PMTL.** `dm_buu_ta` là **một lần nạp duy nhất** ngày 2026-09-18 từ `2026.09.17 - DB Buu ta.xls` (198 dòng `IMPORT` + 1 `MANUAL`), mục đích gán bưu tá vào BCVH, **không có mã HRM**. `buu_ta` của PMTL là danh mục **cộng dồn**: mã từ file danh mục, từ 8,6,11 mỗi kỳ (ghi đè HRM/đơn vị) và 90 mã bổ sung theo README; 138 mã PMTL không có trong QIS đều có mã HRM, 60 trong số đó có phát sinh trong BF 08–26/10. Phía QIS: 255 mã bưu tá phát sinh trong BF 08–26/10, **72 mã không có trong `dm_buu_ta`**, 51 mã có trong F4.2 nhưng không có trong `dm_buu_ta`; 13 mã BF không có trong `buu_ta` PMTL. Kết luận: hai danh mục khác mục đích và thời điểm; để tính công cần danh mục bưu tá ↔ HRM riêng (`inc_postman_hrm`, Admin nạp), không dùng `dm_buu_ta`.

## 5. Next

INC-PHAT-01 (migration + nạp danh mục + nhập kết quả lịch sử) cần: PO chốt kỳ áp dụng 97–102 % và có nhập T08/T09 (và T10?) như đã chốt hay không (T10 chưa hoàn chỉnh). Opus review INC-PHAT-00 trước khi mở INC-PHAT-01.
