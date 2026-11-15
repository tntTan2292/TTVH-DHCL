# INC-PHAT-03 Manifest

## 1. Ticket Information

- Ticket ID: `INC-PHAT-03`
- Name: `Module Thu nhập (công phát): nguồn F4.2 của HSCL lấy từ fact_f42, so với PMTL, và tính thử HSCL T10 (97–102 %)`
- Programme: `INCOME-PHAT-01`; trước đó `INC-PHAT-02` (CTO đã duyệt `7e236664`; remediation byte NUL `2f579002`).
- Executor: Claude Code / Sonnet 5.5. Opus review: chờ CTO.
- Status: `READY FOR CTO REVIEW (2026-11-15)`. Chạy song song, không thay Current Ticket của phiên F13.
- PO UI Check Required: `No`. Validation: `LEVEL 2`.
- Không làm: 8,6,11/DHL, API, giao diện, ghi kết quả T10, ghi `inc_*`. `fact_f42` chỉ đọc.

## 2. Remediation INC-PHAT-02 (commit riêng `2f579002`)

`phatCalculator.js` dòng 86 và 96 có byte NUL thô trong template string nên git coi là nhị phân. Đã thay bằng escape viết dạng chữ `\u0001` (cùng chức năng: ký tự phân tách khóa). Kiểm: `git diff --numstat` so với cây rỗng ra **266 dòng** (là văn bản); `git grep -I` đọc được; không file `income` nào khác còn byte NUL; test 13/13; parity T08 (196 HRM) và T09 (194 HRM) vẫn **0 chênh**.

## 3. Deliverables INC-PHAT-03

| File | Nội dung |
|---|---|
| `backend/src/services/income/hsclF42Source.js` | `loadF42Rows(db, ky)`: một câu SELECT chỉ đọc (kết nối `OPEN_READONLY`), ra đúng `f42Rows` của `hsclCalculator` (bưu tá × tên BC, `sl_mau`, `sl_dung`). `sl_mau` = số dòng `fact_f42` của bưu tá trong tháng của `ngay_do_kiem` (kể cả dòng chưa có đánh giá); `sl_dung` = số dòng có `danh_gia = 'Đạt'`; bỏ dòng không có mã bưu tá. |
| `backend/src/services/income/hsclF42Source.test.js` | 4 test dữ liệu giả (đếm, tháng khác/mã trống bị loại, một bưu tá hai BC, tệp DB không đổi một byte và không ghi được, nối với `hsclCalculator`). |
| `backend/scripts/income/income-hscl-compare.js` | Báo cáo (CLI, bản sao DB, chỉ ghi `hscl_f42_report.json` trong thư mục fixture): so T09 (và T08 để tham khảo), kiểm các giả thuyết đếm, tính thử T10. |
| `backend/scripts/income/income-parity.js` | Chỉ thêm `module.exports` và điều kiện `require.main === module` để dùng lại hàm (hành vi CLI không đổi). |

Ghi chú tài liệu: đây là ánh xạ **dựa trên bằng chứng**, chưa phải quy tắc nghiệp vụ được chốt; xem mục 6.

## 4. T09: nguồn QIS so với `hscl_f42` của PMTL (tham số PMTL T09: KH 0,9, 70–110 %, TOAN_BO = 1)

| Đo | Kết quả |
|---|---|
| Cặp (bưu tá, BC) | PMTL 200, QIS 190; chỉ có ở PMTL **10**; chỉ có ở QIS 0; khác số liệu **25** |
| `sl_dung` (Đạt) | **0 cặp lệch**, tổng 128.580 = 128.580 |
| `sl_mau` | 25 bưu tá lệch, tổng QIS 161.089 so PMTL 161.007 (+82 dòng; từng bưu tá lệch từ −1 đến +18 dòng) |
| 10 cặp chỉ có ở PMTL | tất cả có `sl_mau = 0` và `sl_dung = 0` (PMTL liệt kê bưu tá "không có mẫu"; `fact_f42` không có dòng nào cho họ) |
| Bưu tá đổi HSCL nếu dùng nguồn QIS | **24** (10 bưu tá mẫu 0: 0,70 → 1,00; 14 bưu tá lệch 1–18 dòng: đổi 0,0004–0,011) |
| HRM đổi `hscl` (làm tròn 4 số) | **20** trên 194; đổi tiền **18** HRM |
| Chênh tiền | thuần −109.640 đ, tổng tuyệt đối 154.748 đ (tổng quỹ 766.865.772 → 766.756.132 đ, −0,014 %) |
| Tách nguyên nhân | bưu tá mẫu 0: 5 HRM, 4 đổi tiền, **+20.614 đ**; lệch số dòng mẫu: 15 HRM, 14 đổi tiền, **−130.254 đ** (tuyệt đối 134.134 đ) |

T08 (chỉ tham khảo, tham số T08: 98–102 %, TOAN_BO = 0): lệch nhiều hơn — 195 cặp, khác 136 (cả `sl_dung`: 140.543 QIS so 136.143 PMTL, +4.400); 23 HRM đổi tiền, thuần +1.020.799 đ. Ánh xạ khớp T09 chính xác ở `sl_dung` nhưng **không** khớp T08; chưa tìm ra nguyên nhân (xem mục 6, điểm 6).

**Bằng chứng cho cách đếm** (so từng bưu tá với `hscl_f42` T09, tổng chênh tuyệt đối): `sl_mau` = mọi dòng: 84 dòng lệch/25 bưu tá; chỉ dòng đã có đánh giá: 16.301/172 bưu tá; đếm số bưu gửi khác nhau: 84/25 (bằng cách đếm mọi dòng). `sl_dung` = dòng Đạt hay bưu gửi Đạt khác nhau: đều 0.

## 5. T10: tính thử HSCL từ `fact_f42` với 97–102 % (chỉ báo cáo, không ghi `inc_*`)

Giả định (PMTL không có dòng T10): KH 0,9 và `TOAN_BO = 1` như T09; danh sách miễn lấy của T09 (PMTL dùng danh sách gần nhất cho đến khi sửa); không điểm phạt (PMTL không có).

| Đo | Kết quả |
|---|---|
| Bưu tá có F4.2 T10 | **160** (miễn 8; tính hệ số 152) |
| Chạm sàn 0,97 | **87** (57 % số bưu tá tính hệ số) |
| Chạm trần 1,02 | **40** |
| Ở giữa | 25 (0,97–0,98: 5; 0,98–0,99: 5; 0,99–1,00: 3; 1,00–1,01: 10; 1,01–1,02: 2) |
| Bưu tá có BF `PTC` | 164 (171.369 dòng PTC) |
| Có BF PTC nhưng không có F4.2 | **5** bưu tá (20 dòng) → hệ số 1,00 (không có dòng F4.2) |
| Có F4.2 nhưng không có BF PTC | **1** bưu tá (232 mẫu, 0 Đạt → chạm sàn 0,97): nên kiểm dữ liệu |

(`sl_mau = 0`: không bưu tá nào ở T10.) Danh sách mã bưu tá nằm trong `hscl_f42_report.json` (fixture, không commit).

## 6. Điểm phải suy đoán khi ánh xạ `fact_f42` → `sl_mau`/`sl_dung` (không tự chốt)

1. **`sl_mau` = số dòng** của bưu tá, tính cả dòng chưa có `danh_gia` (16.383 dòng ở T09). Căn cứ: khớp 84 dòng lệch thay vì 16.301; `fact_f42_national.sl_gbt` cũng bằng số dòng (161.089). Chưa có văn bản định nghĩa "Sản lượng GBT có thông tin phát".
2. **`sl_dung` = dòng `Đạt`** (khớp tuyệt đối ở T09); không biết `Không đạt` và dòng trống có nằm trong nhóm khác của biểu hay không.
3. **Kỳ = tháng của `ngay_do_kiem`.** Ở T09 mọi dòng có `thoi_gian_gbt` cùng tháng nên không phân biệt được với "tháng của ngày GBT".
4. **Bưu tá không có mẫu**: PMTL có dòng `sl_mau = 0` và (khi `TOAN_BO = 1`) cho hệ số **MIN**; `fact_f42` không có dòng cho bưu tá không có bưu gửi, nên nguồn QIS không thể sinh dòng 0 — bưu tá đó rơi vào "không có số liệu F4.2" (hệ số 1,00). **Quy tắc cần PO/CTO chốt** (ảnh hưởng T09: 5 HRM, +20.614 đ).
5. **Lệch 82 dòng `sl_mau`** (T09) vẫn dung sai đã duyệt (biểu PMTL xuất 05/10, QIS nạp 27/10); ở HSCL chúng đổi hệ số 14 bưu tá, thuần −130.254 đ. Không thử khôi phục nguyên nhân từng dòng.
6. **T08 không khớp** (`sl_dung` cũng lệch 4.400 dòng): không rõ biểu T08 của PMTL lấy tại thời điểm nào hay theo định nghĩa nào; không kết luận. Vì vậy chỉ T09 làm bằng chứng cho ánh xạ.
7. **Một bưu tá nhiều BC**: nhóm theo (bưu tá, BC) như PMTL; T09 không có bưu tá nào hai BC; với `TOAN_BO = 1` tên BC không ảnh hưởng hệ số.
8. **`fact_f42.ma_hrm` rỗng** ở mọi dòng: bưu tá → HRM chỉ qua `inc_postman_hrm`. Bưu tá không có trong danh mục HRM vẫn có hệ số nhưng không gán được cho người.
9. **T10**: các giả định ở mục 5 (công tắc, danh sách miễn, không phạt) là của người làm, chưa phải quyết định PO.

## 7. Validation (LEVEL 2)

- `node --experimental-sqlite --test` từng file: `hsclF42Source.test.js` 4/4; `phatCalculator.test.js` 13/13; các suite INC-PHAT-01 vẫn 4/4, 7/7, 5/5. Dữ liệu giả.
- Báo cáo chạy trên bản sao DB QIS; PMTL không bị ghi. `fact_f42` không bị sửa (kết nối chỉ đọc, test kiểm tệp không đổi).
- Không commit dữ liệu thật; `hscl_f42_report.json` ở `backend/storage/income-fixtures/` (gitignore).

## 8. Next

CTO review; chờ quyết định mục 6 điểm 4 (bưu tá không có mẫu) trước khi INC-PHAT-04/05 dùng nguồn QIS cho kỳ tự tính. INC-PHAT-04: 8,6,11/DHL.

## 9. Quyết định PO sau INC-PHAT-03 (2026-11-15)

1. Bưu tá không có mẫu F4.2: **không cần xử lý riêng** (không đặt mức tối thiểu; nguồn QIS cho hệ số 1,00 như đang làm).
2. Các số chưa có (**DHL, PHBC, HSCL**; BP thường đi cùng nhóm 8,6,11) được **tách thành cột riêng, để rỗng (chưa có dữ liệu)** chờ PO nhập bằng Excel. Hệ quả cho INC-PHAT-04/05 (chưa làm ở đây): cột tương ứng của kết quả kỳ tự tính cho phép rỗng thay vì 0; nhập qua Excel; chưa tính HSCL từ `fact_f42` cho đến khi PO quyết lại (mục 4–6 giữ làm tham khảo).
3. **Bỏ qua dữ liệu cũ**: không tìm nguyên nhân T08 lệch nguồn QIS; T08/T09 giữ số PMTL đã nhập, không dùng làm căn cứ thêm.
