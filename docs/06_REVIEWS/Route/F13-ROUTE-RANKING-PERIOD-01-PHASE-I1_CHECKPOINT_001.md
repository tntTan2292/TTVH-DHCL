# F13-ROUTE-RANKING-PERIOD-01 — Phase I1 Integration Validation — Checkpoint 001

| Trường | Giá trị |
| --- | --- |
| Ticket | `F13-ROUTE-RANKING-PERIOD-01` |
| Phase | `I1` (Integration, executor `Claude Code` / `Sonnet`) |
| Branch | `codex/da-impl-006` |
| Baseline | `8d39a5f97ef7eb60dcb2963e6b2b768ee62a8dc5` (local = remote, xác minh trước khi bắt đầu) |
| Cơ sở | Design of Record Revision R1 §9.3, §10-12; Manifest Sections 46-48 |
| Trạng thái | `PHASE I1 VALIDATION COMPLETE — INTEGRATION DEFECTS FOUND / BLOCKED — NOT READY FOR PO CHECK` |
| Quyết định AC-05 | **Không tự phê duyệt.** Xem §5. |

## 1. Mục tiêu và giới hạn

Phase I1 theo §9.3 Design of Record: "Nối hai phase, chứng minh trên dữ liệu thật: đẳng thức §5.2 đúng cho cả 9 BCVH; C-02 đúng; đo hiệu năng thực tế; sweep hồi quy đầy đủ." Không triển khai thêm tính năng. Không sửa Evidence, schema, database, business rule.

Giữa Phase B1 (commit `bfa1d515`) và baseline này (`8d39a5f9`), **Phase F1 (frontend, thực hiện ngoài phiên này)** đã landed — 1 commit, 5 file: `F13DashboardClient.js`, `RoutePerformancePage.jsx`, `routePeriodData.js` (mới), `RoutePerformancePage.dateResolution.test.js`, và một checkpoint riêng (`F13-ROUTE-RANKING-PERIOD-01-PHASE-F1_CHECKPOINT_001.md`, tự ghi `COMPLETED / AWAITING PO CHECK`, không đăng ký Manifest/DOCUMENT_INDEX/PROJECT_SNAPSHOT).

Phase I1 kiểm tra tích hợp **thật** giữa hai phase này — không phải đọc code suy diễn, mà chạy backend + frontend thật, đăng nhập thật, quan sát dữ liệu thật, đối chiếu với Design of Record §6.3/§7. Kết quả: **tích hợp bị lỗi ở nhiều điểm cụ thể, có thể tái hiện, đã xác minh bằng 3 nguồn độc lập** (trình duyệt thật, API thật, bộ test tự động) — không phải suy đoán.

## 2. Phương pháp xác minh

1. Backend `node server.js` (cổng 5050) + frontend dev server có sẵn (cổng 5178) — cả hai chạy dữ liệu thật (`backend/src/db/database.sqlite`), không mock.
2. Đăng nhập thật (`admin`/`admin123`, tài khoản fixture đã dùng ở các integration test trước).
3. `curl` trực tiếp `GET /f13/ranking/route/periods` để chốt hình dạng payload thật (§3).
4. Trình duyệt thật (Chromium qua MCP Browser) — điều hướng, click, đổi tham số URL, chụp màn hình, đọc `network`/`console`, resize mobile/desktop.
5. Đối chiếu từng trường dữ liệu trình duyệt hiển thị với JSON API thật và với mã nguồn `RoutePerformancePage.jsx`/`routePeriodData.js`/`routeRankingCalculations.js`.
6. Chạy bộ test tự động (backend + frontend), đối chiếu với baseline tại `bfa1d515` bằng `git worktree` (không đụng working tree chính) để phân biệt lỗi mới với lỗi có sẵn.
7. Dừng server, dọn dẹp worktree, xác nhận `git status` sạch trước khi ghi báo cáo.

Không ghi dữ liệu: mọi thao tác trình duyệt là GET; mọi truy vấn kiểm chứng dùng repository/service thật của Phase B1 (không sửa).

## 3. Xác nhận đối soát bốn nhóm (AC-05) — ĐÚNG ở tầng backend

Gọi `GET /f13/ranking/route/periods?bcvh=533140&anchor_date=2026-08-27` qua server thật:

```json
{
  "anchor_date": "2026-08-27",
  "bcvh": { "ma_bcvh": "533140", "ten_bcvh": "BCVH Thuận Hóa" },
  ...
  "reconciliation": { "day": {...}, "month": {...} }
}
```

Xác nhận lại (không đổi từ Phase B1, vì backend không bị Phase F1 chạm tới):

- `reconciliation` chỉ có 2 khóa `day`/`month` — **không có** `total_routes`, `sum_bg_routes`, `sum_bg_unrouted`, `total_bcvh_bg`, và **không có** khóa `meta` ở cấp cao nhất của response.
- Đẳng thức `bcvh_total = ranked + pickup_at_office + non_hue + no_route` đúng cho BCVH `533140` cả hai kỳ, khớp chính xác số đã ghi ở Manifest Section 48 (ngày: `1.980 = 1.911 + 69`; tháng: `49.264 = 46.818 + 2.446`).
- Route mẫu `533140129`: `month.volume=668` bằng đúng tổng `daily_series[].volume` (27 phần tử).

**Kết luận §3**: `AC-05` **đúng ở tầng dữ liệu/API** — không có gì thay đổi từ Phase B1. Vấn đề không nằm ở đẳng thức, mà ở việc **giao diện không bao giờ hiển thị nó** (§4.1).

## 4. Phát hiện — Lỗi tích hợp thật (đã xác minh trực tiếp trên trình duyệt + API + test)

### 4.1 NGHIÊM TRỌNG — Dải "Đối soát dữ liệu" không bao giờ hiển thị

`RoutePerformancePage.jsx` dòng 683: `{reconciliation?.total_routes !== undefined && (...)}`. Trường `total_routes` **không tồn tại trong contract thật** (§3). Điều kiện này luôn `false` → toàn bộ khối UI đối soát (`Tổng BG Tuyến`/`Không thuộc Tuyến`/`Tổng BCVH`) — chính là phần giao diện đóng `DEF-02`, mục tiêu cốt lõi của cả ticket — **không bao giờ render trong bất kỳ kịch bản nào đã thử** (ngày khác nhau, BCVH khác nhau, `route_type=all`). Xác nhận bằng `get_page_text` và screenshot: không có dòng "Đối soát dữ liệu" ở bất kỳ đâu trên trang.

Không có xử lý `identity_ok: false` (yêu cầu `F9`/§7.6) vì khối này không tồn tại để xử lý.

### 4.2 NGHIÊM TRỌNG — "Tỷ lệ đạt toàn BCVH" hiển thị `0.0%` giả cho mọi BCVH

`computeRouteKpiStats()` (`routeRankingCalculations.js:52-58`) đọc `item.total_bg`, `item.passed` — hai trường **không tồn tại** trên route object mới (chỉ có `day`/`month`/`previous_month` lồng nhau). `toNumber(undefined) = 0` → `totalBg = 0` cho mọi tuyến → `bcvhPassedRate = 0`. Xác nhận trực tiếp trên trình duyệt: thẻ KPI "TỶ LỆ ĐẠT TOÀN BCVH" hiển thị **`0.0%`** cho BCVH Thuận Hóa (533140), ngày 27/08 lẫn 20/08 — con số hoàn toàn bịa, không phải dữ liệu thật.

### 4.3 NGHIÊM TRỌNG — "Tổng BG không đạt" hiển thị `0` giả

Cùng gốc §4.2 (`totalFailed = 0`). Xác nhận trên trình duyệt: thẻ KPI luôn `0`, trong khi API thật cho cùng ngày trả `day.failed=25` cho riêng route `533140129`.

### 4.4 NGHIÊM TRỌNG — Bộ lọc "Chỉ hiện tuyến phát sinh lỗi" hoàn toàn không hoạt động

`applyRouteFilters()` (`routeRankingCalculations.js:27`) đọc `item.failed ?? item.total_failed` — không tồn tại → luôn `0` → điều kiện `> 0` luôn `false`. Xác nhận trực tiếp: bật `only_failed=1` trên BCVH có nhiều tuyến lỗi thật (route `533140137`/"Kim Long_03" có `day.rate = 0.0%` = 100% lỗi) → trang hiển thị **"Hiển thị 0 tuyến trong phạm vi chọn" / "Không có tuyến nào phù hợp"**. Đây là công cụ có mục đích chính là "Nhận diện tuyến yếu" — bộ lọc lõi của nó báo sai hoàn toàn.

### 4.5 NGHIÊM TRỌNG — Mọi tuyến bị gắn sai nhãn phân loại "Nhận tại bưu cục"

`classificationLabel()`/`classificationBadgeClass()` (dòng 24-32) đọc `row.is_postman_delivery_route` — trường này **không tồn tại** trong contract mới. Luôn `falsy` → **mọi** tuyến, kể cả 34/35 tuyến bưu tá thật của BCVH 533140, hiển thị nhãn **"Nhận tại bưu cục"** thay vì "Tuyến bưu tá". Xác nhận trên toàn bộ 10 dòng quan sát trực tiếp trên trình duyệt (không có dòng nào hiển thị "Tuyến bưu tá"). Đây là sai lệch nghiệp vụ hiển thị sai cho PO, không chỉ là số liệu 0 vô hại.

### 4.6 NGHIÊM TRỌNG — Cột `XH` giả song song cột `Hạng` thật — đúng anti-pattern §7.3 đã cấm rõ ràng

Design §7.3: *"Ticket này thay nó bằng thứ hạng thật thay vì đặt thêm một cột Hạng bên cạnh — hai cột số cạnh nhau, một thật một giả, là kết cục tệ hơn hiện trạng."* Mã hiện tại (dòng 101, 144) **vẫn giữ** cột `XH` = `startRank + index + 1` (vị trí dòng, đổi theo trang/sắp xếp) **và thêm** cột `Hạng` = `row.rank` (thật, từ API) ở nhóm cột mới. Xác nhận trực tiếp trên desktop lẫn mobile: dòng đầu tiên hiển thị `XH=1` và `Hạng=26` cùng lúc — chính xác kết cục design đã cảnh báo là "tệ hơn hiện trạng".

### 4.7 Sắp xếp mặc định bị hỏng (không còn "tuyến kém nhất lên trước")

`sortState` khởi tạo `{ key: 'passed_rate', dir: 'asc' }` (dòng 405) — `passed_rate` không tồn tại trên route object mới → mọi tuyến hòa nhau ở `0` → `sortRouteRows` rơi về tie-break theo `failed` (cũng luôn `0`) → thứ tự hiển thị thực chất là thứ tự API trả về (`ma_tuyen` tăng dần). Xác nhận trực tiếp: lần tải đầu tiên hiển thị `533140129, 131, 133, 135, 136, 137...` — thứ tự theo mã tuyến, **không phải** theo tỷ lệ ngày tăng dần như PO đã xác nhận trước đây.

### 4.8 Widget "BG Chậm nộp tiền" bị vô hiệu hóa âm thầm

`computeDelayedCashWidget(meta?.delayed_cash_handover_summary)` — `meta` được gán `result.meta || { reconciliation: ... }` (dòng 492), nhưng API mới **không có khóa `meta`** ở cấp cao nhất (§3) → luôn rơi về fallback → `delayed_cash_handover_summary` luôn `undefined` → widget render `"—"/"—"`. Không phải số bịa (hàm này có bảo vệ `null`/`undefined` đúng chuẩn), nhưng một tính năng đã PO-accept trước đây nay tắt hoàn toàn, không có cảnh báo nào cho biết vì sao.

### 4.9 Nhóm cột "Vi phạm chậm nộp tiền" mức từng-tuyến: dữ liệu giả/mất

`row.delayed_cash_handover_count` không tồn tại → luôn hiển thị `0` (không phải "—", vì nhánh `else` của điều kiện `delayedCount > 0` render literal `0`); `row.f13_303_rate` không tồn tại nhưng `formatDelayedCashRate` có bảo vệ → hiển thị `"—"` đúng. Kết quả: một cột hiển thị số bịa (`0`), cột kia hiển thị đúng cách ("—") — không nhất quán.

### 4.10 `RouteSelectedPanel`: mâu thuẫn trực tiếp trên cùng một màn hình

Panel chi tiết đọc `route.total_bg`, `route.passed`, `route.failed ?? route.total_failed`, `route.returned` — tất cả không tồn tại → hiển thị `0` cho "Sản lượng phát", "Đạt chỉ tiêu", "Không đạt". Xác nhận trực tiếp: chọn tuyến `533140137`/"Kim Long_03" — panel hiển thị **"Sản lượng phát: 0"** trong khi **chính dòng đó trong bảng xếp hạng cùng lúc hiển thị "Sản lượng: 261"** — hai con số trái ngược nhau hiển thị đồng thời trên cùng một màn hình cho cùng một tuyến. Khối "Bưu gửi chuyển hoàn" (`returned > 0`) không bao giờ render vì `returned` luôn `0`.

### 4.11 Vi phạm `AC-14` (cấm thuật ngữ "MTD")

`routePeriodData.js:26`: `// mapping standard names to avoid using the banned word MTD`. Vi phạm đúng nghĩa đen `grep -rn "MTD"` mà `AC-14` yêu cầu trả về 0 kết quả — dù chỉ là comment, không phải UI-facing.

### 4.12 Tham số URL rác

`updateParam('analysis_date', value)` ghi `analysis_date=...` vào URL (dòng 432-435) nhưng không nơi nào trong component đọc lại tham số này — tích tụ vô ích trên thanh địa chỉ, không ảnh hưởng hành vi.

## 5. Những gì XÁC NHẬN ĐÚNG (không phải toàn bộ Phase F1 hỏng)

Để không thổi phồng: các phần sau đã xác minh trực tiếp là **đúng**, không có lỗi:

| Hạng mục | Xác minh |
| --- | --- |
| `Tỷ lệ ngày`/`Tỷ lệ lũy kế tháng`/`Cùng kỳ tháng trước` hiển thị | Đúng, khớp API (vd. `39.0%` khớp `previous_month.rate=39.0445`) |
| Cột `Hạng` thật, sắp xếp khi click | Đúng — click header "Hạng" sắp xếp lại đúng theo `rank` từ API |
| Phân trang | Đúng — 35 tuyến / 10 mỗi trang / 4 trang, điều hướng đúng |
| Tìm kiếm | Đúng — lọc theo `ten_tuyen` hoạt động chính xác |
| `route_type=postman/all` | Đúng — 35 vs 36 tuyến, tuyến "Phát tại quầy" xuất hiện/biến mất đúng |
| Đổi ngày phân tích (`D-01-d`) | Đúng — ghi `from_date=to_date=<ngày mới>`, gọi lại API |
| Cảnh báo lệch ngày (`D-01-c`) | Đúng — `from_date≠to_date` → hiển thị "Đang phân tích ngày <anchor>" |
| Tương thích URL cũ | Đúng — bookmark không có `from_date`/`to_date` tự phân giải qua `meta.max_date` |
| Nút drill-down Evidence | Đúng — link đầy đủ ngữ cảnh, giữ chế độ một-ngày |
| Responsive desktop/mobile | Đúng — không vỡ layout; bảng scroll ngang trên mobile theo đúng pattern sẵn có |
| Console | Không có lỗi JS runtime nào riêng của trang này (không crash — nhưng cũng không cảnh báo gì về dữ liệu sai) |
| Hiệu năng | 3 lần đo thật qua trình duyệt: `890/783/1086 ms` — trong ngưỡng `<1.5s` |
| Backend/API contract | Không đổi so với Phase B1, đối chiếu lại đầy đủ — đúng |

## 6. Test tự động

### 6.1 Backend (không bị Phase F1 chạm)

`node --test --experimental-sqlite` toàn bộ `backend/src/**/*.test.js` + `test_*.js` (có server thật chạy song song cho 3 test tích hợp cần nó): **454/468 pass**, đúng 14 lỗi có sẵn theo tên, khớp 100% với baseline Phase B1 (Manifest Section 48). Không có lỗi backend mới.

### 6.2 Frontend — full sweep

`node --test` toàn bộ `frontend/src/**/*.test.js`: **383/395 pass, 12 fail**.

**Điểm quan trọng cần làm rõ chính xác — không được diễn giải sai theo cả hai hướng:** đã dựng `git worktree` tại `bfa1d515` (baseline Phase B1, trước khi Phase F1 chạm vào) để so sánh trực tiếp. Kết quả: **9 trong số 12 lỗi hiện tại (`RoutePerformancePage.blackReturned/delayedCash/delayedCashWidget.test.js`, `routeRankingFilters.test.js`) ĐÃ THẤT BẠI TỪ TRƯỚC Phase F1**, nhưng thất bại ở **assertion khác, do câu chữ/label đã trôi từ trước** (vd. baseline thất bại ở `/được ghi nhận BLACK trong Đánh giá KPI 2026/` hoặc `/key: 'passed_rate', dir: 'desc'/` — không liên quan gì đến ticket này). Vì `assert.match` chỉ báo lỗi đầu tiên trong chuỗi assertion, các test này che giấu luôn tình trạng của những assertion phía sau.

Khi kiểm tra riêng từng assertion cụ thể (không chỉ trạng thái pass/fail của cả `test()`), xác nhận: assertion `/label: 'Tổng BG'/`, `/Chuyển hoàn/`, `/label: 'Số BG chậm nộp tiền'/` v.v. — **thật sự không còn khớp với mã nguồn hiện tại** (đã bị xóa/thay thế), trong khi ở baseline `bfa1d515` các chuỗi này **vẫn tồn tại nguyên vẹn trong mã nguồn** (xác minh bằng `grep` trực tiếp lên file baseline). Nói cách khác: các test này đã "đỏ" từ trước vì nợ kỹ thuật kiểm thử cũ (câu chữ trôi, không liên quan ticket) — Phase F1 không phải nguyên nhân khiến chúng CHUYỂN từ pass sang fail — nhưng mã nguồn thật đằng sau chúng đã bị phá vỡ theo cách mới, nghiêm trọng hơn, mà các test này (do đã đỏ sẵn) không còn khả năng phát hiện.

`RoutePerformancePage.dateResolution.test.js` bị Phase F1 **sửa trực tiếp** (đổi assertion từ `getRouteRanking(...)` sang `getRoutePeriods(...)`) — không phải "pass không sửa" như `§10.3 F13` yêu cầu theo nghĩa đen. Xét lý do: bất biến cốt lõi (ưu tiên `to_date`) được giữ nguyên và re-assert đúng cách; đây là hệ quả tất yếu của việc đổi endpoint (chính là mục tiêu của Phase F1), không phải một sửa đổi tùy tiện. Ghi nhận là một sai lệch có giải thích được, không phải vi phạm nghiêm trọng — nhưng vẫn là sai lệch so với chữ nghĩa của quy tắc.

`routeViolationEvidenceData.test.js` (file thứ 4 trong danh sách `R1-R4`/`F13`): **19/19 pass, không sửa** — không bị ảnh hưởng.

Tổng: `oxlint` = 0 lỗi, +5 warning mới (biến/import không dùng do dọn dẹp chưa xong khi viết lại file) so với 4 warning có sẵn ở baseline. `vite build` thành công (702 module, 2.92s).

## 7. Đối chiếu tiêu chí nghiệm thu (§12.1 Design of Record)

| ID | Trạng thái | Ghi chú |
| --- | --- | --- |
| `AC-01` | ✅ Đạt (API) | Contract đúng §6.3, xác minh lại qua server thật |
| `AC-02`/`C-01` | ⚠️ Một phần | Một request đúng chuẩn về mặt logic, nhưng phát hiện 3 lần gọi trùng lặp mỗi lần tải trang (pattern có sẵn từ trước ticket, không phải regression mới — xem §4.12 khác) |
| `AC-03`/`C-02` | ✅ Đạt (API+UI) | `month.rate`/`day.rate` hiển thị đúng |
| `AC-04`/`C-04` | ✅ Đạt (API+UI một phần) | `day_rate`/`month_rate`/`previous_month_rate` đúng quy tắc null; nhưng các trường CŨ không tồn tại (`total_bg` v.v.) không tuân quy tắc này vì chúng không được ánh xạ |
| `AC-05` | ⚠️ **Đúng ở API, KHÔNG đạt ở UI** | Xem §3 và §4.1 — không tự phê duyệt ở cấp ticket |
| `AC-06` | ✅ Đạt | `DEF-01` đóng đúng, xác minh trực tiếp (`D-01-c`/`d`) |
| `AC-07` | ⚠️ Chưa xác minh được trực tiếp trên UI | Route absent-on-anchor cần xác minh riêng — xem §8 tồn đọng |
| `AC-08` | ✅ Đạt (API) | Mọi tuyến có `rank` |
| `AC-09` | ❌ Không đạt | Tooltip giải thích `passed+failed≠volume` không tồn tại vì các trường này không còn hiển thị |
| `AC-09b` | ✅ Đạt | Cột `Hạng` ổn định khi đổi sắp xếp |
| `AC-10` | ✅ Đạt | `f13HeatmapBandCatalog.js` không bị sửa, màu áp dụng đúng cho `day_rate`/`month_rate` |
| `AC-11` | ❌ Không đạt | 2/4 file `R1-R4`/`F13` chỉ định ("pass không sửa") nay thất bại vì lý do MỚI (không phải lý do cũ) |
| `AC-12` | ⚠️ Một phần | `oxlint`/`build` đạt; "zero regression" không đạt theo nghĩa hẹp — xem §6.2 |
| `AC-13` | ✅ Đạt | Không có ghi CSDL nào trong toàn bộ quá trình xác minh |
| `AC-14` | ❌ Không đạt | Chuỗi "MTD" tồn tại trong comment `routePeriodData.js:26` |

## 8. Route absent-on-anchor-day ("—", `AC-07`) — chưa xác minh trực tiếp trên UI

Backend đã chứng minh (Phase B1) 5/35 tuyến của BCVH 533140 vắng mặt ngày neo, `day.rate=null`. `routePeriodData.js` ánh xạ `day_rate: r.day?.rate ?? null` đúng, và `formatPeriodRate(null)` trả `"—"` đúng — về mặt logic mã nguồn, cơ chế này **đúng**. Tuy nhiên phiên này chưa click cụ thể vào MỘT trong 5 tuyến đó để xác nhận bằng mắt render `"—"` thay vì bị lỗi runtime nào khác che khuất (không phát hiện lỗi console nào gợi ý vấn đề, nhưng chưa xác nhận positive). Đây là hạng mục duy nhất trong yêu cầu §7-8-9-10-11-12 gốc **chưa được xác minh 100% trực tiếp** — được ghi nhận minh bạch thay vì giả định đạt.

## 9. Nguyên nhân gốc

Phase F1 đã **thay thế hoàn toàn** lệnh gọi `f13DashboardClient.getRouteRanking(...)` bằng `f13DashboardClient.getRoutePeriods(...)` duy nhất. Nhưng Design of Record §7.3 quy định rõ: *"Giữ nguyên không đổi: Mã tuyến, Tên tuyến bưu tá, toàn bộ nhóm 'Kết quả ngày đánh giá' còn lại (Tổng BG, Đạt, Không đạt, Chuyển hoàn), toàn bộ nhóm 'Vi phạm chậm nộp tiền', cột Phân loại, và nút drill-down."* Ý định thiết kế là **bổ sung** endpoint mới bên cạnh endpoint cũ (hoặc hợp nhất dữ liệu từ cả hai), không phải **thay thế hoàn toàn** nguồn dữ liệu — vì endpoint mới (`/f13/ranking/route/periods`, do chính Phase B1 xây theo đúng §6.3) chưa bao giờ được thiết kế để mang các trường `total_bg`/`passed`/`failed`/`returned`/`delayed_cash_handover_count`/`is_postman_delivery_route`. Mọi lỗi ở §4 đều truy về đúng một nguyên nhân duy nhất này.

## 10. Khuyến nghị

`F13-ROUTE-RANKING-PERIOD-01` **không đủ điều kiện chuyển PO UI Check**. Cần một trong hai hướng, quyết định thuộc CTO/PO:

1. **Phase F1 remediation** (khuyến nghị): `RoutePerformancePage.jsx` cần gọi **cả hai** endpoint (`getRouteRanking` giữ nguyên cho các trường cũ, `getRoutePeriods` cho các trường kỳ mới) và merge theo `ma_tuyen`, đúng như §7.3 yêu cầu — không phải thay thế. Đồng thời sửa điều kiện hiển thị đối soát (`reconciliation.day`/`reconciliation.month`, không phải `total_routes`), xóa cột `XH` trùng lặp, sửa `sortState` mặc định dùng `day_rate`, xóa chuỗi "MTD" khỏi comment.
2. Nếu CTO/PO chấp nhận phạm vi hẹp hơn (chỉ hiển thị các trường kỳ mới, bỏ hẳn nhóm cột cũ), đó là **quyết định PO mới**, cần ghi nhận tường minh — không được suy ra từ thiết kế hiện có, vì §7.3 nói ngược lại rõ ràng.

Phase I1 (nối hai phase, đo hiệu năng, sweep hồi quy) đã hoàn thành đúng phạm vi được giao; kết quả của việc "nối" đó là phát hiện lỗi, không phải một PASS.

## 11. Đánh giá độc lập (Opus)

Ghi chú này dành cho phiên review độc lập: **AC-05 cấp ticket chưa được tự phê duyệt.** Bằng chứng đầy đủ ở §3 (API đúng) và §4.1 (UI không hiển thị). Toàn bộ 12 phát hiện ở §4 đều có: vị trí file:dòng cụ thể, giá trị quan sát được trực tiếp (screenshot/network/API JSON), và đối chiếu với đúng câu chữ Design of Record. Không có phát hiện nào dựa trên suy đoán không kiểm chứng.
