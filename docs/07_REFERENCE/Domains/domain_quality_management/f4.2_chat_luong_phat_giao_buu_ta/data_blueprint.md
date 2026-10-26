---
title: Data Blueprint
purpose: Bảng dữ liệu, cột nguồn và luồng import F4.2
owner: Architect
ssot: True
dependencies: measurement.md
version: 1.0.0
---

# Data Blueprint — F4.2

## 1. Luồng

| Lane | Nguồn | Parser | Bảng | Khóa |
| --- | --- | --- | --- | --- |
| HUE | CSV (hoặc Excel) chi tiết, 32 cột, 1 dòng/lần giao bưu tá | `f42HueParser.js` | `fact_f42` | (ngay_do_kiem, ma_bg, ma_buu_ta, thoi_gian_gbt) |
| TCT | Excel toàn quốc theo bưu tá (13.665 dòng, 26 cột) | `f42TctParser.js` | `fact_f42_national` | (ngay_do_kiem, ma_tinh_phat) |

Tên file thủ công: `F4.2-YYYY.MM.DD.csv` (HUE) hoặc `.xlsx` (HUE/TCT) trong `Data DKCL/F4.2/Incoming/{HUE,TCT}`; ngày trong tên phải khớp ngày GBT của dữ liệu. Registry `F4.2`: `PLANNED`, hai lane `MANUAL_ONLY` (chờ adapter cổng, F42-PHASE-3). Bảng và parser: `backend/migrate_f42_schema.js`, hook khởi động trong `server.js`, bản sao trong `schema.sql`.

## 2. HUE — quy tắc đọc

- Đọc theo **tên cột** (NFC, gộp khoảng trắng, bỏ khoảng trắng đầu/cuối); 12 cột bắt buộc, 20 cột tùy chọn; cột thừa được báo, không bỏ im lặng; cột trùng thì từ chối.
- Tên tự do không đặt trong ngoặc kép nên dấu phẩy trong `Tên KHL` làm dòng rộng hơn tiêu đề (114/6.466 dòng ngày 10/10): ghép lại bằng cách neo cột `Thời gian GBT`, kiểm `Mã tuyến phát` là số; dòng không sửa được thì từ chối file.
- `Đánh giá` chỉ nhận `Đạt` / `Không đạt` / trống (trống lưu NULL); thời gian dạng `yyyy-MM-dd HH:mm:ss` (bỏ phần lẻ giây); `Thời gian thực hiện` dạng `H:M` có thể âm, lưu nguyên.
- Mọi dòng phải có `Thời gian GBT`, `Mã bưu tá`, `Mã BC phát`; ít nhất một nửa dòng phải thuộc ngày trong tên file.
- Cột luôn trống ở file Huế: Địa bàn phát, Mã HRM, Số hiệu lô.

## 3. TCT — quy tắc đọc

- Hai dòng tiêu đề gộp + một dòng đánh số cột + dòng **tổng** (không tỉnh, không bưu tá) + từng bưu tá. Kiểm bố cục bằng cụm chữ ở các cột neo.
- **Tổng công bố phải bằng tổng các dòng** (13 cột đếm), nếu không thì từ chối file.
- Cộng bưu tá theo tỉnh phát, **chỉ lưu 34 tỉnh/TP** (`NATIONAL_RANKED_PROVINCE_CODES`); EMS, trung tâm, "Không xác định"... không lưu. Đủ 34 mã mới hợp lệ.
- Cột lưu: `sl_gbt` (14), `sl_phat_thanh_cong` (15), `sl_dung_qd` (17), `sl_qua_qd`, `sl_pktc`, `sl_chuyen_hoan`, `sl_cho_chuyen_hoan`, `sl_cho_vtn`, `sl_chuyen_tiep`, `sl_phat_hoan`, `sl_loai_tru`, `sl_gbt_chua_loai_tru`, `sl_gbt_chua_thong_tin`, `so_buu_ta` (bưu tá có sản lượng), `tl_dung_qd` (văn bản, tính lại).
- File toàn quốc không có loại tuyến: phần theo tuyến chỉ lấy từ file chi tiết.

## 4. Xếp hạng toàn quốc

`F42NationalRankService` (dùng lại `F11NationalRankService` với nguồn `fact_f42_national`): tỷ lệ giảm dần, rồi sản lượng giảm dần, không đồng hạng.
