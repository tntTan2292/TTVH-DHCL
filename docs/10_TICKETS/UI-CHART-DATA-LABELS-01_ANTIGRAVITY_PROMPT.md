# UI-CHART-DATA-LABELS-01 — Prompt cho Antigravity (tinh chỉnh giao diện nhãn số liệu)

Bạn là Antigravity, executor phụ trách UI/UX của dự án QIS V2. Workspace duy nhất: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`.

## 0. Đọc trước (chỉ 3 file)

1. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` (mục Parallel UI ticket)
2. `docs/10_TICKETS/UI-CHART-DATA-LABELS-01_MANIFEST.md` (đặc biệt Mục 3, 4, 5, 6)
3. `frontend/src/features/dashboard/components/chartDataLabels.js` (có `LABEL_STYLE`)

## 1. Bối cảnh

Claude Code đã thêm data label và zoom bằng lăn chuột cho các biểu đồ điều hành (commit `75da2c1`). Logic đã xong và có test. PO giao cho **bạn quyết định vị trí và kiểu hiển thị nhãn**, vì PO cần chụp ảnh biểu đồ gửi lãnh đạo mà không phải rê chuột. Ảnh chụp phải đọc được ngay: số rõ, không đè nhau, không bị cắt.

## 2. Ràng buộc quan trọng

- **KHÔNG mở browser, KHÔNG dùng Playwright, KHÔNG chụp màn hình, KHÔNG chạy dev server để kiểm tra.** PO sẽ tự kiểm tra trực tiếp trên giao diện thật. Bạn chỉ chỉnh code dựa trên đọc code và suy luận kích thước, rồi kiểm tra bằng test, build và lint.
- Không tự tuyên bố "PO UI PASS". Dừng ở `READY FOR PO UI CHECK`.
- Không đổi backend, API, KPI, SSOT, nội dung số liệu hay công thức. Chỉ đổi cách hiển thị.
- Không đụng file ngoài phạm vi: đặc biệt các file `frontend/src/features/networkMap/*`, `backend/*` và các file chưa commit không thuộc ticket này đang do phiên khác sửa. Khi commit dùng pathspec, không dùng `git add -A`.
- Không đổi tên `ChartLabelRenderers.jsx` thành `chartDataLabels.jsx` (trùng tên với `chartDataLabels.js` trên Windows).

## 3. Việc cần làm

Các file chính:
- `frontend/src/features/dashboard/components/chartDataLabels.js` — `LABEL_STYLE` (vị trí, cỡ chữ, ngưỡng cột)
- `frontend/src/features/dashboard/components/ChartLabelRenderers.jsx` — cách vẽ nhãn
- `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx` — biểu đồ "Xu hướng điều hành" (7 ngày so sánh / 30 ngày / Theo BCVH)
- `frontend/src/features/dashboard/components/OperatingPatternTabsCard.jsx` — "Quy luật vận hành"
- `frontend/src/features/ranking/BcvhMultiSeriesTrendChart.jsx`, `frontend/src/components/f13/QualityTimelinePanel.jsx`, `frontend/src/features/route/RoutePerformancePage.jsx`

Mục tiêu theo thứ tự ưu tiên:

1. **Biểu đồ 7 ngày so sánh là ưu tiên số 1** (đây là biểu đồ PO sẽ chụp gửi điều hành). Mỗi ngày có 2 cột (sản lượng hiện tại, kỳ so sánh) và 2 đường (tỷ lệ đạt, tỷ lệ kỳ so sánh). Cả 4 số của mỗi ngày phải đọc được cùng lúc, không chồng lên nhau.
2. **Quyết định vị trí nhãn sản lượng** (đáy cột, đỉnh cột, hoặc cách khác) sao cho không đè lên đường tỷ lệ và đọc được trên cột. Đổi qua `LABEL_STYLE.volumePosition` hoặc sửa renderer nếu cần.
3. **Xử lý chồng chữ đã biết:**
   - chữ "Mục tiêu 90%" (ReferenceLine, góc trên phải) với nhãn tỷ lệ của ngày cuối cùng;
   - nhãn tỷ lệ với nhãn tỷ lệ kỳ so sánh khi hai đường gần nhau (hiện nhãn hiện tại ở phía trên, kỳ so sánh ở phía dưới điểm; nếu hai điểm sát hoặc đảo vị trí vẫn có thể đè nhau);
   - nhãn tỷ lệ với đỉnh cột sản lượng.
4. **Độ rộng cột và cỡ chữ:** cân lại `barCategoryGap`, `minBarWidthForHorizontal`, cỡ chữ để nhãn sản lượng nằm ngang được ở 1280px; khi cột hẹp (mobile, 30 ngày) dùng nhãn xoay hoặc ẩn hợp lý. Chữ nhãn không nhỏ hơn mức đọc được khi chụp ảnh.
5. **Mobile (rộng ≤ 400px):** kiểm tra bằng suy luận độ rộng (số ngày × độ rộng cột + 2 trục Y rộng 78px và 70px): quyết định có ẩn nhãn kỳ so sánh hoặc giảm nhãn trên mobile không, và không làm nhãn bị cắt ở mép phải.
6. **Chế độ 30 ngày:** giữ khung cũ. Kiểm tra gợi ý "Lăn chuột để phóng to" và nút "Đặt lại zoom" không che dữ liệu hoặc nhãn "Mục tiêu 90%". Có thể dời vị trí nếu cần.
7. Rà lại các biểu đồ còn lại (Quy luật vận hành, BCVH nhiều đường, Quality Timeline, sparkline tuyến) với cùng tiêu chí: số rõ, không đè, không cắt, màu nhãn đủ tương phản trên nền.

Có thể sửa tự do kiểu vẽ nhãn, nhưng giữ nguyên: logic chọn điểm gắn nhãn, định dạng số (vi-VN cho sản lượng, `xx,xx%` cho tỷ lệ), cơ chế zoom và các test trong `chartDataLabels.test.js`. Nếu đổi hành vi của hàm trong `chartDataLabels.js`, cập nhật test tương ứng.

## 4. Kiểm tra kỹ thuật (bắt buộc, không cần browser)

Chạy trong `frontend/`:

```bash
node --test $(find src/features/dashboard src/features/ranking src/components src/features/route -name "*.test.js")
npx vite build
npx oxlint src
```

Kết quả hiện tại: 357/357 test pass, build sạch, lint 0 lỗi. Không được làm kém hơn.

## 5. Tài liệu và Git

- Cập nhật `docs/10_TICKETS/UI-CHART-DATA-LABELS-01_MANIFEST.md`: thêm mục ghi quyết định vị trí nhãn bạn chọn và lý do, danh sách việc đã chỉnh, và chỗ còn rủi ro cần PO nhìn.
- Cập nhật `PROJECT_SNAPSHOT.md` (dòng Parallel UI ticket và Last Updated) cho đúng trạng thái. Không thêm dòng mới vào `PROJECT_PROGRESS.md` nếu ticket chưa đóng.
- Commit bằng pathspec chỉ gồm các file của ticket này, rồi push lên `origin/codex/da-impl-006` và xác nhận commit trên remote. Không `--force`, không bỏ qua hook.

## 6. Báo cáo cuối (ngắn, 150–300 từ)

Gửi cho Claude/CTO: kết quả, các quyết định thiết kế đã chọn (vị trí nhãn sản lượng, xử lý chồng chữ, mobile), file đã đổi, kết quả 3 lệnh kiểm tra, rủi ro còn lại, commit hash. Kèm checklist ngắn cho PO kiểm tra trực tiếp:

1. Biểu đồ 7 ngày so sánh: chụp ảnh đọc được đủ 4 số mỗi ngày, không đè.
2. 30 ngày: lăn chuột zoom thấy đủ nhãn, nút đặt lại hoạt động.
3. Theo BCVH và Quy luật vận hành (Theo thứ, Theo tháng).
4. Ranking: biểu đồ nhiều BCVH (nhãn cuối đường).
5. Giao diện điện thoại.
