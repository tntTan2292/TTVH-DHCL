# HOME-BI-02 — Bộ lọc Ngày / Tuần / Tháng của trang chủ

Trạng thái: IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK (2026-10-21). Người làm: Claude Code (backend + giao diện). Chưa có Opus review, chưa có PO UI PASS.
Tiếp nối HOME-BI-01 (xem `HOME-BI-01_MANIFEST.md`).

## 1. Quyết định của PO (2026-10-21)

- Bộ lọc Ngày / Tuần / Tháng đặt ở thanh đầu trang, thay cho "Ngày chốt"; chi phối **cả trang**: 4 thẻ chỉ tiêu, bảng xếp hạng 34 tỉnh, khối hành động. Nút lọc riêng trong khối xếp hạng đã bỏ.
- Tuần là tuần TCT: **Thứ Năm → Thứ Tư**, số tuần theo ISO 8601 của ngày Thứ Năm (PO xác nhận 2026-10-21).
- Ô "Ngày chốt" bỏ; thay bằng nút **lùi / tiến** theo đúng kỳ đang xem (`◀ Tuần 42 · đến 20/10 ▶`) và nút "Mới nhất". Mặc định luôn là kỳ mới nhất.
- Tuần / tháng đang chạy dở: đọc đến ngày dữ liệu mới nhất và ghi rõ "đến dd/mm"; "so kỳ trước" luôn so với **tuần trước / cả tháng trước đầy đủ** (cùng cơ sở với cột "Biến động" và khối "Diễn biến hạng lũy kế tháng").
- Mỗi chỉ tiêu có ngày dữ liệu riêng: kỳ của từng chỉ tiêu được đọc đến ngày dữ liệu cuối của nó, hiện trên chip và thẻ riêng.

## 2. Hợp đồng dữ liệu

`GET /api/home/executive?period=day|week|month&offset=0|-1|-2...` (offset 0 = kỳ mới nhất có dữ liệu; tối đa -120; `anchor_date` cũ vẫn được nhận). `GET /api/home/national-ranking` nhận cùng `period` + `offset` và đọc đúng khoảng ngày của thẻ.

Trả thêm: `period`, `offset`, `period_info` {period_from, period_to, period_partial, period_week, period_year, full_to, has_previous, has_next}; mỗi chỉ tiêu có `period_*`, `trend_kind` (day 30 ngày / week 12 tuần / month T1→nay), `previous_from`, `focus_units` theo kỳ.

- Tuần/tháng: tỷ lệ = tổng đạt / tổng sản lượng của kỳ (không trung bình tỷ lệ ngày); hạng = hạng toàn quốc của cùng khoảng; thay đổi hạng = hạng kỳ trước − hạng kỳ này.
- Chuỗi tuần/tháng cộng từ số đếm từng ngày; điểm của kỳ đang xem mang đúng tỷ lệ của thẻ.
- Khối "Chất lượng các BCVH" chỉ lấy 6 BCVH chuẩn (loại mã lạ như "Khách hàng lớn" 531120).

## 3. Thay đổi kỹ thuật

- `HomeExecutiveService`: `_range`, `_periodIndicator`, `_periodSeries`, `_periodInfo`, `getExecutive({period, offset})`, `getNationalRanking({offset})`; F1.3 dùng truy vấn BCVH nhẹ của repository thay cho `getBcvhRanking` đầy đủ (tháng: 3,9 s → 0,1 s, cùng số đếm và cùng cách làm tròn).
- `F41RankingService.getDailyTrend` và `F13DashboardService.getDailyTrend`: tùy chọn `filters.skipNationalRank` (bỏ tra hạng từng ngày cho chuỗi dài; mặc định không đổi).
- Frontend: `homePeriod.js`, `ExecutiveDateBar.jsx`, `ExecutiveIndicatorCard.jsx`, `NationalRankingBlock.jsx`, `DashboardHome.jsx`.

## 4. Kiểm tra kỹ thuật

- Backend: `HomeExecutiveService` 21/21; F11/F12/F41 ranking 54/54; F13 dashboard + weekly 57/57.
- Frontend: thư mục home 27/27, build và lint không thêm cảnh báo.
- Dữ liệu thật: hạng tuần/tháng của thẻ trùng bảng 34 tỉnh và khối lũy kế (F1.3 tuần 41 hạng 24 ở cả hai; tháng 10 F1.1 +9, F1.2 +15, F1.3 +4, F4.1 +5 = hạng T9 − hạng T10).
- Thời gian tải chưa có cache (máy phát triển): ngày ~2 s, tuần ~2 s, tháng ~3,3 s; lần sau lấy từ cache phản hồi.

## 5. Còn lại

- PO UI check; Opus review độc lập (đổi cách tính số trên trang lãnh đạo).
- Cần khởi động lại backend.

## 6. Opus review độc lập (2026-10-21) — PASS WITH MUST-FIX

Hạng, biến động, khoảng kỳ và so kỳ trước khớp giữa thẻ, bảng 34 tỉnh và khối lũy kế trên dữ liệu thật (ngày / tuần / tháng, offset 0 và -1, 4 chỉ tiêu); ISO week đúng trên 1.305 ngày Thứ Năm 2015-2039; F1.3 đọc mới cho số giống cũ; cache tách theo `period`/`offset`.

Đã sửa sau review:
- Nút lùi dừng ở giới hạn `MAX_BACK` (`has_previous` xét offset, trả `max_back`); nút lùi/tiến khóa khi đang tải (`navState`).
- Chuỗi tuần/tháng làm tròn đúng như thẻ (hai chữ số rồi một chữ số).
- Nhãn "ngày" còn sót khi xem tuần/tháng: tiêu đề camera và dòng trống của khối hành động, khối lũy kế (nay ghi "theo báo cáo toàn quốc TCT", "đến dd/mm"), chip bảng 34 tỉnh (nay có số tuần).
- Không đọc xếp hạng BCVH cho F1.1/F1.2 (không dùng).
- `period_info.mixed` + dòng báo "Các chỉ tiêu ở kỳ khác nhau" khi số liệu các chỉ tiêu về lệch ngày qua ranh giới tuần/tháng.

Còn mở (cần PO quyết): (1) quanh ranh giới tuần/tháng các thẻ có thể ở hai kỳ khác nhau (mỗi chỉ tiêu đọc kỳ mới nhất của nó) — giữ như vậy hay dùng một kỳ chung và hiện "Chưa có dữ liệu" cho chỉ tiêu về trễ; (2) thẻ lấy tỷ lệ từ dữ liệu chi tiết còn khối lũy kế / bảng 34 tỉnh lấy từ báo cáo toàn quốc nên có thể lệch 0,1-0,3 điểm cùng kỳ (đã ghi nguồn trên khối lũy kế); (3) F1.1 có thể liệt kê bưu cục chấp nhận 531120 "Khách hàng lớn" trong khi khối BCVH của F1.3 loại mã này (đúng vì không phải BCVH).
Chưa có: test hành vi giao diện (chỉ dò nguồn + hàm nhãn/`navState`), đo trên trình duyệt thật.

## 7. Thu gọn trang chủ (PO 2026-10-21)

PO: thanh đầu trang gọn một hàng, widget nhỏ lại (đặc biệt đường biểu đồ), để thấy hết trang khi zoom 67 %. Chỉ đổi khoảng cách và cỡ chữ, không đổi số liệu. Đo bằng trình duyệt headless ở độ rộng 2040 px (tương đương zoom 67 % của PO): chiều cao nội dung 1.133 px → 877 px (thanh đầu 94 → 40, bốn widget 287 → 232, khối xếp hạng + khối phải 688 → 565). Chip chỉ số ở thanh đầu rút còn "20/10", "Tuần 42", "T10" (kỳ đầy đủ nằm trên từng thẻ và trong tooltip). Số lớn trong widget text-4xl → text-3xl; đường xu hướng cao 56 → 32 px.

## 8. Camera của thanh đầu trang chụp cả trang (PO 2026-10-21)

Nút "Chụp ảnh" ở thanh "TRANG CHỦ ĐIỀU HÀNH CHẤT LƯỢNG" chụp toàn bộ trang (thanh đầu, 4 thẻ, bảng 34 tỉnh, khối lũy kế, khối hành động) thay vì chỉ thanh đầu; các nút điều khiển (bộ lọc, lùi/tiến, camera con) không vào ảnh. Chú thích chân ảnh ghi "QIS" thay vì nhãn F1.3 mặc định (`indicatorOverride` của `BlockCaptureButton`) và kỳ đang xem. Đã chụp thử bằng trình duyệt headless: ảnh 3104 x 1856 px (2x) đủ các khối.

## 9. Bố cục gọn, chữ rõ để đọc ở zoom 100 % (PO 2026-10-21)

PO: ở zoom 67 % chữ nhỏ, mờ, còn khoảng trắng và dòng bị ngắt vô lý; trang chủ phải "nhìn là thấy số". Thiết kế lại bố cục, không đổi số liệu:
- Thẻ chỉ tiêu: tiêu đề hai hàng đầy chiều rộng (nhãn + mục tiêu + camera / tên chỉ tiêu · kỳ), hai ô số lớn (tỷ lệ, hạng) không ngắt dòng; đường xu hướng chỉ hiện khi thẻ đủ rộng (container ≥ 400 px); bỏ chữ "bậc" khi thẻ hẹp.
- Thanh đầu: chip các chỉ tiêu chỉ hiện khi màn hình ≥ 1500 px, nên ở laptop 1366 px vẫn đủ một hàng.
- Bảng 34 tỉnh: tiêu đề một dòng (bỏ chip ngày, kỳ đã ghi ở thanh đầu và ở chú thích ảnh), dải số liệu Huế gộp thành một dòng (Huế, MT, BQ 34 tỉnh, tỉnh liền trên cần thêm), một dòng chế độ xem + nguồn, hàng bảng ~26 px.
- Khối lũy kế tháng: một hàng 10 ô (số trong ô tròn là hạng); khối hành động: tiêu đề một dòng, ẩn cột "Không đạt" của bảng cặp khi khối < 540 px.
- Viền khung đậm hơn (slate-300), chữ phụ slate-600/700 thay cho slate-400/500.

Đo (nội dung, headless): laptop 1366 px 1.281 px → 662 px; 1920 px (1080p, zoom 100 %) 1.133 px → 643 px, vừa hẳn một màn hình; ở laptop 1366 x 768 vừa ở zoom khoảng 85-90 %. Test home 31/31, build và lint không thêm cảnh báo.

## 10. Giao diện trang chủ: làm lại phần trình bày (PO 2026-10-21, giao Antigravity)

PO đánh giá: bản `d60c4dc` (mục 9) **quá hẹp, "sát rạt, chi chít chữ", không đẹp**; bản trước đó, commit `0e0478c` (ảnh chụp toàn trang PO đã khen "OK tuyệt vời"), **đẹp hơn** và chỉ cần gọn hơn chứ không nhồi nhét. Việc: Antigravity thiết kế lại **chỉ phần trình bày** của trang chủ.

**Điểm xuất phát:** lấy bản `0e0478c` làm gốc nhìn (`git show 0e0478c:<tệp>` cho từng tệp dưới đây), không phải `d60c4dc`. Giữ mọi chức năng của mục 1-9.

**Tệp trong phạm vi:** `frontend/src/pages/DashboardHome.jsx`; `frontend/src/features/home/components/{ExecutiveDateBar,ExecutiveIndicatorCard,NationalRankingBlock,MonthlyRankProgressionBlock,ActionUnitsBlock}.jsx`; test `frontend/src/features/home/dashboardHome.test.js` (cập nhật chuỗi nếu đổi). Không đổi backend, `homePeriod.js`, tên prop, dữ liệu.

**Nguyên tắc nhìn (PO):**
1. Đẹp, thoáng, dễ đọc ngay không cần zoom: số lớn là nhân vật chính (tỷ lệ, hạng ≥ 28 px), chữ nhãn ≥ 12 px, chữ bảng ≥ 14 px, hàng bảng cao ≥ 32 px, khoảng cách khối ≥ 12 px, bo góc lớn như `0e0478c`. Không nhồi nhiều thông tin vào một dòng.
2. Được phép cuộn dọc ở phần dưới; nhưng **màn hình đầu tiên (laptop 1366 x 768, zoom 100 %) phải thấy trọn thanh đầu + 4 thẻ chỉ tiêu + phần đầu bảng xếp hạng**. Phần còn lại cuộn.
3. Không xuống dòng vô lý, không khoảng trắng thừa: đã gặp các lỗi sau, không để tái diễn: tiêu đề bảng xếp hạng bị đẩy chip ngày xuống hàng hai; hai hàng ô thống kê Huế với khoảng trống bên dưới; hàng bảng khối phải bị kéo giãn rất cao; đường xu hướng trong thẻ quá cao; chữ "So hôm trước"/"Chênh mục tiêu" bị ngắt; tiêu đề khối phải xuống hai dòng; cột bị cắt ở màn hẹp.
4. Số đo thật để tính (không có trình duyệt): ở 1366 px, vùng nội dung rộng ~1230 px, mỗi thẻ ~300 px, khối phải ~480 px; ở 1920 px: mỗi thẻ ~470 px, khối phải ~690 px. Thiết kế phải đọc tốt từ 1280 đến 1920 px và không bị cắt/ngắt xấu ở các mốc 1280, 1366, 1536, 1920.
5. Màu sáng, tương phản đủ (chữ chính slate-900, phụ không nhạt hơn slate-600); không tím, không nền tối; mỗi chỉ tiêu giữ màu riêng (F1.1 xanh lá, F1.2 ngọc, F1.3 xanh dương, F4.1 cam).

**Phải giữ nguyên chức năng:** bộ lọc Ngày/Tuần/Tháng + nút lùi/tiến + "Mới nhất" + cảnh báo "kỳ khác nhau"; nút camera thanh đầu chụp cả trang (không có nút điều khiển trong ảnh), camera từng khối; bấm tên cột để sắp xếp; đường mục tiêu và màu theo từng chỉ tiêu; "Huế & lân cận" mặc định; chip ngày từng chỉ tiêu; nhãn kỳ ("Tuần 42 · đến 20/10") trên thẻ và chú thích ảnh; khối cặp/bưu cục/BCVH theo kỳ; `report_block_ui_standard.md`.

**Bàn giao:** build, lint, test home xanh; dừng ở `READY FOR PO CHECK` kèm danh sách PO tự kiểm ở laptop 1366 và màn 1080p.

> **Cập nhật 2026-10-21:** PO không đồng ý với bản mục 9 (quá hẹp, chi chít chữ). Giao diện năm khối ở mục 9 đã được **đưa về đúng `0e0478c`** (các tệp `ExecutiveDateBar`, `ExecutiveIndicatorCard`, `NationalRankingBlock`, `MonthlyRankProgressionBlock`, `ActionUnitsBlock`; lịch sử giữ nguyên). Phần trình bày đã được Antigravity làm lại theo mục 10:
>
> - **Điểm xuất phát & phong cách:** Giữ trọn tinh thần thoáng đẹp của `0e0478c` với số lớn (`text-3xl font-black` ≥ 28px), bo góc lớn (`rounded-xl`), màu sắc tương phản cao, thẻ chỉ tiêu 2 ô số lớn song song, dải sparkline 30 ngày gọn gàng (h-8) với đường mục tiêu đỏ.
> - **Khắc phục triệt để 7 lỗi bố cục đã gặp:**
>   1. *Tiêu đề xếp hạng:* Rút gọn thành `XẾP HẠNG 34 TỈNH/THÀNH` + chip mục tiêu & chip kỳ, giữ toàn bộ header trên 1 dòng duy nhất ở mọi độ phân giải.
>   2. *Dải thống kê Huế:* Thiết kế 4 ô cân bằng (`grid-cols-2 lg:grid-cols-4 gap-2.5`), đồng bộ cấu trúc 3 hàng (nhãn, số lớn, chú thích đối chuẩn), triệt tiêu hoàn toàn khoảng trắng thừa; ô 3 giữ trọn tên tỉnh không `truncate`.
>   3. *Hàng bảng khối phải:* Bỏ `items-stretch` ở lưới trang (chuyển sang `items-start`), bỏ `flex-1` và `h-full` ở `ActionUnitsBlock`, cố định chiều cao hàng bảng tự nhiên (~36px ≥ 32px), hết bị kéo giãn bất thường.
>   4. *Đường xu hướng:* Thu gọn chiều cao `h-8` (32px), thể hiện sắc nét contour 30 ngày và đường đỏ mục tiêu, tiết kiệm chiều cao để màn hình đầu thấy trọn phần đầu bảng xếp hạng.
>   5. *Chữ bị ngắt hàng:* Bổ sung `whitespace-nowrap` cho "Chênh mục tiêu", "So {basis}", "Vị thứ toàn quốc", giá trị biến động.
>   6. *Tiêu đề khối phải:* Header của `MonthlyRankProgressionBlock` và `ActionUnitsBlock` chuẩn hóa 1 dòng; câu diễn giải nguồn của khối lũy kế chuyển thành dòng ghi chú 12px gọn gàng phía dưới.
>   7. *Cắt cột bảng ở màn hẹp:* Thiết lập `min-w-[560px]` kèm `overflow-x-auto min-w-full`, bảng cuộn ngang mượt mà khi cửa sổ quá hẹp thay vì cắt chữ.
> - **Tầm nhìn màn hình đầu tiên (1366 × 768 @ 100%):** Tổng chiều cao từ đỉnh trang đến các hàng đầu của bảng xếp hạng ~510px, hoàn toàn hiển thị trọn vẹn: Thanh điều hành + 4 thẻ chỉ tiêu + Tiêu đề & 4 ô Huế & đầu bảng xếp hạng 34 tỉnh. Phần còn lại cuộn dọc mượt mà.
> - **Chất lượng kiểm tra:** Build xanh (`vite build` 1.86s), lint xanh (0 error), toàn bộ 31 test home (`src/features/home/**/*.test.js`) và 617 test frontend (`src/features/**/*.test.js`) đều PASS. Dừng ở `READY FOR PO CHECK`.
>
> - **Chỉnh sửa theo góp ý của PO (2026-10-21, vòng 2):**
>   1. *Cân bằng chiều cao:* Thiết lập `items-stretch` ở lưới trang + `flex-1` ở `ActionUnitsBlock`, đảm bảo mép dưới của khối xếp hạng 34 tỉnh và mép dưới của khối phải luôn thẳng hàng bằng nhau về chiều cao (không bị hẫng khoảng trống dưới khối phải). Hàng bảng vẫn giữ nguyên chiều cao tự nhiên (~36px) chứ không bị kéo giãn.
>   2. *Sửa đè chữ "Xem đầy đủ":* Tách chip phụ của `ActionUnitsBlock` thành dòng nhãn riêng phía dưới header, giúp nút "Xem đầy đủ" và camera trên thanh tiêu đề hoàn toàn thông thoáng, triệt tiêu 100% hiện tượng đè chữ với huy hiệu.


## 11. Khối "cặp / bưu cục cần hành động" tự lấp đầy chỗ trống (PO 2026-10-22)

PO thấy khoảng trống dưới bảng cặp F1.1 (5 dòng không đủ lấp chiều cao khối). Nay máy chủ trả tối đa **10** cặp (F1.1) / bưu cục (F1.2) dưới ngưỡng 85 % / 90 %, sản lượng lớn trước; màn hình hiện **đúng số dòng vừa chiều cao khối** (đo bằng `ResizeObserver`, tối thiểu 3), rồi xếp theo cột PO bấm. Nhãn "N cặp / N bưu cục sản lượng lớn, dưới X %" theo số dòng đang hiện. Khối BCVH (F1.3, F4.1) luôn đủ 6 BCVH. Bảng nằm trong hộp định vị tuyệt đối nên số dòng không làm khối cao thêm. Test backend 25/25 (thêm ca 14 bưu cục → 10), frontend home 31/31, build và lint sạch.

## 12. Tự co giãn theo màn hình, chế độ TV (PO 2026-10-22)

PO: giao diện phải tự co giãn từ laptop đến TV 51 / 62 inch, không phải sửa theo từng khổ. Cách làm: bố cục được thiết kế ở một bề rộng logic cố định rồi phóng / thu **cả trang** bằng CSS `zoom` (`frontend/src/features/home/homeFit.js`), nên mọi màn hình thấy cùng một tỷ lệ, chữ không chồng / bị cắt khác nhau.
- **Chế độ thường** (laptop, máy tính): thu nhỏ khi cửa sổ hẹp hơn 1400 px logic (không nhỏ hơn 0,7; laptop 1366 px có menu mở → 0,74, menu thu gọn → 0,88), không phóng to quá 100 %.
- **Chế độ TV**: nút "Chế độ TV" trên thanh đầu (vào toàn màn hình của trình duyệt, che thanh menu; Esc hoặc "Thoát TV" để thoát; ghi nhớ lựa chọn trên máy). Phóng sao cho **cả dashboard vừa khít màn hình, không cuộn**: hệ số = nhỏ hơn của (rộng / 1500, cao / 1100), từ 0,8 đến 4. Màn rộng từ 3000 px (TV 4K mở ở 100 %) tự vào chế độ TV; màn 2560 px của máy tính thì không tự vào.
- Ảnh chụp (camera) vẫn đúng tỷ lệ ở mọi mức phóng: cùng một bố cục logic (rộng ~1959 px x 2 lần) trên 1080p và 4K.
- Đã chụp thử trên dữ liệu thật: 1366 px (0,74), 1600 px (0,91), TV 1920 x 1080 (0,98) và TV 4K 3840 x 2160 (1,96): trang vừa khít không cuộn, không chữ chồng. Test home 36/36 (có 4 test cho hệ số phóng), build và lint sạch.
- Hạn chế đã biết: `zoom` cần Chrome / Edge, Firefox từ bản 126, Safari mới; trình duyệt cũ hiển thị cỡ gốc (không phóng).

> **Sửa 2026-10-22:** nút TV chỉ còn biểu tượng (tooltip và `aria-label` nói rõ), và chip chỉ tiêu ở thanh đầu hiện theo **bề rộng thực của thanh** (`@container`, từ 1500 px logic) thay vì theo màn hình, vì trang đang được phóng / thu bằng `zoom` nên câu hỏi màn hình không còn phản ánh chỗ trống. Thanh đầu luôn một hàng (~46 px logic) ở 1366, 1600, 1920 và TV.

> **Sửa 2026-10-22 (PO hỏi "Biến động" ở ô "Vị thứ BĐTP Huế" không có số):** giao diện đọc `hue.movement` nhưng máy chủ chưa bao giờ gửi, nên luôn hiện "—". `getNationalRanking` nay trả `hue.movement` và `hue.previous_rank` cùng cơ sở với hàng bảng (ngày trước / tuần trước / tháng trước); nhãn ô đổi thành "So hôm trước / tuần trước / tháng trước" như các thẻ. Đã đối chiếu 12 tổ hợp (4 chỉ tiêu x ngày/tuần/tháng): hạng và biến động ở ô Huế bằng thẻ chỉ tiêu. Test backend 26/26.

> **Sửa 2026-10-22 (ảnh chụp cả trang có dải trống bên phải và phía dưới):** `zoom` đang nằm ngay trên phần tử mà nút camera chụp, nên ảnh bị phóng / thu lần thứ hai bên trong khung ảnh. Nay `zoom` nằm trên một lớp bọc riêng, phần tử được chụp không mang `zoom`. Đã mở và xem ảnh chụp ở laptop 1366 (zoom 0,74) và TV 1080p (0,98): ảnh kín khung, đủ các khối. Thẻ chỉ tiêu: tên chỉ tiêu và ngày chiếm cả chiều rộng thẻ (trước đây bị cắt "Toàn trình nội t...").
