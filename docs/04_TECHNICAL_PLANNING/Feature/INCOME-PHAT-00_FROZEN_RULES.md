# INCOME-PHAT-00 — Quy tắc đóng băng của công phát (lấy từ PMTL)

PMTL = app Python `TinhLuongBDTP` (`D:\Antigravity - Project\TinhLuongBDTP_20261027_1416\TinhLuongBDTP`, chỉ đọc). Tài liệu này ghi **đúng những gì PMTL đang làm** (kể cả điểm lạ), làm chuẩn cho bộ tính QIS. Không phải quy tắc nghiệp vụ mới; chỗ PMTL mâu thuẫn tài liệu của chính nó được nêu ở mục 8 để PO xác nhận, không tự sửa. Nguồn mã: `app/calc_phat.py` (hàm `tinh`), `app/hscl.py`, `app/importers.py`, `app/db.py` (`tham_so`, `bang_gia`), `seed/don_gia.json`. Ngày đọc: 2026-11-15.

## 1. Chọn tham số và bảng giá theo kỳ
- `tham_so(khoa, kỳ)` = giá trị có `hieu_luc_tu` lớn nhất mà `<= kỳ` (so sánh chuỗi `YYYY-MM`). Thiếu thì dùng mặc định trong mã.
- `bang_gia(loại, kỳ)` = bảng có `hieu_luc_tu` lớn nhất `<= kỳ` (trùng thì `id` lớn nhất). Loại: `PHAT` (VB 1699, nhóm 1–10, khoản BPBD/EMS/KG_2_15…), `PHAT_MA` (DB-Dongia, khối "1085 đc", khóa = SERVICE_CODE+TYPE_CODE_PAYROLL+SERVICE_NAME_PAYROLL+AREA_CODE × nhóm), `PHBC` (VB 1699 từ 2026-05; VB 2618 từ 2026-08), `DHL` (VB 1905 từ 2026-06).
- Không có bảng `PHAT` hiệu lực → lỗi "Chưa có bảng đơn giá phát hiệu lực".

## 2. Tham số thực tế từng kỳ (đọc từ `tham_so`)
| Tham số | T08 | T09 | T10 |
|---|---|---|---|
| `HSCL_PHAT_KH` | 0,9 | 0,9 | 0,9 |
| `HSCL_PHAT_MIN` / `MAX` | **0,98 / 1,02** | **0,70 / 1,10** | **0,70 / 1,10** (không có dòng riêng T10, kế thừa T09) |
| `HSCL_PHAT_TOAN_BO` | 0 (mặc định) | 1 | 1 |
| `PTC_MOT_LAN_SO_HIEU` | 0 | 1 | 1 |
| `PTC_SL_AM_TINH_DUONG` | 0 | 1 (bị `MOT_LAN` vô hiệu) | 1 (như T09) |
| `GOP_LO` | 0 | 0 | 0 |
| `TRAN_BUU_GUI` | 120.000 | 120.000 | 120.000 |
| `CTV_DON_GIA` | 6.000 | 6.000 | 6.000 |
| `TUYEN_KHONG_SL:53625053` | 1 | 1 | 1 |
| Bảng giá hiệu lực | PHAT 1699, PHAT_MA DB-Dongia, PHBC 2618, DHL 1905 | như T08 | như T08 |
Ảnh chụp đầy đủ (kèm bảng giá) nằm trong fixture `params_by_period.json` (không commit). Quyết định PO 2026-11-15: kỳ chưa tính dùng HSCL **97%–102%** (nạp Excel) — hiện **chưa trùng** giá trị nào PMTL đang dùng (xem mục 8).

## 3. Chuẩn hóa dòng sản lượng (file SanLuongChiTiet → `sl_phat_ct`)
`STATUS_CODE`, `SERVICE_CODE`, `TYPE_CODE_PAYROLL`, `AREA_CODE` viết hoa; `QUANTITY` = số nguyên, rỗng/0 → 1; `KG` đổi ra gam; ngày dạng `YYYYMMDD`. Thứ tự dòng là thứ tự nạp (`ORDER BY rowid`) — quan trọng cho quy tắc "dòng đầu" ở mục 4. QIS lấy từ `fact_bf_phat` (cùng cột, ngày `YYYY-MM-DD`): bộ tính phải sắp theo `ngay_bf, id` và chứng minh thứ tự này không làm đổi kết quả (xem mục 9).

## 4. Gộp theo số hiệu
Khóa gộp = (mã bưu tá, số hiệu, trạng thái, mã tuyến).
- `PTC_MOT_LAN_SO_HIEU = 1`: bỏ dòng `QUANTITY < 0`; mỗi (số hiệu, trạng thái) chỉ lấy **dòng đầu** (bưu tá và tuyến của dòng đó), q = 1; các dòng sau đếm vào cảnh báo "Trùng số hiệu".
- Ngược lại: cộng `QUANTITY` (nếu `PTC_SL_AM_TINH_DUONG = 1` thì cộng `abs`). Dòng có tổng q = 0 bị bỏ.
- Chỉ trạng thái `PTC` (phát thành công) và `PH` (phát hoàn) được tính; trạng thái khác bỏ qua.

## 5. Tiền từng khoản
- Nhóm đơn giá = `tuyen_phat.nhom` của mã tuyến; tuyến chưa có nhóm → bỏ, cảnh báo "Tuyến".
- `PH`: q × đơn giá `("PH", nhóm)` → khoản `ph`. Không áp HSCL trước T09; áp từ T09 (mục 6).
- `PTC`: cộng `so_ptc` bưu tá. Tuyến trong `TUYEN_KHONG_SL` (Trại giam Bình Điền 53625053): không tính tiền, ghi chi tiết "Không tính SL".
- Đơn giá gốc: tra `PHAT_MA[(mã tham chiếu NFC, nhóm)]` trước; không có thì `phan_loai()` → khoản 1699 (QT, BAOPHAT, BPT, EMS/EMSCOD/EMSHT, BK/BKCOD, BPBD, KT1/KT1ABC) rồi `PHAT[(khoản, nhóm)]`; không ánh xạ được → cảnh báo "Dịch vụ", không tính.
- Bưu gửi: `q × min(TRAN, gốc + tien_cong_kg)`; `tien_cong_kg`: kg ≤ 2 → 0; phần vượt 2 kg: `ceil(min(vượt,13))` kg × `KG_2_15` + `ceil(max(0, vượt−13))` kg × `KG_TREN_15` (ε 1e-9 khi làm tròn). Khoản `buu_gui`.
- Gộp lô (`GOP_LO=1`, chưa dùng kỳ nào): theo (bưu tá, mã lô), `min(max(TRAN, Σ gốc), Σ gốc + cộng kg theo tổng kg lô)`. `GOP_LO = 0` ở cả T08–T10.
- 8,6,11 (`sl_8611`, một dòng = bưu tá × sản phẩm × tuyến; `ptc` = PTC đúng QĐ + quá QĐ + KXĐ): sản phẩm `PHBC` → `ptc × PHBC[("PHBC", nhóm)]` (khoản `phbc`); `BP THƯỜNG` → `ptc × PHAT[("BPT", nhóm)]` (khoản `bpt`). Sản phẩm khác bỏ. Cũng là nguồn ghép bưu tá ↔ mã HRM ↔ đơn vị ↔ loại HĐ (ghi đè `buu_ta`).
- DHL (`sl_dhl`, `bi_loai=0`): nhóm = tuyến chỉ định cho bưu tá (`tuyen_dhl_bt`) nếu có, không thì tuyến trên AWB, không thì tuyến phát nhiều nhất của người đó (kèm cảnh báo). Tiền = `DEN_10KG` + (min(k,100)−10)⁺×`KG_10_100` + (min(k,300)−100)⁺×`KG_100_300` + (k−300)⁺×`KG_TREN_300`, k = ceil(kg). Không áp trần. AWB trùng: giữ dòng cuối, các dòng trước `bi_loai=1` (cảnh báo).
- Điều chỉnh tay (`dieu_chinh`) cộng theo HRM; Trại giam (`ho_tro.loai='TRAI_GIAM'`, `thanh_tien`) cộng khoản `trai_giam` (500.000 đ/ngày công theo sheet TRẠI GIAM).
- Cảnh báo "Thiếu ngày": ngày có PTC < 10% trung bình ngày có dữ liệu.

## 6. HSCL (`hscl.py`)
Dữ liệu: `hscl_f42` (bưu tá × tên BC: `sl_mau` = sản lượng GBT có thông tin phát, `sl_dung` = PTC đúng quy định ≤ 11,5 h). Miễn theo `hscl_mien` của kỳ gần nhất `<= kỳ`; điểm phạt `hscl_diem_phat` (tối đa 30).
- Bưu tá miễn → 1,0. Không thuộc BCVH (trước T09, `TOAN_BO=0`: tên BC không bắt đầu "BCVH") → 1,0. Có F4.2 nhưng `sl_mau=0` → `TOAN_BO=1`: mức **MIN**; `TOAN_BO=0`: 1,0. Còn lại: `hs = clamp(sl_dung/sl_mau / KH × (100−điểm)/100, MIN, MAX)`. Bưu tá không có dòng F4.2 → không có hệ số (tính 1,0).
- Phạm vi áp: `TOAN_BO=1` → `buu_gui`, `bpt`, `ph` (nhân theo hệ số bưu tá), `dhl` và `trai_giam` (nhân theo tỷ lệ `sau_hs/truoc_hs` của người đó, 1 nếu chưa có); `TOAN_BO=0` → chỉ `buu_gui`. `phbc`, `dc`, `bo_sung_ctv` không bao giờ nhân.

## 7. Tổng hợp theo mã HRM
- Mã bưu tá → HRM qua `buu_ta`; thiếu → `?mã` và cảnh báo "HRM". Một HRM nhiều mã bưu tá thì cộng chung.
- `tong_khong_phbc = round(buu_gui)+round(dhl)+round(bpt)+round(ph)+round(dc)+round(trai_giam)` (làm tròn **từng khoản** trước khi cộng).
- Bổ sung CTV: nếu một mã bưu tá thuộc danh sách CTV → `max(0, CTV_DON_GIA × so_ptc − tong_khong_phbc)`.
- `tong = tong_khong_phbc + round(phbc) + round(bo_sung_ctv)`.
- Đơn vị: `phan_bcvh` (chỉ định) → đơn vị trên 8,6,11/nhân sự/tuyến → không khớp một trong 6 BCVH → **BCVH Thuận Hóa**. So khớp tên bỏ dấu khác biệt thủy/thuỷ, hóa/hoá.
- Kết quả: `kq_phat` (mỗi HRM một dòng), `kq_phat_ct` (bưu tá × tuyến × nhóm × khoản: số lượng, tiền), `canh_bao`. Mỗi lần tính xóa kết quả cũ của kỳ.

## 8. Điểm lạ / mâu thuẫn, và quyết định của PO (cập nhật 2026-11-15, INC-PHAT-01)
1. **Giới hạn HSCL.** PMTL thực tế: T08 98–102 %, T09–T10 70–110 %. **Quyết định PO/CTO:** 97 %–102 % áp cho **kỳ đầu tiên QIS tự tính** (T10 — xem mục 3); T08, T09 giữ nguyên số của PMTL (nhập nguyên, khóa kỳ, không tính lại). README của PMTL ghi 98–102 % "từ 08/2026" nhưng `tham_so` đã đổi về 70–110 % từ 2026-09 — chỉ để biết, không ảnh hưởng quyết định trên.
2. **`PTC_SL_AM_TINH_DUONG = 1` từ T09 nhưng vô hiệu** vì `MOT_LAN = 1`; chỉ tác động nếu ai đó tắt `MOT_LAN`.
3. **T10: CHƯA nhập kết quả PMTL.** `kq_phat` T10 của PMTL thiếu DHL/BPT/PHBC, F4.2 là bản sao T09. QIS tự tính T10 (kỳ đầu tiên áp 97–102 %); kiểm tra chéo sau này bằng PMTL chạy cùng đầu vào và cùng 97–102 %.
4. Trước T09 PMTL tính `quantity` có dấu (dòng −1 trừ đi); từ T09 mỗi số hiệu một lần. QIS không được áp quy tắc T09 cho T08.
5. **Lệch 82 dòng mẫu số F4.2 (T09)** giữa `fact_f42` và biểu của PMTL: dung sai **có giải thích** của phép thử (biểu PMTL xuất 05/10, QIS nạp 27/10), không cần xuất lại biểu.

## 9. Điều kiện để coi bộ tính QIS "tái hiện đúng"
- Chạy bằng đúng tham số/bảng giá/danh mục của PMTL từng kỳ (mục 2), không dùng 97–102 %.
- So khớp từng HRM với `kq_phat` fixture cho từng cột (`cp_buu_gui, cp_dhl, cp_bpt, cp_ph, cp_dieu_chinh, cp_phbc, bo_sung_ctv, cp_trai_giam, tong`) và `kq_phat_ct`; mọi chênh lệch phải giải thích được bằng nguồn (ví dụ F4.2 mẫu số lệch 82 — xem Manifest) hoặc thứ tự dòng mục 3.
- T10 chỉ là phép thử phần bưu gửi/PH/CTV (không có DHL/BPT/PHBC trong PMTL).
