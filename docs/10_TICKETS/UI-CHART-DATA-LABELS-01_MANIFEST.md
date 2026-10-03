# UI-CHART-DATA-LABELS-01 Manifest

Status: `IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK (2026-10-03)`. Frontend-only; no backend, API, SSOT or KPI change.

## 1. Ticket Information

- Ticket ID: `UI-CHART-DATA-LABELS-01`
- Name: `UI — Hiển thị data label trên biểu đồ điều hành để chụp ảnh gửi lãnh đạo`
- Requested by: Product Owner, chat 2026-10-03 (the 7-day "Xu hướng điều hành" chart shows values only in the hover tooltip, so a screenshot carries no numbers).
- Executors: Claude Code (logic, wiring, tests) -> Antigravity (label placement decisions, visual tuning, collision resolution, mobile adaptability) -> PO UI check.
- Branch: `codex/da-impl-006`. Runs in parallel with `AUTO-IMPORT-015` (awaiting PO check); touches no shared files.
- PO UI Check Required: `Yes`.

## 2. PO Decisions (2026-10-03)

1. Volume-label placement (bar bottom vs top) is decided by Antigravity as UI owner. Claude Code shipped a default (`insideBottom`, one switch: `LABEL_STYLE.volumePosition` in `chartDataLabels.js`).
2. 30-day charts keep the original fixed frame and gain mouse-wheel zoom so labels become readable when zoomed in.
3. Scope: all charts in one pass (audit P0-P3).

## 3. Chart Inventory and Result

| Chart | File | Change |
| --- | --- | --- |
| Xu hướng điều hành (7 ngày so sánh / 30 ngày / Theo BCVH) | `features/dashboard/components/IntegratedTrendRiskWorkspace.jsx` | Labels on volume bars, quality-rate line, comparison bars and comparison line; below-target rate labels in orange; 30-day mode zoomable; bars widened (`barCategoryGap` 34% -> 22%). Dynamic pair-aware rate placement, insideBottom white volume labels, left-anchored ReferenceTargetLabel. |
| Quy luật vận hành (Theo thứ / Theo tháng) | `OperatingPatternTabsCard.jsx` | Same labels; month tab zoomable; expanded top/right margins. |
| Xu hướng nhiều BCVH (Ranking, 2 uses) | `features/ranking/BcvhMultiSeriesTrendChart.jsx` | End-of-line labels per series (stacked when close); every-point labels when <=2 series and <=10 visible points; zoomable; right margin widened to 44px. |
| Quality Timeline cũ: 30 ngày, theo tháng | `components/f13/QualityTimelinePanel.jsx` | Rate labels; both zoomable. "Theo thứ" already had labels, unchanged. Target label insideBottomLeft. |
| Sparkline tuyến | `features/route/RoutePerformancePage.jsx` | Min/max/last labels (1 decimal). |
| Doughnut phân bố tuyến | `UnifiedBcvhAnalysisTable.jsx` | Not changed: 64px table cell, numbers already in the table. |
| `QualityVolumeCombo…`, `SamePeriodComparison…`, `QualityDelivery…` Adapters, `f13/TrendChart` | — | Not imported outside tests (dead code); not changed. |

## 4. Visual Tuning & Layout Decisions (Antigravity 2026-10-03)

1. **Volume Label Placement (`insideBottom`)**:
   - **Quyết định**: Chọn vị trí `insideBottom` (đáy cột, sát trục X).
   - **Lý do**: Cột sản lượng cao 50%-80% biểu đồ. Đặt nhãn tại đáy cột giúp cách ly hoàn toàn với 2 đường tỷ lệ chất lượng (chạy ở dải 80%-100% phía trên), giải quyết triệt để rủi ro nhãn sản lượng đè lên đường tỷ lệ.
   - **Màu sắc & tương phản**: Chữ màu trắng `#FFFFFF` với `fontWeight={700}` trên cả cột hiện tại (nền xanh `#003E7E`) và cột kỳ so sánh (nền xám `#64748B`), đảm bảo contrast ratio > 4.5:1 đạt chuẩn WCAG, chụp ảnh sắc nét.
   - **Cột hẹp & thấp**: Ngưỡng ngang tinh chỉnh `minBarWidthForHorizontal: 28`, `minBarHeightForInside: 20`. Khi cột hẹp (<28px) và thấp (<40px), nhãn tự động nhảy lên đỉnh cột (`y - 5`) với `HaloText` màu `#1E293B` viền trắng, không bị cụt số.

2. **Triệt tiêu chồng nhãn tỷ lệ 2 đường (Hiện tại vs So sánh)**:
   - **Nguyên nhân**: Khi 2 đường cắt nhau hoặc đảo vị trí, quy tắc cố định (current above, previous below) gây chồng chữ khi `quality_rate < previous_quality_rate`.
   - **Giải pháp dynamic placement**: Đường có giá trị cao hơn đặt nhãn `'above'` (`y - 10`), đường có giá trị thấp hơn đặt nhãn `'below'` (`y + 17..18`).
   - **Toán học kiểm chứng**: Khoảng cách giữa 2 nhãn luôn `>= 27px` (khoảng hở giữa mép chữ `>= 16px`). Kể cả khi 2 điểm bằng nhau hoặc giao nhau, 2 nhãn luôn tự động dạt về 2 phía, không bao giờ đè nhau.

3. **Xử lý nhãn "Mục tiêu 90%" ReferenceLine**:
   - **Quyết định**: Chuyển nhãn từ `insideTopRight` sang lề trái thông qua `ReferenceTargetLabel` (`x + 10, y - 7`, `textAnchor="start"`, màu `#DC2626` có viền halo trắng 3px).
   - **Lý do**: Góc trên bên phải đã có nhãn của ngày thứ 7 và nút zoom/hint của `ChartZoomFrame`. Chuyển sang góc trái giúp giải phóng hoàn toàn góc phải, triệt tiêu 100% nguy cơ đè nhãn ngày cuối.

4. **Tối ưu Mobile (≤ 400px)**:
   - **Suy luận kích thước**: Màn hình 360-400px trừ 2 trục Y (78px volume + 70px rate) chỉ còn ~180-220px cho 7 ngày (~25px/ngày). Nhãn "xx,xx%" dài 36px sẽ đè ngang lên nhau nếu hiển thị cả 4 số mỗi ngày.
   - **Giải pháp**: Nhãn kỳ so sánh gắn class responsive `hidden sm:inline` (chỉ hiển thị từ màn hình sm ≥ 640px). Trên mobile, cột xám và đường đứt nét xám vẫn hiển thị trực quan, nhãn hiện tại hiển thị rõ ràng và không bị đè ngang. Trên desktop (≥ 640px và 1280px PO chụp gửi lãnh đạo), hiển thị đủ 100% cả 4 số mỗi ngày.

5. **Biểu đồ Ranking và Quy luật vận hành**:
   - `BcvhMultiSeriesTrendChart`: tăng margin right lên `44px` để nhãn cuối đường không bị cắt ở mép phải SVG.
   - `OperatingPatternTabsCard`: tăng margin top lên `28px`, right `24px`, left `4px` đảm bảo nhãn 100% và nhãn đầu/cuối có đủ không gian an toàn.
   - `ChartZoomFrame`: tinh chỉnh vị trí nút zoom lên `right-2 top-0.5` với nền mờ `backdrop-blur-xs` bảo đảm tương phản và tách biệt.

## 5. Technical Validation

- `node --test src/features/dashboard/components/chartDataLabels.test.js`: 14/14 pass (bổ sung test case kiểm tra hợp đồng cấu hình `LABEL_STYLE`).
- Toàn bộ suite scoped dashboard + ranking + components + route: 358/358 pass.
- `npx vite build`: sạch hoàn toàn (`built in 1.18s`, không lỗi syntax/bundle).
- `npx oxlint src`: 0 errors.

## 6. Chỗ còn rủi ro cần PO lưu ý khi kiểm tra trực tiếp

1. **Dữ liệu thực tế cực đoan**: Nếu một ngày có sản lượng cực nhỏ (< 5 bưu gửi, cột cao < 5px), nhãn sản lượng sẽ hiển thị phía trên cột. Cần quan sát xem có điểm tỷ lệ nào đi ngang qua đỉnh cột thấp đó không.
2. **Kích thước màn hình cụ thể của PO**: Đã cân chỉnh cho chuẩn desktop điều hành 1280px (hiển thị đủ 4 số ngang) và mobile (< 640px ẩn nhãn so sánh). PO kiểm tra thực tế xem độ phân giải màn hình máy tính của PO có cho chữ số rõ nét đúng ý định lãnh đạo không.

## 7. Next Steps

- PO kiểm tra trực tiếp giao diện (PO UI CHECK) theo checklist:
  1. Biểu đồ 7 ngày so sánh: kiểm tra ảnh chụp đọc được đủ 4 số mỗi ngày, nhãn rõ ràng, không đè nhau.
  2. Chế độ 30 ngày: lăn chuột zoom phóng to thấy nhãn, nút đặt lại zoom hoạt động.
  3. Theo BCVH và Quy luật vận hành (Theo thứ, Theo tháng).
  4. Ranking: biểu đồ nhiều đường BCVH (nhãn xếp chồng cuối đường).
  5. Giao diện điện thoại di động.
