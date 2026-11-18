# PROV-PKG-01 Manifest — Gói QIS cho tỉnh khác

## 1. Ticket Information

- Ticket ID: `PROV-PKG-01` (chương trình; các bước `PROV-PKG-01-S1` … `-S6` ở mục 5).
- Tên: `Gói QIS V2 cho tỉnh khác: 4 module (Trang chủ, F1.1, F1.2, F1.3, F4.1), đổi mã tỉnh là chạy, dữ liệu toàn quốc đóng sẵn`
- Người viết: CTO (Claude Code / Opus 5.5), 2026-11-18, theo yêu cầu PO.
- Status: `ACTIVE — S1 (khảo sát chỉ đọc) được giao`. Chạy song song, **không** thay Current Ticket của phiên F13.
- PO UI Check Required: `Yes` ở S6 (cài sạch). S1–S5: `No`.
- Validation: S1 `LEVEL 1` (chỉ đọc); S3–S5 `LEVEL 2` (đụng mã đang chạy cho Huế: phải chứng minh Huế không đổi).

## 2. Yêu cầu của PO (đã chốt)

1. Chỉ giữ: Trang chủ và kết quả chất lượng **F1.1, F1.2, F1.3, F4.1**. Bỏ: RCA/“Tại sao”, bản đồ mạng lưới, hàng lô, hàng tồn, báo cáo tuần, slide, F4.2/Thu nhập, nhật ký vận hành, danh mục bưu tá và mọi phần riêng của Huế.
2. Tỉnh cài xong chỉ đổi **mã tỉnh** và **tài khoản DKCL** là tải được chi tiết 4F của tỉnh mình. Tài khoản DKCL mọi tỉnh có cùng quyền (PO xác nhận) — không thử cổng DKCL với tỉnh khác.
3. Dữ liệu toàn quốc kế thừa từ Huế, đóng gói sẵn; tỉnh mới không phải tải lại lịch sử toàn quốc.

## 3. Quyết định của CTO (kỹ thuật)

**D1 — Một bộ mã chung + cấu hình tỉnh + script xuất gói (không copy một lần).**
Bản copy một lần rẻ lúc đầu nhưng mỗi lỗi DKCL/import (loại AUTO-IMPORT-0xx, xảy ra hằng tháng) phải sửa hai nơi và hai bản sẽ trôi xa nhau. Do đó:
- Mã tỉnh, tên tỉnh, nhãn hiển thị lấy từ **một chỗ** (`system_config.default_province_code` đã có, giá trị `53`) qua một module cấu hình duy nhất; mọi chỗ gắn cứng `53`/`HUE`/“Huế” đọc từ đó. Mặc định vẫn là `53`/Huế → bản Huế **không đổi hành vi**.
- Thêm cờ phiên bản `QIS_EDITION = full | province` (mặc định `full`). `province` tắt route backend, scheduler/job và menu/route frontend của các module ngoài phạm vi mục 2.1.
- Tên định danh trong mã (`dkclHue*`, `F41_HUE_*`, khóa lane `HUE`) **giữ nguyên** nếu chỉ là tên nội bộ: lane `HUE` hiểu là “lane tỉnh”. Chỉ đổi giá trị chạy (mã tỉnh, chuỗi hiển thị), không đổi tên hàng loạt — giảm rủi ro cho Huế.
- `scripts/package-province` xuất một thư mục/zip: mã nguồn (bỏ module ngoài phạm vi nếu tách được sạch, nếu không thì giữ và tắt bằng cờ), `.env` mẫu, CSDL hạt giống (D3), trình cài (D5).

**D2 — Phân loại dữ liệu (khảo sát S1 kiểm chứng; dưới đây là phân loại ban đầu từ danh sách bảng, 2026-11-18).**

| Nhóm | Bảng (ban đầu) | Vào gói? |
|---|---|---|
| Toàn quốc | `fact_f11_national`, `fact_f12_national`, `fact_f13_national`, `fact_f41_national`, `dim_buu_cuc_toan_quoc` | **Có** |
| Cấu hình chung | `sys_kpi_thresholds`, `auto_backfill_holiday_calendar` (+event), `system_config` (đặt lại mã tỉnh) | Có, sau khi rà |
| Chi tiết Huế (bưu gửi) | `fact_f11`, `fact_f12`, `fact_f13`, `fact_f41`, `fact_f42`, `fact_bf_phat`, `f13_cause_*`, `hangton_*` | **Không** — chỉ schema rỗng |
| Tổng hợp Huế | `agg_*`, `agg_day_sig`, `agg_state` | Không — tỉnh tự tính lại; S1 xác nhận `agg_*` có chứa phần toàn quốc hay không |
| Nhân sự/mạng lưới Huế | `dm_buu_ta*`, `network_*` | Không |
| Tài khoản & nhật ký | `qis_user*`, `qis_session`, `qis_auth_event`, `ops_journal_*`, `import_log`, `auto_backfill_*` (trừ lịch nghỉ) | Không |

Ngoài DB, **cấm vào gói**: `User QIS.xlsx`, `.env`, hồ sơ trình duyệt/cookie DKCL, `Data DKCL/`, `DataFKCL/`, `uploads/`, `storage/`, `src/db/backups/`, log, `RCA F1.3/`, `.claude/`, `graphify-out/`, file Excel/Word báo cáo. Gói phải qua một bước quét tự động (tên bảng, số dòng, tìm chuỗi `53`-chi tiết, họ tên bưu tá, mật khẩu) trước khi phát hành.

**D3 — CSDL hạt giống tạo mới, không cắt từ DB 5 GB.** Script tạo DB trống bằng migration hiện có, rồi sao **chỉ** các bảng “Có” ở D2 từ DB Huế (đọc-only). Không xóa dòng trong bản sao DB Huế (dễ sót, file vẫn chứa trang cũ).

**D4 — Danh mục và cập nhật hằng ngày sau khi cài.**
- Danh mục bưu cục của tỉnh lấy từ `dim_buu_cuc_toan_quoc` lọc `ma_tinh`. Danh mục **BCVH** (nhóm bưu cục → BCVH) của Huế hiện có thể gắn cứng; S1 tìm nguồn, S2 thiết kế: ưu tiên tự suy từ dữ liệu DKCL chi tiết của tỉnh (cột BC phát/BCVH trong file chi tiết), có màn/Excel để tỉnh sửa tay.
- Dữ liệu toàn quốc hằng ngày: **mỗi bản cài tự chạy lane TCT** như Huế đang làm (cùng quyền tài khoản). Gói chỉ thay phần lịch sử; không cần máy chủ trung tâm, không phụ thuộc máy Huế.
- Chi tiết tỉnh: lane tỉnh (lane `HUE` hiện tại) chạy với mã tỉnh mới; lịch sử ban đầu theo câu hỏi PO Q2.

**D5 — Cài đặt.** Một lệnh/tệp `install.cmd` (PowerShell bên dưới): kiểm Node đúng phiên bản, `npm ci` hoặc `node_modules` đóng sẵn, chép DB hạt giống, hỏi mã tỉnh + tài khoản DKCL ghi vào `.env`/`system_config`, tạo **quản trị viên đầu tiên** (dùng lại `--admin-only` của RBAC, mật khẩu do tỉnh tự đặt lúc cài), đăng ký supervisor/khởi động. Tài liệu cài 1 trang bằng tiếng Việt không kỹ thuật.

**D6 — Không đổi SSOT/kiến trúc đóng băng.** Công thức 4F, ngưỡng, quy tắc nghiệp vụ giữ nguyên. Nếu S1 thấy quy tắc nào là riêng Huế (ví dụ quy tắc ngày N-1, giờ chốt, BCVH ngoại lệ), ghi thành câu hỏi PO, không tự quyết.

## 4. Câu hỏi PO — ĐÃ CHỐT 2026-11-18: PO đồng ý cả bốn mặc định của CTO (giá trị trong ngoặc là quyết định)

- **Q1.** Máy cài ở tỉnh: máy Windows có Internet vào DKCL, dùng trong mạng LAN như Huế? (Mặc định: có; HTTPS LAN tự ký như Huế là tùy chọn.)
- **Q2.** Chi tiết của tỉnh mới: bắt đầu từ ngày cài, hay tự tải bù từ đầu năm 2026 / N tháng? (Mặc định: tải bù tháng hiện tại và tháng trước; lâu hơn thì tỉnh tự bấm.)
- **Q3.** Trang chủ của tỉnh có giữ các khối so sánh toàn quốc (xếp hạng tỉnh) như Huế không? (Mặc định: giữ.)
- **Q4.** Ai phát hành gói và cập nhật bản mới cho tỉnh (PO gửi zip, hay đặt trên GitHub riêng)? (Mặc định: PO gửi zip; bản sau cài đè giữ DB.)

## 5. Các bước, executor và model

| Bước | Nội dung | Executor / model | Đầu ra | Cổng |
|---|---|---|---|---|
| S1 | Khảo sát chỉ đọc: (a) mọi điểm gắn cứng `53`/`HUE`/“Huế”/`Thừa Thiên` ở backend, frontend, script, scheduler — phân loại *giá trị chạy* / *chuỗi hiển thị* / *tên nội bộ*; (b) đồ thị phụ thuộc module: route, service, job, menu cho từng module ngoài phạm vi, chỗ Trang chủ/4F gọi sang module bị bỏ; (c) kiểm chứng bảng D2 (cột mã tỉnh, nguồn ghi, `agg_*`); (d) nguồn danh mục BCVH của Huế; (e) dữ liệu nhạy cảm và file cấm; (f) parser Excel theo vị trí cột: có phụ thuộc tỉnh không | Claude Code / **Sonnet** (một phiên; gồm cả frontend để có một báo cáo) | `docs/06_REVIEWS/Province/PROV-PKG-01_SURVEY_001.md` + bảng CSV điểm gắn cứng | CTO đọc |
| S2 | Thiết kế (Design of Record): module cấu hình tỉnh, cờ `QIS_EDITION`, danh mục BCVH, script xuất gói, trình cài, danh sách test hồi quy Huế | Claude Code / **Opus** | `docs/04_TECHNICAL_PLANNING/Feature/PROV-PKG-01_DESIGN_OF_RECORD.md` | PO duyệt DoR (Q1–Q4 đã chốt) |
| S3 | Cấu hình tỉnh: thay giá trị gắn cứng bằng module cấu hình, mặc định 53 | Claude Code / Sonnet; review độc lập **Opus** (rủi ro Huế) | commit + test: chạy toàn bộ test hiện có, kết quả Huế 4F một ngày mẫu trước/sau giống từng số | Opus review PASS |
| S4 | Cắt module bằng `QIS_EDITION=province`: backend/scheduler (Claude Code / Sonnet), menu/route/chữ “Huế” trên giao diện (Antigravity, không mở browser) | Claude Code + Antigravity | commit; `full` không đổi | CTO |
| S5 | Script xuất gói + DB hạt giống + quét nhạy cảm + `install.cmd` | Claude Code / Sonnet; Opus review riêng bước quét nhạy cảm | gói zip + báo cáo quét | Opus review PASS |
| S6 | Cài sạch trên thư mục/máy sạch với một mã tỉnh khác 53 (bằng chứng PID/log Windows) | Antigravity | bằng chứng cài | PO UI check |

Quy tắc: không cùng model vừa làm vừa tự duyệt S3, S5. Không tạo thư mục clone/worktree anh em: mọi bước làm trong workspace này; gói xuất ra thư mục `dist-province/` (thêm vào `.gitignore`).

## 6. Tiêu chí nghiệm thu PO (S6)

1. Trên máy sạch, chạy `install.cmd`, nhập mã tỉnh (ví dụ `46`) và tài khoản DKCL → mở được QIS, đăng nhập bằng quản trị viên vừa tạo.
2. Menu chỉ có Trang chủ, F1.1, F1.2, F1.3, F4.1 (và Quản trị/Nhập dữ liệu cần thiết); không còn chữ “Huế”.
3. Xếp hạng/so sánh toàn quốc hiện đủ lịch sử ngay sau khi cài, không phải tải.
4. Bấm tải dữ liệu một ngày → có chi tiết 4F của tỉnh đó, danh sách bưu cục/BCVH của tỉnh đó.
5. Gói không chứa dữ liệu bưu gửi, tên bưu tá, tài khoản hay file cấm của Huế (báo cáo quét kèm theo).
6. QIS Huế sau S3–S5 vẫn chạy như cũ (CTO xác nhận bằng test; PO chỉ xem nhanh Trang chủ Huế).

## 7. Required Reading

- S1: chỉ manifest này. S2 trở đi: manifest này + `PROV-PKG-01_SURVEY_001.md`; nếu có khối báo cáo thay đổi: `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`; bước đụng import: `docs/05_DEVELOPMENT/Implementation/dkcl_import_system_training.md`.

## 8. Lịch sử

- 2026-11-18: CTO mở ticket, ghi D1–D6, Q1–Q4, giao S1 cho Claude Code / Sonnet.
- 2026-11-18: PO chốt Q1–Q4 theo đề xuất CTO: máy Windows có Internet, dùng trong LAN (HTTPS tự ký tùy chọn); tải bù chi tiết tháng hiện tại và tháng trước; Trang chủ giữ khối xếp hạng toàn quốc; PO gửi zip, bản sau cài đè giữ DB. Cổng PO của S2 chỉ còn duyệt Design of Record.
- 2026-11-18: S1 khảo sát chỉ đọc xong, READY FOR CTO REVIEW: `docs/06_REVIEWS/Province/PROV-PKG-01_SURVEY_001.md` + CSV điểm gắn cứng; mâu thuẫn D2 M1–M4 và câu hỏi PO Q1–Q7 trong báo cáo.
