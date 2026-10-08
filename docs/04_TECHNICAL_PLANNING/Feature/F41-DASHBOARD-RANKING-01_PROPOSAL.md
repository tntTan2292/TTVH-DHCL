# F41-DASHBOARD-RANKING-01 — Phương án trình Product Owner phê duyệt

**Trạng thái:** CHỜ PO PHÊ DUYỆT (soạn 2026-10-08, Claude Code / Sonnet 5.5). Chưa có dòng code nào được sửa.
**Liên quan:** tiếp tục `F41-DASHBOARD-MINIMUM-01` (đang `PAUSED BY PO PRIORITY`). Khi PO phê duyệt văn bản này, đó là quyết định kích hoạt lại Phase F1 của ticket đó.

## 1. Mục tiêu

Xây module F4.1 (Chất lượng phát thành công của bưu cục) gồm hai màn hình giống F1.3, dùng cùng cách đọc và cùng kiểu biểu đồ:

- **Operation Dashboard F4.1:** bảng tổng hợp ngày (6 BCVH, điều hành ngày + lũy kế tháng, vị thứ toàn quốc, so cùng kỳ), các biểu đồ ngày.
- **BCVH Ranking F4.1:** bảng xếp hạng một ngày, bảng tổng hợp tuần (so sánh hai tuần bất kỳ, chuyển sang so sánh tháng), biểu đồ tuần, biểu đồ tháng, heatmap thu gọn.

**Không làm trong đợt này:** Tuyến Ranking và mọi khối theo tuyến (F4.1 không có dữ liệu tuyến), Action Center / Rule Recommendation, tab "Quy luật vận hành", Evidence, Pareto, Message, Import. Không đổi KPI, SSOT, schema hay mã nguồn Import.

## 2. Các quyết định PO đã chốt (không suy diễn thêm)

| # | Quyết định |
|---|---|
| 1 | Chỉ tiêu: `Đánh giá (thời gian Có TMS PTC 8 giờ)`. Tỷ lệ = số Đạt / **tổng số dòng** (kể cả dòng đánh giá trống). Ví dụ chốt: 01/08/2026 = 2.863 / 4.695 = **60,98%**. |
| 2 | Mã 531120 (và 531110, 531600) vẫn nằm trong KPI tổng nhưng không hiện trong Ranking. Vì vậy tổng 6 BCVH (2.862 / 4.694 = **60,97%**) khác KPI tổng; hai số này phải có nhãn riêng. |
| 3 | Màu giống F1.3 nhưng ngưỡng tăng thêm 10 điểm: **xanh ≥ 80%, hồng 70–80%, vàng 60–70%, đỏ < 60%** (F1.3: 70/60/50). |
| 4 | Vị thứ toàn quốc: xếp Huế trong 34 đơn vị theo tỷ lệ "PTC 8 giờ Có TMS" của báo cáo toàn quốc (`sl_ptc_8h_co_tms / sl_ptc_nop_tien_ch`), hiển thị là giá trị báo cáo toàn quốc. Có thể lệch ~0,14 điểm so với bảng BCVH (ví dụ 61,12% so với 60,98%). |
| 5 | Phạm vi: bảng và biểu đồ ngày / tuần / tháng + heatmap thu gọn. |
| 6 | Tuần chạy **Thứ Năm → Thứ Tư**, đánh số ISO 8601 theo ngày Thứ Năm của tuần (giống F1.3, ví dụ Tuần 36 = 03/09–09/09/2026). |
| 7 | Quyền xem: admin và viewer. |
| 8 | Dữ liệu 07/09–07/10 còn thiếu: **PO tự import**, đồng thời với quá trình lập trình (xem mục 6). |
| 9 | Đường "Mục tiêu 90%" trên biểu đồ: giữ 90% như F1.3, vì PO chưa nêu mức khác. Cần PO xác nhận lúc phê duyệt. |

## 3. Hai phương án

**Phương án A — Dùng chung, tham số hóa (đề xuất).**
- Backend: viết `FactF41Repository` có cùng hình dạng trả về với F1.3 và nạp vào các service tổng hợp ngày/tuần/tháng của F1.3 (hai service này nhận repository từ bên ngoài). Mở nhóm API `/api/f41/*` song song `/api/f13/*`. Không sửa code F1.3.
- Frontend: thêm một "cấu hình chỉ tiêu" (đường dẫn API, nhãn, ngưỡng màu, mục tiêu) và truyền vào các khối đang dùng chung. Mặc định là F1.3, nên F1.3 chạy y như cũ.
- Ưu: F4.1 và F1.3 luôn cùng cách hiển thị, sửa một chỗ hưởng cả hai, khối lượng code mới nhỏ (ước tính vài trăm dòng logic mới, thay vì hơn 3.000 dòng).
- Nhược: phải chạm vào code frontend F1.3 đã nghiệm thu. Kiểm soát: mặc định giữ nguyên hành vi, chạy lại toàn bộ test F1.3 (không được thêm lỗi nào), có review độc lập bởi model khác (Opus).

**Phương án B — Sao chép riêng cho F4.1.**
- Ưu: không đụng F1.3.
- Nhược: nhân đôi hơn 3.000 dòng, hai module sẽ dần lệch nhau, mọi chỉnh sửa sau này phải làm hai lần.

**Đề xuất: Phương án A.**

## 4. Phân công

Vai trò theo DEC-020/DEC-021: Claude Code (Sonnet) làm backend, dữ liệu, test, tài liệu, Git; Antigravity làm giao diện, responsive và bằng chứng chạy thực trên Windows; Claude Code (Opus) review độc lập khi rủi ro cao; PO nghiệm thu giao diện. Codex không dùng.

| Mã | Việc | Người thực hiện | Kiểm tra bởi | Kết quả bàn giao |
|---|---|---|---|---|
| T0 | Ghi nhận kích hoạt, viết Design of Record (bảng đối chiếu từng khối F1.3 → F4.1, hợp đồng response), cập nhật Snapshot / Progress / Document Index, xử lý `ITR2-F41-NB-01` (lỗi "báo không có dữ liệu ngoài phạm vi khi không biết") | Claude Code (Sonnet) | PO duyệt tài liệu | Manifest + DoR |
| T1 | Backend nền: repository F4.1, API `overview`, `daily-trend`, `ranking/bcvh`, vị thứ toàn quốc F4.1 | Claude Code (Sonnet) | Test tự động + đối soát số liệu thật (chỉ đọc) | API chạy, khớp 60,98% / 60,97% |
| T2 | Backend tuần/tháng: `weeks`, `weekly-comparison`, `weekly-trend`, `months`, `monthly-comparison`, vị thứ toàn quốc theo tuần/tháng | Claude Code (Sonnet) | Test tự động + đối soát | API chạy, TỔNG CỘNG tuần = cộng sản lượng 6 BCVH (không lấy trung bình tỷ lệ) |
| T3 | Frontend nền: cấu hình chỉ tiêu (đường dẫn, nhãn, ngưỡng 80/70/60, mục tiêu) cho fetcher, mapper, màu | Claude Code (Sonnet) | **Claude Code (Opus)** review độc lập; toàn bộ test F1.3 phải xanh như trước | F1.3 không đổi hành vi |
| T4 | Trang `/f41/dashboard`: KPI, bảng tổng hợp ngày, biểu đồ ngày, bố cục, responsive | Antigravity | PO UI check (cổng G2) | Trang chạy thực |
| T5 | Trang `/f41/ranking/bcvh`: bảng ngày, bảng + biểu đồ tuần, bảng + biểu đồ tháng, heatmap | Antigravity | PO UI check (cổng G3) | Trang chạy thực |
| T6 | Menu nhóm F4.1 (Operation Dashboard, BCVH Ranking), chuyển hướng `/f41`, quyền admin + viewer, cập nhật test điều hướng | Claude Code (Sonnet) | Test điều hướng | Menu hoạt động |
| T7 | Import dữ liệu 07/09–07/10 | **PO tự thực hiện** | Claude Code đối chiếu số dòng sau khi PO báo xong | Dữ liệu đầy đủ |
| T8 | Review độc lập T1–T3, kiểm tra không ảnh hưởng F1.3 | Claude Code (Opus) | — | Báo cáo review |

**Ranh giới file** (hai Developer dùng chung một thư mục làm việc, nên tách vùng sửa): Claude Code sửa backend, test, các file dữ liệu / fetcher / cấu hình frontend, tài liệu; Antigravity chỉ sửa các file trang và giao diện (T4, T5) và chỉ bắt đầu sau khi T3 xong. Không ai sửa file của người kia khi chưa báo.

## 5. Lộ trình và các cổng PO

1. **G0:** PO phê duyệt văn bản này.
2. T0 → T1 và T3 chạy song song → T2 → T8 (review) → T4 → T5 → T6.
3. **G1** (sau T2): báo cáo đối soát số liệu backend cho PO biết, không cần xem giao diện.
4. **G2:** PO check Operation Dashboard F4.1. **G3:** PO check BCVH Ranking F4.1. Cần dữ liệu đã import đủ.
5. Đóng ticket sau khi PO xác nhận PASS. Claude Code và Antigravity không tự cấp PASS.

Nguyên tắc chung: mỗi ticket một commit, commit chỉ theo danh sách file của ticket, chỉ commit sau khi đồng bộ tài liệu.

## 6. Phối hợp với việc import của PO

Các thay đổi backend của kế hoạch này chỉ **thêm API đọc**; không đổi schema, không sửa mã Import, không ghi vào dữ liệu. Claude Code chỉ **đọc** CSDL để đối soát. Hai thời điểm sẽ báo PO trước để PO tạm dừng import:

- **Cần khởi động lại backend** để API mới có hiệu lực (khi cần kiểm tra thực tế sau T1, T2). Khởi động lại sẽ làm gián đoạn tiến trình import / backfill đang chạy.
- **Chạy bộ test toàn backend** hoặc script đối soát đọc nặng trên CSDL thật: sẽ báo trước nếu có thể ảnh hưởng tốc độ import.

Claude Code sẽ thông báo ngay trước mỗi thời điểm này và chờ PO xác nhận.

## 7. Rủi ro và kiểm soát

| Rủi ro | Kiểm soát |
|---|---|
| Sửa frontend dùng chung làm hỏng F1.3 | Mặc định giữ F1.3; chạy lại toàn bộ test F1.3; review độc lập (T8) |
| Hai số 60,98% và 60,97% bị hiểu là sai | Nhãn riêng cho "tổng toàn tỉnh" và "tổng 6 BCVH"; test khẳng định cả hai |
| Số vị thứ toàn quốc lệch bảng BCVH | Gắn nhãn "theo báo cáo toàn quốc" (quyết định #4) |
| Dữ liệu chưa đủ khi PO nghiệm thu | Chỉ mời PO check giao diện sau khi PO báo import xong |
| Hai Developer sửa cùng file | Ranh giới file ở mục 4; Antigravity bắt đầu sau T3 |
| Lỗi tồn đọng của F1.3 (`DashboardController.recovery`, `timelineService.recovery`) làm lẫn kết quả test | Ghi tên và so sánh với danh sách lỗi sẵn có, không tính vào F4.1 |

## 8. Đề nghị PO phê duyệt

1. Chọn Phương án A (đề xuất) hoặc B.
2. Phê duyệt phạm vi, các quyết định ở mục 2 (đặc biệt #9: giữ 90%) và phân công ở mục 4.
3. Xác nhận cách phối hợp import ở mục 6.
4. Kích hoạt lại `F41-DASHBOARD-MINIMUM-01` Phase F1 theo kế hoạch này.
