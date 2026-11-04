# HOME-WARMUP-01 — Tính sẵn trang chủ, không bắt người dùng chờ

Trạng thái: IMPLEMENTED / TECH PASS / READY FOR PO CHECK (2026-11-04). Người làm: Claude Code (backend). Chưa có Opus review. Không đổi Current Ticket. Tiếp nối HOME-ATTENTION-01 (phần đánh dấu BCVH làm lần đầu tải chậm hơn).

## 1. Quyết định của PO (2026-11-04)

- Giữ kết quả đã tính khi dữ liệu không đổi, không tính lại mỗi lần vào.
- Tự tính sẵn ngầm khi có dữ liệu mới (không cần ai mở trang) và sau khi khởi động backend.
- Tính sẵn: Ngày / Tuần / Tháng của kỳ mới nhất, 7 ngày gần nhất, tuần và tháng liền trước; bảng 34 tỉnh của F1.1 cho mọi kỳ trên và của cả 5 chỉ tiêu cho kỳ mới nhất.

## 2. Kỹ thuật (không đổi API, công thức KPI, cơ sở dữ liệu)

- `HomeExecutiveService`: `getExecutive` / `getNationalRanking` giữ kết quả theo (tham số, dấu vân tay dữ liệu) khi được cấp `versionProvider`; yêu cầu đến lúc đang tính chung một kết quả; lỗi không được giữ; tối đa 300 mục, tuổi tối đa 6 giờ; đổi cầu chì agg thì xóa. Dấu vân tay là `responseCache.getFingerprint` (cùng cái bộ nhớ đệm HTTP dùng: mọi lần nạp/backfill làm nó đổi ngay).
- `HomeWarmup` (mới): kiểm tra mỗi phút; tính sẵn khi dấu vân tay đã đổi và đứng yên qua hai lần kiểm (không tranh việc với đợt nạp đang chạy), và một lần 30 giây sau khi khởi động. Chỉ đọc, lỗi từng bước chỉ bị bỏ qua. `server.js` khởi động/dừng; tắt bằng `HOME_WARMUP=off`; không chạy khi test.

## 3. Kiểm tra

- Backend: `HomeWarmup` 5/5, `HomeExecutiveService` 34/34 (có ca giữ khi cùng phiên bản, tính lại khi đổi, dùng chung khi đang tính, lỗi không được giữ, không có `versionProvider` thì như cũ), `HomeUnitAttention` 9/9, `responseCache` và khởi động `server` 54/54.
- Bản sao dữ liệu thật (không chạm DB đang chạy): tính sẵn toàn bộ 34 màn hình mất ~47 giây chạy ngầm; sau đó vào Ngày / Tuần / Tháng và bảng 34 tỉnh đều ~0 ms (trước: ~4 / 5 / 9 giây khi chưa có cache). Kỳ cũ chưa tính sẵn (ví dụ 20 ngày trước) vẫn ~3,4 giây lần đầu rồi được giữ.

## 4. Còn lại

- Cần khởi động lại backend. Bộ nhớ nằm trong chương trình nên mất khi khởi động lại; tính sẵn lại sau khoảng 30 giây + ~50 giây. Muốn giữ qua khởi động lại phải tạo bảng lưu (thay đổi cơ sở dữ liệu, chưa làm).
- Trong lúc backfill chạy liên tục, dấu vân tay đổi liên tục nên chưa tính sẵn cho tới khi nó đứng yên.
