# F13-ROUTE-RANKING-PERIOD-01 — Tuyến Ranking theo kỳ và đối soát phạm vi — Design of Record

| Trường | Giá trị |
| --- | --- |
| Ticket | `F13-ROUTE-RANKING-PERIOD-01` |
| Program | `F13-STANDARDIZATION-001` (delta, không mở chương trình mới) |
| Branch | `codex/da-impl-006` |
| Baseline | `35290ad105eb716ab8c1d7d65056992cd773ed2a` (local = remote, đã xác minh) |
| Ngày lập | `2026-08-28` |
| Revision | `R1` (2026-08-28) — đóng `D-OPEN-01`, xem §14 |
| Trạng thái | `PO APPROVED / READY FOR IMPLEMENTATION` |
| Cơ sở | Read-only audit `F13 Route Ranking` (2026-08-28) + Phương án B do PO chốt + PO quyết định đóng `D-OPEN-01` (2026-08-28) |
| PO UI Check Required | `Yes` (cuối Phase F1 và Phase I1) |

## Table of Contents

- [1. Mục tiêu và quyết định PO](#1-mục-tiêu-và-quyết-định-po)
- [2. Hai defect bắt buộc phải xử lý](#2-hai-defect-bắt-buộc-phải-xử-lý)
- [3. Từ vựng và định nghĩa số liệu](#3-từ-vựng-và-định-nghĩa-số-liệu)
- [4. Quy tắc thời gian](#4-quy-tắc-thời-gian)
- [5. Đối soát phạm vi](#5-đối-soát-phạm-vi)
- [6. API contract](#6-api-contract)
- [7. Giao diện](#7-giao-diện)
- [8. Hiệu năng](#8-hiệu-năng)
- [9. File scope và chia phase](#9-file-scope-và-chia-phase)
- [10. Test plan](#10-test-plan)
- [11. Rủi ro dữ liệu thật](#11-rủi-ro-dữ-liệu-thật)
- [12. Tiêu chí nghiệm thu](#12-tiêu-chí-nghiệm-thu)
- [13. Ngoài phạm vi](#13-ngoài-phạm-vi)
- [14. Nhật ký quyết định PO — đóng D-OPEN-01](#14-nhật-ký-quyết-định-po--đóng-d-open-01-2026-08-28-revision-r1)
- [15. Trạng thái](#15-trạng-thái)

---

## 1. Mục tiêu và quyết định PO

### 1.1 Mục tiêu

Bổ sung năng lực xem tỷ lệ tuyến **theo kỳ** vào màn hình `/f13/ranking/route`, và làm cho số liệu tuyến **đối soát được** với tổng của BCVH. Màn hình hiện tại chỉ trả lời được "tuyến nào kém trong đúng một ngày"; sau ticket này nó trả lời được "tuyến nào kém, kém dai dẳng hay kém đột biến, và so với tháng trước thì tốt lên hay xấu đi".

Đây là **delta trên module Tuyến Ranking đang chạy**. Ticket này **không** mở lại `F13-ROUTE-RANKING-REDESIGN-IMPL` (đã `CLOSED / PO PASS`), **không** mở lại `F13-BCVH-RANKING-OVERVIEW-01` (đã `CLOSED / PO PASS` 2026-08-28), và **không** kích hoạt các phase 1-4 còn `PLANNED / NOT ACTIVE` của `F13-STANDARDIZATION-001`.

### 1.2 Bảy quyết định PO đã chốt (`2026-08-28`, Phương án B)

| # | Quyết định | Ràng buộc lên thiết kế |
| --- | --- | --- |
| 1 | Chỉ xếp hạng tuyến phát hợp lệ; phần ngoài phạm vi hiển thị riêng để đối soát với tổng BCVH | §5 — dải Đối soát phạm vi, ràng buộc đồng nhất `AC-05` |
| 2 | Tỷ lệ theo **số lượt đo kiểm**, nhất quán với BCVH Ranking | §3.2 — mẫu số `COUNT(ma_bg)`, không khử trùng `ma_bg` |
| 3 | Hỗ trợ: Tỷ lệ ngày · Tỷ lệ lũy kế tháng · Cùng kỳ tháng trước · Chênh lệch · Xếp hạng tuyến. **Không dùng thuật ngữ "MTD"** ở giao diện hay khi trao đổi với PO | §3.1 từ vựng bắt buộc; §6 contract; §7 bảng |
| 4 | Chi tiết từng tuyến: diễn biến tỷ lệ theo ngày trong tháng, tỷ lệ lũy kế tháng, so sánh kỳ trước. Không sao chép block/UI/contract của BCVH Ranking | §7.3 — đặt trong panel chi tiết tuyến **đã có**, không tạo vùng block đầu trang |
| 5 | Dùng chung ngưỡng màu F1.3 hiện hành | §7.4 — `classifyF13HeatmapRate` từ `f13HeatmapBandCatalog.js`, chỉ import |
| 6 | Tuyến ít dữ liệu **vẫn hiển thị và xếp hạng**, kèm số ngày có dữ liệu và sản lượng | §3.4, `AC-08` — không lọc, không ẩn, không gộp |
| 7 | Drill-down Bưu gửi Đạt/Lỗi xuống Evidence nằm trong lộ trình nhưng **tách phase/ticket riêng**; Evidence giữ nguyên theo ngày | §13 — `F13-ROUTE-EVIDENCE-STATUS-02` (chưa mở) |

Bảy quyết định trên là **binding**. Executor không được diễn giải lại; nếu phát hiện mâu thuẫn khi thực thi thì dừng và báo cáo, không tự xử lý.

### 1.3 Quyết định PO bổ sung — đóng `D-OPEN-01` (`2026-08-28`)

PO chốt: **"Cùng kỳ tháng trước" phải tính giống BCVH Ranking** — nếu ngày phân tích là 20/8 thì so sánh 01–20/8 với 01–20/7 (cùng số ngày đã trôi, không phải trọn tháng trước). Nhãn giao diện: **`Cùng kỳ tháng trước`**, ngắn gọn, không dùng "MTD" dưới bất kỳ hình thức nào. Quyết định này khóa `D-OPEN-01` (từng để ngỏ ở Revision R0) theo đúng phương án đã đo trước đó là "cùng số ngày tháng trước", và toàn bộ tài liệu từ đây được viết lại theo quyết định này — không còn là mặc định chờ duyệt. Xem nhật ký đóng đầy đủ tại §14.

---

## 2. Hai defect bắt buộc phải xử lý

Audit read-only phát hiện hai defect trên màn hình đang chạy. Thiết kế này phải đóng cả hai; **không được xây tính năng kỳ đè lên chúng**, vì cả hai đều khuếch đại sai số của số liệu kỳ.

### 2.1 `DEF-01` — Bộ lọc khoảng ngày chỉ lấy ngày cuối

**Hiện trạng.** `RoutePerformancePage.jsx:381-383` tính `fromDate` và `toDate`, dòng 372 đọc `interval`, dòng 484/559 hiển thị nhãn `Một ngày / Theo tuần / Lũy kế`. Nhưng lời gọi API duy nhất (dòng 443) luôn truyền **một ngày**:

```js
const analysisDate = resolveDefaultRouteDate({ param: toDateParam || fromDateParam, metaMaxDate });
const result = await f13DashboardClient.getRouteRanking(analysisDate, bcvhId, 1, 1000, sort, order, routeType);
```

Người dùng chọn khoảng ngày → hệ thống âm thầm chỉ dùng ngày cuối. `interval` chưa bao giờ ảnh hưởng truy vấn.

**Hướng xử lý — loại bỏ sự mập mờ, không xây engine khoảng ngày.** PO decision 3 định nghĩa một mô hình **ngày neo**, không phải khoảng ngày tự do: từ một ngày neo suy ra tỷ lệ ngày, tỷ lệ lũy kế tháng và tỷ lệ cùng kỳ tháng trước. Vì vậy:

- `D-01-a` — Bộ lọc trên màn hình Tuyến Ranking chuyển thành **một ô "Ngày phân tích"** duy nhất. Không còn cặp from/to trên UI của màn hình này.
- `D-01-b` — Badge `interval` (`Một ngày / Theo tuần / Lũy kế`) bị **xóa bỏ**. Nó mô tả một năng lực không tồn tại.
- `D-01-c` — URL contract vẫn **đọc được** `from_date` / `to_date` để không phá `urlPreservation.js` và tham số `return_to` của Evidence. Quy tắc phân giải giữ nguyên (`to_date || from_date || meta.max_date`), nhưng khi `from_date ≠ to_date` màn hình phải **hiển thị rõ** `Đang phân tích ngày <anchor_date>` thay vì im lặng. Chuyển từ *cắt bớt âm thầm* sang *công bố tường minh*.
- `D-01-d` — Khi ghi URL, màn hình ghi `from_date = to_date = anchor_date`, để mọi link chia sẻ và mọi lần quay lại từ Evidence đều tự nhất quán.

Đây là cách sửa đúng bản chất: không tạo ra một chế độ khoảng ngày mà PO không yêu cầu, và gỡ bỏ hai control đang nói dối người dùng.

### 2.2 `DEF-02` — Số liệu Tuyến không đối soát được với BCVH

**Hiện trạng.** `getRouteRanking` lọc `ma_tuyen LIKE '53%'` **và** loại 7 mã trong `CONFIRMED_NON_POSTMAN_ROUTES`. `getBcvhRanking`, `getEvidenceListFacts` và block route của `_getBcvhOverviewAggregate` **không lọc gì**. Đo thật `2026-08-27 / BCVH 533140`:

| Nguồn | Tổng BG | Không đạt |
| --- | --- | --- |
| BCVH Ranking (không lọc tuyến) | 1,980 | 716 |
| Tổng các dòng Route Ranking | 1,911 | 714 |
| Evidence "Tất cả tuyến" | — | 716 |

Cả năm với BCVH 533140: 376,079 vs 360,476 — lệch **4.1%**. Người dùng cộng tay các dòng tuyến không bao giờ khớp con số BCVH, và Evidence trả về 2 bưu gửi lỗi không quy được về dòng tuyến nào.

**Hướng xử lý — theo PO decision 1: giữ phạm vi xếp hạng, hiển thị phần chênh.** Không nới phạm vi Route Ranking, không siết phạm vi BCVH Ranking. Thay vào đó **hiện phần chênh ra** như một số liệu chính thức, có ràng buộc đồng nhất kiểm được. Chi tiết ở §5.

---

## 3. Từ vựng và định nghĩa số liệu

### 3.1 Từ vựng bắt buộc (PO decision 3)

Chuỗi hiển thị trên giao diện và trong mọi trao đổi với PO:

| Khái niệm | Nhãn bắt buộc | Cấm dùng |
| --- | --- | --- |
| Tỷ lệ của riêng ngày neo | `Tỷ lệ ngày` | — |
| Tỷ lệ cộng dồn từ ngày 01 đến ngày neo | `Tỷ lệ lũy kế tháng` | `MTD`, `Month-to-date`, `Lũy kế MTD` |
| Tỷ lệ tháng trước, **cùng số ngày đã trôi** với kỳ lũy kế tháng hiện tại (ngày neo 20/8 → so với 01–20/7) | `Cùng kỳ tháng trước` | `MTD`, `Prev MTD`, `MTD tháng trước`, `Tỷ lệ tháng trước` (mập mờ — dễ hiểu nhầm là trọn tháng) |
| Hiệu số hai tỷ lệ trên | `Chênh lệch` | `Delta` (trên UI) |
| Thứ hạng theo tỷ lệ lũy kế tháng | `Hạng` | — |

Tên trường trong JSON/code được phép dùng tiếng Anh (`month_to_anchor`, `previous_month`, `delta`), nhưng **chuỗi `MTD` không được xuất hiện ở bất kỳ đâu** — kể cả tên biến, comment, hay tên test. `AC-14` kiểm điều này bằng grep. Trường JSON giữ tên `previous_month` (đã có sẵn ở R0) — chỉ **ngữ nghĩa khoảng ngày** của nó đổi theo §4.2; không đổi tên trường để tránh phá vỡ các phần khác của contract mà không cần thiết.

### 3.2 Mẫu số (PO decision 2)

```
rate = passed / volume * 100
volume = COUNT(ma_bg)          -- số lượt đo kiểm
passed = COUNT(danh_gia_2026 = 'Đạt')
failed = COUNT(danh_gia_2026 = 'Không đạt')
```

Ba ràng buộc:

- `M-01` — `volume` là **số lượt đo kiểm**, đếm dòng, **không** khử trùng `ma_bg`. Đúng như `getBcvhRanking` đang làm. Cơ sở: khóa nghiệp vụ là `UNIQUE(ngay_do_kiem, ma_bg)`; một bưu gửi còn đang xử lý xuất hiện mỗi ngày một lần **theo thiết kế** (`DQ-07` đã bị rút chính thức). Đo thật trong 1 BCVH-tháng: 49,264 dòng / 49,259 `ma_bg` duy nhất — chênh 5 dòng, **< 0.01%**.
- `M-02` — `volume` **bao gồm** cả dòng `danh_gia_2026 IS NULL` (chuyển hoàn; 30,453 dòng toàn CSDL). Vì vậy `passed + failed ≠ volume`. Nhất quán với BCVH Ranking, nên không phải lỗi — nhưng giao diện **phải** có tooltip nói rõ, nếu không người dùng sẽ báo là sai số (`AC-09`).
- `M-03` — `rate = null` **chỉ khi và chỉ khi** `volume = 0`. Dữ liệu thiếu ngày mà `volume > 0` vẫn tính tỷ lệ bình thường, kèm `days_with_data`. Quy tắc này kế thừa nguyên văn `R1-B` của `F13-BCVH-RANKING-OVERVIEW-01` để hai màn hình không phân kỳ ngữ nghĩa. `null` render là `—`, **không bao giờ** là `0`.

### 3.3 Chênh lệch và xếp hạng

- `Chênh lệch = Tỷ lệ lũy kế tháng − Cùng kỳ tháng trước`, đơn vị **điểm phần trăm**, làm tròn 2 chữ số. Nếu một trong hai vế `null` thì `Chênh lệch = null` → render `—`.
- `Hạng` xếp theo `Tỷ lệ lũy kế tháng` **giảm dần**, tie-break `volume` giảm dần — cùng quy ước sắp xếp `RANK()` mà `getBcvhRanking` đang dùng. Tuyến có `rate = null` xếp **cuối**, hạng vẫn cấp, không bỏ trống.
- `Biến động hạng = Hạng cùng kỳ tháng trước − Hạng lũy kế tháng` (dương = cải thiện). `null` nếu tuyến không có mặt trong cửa sổ cùng kỳ tháng trước.

### 3.4 Tuyến ít dữ liệu (PO decision 6)

**Không lọc, không ẩn, không gộp.** Mọi tuyến trong phạm vi xếp hạng đều hiển thị và đều được cấp hạng. Kèm bắt buộc hai cột ngữ cảnh: `Ngày có dữ liệu` (`days_with_data / days_in_period`) và `Sản lượng` (`volume`). Đo thật `533140 / tháng 8`: có tuyến chỉ 4 ngày có dữ liệu, và 1 tuyến `< 30` bưu gửi/tháng — đây là ngữ cảnh người điều hành cần thấy, không phải nhiễu cần giấu.

---

## 4. Quy tắc thời gian

### 4.1 Ngày neo (`anchor_date`)

```
anchor_date = MAX(ngay_do_kiem)
              FROM fact_f13
              WHERE ma_bcvh = <bcvh> AND date(ngay_do_kiem) <= date(<anchor_ceiling>)
```

- `anchor_ceiling` = tham số `anchor_date` do client gửi; nếu vắng thì lấy `meta.max_date`.
- Phân giải **theo từng BCVH**, không dùng ngày max toàn hệ thống. Lý do đo thật: 9 BCVH có số ngày phủ khác nhau (235 / 233 / 231 / 234 / 233 / 234 / 113 / 12 / 11). Dùng ngày max toàn cục sẽ cho BCVH nhỏ một ngày neo rỗng.
- Nếu BCVH không có dòng nào `<= ceiling` → `anchor_date = null`, toàn bộ payload trả về trạng thái rỗng tường minh, **không** fallback sang BCVH khác hay sang ngày khác.

### 4.2 Phạm vi ba kỳ

| Kỳ | Khoảng | Ghi chú |
| --- | --- | --- |
| `Tỷ lệ ngày` | `ngay_do_kiem = anchor_date` | Một ngày |
| `Tỷ lệ lũy kế tháng` | `substr(anchor_date,1,7) || '-01'` → `anchor_date` | Bao gồm ngày neo |
| `Cùng kỳ tháng trước` | `previous_start` → `previous_end` theo công thức §4.2.1 | **Cùng số ngày đã trôi** với kỳ lũy kế tháng, không phải trọn tháng (quyết định PO đóng `D-OPEN-01`, §14) |

#### 4.2.1 Công thức "Cùng kỳ tháng trước" — tái dùng nguyên văn công thức MTD của BCVH Ranking

PO chỉ định rõ: tính **giống BCVH Ranking**. `_getBcvhOverviewAggregate('mtd', ...)` (`FactBuuGuiRepository.js:283-313`) đã giải quyết đúng bài toán này để phục vụ khối "Tổng hợp MTD" của BCVH Ranking Overview. Thiết kế này **tái dùng nguyên văn công thức đó**, không phát minh lại:

```sql
previous_start = date(substr(anchor_date,1,7) || '-01', '-1 month')
previous_end   = MIN(
                    date(previous_start, '+' || (CAST(strftime('%d', anchor_date) AS INTEGER) - 1) || ' days'),
                    date(substr(anchor_date,1,7) || '-01', '-1 day')
                 )
```

Diễn giải: bắt đầu từ ngày 01 tháng trước, cộng thêm `(số ngày đã trôi của tháng hiện tại − 1)` ngày, nhưng **không bao giờ vượt quá ngày cuối tháng trước**. `MIN()` trên chuỗi ISO-8601 hoạt động đúng vì định dạng `YYYY-MM-DD` so sánh từ điển trùng với so sánh ngày tháng.

**Đã xác minh trên dữ liệu thật (read-only):**

| Ngày neo | `previous_start` | `previous_end` (dự kiến) | Đo được |
| --- | --- | --- | --- |
| `2026-08-27` | `2026-07-01` | `2026-07-27` | ✅ khớp — BCVH 533140: `Tỷ lệ lũy kế tháng = 57.03%`, `Cùng kỳ tháng trước = 66.73%` (khác `Trọn tháng trước = 66.47%` — chênh 0.26 điểm phần trăm, đúng như dự đoán ở R0) |
| `2026-03-31` (kiểm biên — tháng trước là tháng 2, 28 ngày) | `2026-02-01` | `2026-02-28` (bị **giới hạn**, không tràn sang `2026-03-03`) | ✅ khớp, chứng minh `MIN()` giới hạn đúng khi tháng hiện tại dài hơn tháng trước |

Trường hợp biên `previous_end` bị giới hạn (tháng trước ngắn hơn) là tình huống **đã có tiền lệ và đã được PO chấp nhận** ở BCVH Ranking Overview — không phải rủi ro mới do ticket này tạo ra.

### 4.3 Trường hợp ngày neo rơi vào ngày 01

`Tỷ lệ lũy kế tháng` khi đó bằng đúng `Tỷ lệ ngày`. Đây là kết quả đúng, **không** phải lỗi và **không** được đặc biệt hóa.

**Hệ quả của công thức §4.2.1 khi ngày neo là ngày 01:** `strftime('%d', anchor_date) = '01'`, nên `previous_end = previous_start + 0 ngày = previous_start`. `Cùng kỳ tháng trước` khi đó cũng thu hẹp về **đúng một ngày** (ngày 01 của tháng trước), không phải trọn tháng trước. Đây là hệ quả **nhất quán** của việc dùng chung công thức với BCVH Ranking, không phải trường hợp đặc biệt cần xử lý riêng — `Chênh lệch` vẫn có nghĩa (so sánh ngày 01 tháng này với ngày 01 tháng trước). Giao diện hiển thị cả ba giá trị bằng badge `1/1 ngày` cho cả hai kỳ tháng, để không gây hiểu nhầm là dữ liệu thiếu.

### 4.4 Danh sách tuyến = hợp của kỳ tháng, không phải của ngày neo

**Quy tắc `T-01`, bắt buộc.** Tập tuyến hiển thị là **hợp (union) các tuyến xuất hiện trong kỳ lũy kế tháng**, không phải tập tuyến có dữ liệu trong ngày neo.

Cơ sở đo thật (`533140`, `2026-08-01 → 2026-08-27`): **35 tuyến có mặt trong tháng, chỉ 30 tuyến có dữ liệu trong ngày neo.** Nếu lấy tập theo ngày neo, 5 tuyến sẽ biến mất khỏi bảng xếp hạng tháng — mất dấu vết đúng những tuyến hoạt động không đều, tức là những tuyến cần theo dõi nhất.

Hệ quả bắt buộc: với 5 tuyến đó, `Tỷ lệ ngày = null` → render `—`. **Không được render `0`** (`AC-07`). Một tuyến không chạy trong ngày neo khác hoàn toàn một tuyến chạy và đạt 0%.

---

## 5. Đối soát phạm vi

### 5.1 Định nghĩa phạm vi xếp hạng

Giữ nguyên phạm vi hiện hành của `getRouteRanking`, không thay đổi:

```sql
ma_tuyen IS NOT NULL AND TRIM(ma_tuyen) != ''
AND ma_tuyen LIKE '53%'
AND ma_tuyen NOT IN (<7 mã CONFIRMED_NON_POSTMAN_ROUTES>)
```

### 5.2 Bốn nhóm và ràng buộc đồng nhất

Endpoint trả về bốn bộ đếm, tính trong **cùng một lần quét**, cho **cả hai kỳ** (ngày neo và lũy kế tháng):

| Nhóm | Định nghĩa | Vai trò |
| --- | --- | --- |
| `ranked` | Thỏa toàn bộ điều kiện §5.1 | Tổng các dòng trong bảng xếp hạng |
| `pickup_at_office` | `ma_tuyen` thuộc 7 mã catalog | Nhận tại quầy/bưu cục — PO đã xác nhận không phải tuyến bưu tá |
| `non_hue` | Có `ma_tuyen` nhưng không bắt đầu `53` | Mã tuyến ngoài Huế; gồm cả giá trị rác `'Khong Xac Dinh'` |
| `no_route` | `ma_tuyen` null hoặc rỗng | Không quy được về tuyến nào |

**Ràng buộc đồng nhất `AC-05`, kiểm ở cả backend test lẫn runtime:**

```
bcvh_total = ranked + pickup_at_office + non_hue + no_route
```

`bcvh_total` phải được tính bằng **đúng vị từ** mà `getBcvhRanking` dùng (`ngay_do_kiem` trong kỳ `AND ma_bcvh = ?`, không lọc tuyến), để con số này bằng đúng con số BCVH Ranking hiển thị. Nếu đẳng thức sai, endpoint trả `identity_ok: false` và giao diện hiển thị cảnh báo — **không** âm thầm bỏ qua.

Xác minh trên dữ liệu thật (`533140`):

| Kỳ | `bcvh_total` | `ranked` | `pickup` | `non_hue` | `no_route` | Đồng nhất |
| --- | --- | --- | --- | --- | --- | --- |
| Ngày `2026-08-27` | 1,980 | 1,911 | 69 | 0 | 0 | ✅ |
| Lũy kế `2026-08-01→27` | 49,264 | 46,818 | 2,446 | 0 | 0 | ✅ |

### 5.3 Trình bày

Một **dải ngang** ngay dưới header màn hình — không phải lưới thẻ, không phải block đầu trang (tránh trùng hình thái BCVH Ranking Overview):

```
Đối soát phạm vi · Ngày 27/08/2026
Toàn BCVH 1.980  =  Trong xếp hạng 1.911  +  Ngoài xếp hạng 69
                                              └ Nhận tại quầy/bưu cục 69 · Mã tuyến ngoài Huế 0 · Không có mã tuyến 0
```

Có công tắc `Ngày / Lũy kế tháng` để đổi kỳ đối soát. Khi `Ngoài xếp hạng = 0` vẫn hiển thị dòng này (giá trị 0 là thông tin, không phải trạng thái rỗng).

---

## 6. API contract

### 6.1 Phương án bị bác

- **Bác: mở rộng `/f13/ranking/route` bằng `from_date`/`to_date`.** Endpoint này đang phục vụ ngữ nghĩa một-ngày cho `RoutePerformancePage`, và `resolveDefaultRouteDate` cùng link builder của Evidence đều dựa vào nó. Nhét ngữ nghĩa kỳ vào cùng một contract sẽ tạo ra endpoint hai chế độ — đúng lỗi mà `DEF-01` đang mắc, chỉ chuyển xuống backend.
- **Bác: nhiều endpoint cho từng kỳ.** Gây N+1 và cho phép ba kỳ phân kỳ số liệu giữa các lần gọi.
- **Bác: tái dụng `/f13/ranking/bcvh/overview`.** Sai cấp độ, và vi phạm ràng buộc không sao chép contract của BCVH Ranking.

### 6.2 Endpoint mới

```
GET /f13/ranking/route/periods
```

| Tham số | Bắt buộc | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `bcvh` | ✅ | — | Thiếu → `400 MISSING_PARAM` |
| `anchor_date` | ❌ | `meta.max_date` | Trần phân giải ngày neo, không phải ngày neo |
| `route_type` | ❌ | `postman` | `postman` \| `all`, cùng ngữ nghĩa endpoint hiện có |

Quyền: `requireAuth` + `requireRole(['admin','viewer'])` — cùng mức `/f13/ranking/route`.

### 6.3 Payload

```jsonc
{
  "success": true,
  "data": {
    "anchor_date": "2026-08-27",
    "bcvh": { "ma_bcvh": "533140", "ten_bcvh": "BCVH Thuận Hóa" },
    "periods": {
      "day":             { "start": "2026-08-27", "end": "2026-08-27" },
      "month_to_anchor": { "start": "2026-08-01", "end": "2026-08-27",
                           "days_in_period": 27 },
      "previous_month":  { "start": "2026-07-01", "end": "2026-07-27",
                           "days_in_period": 27 }
    },
    "routes": [
      {
        "ma_tuyen": "533140129",
        "ten_tuyen": "...",
        "loai_tuyen_phat": "Tuyến phát xã (01 lần/ ngày)",
        "day":             { "volume": 0,    "passed": 0,   "failed": 0,   "rate": null },
        "month":           { "volume": 668,  "passed": 240, "failed": 428, "rate": 35.93,
                             "days_with_data": 27, "days_in_period": 27 },
        "previous_month":  { "volume": 607,  "passed": 237, "failed": 369, "rate": 39.05,
                             "days_with_data": 27, "days_in_period": 27 },
        "delta": -3.12,
        "rank": 33,
        "rank_previous_month": 28,
        "rank_delta": -5,
        "daily_series": [ { "date": "2026-08-01", "volume": 18, "passed": 9, "rate": 50.0 } ]
      }
    ],
    "reconciliation": {
      "day":   { "bcvh_total": 1980,  "ranked": 1911,  "pickup_at_office": 69,
                 "non_hue": 0, "no_route": 0, "identity_ok": true },
      "month": { "bcvh_total": 49264, "ranked": 46818, "pickup_at_office": 2446,
                 "non_hue": 0, "no_route": 0, "identity_ok": true }
    }
  }
}
```

### 6.4 Năm ràng buộc bắt buộc của contract

- `C-01` — **Một request phục vụ toàn bộ màn hình.** Kể cả `daily_series`. Không lazy-fetch theo tuyến. Kế thừa quyết định `R1-A` của ticket BCVH; trạng thái thu gọn/mở rộng của panel chi tiết là **thuần UI**. Cơ sở: đo thật route×ngày 1 BCVH 1 tháng = 825 dòng / 128 ms.
- `C-02` — **`month` là tổng đúng của `daily_series`.** Backend roll-up trong Node từ chính mảng ngày đã trả về, **không** chạy thêm một câu `GROUP BY` riêng cho tháng. Điều này khiến "tổng tháng không khớp tổng các ngày hiển thị" trở thành **bất khả thi về mặt cấu trúc**, thay vì chỉ là điều được kiểm bằng test.
- `C-03` — **`day` được lấy ra từ `daily_series`**, là phần tử có `date === anchor_date`; vắng mặt → `rate: null` với `volume: 0`. Không truy vấn riêng.
- `C-04` — **`rate = null` ⟺ `volume = 0`** (§3.2 `M-03`), áp dụng đồng nhất cho cả ba kỳ và mọi phần tử `daily_series`.
- `C-05` — **`reconciliation` tính trong cùng lần quét dữ liệu**, không phải cộng lại từ mảng `routes` (cộng lại chỉ chứng minh mảng tự nhất quán, không chứng minh gì về tổng BCVH).

### 6.5 Ba truy vấn cố định — không N+1

| # | Mục đích | Hình dạng |
| --- | --- | --- |
| `Q1` | Ngày neo | `SELECT MAX(ngay_do_kiem) FROM fact_f13 WHERE ma_bcvh = ? AND date(ngay_do_kiem) <= date(?)` |
| `Q2` | Chuỗi ngày tháng hiện tại | `GROUP BY ngay_do_kiem, ma_tuyen` trong `[month_start, anchor]`, lọc phạm vi §5.1 → nuôi `daily_series`, `day`, `month` |
| `Q3` | Tổng cùng kỳ tháng trước | `GROUP BY ma_tuyen` trong `[previous_start, previous_end]` theo công thức §4.2.1 (tái dùng nguyên văn từ `_getBcvhOverviewAggregate('mtd', ...)`), cùng bộ lọc → nuôi `previous_month`, `rank_previous_month` |
| `Q4` | Đối soát | Một câu, `SUM(CASE WHEN ...)` bốn nhóm × hai kỳ, **không** lọc tuyến |

Bốn câu, cố định, không phụ thuộc số tuyến. Không có vòng lặp truy vấn theo tuyến ở bất kỳ đâu. `previous_end` của `Q3` luôn hẹp hơn hoặc bằng `Q2`'s `anchor` cùng số ngày, nên chi phí `Q3` **không bao giờ vượt** chi phí đo được của phiên bản trọn-tháng ở §8 — đo thật xác nhận: cùng truy vấn với khoảng hẹp hơn (`01→27/07` thay vì `01→31/07`) cho BCVH lớn nhất chỉ mất **93 ms**, thấp hơn mốc 272 ms đã đo cho khoảng trọn tháng.

---

## 7. Giao diện

Nguyên tắc bao trùm (PO decision 4): **không tái tạo hình thái "lưới block tổng quan đầu trang" của BCVH Ranking Overview.** Toàn bộ năng lực kỳ được gắn vào hai cấu trúc **đã tồn tại** trên màn hình Tuyến Ranking — bảng xếp hạng và panel chi tiết tuyến — cộng đúng một dải đối soát.

### 7.1 Vùng lọc

- Một ô **`Ngày phân tích`** thay cho cặp from/to (`D-01-a`).
- Xóa badge `interval` (`D-01-b`).
- Giữ nguyên: bộ chọn BCVH (nguồn động từ `/f13/dashboard/meta`), ô tìm kiếm, bộ lọc `Tuyến bưu tá / Tất cả`, `Chỉ hiện tuyến có lỗi`.
- Khi URL vào có `from_date ≠ to_date`: hiển thị dòng `Đang phân tích ngày <anchor_date>` (`D-01-c`).

### 7.2 Dải Đối soát phạm vi

Theo §5.3. Đặt giữa vùng lọc và bảng xếp hạng.

### 7.3 Bảng xếp hạng tuyến — sửa cột sẵn có, thêm một nhóm cột kỳ

Cấu trúc bảng hiện tại (`RoutePerformancePage.jsx:96-114`): `XH` · `Mã tuyến` · `Tên tuyến bưu tá` · nhóm **"Kết quả ngày đánh giá"** (`Tổng BG`, `Đạt`, `Không đạt`, `Chuyển hoàn`, `Tỷ lệ đạt`) · nhóm **"Vi phạm chậm nộp tiền"** (`BG Chậm nộp tiền`, `Tỷ lệ chậm nộp`) · `Phân loại`.

**Không thêm cột trùng lặp.** Hai cột sẵn có đã mang đúng ngữ nghĩa cần thiết và phải được **sửa tại chỗ**, không nhân đôi:

| Cột sẵn có | Hiện tại | Sau ticket này |
| --- | --- | --- |
| `XH` | `startRank + index + 1` — **số thứ tự dòng theo thứ tự sắp xếp đang xem**, đổi nghĩa mỗi lần người dùng đổi cột sắp xếp | Đổi thành `Hạng` thật, lấy từ `rank`, kèm biến động `rank_delta`. Hạng **không** đổi khi người dùng sắp xếp lại bảng |
| `Tỷ lệ đạt` (trong nhóm "Kết quả ngày đánh giá") | `passed_rate` của ngày neo | Đổi nhãn thành `Tỷ lệ ngày` (§3.1). Nguồn dữ liệu **không đổi** |

`XH` hiện là một chỉ số gây hiểu nhầm: nó trông như thứ hạng nhưng thực chất là vị trí dòng. Ticket này thay nó bằng thứ hạng thật thay vì đặt thêm một cột `Hạng` bên cạnh — hai cột số cạnh nhau, một thật một giả, là kết cục tệ hơn hiện trạng.

**Nhóm cột mới — "Kết quả theo kỳ"**, đặt sau nhóm "Kết quả ngày đánh giá":

| Cột | Nguồn | Hiển thị |
| --- | --- | --- |
| `Tỷ lệ lũy kế tháng` | `month.rate` | Ô tô màu theo §7.4; `null` → `—` |
| `Cùng kỳ tháng trước` | `previous_month.rate` | Ô tô màu theo §7.4; `null` → `—` |
| `Chênh lệch` | `delta` | `+2.4 đ%` / `−7.2 đ%`; `null` → `—` |
| `Ngày có dữ liệu` | `month.days_with_data` / `days_in_period` | `4/27` (PO decision 6) |
| `Sản lượng` | `month.volume` | Định dạng `vi-VN` (PO decision 6) |

Giữ nguyên không đổi: `Mã tuyến`, `Tên tuyến bưu tá`, toàn bộ nhóm "Kết quả ngày đánh giá" còn lại (`Tổng BG`, `Đạt`, `Không đạt`, `Chuyển hoàn`), toàn bộ nhóm "Vi phạm chậm nộp tiền", cột `Phân loại`, và nút drill-down.

Sắp xếp mặc định giữ nguyên `passed_rate` tăng dần (kém nhất lên trước — đã PO-confirm ở ticket trước). Năm cột kỳ mới đều sắp xếp được. Phân trang giữ `10 tuyến/trang` (đã PO-confirm, không đổi).

### 7.4 Màu (PO decision 5)

Mọi ô tỷ lệ dùng `classifyF13HeatmapRate()` và `F13_HEATMAP_TONE_CLASS` từ `frontend/src/components/f13/f13HeatmapBandCatalog.js` — **chỉ import, không sửa file đó, không định nghĩa lại ngưỡng, không truyền `bands` override**. Ngưỡng tuyệt đối hiện hành: Xanh `≥70`, Hồng `60–<70`, Vàng `50–<60`, Đỏ `<50`, Xám khi không có dữ liệu.

`Chênh lệch` **không** dùng bảng màu này (nó là hiệu số, không phải tỷ lệ) — dùng màu trung tính tăng/giảm, đúng nguyên tắc "so sánh không bao giờ chọn màu band" đã chốt ở Section 44.

### 7.5 Panel chi tiết tuyến — nơi đặt diễn biến ngày

Mở rộng component **`RouteSelectedPanel` đã có** (`RoutePerformancePage.jsx:241`), không tạo vùng mới:

- **Diễn biến tỷ lệ theo ngày trong tháng** — biểu đồ đường/cột nhỏ từ `daily_series`, trục ngày `01 → ngày neo`. Ngày không có dữ liệu để **trống**, không nối liền, không nội suy về 0.
- **Ba chỉ số kỳ** của riêng tuyến đang chọn: `Tỷ lệ ngày`, `Tỷ lệ lũy kế tháng`, `Cùng kỳ tháng trước`, kèm `Chênh lệch` và `Hạng`.
- **Ngữ cảnh độ tin cậy**: `days_with_data / days_in_period` và `volume` của cả hai kỳ.
- Giữ nguyên nút drill-down `Xem bưu gửi vi phạm` → `/f13/evidence` (một ngày, không đổi — PO decision 7).

### 7.6 Trạng thái rỗng và lỗi

Ba trạng thái phân biệt rõ, không trộn:

1. `anchor_date = null` — BCVH chưa có dữ liệu nào tới ngày trần → "BCVH này chưa có dữ liệu đo kiểm".
2. `anchor_date` có nhưng `routes` rỗng → "Không có tuyến phát hợp lệ trong kỳ"; dải đối soát **vẫn hiển thị** (nó chính là thứ giải thích tại sao rỗng).
3. Lỗi mạng/API → thông báo lỗi + nút thử lại; **không** hiển thị số 0.

---

## 8. Hiệu năng

Đo thật trên `backend/src/db/database.sqlite` (SQLite, read-only, máy hiện tại), BCVH `533140` — BCVH lớn nhất (376,079 dòng, 48 tuyến):

| Truy vấn | Kết quả | Thời gian |
| --- | --- | --- |
| `Q2` route×ngày, 1 BCVH, 1 tháng | 825 dòng | **128 ms** |
| `Q3` tổng cùng kỳ tháng trước (trọn tháng, đo ở R0), 1 BCVH | 36 dòng | 272 ms |
| `Q3` tổng cùng kỳ tháng trước (cùng-số-ngày, khoảng hẹp hơn, đo lại sau khi đóng `D-OPEN-01`), 1 BCVH | 35 dòng | **93 ms** |
| `Q4` đối soát (tương đương) | 1 dòng | ~250 ms |

**Mục tiêu:** endpoint hoàn tất `< 1.5 s` với BCVH lớn nhất. Biên hiện tại rộng.

Ghi chú quan trọng: con số **935 ms** trong audit là truy vấn route×tháng trải **8 tháng** — kịch bản đó **không thuộc phạm vi** ticket này (chỉ cần 2 tháng). Không dùng nó làm cơ sở lo ngại hiệu năng.

Index: `idx_bcvh_ngay(ma_bcvh, ngay_do_kiem)` phủ đúng vị từ dẫn đầu của cả `Q2`/`Q3`/`Q4`. **Không thêm index trong ticket này.** Nếu Phase I1 đo thấy vượt 1.5 s, phương án đã xác định sẵn là index `(ma_bcvh, ngay_do_kiem, ma_tuyen)`, nhưng phải mở delta riêng có ủy quyền — thêm index là thay đổi schema, nằm ngoài phạm vi.

Payload: 36 tuyến × 27 ngày ≈ 972 object nhỏ + 36 object tuyến. Chấp nhận được cho một request. `RISK-PERF-01` §11 theo dõi ngưỡng này.

---

## 9. File scope và chia phase

### 9.1 Phase B1 — Backend (executor: `Claude Code` / `Sonnet`)

| File | Thay đổi |
| --- | --- |
| `backend/src/repositories/FactBuuGuiRepository.js` | **Thêm** `getRoutePeriodDailyFacts()`, `getRoutePeriodPreviousMonth()`, `getRouteScopeReconciliation()`. Additive-only — **không sửa** `getRouteRanking`, `getRouteRankingFacts`, `getBcvhRanking`, `getEvidenceList*` |
| `backend/src/services/routePeriodService.js` | **File mới** — phân giải ngày neo, roll-up `C-02`/`C-03`, xếp hạng, kiểm đẳng thức `C-05` |
| `backend/src/controllers/DashboardController.js` | **Thêm** một handler `getRoutePeriods` |
| `backend/src/routes/f13Routes.js` | **Thêm** một dòng route |

### 9.2 Phase F1 — Frontend (executor: `Antigravity`, theo `DEC-020`)

| File | Thay đổi |
| --- | --- |
| `frontend/src/api/F13DashboardClient.js` | **Thêm** `getRoutePeriods()` |
| `frontend/src/features/route/routePeriodData.js` | **File mới** — thuần hàm: chuẩn hóa payload, định dạng, nhãn §3.1 |
| `frontend/src/features/route/RoutePerformancePage.jsx` | Vùng lọc (`D-01-a..d`), dải đối soát, cột mới, mở rộng `RouteSelectedPanel` |
| `frontend/src/features/route/routeRankingCalculations.js` | Bổ sung tiện ích sắp xếp/định dạng nếu cần |

### 9.3 Phase I1 — Integration (executor: `Claude Code` / `Sonnet`)

Nối hai phase, chứng minh trên dữ liệu thật: đẳng thức §5.2 đúng cho **cả 9 BCVH**; `C-02` đúng; đo hiệu năng thực tế; sweep hồi quy đầy đủ.

### 9.4 Cấm chạm

`BcvhRankingPage.jsx`, `BcvhRankingOverviewBlocks.jsx`, `bcvhOverviewService.js`, `bcvhOverviewData.js`, `bcvhOverviewFetcher.js`, `f13HeatmapBandCatalog.js` (chỉ import), toàn bộ Operation Dashboard, `ShipmentPerformancePage.jsx`, `getEvidenceListFacts`, `f13RouteClassificationCatalog.js`, `RuleF13302`, schema, migrations, dữ liệu.

`frontend/src/features/ranking/RouteRankingPage.jsx` (432 dòng, orphan — không route nào tham chiếu) **không xử lý** trong ticket này; ghi nhận ở §13.

### 9.5 Kỷ luật model

`Sonnet` là mặc định cho B1/I1. Theo `DEC-021`, **cùng một model không được vừa implement vừa tự phê duyệt** ràng buộc đồng nhất §5.2 — đây là điểm rủi ro cao nhất của ticket. Nếu cần review độc lập cho `AC-05`, dùng `Opus` ở phiên tách biệt.

---

## 10. Test plan

### 10.1 Backend unit (mới)

| ID | Nội dung |
| --- | --- |
| `T1` | Ngày neo phân giải **theo BCVH**, không dùng ngày max toàn cục |
| `T2` | `anchor_date = null` khi BCVH không có dữ liệu ≤ trần; không fallback |
| `T3` | `T-01`: tập tuyến là hợp của kỳ tháng; tuyến vắng mặt ngày neo vẫn xuất hiện với `day.rate = null` |
| `T4a` | `volume > 0` nhưng thiếu ngày → vẫn tính `rate`, kèm `days_with_data` |
| `T4b` | `volume = 0` → `rate = null` (và **chỉ** trường hợp này) |
| `T5` | `C-02`: `month.volume/passed/failed` khớp **chính xác** tổng `daily_series` |
| `T6` | `C-03`: `day` lấy từ `daily_series`; vắng → `volume 0` / `rate null` |
| `T7` | `AC-05`: `bcvh_total = ranked + pickup + non_hue + no_route`, cả hai kỳ |
| `T8` | `bcvh_total` khớp **đúng** kết quả `getBcvhRanking` cùng kỳ/cùng BCVH |
| `T9` | Xếp hạng: tie-break theo `volume`; `rate = null` xếp cuối nhưng vẫn có hạng |
| `T10` | `delta` = `null` khi thiếu một vế; không trả `0` |
| `T11` | `M-01`: `volume` đếm lượt, không khử trùng `ma_bg` |
| `T12` | Ngày neo là ngày 01 → `month` ≡ `day`; `previous_month` thu hẹp về đúng ngày 01 tháng trước (§4.3), **không** phải trọn tháng trước |
| `T13` | Không có N+1: số lần gọi DB cố định (4) bất kể số tuyến |

### 10.2 Backend regression **bắt buộc**

| ID | Nội dung |
| --- | --- |
| `R1` | `FactBuuGuiRepository.routeRanking.test.js` — pass **không sửa một dòng nào** |
| `R2` | `F13DashboardService.routeRanking.test.js` — pass không sửa |
| `R3` | `FactBuuGuiRepository.evidenceListFacts.test.js` + `F13DashboardService.evidenceList.test.js` — pass không sửa (chứng minh Evidence không bị chạm) |
| `R4` | `bcvhOverviewService.test.js` + `FactBuuGuiRepository.overview.test.js` — pass không sửa |

Nếu bất kỳ file test nào ở `R1`–`R4` **phải sửa** để pass thì đó là dấu hiệu contract cũ đã bị phá → dừng và báo cáo, không sửa test.

### 10.3 Frontend

| ID | Nội dung |
| --- | --- |
| `F1` | `D-01-b`: chuỗi `interval` và ba nhãn `Một ngày/Theo tuần/Lũy kế` không còn trong source |
| `F2` | `D-01-c`: `from_date ≠ to_date` → render dòng công bố ngày phân tích |
| `F3` | `D-01-d`: đổi ngày phân tích ghi `from_date = to_date` |
| `F4` | `rate = null` render `—`, không render `0` hay `0.0%` |
| `F5` | Cột `Ngày có dữ liệu` và `Sản lượng` luôn hiện với **mọi** tuyến, kể cả tuyến 4 ngày dữ liệu (PO decision 6) |
| `F6` | Màu lấy từ `classifyF13HeatmapRate`, không có ngưỡng hard-code trong file Route |
| `F7` | `Chênh lệch` **không** dùng `F13_HEATMAP_TONE_CLASS` |
| `F8` | Dải đối soát hiển thị kể cả khi `Ngoài xếp hạng = 0` |
| `F9` | `identity_ok: false` → hiện cảnh báo, không im lặng |
| `F10` | Panel chi tiết vẽ `daily_series`; ngày thiếu để trống, không nội suy |
| `F11` | Ba trạng thái rỗng/lỗi §7.6 phân biệt rõ |
| `F12` | Một request duy nhất cho toàn màn hình (`C-01`); mở/đóng panel **không** phát request |
| `F13` | Regression: `RoutePerformancePage.delayedCash.test.js`, `.blackReturned.test.js`, `.dateResolution.test.js`, `routeViolationEvidenceData.test.js` pass không sửa |
| `F14` | Link drill-down sang `/f13/evidence` giữ nguyên hình dạng một-ngày |
| `F15` | Cột hạng lấy từ `rank` của API; **không đổi giá trị** khi người dùng sắp xếp lại bảng (hiện `XH` đổi theo thứ tự dòng) |
| `F16` | Không tồn tại hai cột tỷ lệ ngày trùng lặp — `Tỷ lệ đạt` được đổi nhãn tại chỗ, không nhân đôi |

### 10.4 Kiểm tra chéo từ vựng

`AC-14` — `grep -rn "MTD\|Month-to-date\|month_to_date"` trên toàn bộ file thuộc phạm vi ticket phải trả về **0 kết quả**.

### 10.5 Baseline — so với baseline, không so với 100%

Baseline gần nhất được ghi nhận trong manifest: **frontend 383/395** (12 failure có sẵn, đã biết theo tên — manifest Section 44) và **backend 109/112** (3 failure có sẵn — Section 43). Mỗi phase phải **đo lại baseline tại thời điểm bắt đầu** (`git stash` để xác nhận theo tên), không giả định. Tiêu chí: **zero regression so với baseline đo được**, không phải "toàn bộ pass".

Mỗi phase bắt buộc chạy: test suite liên quan + `oxlint` + `vite build` (frontend) / `node --test` (backend).

---

## 11. Rủi ro dữ liệu thật

| ID | Rủi ro | Đo thật | Xử lý trong thiết kế |
| --- | --- | --- | --- |
| `RISK-DATA-01` | **Route churn** — tuyến có trong tháng nhưng vắng ngày neo | 35 trong tháng / 30 trong ngày (`533140`, tháng 8) | `T-01` §4.4 + `T3` + `AC-07`: `day.rate = null` → `—` |
| `RISK-DATA-02` | Tuyến ít dữ liệu làm tỷ lệ nhiễu | 1 tuyến 4 ngày dữ liệu; 1 tuyến `<30` BG/tháng | PO decision 6: vẫn hiển thị + xếp hạng, **bắt buộc** kèm `days_with_data` và `volume` |
| `RISK-DATA-03` | Tuyến mới, không có kỳ trước | Churn Jul→Aug: 1 tuyến mới | `delta`/`rank_delta` = `null` → `—`, không `0` (`T10`) |
| `RISK-DATA-04` | `passed + failed ≠ volume` do dòng chuyển hoàn | 30,453 dòng `danh_gia_2026 IS NULL` toàn CSDL; 5,363 riêng tháng 8 | `M-02` + tooltip bắt buộc (`AC-09`) |
| `RISK-DATA-05` | Giá trị rác `ma_tuyen = 'Khong Xac Dinh'` xuất hiện ở **5 BCVH** | 79 dòng | Đã bị loại bởi `LIKE '53%'`; phải **đếm vào nhóm `non_hue`** của đối soát, không bỏ rơi |
| `RISK-DATA-06` | `Chậm nộp tiền` có độ phủ thấp | Tháng 8: 42,336 dòng Không đạt, chỉ 17,433 (**41%**) có `thoi_gian_nop_tien` | **Không** mở rộng chỉ số chậm nộp tiền sang kỳ trong ticket này. Widget hiện có giữ nguyên theo ngày |
| `RISK-PERF-01` | Payload `daily_series` phình theo (số tuyến × số ngày) | 36 × 27 ≈ 972 object | `C-01` chấp nhận ở quy mô hiện tại; Phase I1 đo lại. Vượt ngưỡng → mở delta riêng, **không** tự chuyển sang lazy-fetch |
| `RISK-SCOPE-01` | Áp lực mở rộng sang Evidence, khoảng ngày tự do, chronic watchlist, phân tích `loai_tuyen_phat` | — | §13 liệt kê tường minh; mọi mục đều cần ticket riêng |

---

## 12. Tiêu chí nghiệm thu

### 12.1 Kỹ thuật (Claude Code tự xác nhận)

| ID | Tiêu chí |
| --- | --- |
| `AC-01` | `GET /f13/ranking/route/periods` trả đúng contract §6.3 cho cả 9 BCVH thật |
| `AC-02` | `C-01`: một request phục vụ toàn màn hình; không N+1 (`T13`) |
| `AC-03` | `C-02`: `month` = tổng đúng `daily_series`, chứng minh trên dữ liệu thật |
| `AC-04` | `C-04`: `rate = null` ⟺ `volume = 0`, đồng nhất cả ba kỳ |
| `AC-05` | **Đẳng thức đối soát đúng cho cả 9 BCVH, cả hai kỳ**, và `bcvh_total` khớp `getBcvhRanking` |
| `AC-06` | `DEF-01` đóng: không còn đường thực thi nào âm thầm rút khoảng ngày về ngày cuối |
| `AC-07` | Tuyến vắng mặt ngày neo hiển thị `—`, không `0` |
| `AC-08` | Mọi tuyến trong phạm vi đều có hạng, kèm `days_with_data` và `volume` |
| `AC-09` | Tooltip giải thích `passed + failed ≠ volume` |
| `AC-09b` | Cột hạng phản ánh `rank` từ API và ổn định khi đổi cột sắp xếp |
| `AC-10` | Ngưỡng màu chỉ đến từ `f13HeatmapBandCatalog.js`; file đó không bị sửa |
| `AC-11` | `R1`–`R4` pass **không sửa test**; Evidence/BCVH/Dashboard không bị chạm (`git diff --name-only`) |
| `AC-12` | Zero regression so với baseline đo được; `oxlint` sạch; `vite build` thành công |
| `AC-13` | Zero database write; schema/migrations không đổi |
| `AC-14` | `grep` chuỗi `MTD` trên phạm vi ticket = 0 kết quả |

### 12.2 PO UI Check (Product Owner — **không tự trao**)

| ID | Nội dung PO kiểm |
| --- | --- |
| `PO-01` | Năm chỉ số của decision 3 hiển thị đúng tên, đúng chỗ, dễ đọc |
| `PO-02` | Dải đối soát giải thích được vì sao tổng tuyến khác tổng BCVH |
| `PO-03` | Panel chi tiết tuyến thể hiện đúng diễn biến ngày + lũy kế + kỳ trước |
| `PO-04` | Màn hình **không** giống BCVH Ranking Overview về bố cục/block |
| `PO-05` | Tuyến ít dữ liệu đọc được ngữ cảnh, không gây hiểu nhầm |
| `PO-06` | Ô `Ngày phân tích` hoạt động đúng kỳ vọng; không còn control gây hiểu nhầm |
| `PO-07` | Màu sắc nhất quán với các màn hình F1.3 khác |
| `PO-08` | Desktop + mobile |

Claude Code **không** tự trao PO PASS. Kết thúc Phase F1 và Phase I1 đều dừng ở `READY FOR PO CHECK`.

---

## 13. Ngoài phạm vi

Tường minh **không** thuộc ticket này:

1. **Mọi thay đổi Evidence** — `getEvidenceListFacts` giữ nguyên `danh_gia_2026 = 'Không đạt'`; Evidence giữ nguyên chế độ một ngày (PO decision 7).
2. **Drill-down Bưu gửi Đạt/Lỗi** — lộ trình đã ghi nhận, ticket riêng `F13-ROUTE-EVIDENCE-STATUS-02` (chưa mở). Lý do kỹ thuật củng cố quyết định tách: đo thật cho thấy Evidence ở chế độ khoảng ngày sẽ chạm trần frontend — `533140` tháng 8 có **20,256** dòng Không đạt so với trần `EVIDENCE_FETCH_MAX_PAGES × EVIDENCE_FETCH_PAGE_SIZE = 20,000`, và `getEvidenceListFacts` nạp toàn bộ vào RAM trước khi phân trang bằng JS.
3. **Khoảng ngày tự do** cho Tuyến Ranking — mô hình là ngày neo (§2.1).
4. **So sánh cùng kỳ năm trước** — bất khả thi, CSDL chỉ có 2026 (`2026-01-01 → 2026-08-27`).
5. **Chronic route watchlist**, phân tích theo `loai_tuyen_phat`, phân tích địa bàn dưới cấp tuyến — hướng đã xác định trong audit, cần ticket riêng.
6. **Thêm index** — thay đổi schema, cần delta có ủy quyền riêng (§8).
7. **Xóa `frontend/src/features/ranking/RouteRankingPage.jsx`** (orphan 432 dòng) — dọn dẹp riêng, không trộn vào ticket tính năng.
8. **Sửa lệch phạm vi ở BCVH Ranking / Evidence / block route của BCVH Overview** — PO decision 1 chọn hiển thị phần chênh, không đồng bộ phạm vi giữa các màn hình.

---

## 14. Nhật ký quyết định PO — đóng `D-OPEN-01` (`2026-08-28`, Revision R1)

### `D-OPEN-01` (đã đóng) — "Cùng kỳ tháng trước" là trọn tháng hay cùng số ngày?

**Trạng thái ở Revision R0 (lịch sử):** để ngỏ. Thiết kế R0 đặt mặc định là trọn tháng liền trước, kèm khuyến nghị giữ nguyên và cảnh báo rằng kỳ lũy kế tháng hiện tại là một phần tháng (ví dụ 27/31 ngày) nên hai vế có cơ cấu ngày trong tuần khác nhau. Phương án thay thế đã đo sẵn ở R0 là so với cùng số ngày đã trôi của tháng trước (01→27), dựa trên chênh lệch đo thật (`533140`, phạm vi xếp hạng):

| | Giá trị |
| --- | --- |
| Tỷ lệ lũy kế tháng (01→27/08) | 57.03% |
| Tỷ lệ trọn tháng trước (01→31/07) | 66.47% |
| Tỷ lệ cùng số ngày tháng trước (01→27/07) | 66.73% |

**Quyết định PO (`2026-08-28`):** chọn phương án **cùng số ngày đã trôi**, minh định thêm yêu cầu **tính giống công thức đã dùng ở BCVH Ranking** — không phát minh công thức mới. Nhãn giao diện chốt là **`Cùng kỳ tháng trước`** (ngắn gọn, không dùng "MTD").

**Đối chiếu với công thức BCVH Ranking thật (không chỉ đúng ý định, đúng cả cách tính):** `_getBcvhOverviewAggregate('mtd', ...)` (`FactBuuGuiRepository.js:283-313`) đã giải bài toán "so cùng số ngày với tháng trước, có giới hạn khi tháng trước ngắn hơn" bằng công thức `previous_end = MIN(previous_start + (ngày_của_anchor − 1), ngày cuối tháng trước)`. Thiết kế R1 tái dùng nguyên văn công thức này cho `Q3` (§4.2.1) — không viết công thức riêng cho Tuyến Ranking. Đã xác minh lại bằng truy vấn read-only trên CSDL thật, gồm cả trường hợp biên tháng trước ngắn hơn (anchor `2026-03-31` → `previous_end` bị giới hạn đúng về `2026-02-28`, không tràn sang `2026-03-03`) — xem bảng xác minh đầy đủ tại §4.2.1.

**Tác động lan tỏa của quyết định — đã đồng bộ trong Revision R1:**

| Vị trí | Trước (R0) | Sau (R1) |
| --- | --- | --- |
| §3.1 Từ vựng | `Tỷ lệ tháng trước` | `Cùng kỳ tháng trước` |
| §3.3 Chênh lệch | `Tỷ lệ lũy kế tháng − Tỷ lệ tháng trước` | `Tỷ lệ lũy kế tháng − Cùng kỳ tháng trước` |
| §4.2 Phạm vi kỳ | Trọn tháng liền trước | Cùng số ngày, công thức §4.2.1 tái dùng từ BCVH Ranking |
| §4.3 Ngày neo = 01 | `Tỷ lệ tháng trước` vẫn trọn tháng, `Chênh lệch` giữa hai độ dài khác nhau | `Cùng kỳ tháng trước` cũng thu hẹp về đúng ngày 01 — hệ quả nhất quán của việc dùng chung công thức, không phải trường hợp đặc biệt |
| §6.3 Payload mẫu | `previous_month` khoảng `07-01→07-31` | `previous_month` khoảng `07-01→07-27`, số liệu route mẫu đo lại thật (`533140129`: `volume 607, passed 237, rate 39.05`) |
| §6.5 `Q3` | "Tổng tháng trước" | "Tổng cùng kỳ tháng trước", trỏ rõ về công thức tái dùng |
| §7.3 / §7.5 UI | Nhãn `Tỷ lệ tháng trước` | Nhãn `Cùng kỳ tháng trước` |
| §8 Hiệu năng | `Q3` đo 272 ms (trọn tháng) | Đo lại với khoảng hẹp hơn: **93 ms** — nhanh hơn, không phát sinh rủi ro hiệu năng mới |
| §10.1 `T12` | `previous_month` vẫn trọn tháng khi anchor là ngày 01 | `previous_month` thu hẹp về đúng ngày 01 tháng trước |

Trường JSON `previous_month` **giữ nguyên tên** — chỉ ngữ nghĩa khoảng ngày đổi; không có breaking rename không cần thiết.

`D-OPEN-01` = **RESOLVED (2026-08-28)**. Không còn quyết định PO nào để ngỏ trong ticket này.

---

## 15. Trạng thái

`F13-ROUTE-RANKING-PERIOD-01 = PO APPROVED / READY FOR IMPLEMENTATION` (`2026-08-28`, Revision R1).

Bảy quyết định PO ở §1.2 cộng quyết định đóng `D-OPEN-01` ở §1.3/§14 là đầy đủ điều kiện để mở Phase B1. Tài liệu này **vẫn không tự thực thi** — Phase B1/F1/I1 triển khai theo đúng file scope §9, test plan §10 và tiêu chí nghiệm thu §12; PO UI Check vẫn bắt buộc ở cuối Phase F1 và Phase I1 (§12.2), Claude Code không tự trao PO PASS.

Không dòng product code, schema, database hay API nào bị thay đổi khi lập hoặc khi duyệt thiết kế này — mọi số liệu trong tài liệu đến từ truy vấn `sqlite3.OPEN_READONLY`. `F13-BCVH-RANKING-OVERVIEW-01` giữ nguyên `COMPLETED / PO PASS / CLOSED`, không bị mở lại. `F13-ROUTE-EVIDENCE-STATUS-02` (§13, mục 2) vẫn chưa mở. `AUTO-BACKFILL-RUNTIME` vẫn mở độc lập theo `PROJECT_SNAPSHOT.md`.
