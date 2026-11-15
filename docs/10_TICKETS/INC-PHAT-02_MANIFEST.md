# INC-PHAT-02 Manifest

## 1. Ticket Information

- Ticket ID: `INC-PHAT-02`
- Name: `Module Thu nhập (công phát): bộ tính phatCalculator / hsclCalculator (hàm thuần) và parity harness T08, T09`
- Programme: `INCOME-PHAT-01`; ticket trước `INC-PHAT-01` (CTO đã duyệt `361e4319`; migration CHƯA áp DB sống, chưa nối `server.js` — thuộc INC-PHAT-05).
- Executor: Claude Code / Sonnet 5.5. Opus review: chờ CTO.
- Status: `READY FOR CTO REVIEW (2026-11-15)`. Chạy song song, không thay Current Ticket của phiên F13.
- PO UI Check Required: `No`. Validation: `LEVEL 2`.
- Không làm: HSCL từ `fact_f42` (INC-PHAT-03), 8,6,11/DHL (INC-PHAT-04), API, giao diện, tính T10, ghi `inc_result`.

## 2. Deliverables (tất cả mới, không sửa file hiện có)

| File | Nội dung |
|---|---|
| `backend/src/services/income/phatCalculator.js` | `calculatePhat(...)`: hàm thuần (không DB, file, đồng hồ) theo `INCOME-PHAT-00_FROZEN_RULES.md` mục 3–7: gộp theo số hiệu (cả hai chế độ: T08 cộng QUANTITY có dấu; T09 một lần/số hiệu, dòng +1 đầu thắng, bỏ −1), PH, bưu gửi có số (đơn giá theo mã trước, theo khoản 1699 sau), kg (mỗi kg bắt đầu; 2–15 kg và trên 15 kg), trần, gộp lô, tuyến không tính SL, BP thường/PHBC/DHL nhận từ `external` (trước HSCL), áp HSCL (T08 chỉ bưu gửi; T09 bưu gửi + PH + BPT + DHL + trại giam theo tỷ lệ HRM; PHBC không bao giờ), điều chỉnh, trại giam, bổ sung CTV, làm tròn từng khoản bằng làm tròn Python (half to even), đơn vị BCVH, cảnh báo như `canh_bao`. Chế độ do tham số kỳ (`PTC_MOT_LAN_SO_HIEU`, `PTC_SL_AM_TINH_DUONG`, `HSCL_PHAT_TOAN_BO`, `GOP_LO`). |
| `backend/src/services/income/hsclCalculator.js` | `calculateHscl(...)`, `hsclLimits(...)`: đúng `hscl.py` (kẹp min–max, miễn, điểm phạt ≤ 30, `sl_mau = 0`, phạm vi BCVH trước T09). Đầu vào là biểu F4.2 tổng hợp theo bưu tá như PMTL; lấy từ `fact_f42` là INC-PHAT-03. |
| `backend/src/services/income/incParams.js` | tham số/bảng giá hiệu lực theo kỳ, `pyRound`, `round4`. |
| `backend/scripts/income/export_pmtl_parity_fixture.py` | Xuất fixture từ PMTL, **chỉ đọc** (PMTL mở `mode=ro`; chạy PMTL trên bản sao tạm; `-I`, không ghi bytecode; đã kiểm: thư mục PMTL không đổi). |
| `backend/scripts/income/income-parity.js` | Parity harness (CLI, chỉ chạy trên bản sao DB QIS, chỉ ghi báo cáo vào thư mục fixture). |
| `backend/src/services/income/phatCalculator.test.js` | 13 test dữ liệu giả, kết quả tính tay. |

Fixture (không commit, `backend/storage/income-fixtures/`): `catalog_<kỳ>.json`, `parcels_<kỳ>.csv` (dòng PMTL theo `rowid`), `external_<kỳ>.json`, `kq_recompute_<kỳ>.csv`, `parity_report_<kỳ>.json`.

## 3. Cách đo (ba lần chạy mỗi kỳ, đúng tham số/danh mục PMTL từng kỳ — không dùng 97–102 %)

- **A** dòng sản lượng của PMTL, thứ tự PMTL (`rowid`): chứng minh logic.
- **B** `fact_bf_phat` của QIS, thứ tự QIS (`ngay_bf, id`): parity thật.
- **C** dòng QIS xếp lại theo vị trí của PMTL (ghép theo khóa dòng): B so C = ảnh hưởng của thứ tự đơn độc; C so kết quả lưu = ảnh hưởng của dữ liệu.
- Đầu vào lấy nguyên từ PMTL: `cp_dhl`, `cp_bpt`, `cp_phbc` (trước HSCL, từ PMTL chạy trên bản sao với HSCL ép bằng 1), danh mục, F4.2 tổng hợp, miễn, điểm phạt, tham số, điều chỉnh, trại giam.
- Phép so: từng HRM, từng cột `cp_buu_gui, cp_ph, cp_dieu_chinh, cp_trai_giam, bo_sung_ctv, hscl, tong` (khác đúng 1 đồng hoặc 1 đơn vị hscl là chênh), thêm `so_ptc, cp_dhl, cp_bpt, cp_phbc, tong_khong_phbc, cp_truoc_hscl, cp_sau_hscl, ma_buu_ta, don_vi`.

## 4. Kết quả (bản sao DB thật, 2026-11-15)

| Kỳ | Dòng PMTL / QIS | Chỉ có ở một bên | HRM | A | B | C |
|---|---|---|---|---|---|---|
| 2026-08 | 171.313 / 171.313 | 0 / 0 | 196 | **0 chênh** | **0 chênh** | 0 chênh |
| 2026-09 | 160.363 / 160.363 | 0 / 0 | 194 | **0 chênh** | **0 chênh** | 0 chênh |

**0 đồng chênh ở mọi HRM, mọi cột** (cả cột mục tiêu lẫn cột phụ), nên không có chênh cần nêu nguyên nhân từng HRM. `fact_bf_phat` và `sl_phat_ct` của PMTL là **cùng tập dòng** (khóa đầy đủ: số hiệu, bưu tá, tuyến, trạng thái, dịch vụ, kg, QUANTITY, mã lô).

**Chứng minh phép so có "nhìn thấy" lỗi:** chạy A với một quy tắc cố ý sai thì số HRM chênh là — T08: đổi quy tắc QUANTITY 57, đổi phạm vi HSCL 88, tắt HSCL 160, giá +1 % 191; T09: 75, 122, 179, 190.

**Kết quả lưu so với tính lại hôm nay của PMTL:** chạy lại `calc_phat.tinh` trên bản sao (HSCL thật) cho kết quả **trùng 100 %** với `kq_phat` đã lưu của T08 (196 HRM) và T09 (194 HRM), mọi cột — nên "kết quả lưu" và "kết quả tính lại" là một.

**Ảnh hưởng của thứ tự dòng (riêng):**
- Thứ tự `(ngay_bf, id)` của QIS **khác** thứ tự `rowid` của PMTL (cả hai kỳ), nhưng **không đổi đồng nào**: B và C trùng nhau 100 % ở mọi cột.
- T09 (một lần/số hiệu, thứ tự quyết định dòng nào thắng): 1.065 số hiệu lặp; dòng +1 đầu khác nhau ở **1** số hiệu (2 bưu tá), trạng thái `CH` (chuyển hoàn) — không được trả tiền, nên không ảnh hưởng.
- T08 (cộng QUANTITY có dấu, thứ tự chỉ ảnh hưởng thuộc tính của dòng cuối): 949 số hiệu lặp, 8 nhóm khác thuộc tính theo thứ tự; 0 HRM đổi. (Chỉ số "dòng +1 đầu" ở T08 không quyết định tiền.)
- Rủi ro còn lại: nếu một lần nạp bù sau này đổi thứ tự `id` của dòng lặp có khác bưu tá/tuyến/dịch vụ và trạng thái được trả tiền, kết quả có thể đổi; bộ tính dùng `(ngay_bf, id)` và nên ghi dấu vân dữ liệu lúc tính (INC-PHAT-05).

## 5. Validation (LEVEL 2)

- `node --experimental-sqlite --test` từng file: `phatCalculator.test.js` 13/13; các suite INC-PHAT-01 vẫn 4/4, 7/7, 5/5. Dữ liệu giả, không dữ liệu thật trong test/commit; ba file bộ tính không `require` DB hay `fs`.
- Parity chạy trên bản sao DB (sao lưu `backup` chỉ đọc nguồn); PMTL: thư mục và `tinhluong.db` không bị ghi (`git status` PMTL sạch).
- Không làm đúng phạm vi: HSCL từ `fact_f42`, 8,6,11/DHL, API, UI, T10, ghi `inc_result`.

## 6. Giới hạn đã biết

- `cp_dhl`, `cp_bpt`, `cp_phbc` được nhận nguyên từ PMTL, nên parity **chưa** chứng minh phần tính của chúng (INC-PHAT-04); parity cũng dùng F4.2 tổng hợp của PMTL (không phải `fact_f42`, INC-PHAT-03; lệch 82 dòng đã được ghi nhận là dung sai).
- `cp_trai_giam` ở T08/T09 đều 0 (PMTL không có dòng trại giam), nên nhánh này chỉ được kiểm bằng test dữ liệu giả.
- `GOP_LO` (gộp lô) không kỳ nào dùng; chỉ có test dữ liệu giả, chưa có parity.

## 7. Next

CTO review INC-PHAT-02; sau đó INC-PHAT-03 (HSCL từ `fact_f42`, so với F4.2 tổng hợp của PMTL kể cả dung sai 82 dòng).
