# INC-PHAT-01 Manifest

## 1. Ticket Information

- Ticket ID: `INC-PHAT-01`
- Name: `Module Thu nhập (công phát): bảng inc_*, bộ nạp Excel danh mục, nhập kết quả lịch sử PMTL T08/T09`
- Programme: `INCOME-PHAT-01` (đề xuất `docs/04_TECHNICAL_PLANNING/Feature/INCOME-PHAT-01_INTEGRATION_PROPOSAL.md`; ticket trước: `INC-PHAT-00`, CTO đã duyệt `11f84823`).
- Executor: Claude Code / Sonnet 5.5. Opus review: chờ CTO.
- Status: `READY FOR CTO REVIEW (2026-11-15)`. Chạy song song, không thay Current Ticket của phiên F13.
- PO UI Check Required: `No`. Validation: `LEVEL 2` (bảng mới chứa dữ liệu lương).
- Không làm: áp migration lên DB sống, bộ tính, API, giao diện, nạp 8,6,11/DHL (INC-PHAT-04).

## 2. Quyết định bổ sung (CTO/PO 2026-11-15)

- T08, T09: nhập nguyên `kq_phat`/`kq_phat_ct` của PMTL, khóa kỳ, không tính lại.
- T10: **chưa nhập**, QIS tự tính (kỳ đầu tiên áp 97%–102%). Kiểm tra chéo sau bằng PMTL chạy cùng đầu vào, cùng 97–102%.
- Lệch 82 dòng F4.2: dung sai có giải thích của phép thử, không xuất lại biểu.
- Ghi cũng ở `INCOME-PHAT-00_FROZEN_RULES.md` mục 8.

## 3. Deliverables (tất cả mới, không sửa bảng/ file hiện có; chưa nối vào `server.js`)

| File | Nội dung |
|---|---|
| `backend/migrate_inc_phat_01_schema.js` (+ test) | 19 bảng `inc_*`, idempotent, **không có đường dẫn mặc định và từ chối `src/db/database.sqlite`**. `inc_audit_log` chỉ thêm (trigger chặn UPDATE/DELETE). Kỳ `KHOA` khóa toàn bộ dữ liệu theo kỳ (`inc_result`, `_detail`, `_warning`, `_hscl_exempt`, `_penalty`, `_adjustment`, `_ext_*`) và chính dòng `inc_period` (trigger). Có `inc_ext_8611`, `inc_ext_dhl` tạo sẵn, rỗng (INC-PHAT-04). |
| `backend/src/services/income/incCatalogImporters.js` (+ test) | Nạp: tuyến→nhóm, đơn giá theo mã (DB-Dongia), bảng giá PHAT/PHBC/DHL và tham số (`don_gia.json` hoặc bảng dài Excel), bưu tá↔HRM (`Buu ta.xlsx`), lao động (chỉ 6 cột cho phép, không CCCD/ngân hàng/SĐT/ngày sinh), miễn HSCL, điểm phạt, CTV, bưu tá→đơn vị, tuyến DHL. Tìm dòng tiêu đề theo tên cột như PMTL; nhận .xlsx/.csv/.json. Mỗi lần nạp là một giao dịch + một dòng audit. Không dùng `dm_buu_ta`. |
| `backend/src/services/income/incPmtlResultImporter.js` (+ test) | Nhập kết quả một kỳ từ `kq_phat_<kỳ>.csv`, `kq_phat_ct_<kỳ>.csv`: kiểm tiêu đề, kỳ, HRM duy nhất, `tong_khong_phbc` và `tong` từng HRM, PHBC chi tiết = tổng, tổng kỳ so `summary.json`; ghi, đọc lại và so **từng cột của từng HRM** với nguồn, rồi khóa kỳ. Hoặc tất cả hoặc không gì cả; kỳ đã có trong `inc_period` bị từ chối. |
| `backend/scripts/income/inc-catalog-import.js`, `inc-pmtl-results-import.js` (+ `_cli.js`) | CLI. Mặc định chạy thử (rollback); `--apply` mới ghi. Chỉ chạy trên **bản sao** DB (từ chối DB sống). Không có UI. |

## 4. Validation (LEVEL 2)

- `node --experimental-sqlite --test` từng file, DB tạm, dữ liệu giả: `migrate_inc_phat_01_schema.test.js` 4/4, `incCatalogImporters.test.js` 7/7, `incPmtlResultImporter.test.js` 5/5 (16/16). Không có dữ liệu thật (tên, HRM, tiền công) trong test hay trong commit.
- **Bản sao DB thật** (sao lưu bằng `backup` chỉ đọc nguồn, thư mục scratchpad): áp migration → 220 đối tượng cũ **không đổi**, 62 đối tượng mới đều tiền tố `inc_`/`trg_inc_`; số dòng `fact_bf_phat`, `fact_f42`, `fact_f13`, `qis_user`, `dm_buu_ta` không đổi. Migration trên DB sống bị từ chối (đã thử, exit 2).
- **File PMTL thật nạp vào bản sao** (định dạng đúng như PMTL dùng): `Don gia.xlsx` → bảng giá theo mã **708/708 dòng, 0 chênh** so với `bang_gia_dong` của PMTL; bảng giá PHAT/PHBC/DHL mới nhất bằng nhau; `tham_so` 134/134 và **tham số hiệu lực T08, T09, T10 đúng 0 chênh**; miễn HSCL 36/36; tuyến DHL 2/2. Chưa đủ so với PMTL: tuyến 219/223, CTV 15/16, lao động 507/552 (seed cũ hơn dữ liệu PMTL đang giữ), bưu tá↔HRM 243/323 (PMTL còn lấy từ 8,6,11 — INC-PHAT-04). Đây là độ đầy đủ của file nguồn, không phải lỗi bộ nạp.
- Một lỗi tìm thấy khi chạy file thật và đã sửa: ô nhãn `1085 đc` được gộp (merged) nên exceljs lặp nhãn ở mọi ô gộp → chỉ đọc nhóm 12; nay lấy ô đầu tiên (PMTL/openpyxl chỉ thấy ô chủ). Có test với ô gộp.
- **Nhập T08 và T09 vào bản sao** từ fixture: 196 và 194 HRM, 1.615 và 1.609 dòng chi tiết; so trực tiếp với `kq_phat`/`kq_phat_ct` trong `tinhluong.db` của PMTL (không qua csv): **0 HRM chênh ở mọi cột**, tổng `tong` khớp (808.992.197 và 766.865.772 đ), tổng chi tiết khớp; hai kỳ ở trạng thái `KHOA`, sửa/xóa bị trigger chặn; audit đủ. **T10 không nhập** (0 dòng).

## 5. Báo cáo thêm: dữ liệu tháng 10 của QIS

`fact_bf_phat` và `fact_f42` **đủ cả 31 ngày 01–31/10/2026, không ngày nào thiếu** (đọc `database.sqlite` chỉ đọc, 2026-11-15). BF: 184.536 dòng (thấp nhất 2.925 vào 18/10 Chủ nhật, cao nhất 7.969 vào 19/10); BF đã có tiếp đến 14/11. F4.2: 193.574 dòng trong tháng 10 (thấp nhất 4.169 vào 18/10), cũng đã có đến 14/11. Lưu ý: bản PMTL của T10 chỉ có BF đến 26/10 (154.047 dòng), nên khi so chéo T10 cần PMTL nạp lại BF đủ 31 ngày.

## 6. Giới hạn đã biết

- Migration **chưa** được nối vào `server.js` và **chưa áp** lên DB sống (theo yêu cầu); CTO/PO quyết khi nào áp và có thêm vào chuỗi khởi động như các migration khác hay không.
- Số 82 dòng F4.2, và phần tuyến/CTV/lao động/bưu tá thiếu trong seed, được ghi ở trên; danh mục đầy đủ cần Admin nạp file mới nhất của PMTL.
- Fixture (`backend/storage/income-fixtures/`, gitignore) chứa họ tên/HRM/tiền công; không commit.

## 7. Next

CTO review INC-PHAT-01; sau đó INC-PHAT-02 (bộ tính bưu gửi có số, PH, trần, CTV, trại giam; phép thử logic T08/T09 bằng tham số PMTL đã dùng).
