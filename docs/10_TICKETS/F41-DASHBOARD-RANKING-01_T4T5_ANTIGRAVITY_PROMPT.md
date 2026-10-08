# F41-DASHBOARD-RANKING-01 — T4/T5 — Prompt cho Antigravity (trang Operation Dashboard F4.1 và BCVH Ranking F4.1)

Bạn là Antigravity (Gemini), executor phụ trách UI/UX và kiểm tra chạy thực trên Windows của dự án QIS V2. Workspace duy nhất: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`, nhánh `codex/da-impl-006`.

## 0. ĐIỀU KIỆN BẮT ĐẦU

**Chỉ bắt đầu khi Claude/CTO báo "T8 đạt, T4/T5 được bắt đầu".** T8 là review độc lập của Claude Code (Opus) đối với phần backend và nền frontend bạn sắp dùng. Nếu file `docs/06_REVIEWS/Shared/F41-DASHBOARD-RANKING-01_REVIEW_001.md` đã có, đọc nó trước: các góp ý về nội dung F1.3 còn sót lại trong màn hình F4.1 sẽ nằm ở đó. Chưa có file đó mà chưa được báo thì dừng lại hỏi.

## 1. Đọc trước (theo thứ tự)

1. `docs/10_TICKETS/F41-DASHBOARD-RANKING-01_MANIFEST.md` (Mục 1, 3, 4, 8, 9: quyết định của PO, phạm vi, phân công, nền T3)
2. `docs/04_TECHNICAL_PLANNING/Feature/F41-DASHBOARD-RANKING-01_DESIGN_OF_RECORD.md` (Mục 2, 3, 6 và Mục 11 "As built")
3. `frontend/src/features/indicator/indicatorConfig.js` và `IndicatorContext.js` (cấu hình chỉ tiêu F1.3/F4.1, cờ tính năng)

## 2. Bối cảnh

PO muốn module F4.1 (Chất lượng phát thành công của bưu cục) có hai màn hình giống F1.3: **Operation Dashboard** và **BCVH Ranking**. Backend đã xong và đã đối soát với CSDL thật (các API mới dưới `/api/f41/...`). Claude Code đã làm "nền" ở frontend (T3): các khối của F1.3 được dùng chung, và khi bọc trong `IndicatorProvider` với `F41_INDICATOR` thì tự đổi sang API F4.1, dải màu 80/70/60, nhãn "F4.1", và ẩn các khối F4.1 không có dữ liệu (tuyến, chậm nộp tiền, quy luật vận hành, Action Center). Việc của bạn là **dựng hai trang, chạy thực với dữ liệu thật, rồi tinh chỉnh giao diện F4.1** cho đúng và đẹp.

Quyết định PO đã chốt (không đổi, không suy diễn thêm):
- Màu giống F1.3 nhưng ngưỡng +10 điểm: **xanh ≥ 80%, hồng 70–80, vàng 60–70, đỏ < 60%**. Đường mục tiêu biểu đồ vẫn **90%**.
- Tỷ lệ hiển thị **1 chữ số thập phân** như F1.3 (ví dụ 60,98% hiện là 61,0%).
- Dòng **chưa có đánh giá** nằm trong mẫu số và tính là **"Không đạt"**; nhãn trên màn hình chỉ ghi "Không đạt" (Evidence sau này mới tách "Chưa có đánh giá").
- Chỉ tiêu là cột AN của file nguồn "Đánh giá (thời gian Có TMS PTC 8 giờ)". Mẫu số = tổng số dòng.
- Chỉ 6 BCVH chính thức; mã 531120 không hiện trong Ranking (nhưng nằm trong KPI tổng của toàn tỉnh, nên "tổng toàn tỉnh" 60,98% và "tổng 6 BCVH" 60,97% có thể khác nhau; phải gắn nhãn phân biệt nếu cả hai cùng hiện trên một màn hình).
- Vị thứ toàn quốc: "VỊ THỨ TOÀN QUỐC: x/34" tính theo báo cáo toàn quốc; chỉ hiện cho cả tỉnh/Tổng cộng, không hiện cho từng BCVH.
- Tuần chạy Thứ Năm → Thứ Tư (giống F1.3). Không có Tuyến Ranking, không có Evidence, không có tab "Quy luật vận hành", không có Action Center trong đợt này.

## 3. Ràng buộc

- Không đổi backend, API, KPI, SSOT, công thức, số liệu. **Không khởi động lại backend** (PO đang import dữ liệu). Nếu API lỗi hoặc thiếu trường, báo Claude/CTO, không tự vá.
- Không đổi `indicatorConfig.js` (ngưỡng, cờ, URL), `api/client.js`, `f13HeatmapBandCatalog.js`. Cần đổi các file đó thì báo Claude/CTO.
- Được sửa các component dùng chung (`DashboardPage`, `BcvhRankingPage`, các khối ranking/dashboard) **chỉ khi cần cho F4.1**, bằng `useIndicator()`, `indicatorLabel()` hoặc cờ `features`. **Với F1.3 (không có provider) kết quả hiển thị phải giữ nguyên từng chữ.** Không sửa file test hiện có; thêm test mới nếu cần. Lệnh test toàn bộ frontend (mục 6) không được tệ hơn hiện tại.
- Không đụng `frontend/src/features/networkMap/*`, `backend/*`, nav/menu, `/f41` redirect (đó là T6 của Claude Code), và các file chưa commit của phiên khác. Commit bằng pathspec, không `git add -A`, không `--force`.
- Không tự tuyên bố "PO UI PASS". Dừng ở `READY FOR PO UI CHECK`.
- Không ghi mật khẩu hay token vào repo, vào báo cáo hay vào ảnh chụp. Tài khoản đăng nhập để xem giao diện: xin PO qua Claude/CTO.

## 4. Việc cần làm

### T4 — `/f41/dashboard`
1. Tạo `frontend/src/features/f41/F41DashboardPage.jsx`: bọc `DashboardPage` bằng `IndicatorProvider indicator={F41_INDICATOR}`.
2. Đăng ký route `f41/dashboard` trong `frontend/src/App.jsx` (admin và viewer), đặt cạnh các route `f13`. **Không đổi** route `f41` hiện có và menu (T6 sẽ làm).
3. Chạy thực với dữ liệu thật và rà từng khối:
   - Thẻ KPI/tổng quan (nguồn `/api/f41/dashboard/summary`): số liệu, "VỊ THỨ TOÀN QUỐC", so sánh D-1/D-7, nhãn "F4.1", không còn chữ "KPI 2026", "chậm nộp tiền", "tuyến".
   - Bảng tổng hợp số liệu các BCVH (điều hành ngày + lũy kế tháng, so cùng kỳ tuần trước, nút cùng kỳ / cả tháng trước): màu theo 80/70/60, vị thứ toàn quốc, tiêu đề ghi F4.1.
   - Biểu đồ xu hướng ngày (7 ngày so sánh, 30 ngày, theo BCVH), zoom: đường mục tiêu 90%, nhãn số không đè nhau, tooltip không có chữ của F1.3.
   - Tiêu đề trang, nút "Mở xếp hạng BCVH" phải dẫn tới `/f41/ranking/bcvh`.
4. Kiểm tra trạng thái: đang tải, lỗi, ngày không có dữ liệu, chọn 1 BCVH, chọn khoảng ngày.

### T5 — `/f41/ranking/bcvh`
1. Tạo `frontend/src/features/f41/F41BcvhRankingPage.jsx`: bọc `BcvhRankingPage` bằng `IndicatorProvider indicator={F41_INDICATOR}`; đăng ký route `f41/ranking/bcvh` (admin và viewer) trong `App.jsx`.
2. Rà từng khối với dữ liệu thật:
   - Bảng so sánh tuần/tháng (chọn 2 tuần bất kỳ, chế độ Tháng, cùng kỳ): tiêu đề "…CHẤT LƯỢNG F4.1…", TỔNG CỘNG, "VỊ THỨ TOÀN QUỐC: x/34" ở hai thẻ đầu bảng, cột "Không đạt" đúng quyết định trên.
   - Biểu đồ tuần (cột sản lượng + đường tỷ lệ, lọc đơn vị, zoom), biểu đồ tháng, heatmap thu gọn: màu theo 80/70/60, chú giải đúng ("Tỷ lệ từ 80% trở lên"…), tooltip và chú thích không còn "Mục tiêu KPI 2026"/"KPI 2026"/"F1.3".
   - Thẻ KPI và bảng xếp hạng một ngày: chỉ còn 2 thẻ (không có "Chậm nộp tiền", không có "Phân bổ chất lượng tuyến"), bảng không còn nhóm cột chậm nộp tiền, tuyến, nút "Xem chi tiết tuyến"; hàng mở rộng ("Phân tích") không còn thẻ tuyến.
   - Khối "Năng lực và chất lượng tuyến" phải biến mất hoàn toàn.
3. Kiểm tra trạng thái như T4.

### Rà soát nội dung F1.3 còn sót (cả hai trang)
Tìm bằng mắt và bằng `grep` trong các component hiển thị trên hai trang: chuỗi "F1.3", "KPI 2026", "Chậm nộp", "tuyến", đường dẫn `/f13/...`, ngưỡng 70/60/50 viết cứng. Mỗi chỗ còn sót: sửa tối thiểu theo ràng buộc mục 3 hoặc ghi vào báo cáo kèm `file:dòng`.

### Giao diện và responsive
Thử ở 1280px, 768px và ≤ 400px: bảng cuộn ngang được, thẻ không tràn, nhãn biểu đồ không bị cắt, tiêu đề không vỡ dòng. Có thể tinh chỉnh bố cục/kiểu chữ riêng cho F4.1 nếu cần, miễn không đổi hành vi của F1.3.

## 5. Chạy thực

- Backend đang chạy ở cổng 5050 (đã có `/api/f41/...`); frontend dev server (vite) của dự án đang chạy. Nếu chưa, chạy `npm run dev` trong `frontend/`.
- Dùng trình duyệt để kiểm tra (đây là vai trò chạy thực của bạn). Lưu tối đa 8 ảnh chụp đại diện (desktop, tablet, mobile) vào `docs/06_REVIEWS/Shared/F41-DASHBOARD-RANKING-01_UI_EVIDENCE/`, tên file mô tả nội dung. Ảnh không được chứa thông tin đăng nhập.
- Dữ liệu F4.1 từ 01/07/2026 đã có; PO vẫn đang bổ sung các ngày còn thiếu nên ngày mới nhất có thể thay đổi. Số liệu chuẩn để đối chiếu: ngày 01/08/2026 — tổng toàn tỉnh 2.863/4.695 = 60,98%; sáu BCVH 2.862/4.694 (Thuận Hóa 68,41%, Hương Trà 52,99%, Phú Lộc 10,69%, Hương Thủy 68,17%, A Lưới 77,46%, Thuận An 88,79%).

## 6. Kiểm tra kỹ thuật (bắt buộc)

Chạy trong `frontend/`:

```bash
node --test $(find src -name "*.test.js")
npx vite build
npx oxlint src
```

Mốc hiện tại: 593 test, 592 đạt, 1 lỗi có sẵn `src/pages/dataImportBackfillQueue.test.js` (không liên quan); build sạch; lint 0 lỗi. Không được làm kém hơn. Test chạy kiểu này vì `node --test <thư mục>` không chạy đúng trên máy này.

## 7. Tài liệu và Git

- Cập nhật `docs/10_TICKETS/F41-DASHBOARD-RANKING-01_MANIFEST.md`: dòng T4 và T5 trong bảng Mục 4 (`IMPLEMENTED / READY FOR PO UI CHECK`), thêm mục mới ghi những gì bạn đã chỉnh, các chỗ F1.3 còn sót đã xử lý, rủi ro còn lại. **Không sửa** `PROJECT_SNAPSHOT.md` và `PROJECT_PROGRESS.md` (Claude/CTO đồng bộ).
- Hai commit riêng: T4 rồi T5, mỗi commit bằng pathspec chỉ gồm file của ticket đó (các thay đổi component dùng chung đi cùng commit của trang cần chúng). Push lên `origin/codex/da-impl-006` và xác nhận commit trên remote.

## 8. Báo cáo cuối (ngắn, 150–300 từ)

Gửi Claude/CTO: kết quả từng trang, các sửa đổi ở component dùng chung (liệt kê file), chỗ F1.3 còn sót đã sửa hoặc còn tồn, kết quả 3 lệnh kiểm tra, ảnh chụp đã lưu, rủi ro còn lại, commit hash. Kèm checklist ngắn cho PO kiểm tra trực tiếp:

1. `/f41/dashboard`: thẻ tổng quan, bảng các BCVH (màu 80/70/60, vị thứ x/34), biểu đồ ngày (đường 90%).
2. `/f41/ranking/bcvh`: bảng so sánh tuần và tháng, biểu đồ tuần/tháng, heatmap, bảng xếp hạng một ngày (không có chậm nộp tiền/tuyến).
3. Không còn chữ "F1.3", "KPI 2026" ở hai trang F4.1; F1.3 hiện tại (`/f13/...`) không đổi.
4. Giao diện điện thoại.
