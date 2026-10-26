---
title: Testing Scenarios
purpose: Kịch bản kiểm thử bắt buộc cho F4.2
owner: Architect
ssot: True
dependencies: measurement.md
version: 1.0.0
---

# Testing Scenarios — F4.2

| ID | Kịch bản | Kết quả bắt buộc |
| --- | --- | --- |
| TS-1 | File thật 10/10/2026 (HUE) | 6.466 dòng; 4.475 Đạt; 757 Không đạt; 1.234 trống; 128 bưu tá; 114 dòng được ghép lại. |
| TS-2 | File thật toàn quốc 10/10/2026 | Tổng 516.597 / 393.197 khớp; 34 tỉnh; Huế 6.466 / 4.475 / 128 bưu tá. |
| TS-3 | Chi tiết = toàn quốc dòng 53 | GBT, phát thành công, Đạt, Không đạt, số bưu tá bằng nhau. |
| TS-4 | Hạng toàn quốc 10/10 | Huế 26 / 34 ở 69,2 %. |
| TS-5 | Dấu phẩy trong tên khách hàng | Ghép đúng, `Mã tuyến phát` và `Thời gian GBT` không lệch cột; dòng không sửa được từ chối file. |
| TS-6 | Sai ngày tên file / cột thiếu / đánh giá lạ / dòng lặp | Từ chối, vào thư mục Error, ghi log FAILED, không ghi dòng nào. |
| TS-7 | Một bưu gửi giao hai bưu tá | Hai dòng; lặp đúng (bưu gửi, bưu tá, giờ GBT) thì từ chối. |
| TS-8 | Tổng công bố ≠ tổng các dòng; thiếu một mã tỉnh | Từ chối file toàn quốc. |
| TS-9 | Nạp lại cùng ngày | Hỏi xác nhận; có `force` thì thay cả ngày (dòng trống chuyển thành Đạt). |
| TS-10 | Bảng khác | F1.1, F1.2, F1.3, F4.1 không đổi số dòng sau khi nạp F4.2. |

Tự động hóa: `f42HueParser.test.js`, `f42TctParser.test.js`, `F42NationalRankService.test.js`, `migrate_f42_schema.test.js`, `test_f42ImportPipeline.js` (chạy riêng từng file với `--experimental-sqlite`).
